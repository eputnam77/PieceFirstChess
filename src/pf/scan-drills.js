/**
 * `scan` and `sweep` — click a square, not a piece.
 *
 * A puzzle asks for a move and takes thirty seconds. These ask "where?" and
 * take three to eight, which is roughly 5–8× the rep rate, and they train
 * perceptual chunking directly rather than as a by-product of calculation
 * (PRD §79.1). No drag, no promotion dialog, no engine reply, no waiting.
 *
 * **`sweep` is the more important of the two**, and it is why this exists at
 * all: "click every piece of yours they can win" *is* PF2 SAFETY in one click,
 * and partial credit — "4 of 5, you missed the knight on g4" — is exactly the
 * corrective feedback the format is for. Before this, PF2 had no dedicated
 * drill and was the thin step of the whole curriculum (PRD §80.4).
 *
 * ## The answer keys are proved, not searched (D13)
 *
 * Every key here comes from deterministic legal-board logic — `looseMaterial()`
 * and `chess.js`'s own move generator — so it is provable, reproducible, and
 * free. That is deliberate and it is the ordering the plan insists on: an
 * engine can *reject* a tactically unsound target, but it cannot certify a
 * claim like "this piece is loose", because that is a statement about the board
 * rather than a number. Semantic prompts that need a human ("the piece doing
 * all the defending") are therefore not generated here at all.
 *
 * Content is consequently near-unbounded: every FEN already in the repo, and
 * every position from every saved game, is eligible. No authoring.
 *
 * Pure module: `chess.js` and arithmetic. No engine, no I/O, no React.
 */

import { Chess } from "chess.js";

import { looseMaterial } from "@/lib/pf-error-log";

/** Minimum value a fork target must have for the fork to be worth seeing. */
const FORK_TARGET_VALUE = 3;
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

const other = (color) => (color === "w" ? "b" : "w");

/**
 * The rules a generated drill can be built on.
 *
 * Each is a claim that `chess.js` can settle on its own. Adding one means
 * adding a prover, not adding an opinion.
 */
export const SCAN_RULES = Object.freeze({
  LOOSE_MATERIAL: "loose-material",
  KNIGHT_FORK: "knight-fork",
  CHECK_SQUARES: "check-squares",
});

/**
 * Load a position, or refuse it.
 *
 * Three refusals, and the third is the one that bit: a finished position has no
 * "what can they win" to ask about; an unparseable FEN obviously has none; and
 * a position where **the side that just moved is left in check** is not a
 * position at all. `chess.js` loads that last one happily and will generate
 * moves for it, so the generator produced two drills from a broken corpus
 * entry (`7k/5N1R/8/8/8/8/8/7K w`, where Black is in check with White to
 * move). It is the same trap `verify-endgames.js` documents, where Stockfish
 * returns "bestmove (none)" and a meaningless 0.00.
 * @param {string} fen the position
 * @returns {object|null} a `chess.js` game, or null if the FEN is unusable
 */
const load = (fen) => {
  try {
    const game = new Chess(fen);
    if (game.isGameOver()) return null;
    const waiting = other(game.turn());
    const king = game
      .board()
      .flat()
      .find((piece) => piece && piece.type === "k" && piece.color === waiting);
    if (king && game.isAttacked(king.square, game.turn())) return null;
    return game;
  } catch {
    return null;
  }
};

// ── Provers ──────────────────────────────────────────────────────────────────

/** Squares holding your loose material — the complete PF2 answer. */
export const looseSquares = (game) =>
  looseMaterial(game, game.turn())
    .sort((a, b) => b.value - a.value || a.square.localeCompare(b.square))
    .map((piece) => piece.square);

/**
 * Squares where a knight of yours would fork two things worth taking.
 *
 * Enumerated directly rather than searched: for every square one of your
 * knights can move to, put it there and count the enemy pieces it attacks.
 * A fork the opponent can simply capture is not a fork, so the landing square
 * must be safe — undefended by them, or defended by you.
 * @param {object} game the position
 * @returns {string[]} landing squares, best first
 */
