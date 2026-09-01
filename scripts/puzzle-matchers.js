/**
 * Pattern matchers for the Lichess puzzle import.
 *
 * Split out from `import-lichess-puzzles.js` so the detectors can be unit
 * tested (`import-lichess-puzzles.test.js`) without the CLI shebang, and
 * without the 1 GB download that script performs.
 *
 * Theme tags alone cannot reach every curriculum item — Lichess has no theme
 * for a royal fork, a battery, or Lolli's mate. Where a pattern is decidable
 * from the board it is detected instead: the `match` predicates below inspect
 * the position after the student's first move, or the final mating position.
 * Patterns that are *not* reliably decidable (windmill, desperado, fortress)
 * are deliberately absent here and hand-authored in `authored-positions.js`.
 */

import { Chess } from "chess.js";

// ── Board geometry helpers ───────────────────────────────────────────────────

const FILES = "abcdefgh";
const square = (file, rank) => FILES[file] + (rank + 1);
const fileOf = (name) => FILES.indexOf(name[0]);
const rankOf = (name) => Number(name[1]) - 1;
const onBoard = (file, rank) => file >= 0 && file < 8 && rank >= 0 && rank < 8;
const opposite = (color) => (color === "w" ? "b" : "w");

const DIAGONALS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const ORTHOGONALS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** Directions a piece of `type` slides along; empty for non-sliders. */
const rayDirections = (type) => {
  if (type === "q") return [...DIAGONALS, ...ORTHOGONALS];
  if (type === "b") return DIAGONALS;
  if (type === "r") return ORTHOGONALS;
  return [];
};

const findKing = (game, color) => game.findPiece({ type: "k", color })[0];

/** Squares adjacent to `name`, clipped to the board. */
const neighbours = (name) => {
  const out = [];
  for (const [df, dr] of [...DIAGONALS, ...ORTHOGONALS]) {
    const file = fileOf(name) + df;
    const rank = rankOf(name) + dr;
    if (onBoard(file, rank)) out.push(square(file, rank));
  }
  return out;
};

const isAdjacent = (a, b) =>
  a !== b &&
  Math.abs(fileOf(a) - fileOf(b)) <= 1 &&
  Math.abs(rankOf(a) - rankOf(b)) <= 1;

/** First occupied square walking from `from` along (df, dr), or null. */
const firstOccupant = (game, from, df, dr) => {
  let file = fileOf(from) + df;
  let rank = rankOf(from) + dr;
  while (onBoard(file, rank)) {
    const name = square(file, rank);
    const piece = game.get(name);
    if (piece) return { square: name, piece };
    file += df;
    rank += dr;
  }
  return null;
};

/** Whether any `color` piece of one of `types` attacks `target`. */
const attackedByType = (game, target, color, types) =>
  game
    .attackers(target, color)
    .some((from) => types.includes(game.get(from)?.type));

// ── Tactical detectors ───────────────────────────────────────────────────────
// Each takes the context built by `makeContext` and answers one question about
// the position after the student's first move.

/** T-05: the student's move hits the enemy king and queen at once. */
const isRoyalFork = (context) => {
  const { after, student, firstMove } = context;
  const enemy = opposite(student);
  const king = findKing(after, enemy);
  const queens = after.findPiece({ type: "q", color: enemy });
  if (!king || queens.length === 0) return false;
  const hits = (target) =>
    after.attackers(target, student).includes(firstMove.to);
  return hits(king) && queens.some(hits);
};

/**
 * Pins created by the piece now standing on `from`: an enemy piece with a
 * second enemy piece directly behind it on the same ray.
 * @param {object} game position to read
 * @param {string} from square the pinning piece stands on
 * @param {string} enemy colour being pinned
 * @returns {object[]} one `{ near, far }` per pin found
 */
const pinsFrom = (game, from, enemy) => {
  const piece = game.get(from);
  if (!piece) return [];
  const found = [];
  for (const [df, dr] of rayDirections(piece.type)) {
    const near = firstOccupant(game, from, df, dr);
    if (!near || near.piece.color !== enemy) continue;
    const far = firstOccupant(game, near.square, df, dr);
    if (!far || far.piece.color !== enemy) continue;
    found.push({ near: near.piece, far: far.piece });
  }
  return found;
};

const PIECE_VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

