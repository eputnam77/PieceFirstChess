import { Chess } from "chess.js";
import { CheckCircle2, Eye, GraduationCap, Lightbulb, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

import BlunderCheckDrill from "@/components/blunder-check-drill";
import EndgameDrill from "@/components/endgame-drill";
import ProtocolDrill from "@/components/protocol-drill";
import StructureDrill from "@/components/structure-drill";
import TabiyaCard from "@/components/tabiya-card";
import { Button } from "@/components/ui/button";
import { PF_STEPS } from "@/data/curriculum";
import { SESSION_LENGTHS, summarizeSession } from "@/lib/session";
import { RATING } from "@/lib/srs";
import useSrsStore from "@/store/use-srs-store";
import ScanDrill from "@pf/scan-drill";
import { isWarmup } from "@pf/warmup";

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
const DrillPosition = ({ position, onMiss, onHelp, onResolve }) => {
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
          // An opening line may legitimately end on the opponent's reply.
          // Without this the board would sit waiting for a move that is not
          // in the line, which looks like a freeze rather than a finish.
          if (step + 1 >= position.solution.length) finish("solved");
        } catch {
          // A malformed solution must not wedge the session.
          finish("solved");
        }
      }, OPPONENT_REPLY_DELAY_MS);
    },
    [game, position, finish],
  );

  // react-chessboard v5 hands the handler one object, not positional args.
  // Passing (from, to) silently breaks every drag, so keep this signature in
  // step with the board API.
  const handleDrop = useCallback(
    ({ sourceSquare: from, targetSquare: to }) => {
      if (resolved || !from || !to) return false;

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
      <div className="w-full md:w-[420px] shrink-0 md:self-start">
        <Chessboard
          options={{
            id: "study-board",
            position: fen,
            onPieceDrop: handleDrop,
            boardOrientation: orientation,
            allowDragging: !resolved,
            boardStyle: {
              borderRadius: "6px",
              boxShadow: "0 4px 24px #0008",
            },
            darkSquareStyle: { backgroundColor: "#4a7c59" },
            lightSquareStyle: { backgroundColor: "#f0d9b5" },
            squareStyles: Object.fromEntries(
              Object.keys(lastMoveSquares).map((square) => [
                square,
                { backgroundColor: "rgba(255, 213, 79, 0.42)" },
              ]),
            ),
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
};

// ── Drill dispatch ───────────────────────────────────────────────────────────
/**
 * The component that knows how to grade this kind of position.
 *
 * Every drill takes the same three callbacks and reports the same outcomes, so
 * the session loop does not need to know which kind it is looking at. Adding a
 * drill type means adding a row here and nothing else.
 */
const DRILL_COMPONENTS = {
  endgame: EndgameDrill,
  blundercheck: BlunderCheckDrill,
  protocol: ProtocolDrill,
  card: TabiyaCard,
  structure: StructureDrill,
  // "scan" and "sweep" differ only in how many squares qualify, which the
  // component reads off the position rather than needing two of them.
  scan: ScanDrill,
  sweep: ScanDrill,
  // "puzzle" and "line" are both graded by matching moves against a solution.
  puzzle: DrillPosition,
  line: DrillPosition,
};

/** Why this item is in today's queue. */
const KIND_LABELS = {
  warmup: "Warm-up",
  review: "Review",
  targeted: "Your weak step",
  new: "New",
};

/** Short label for what the current position is asking of the learner. */
const DRILL_LABELS = {
  endgame: "Play it out",
  blundercheck: "Blunder check",
  protocol: "Protocol rehearsal",
  card: "Plan recall",
  structure: "Structure play-out",
  scan: "Spot it",
  sweep: "Sweep the board",
  puzzle: "Find the move",
  line: "Opening line",
};

// ── Session length ───────────────────────────────────────────────────────────
/**
 * The first screen: how long are you studying for?
 *
 * Asked up front rather than buried in settings, because deciding how long you
 * are studying for is part of deciding to study — and because a queue that ends
 * is the whole difference from an endless puzzle list.
 * @param {object} props component props
 * @param {Function} props.onPick called with the chosen number of minutes
 * @param {string[]} props.weakSteps PF steps the learner fails most, worst first
 */
const SessionLengthPicker = ({ onPick, weakSteps }) => (
  <div className="p-8 space-y-5">
    <div className="text-center space-y-1.5">
      <h3 className="text-lg font-semibold text-foreground">
        How long have you got?
      </h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        The queue is built to fit. Reviews first, then whatever you have been
        getting wrong, then one new thing.
      </p>
    </div>

    <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
      {SESSION_LENGTHS.map((length) => (
        <button
          key={length.minutes}
          type="button"
          onClick={() => onPick(length.minutes)}
          className="rounded-lg border border-border bg-muted/30 px-3 py-4 text-center transition hover:border-primary/50 hover:bg-primary/10"
        >
          <span className="block text-base font-semibold text-foreground">
            {length.label}
          </span>
          <span className="block text-[11px] text-muted-foreground mt-0.5">
            {length.hint}
          </span>
        </button>
      ))}
    </div>

    {weakSteps.length > 0 && (
      <p className="text-xs text-muted-foreground text-center">
        Your weakest step right now is{" "}
        <strong className="text-foreground">{weakSteps[0]}</strong> —{" "}
        {PF_STEPS[weakSteps[0]]}
      </p>
    )}
  </div>
);

// ── Study session ────────────────────────────────────────────────────────────
/**
 * Study Mode — the daily spaced-repetition drill loop.
 *
 * Walks the queue from `buildSession()`: one curriculum item at a time, each
 * with a rotating handful of its positions. After the last position the learner
 * grades recall, which schedules the item's next review through FSRS.
 *
 * The queue is budgeted in minutes rather than items, per Handbook Part XV. The
 * learner picks a session length up front and the builder fills it — which is
 * the difference between "study until you stop" and a session that ends.
 * @param {object} props component props
 * @param {Function} props.onClose called when the overlay should close
 * @param {string[]} [props.itemIds] drill exactly these items, bypassing
 *   scheduling — how the curriculum dashboard opens a single item
 */
export default function StudyMode({ onClose, itemIds = null }) {
  const { isLoading, sessionQueue, startSession, gradeItem, getWeakSteps } =
    useSrsStore();
  const queue = sessionQueue;
  const [minutes, setMinutes] = useState(null);

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
  // An explicit item list skips the length picker: the learner already chose.
  useEffect(() => {
    if (itemIds) startSession({ itemIds });
    // A real session opens with the scales; drilling one item from the
    // dashboard does not (§82.5).
    else if (minutes !== null) startSession({ minutes, warmup: true });
    itemStartedAt.current = Date.now();
  }, [startSession, itemIds, minutes]);

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

  // An endgame drill reports "failed" when the technique did not work, which
  // should push the suggested grade down even if nothing else went wrong.
  const failedOutcome = positionOutcome === "failed";

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
    if (itemMisses >= 2 || positionOutcome === "revealed" || failedOutcome) {
      return RATING.AGAIN;
    }
    if (itemMisses === 1 || itemHelped) return RATING.HARD;
    return solveElapsedMs !== null && solveElapsedMs < FAST_SOLVE_MS
      ? RATING.EASY
      : RATING.GOOD;
  }, [itemMisses, itemHelped, positionOutcome, solveElapsedMs, failedOutcome]);

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

  /**
   * Skip the whole warm-up in one click (D6).
   *
   * Jumps past every remaining warm-up entry rather than one at a time: the
   * reps are the scales, and a learner who does not want them today wants none
   * of them, not the second half of them.
   */
  const handleSkipWarmup = useCallback(() => {
    setPositionOutcome(null);
    setPositionIndex(0);
    setEntryIndex(() => {
      const next = (queue ?? []).findIndex((candidate) => !isWarmup(candidate));
      return next === -1 ? (queue ?? []).length : next;
    });
    itemStartedAt.current = Date.now();
  }, [queue]);

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
                ? [
                    summary.warmupReps > 0 &&
                      `${summary.warmupReps} warm-up reps`,
                    `${summary.review} to review`,
                    summary.targeted > 0 && `${summary.targeted} targeted`,
                    `${summary.fresh} new`,
                    `~${summary.minutes} min`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Nothing scheduled"}
            </h2>
            {/* Study and Curriculum are two views of one system, so each says in
                one sentence what it is for. This one is the queue; the other is
                the map (D16). */}
            <p className="text-xs text-muted-foreground mt-0.5">
              Today&rsquo;s queue — what to work on now, chosen for you.
            </p>
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

  if (!itemIds && minutes === null) {
    return shell(
      <SessionLengthPicker onPick={setMinutes} weakSteps={getWeakSteps()} />,
    );
  }

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
  const warmingUp = isWarmup(entry);
  // An unknown type would be a data bug; fall back to the move-matching drill
  // rather than rendering nothing and looking like a freeze.
  const Drill = DRILL_COMPONENTS[position.type] ?? DrillPosition;

  return shell(
    <div className="flex flex-col gap-3 p-4 overflow-y-auto">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
            {warmingUp ? entry.warmup.step : entry.item.pfStep}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {KIND_LABELS[entry.kind] ?? entry.kind} · item {entryIndex + 1} of{" "}
            {queue.length} · {DRILL_LABELS[position.type] ?? "Drill"}{" "}
            {positionIndex + 1} of {entry.positions.length}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-foreground mt-1.5">
          {warmingUp ? entry.warmup.label : entry.item.title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {warmingUp ? entry.warmup.hint : entry.item.summary}
        </p>
        <p className="text-[11px] text-muted-foreground/70 mt-1.5 italic">
          {PF_STEPS[warmingUp ? entry.warmup.step : entry.item.pfStep]}
        </p>
        {warmingUp && (
          <button
            type="button"
            onClick={handleSkipWarmup}
            className="mt-2 text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Skip the warm-up
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <Drill
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

      {/* A warm-up entry is never graded. It is the same item every day, so
          feeding it to FSRS would flatten that item's schedule to nothing —
          the session grades what it scheduled. */}
      {resolved && isLastPosition && warmingUp && (
        <Button onClick={handleAdvanceItem}>Warm-up done</Button>
      )}

      {resolved && isLastPosition && !warmingUp && (
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
