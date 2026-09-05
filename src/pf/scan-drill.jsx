import { CheckCircle2, Eye, MousePointerClick } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";

import { Button } from "@/components/ui/button";
import { describeScanResult, gradeScan } from "@pf/scan-drills.js";

/** Green for a target found, red for a click that was not one. */
const STYLES = {
  found: {
    background:
      "radial-gradient(circle, rgba(34,197,94,0.85) 32%, transparent 34%)",
    boxShadow: "inset 0 0 0 2px rgba(34,197,94,0.7)",
  },
  wrong: {
    background:
      "radial-gradient(circle, rgba(239,68,68,0.8) 32%, transparent 34%)",
    boxShadow: "inset 0 0 0 2px rgba(239,68,68,0.6)",
  },
  picked: { boxShadow: "inset 0 0 0 3px rgba(56,189,248,0.85)" },
  missed: { boxShadow: "inset 0 0 0 3px rgba(250,204,21,0.9)" },
};

/**
 * Click a square, not a piece.
 *
 * Three to eight seconds a rep and no engine anywhere near it: the answer key
 * shipped with the position, proved from the board (D13), so grading is a set
 * comparison and the feedback is instant. That is what makes twenty reps a
 * minute possible, and twenty reps a minute is the whole reason the format
 * exists (PRD §79.1).
 *
 * **`sweep` gives partial credit**, and a false positive costs as much as a
 * miss — otherwise clicking every square would score full marks. The feedback
 * a learner needs is "four of five, you missed g4", not "wrong".
 *
 * Untimed, deliberately. Latency is recorded by the session as telemetry, but
 * a new pattern is drilled slowly first (§75.5) and the timer would train
 * guessing (D3).
 * @param {object} props component props
 * @param {object} props.position a `scan` or `sweep` position
 * @param {Function} props.onMiss called when the answer was not complete
 * @param {Function} props.onHelp called when the answer is revealed
 * @param {Function} props.onResolve called once with "solved" or "revealed"
 */
const ScanDrill = ({ position, onMiss, onHelp, onResolve }) => {
  const [picked, setPicked] = useState([]);
  const [result, setResult] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const isSweep = position.type === "sweep";
  const finished = result !== null || revealed;

  const toggle = useCallback(
    ({ square }) => {
      if (finished) return;
      setPicked((current) => {
        // A scan has one answer, so a second click replaces the first rather
        // than adding to it — clicking twice must not read as a wrong guess.
        if (!isSweep) return [square];
        return current.includes(square)
          ? current.filter((s) => s !== square)
          : [...current, square];
      });
    },
    [finished, isSweep],
  );

  const submit = useCallback(() => {
    if (finished || picked.length === 0) return;
    const graded = gradeScan(position, picked);
    setResult(graded);
    if (!graded.correct) onMiss?.();
    onResolve?.(graded.correct ? "solved" : "wrong");
  }, [finished, picked, position, onMiss, onResolve]);

  const reveal = useCallback(() => {
    setRevealed(true);
    setResult(gradeScan(position, picked));
    onHelp?.();
    onMiss?.();
    onResolve?.("revealed");
  }, [position, picked, onHelp, onMiss, onResolve]);

  const squareStyles = useMemo(() => {
    const styles = {};
    if (!finished) {
      for (const square of picked) styles[square] = STYLES.picked;
      return styles;
    }
    for (const square of result?.found ?? []) styles[square] = STYLES.found;
    for (const square of result?.wrong ?? []) styles[square] = STYLES.wrong;
    for (const square of result?.missed ?? []) {
      styles[square] = revealed ? STYLES.found : STYLES.missed;
    }
    return styles;
  }, [finished, picked, result, revealed]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
        <p className="text-sm text-foreground">
          {position.prompt.replaceAll("**", "")}
        </p>
      </div>

      <div className="mx-auto w-full max-w-[420px]">
        <Chessboard
          options={{
            position: position.fen,
            boardOrientation: position.orientation ?? "white",
            allowDragging: false,
            onSquareClick: toggle,
            squareStyles,
            id: `scan-${position.id}`,
          }}
        />
      </div>

      {!finished && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {picked.length === 0
              ? isSweep
                ? "Click every square that qualifies."
                : "Click one square."
              : `${picked.length} selected${isSweep ? " — click again to unselect" : ""}`}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={reveal}
              className="h-7 px-2 text-[11px]"
            >
              <Eye className="h-3 w-3" /> Show me
            </Button>
            <Button
              size="sm"
              onClick={submit}
              disabled={picked.length === 0}
              className="h-7 px-2 text-[11px]"
            >
              <CheckCircle2 className="h-3 w-3" /> Check
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div
          className={`rounded-md border p-2 text-xs ${
            result.correct
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-orange-500/40 bg-orange-500/10 text-orange-200"
          }`}
        >
          {describeScanResult(position, result)}
          {isSweep && result.total > 1 && (
            <span className="ml-1 text-muted-foreground">
              ({Math.round(result.score * 100)}%)
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ScanDrill;
