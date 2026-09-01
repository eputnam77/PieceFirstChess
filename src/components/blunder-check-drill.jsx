import { Chess } from "chess.js";
import { AlertTriangle, ShieldCheck, ShieldX } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";

import { Button } from "@/components/ui/button";

/**
 * The PF7 VERIFY drill: "is this move safe?"
 *
 * The highest-value drill in the app, because the blunder scan is the step club
 * players actually skip. There is no board interaction — a candidate move is
 * drawn on the position and the only decision is yes or no. That is deliberate:
 * the skill being trained is the *check*, not finding a better move, and letting
 * the student play instead of answering would train something else.
 *
 * Half the deck is sound moves, so guessing "not safe" every time scores 50%.
 * @param {object} props component props
 * @param {object} props.position a `type: "blundercheck"` position
 * @param {Function} props.onMiss called when the answer is wrong
 * @param {Function} props.onHelp called when the student gives up
 * @param {Function} props.onResolve called once the rep is decided
 */
export default function BlunderCheckDrill({
  position,
  onMiss,
  onHelp,
  onResolve,
}) {
  const [answer, setAnswer] = useState(null);

  /**
   * The position with the candidate played, and the refutation after it. Both
   * are derived once so the reveal is instant and cannot desync from the board.
   */
  const preview = useMemo(() => {
    const game = new Chess(position.fen);
    try {
      game.move({
        from: position.candidate.slice(0, 2),
        to: position.candidate.slice(2, 4),
        promotion: position.candidate[4],
      });
    } catch {
      return { played: position.fen, punished: position.fen };
    }
    const played = game.fen();

    if (!position.refutation) return { played, punished: played };
    try {
      game.move({
        from: position.refutation.slice(0, 2),
        to: position.refutation.slice(2, 4),
        promotion: position.refutation[4],
      });
    } catch {
      return { played, punished: played };
    }
    return { played, punished: game.fen() };
  }, [position]);

  const handleAnswer = useCallback(
    (saidSafe) => {
      const correct = saidSafe === position.safe;
      setAnswer({ saidSafe, correct });
      if (!correct) onMiss();
      onResolve(correct ? "solved" : "revealed");
    },
    [position, onMiss, onResolve],
  );

  const handleSkip = useCallback(() => {
    setAnswer({ saidSafe: null, correct: false });
    onHelp();
    onMiss();
    onResolve("revealed");
  }, [onHelp, onMiss, onResolve]);

  const answered = answer !== null;
  // Before answering, show the position as it stands; after, show the payoff.
  const shown = answered
    ? position.safe
      ? preview.played
      : preview.punished
    : position.fen;

  const arrows = answered
    ? []
    : [
        {
          startSquare: position.candidate.slice(0, 2),
          endSquare: position.candidate.slice(2, 4),
          color: "#38bdf8",
        },
      ];

  return (
    <>
      <div className="w-full md:w-[420px] shrink-0">
        <Chessboard
          options={{
            id: "blunder-check-board",
            position: shown,
            boardOrientation: position.orientation,
            allowDragging: false,
            boardStyle: { borderRadius: "6px", boxShadow: "0 4px 24px #0008" },
            darkSquareStyle: { backgroundColor: "#4a7c59" },
            lightSquareStyle: { backgroundColor: "#f0d9b5" },
            showNotation: true,
            arrows,
            clearArrowsOnPositionChange: false,
          }}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">
            PF7 VERIFY
          </p>
          <p className="text-sm text-foreground mt-1">
            Is{" "}
            <strong className="font-mono text-base">
              {position.candidateSan}
            </strong>{" "}
            safe? Run the scan: their checks, their captures, their threats.
          </p>
        </div>

        {!answered && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => handleAnswer(true)}
              className="border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" /> Safe
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAnswer(false)}
              className="border-red-500/40 text-red-300 hover:bg-red-500/10"
            >
              <ShieldX className="w-4 h-4 mr-1.5" /> Not safe
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Show me
            </Button>
          </div>
        )}

        {answered && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              answer.correct
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
          >
            <p className="font-semibold flex items-center gap-1.5">
              {answer.correct ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {answer.correct ? "Correct" : "Not this one"}
            </p>
            <p className="mt-1 opacity-90">
              {position.safe ? (
                <>
                  <span className="font-mono">{position.candidateSan}</span> is
                  sound — nothing hits back.
                </>
              ) : (
                <>
                  <span className="font-mono">{position.candidateSan}</span>{" "}
                  loses to{" "}
                  <span className="font-mono">{position.refutationSan}</span>.
                  This happened in a real game.
                </>
              )}
            </p>
          </div>
        )}

        {position.rating && (
          <p className="text-[11px] text-muted-foreground/60 mt-auto pt-2">
            Lichess difficulty {position.rating}
          </p>
        )}
      </div>
    </>
  );
}