/** T-07: a pin where the shielded piece is not the king but is worth more. */
const isRelativePin = (context) =>
  pinsFrom(context.after, context.firstMove.to, opposite(context.student)).some(
    ({ near, far }) =>
      far.type !== "k" && PIECE_VALUE[far.type] > PIECE_VALUE[near.type],
  );

/** T-12: the check comes from a piece that did not move. */
const isDiscoveredCheck = (context) => {
  const { after, student, firstMove } = context;
  if (!after.isCheck()) return false;
  const king = findKing(after, opposite(student));
  const checkers = after.attackers(king, student);
  return checkers.length === 1 && !checkers.includes(firstMove.to);
};

/** T-14: the move completes a battery aimed at an enemy piece. */
const isBattery = (context) => {
  const { after, student, firstMove } = context;
  const front = after.get(firstMove.to);
  if (!front || !["q", "r", "b"].includes(front.type)) return false;
  const enemy = opposite(student);

  for (const [df, dr] of rayDirections(front.type)) {
    const rear = firstOccupant(after, firstMove.to, -df, -dr);
    if (!rear || rear.piece.color !== student) continue;
    if (!["q", "r", "b"].includes(rear.piece.type)) continue;
    const rearSlidesThisWay = rayDirections(rear.piece.type).some(
      ([a, b]) => a === df && b === dr,
    );
    if (!rearSlidesThisWay) continue;
    const target = firstOccupant(after, firstMove.to, df, dr);
    if (target && target.piece.color === enemy) return true;
  }
  return false;
};

const CORNER_PAWN_SQUARES = new Set(["a2", "a7", "h2", "h7"]);
const F_SQUARES = new Set(["f7", "f2"]);
const H_SQUARES = new Set(["h7", "h2"]);
const COVER_SQUARES = new Set(["f6", "f3", "g7", "g2"]);

/**
 * T-31: the classic ...Bxh2 / Bxa7 bishop that never gets out.
 *
 * Counts both halves of the pattern: the bishop actually being collected, and
 * the pawn move that shuts the door on it.
 * @param {object} context position facts for the puzzle
 * @returns {boolean} true when the trapped-bishop pattern is on the board
 */
const isTrappedBishopPattern = (context) => {
  const collected = context.moves.some(
    (move) => move.captured === "b" && CORNER_PAWN_SQUARES.has(move.to),
  );
  if (collected) return true;

  const { start, after, student, firstMove } = context;
  if (firstMove.piece !== "p") return false;
  return start
    .findPiece({ type: "b", color: opposite(student) })
    .some(
      (name) =>
        CORNER_PAWN_SQUARES.has(name) &&
        after.attackers(name, student).includes(firstMove.to),
    );
};

/** T-37: a bishop sacrifices itself on h7/h2 with check. */
const isGreekGift = (context) =>
  context.firstMove.piece === "b" &&
  context.firstMove.captured === "p" &&
  H_SQUARES.has(context.firstMove.to) &&
  context.after.isCheck();

/** T-38: a minor piece smashes f7/f2. */
const isFSquareDemolition = (context) =>
  ["n", "b"].includes(context.firstMove.piece) &&
  Boolean(context.firstMove.captured) &&
  F_SQUARES.has(context.firstMove.to);

/** T-39: a major piece smashes h7/h2. */
const isHFileDemolition = (context) =>
  ["r", "q"].includes(context.firstMove.piece) &&
  Boolean(context.firstMove.captured) &&
  H_SQUARES.has(context.firstMove.to);

/** T-40: a bishop removes the castled king's cover. */
const isCoverDestruction = (context) =>
  context.firstMove.piece === "b" &&
  Boolean(context.firstMove.captured) &&
  COVER_SQUARES.has(context.firstMove.to);

/** T-41: the breakthrough is made by a pawn. */
const isPawnStorm = (context) => context.firstMove.piece === "p";

/** T-29: the first move is a check and the follow-up cashes in. */
const isTempoCheck = (context) =>
  context.after.isCheck() &&
  context.moves.length >= 3 &&
  Boolean(context.moves[2].captured);

/** T-23: a wing pawn runs while the enemy king is on the other side. */
const isOutsidePasser = (context) => {
  const { after, student, firstMove } = context;
  if (firstMove.piece !== "p") return false;
  const king = findKing(after, opposite(student));
  if (!king) return false;
  return Math.abs(fileOf(firstMove.from) - fileOf(king)) >= 3;
};

