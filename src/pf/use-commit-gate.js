/**
 * The Commit Gate's state, and the one seam it presents to the engine coach.
 *
 * `useEngineCoach` gets a single optional `commitGate` prop with a default of
 * `null`; when it is null nothing about Best Move or Analyze changes. That is
 * the whole integration — one call site, additive, with a default — which is
 * what keeps an upstream rewrite of the coach from taking this feature with it
 * (PRD §85.3).
 *
 * The contract the coach uses:
 *
 * ```js
 * const answer = await commitGate.request(fen, "bestMove");  // null if skipped
 * const line   = await commitGate.resolve(answer, fen, result);
 * ```
 *
 * `request()` resolves when the learner commits or skips; the engine search runs
 * concurrently, so the gate spends latency that was already there rather than
 * adding any.
 */

import { Chess } from "chess.js";
import { useCallback, useMemo, useRef, useState } from "react";

import { classifyFailureStep } from "@/lib/pf-error-log";
import { putEvent } from "@/lib/srs-db";
import { getStockfishEngine } from "@/lib/stockfish";
import {
  describePrediction,
  isCommitGateEnabled,
  renderComparison,
  setCommitGateEnabled,
  toGateEvent,
} from "@pf/commit-gate.js";
import { analyzeArguments, lineScoreCp } from "@pf/verdict.js";

/**
 * One id per page load, so the readout can report events *per session* without
 * a session concept anywhere else in the app.
 */
const SESSION_ID = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/**
 * Evaluate the position the learner's move reaches, for a move the engine did
 * not return a line for.
 *
 * The score comes back from the *opponent's* side, so it is negated to put it
 * in the mover's perspective — the same perspective `candidateSpread` is in,
 * which is what makes `practicalLoss` between them meaningful.
 * @param {string} fen the frozen position
 * @param {string} uci the learner's move
 * @returns {Promise<number|null>} centipawns for the mover, or null
 */
const evaluateAfter = async (fen, uci) => {
  let afterFen;
  try {
    const game = new Chess(fen);
    const move = game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
    if (!move) return null;
    afterFen = game.fen();
  } catch {
    return null;
  }

  try {
    const result = await getStockfishEngine().analyze(
      afterFen,
      ...analyzeArguments("commitGate"),
    );
    const [best] = result.lines ?? [];
    const cp = lineScoreCp(best);
    return cp === null ? null : -cp;
  } catch {
    // A missing second opinion means an honest `null` loss, not a guessed one.
    return null;
  }
};

/**
 * @returns {object} the gate: `{ enabled, setEnabled, pending, request, resolve, cancel }`
 */
const useCommitGate = () => {
  const [enabled, setEnabledState] = useState(isCommitGateEnabled);
  const [pending, setPending] = useState(null);
  const resolverReference = useRef(null);

  const settle = useCallback((answer) => {
    const resolve = resolverReference.current;
    resolverReference.current = null;
    setPending(null);
    resolve?.(answer);
  }, []);

  /** Open the gate and wait for the learner. Resolves null when skipped. */
  const request = useCallback(
    (fen, trigger = "bestMove") =>
      new Promise((resolve) => {
        // Only one question can be open at a time; a second Best Move click
        // abandons the first rather than orphaning its promise.
        resolverReference.current?.(null);
        resolverReference.current = resolve;
        setPending({ fen, trigger });
      }),
    [],
  );

  const onCommit = useCallback(
    (answer) => settle({ ...answer, skipped: false }),
    [settle],
  );
  const onSkip = useCallback(
    ({ ms }) => settle({ skipped: true, ms }),
    [settle],
  );

  /** Abandon an open question — the learner navigated away or reset. */
  const cancel = useCallback(() => settle(null), [settle]);

  /**
   * Score the answer against the finished search, log it, and return the line
   * to render above the card.
   * @param {object|null} answer what `request()` resolved with
   * @param {string} fen the frozen position
   * @param {object} result the `analyze()` result for that position
   * @param {string} [trigger] which button opened the gate
   * @returns {Promise<string>} markdown, or "" when there is nothing to say
   */
  const resolve = useCallback(async (answer, fen, result, trigger) => {
    if (!answer) return "";

    const write = (event) =>
      putEvent(event).catch((error) => {
        // A failed log must never take the learner's answer down with it.
        console.error("Failed to record a Commit Gate event:", error);
      });

    if (answer.skipped) {
      await write(
        toGateEvent({
          fen,
          skipped: true,
          msToCommit: answer.ms ?? null,
          sessionId: SESSION_ID,
          trigger,
        }),
      );
      return "";
    }

    const lines = result?.lines ?? [];
    const provisional = describePrediction({
      fen,
      playedUci: answer.uci,
      lines,
    });

    // Outside the returned lines the loss is unknown until the position after
    // the move is evaluated, which is the common case for a real mistake.
    const prediction = provisional.inSpread
      ? provisional
      : describePrediction({
          fen,
          playedUci: answer.uci,
          lines,
          afterCp: await evaluateAfter(fen, answer.uci),
        });

    // The same classifier the game report uses, so live play and post-game
    // analysis can never name different steps for the same mistake.
    const pfStep =
      prediction.cpLoss !== null && prediction.cpLoss > 0
        ? classifyFailureStep({
            preFen: fen,
            san: prediction.playedSan,
            bestSan: prediction.bestSan,
          })
        : null;

    await write(
      toGateEvent({
        fen,
        prediction,
        reasonChip: answer.reasonChip ?? null,
        pfStep,
        msToCommit: answer.ms ?? null,
        sessionId: SESSION_ID,
        trigger,
      }),
    );

    return renderComparison(prediction);
  }, []);

  const setEnabled = useCallback(
    (on) => {
      setCommitGateEnabled(on);
      setEnabledState(on);
      if (!on) settle(null);
    },
    [settle],
  );

  return useMemo(
    () => ({
      enabled,
      setEnabled,
      pending,
      onCommit,
      onSkip,
      request,
      resolve,
      cancel,
      sessionId: SESSION_ID,
    }),
    [enabled, setEnabled, pending, onCommit, onSkip, request, resolve, cancel],
  );
};

export default useCommitGate;
