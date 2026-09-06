import { Chess } from "chess.js";
import { Check, ChevronRight, Eye } from "lucide-react";
import { useCallback, useState } from "react";
import { Chessboard } from "react-chessboard";

import { Button } from "@/components/ui/button";
import { PROTOCOL_STEPS } from "@/lib/protocol-drills";
import { showsAnswers, showsHints, showsSteps } from "@pf/scaffold.js";

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
 *
 * ## Three rungs, one component
 *
 * - **Rung 1, the worked example.** A `protocol` position carrying
 *   `stepAnswers` renders a written answer under each step instead of leaving
 *   the question hanging. Cognitive load theory's opening move: study a fully
 *   solved problem before being asked to solve one.
 * - **Rung 2, completion.** A `completion` position fills in seven steps and
 *   blanks the eighth; the learner picks its answer from a short list, and
 *   there is no move at the end. The claim a completion makes is about the
 *   eight questions, not about a best move.
 * - **Rung 5, unlabelled.** At scaffold stage 4 the steps are not shown at
 *   all — find the move; the protocol is checked only on a miss.
 *
 * `stage` comes from `scaffoldStage` and decides how much is on screen. It
 * defaults to 1 so a caller that does not pass it gets the fully scaffolded
 * rendering, which is what this component did before stages existed.
 * @param {object} props component props
 * @param {object} props.position a `protocol` or `completion` position
 * @param {number} [props.stage] scaffold stage, 1 (most support) to 4 (none)
 * @param {Function} props.onMiss called on a wrong move, choice, or a reveal
 * @param {Function} props.onHelp called when the answer is shown
 * @param {Function} props.onResolve called once the rehearsal is finished
 */
export default function ProtocolDrill({
  position,
  stage = 1,
  onMiss,
  onHelp,
  onResolve,
}) {
  const isCompletion = position.type === "completion";
  // A completion always shows its seven filled-in answers, whatever the card's
  // stability says: they are the question, not the scaffold.
  const withAnswers = isCompletion || showsAnswers(stage);
  const withHints = isCompletion || showsHints(stage);
  const withSteps = isCompletion || showsSteps(stage);

  const [game] = useState(() => new Chess(position.fen));
  const [fen, setFen] = useState(position.fen);
  const [stepIndex, setStepIndex] = useState(0);
  // walking | choosing | ready | wrong | solved | revealed
  const [status, setStatus] = useState(withSteps ? "walking" : "ready");
  const [wrongMoves, setWrongMoves] = useState(0);
  const [picked, setPicked] = useState(null);

  const walking = status === "walking";
  const choosing = status === "choosing";
  const resolved = status === "solved" || status === "revealed";

  const finish = useCallback(
    (outcome) => {
      setStatus(outcome);
      onResolve(outcome);
    },
    [onResolve],
  );

  const handleNextStep = useCallback(() => {
    setStepIndex((index) => {
      const next = index + 1;
      if (next >= PROTOCOL_STEPS.length) {
        // A completion stops at the choice; a rehearsal goes on to the move.
        setStatus(isCompletion ? "choosing" : "ready");
      }
      return next;
    });
  }, [isCompletion]);

  const handlePick = useCallback(
    (choice) => {
      if (picked) return;
      setPicked(choice);
      if (!choice.correct) onMiss();
      finish(choice.correct ? "solved" : "revealed");
    },
    [picked, onMiss, finish],
  );

  // react-chessboard v5 hands the handler one object, not positional args.
  const handleDrop = useCallback(
    ({ sourceSquare: from, targetSquare: to }) => {
      if (walking || choosing || resolved || !from || !to) return false;

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
    [game, position, walking, choosing, resolved, finish, onMiss],
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

  const revealed = withSteps ? PROTOCOL_STEPS.slice(0, stepIndex + 1) : [];
  const answers = position.stepAnswers ?? {};

  return (
    <>
      <div className="w-full md:w-[420px] shrink-0 md:self-start">
        <Chessboard
          options={{
            id: "protocol-board",
            position: fen,
            onPieceDrop: handleDrop,
            boardOrientation: position.orientation,
            allowDragging: !walking && !choosing && !resolved,
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
          {position.lastMove && (
            <p className="text-xs text-muted-foreground mt-1">
              Last move played:{" "}
              <span className="font-mono">{position.lastMove}</span>
            </p>
          )}
        </div>

        <ol className="space-y-1.5">
          {revealed.map((step, index) => {
            const blanked = isCompletion && step.key === position.blankStep;
            return (
              <li
                key={step.key}
                className={`rounded-md border px-2.5 py-1.5 text-sm ${
                  blanked
                    ? "border-primary bg-primary/15 text-foreground"
                    : index === revealed.length - 1 && walking
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/60 text-muted-foreground"
                }`}
              >
                <span className="text-[10px] font-semibold text-primary mr-1.5">
                  {step.key}
                </span>
                <span className="font-medium text-foreground">{step.name}</span>
                <span className="block text-xs mt-0.5">{step.question}</span>
                {withHints && step.hint && (
                  <span className="block text-xs mt-0.5 text-muted-foreground/80">
                    {step.hint}
                  </span>
                )}
                {blanked ? (
                  <span className="block text-xs mt-1 font-semibold text-primary">
                    This is the one you supply.
                  </span>
                ) : (
                  withAnswers &&
                  answers[step.key] && (
                    <span className="block text-xs mt-1 text-foreground/90 border-l-2 border-primary/40 pl-2">
                      {answers[step.key]}
                    </span>
                  )
                )}
              </li>
            );
          })}
        </ol>

        {walking && (
          <Button size="sm" onClick={handleNextStep} className="self-start">
            {stepIndex + 1 >= PROTOCOL_STEPS.length ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1.5" />{" "}
                {isCompletion
                  ? "Done — answer the blank"
                  : "Done — look for the move"}
              </>
            ) : (
              <>
                <ChevronRight className="w-3.5 h-3.5 mr-1.5" /> Next step
              </>
            )}
          </Button>
        )}

        {isCompletion && (choosing || resolved) && (
          <div className="flex flex-col gap-2">
            {position.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                disabled={picked !== null}
                onClick={() => handlePick(choice)}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                  picked === null
                    ? "border-border hover:border-primary/50 hover:bg-primary/5"
                    : choice.correct
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
                      : choice.id === picked.id
                        ? "border-red-500/50 bg-red-500/10 text-red-200"
                        : "border-border/50 opacity-60"
                }`}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )}

        {!isCompletion && status === "ready" && (
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
            {isCompletion ? (
              <p className="mt-0.5 opacity-90">
                {position.blankStep} —{" "}
                {position.choices.find((choice) => choice.correct)?.label}
              </p>
            ) : (
              <p className="mt-0.5 opacity-90">
                <span className="font-mono">{position.answerSan}</span> — the
                motif is {position.motif}. It was surfaced by PF3 FORCE.
              </p>
            )}
          </div>
        )}

        {!isCompletion && !walking && !resolved && (
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
          {isCompletion
            ? `Supplying ${position.blankStep}`
            : `Wrong moves here: ${wrongMoves}`}
        </p>
      </div>
    </>
  );
}