/** T-24: two connected passers on adjacent files against a rook. */
const isConnectedPassers = (context) => {
  const { start, student } = context;
  const enemy = opposite(student);
  if (start.findPiece({ type: "r", color: enemy }).length === 0) return false;

  const advanced = start
    .findPiece({ type: "p", color: student })
    .filter((name) =>
      student === "w" ? rankOf(name) >= 4 : rankOf(name) <= 3,
    );

  return advanced.some((a) =>
    advanced.some((b) => Math.abs(fileOf(a) - fileOf(b)) === 1),
  );
};

/**
 * T-10: the move defends a friendly piece *through* an enemy piece.
 *
 * That is the whole motif: the defence only works because the line will clear
 * once the enemy piece on it moves or is captured, so it has to be seen rather
 * than counted.
 * @param {object} context position facts for the puzzle
 * @returns {boolean} true when an x-ray defence was set up
 */
const isXrayDefence = (context) => {
  const { after, student, firstMove } = context;
  const piece = after.get(firstMove.to);
  if (!piece) return false;
  const enemy = opposite(student);

  for (const [df, dr] of rayDirections(piece.type)) {
    const near = firstOccupant(after, firstMove.to, df, dr);
    if (!near || near.piece.color !== enemy) continue;
    const far = firstOccupant(after, near.square, df, dr);
    if (!far || far.piece.color !== student) continue;
    // A defence of something nobody is attacking is not a defence.
    if (after.attackers(far.square, enemy).length > 0) return true;
  }
  return false;
};

/** How many `color` pieces the piece standing on `guard` is defending. */
const guardCount = (game, guard, color) => {
  let count = 0;
  for (const type of ["p", "n", "b", "r", "q"]) {
    for (const name of game.findPiece({ type, color })) {
      if (name === guard) continue;
      if (game.attackers(name, color).includes(guard)) count++;
      if (count >= 2) return count;
    }
  }
  return count;
};

/**
 * T-17: the captured defender had two jobs.
 *
 * Lichess tags overloading and deflection alike, so the distinction is drawn
 * here: an overloaded piece is one that was guarding two or more of its own
 * pieces when it was removed.
 * @param {object} context position facts for the puzzle
 * @returns {boolean} true when the removed piece was doing two jobs
 */
const isOverload = (context) => {
  const { start, student, firstMove } = context;
  if (!firstMove.captured) return false;
  return guardCount(start, firstMove.to, opposite(student)) >= 2;
};

/** T-20: a pawn capture takes the pawn that props up an enemy chain. */
const isUndermining = (context) => {
  const { start, student, firstMove } = context;
  if (firstMove.piece !== "p" || firstMove.captured !== "p") return false;

  const enemy = opposite(student);
  const forward = enemy === "w" ? 1 : -1;
  return [-1, 1].some((df) => {
    const file = fileOf(firstMove.to) + df;
    const rank = rankOf(firstMove.to) + forward;
    if (!onBoard(file, rank)) return false;
    const propped = start.get(square(file, rank));
    return Boolean(propped && propped.color === enemy && propped.type === "p");
  });
};

/**
 * T-26: a doomed piece sells itself before it is collected.
 *
 * The signature is that the piece was already attacked by something cheaper, it
 * grabs material anyway, and the opponent takes it on the square it landed on —
 * the defining "it was lost regardless" shape.
 * @param {object} context position facts for the puzzle
 * @returns {boolean} true when the first move is a desperado
 */
const isDesperado = (context) => {
  const { start, student, firstMove, moves } = context;
  if (!firstMove.captured || moves.length < 2) return false;
  if (moves[1].to !== firstMove.to || !moves[1].captured) return false;

  return start
    .attackers(firstMove.from, opposite(student))
    .some(
      (from) =>
        PIECE_VALUE[start.get(from).type] < PIECE_VALUE[firstMove.piece],
    );
};

/**
 * T-32: one piece keeps checking and collecting while the king shuttles.
 *
 * The windmill's fingerprint is that the king only ever has two squares and the
 * same attacker keeps striking between them.
 * @param {object} context position facts for the puzzle
 * @returns {boolean} true when the line is a windmill
 */
const isWindmill = (context) => {
  const { moves } = context;
  if (moves.length < 5) return false;

  const mine = moves.filter((_, index) => index % 2 === 0);
  const theirs = moves.filter((_, index) => index % 2 === 1);

  const kingSteps = theirs.filter((move) => move.piece === "k");
  if (kingSteps.length < 2) return false;
  if (new Set(kingSteps.map((move) => move.to)).size > 2) return false;

  const captures = mine.filter((move) => move.captured).length;
  return captures >= 2 && new Set(mine.map((move) => move.piece)).size === 1;
};

