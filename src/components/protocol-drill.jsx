import { Chess } from "chess.js";
import { Check, ChevronRight, Eye } from "lucide-react";
import { useCallback, useState } from "react";
import { Chessboard } from "react-chessboard";

import { Button } from "@/components/ui/button";
import { PROTOCOL_STEPS } from "@/lib/protocol-drills";

/**
 * Protocol rehearsal — the eight steps, then the move they find.
 *
 * The steps are revealed one at a time and the board stays locked until the
 * walk-through is done. That ordering is the entire drill: the failure being
 * trained out is *playing before thinking*, and a drill that let you grab the
 * move first would reward exactly that.
 *
 * The final move is graded, which keeps the rehearsal honest — a checklist you
 * can click through without engaging would teach nothing.
 * @param {object} props component props
 * @param {object} props.position a `type: "protocol"` position
 * @param {Function} props.onMiss called on a wrong move or a reveal
 * @param {Function} props.onHelp called when the answer is shown
 * @param {Function} props.onResolve called once the rehearsal is finished
 */
export default function ProtocolDrill({ position, onMiss, onHelp, onResolve }) {
  const [game] = useState(() => new Chess(position.fen));
  const [fen, setFen] = useState(position.fen);
  const [stepIndex, setStepIndex] = useState(0);
  const [status, setStatus] = useState("walking"); // walking | ready | wrong | solved | revealed
  const [wrongMoves, setWrongMoves] = useState(0);

  const walking = status === "walking";
  const resolved = status === "solved" || status === "revealed";

  const handleNextStep = useCallback(() => {
    setStepIndex((index) => {
      const next = index + 1;
      if (next >= PROTOCOL_STEPS.length) setStatus("ready");
      return next;
    });
  }, []);

  const finish = useCallback(
    (outcome) => {
      setStatus(outcome);
      onResolve(outcome);
    },
    [onResolve],
  );

  // react-chessboard v5 hands the handler one object, not positional args.
  const handleDrop = useCallback(
    ({ sourceSquare: from, targetSquare: to }) => {
      if (walking || resolved || !from || !to) return false;

      const expected = position.solution[0];
      if (from !== expected.slice(0, 2) || to !== expected.slice(2, 4)) {
        setWrongMoves((count) => count + 1);
        setStatus("wrong");
        onMiss();
        return false;
      }

      try {
        if (!game.move({ from, to, promotion: "q" })) return false;
      } catch {
        return false;
      }
      setFen(game.fen());
      finish("solved");
      return true;
    },
    [game, position, walking, resolved, finish, onMiss],
  );

  const handleReveal = useCallback(() => {
    const uci = position.solution[0];
    try {
      game.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4] ?? "q",
      });
      setFen(game.fen());
    } catch {
      // The answer key is generated, so a bad line should not wedge the drill.
    }
    onHelp();
    onMiss();
    finish("revealed");
  }, [game, position, onHelp, onMiss, finish]);

  const revealed = PROTOCOL_STEPS.slice(0, stepIndex + 1);

  return (
    <>
      <div className="w-full md:w-[420px] shrink-0 md:self-start">
        <Chessboard
          options={{
            id: "protocol-board",
            position: fen,
            onPieceDrop: handleDrop,
            boardOrientation: position.orientation,
            allowDragging: !walking && !resolved,
            boardStyle: { borderRadius: "6px", boxShadow: "0 4px 24px #0008" },
            darkSquareStyle: { backgroundColor: "#4a7c59" },
            lightSquareStyle: { backgroundColor: "#f0d9b5" },
            showNotation: true,
          }}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-sm text-foreground">{position.prompt}</p>
        </div>

        <ol className="space-y-1.5">
          {revealed.map((step, index) => (
            <li
              key={step.key}
              className={`rounded-md border px-2.5 py-1.5 text-sm ${
                index === revealed.length - 1 && walking
                  ? "border-primary/50 bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground"
              }`}
            >
              <span className="text-[10px] font-semibold text-primary mr-1.5">
                {step.key}
              </span>
              <span className="font-medium text-foreground">{step.name}</span>
              <span className="block text-xs mt-0.5">{step.question}</span>
              {step.hint && (
                <span className="block text-xs mt-0.5 text-muted-foreground/80">
                  {step.hint}
                </span>
              )}
            </li>
          ))}
        </ol>

        {walking && (
          <Button size="sm" onClick={handleNextStep} className="self-start">
            {stepIndex + 1 >= PROTOCOL_STEPS.length ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5" /> Done — look for the
                move
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5 mr-1.5" /> Next step
              </>
            )}
          </Button>
        )}

        {status === "ready" && (
          <p className="text-sm text-primary">
            There&apos;s a tactic here — a check, capture, or threat from PF3
            FORCE. Look for it and play it. Not sure? Use &quot;Show the
            move&quot; below.
          </p>
        )}

        {status === "wrong" && (
          <p className="text-sm text-red-400">
            Not that one. Go back to FORCE — checks, captures, threats.
          </p>
        )}

        {resolved && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              status === "solved"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-orange-500/40 bg-orange-500/10 text-orange-300"
            }`}
          >
            <p className="font-semibold">
              {status === "solved" ? "Found it" : "Answer shown"}
            </p>
            <p className="mt-0.5 opacity-90">
              <span className="font-mono">{position.answerSan}</span> — the
              motif is {position.motif}. It was surfaced by PF3 FORCE.
            </p>
          </div>
        )}

        {!walking && !resolved && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReveal}
            className="self-start"
          >
            <Eye className="w-3.5 h-3.5 mr-1.5" /> Show the move
          </Button>
        )}

        <p className="text-[11px] text-muted-foreground/60 mt-auto pt-2">
          Wrong moves here: {wrongMoves}
        </p>
      </div>
    </>
  );
}
