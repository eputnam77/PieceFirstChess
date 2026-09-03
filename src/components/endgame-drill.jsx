import { Chess } from "chess.js";
import { AlertTriangle, Loader2, RotateCcw, Target } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";

import { Button } from "@/components/ui/button";
import { GOAL } from "@/data/endgame-drills";
import {
  evaluateOutcome,
  explainReason,
  movesRemaining,
  OUTCOME,
} from "@/lib/endgame-goal";
import { getStockfishEngine } from "@/lib/stockfish";

/**
 * The opponent plays at full strength. An endgame drill against a weak
 * defender teaches nothing — the whole point is that the technique has to work
 * against best play.
 */
const OPPONENT_DIFFICULTY = "hard";
/** Watchdog so a stalled worker cannot freeze the drill forever. */
const ENGINE_TIMEOUT_MS = 15_000;

const uciToMove = (uci) => ({
  from: uci.slice(0, 2),
  to: uci.slice(2, 4),
  promotion: uci.length === 5 ? uci[4] : undefined,
});

/**
 * Play an endgame out against Stockfish.
 *
 * Mounted with a `key` per drill so each one starts from clean state without an
 * effect syncing state to props. Reports upward from event handlers only.
 * @param {object} props component props
 * @param {object} props.position the drill, from `endgame-drills.js`
 * @param {Function} props.onMiss called when the student fails or restarts
 * @param {Function} props.onHelp called when the student restarts
 * @param {Function} props.onResolve called once the drill is decided
 */
export default function EndgameDrill({ position, onMiss, onHelp, onResolve }) {
  const [game, setGame] = useState(() => new Chess(position.fen));
  const [fen, setFen] = useState(position.fen);
  const [studentMoves, setStudentMoves] = useState(0);
  const [result, setResult] = useState(null); // { outcome, reason }
  const [thinking, setThinking] = useState(false);
  const [engineError, setEngineError] = useState(null);
  const [lastMoveSquares, setLastMoveSquares] = useState({});

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

  const finished = result !== null;

  const settle = useCallback(
    (verdict) => {
      setResult(verdict);
      if (verdict.outcome === OUTCOME.FAILED) onMiss();
      onResolve(verdict.outcome);
    },
    [onMiss, onResolve],
  );

  /** Let the engine reply, then score the position. */
  const playOpponent = useCallback(
    async (current, movesPlayed) => {
      setThinking(true);
      try {
        const engine = getStockfishEngine();
        const uci = await engine.getMove(
          current.fen(),
          OPPONENT_DIFFICULTY,
          ENGINE_TIMEOUT_MS,
        );
        if (cancelled.current) return;

        if (uci) {
          current.move(uciToMove(uci));
          setFen(current.fen());
          setLastMoveSquares({
            [uci.slice(0, 2)]: true,
            [uci.slice(2, 4)]: true,
          });
        }

        const verdict = evaluateOutcome(current, position, movesPlayed);
        if (verdict.outcome !== OUTCOME.IN_PROGRESS) settle(verdict);
      } catch (error) {
        if (cancelled.current) return;
        // Surface it rather than leaving the board silently stuck.
        setEngineError(error?.message ?? "The engine stopped responding.");
      } finally {
        if (!cancelled.current) setThinking(false);
      }
    },
    [position, settle],
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

      const movesPlayed = studentMoves + 1;
      setStudentMoves(movesPlayed);
      setFen(game.fen());
      setLastMoveSquares({ [from]: true, [to]: true });

      // Score after the student's move — they may have just mated or stalemated.
      const verdict = evaluateOutcome(game, position, movesPlayed);
      if (verdict.outcome !== OUTCOME.IN_PROGRESS) {
        settle(verdict);
        return true;
      }

      playOpponent(game, movesPlayed);
      return true;
    },
    [game, finished, thinking, studentMoves, position, settle, playOpponent],
  );

  const handleRestart = useCallback(() => {
    // Restarting is legitimate practice, but it is still a miss — the grade
    // should reflect that the technique did not work first time.
    onHelp();
    onMiss();
    setGame(new Chess(position.fen));
    setFen(position.fen);
    setStudentMoves(0);
    setResult(null);
    setEngineError(null);
    setLastMoveSquares({});
  }, [position, onMiss, onHelp]);

  const remaining = movesRemaining(position, studentMoves);
  const goalLabel =
    position.goal === GOAL.WIN
      ? "Win: deliver checkmate"
      : "Hold: draw or survive";

  return (
    <>
      <div className="w-full md:w-[420px] shrink-0 md:self-start">
        <Chessboard
          options={{
            id: "endgame-board",
            position: fen,
            onPieceDrop: handleDrop,
            boardOrientation: position.studentColor,
            allowDragging: !finished && !thinking,
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
          }}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
            <Target className="w-3 h-3" /> {goalLabel}
          </p>
          <p className="text-sm text-foreground">{position.prompt}</p>
          <p className="text-xs text-muted-foreground">
            Playing {position.studentColor} against Stockfish at full strength.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            Moves left: <strong className="text-foreground">{remaining}</strong>
          </span>
          {thinking && (
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Engine thinking…
            </span>
          )}
        </div>

        {engineError && (
          <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-3 text-sm text-orange-300 flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{engineError} Restart the drill to try again.</span>
          </div>
        )}

        {finished && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              result.outcome === OUTCOME.ACHIEVED
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
          >
            <p className="font-semibold">
              {result.outcome === OUTCOME.ACHIEVED
                ? "Achieved"
                : "Not this time"}
            </p>
            <p className="mt-0.5 opacity-90">{explainReason(result.reason)}</p>
          </div>
        )}

        <div className="rounded-lg border border-border/60 p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            The idea
          </p>
          <p className="text-sm text-muted-foreground">{position.concept}</p>
        </div>

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
