import { CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { Chessboard } from "react-chessboard";

import { Button } from "@/components/ui/button";

/**
 * One step of the protocol, answered on its own — rungs 3 and 5 of the tier-0
 * ladder.
 *
 * The shape is `blunder-check-drill.jsx` generalised from yes/no to N answers,
 * and the reason for the shape is the same: **the board cannot be touched**.
 * The skill being trained is answering *this question* — what changed, where
 * the break is, which piece is worst — and letting the learner grab a move
 * instead would train finding moves, which every other drill in the app
 * already does.
 *
 * Serves two types. A `stepdrill` asks one step on a fresh position; a `cue`
 * asks which step applies, with the eight steps as the answer set. They differ
 * only in what the choices say, which the position already carries, so there is
 * one component rather than two.
 *
 * Every answer carries an explanation and all of them are shown once the
 * question is decided — being told why the answer you nearly picked is wrong is
 * most of the value in a multiple-choice rep.
 * @param {object} props component props
 * @param {object} props.position a `stepdrill` or `cue` position
 * @param {Function} props.onMiss called when the answer is wrong
 * @param {Function} props.onHelp called when the learner gives up
 * @param {Function} props.onResolve called once with "solved" or "revealed"
 */
export default function StepDrill({ position, onMiss, onHelp, onResolve }) {
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const answered = picked !== null || revealed;
  const correct = picked?.correct === true;

  const handlePick = useCallback(
    (choice) => {
      if (answered) return;
      setPicked(choice);
      if (!choice.correct) onMiss?.();
      onResolve?.(choice.correct ? "solved" : "revealed");
    },
    [answered, onMiss, onResolve],
  );

  const handleReveal = useCallback(() => {
    if (answered) return;
    setRevealed(true);
    onHelp?.();
    onMiss?.();
    onResolve?.("revealed");
  }, [answered, onHelp, onMiss, onResolve]);

  /** Colour a choice by what it turned out to be, once that is known. */
  const toneOf = (choice) => {
    if (!answered) {
      return "border-border hover:border-primary/50 hover:bg-primary/5";
    }
    if (choice.correct) {
      return "border-emerald-500/50 bg-emerald-500/10 text-emerald-200";
    }
    return choice.id === picked?.id
      ? "border-red-500/50 bg-red-500/10 text-red-200"
      : "border-border/50 opacity-60";
  };

  return (
    <>
      <div className="w-full md:w-[420px] shrink-0 md:self-start">
        <Chessboard
          options={{
            id: "step-drill-board",
            position: position.fen,
            boardOrientation: position.orientation,
            allowDragging: false,
            boardStyle: { borderRadius: "6px", boxShadow: "0 4px 24px #0008" },
            darkSquareStyle: { backgroundColor: "#4a7c59" },
            lightSquareStyle: { backgroundColor: "#f0d9b5" },
            showNotation: true,
          }}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">
            {position.type === "cue" ? "Which step?" : position.pfStep}
          </p>
          <p className="text-sm text-foreground mt-1">{position.prompt}</p>
          {position.lastMove && (
            <p className="text-xs text-muted-foreground mt-1">
              Last move played:{" "}
              <span className="font-mono">{position.lastMove}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {position.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              disabled={answered}
              onClick={() => handlePick(choice)}
              className={`rounded-lg border px-3 py-2 text-left text-sm transition ${toneOf(choice)}`}
            >
              <span className="block">{choice.label}</span>
              {answered && choice.explanation && (
                <span className="block text-xs mt-1 opacity-80">
                  {choice.explanation}
                </span>
              )}
            </button>
          ))}
        </div>

        {!answered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReveal}
            className="self-start"
          >
            <HelpCircle className="w-3.5 h-3.5 mr-1.5" /> Show me
          </Button>
        )}

        {answered && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              correct
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-orange-500/40 bg-orange-500/10 text-orange-300"
            }`}
          >
            <p className="font-semibold flex items-center gap-1.5">
              {correct ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {correct ? "Correct" : revealed ? "Answer shown" : "Not this one"}
            </p>
            {/* The correct choice is already on screen in green with its own
                explanation, so repeating it here would only make the learner
                read the same sentence twice. */}
            {position.note && (
              <p className="mt-1 opacity-90">{position.note}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
