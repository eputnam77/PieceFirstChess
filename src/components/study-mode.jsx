import { Chess } from "chess.js";
import { CheckCircle2, Eye, GraduationCap, Lightbulb, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

import { Button } from "@/components/ui/button";
import { PF_STEPS } from "@/data/curriculum";
import { summarizeSession } from "@/lib/session";
import { RATING } from "@/lib/srs";
import useSrsStore from "@/store/use-srs-store";

const OPPONENT_REPLY_DELAY_MS = 450;
const FAST_SOLVE_MS = 10_000;
const WRONG_FLASH_MS = 1200;

const GRADE_BUTTONS = [
  {
    rating: RATING.AGAIN,
    label: "Again",
    hint: "Forgot it",
    tone: "bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25",
  },
  {
    rating: RATING.HARD,
    label: "Hard",
    hint: "Struggled",
    tone: "bg-orange-500/15 border-orange-500/40 text-orange-300 hover:bg-orange-500/25",
  },
  {
    rating: RATING.GOOD,
    label: "Good",
    hint: "Got it",
    tone: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25",
  },
  {
    rating: RATING.EASY,
    label: "Easy",
    hint: "Instant",
    tone: "bg-cyan-500/15 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25",
  },
];

/** Days until a card is next due, for the post-grade confirmation. */
const daysUntil = (due, now) =>
  Math.max(1, Math.round((due - now) / 86_400_000));

/** Side to move, read straight from the FEN so it stays a pure computation. */
const orientationFromFen = (fen) =>
  fen.split(" ")[1] === "b" ? "black" : "white";

// ── One drill position ───────────────────────────────────────────────────────
/**
 * A single position on the board.
 *
 * Mounted with a `key` per position so each one gets fresh state. That is why
 * there is no effect syncing board state to the `position` prop — remounting
 * does the reset, which is both simpler and the idiomatic React answer.
 * Outcomes are reported upward from event handlers only.
 * @param {object} props component props
 * @param {object} props.position the drill position
 * @param {Function} props.onMiss called on a wrong move or a reveal
 * @param {Function} props.onHelp called when a hint or the solution is shown
 * @param {Function} props.onResolve called once the position is finished
 */
function DrillPosition({ position, onMiss, onHelp, onResolve }) {
  const [game] = useState(() => new Chess(position.fen));
  const [fen, setFen] = useState(position.fen);
  const [solutionStep, setSolutionStep] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | wrong | solved | revealed
  const [wrongMoves, setWrongMoves] = useState(0);
  const [hintUsed, setHintUsed] = useState(false);
  const [arrows, setArrows] = useState([]);
  const [lastMoveSquares, setLastMoveSquares] = useState({});

  const replyTimer = useRef(null);
  const flashTimer = useRef(null);

  useEffect(
    () => () => {
      if (replyTimer.current) clearTimeout(replyTimer.current);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const orientation = orientationFromFen(position.fen);
  const resolved = status === "solved" || status === "revealed";

  const finish = useCallback(
    (outcome) => {
      setStatus(outcome);
      onResolve(outcome);
    },
    [onResolve],
  );

  const playOpponentReply = useCallback(
    (step) => {
      const uci = position.solution[step];
      if (!uci) return;

      replyTimer.current = setTimeout(() => {
        try {
          game.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci[4] ?? "q",
          });
          setFen(game.fen());
          setLastMoveSquares({
            [uci.slice(0, 2)]: true,
            [uci.slice(2, 4)]: true,
          });
          setSolutionStep(step + 1);
        } catch {
          // A malformed solution must not wedge the session.
          finish("solved");
        }
      }, OPPONENT_REPLY_DELAY_MS);
    },
    [game, position, finish],
  );

  const handleDrop = useCallback(
    (from, to) => {
      if (resolved) return false;

      try {
        if (!game.move({ from, to, promotion: "q" })) return false;
      } catch {
        return false;
      }

      const expected = position.solution[solutionStep];
      if (from === expected.slice(0, 2) && to === expected.slice(2, 4)) {
        setFen(game.fen());
        setLastMoveSquares({ [from]: true, [to]: true });
        setArrows([]);

        const nextStep = solutionStep + 1;
        if (nextStep >= position.solution.length) finish("solved");
        else playOpponentReply(nextStep);
        return true;
      }

      game.undo();
      setWrongMoves((count) => count + 1);
      setStatus("wrong");
      onMiss();
      flashTimer.current = setTimeout(
        () => setStatus((current) => (current === "wrong" ? "idle" : current)),
        WRONG_FLASH_MS,
      );
      return false;
    },
    [game, position, solutionStep, resolved, finish, playOpponentReply, onMiss],
  );

  const handleHint = useCallback(() => {
    const uci = position.solution[solutionStep];
    if (!uci) return;
    setHintUsed(true);
    onHelp();
    setArrows([
      {
        startSquare: uci.slice(0, 2),
        endSquare: uci.slice(2, 4),
        color: "#eab308",
      },
    ]);
  }, [position, solutionStep, onHelp]);

  const handleReveal = useCallback(() => {
    for (let step = solutionStep; step < position.solution.length; step++) {
      const uci = position.solution[step];
      try {
        game.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4] ?? "q",
        });
      } catch {
        break;
      }
    }
    setFen(game.fen());
    onHelp();
    onMiss();
    finish("revealed");
  }, [game, position, solutionStep, onHelp, onMiss, finish]);

  return (
    <>
      <div className="w-full md:w-[420px] shrink-0">
        <Chessboard
          id="study-board"
          position={fen}
          onPieceDrop={handleDrop}
          boardOrientation={orientation}
          arePiecesDraggable={!resolved}
          customBoardStyle={{
            borderRadius: "6px",
            boxShadow: "0 4px 24px #0008",
          }}
          customDarkSquareStyle={{ backgroundColor: "#4a7c59" }}
          customLightSquareStyle={{ backgroundColor: "#f0d9b5" }}
          customSquareStyles={Object.fromEntries(
            Object.keys(lastMoveSquares).map((square) => [
              square,
              { backgroundColor: "rgba(255, 213, 79, 0.42)" },
            ]),
          )}
          options={{
            showNotation: true,
            arrows,
            clearArrowsOnPositionChange: false,
          }}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm text-foreground">{position.prompt}</p>
          {status === "wrong" && (
            <p className="text-sm text-red-400 mt-2">
              Not that one — look again.
            </p>
          )}
          {status === "solved" && (
            <p className="text-sm text-emerald-400 mt-2">Correct.</p>
          )}
          {status === "revealed" && (
            <p className="text-sm text-orange-400 mt-2">
              Solution shown — this counts as a miss.
            </p>
          )}
        </div>

        {!resolved && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleHint}
              disabled={hintUsed}
            >
              <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
              {hintUsed ? "Hint shown" : "Hint"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReveal}>
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Show solution
            </Button>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground/60 mt-auto pt-2">
          Wrong moves here: {wrongMoves}
        </p>
      </div>
    </>
  );
}

