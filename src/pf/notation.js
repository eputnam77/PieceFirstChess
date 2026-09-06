/**
 * The three notation helpers every tier-0 content module needs.
 *
 * They lived in `protocol-drills.js` until `step-drills.js` needed them too.
 * Moving them here rather than copying them keeps one implementation — and
 * more practically, it breaks the import cycle: `protocol-drills.js` assembles
 * the tier-0 deck *from* `step-drills.js`, so `step-drills.js` cannot import
 * back out of it.
 *
 * Pure `chess.js`. No React, no worker, no data.
 */

import { Chess } from "chess.js";

/**
 * Whose move it is, as a board orientation.
 * @param {string} fen the position
 * @returns {"white"|"black"} the side to move
 */
export const sideToMove = (fen) =>
  fen.split(" ")[1] === "b" ? "black" : "white";

/**
 * SAN for a UCI move in a position, or the UCI itself if it will not play.
 *
 * Falling back rather than throwing is deliberate: answer keys are generated,
 * and a bad one should show up as an odd-looking label in a drill that still
 * works, not as a blank screen.
 * @param {string} fen position the move is played from
 * @param {string} uci move in UCI
 * @returns {string} display notation
 */
export const toSan = (fen, uci) => {
  try {
    const game = new Chess(fen);
    const move = game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
    return move?.san ?? uci;
  } catch {
    return uci;
  }
};

/**
 * The position after one UCI move, or the original FEN if it will not play.
 * @param {string} fen starting position
 * @param {string} uci move in UCI
 * @returns {string} resulting FEN
 */
export const applyMove = (fen, uci) => {
  try {
    const game = new Chess(fen);
    game.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
    return game.fen();
  } catch {
    return fen;
  }
};

/**
 * Replay a SAN line from the initial position.
 *
 * Tier-0 authored positions are written as the moves that reach them, never as
 * a hand-typed FEN — the same rule `tabiya.js` follows, for the same reason: a
 * hand-typed FEN can be subtly wrong in a way no reader will catch, and a line
 * cannot. It also means `lastMove` is true by construction rather than by
 * assertion, which is what makes PF1 RESET answerable at all.
 * @param {string[]} line SAN moves from the starting position
 * @returns {object} the `chess.js` game at the end of the line
 * @throws {Error} if any move in the line is illegal
 */
export const replayLine = (line) => {
  const game = new Chess();
  for (const san of line) {
    const move = game.move(san);
    if (!move) {
      throw new Error(`illegal move "${san}" in line ${line.join(" ")}`);
    }
  }
  return game;
};
