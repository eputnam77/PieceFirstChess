/**
 * Outcome detection for endgame play-out drills.
 *
 * Pure functions over a chess.js game, so the whole scoring rulebook is
 * testable without spinning up an engine.
 *
 * Two goals, chosen because they are the only ones that can be detected
 * objectively:
 * WIN  – the student must checkmate within the move budget.
 * HOLD – the student must reach a draw, or survive the budget without losing.
 */

import { GOAL } from "@/data/endgame-drills";

/** Drill states. */
export const OUTCOME = Object.freeze({
  IN_PROGRESS: "in-progress",
  ACHIEVED: "achieved",
  FAILED: "failed",
});

/** Why a drill ended, so the UI can explain rather than just judge. */
export const REASON = Object.freeze({
  CHECKMATE_DELIVERED: "checkmate-delivered",
  CHECKMATED: "checkmated",
  STALEMATE: "stalemate",
  INSUFFICIENT_MATERIAL: "insufficient-material",
  THREEFOLD: "threefold-repetition",
  FIFTY_MOVE: "fifty-move-rule",
  DREW_BUT_NEEDED_WIN: "drew-but-needed-win",
  BUDGET_SURVIVED: "budget-survived",
  BUDGET_EXHAUSTED: "budget-exhausted",
});

const REASON_TEXT = {
  [REASON.CHECKMATE_DELIVERED]: "Checkmate — converted.",
  [REASON.CHECKMATED]: "You were checkmated.",
  [REASON.STALEMATE]: "Stalemate.",
  [REASON.INSUFFICIENT_MATERIAL]: "Draw — insufficient material.",
  [REASON.THREEFOLD]: "Draw by threefold repetition.",
  [REASON.FIFTY_MOVE]: "Draw by the fifty-move rule.",
  [REASON.DREW_BUT_NEEDED_WIN]: "Drawn, but this position was winnable.",
  [REASON.BUDGET_SURVIVED]: "You held the position.",
  [REASON.BUDGET_EXHAUSTED]: "Out of moves before you converted.",
};

/**
 * Human-readable explanation of why a drill ended.
 * @param {string} reason one of REASON
 * @returns {string} display text
 */
export const explainReason = (reason) => REASON_TEXT[reason] ?? "";

/** Which draw ended the game, if any. */
const drawReason = (game) => {
  if (game.isStalemate()) return REASON.STALEMATE;
  if (game.isInsufficientMaterial()) return REASON.INSUFFICIENT_MATERIAL;
  if (game.isThreefoldRepetition()) return REASON.THREEFOLD;
  if (game.isDraw()) return REASON.FIFTY_MOVE;
  return null;
};

/**
 * Score a drill position.
 *
 * Stalemate is deliberately asymmetric: it is a legitimate save when holding,
 * and a botched conversion when winning — which is exactly the mistake the
 * K+Q vs K drill exists to punish.
 * @param {object} game chess.js instance at the current position
 * @param {object} drill the drill being played
 * @param {number} studentMoves student moves played so far
 * @returns {{outcome: string, reason: string|null}} state and why
 */
export const evaluateOutcome = (game, drill, studentMoves) => {
  const studentIsWhite = drill.studentColor === "white";

  if (game.isCheckmate()) {
    // chess.js reports the side to move; if it is the student, they were mated.
    const studentToMove = (game.turn() === "w") === studentIsWhite;
    // Delivering mate satisfies either goal — it beats holding.
    return studentToMove
      ? { outcome: OUTCOME.FAILED, reason: REASON.CHECKMATED }
      : {
          outcome: OUTCOME.ACHIEVED,
          reason: REASON.CHECKMATE_DELIVERED,
        };
  }

  const draw = drawReason(game);
  if (draw) {
    return drill.goal === GOAL.HOLD
      ? { outcome: OUTCOME.ACHIEVED, reason: draw }
      : { outcome: OUTCOME.FAILED, reason: REASON.DREW_BUT_NEEDED_WIN };
  }

  if (studentMoves >= drill.maxMoves) {
    // Surviving the budget is the whole point of a HOLD; running out of moves
    // without mating is a failed conversion.
    return drill.goal === GOAL.HOLD
      ? { outcome: OUTCOME.ACHIEVED, reason: REASON.BUDGET_SURVIVED }
      : { outcome: OUTCOME.FAILED, reason: REASON.BUDGET_EXHAUSTED };
  }

  return { outcome: OUTCOME.IN_PROGRESS, reason: null };
};

/**
 * Moves left before the budget runs out.
 * @param {object} drill the drill being played
 * @param {number} studentMoves student moves played so far
 * @returns {number} remaining moves, never negative
 */
export const movesRemaining = (drill, studentMoves) =>
  Math.max(0, drill.maxMoves - studentMoves);

export { GOAL };