// ── Study session ────────────────────────────────────────────────────────────
/**
 * Study Mode — the daily spaced-repetition drill loop.
 *
 * Walks the queue from `buildSession()`: one curriculum item at a time, each
 * with several positions. After the last position the learner grades recall,
 * which schedules the item's next review through FSRS.
 * @param {object} props component props
 * @param {Function} props.onClose called when the overlay should close
 */
export default function StudyMode({ onClose }) {
  const { isLoading, sessionQueue, startSession, gradeItem } = useSrsStore();
  const queue = sessionQueue;

  const [entryIndex, setEntryIndex] = useState(0);
  const [positionIndex, setPositionIndex] = useState(0);
  const [positionOutcome, setPositionOutcome] = useState(null);

  // Per-item accumulators, used to suggest a grade
  const [itemMisses, setItemMisses] = useState(0);
  const [itemHelped, setItemHelped] = useState(false);
  const [solveElapsedMs, setSolveElapsedMs] = useState(null);
  const [gradedResult, setGradedResult] = useState(null);
  const [completed, setCompleted] = useState(0);

  const itemStartedAt = useRef(0);

  // The store loads cards and snapshots the queue; see `startSession`. Keeping
  // that there rather than here means no derived state to sync in an effect.
  useEffect(() => {
    startSession();
    itemStartedAt.current = Date.now();
  }, [startSession]);

  const entry = queue?.[entryIndex] ?? null;
  const position = entry?.positions[positionIndex] ?? null;
  const summary = useMemo(() => summarizeSession(queue ?? []), [queue]);

  const isLastPosition =
    entry !== null && positionIndex >= entry.positions.length - 1;

  const handleMiss = useCallback(() => setItemMisses((count) => count + 1), []);
  const handleHelp = useCallback(() => setItemHelped(true), []);
  const handleResolve = useCallback((outcome) => {
    setPositionOutcome(outcome);
    setSolveElapsedMs(Date.now() - itemStartedAt.current);
  }, []);

  const handleNextPosition = useCallback(() => {
    setPositionOutcome(null);
    setPositionIndex((index) => index + 1);
  }, []);

  /**
   * Grade suggested from how the item actually went. Pure: it reads the elapsed
   * time captured when the position resolved, not the live clock, so it cannot
   * shift while the learner is deciding.
   */
  const suggestedRating = useMemo(() => {
    if (itemMisses >= 2 || positionOutcome === "revealed") return RATING.AGAIN;
    if (itemMisses === 1 || itemHelped) return RATING.HARD;
    return solveElapsedMs !== null && solveElapsedMs < FAST_SOLVE_MS
      ? RATING.EASY
      : RATING.GOOD;
  }, [itemMisses, itemHelped, positionOutcome, solveElapsedMs]);

  const handleGrade = useCallback(
    async (rating) => {
      if (!entry) return;
      const now = Date.now();
      const card = await gradeItem(entry.item.id, rating, now);
      setGradedResult({
        title: entry.item.title,
        days: card ? daysUntil(card.due, now) : null,
      });
      setCompleted((count) => count + 1);
    },
    [entry, gradeItem],
  );

  const handleAdvanceItem = useCallback(() => {
    setGradedResult(null);
    setPositionOutcome(null);
    setItemMisses(0);
    setItemHelped(false);
    setSolveElapsedMs(null);
    setPositionIndex(0);
    setEntryIndex((index) => index + 1);
    itemStartedAt.current = Date.now();
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  const shell = (children) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[94vh]">
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-primary font-semibold flex items-center gap-1.5">
              <GraduationCap className="w-3 h-3" /> Study Session
            </p>
            <h2 className="text-base font-semibold text-foreground mt-0.5">
              {summary.total > 0
                ? `${summary.review} to review · ${summary.fresh} new`
                : "Nothing scheduled"}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close study session"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );

  if (isLoading || queue === null) {
    return shell(
      <div className="p-10 text-center text-sm text-muted-foreground">
        Loading your schedule…
      </div>,
    );
  }

  if (gradedResult) {
    return shell(
      <div className="p-10 text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
        <h3 className="text-lg font-semibold text-foreground">
          {gradedResult.title}
        </h3>
        <p className="text-sm text-muted-foreground">
          {gradedResult.days === null
            ? "Graded, but the review date could not be saved."
            : `Next review in ${gradedResult.days} day${gradedResult.days === 1 ? "" : "s"}.`}
        </p>
        <Button onClick={handleAdvanceItem}>Continue</Button>
      </div>,
    );
  }

  if (queue.length === 0 || !entry || !position) {
    const done = completed > 0;
    return shell(
      <div className="p-10 text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
        <h3 className="text-lg font-semibold text-foreground">
          {done ? "Session complete" : "Nothing due right now"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {done
            ? `You worked through ${completed} item${completed === 1 ? "" : "s"}. Each one comes back exactly when you are about to forget it.`
            : "Everything scheduled has been reviewed. Come back tomorrow — the spacing is what makes it stick."}
        </p>
        <Button onClick={onClose}>Done</Button>
      </div>,
    );
  }

  const resolved = positionOutcome !== null;

  return shell(
    <div className="flex flex-col gap-3 p-4 overflow-y-auto">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
            {entry.item.pfStep}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {entry.kind === "review" ? "Review" : "New"} · item {entryIndex + 1}{" "}
            of {queue.length} · position {positionIndex + 1} of{" "}
            {entry.positions.length}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mt-1.5">
          {entry.item.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {entry.item.summary}
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1.5 italic">
          {PF_STEPS[entry.item.pfStep]}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <DrillPosition
          key={`${entry.item.id}-${position.id}`}
          position={position}
          onMiss={handleMiss}
          onHelp={handleHelp}
          onResolve={handleResolve}
        />
      </div>

      {resolved && !isLastPosition && (
        <Button onClick={handleNextPosition}>Next position</Button>
      )}

      {resolved && isLastPosition && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            How well did you know this? Your answer sets when it comes back.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {GRADE_BUTTONS.map((grade) => (
              <button
                key={grade.rating}
                type="button"
                onClick={() => handleGrade(grade.rating)}
                className={`rounded-lg border px-3 py-2 text-left transition ${grade.tone} ${
                  grade.rating === suggestedRating
                    ? "ring-2 ring-current/40"
                    : ""
                }`}
              >
                <span className="block text-sm font-semibold">
                  {grade.label}
                  {grade.rating === suggestedRating && (
                    <span className="ml-1 text-[10px] font-normal opacity-70">
                      suggested
                    </span>
                  )}
                </span>
                <span className="block text-[11px] opacity-70">
                  {grade.hint}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
  );
}
