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
 *   - generated scan/sweep reps in `scan-drills.js`, from `npm run generate:scan`
 *
 * An item with no entry here simply has no drills yet and is skipped by the
 * session builder — see `getStudyableItems()` in `src/lib/curriculum.js`.
 *
 * Every solution-bearing position is checked against its own FEN on the way in
 * — see `isPlayableLine` — so a line that cannot be played never reaches a
 * board. `npm run verify:drills` reports what was dropped and why.
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
 * type: "scan"         – click the one square the prompt asks for
 * type: "sweep"        – click every square that qualifies, on partial credit
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

import { Chess } from "chess.js";

import { DRILLS_BY_ITEM } from "@/data/endgame-drills";
import { LICHESS_POSITIONS } from "@/data/lichess-positions";
import { PUZZLES } from "@/data/puzzles";
import { SCAN_POSITIONS } from "@/data/scan-drills";
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
 * Whether a solution line can actually be played to the end.
 *
 * Two ways a line is unplayable, and both have shipped:
 *
 * 1. **An even ply count.** Solutions alternate student, opponent, student, so
 *    a well-formed line ends on the student's move. An even count means the
 *    drill plays the opponent's reply and then sits waiting for a student move
 *    that is not in the solution, hanging forever. One curated entry (Legall's
 *    Trap) is such a line — it even has the student walking into mate.
 * 2. **A move that is not legal in its own position.** `npm run verify:drills`
 *    found eleven hand-curated puzzles like this: `m20` "Alekhine's Gun" runs a
 *    rook through a pawn, `m16` moves a pawn the way a knight moves, `e13`
 *    "Skewer the King" moves a bishop that is absolutely pinned. The learner
 *    cannot solve any of them — the drill can only be revealed.
 *
 * Dropping them here rather than editing the data is deliberate: the intended
 * idea behind a broken FEN is a guess, and a guessed puzzle is the thing the
 * verifier exists to keep out. The gate reports them, this filter keeps them
 * off the board, and a corrected entry starts passing with no code change.
 */
const isPlayableLine = (position) => {
  const solution = position.solution ?? [];
  if (solution.length === 0 || solution.length % 2 === 0) return false;
  try {
    const game = new Chess(position.fen);
    for (const uci of solution) {
      const move = game.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });
      if (!move) return false;
    }
  } catch {
    return false;
  }
  return true;
};

/** Drop unplayable lines from a source, leaving every other type untouched. */
const playableOnly = (positions = []) =>
  positions.filter(
    (position) => position.solution === undefined || isPlayableLine(position),
  );

const PUZZLE_POSITIONS = Object.fromEntries(
  Object.entries(PUZZLE_REFS).map(([itemId, puzzleIds]) => [
    itemId,
    puzzleIds.map((puzzleId) => toPosition(puzzleId, itemId)),
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

/**
 * Generated recognition reps — `scan` and `sweep`. Built by
 * `npm run generate:scan` from every FEN already in the repo, with answer keys
 * proved from the board rather than searched. This is what gives PF2 SAFETY a
 * dedicated drill for the first time (PRD §80.4).
 */
const SCAN_BY_ITEM = SCAN_POSITIONS;

/**
 * Every source of drill positions, merged per curriculum item in this order.
 *
 * `verify` says whether solution lines are replayed at import. It is on for
 * every hand-written source, because that is where unplayable lines have
 * actually come from — eleven curated puzzles and one tabiya line.
 *
 * It is **off for the Lichess import**, and that is a cost decision, not a
 * trust one: replaying all 481 lines takes ~143ms, and 462 of them are these.
 * Paying that on every app start to re-check machine-generated data would be
 * the wrong trade when `npm run verify:drills` checks all of it in CI, before
 * anything ships. Hand-written data changes in a text editor; imported data
 * changes only by re-running a script that has to pass the gate.
 */
const SOURCES = [
  { positions: PROTOCOL_BY_ITEM, verify: true },
  { positions: PUZZLE_POSITIONS, verify: true },
  { positions: IMPORTED_POSITIONS, verify: false },
  { positions: AUTHORED_POSITIONS, verify: true },
  { positions: ENDGAME_POSITIONS, verify: true },
  { positions: TABIYA_BY_ITEM, verify: true },
  { positions: SCAN_BY_ITEM, verify: true },
];

/** Curriculum item id → every drill position for it, from all sources. */
export const POSITIONS_BY_ITEM = Object.freeze(
  Object.fromEntries(
    [
      ...new Set(SOURCES.flatMap((source) => Object.keys(source.positions))),
    ].map((itemId) => [
      itemId,
      Object.freeze(
        SOURCES.flatMap((source) => {
          const forItem = source.positions[itemId] ?? [];
          return source.verify ? playableOnly(forItem) : forItem;
        }),
      ),
    ]),
  ),
);

/** Curriculum item ids that currently have at least one drill position. */
export const SEEDED_ITEM_IDS = Object.freeze(Object.keys(POSITIONS_BY_ITEM));