/** Material a side has on the board, in pawns. */
const materialFor = (game, color) =>
  ["p", "n", "b", "r", "q"].reduce(
    (total, type) =>
      total + game.findPiece({ type, color }).length * PIECE_VALUE[type],
    0,
  );

/**
 * T-33: every move of the line is a check and nothing is ever won.
 *
 * The point of a perpetual is that the side giving check is *behind* — checking
 * forever is the only way to survive — so a material deficit is required.
 * @param {object} context position facts for the puzzle
 * @returns {boolean} true when the line is a perpetual-check save
 */
const isPerpetualCheck = (context) => {
  const { moves, final, student } = context;
  const mine = moves.filter((_, index) => index % 2 === 0);
  if (mine.length < 3) return false;
  if (final.isCheckmate()) return false;
  if (!mine.every((move) => move.san.endsWith("+"))) return false;

  return (
    materialFor(final, student) < materialFor(final, opposite(student)) - 2
  );
};

/** T-34: the line ends in stalemate — the save was to have no move at all. */
const isStalemateResource = (context) => context.final.isStalemate();

/**
 * T-42: a quiet shelter-pawn move that gives the king a flight square.
 *
 * The archetype is h3 or g3 played *before* the back rank becomes a problem,
 * which is prophylaxis rather than tactics — the reason it needs its own drill.
 * @param {object} context position facts for the puzzle
 * @returns {boolean} true when the move makes luft for the student's own king
 */
const isLuftMove = (context) => {
  const { start, student, firstMove } = context;
  if (firstMove.piece !== "p" || firstMove.captured) return false;
  const king = findKing(start, student);
  if (!king) return false;
  const homeRank = student === "w" ? 0 : 7;
  return rankOf(king) === homeRank && isAdjacent(firstMove.from, king);
};

// ── Mating-pattern detectors ─────────────────────────────────────────────────
// These read the final position of the solution line. Geometry follows the
// standard descriptions in https://en.wikipedia.org/wiki/Checkmate_pattern.

/**
 * Facts about the mating position, or null when the line does not mate.
 * @param {object} final position after the whole solution line
 * @returns {object|null} `{ final, loser, winner, king, checkers }`
 */
const mateFacts = (final) => {
  if (!final.isCheckmate()) return null;
  const loser = final.turn();
  const winner = opposite(loser);
  const king = findKing(final, loser);
  if (!king) return null;
  return {
    final,
    loser,
    winner,
    king,
    checkers: final.attackers(king, winner),
  };
};

/** The single checking square, when the checker is of `type`. */
const soleChecker = (facts, type) => {
  if (facts.checkers.length !== 1) return null;
  const at = facts.checkers[0];
  return facts.final.get(at)?.type === type ? at : null;
};

const defendedByPawn = (facts, name) =>
  attackedByType(facts.final, name, facts.winner, ["p"]);

/** The rank in front of the mated king, from the king's point of view. */
const forwardRank = (facts) =>
  rankOf(facts.king) + (facts.loser === "b" ? -1 : 1);

/** M-06 Damiano: queen mates diagonally beside the king, propped by a pawn. */
const isDamiano = (facts) => {
  const queen = soleChecker(facts, "q");
  if (!queen || !isAdjacent(queen, facts.king)) return false;
  if (fileOf(queen) === fileOf(facts.king)) return false;
  return defendedByPawn(facts, queen);
};

/** M-12 Lolli: queen mates on the king's own file, propped by a pawn. */
const isLolli = (facts) => {
  const queen = soleChecker(facts, "q");
  if (!queen || !isAdjacent(queen, facts.king)) return false;
  if (fileOf(queen) !== fileOf(facts.king)) return false;
  return defendedByPawn(facts, queen);
};

/** M-07 Epaulette: the king's own pieces sit on both flight squares beside it. */
const isEpaulette = (facts) => {
  const rank = rankOf(facts.king);
  const left = fileOf(facts.king) - 1;
  const right = fileOf(facts.king) + 1;
  if (!onBoard(left, rank) || !onBoard(right, rank)) return false;

  const flanking = [square(left, rank), square(right, rank)].map((name) =>
    facts.final.get(name),
  );
  const bothBlocked = flanking.every(
    (piece) => piece && piece.color === facts.loser && piece.type !== "p",
  );
  if (!bothBlocked) return false;

  // The check must arrive off the rank; along it the flankers would block.
  return facts.checkers.every((at) => rankOf(at) !== rank);
};