export const knightForkSquares = (game) => {
  const me = game.turn();
  const landings = game
    .moves({ verbose: true })
    .filter((move) => move.piece === "n");

  const found = [];
  for (const move of landings) {
    const probe = new Chess(game.fen());
    if (!probe.move(move.san)) continue;

    // The knight now belongs to the position with the opponent to move.
    const attacked = [];
    for (const [type, value] of Object.entries(VALUE)) {
      if (value < FORK_TARGET_VALUE) continue;
      for (const square of probe.findPiece({ type, color: other(me) })) {
        if (probe.attackers(square, me).includes(move.to)) {
          attacked.push(value);
        }
      }
    }
    if (attacked.length < 2) continue;

    // A knight that just gets taken has not forked anything.
    const takers = probe.attackers(move.to, other(me));
    const guards = probe.attackers(move.to, me);
    if (takers.length > 0 && guards.length === 0) continue;

    found.push({
      square: move.to,
      worth: attacked
        .sort((a, b) => b - a)
        .slice(0, 2)
        .reduce((a, b) => a + b),
    });
  }

  return found
    .sort((a, b) => b.worth - a.worth || a.square.localeCompare(b.square))
    .map((entry) => entry.square);
};

/** Squares you could move a piece to and give check from. */
export const checkSquares = (game) =>
  [
    ...new Set(
      game
        .moves({ verbose: true })
        .filter((move) => move.san.includes("+") || move.san.includes("#"))
        .map((move) => move.to),
    ),
  ].sort();

const PROVERS = {
  [SCAN_RULES.LOOSE_MATERIAL]: looseSquares,
  [SCAN_RULES.KNIGHT_FORK]: knightForkSquares,
  [SCAN_RULES.CHECK_SQUARES]: checkSquares,
};

/**
 * Recompute a drill's answer key from its own position.
 *
 * This is the whole verification story for these types: a key either equals
 * what the board says or it does not. `verify-drills.js` calls the same
 * function the generator did, which is why the gate cannot drift from the
 * generator.
 * @param {object} position a scan or sweep position
 * @returns {string[]|null} the proved key, or null if the rule is unknown
 */
export const proveTargets = (position) => {
  const prover = PROVERS[position.rule];
  const game = load(position.fen);
  if (!prover || !game) return null;
  const proved = prover(game);
  return position.type === "scan" ? proved.slice(0, 1) : proved;
};

// ── Generation ───────────────────────────────────────────────────────────────

const PROMPTS = {
  [SCAN_RULES.LOOSE_MATERIAL]: {
    scan: "Click the piece of yours that can be won.",
    sweep: "Click **every** piece of yours the opponent can win material from.",
  },
  [SCAN_RULES.KNIGHT_FORK]: {
    scan: "Click the square where you have a knight fork.",
    sweep: "Click every square where you have a knight fork.",
  },
  [SCAN_RULES.CHECK_SQUARES]: {
    scan: "Click the square you can give check from.",
    sweep: "Click every square you can give check from.",
  },
};

/**
 * The step each rule drills, so the error tally can steer the queue toward it.
 *
 * Loose material is PF2 SAFETY seen from your own side; checks and forks are
 * PF3 FORCE — the forcing-move sweep.
 */
export const RULE_STEPS = Object.freeze({
  [SCAN_RULES.LOOSE_MATERIAL]: "PF2",
  [SCAN_RULES.KNIGHT_FORK]: "PF3",
  [SCAN_RULES.CHECK_SQUARES]: "PF3",
});

/**
 * Build one drill from one position, if the rule finds anything there.
 *
 * Returns null rather than an empty drill. A `sweep` whose answer is "nothing"
 * is a defensible drill in principle — recognising a safe position is a real
 * skill — but it cannot be told apart from a broken generator, and one that
 * cannot be told apart from a bug will be assumed to be one.
 * @param {object} options generation inputs
 * @param {string} options.fen the position
 * @param {string} options.rule one of {@link SCAN_RULES}
 * @param {"scan"|"sweep"} [options.type] one square or all of them
 * @param {string} options.id a stable id
 * @param {string} [options.source] provenance
 * @returns {object|null} the drill position, or null when the rule found nothing
 */
