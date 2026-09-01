/**
 * Drill positions per curriculum item.
 *
 * Positions reference `PUZZLES` entries by id so FENs stay single-sourced — the
 * puzzle data remains the one place a position is defined, and this file only
 * says which curriculum item each one teaches.
 *
 * Positions come from six places, all merged per curriculum item:
 *   - hand-curated entries in `puzzles.js`
 *   - the CC0 Lichess puzzle database, imported by `npm run import:puzzles`
 *   - hand-authored endgame drills, certified by `npm run verify:endgames`
 *   - hand-authored lines for what neither can supply, in `authored-lines.js`
 *   - tier-0 protocol and blunder-check reps, derived in `protocol-drills.js`
 *   - tier-4/5 structure and tabiya cards, derived in `tabiya.js`
 *
 * An item with no entry here simply has no drills yet and is skipped by the
 * session builder — see `getStudyableItems()` in `src/lib/curriculum.js`.
 *
 * Five kinds of position share this map, discriminated by `type`. Each maps to
 * one drill component in `study-mode.jsx`:
 *
 * type: "puzzle"       – graded by matching moves against `solution`
 * type: "endgame"      – played out against Stockfish, graded by outcome
 * type: "blundercheck" – one candidate move, answer safe or not safe
 * type: "protocol"     – walk the eight steps, then play the move they find
 * type: "line"         – play an opening line to reach a tabiya
 * type: "card"         – recall the plans, then reveal and self-grade
 * type: "structure"    – play a structure out, scored on keeping the position
 *
 * Puzzle shape:
 * id       – unique within the item
 * fen      – starting position; side to move plays the tactic
 * solution – UCI moves; player plays [0], opponent replies [1], player [2], …
 * prompt   – short challenge text
 * source   – where the position came from, for provenance
 *
 * Endgame drills carry the fields documented in `endgame-drills.js` and are
 * certified by `npm run verify:endgames`. The derived kinds carry the fields
 * documented in `protocol-drills.js` and `tabiya.js`.
 */

import { DRILLS_BY_ITEM } from "@/data/endgame-drills";
import { LICHESS_POSITIONS } from "@/data/lichess-positions";
import { PUZZLES } from "@/data/puzzles";
import { AUTHORED_POSITIONS } from "@/lib/authored-lines";
import { PROTOCOL_POSITIONS } from "@/lib/protocol-drills";
import { TABIYA_POSITIONS } from "@/lib/tabiya";

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

/**
 * Solutions alternate student, opponent, student, so a well-formed line always
 * has an odd number of plies. An even count means the line ends on the
 * opponent's move: the drill would play that reply and then sit waiting for a
 * student move that is not in the solution, hanging forever. One curated entry
 * (Legall's Trap) is such a line — it even has the student walking into mate —
 * so it is dropped rather than shipped as an unplayable drill.
 */
const isPlayableLine = (position) => position.solution.length % 2 === 1;

const PUZZLE_POSITIONS = Object.fromEntries(
  Object.entries(PUZZLE_REFS).map(([itemId, puzzleIds]) => [
    itemId,
    puzzleIds
      .map((puzzleId) => toPosition(puzzleId, itemId))
      .filter(isPlayableLine),
  ]),
);

/** Side to move, read from the FEN — Lichess rows carry no prompt text. */
const sideToMove = (fen) => (fen.split(" ")[1] === "b" ? "Black" : "White");

const IMPORTED_POSITIONS = Object.fromEntries(
  Object.entries(LICHESS_POSITIONS).map(([itemId, positions]) => [
    itemId,
    positions.map((position) => ({
      type: "puzzle",
      id: position.id,
      fen: position.fen,
      solution: position.solution,
      // The panel already shows the item's title and summary above the board,
      // so the prompt only needs to say whose move it is.
      prompt: `${sideToMove(position.fen)} to move.`,
      rating: position.rating,
      source: "lichess",
    })),
  ]),
);

const ENDGAME_POSITIONS = Object.fromEntries(
  Object.entries(DRILLS_BY_ITEM).map(([itemId, drills]) => [
    itemId,
    drills.map((drill) => ({ ...drill, type: "endgame", source: "endgames" })),
  ]),
);

/**
 * Tier 0 — the protocol. Derived in `protocol-drills.js`: "is this move safe?"
 * reps plus full eight-step rehearsals.
 */
const PROTOCOL_BY_ITEM = { "PF-PROTOCOL": PROTOCOL_POSITIONS };

/**
 * Tiers 4 and 5 — structures and opening tabiya. Derived in `tabiya.js` by
 * replaying the SAN lines in `tabiya.js` data, so no FEN is written by hand.
 */
const TABIYA_BY_ITEM = TABIYA_POSITIONS;

/** Every source of drill positions, merged per curriculum item in this order. */
const SOURCES = [
  PROTOCOL_BY_ITEM,
  PUZZLE_POSITIONS,
  IMPORTED_POSITIONS,
  AUTHORED_POSITIONS,
  ENDGAME_POSITIONS,
  TABIYA_BY_ITEM,
];

/** Curriculum item id → every drill position for it, from all sources. */
export const POSITIONS_BY_ITEM = Object.freeze(
  Object.fromEntries(
    [...new Set(SOURCES.flatMap((source) => Object.keys(source)))].map(
      (itemId) => [
        itemId,
        Object.freeze(SOURCES.flatMap((source) => source[itemId] ?? [])),
      ],
    ),
  ),
);

/** Curriculum item ids that currently have at least one drill position. */
export const SEEDED_ITEM_IDS = Object.freeze(Object.keys(POSITIONS_BY_ITEM));
