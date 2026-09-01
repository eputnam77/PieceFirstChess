/**
 * The error log, and the loop that points training at your actual weaknesses.
 *
 * Handbook Part XIV: "Your training should be driven by error frequency, not by
 * random content." That only works if errors are tagged with something the
 * curriculum can act on, so every mistake is tagged with the *PieceFirst step
 * that would have caught it* — the same eight steps the curriculum is indexed
 * by. The result is a closed loop: a game produces errors, errors name a step,
 * and the step reorders tomorrow's queue.
 *
 * The classifier is deliberately conservative and pure. It reads the position
 * before the move, the move played, and the engine's preferred move, and asks
 * which step of the protocol would have surfaced the problem:
 *
 * PF7 VERIFY  – the move you played hands over material to a simple capture.
 *               The blunder scan you skipped would have caught it.
 * PF2 SAFETY  – you already had a piece hanging and played something else.
 * PF3 FORCE   – the best move was a check or capture and you played neither.
 * PF6 CALCULATE – a forcing move was played, but the wrong one.
 * PF5 PIECEFIRST – no material involved: a quiet move that made the position
 *               worse, which is what the "improve the worst piece" step is for.
 *
 * PF1, PF4 and PF4.5 are never assigned. Failing to notice what changed, missing
 * a pawn break, or ignoring the opponent's plan are all real errors, but they are
 * not decidable from one position and one engine line, and a classifier that
 * guessed at them would poison the queue it is supposed to steer.
 */

import { Chess } from "chess.js";

/** Rough piece values, only used to compare a capture against its capturer. */
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Steps this classifier can assign, in the order it tries them. */
export const FAILURE_STEPS = Object.freeze(["PF7", "PF2", "PF3", "PF6", "PF5"]);

const other = (color) => (color === "w" ? "b" : "w");

/** Every piece of `color` that is attacked and worth more than its cheapest attacker. */
const looseMaterial = (game, color) => {
  const found = [];
  for (const [type, value] of Object.entries(VALUE)) {
    if (type === "k") continue;
    for (const square of game.findPiece({ type, color })) {
      const attackers = game.attackers(square, other(color));
      if (attackers.length === 0) continue;
      const defenders = game.attackers(square, color);
      const cheapestAttacker = Math.min(
        ...attackers.map((from) => VALUE[game.get(from)?.type ?? "p"]),
      );
      // Undefended, or worth more than whatever can take it.
      if (defenders.length === 0 || value > cheapestAttacker) {
        found.push({ square, type, value });
      }
    }
  }
  return found;
};

/** Whether a SAN move is a check or a capture. */
const isForcing = (san) =>
  typeof san === "string" && (san.includes("x") || san.includes("+"));

/**
 * Which PieceFirst step would have caught this mistake.
 *
 * Pure: everything it needs is in the arguments, so the whole rulebook is
 * testable without an engine or a database.
 * @param {object} error one entry from `analyzeFullGame().blunders`
 * @returns {string|null} a PF step key, or null when the entry is unusable
 */
export const classifyFailureStep = (error) => {
  if (!error?.preFen || !error?.san) return null;

  let before;
  let after;
  try {
    before = new Chess(error.preFen);
    after = new Chess(error.preFen);
    if (!after.move(error.san)) return null;
  } catch {
    return null;
  }

  const mover = before.turn();

  // PF7: the move you chose is the thing that loses material.
  const hangingAfter = looseMaterial(after, mover);
  const hangingBefore = looseMaterial(before, mover);
  const worstAfter = Math.max(0, ...hangingAfter.map((piece) => piece.value));
  const worstBefore = Math.max(0, ...hangingBefore.map((piece) => piece.value));
  if (worstAfter > worstBefore) return "PF7";

  // PF2: something was already hanging and you played elsewhere.
  if (worstBefore > 0 && worstAfter >= worstBefore) return "PF2";

  // PF3 / PF6: the engine wanted a forcing move.
  if (isForcing(error.bestSan)) {
    return isForcing(error.san) ? "PF6" : "PF3";
  }

  // Nothing material was at stake: a quiet move that made things worse.
  return "PF5";
};

/**
 * Tag every error in a game report with its failure step.
 * @param {object[]} blunders entries from `analyzeFullGame().blunders`
 * @param {object} [options] which side to keep
 * @param {string} [options.side] "w" or "b" to keep only your own errors
 * @returns {object[]} entries with a `pfStep` field, unclassifiable ones dropped
 */
export const tagErrors = (blunders = [], { side } = {}) =>
  blunders
    .filter((error) => !side || error.side === side)
    .map((error) => ({ ...error, pfStep: classifyFailureStep(error) }))
    .filter((error) => error.pfStep !== null);

/**
 * Count tagged errors per PieceFirst step, weighted by severity.
 *
 * Blunders count double: one blunder is worth more attention than two
 * inaccuracies, and an unweighted count would say otherwise.
 * @param {object[]} tagged entries from `tagErrors`
 * @returns {Record<string, number>} step key to weight
 */
export const weighByStep = (tagged = []) => {
  const weights = {};
  for (const error of tagged) {
    const weight = error.quality === "Blunder" ? 2 : 1;
    weights[error.pfStep] = (weights[error.pfStep] ?? 0) + weight;
  }
  return weights;
};

/**
 * The steps you fail most often, worst first.
 * @param {Record<string, number>} weights output of `weighByStep`
 * @returns {string[]} step keys ordered by weight, descending
 */
export const rankSteps = (weights = {}) =>
  Object.entries(weights)
    .sort(([stepA, a], [stepB, b]) => b - a || stepA.localeCompare(stepB))
    .map(([step]) => step);

/**
 * Merge a game's errors into a stored tally.
 *
 * Kept as a pure reducer so the store, the tests and any future import path all
 * agree on what merging means.
 * @param {object} tally existing `{ weights, games, updatedAt }` or an empty object
 * @param {object[]} tagged entries from `tagErrors`
 * @param {number} [now] timestamp for `updatedAt`
 * @returns {object} the merged tally
 */
export const mergeIntoTally = (tally, tagged, now = Date.now()) => {
  const weights = { ...(tally?.weights ?? {}) };
  for (const [step, weight] of Object.entries(weighByStep(tagged))) {
    weights[step] = (weights[step] ?? 0) + weight;
  }
  return {
    weights,
    games: (tally?.games ?? 0) + 1,
    errors: (tally?.errors ?? 0) + tagged.length,
    updatedAt: now,
  };
};
