import { ArrowRight, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { REASON_CHIPS, parseCandidate } from "@pf/commit-gate.js";

/**
 * One line above the answer: what do you think it is?
 *
 * **It owns no board.** The learner types a move and it is parsed against a
 * frozen FEN snapshot, so predicting cannot commit the game move or let the
 * engine reply first (D12). That is the whole reason this is an input rather
 * than a drag: the live board is wired to the real game, and a "ghost" piece on
 * it would be one state bug away from playing the move for real.
 *
 * The engine is already searching behind this strip. Time spent here is time
 * that was being spent anyway.
 * @param {object} props component props
 * @param {string} props.fen the frozen position being predicted
 * @param {Function} props.onCommit called with `{ uci, san, reasonChip, ms }`
 * @param {Function} props.onSkip called with `{ ms }`
 * @param {string} [props.trigger] which button opened the gate, for the copy
 */
const CommitGateStrip = ({ fen, onCommit, onSkip, trigger = "bestMove" }) => {
  const [text, setText] = useState("");
  const [reasonChip, setReasonChip] = useState(null);
  const [rejected, setRejected] = useState(false);
  // Started in the effect rather than at construction: reading the clock during
  // render is impure, and would also mean StrictMode's double render decided
  // when the learner's thinking time began.
  const openedAt = useRef(0);
  const inputReference = useRef(null);

  // A new position is a new question, so the clock restarts with the FEN.
  useEffect(() => {
    openedAt.current = Date.now();
    inputReference.current?.focus();
  }, [fen]);

  /** Milliseconds the learner spent on this question. */
  const elapsed = () =>
    openedAt.current === 0 ? null : Date.now() - openedAt.current;

  const submit = () => {
    const parsed = parseCandidate(fen, text);
    if (!parsed) {
      setRejected(true);
      return;
    }
    onCommit({ ...parsed, reasonChip, ms: elapsed() });
  };

  const skip = () => onSkip({ ms: elapsed() });

  return (
    <div className="mx-3 mb-2 rounded-lg border border-cyan-800/40 bg-cyan-950/20 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-cyan-300">
          Your move first
        </p>
        <button
          type="button"
          onClick={skip}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
        >
          Skip <SkipForward className="h-3 w-3" />
        </button>
      </div>

      <p className="mt-0.5 text-[10px] text-muted-foreground">
        {trigger === "analyze"
          ? "What would you play here? Type it, then see the analysis."
          : "What would you play here? Type it, then see the engine's answer."}
      </p>

      <div className="mt-2 flex items-center gap-1.5">
        <input
          ref={inputReference}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setRejected(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          placeholder="Bxf7+ or f1b5"
          aria-label="Your predicted move"
          className={`flex-1 rounded-md border bg-background px-2 py-1 text-xs font-mono outline-none focus:border-cyan-600/60 ${
            rejected ? "border-red-500/60" : "border-border"
          }`}
        />
        <Button size="sm" onClick={submit} className="h-7 px-2 text-[11px]">
          Commit <ArrowRight className="h-3 w-3" />
        </Button>
      </div>

      {rejected && (
        <p className="mt-1 text-[10px] text-red-400">
          Not a legal move here. Try SAN (Bxf7+) or from-to (f1b5).
        </p>
      )}

      {/* Optional, and deliberately without effect on the move grade: move
          accuracy and explanation accuracy are two separate traces (D5). */}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="text-[10px] text-muted-foreground mr-0.5">Why?</span>
        {REASON_CHIPS.map((chip) => (
          <button
            key={chip.step}
            type="button"
            onClick={() =>
              setReasonChip((current) =>
                current === chip.step ? null : chip.step,
              )
            }
            className={`rounded-full border px-1.5 py-0.5 text-[10px] transition-colors ${
              reasonChip === chip.step
                ? "border-cyan-500/60 bg-cyan-500/20 text-cyan-200"
                : "border-border/70 text-muted-foreground hover:text-foreground"
            }`}
          >
            {chip.step} {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CommitGateStrip;
