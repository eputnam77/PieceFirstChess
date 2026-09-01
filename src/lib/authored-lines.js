/**
 * Slice hand-authored SAN lines into drill positions.
 *
 * Same approach as `tabiya.js`: the data records a line once, chess.js derives
 * the positions, and a typo fails loudly at import rather than shipping a drill
 * nobody can complete.
 */

import { Chess } from "chess.js";

import { AUTHORED_LINES } from "@/data/authored-lines";

const uciOf = (move) => `${move.from}${move.to}${move.promotion ?? ""}`;

/**
 * Replay a SAN line, keeping the position before every ply.
 * @param {string[]} line SAN moves from the initial position
 * @param {string} where identifier used in error messages
 * @returns {{ucis: string[], fens: string[], isMate: boolean}} the replay
 * @throws {Error} when a move in the line is illegal
 */
export const replayAuthored = (line, where = "line") => {
  const game = new Chess();
  const ucis = [];
  const fens = [];

  for (const [index, san] of line.entries()) {
    fens.push(game.fen());
    let move;
    try {
      move = game.move(san);
    } catch {
      move = null;
    }
    if (!move) {
      throw new Error(
        `authored ${where}: move ${index + 1} "${san}" is not legal here`,
      );
    }
    ucis.push(uciOf(move));
  }

  return { ucis, fens, isMate: game.isCheckmate() };
};

/** Turn one authored entry into a drill position. */
const toPosition = (entry) => {
  const { ucis, fens } = replayAuthored(entry.line, entry.id);
  return {
    type: "puzzle",
    id: entry.id,
    fen: fens[entry.studentFrom],
    solution: ucis.slice(entry.studentFrom),
    prompt: entry.prompt,
    source: "authored",
  };
};

/** Curriculum item id to its hand-authored drill positions. */
export const AUTHORED_POSITIONS = Object.freeze(
  AUTHORED_LINES.reduce((map, entry) => {
    (map[entry.itemId] ??= []).push(toPosition(entry));
    return map;
  }, {}),
);

/**
 * Structural check of the authored lines.
 * @returns {string[]} human-readable problems; empty means the data is sound
 */
export const validateAuthoredLines = () => {
  const errors = [];
  const seen = new Set();

  for (const entry of AUTHORED_LINES) {
    const where = `authored ${entry.id}`;
    if (seen.has(entry.id)) errors.push(`${where}: duplicate id`);
    seen.add(entry.id);

    let replay;
    try {
      replay = replayAuthored(entry.line, entry.id);
    } catch (error) {
      errors.push(error.message);
      continue;
    }

    const plies = entry.line.length - entry.studentFrom;
    if (plies < 1) {
      errors.push(`${where}: studentFrom is past the end of the line`);
    } else if (plies % 2 === 0) {
      // An even count leaves the drill waiting for a move that is not in the
      // solution, which hangs the board rather than failing visibly.
      errors.push(
        `${where}: ${plies} plies from studentFrom — must be odd so the line ends on the student's move`,
      );
    }

    if (entry.endsInMate && !replay.isMate) {
      errors.push(`${where}: claims to end in mate but the line does not`);
    }
  }

  return errors;
};