/** M-08 Greco: queen mates down the edge file, a bishop taking the flight square. */
const isGreco = (facts) => {
  const kingFile = fileOf(facts.king);
  if (kingFile !== 0 && kingFile !== 7) return false;
  const checker = soleChecker(facts, "q") ?? soleChecker(facts, "r");
  if (!checker || fileOf(checker) !== kingFile) return false;

  const inward = kingFile === 7 ? 6 : 1;
  const flight = square(inward, rankOf(facts.king));
  if (!attackedByType(facts.final, flight, facts.winner, ["b"])) return false;

  const shield = facts.final.get(square(inward, forwardRank(facts)));
  return Boolean(shield && shield.color === facts.loser && shield.type === "p");
};

/** M-10 Ladder: two major pieces walking the king to the edge. */
const isLadder = (facts) => {
  const checker = soleChecker(facts, "r") ?? soleChecker(facts, "q");
  if (!checker) return false;

  const majors = ["r", "q"].flatMap((type) =>
    facts.final.findPiece({ type, color: facts.winner }),
  );
  const partners = majors.filter((name) => name !== checker);
  if (partners.length === 0) return false;

  if (rankOf(checker) === rankOf(facts.king)) {
    return partners.some(
      (name) => Math.abs(rankOf(name) - rankOf(facts.king)) === 1,
    );
  }
  if (fileOf(checker) === fileOf(facts.king)) {
    return partners.some(
      (name) => Math.abs(fileOf(name) - fileOf(facts.king)) === 1,
    );
  }
  return false;
};

/** M-13 Morphy: bishop mates on the long diagonal, a rook holding the g-file. */
const isMorphy = (facts) => {
  const bishop = soleChecker(facts, "b");
  if (!bishop || isAdjacent(bishop, facts.king)) return false;

  const kingFile = fileOf(facts.king);
  if (kingFile !== 0 && kingFile !== 7) return false;

  const shield = facts.final.get(square(kingFile, forwardRank(facts)));
  if (!shield || shield.color !== facts.loser || shield.type !== "p") {
    return false;
  }

  const inward = kingFile === 7 ? 6 : 1;
  return ["r", "q"].some((type) =>
    facts.final
      .findPiece({ type, color: facts.winner })
      .some((name) => fileOf(name) === inward),
  );
};

/** M-14 Opera: rook mates on the back rank, a bishop guarding it. */
const isOpera = (facts) => {
  const rook = soleChecker(facts, "r");
  if (!rook || rankOf(rook) !== rankOf(facts.king)) return false;
  if (!attackedByType(facts.final, rook, facts.winner, ["b"])) return false;

  const ahead = forwardRank(facts);
  return [fileOf(facts.king) - 1, fileOf(facts.king) + 1].some((file) => {
    if (!onBoard(file, ahead)) return false;
    const piece = facts.final.get(square(file, ahead));
    return Boolean(piece && piece.color === facts.loser && piece.type === "p");
  });
};

/** M-15 Blackburne: bishop pair plus a knight closing every square. */
const isBlackburne = (facts) => {
  const bishop = soleChecker(facts, "b");
  if (!bishop || !isAdjacent(bishop, facts.king)) return false;
  const bishops = facts.final.findPiece({ type: "b", color: facts.winner });
  const knights = facts.final.findPiece({ type: "n", color: facts.winner });
  if (bishops.length < 2 || knights.length === 0) return false;
  // The knight must be part of the net, not idle on the far wing.
  return knights.some((name) =>
    neighbours(facts.king).some((flight) =>
      facts.final.attackers(flight, facts.winner).includes(name),
    ),
  );
};

/** Wrap a mate-geometry predicate as a position matcher. */
const mating = (predicate) => (context) => {
  const facts = mateFacts(context.final);
  return facts !== null && predicate(facts);
};

// ── Curriculum matchers ──────────────────────────────────────────────────────
/**
 * Lichess theme (plus optional detector) to curriculum item.
 *
 * `priority` decides who gets first refusal on a row: a specific detector must
 * out-rank the generic theme mapping that would otherwise swallow the position.
 * `piece` narrows a generic theme to the item's actual subject — the Lichess
 * `fork` theme covers every piece, but T-01 is specifically the knight fork.
 *
 * Themes with no counterpart in the curriculum (`dovetailMate`, `killBoxMate`)
 * and generic `mate`, which says nothing about *which* pattern, are used only
 * as prefilters for detectors, never as mappings on their own.
 */
