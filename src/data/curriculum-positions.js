/**
 * Drill positions per curriculum item.
 *
 * Positions reference `PUZZLES` entries by id so FENs stay single-sourced — the
 * puzzle data remains the one place a position is defined, and this file only
 * says which curriculum item each one teaches.
 *
 * Only a subset of the 99 items is seeded so far. Tiers 1–2 will be filled from
 * the CC0 Lichess puzzle database by theme; Tiers 3–5 are hand-authored. An item
 * with no entry here simply has no drills yet and is skipped by the session
 * builder — see `getStudyableItems()` in `src/lib/curriculum.js`.
 *
 * Two kinds of position share this map, discriminated by `type`:
 *
 * type: "puzzle"  – graded by matching moves against `solution`
 * type: "endgame" – played out against Stockfish, graded by outcome
 *
 * Puzzle shape:
 * id       – unique within the item
 * fen      – starting position; side to move plays the tactic
 * solution – UCI moves; player plays [0], opponent replies [1], player [2], …
 * prompt   – short challenge text
 * source   – where the position came from, for provenance
 *
 * Endgame drills carry the fields documented in `endgame-drills.js` and are
 * certified by `npm run verify:endgames`.
 */

import { DRILLS_BY_ITEM } from "@/data/endgame-drills";
import { PUZZLES } from "@/data/puzzles";

const PUZZLE_BY_ID = new Map(PUZZLES.map((puzzle) => [puzzle.id, puzzle]));

/**
 * Curriculum item id → puzzle ids that drill it.
 *
 * The 12 generic `checkmate`-theme puzzles are deliberately unmapped. They are a
 * mixed bag (Fool's mate, Scholar's mate, back-rank strikes), and filing them
 * under one named mating pattern would drill a wrong association.
 */
const PUZZLE_REFS = {
  "T-01": ["e11", "m01", "m02", "m05", "m12", "m14", "h02", "h08"],
  "T-06": ["e14", "m04"],
  "T-08": ["e13", "m17"],
  "T-11": ["m03", "m16", "m19"],
  "T-15": ["m06", "m09", "m11", "m13", "h01", "h06", "h07"],
  "T-18": ["e12", "m08"],
  "T-22": ["e08", "m18", "h10"],
  "M-01": ["e03", "e10", "m07", "m20", "h05"],
};

/** Resolve one puzzle reference into a drill position. */
const toPosition = (puzzleId, itemId) => {
  const puzzle = PUZZLE_BY_ID.get(puzzleId);
  if (!puzzle) {
    // Fail loudly at import rather than silently dropping a drill.
    throw new Error(
      `curriculum-positions: item ${itemId} references unknown puzzle "${puzzleId}"`,
    );
  }
  return {
    type: "puzzle",
    id: puzzle.id,
    fen: puzzle.fen,
    solution: puzzle.solution,
    prompt: puzzle.description ?? puzzle.title,
    source: "puzzles",
  };
};

const PUZZLE_POSITIONS = Object.fromEntries(
  Object.entries(PUZZLE_REFS).map(([itemId, puzzleIds]) => [
    itemId,
    puzzleIds.map((puzzleId) => toPosition(puzzleId, itemId)),
  ]),
);

const ENDGAME_POSITIONS = Object.fromEntries(
  Object.entries(DRILLS_BY_ITEM).map(([itemId, drills]) => [
    itemId,
    drills.map((drill) => ({ ...drill, type: "endgame", source: "endgames" })),
  ]),
);

/** Curriculum item id → drill positions, puzzles and endgames together. */
export const POSITIONS_BY_ITEM = Object.freeze(
  Object.fromEntries(
    [
      ...new Set([
        ...Object.keys(PUZZLE_POSITIONS),
        ...Object.keys(ENDGAME_POSITIONS),
      ]),
    ].map((itemId) => [
      itemId,
      Object.freeze([
        ...(PUZZLE_POSITIONS[itemId] ?? []),
        ...(ENDGAME_POSITIONS[itemId] ?? []),
      ]),
    ]),
  ),
);

/** Curriculum item ids that currently have at least one drill position. */
export const SEEDED_ITEM_IDS = Object.freeze(Object.keys(POSITIONS_BY_ITEM));
