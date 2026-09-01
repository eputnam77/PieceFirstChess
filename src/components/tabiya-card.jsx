import { BookOpen, Eye } from "lucide-react";
import { useCallback, useState } from "react";
import { Chessboard } from "react-chessboard";

import { Button } from "@/components/ui/button";
import { CARD_FIELDS } from "@/data/tabiya";

/**
 * A tabiya plan card: recall the plans from the position, then reveal.
 *
 * Deliberately self-graded. Handbook Part XVI says an opening card stores plans,
 * breaks, piece placement and the trade to avoid — none of which has a single
 * correct move, so a multiple-choice quiz here would teach the distractors
 * rather than the position. The SRS grade buttons that follow are the grading,
 * and they are the same ones every other item uses.
 * @param {object} props component props
 * @param {object} props.position a `type: "card"` position
 * @param {Function} props.onHelp called when the card is revealed
 * @param {Function} props.onResolve called once the card is finished
 */
export default function TabiyaCard({ position, onHelp, onResolve }) {
  const [revealed, setRevealed] = useState(false);

  const handleReveal = useCallback(() => {
    setRevealed(true);
    // Revealing is the drill, not a hint, so this is not counted as a miss —
    // the student's own grade is what schedules the card.
    onHelp();
    onResolve("solved");
  }, [onHelp, onResolve]);

  return (
    <>
      <div className="w-full md:w-[420px] shrink-0">
        <Chessboard
          options={{
            id: "tabiya-board",
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
          <p className="text-[10px] uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
            <BookOpen className="w-3 h-3" /> {position.title}
          </p>
          <p className="text-sm text-foreground mt-1">{position.prompt}</p>
          {position.structure && (
            <p className="text-xs text-muted-foreground mt-1.5">
              This resolves into structure {position.structure}.
            </p>
          )}
        </div>

        {revealed ? (
          <dl className="space-y-2">
            {CARD_FIELDS.filter((field) => position.card[field.key]).map(
              (field) => (
                <div
                  key={field.key}
                  className="rounded-md border border-border/60 px-2.5 py-1.5"
                >
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {field.label}
                  </dt>
                  <dd className="text-sm text-foreground mt-0.5">
                    {position.card[field.key]}
                  </dd>
                </div>
              ),
            )}
            {position.card.note && (
              <p className="text-xs text-orange-300/90 border-l-2 border-orange-500/40 pl-2">
                {position.card.note}
              </p>
            )}
          </dl>
        ) : (
          <>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              {CARD_FIELDS.map((field) => (
                <li key={field.key}>{field.label}?</li>
              ))}
            </ul>
            <Button onClick={handleReveal} className="self-start">
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Reveal the card
            </Button>
          </>
        )}
      </div>
    </>
  );
}
