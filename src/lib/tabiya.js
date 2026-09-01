/**
 * Turn tabiya cards into drill positions.
 *
 * The data in `src/data/tabiya.js` stores each opening and structure as a SAN
 * line plus its plans. This module replays those lines with chess.js so the
 * positions are derived rather than hand-written — there is exactly one place a
 * line is recorded, and a typo in it fails loudly at import instead of shipping
 * a drill nobody can complete.
 *
 * Three drill kinds come out of one card, because plan knowledge and move
 * knowledge are different skills and only one of them can be graded by a
 * machine:
 *
 * type "line"      – play your own moves in order to reach the tabiya. Objective:
 *                    graded by matching moves, like any puzzle.
 * type "card"      – state the plans from the position, then reveal and grade
 *                    yourself. Plans have no single correct move, so a
 *                    multiple-choice quiz here would teach the distractors
 *                    rather than the position.
 * type "structure" – play the structure out against Stockfish from the tabiya.
 *                    Objective: scored on whether you kept the position.
 */

import { Chess } from "chess.js";

import { TABIYA } from "@/data/tabiya";

/** Student moves allowed in a structure play-out before it is scored. */
const DEFAULT_PLAY_OUT_MOVES = 12;

const uciOf = (move) => `${move.from}${move.to}${move.promotion ?? ""}`;

/**
 * Replay a SAN line from the initial position.
 * @param {string[]} line SAN moves
 * @param {string} where identifier used in error messages
 * @returns {{ucis: string[], fens: string[], fen: string}} per-ply UCI, the FEN
 *   before each ply, and the final position
 * @throws {Error} when a move in the line is illegal
 */
export const replayLine = (line, where = "line") => {
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
        `tabiya ${where}: move ${index + 1} "${san}" is not legal here`,
      );
    }
    ucis.push(uciOf(move));
  }

  return { ucis, fens, fen: game.fen() };
};

const orientationOf = (side) => (side === "black" ? "black" : "white");

/**
 * Where a play-out starts for a given side.
 *
 * A drill has to open with the student on move. A structure is reached from one
 * side's move, so for the other side the drill backs up one ply — which is the
 * better version anyway: the student plays the move that creates the structure
 * instead of being handed it.
 * @param {string} fen the tabiya position
 * @param {string[]} fens the position before each ply of the line
 * @param {string} side "white" or "black"
 * @returns {string} the FEN the play-out starts from
 */
const playOutStart = (fen, fens, side) => {
  const wanted = side === "black" ? "b" : "w";
  if (fen.split(" ")[1] === wanted) return fen;
  return fens[fens.length - 1];
};

/**
 * Build the drill positions for one card.
 *
 * The line drill starts from the first position where the student is on move:
 * for White that is the initial position, for Black it is after White's first
 * move, which is then part of the starting FEN rather than something the
 * student has to guess.
 * @param {object} entry one entry from `TABIYA`
 * @returns {object[]} drill positions for this card
 */
const positionsFor = (entry) => {
  const { ucis, fens, fen } = replayLine(entry.line, entry.id);
  const orientation = orientationOf(entry.side);
  const isWhite = entry.side !== "black";
  const isStructure = entry.id.startsWith("S-");

  // Black's first move is ply 2, so ply 1 belongs to the opening position.
  const startPly = isWhite ? 0 : 1;
  const positions = [];

  // Only opening cards get a move-order drill. A structure is not something you
  // memorise your way into — it is reached from many openings, and the drill
  // that teaches it is the play-out below.
  if (!isStructure && ucis.length > startPly) {
    positions.push({
      type: "line",
      id: `${entry.id}-line`,
      fen: fens[startPly],
      solution: ucis.slice(startPly),
      orientation,
      prompt: `Play ${entry.side === "black" ? "Black" : "White"}'s moves to reach the ${entry.title} tabiya.`,
      source: "tabiya",
    });
  }

  positions.push({
    type: "card",
    id: `${entry.id}-card`,
    fen,
    orientation,
    card: entry.card,
    title: entry.title,
    structure: entry.structure ?? null,
    prompt:
      "From this position alone, state your plan, their plan, the pawn break and your worst piece. Then reveal and grade yourself honestly.",
    source: "tabiya",
  });

  // Structure items are played out; opening cards are routes into them.
  if (isStructure) {
    const sides = entry.bothSides
      ? [entry.side, entry.side === "black" ? "white" : "black"]
      : [entry.side];

    for (const side of sides) {
      positions.push({
        type: "structure",
        id: `${entry.id}-play-${side}`,
        fen: playOutStart(fen, fens, side),
        studentColor: side,
        maxMoves: entry.playOut ?? DEFAULT_PLAY_OUT_MOVES,
        card: entry.card,
        title: entry.title,
        prompt: `Play this structure out as ${side}. You are scored on whether you keep the position, not on winning.`,
        source: "tabiya",
      });
    }
  }

  return positions;
};

/** Curriculum item id to its tabiya entry. */
export const TABIYA_BY_ID = Object.freeze(
  Object.fromEntries(TABIYA.map((entry) => [entry.id, entry])),
);

/** Curriculum item id to its derived drill positions. */
export const TABIYA_POSITIONS = Object.freeze(
  Object.fromEntries(
    TABIYA.map((entry) => [entry.id, Object.freeze(positionsFor(entry))]),
  ),
);

/**
 * Structural check of the tabiya dataset.
 *
 * Returns errors rather than throwing, matching `validateCurriculum()`, so one
 * function can back both a test and a dev-only in-app check.
 * @returns {string[]} human-readable problems; empty means the data is sound
 */
export const validateTabiya = () => {
  const errors = [];
  const seen = new Set();
  const structureIds = new Set(
    TABIYA.filter((entry) => entry.id.startsWith("S-")).map(
      (entry) => entry.id,
    ),
  );

  for (const entry of TABIYA) {
    const where = `tabiya ${entry.id}`;

    if (seen.has(entry.id)) errors.push(`${where}: duplicate id`);
    seen.add(entry.id);

    if (!["white", "black"].includes(entry.side)) {
      errors.push(`${where}: side must be "white" or "black"`);
    }
    if (!Array.isArray(entry.line) || entry.line.length < 4) {
      errors.push(`${where}: line must have at least four moves`);
    }

    try {
      replayLine(entry.line, entry.id);
    } catch (error) {
      errors.push(error.message);
    }

    for (const field of ["yours", "theirs", "breaks", "placement"]) {
      if (!entry.card?.[field]) {
        errors.push(`${where}: card is missing ${field}`);
      }
    }

    if (entry.id.startsWith("O-") && !structureIds.has(entry.structure)) {
      errors.push(
        `${where}: structure "${entry.structure}" is not a tier-4 item`,
      );
    }
  }

  return errors;
};