export const MATCHERS = [
  // ── Specific detectors first ──
  { themes: ["fork"], itemId: "T-05", priority: 5, match: isRoyalFork },
  { themes: ["pin"], itemId: "T-07", priority: 5, match: isRelativePin },
  {
    themes: ["discoveredAttack"],
    itemId: "T-12",
    priority: 5,
    match: isDiscoveredCheck,
  },
  {
    themes: ["kingsideAttack", "queensideAttack", "sacrifice"],
    itemId: "T-14",
    priority: 5,
    match: isBattery,
  },
  {
    themes: ["trappedPiece"],
    itemId: "T-31",
    priority: 5,
    match: isTrappedBishopPattern,
  },
  {
    themes: ["kingsideAttack", "sacrifice", "mate"],
    itemId: "T-37",
    priority: 5,
    match: isGreekGift,
  },
  {
    themes: ["attackingF2F7", "sacrifice"],
    itemId: "T-38",
    priority: 5,
    match: isFSquareDemolition,
  },
  {
    themes: ["kingsideAttack", "sacrifice", "mate"],
    itemId: "T-39",
    priority: 5,
    match: isHFileDemolition,
  },
  {
    themes: ["kingsideAttack", "sacrifice"],
    itemId: "T-40",
    priority: 5,
    match: isCoverDestruction,
  },
  {
    themes: ["kingsideAttack", "queensideAttack"],
    itemId: "T-41",
    priority: 6,
    match: isPawnStorm,
  },
  {
    themes: ["pawnEndgame"],
    itemId: "T-23",
    priority: 5,
    match: isOutsidePasser,
  },
  {
    themes: ["rookEndgame", "queenRookEndgame"],
    itemId: "T-24",
    priority: 5,
    match: isConnectedPassers,
  },
  { themes: ["crushing"], itemId: "T-29", priority: 8, match: isTempoCheck },
  {
    themes: ["defensiveMove", "quietMove", "xRayAttack"],
    itemId: "T-10",
    priority: 4,
    match: isXrayDefence,
  },
  {
    themes: ["deflection", "capturingDefender"],
    itemId: "T-17",
    priority: 4,
    match: isOverload,
  },
  {
    themes: ["advancedPawn", "crushing", "advantage", "capturingDefender"],
    itemId: "T-20",
    priority: 4,
    match: isUndermining,
  },
  {
    themes: ["sacrifice", "crushing", "advantage"],
    itemId: "T-26",
    priority: 4,
    match: isDesperado,
  },
  {
    themes: ["veryLong", "long", "crushing"],
    itemId: "T-32",
    priority: 3,
    match: isWindmill,
  },
  {
    themes: ["equality", "defensiveMove", "long", "veryLong"],
    itemId: "T-33",
    priority: 3,
    match: isPerpetualCheck,
  },
  {
    themes: ["equality", "defensiveMove", "crushing", "advantage"],
    itemId: "T-34",
    priority: 3,
    match: isStalemateResource,
  },
  {
    themes: ["defensiveMove", "quietMove", "backRankMate"],
    itemId: "T-42",
    priority: 4,
    match: isLuftMove,
  },

  // ── Named mates by theme ──
  { themes: ["backRankMate"], itemId: "M-01", priority: 10 },
  { themes: ["smotheredMate"], itemId: "M-02", priority: 10 },
  { themes: ["anastasiaMate"], itemId: "M-03", priority: 10 },
  { themes: ["arabianMate"], itemId: "M-04", priority: 10 },
  { themes: ["bodenMate"], itemId: "M-05", priority: 10 },
  { themes: ["hookMate"], itemId: "M-09", priority: 10 },
  { themes: ["vukovicMate"], itemId: "M-16", priority: 10 },

  // ── Named mates by geometry ──
  { themes: ["mate"], itemId: "M-06", priority: 12, match: mating(isDamiano) },
  {
    themes: ["mate"],
    itemId: "M-07",
    priority: 12,
    match: mating(isEpaulette),
  },
  { themes: ["mate"], itemId: "M-08", priority: 12, match: mating(isGreco) },
  { themes: ["mate"], itemId: "M-12", priority: 12, match: mating(isLolli) },
  { themes: ["mate"], itemId: "M-13", priority: 12, match: mating(isMorphy) },
  { themes: ["mate"], itemId: "M-14", priority: 12, match: mating(isOpera) },
  {
    themes: ["mate"],
    itemId: "M-15",
    priority: 12,
    match: mating(isBlackburne),
  },
  // Broadest of the mate geometries, so it goes last and takes the remainder.
  { themes: ["mate"], itemId: "M-10", priority: 16, match: mating(isLadder) },

  // ── Generic theme mappings last ──
  { themes: ["fork"], itemId: "T-01", priority: 50, piece: "n" },
  { themes: ["fork"], itemId: "T-02", priority: 50, piece: "p" },
  { themes: ["fork"], itemId: "T-03", priority: 50, piece: "q" },
  { themes: ["fork"], itemId: "T-04", priority: 50, piece: ["b", "r"] },
  { themes: ["pin"], itemId: "T-06", priority: 50 },
  { themes: ["skewer"], itemId: "T-08", priority: 50 },
  { themes: ["xRayAttack"], itemId: "T-09", priority: 50 },
  { themes: ["discoveredAttack"], itemId: "T-11", priority: 50 },
  { themes: ["doubleCheck"], itemId: "T-13", priority: 50 },
  { themes: ["deflection"], itemId: "T-15", priority: 50 },
  { themes: ["attraction"], itemId: "T-16", priority: 50 },
  { themes: ["capturingDefender"], itemId: "T-18", priority: 50 },
  { themes: ["interference"], itemId: "T-19", priority: 50 },
  { themes: ["advancedPawn"], itemId: "T-21", priority: 50 },
  { themes: ["promotion", "underPromotion"], itemId: "T-22", priority: 50 },
  { themes: ["intermezzo"], itemId: "T-25", priority: 50 },
  { themes: ["zugzwang"], itemId: "T-27", priority: 50 },
  { themes: ["clearance"], itemId: "T-28", priority: 50 },
  { themes: ["trappedPiece"], itemId: "T-30", priority: 50 },
  // Back-rank *weakness* is the PF2 mirror of the M-01 mate: the same positions
  // seen from the defender's side, so it takes what M-01 leaves.
  { themes: ["backRankMate"], itemId: "T-36", priority: 60 },
];

