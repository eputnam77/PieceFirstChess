import { Chess } from "chess.js";
import { AlertTriangle, Loader2, RotateCcw, Target } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

import { Button } from "@/components/ui/button";
import { classifyMove } from "@/lib/analyzer";
import { getStockfishEngine } from "@/lib/stockfish";
import { analyzeArguments, isError } from "@pf/verdict";

/**
 * Play a pawn structure out against Stockfish from its tabiya.
 *
 * A structure cannot be drilled as a puzzle — there is no single move — but it
 * can be drilled objectively all the same. The student plays a fixed number of
 * moves and the engine scores each one; the drill is passed by *keeping the
 * position*, not by winning it. Winning a Carlsbad structure against Stockfish
 * is not a reasonable bar; not losing the thread is.
 *
 * One analysis per student move does the work. The engine's own preferred move
 * is played as the reply, and its evaluation of that position becomes the
 * baseline for the next move — a best move barely shifts the evaluation, so the
 * second analysis a strict before/after comparison would need buys nothing.
 */

/**
 * How hard the engine thinks about each move, from the one place budgets live
 * (`analysisBudget` in `src/pf/verdict.js`).
 *
 * A time ceiling as well as a depth: depth alone is unbounded in wall-clock
 * terms, and on the single-threaded lite build a middlegame position can take
 * tens of seconds to reach depth 12 — a drill that appears to hang after every
 * move. The timeout on top is the watchdog: the engine is a shared singleton
 * with one request slot, so a request can be orphaned when something else in
 * the app starts its own analysis, leaving the drill on "Engine thinking…"
 * with no way back.
 */
const ANALYZE_ARGS = analyzeArguments("structureReply");
/** Mate scores are clamped so one forced mate does not swamp the arithmetic. */
const MATE_CP = 3000;

const uciToMove = (uci) => ({
  from: uci.slice(0, 2),
  to: uci.slice(2, 4),
  promotion: uci.length === 5 ? uci[4] : undefined,
});

/**
 * Evaluation in centipawns from the point of view of the side to move.
 * @param {object} result a Stockfish analysis result
 * @returns {number|null} centipawns, or null when the engine said nothing usable
 */
const toCentipawns = (result) => {
  if (!result) return null;
  if (result.isMate) return result.mateIn > 0 ? MATE_CP : -MATE_CP;
  return typeof result.scoreCp === "number" ? result.scoreCp : null;
};

/**
 * Play a structure out against Stockfish, scored on keeping the position.
 * @param {object} props component props
 * @param {object} props.position a `type: "structure"` position
 * @param {Function} props.onMiss called on a mistake, a blunder, or a restart
 * @param {Function} props.onHelp called when the student restarts
 * @param {Function} props.onResolve called once the play-out is scored
 */