export const generateScanDrill = ({
  fen,
  rule,
  type = "sweep",
  id,
  source = "generated",
}) => {
  const game = load(fen);
  const prover = PROVERS[rule];
  if (!game || !prover) return null;

  const proved = prover(game);
  if (proved.length === 0) return null;
  // A "click every one" with a single answer is a `scan` wearing a sweep's
  // prompt, and it would teach the learner to stop after the first click.
  if (type === "sweep" && proved.length < 2) return null;

  const targets = type === "scan" ? proved.slice(0, 1) : proved;

  return {
    type,
    id,
    fen,
    rule,
    pfStep: RULE_STEPS[rule],
    targets,
    prompt: PROMPTS[rule][type],
    orientation: game.turn() === "b" ? "black" : "white",
    source,
  };
};

/**
 * Grade a set of clicks against a proved key.
 *
 * `sweep` gives **partial credit**, which is the point of the format: the
 * feedback a learner needs is "you found four of the five and missed g4", not
 * "wrong". A false positive costs as much as a miss — clicking every square
 * would otherwise score full marks on completeness.
 * @param {object} position the drill position
 * @param {string[]} clicked squares the learner clicked
 * @returns {object} `{ correct, found, missed, wrong, total, score }`
 */
export const gradeScan = (position, clicked = []) => {
  const key = new Set(position.targets ?? []);
  const picked = new Set(clicked);

  const found = [...key].filter((square) => picked.has(square));
  const missed = [...key].filter((square) => !picked.has(square));
  const wrong = [...picked].filter((square) => !key.has(square));

  const total = key.size;
  const score =
    total === 0 ? 0 : Math.max(0, found.length - wrong.length) / total;

  return {
    correct: missed.length === 0 && wrong.length === 0,
    found,
    missed,
    wrong,
    total,
    score,
  };
};

/**
 * One sentence saying what was and was not seen.
 * @param {object} position the drill position
 * @param {object} result output of {@link gradeScan}
 * @returns {string} feedback
 */
export const describeScanResult = (position, result) => {
  if (result.correct) {
    return result.total === 1
      ? "Found it."
      : `All ${result.total} of them, nothing extra.`;
  }
  const parts = [];
  if (result.total > 1) {
    parts.push(`${result.found.length} of ${result.total}`);
  }
  if (result.missed.length > 0) {
    parts.push(`missed ${result.missed.join(", ")}`);
  }
  if (result.wrong.length > 0) {
    parts.push(
      `${result.wrong.join(", ")} ${result.wrong.length === 1 ? "is" : "are"} not one`,
    );
  }
  return `${parts.join(" · ")}.`;
};

/**
 * Generate a deterministic set of drills from a corpus of positions.
 *
 * Deterministic in the strong sense: same input FENs in the same order, same
 * drills out, every time and on every machine. There is no randomness here at
 * all — the rotation a learner sees comes from `selectPositions()` in
 * `session.js`, which is keyed to their own review count.
 * @param {object} options generation inputs
 * @param {Array<{fen: string, id: string}>} options.corpus source positions
 * @param {string[]} [options.rules] which rules to apply, in order
 * @param {number} [options.limit] cap on how many drills to return
 * @param {string} [options.source] provenance stamped on each drill
 * @returns {object[]} generated drills
 */
export const generateScanSet = ({
  corpus,
  rules = [SCAN_RULES.LOOSE_MATERIAL, SCAN_RULES.KNIGHT_FORK],
  limit = Number.POSITIVE_INFINITY,
  source = "generated",
}) => {
  const drills = [];
  const seen = new Set();

  for (const rule of rules) {
    for (const entry of corpus) {
      if (drills.length >= limit) return drills;
      // One drill per position per rule, and never the same board twice for
      // the same rule — repeated FENs across items are common.
      const fingerprint = `${rule}|${entry.fen}`;
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);

      const sweep = generateScanDrill({
        fen: entry.fen,
        rule,
        type: "sweep",
        id: `sweep-${rule}-${entry.id}`,
        source,
      });
      if (sweep) {
        drills.push(sweep);
        continue;
      }
      // Only one target: still a good rep, just as a single-click scan.
      const scan = generateScanDrill({
        fen: entry.fen,
        rule,
        type: "scan",
        id: `scan-${rule}-${entry.id}`,
        source,
      });
      if (scan) drills.push(scan);
    }
  }

  return drills;
};