// ── Conversion ───────────────────────────────────────────────────────────────

/**
 * Turn a Lichess CSV row into a drill position, or null if unusable.
 *
 * Applies the opponent's setup move so the student sees the real puzzle, then
 * replays the whole solution so a bad row can never reach the app as an
 * unsolvable drill.
 * @param {object} row parsed CSV row
 * @returns {object|null} position, or null when the row cannot be converted
 */
export const toPosition = (row) => {
  const uciMoves = row.moves.split(" ").filter(Boolean);
  if (uciMoves.length < 2) return null;

  const game = new Chess();
  try {
    game.load(row.fen);
    // Moves[0] is the opponent's blunder that creates the puzzle.
    const setup = game.move({
      from: uciMoves[0].slice(0, 2),
      to: uciMoves[0].slice(2, 4),
      promotion: uciMoves[0][4],
    });
    if (!setup) return null;
  } catch {
    return null;
  }

  const solution = uciMoves.slice(1);
  const fen = game.fen();
  const student = game.turn();

  const replay = new Chess(fen);
  const moves = [];
  let afterFirst = null;
  for (const uci of solution) {
    try {
      const played = replay.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });
      if (!played) return null;
      moves.push(played);
      if (moves.length === 1) afterFirst = new Chess(replay.fen());
    } catch {
      return null;
    }
  }

  return {
    id: row.id,
    fen,
    solution,
    rating: row.rating,
    student,
    moves,
    firstMove: moves[0],
    firstPiece: moves[0].piece,
    afterFirst,
    final: replay,
    blunder: uciMoves[0],
    beforeFen: row.fen,
  };
};

/** The shape the detectors above are written against. */
export const makeContext = (position) => ({
  start: new Chess(position.fen),
  after: position.afterFirst,
  final: position.final,
  student: position.student,
  moves: position.moves,
  firstMove: position.firstMove,
});

export const matchesPiece = (matcher, firstPiece) => {
  if (!matcher.piece) return true;
  return Array.isArray(matcher.piece)
    ? matcher.piece.includes(firstPiece)
    : matcher.piece === firstPiece;
};