export default function StructureDrill({
  position,
  onMiss,
  onHelp,
  onResolve,
}) {
  const [game, setGame] = useState(() => new Chess(position.fen));
  const [fen, setFen] = useState(position.fen);
  const [studentMoves, setStudentMoves] = useState(0);
  const [lastMoveSquares, setLastMoveSquares] = useState({});
  const [moveLog, setMoveLog] = useState([]);
  const [thinking, setThinking] = useState(false);
  const [engineError, setEngineError] = useState(null);
  const [result, setResult] = useState(null);

  /** Evaluation of the current position from the student's point of view. */
  const baseline = useRef(null);
  const cancelled = useRef(false);

  // Reset on setup as well as cleanup. StrictMode runs mount, cleanup, mount in
  // development, and a flag that is only ever set to true stays true through the
  // second mount — which silently discards every engine reply and leaves the
  // drill stuck on "Engine thinking…".
  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  // Establish the starting evaluation once, so the first move has a baseline to
  // be judged against. Runs on mount only; the drill is keyed per position.
  useEffect(() => {
    let stale = false;
    (async () => {
      try {
        const analysis = await getStockfishEngine().analyze(
          position.fen,
          ...ANALYZE_ARGS,
        );
        if (!stale && !cancelled.current) {
          baseline.current = toCentipawns(analysis);
        }
      } catch {
        // A missing baseline only means the first move is not scored.
      }
    })();
    return () => {
      stale = true;
    };
  }, [position.fen]);

  const finished = result !== null;

  const settle = useCallback(
    (log) => {
      // "Losing the thread" is exactly the adjudicator's Mistake threshold —
      // taken from @pf/verdict.js rather than restated as a local 150, so this
      // drill can never call correct what the game report calls a mistake.
      const lost = log.filter((entry) => isError(entry.quality));
      const verdict = {
        kept: lost.length === 0,
        worst: log.reduce(
          (worst, entry) =>
            entry.cpLost > (worst?.cpLost ?? -1) ? entry : worst,
          null,
        ),
      };
      setResult(verdict);
      if (!verdict.kept) onMiss();
      onResolve(verdict.kept ? "solved" : "failed");
    },
    [onMiss, onResolve],
  );

  // react-chessboard v5 hands the handler one object, not positional args.
  const handleDrop = useCallback(
    ({ sourceSquare: from, targetSquare: to }) => {
      if (finished || thinking || !from || !to) return false;

      try {
        if (!game.move({ from, to, promotion: "q" })) return false;
      } catch {
        return false;
      }

      const played = game.history({ verbose: true }).at(-1);
      const movesPlayed = studentMoves + 1;
      setStudentMoves(movesPlayed);
      setFen(game.fen());
      setLastMoveSquares({ [from]: true, [to]: true });

      scoreAndReply(played.san, movesPlayed);
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, finished, thinking, studentMoves],
  );

  /** Score the move just played, then let the engine answer it. */
  const scoreAndReply = useCallback(
    async (san, movesPlayed) => {
      setThinking(true);
      let log = moveLog;

      try {
        const analysis = await getStockfishEngine().analyze(
          game.fen(),
          ...ANALYZE_ARGS,
        );
        if (cancelled.current) return;

        // The engine now reports from the opponent's side, so flip it back.
        const afterForStudent = -(toCentipawns(analysis) ?? 0);
        const cpLost =
          baseline.current === null
            ? 0
            : Math.max(0, baseline.current - afterForStudent);
        baseline.current = afterForStudent;

        log = [
          ...moveLog,
          {
            ply: movesPlayed,
            san,
            cpLost,
            quality: classifyMove(cpLost).label,
          },
        ];
        setMoveLog(log);

        if (analysis?.bestMove && !game.isGameOver()) {
          game.move(uciToMove(analysis.bestMove));
          setFen(game.fen());
          setLastMoveSquares({
            [analysis.bestMove.slice(0, 2)]: true,
            [analysis.bestMove.slice(2, 4)]: true,
          });
        }
      } catch (error) {
        if (cancelled.current) return;
        // Surface it rather than leaving the board silently stuck.
        setEngineError(error?.message ?? "The engine stopped responding.");
        return;
      } finally {
        if (!cancelled.current) setThinking(false);
      }

      if (movesPlayed >= position.maxMoves || game.isGameOver()) settle(log);
    },
    [game, moveLog, position.maxMoves, settle],
  );

  const handleRestart = useCallback(() => {
    // Restarting is legitimate practice, but it still counts against the grade.
    onHelp();
    onMiss();
    const fresh = new Chess(position.fen);
    setGame(fresh);
    setFen(position.fen);
    setStudentMoves(0);
    setMoveLog([]);
    setResult(null);
    setEngineError(null);
    setLastMoveSquares({});
    baseline.current = null;
  }, [position, onMiss, onHelp]);

  const remaining = Math.max(0, position.maxMoves - studentMoves);

  return (
    <>
      <div className="w-full md:w-[420px] shrink-0 md:self-start">
        <Chessboard
          options={{
            id: "structure-board",
            position: fen,
            onPieceDrop: handleDrop,
            boardOrientation: position.studentColor,
            allowDragging: !finished && !thinking,
            boardStyle: { borderRadius: "6px", boxShadow: "0 4px 24px #0008" },
            darkSquareStyle: { backgroundColor: "#4a7c59" },
            lightSquareStyle: { backgroundColor: "#f0d9b5" },
            squareStyles: Object.fromEntries(
              Object.keys(lastMoveSquares).map((square) => [
                square,
                { backgroundColor: "rgba(255, 213, 79, 0.42)" },
              ]),
            ),
            showNotation: true,
          }}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
            <Target className="w-3 h-3" /> Keep the position
          </p>
          <p className="text-sm text-foreground">{position.prompt}</p>
          <p className="text-xs text-muted-foreground">
            Moves left: <strong className="text-foreground">{remaining}</strong>
            {thinking && (
              <span className="inline-flex items-center gap-1.5 ml-3">
                <Loader2 className="w-3 h-3 animate-spin" /> Engine thinking…
              </span>
            )}
          </p>
        </div>

        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            Your plan here
          </p>
          <p className="text-sm text-muted-foreground">{position.card.yours}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1">
            The break
          </p>
          <p className="text-sm text-muted-foreground">
            {position.card.breaks}
          </p>
        </div>

        {moveLog.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {moveLog.map((entry) => (
              <li
                key={`${entry.ply}-${entry.san}`}
                className={`text-[11px] font-mono rounded px-1.5 py-0.5 border ${
                  isError(entry.quality)
                    ? "border-red-500/40 bg-red-500/10 text-red-300"
                    : "border-border/60 text-muted-foreground"
                }`}
                title={`${entry.quality} — ${entry.cpLost}cp`}
              >
                {entry.san}
              </li>
            ))}
          </ul>
        )}

        {engineError && (
          <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-300 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{engineError} Restart the drill to try again.</span>
          </div>
        )}

        {finished && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              result.kept
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
          >
            <p className="font-semibold">
              {result.kept ? "You kept the position" : "You lost the thread"}
            </p>
            <p className="mt-0.5 opacity-90">
              {result.kept
                ? "No move dropped more than an inaccuracy across the play-out."
                : `${result.worst.san} was the worst of it — ${result.worst.quality}, ${result.worst.cpLost}cp.`}
            </p>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleRestart}
          disabled={thinking}
          className="self-start"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restart position
        </Button>
      </div>
    </>
  );
}
