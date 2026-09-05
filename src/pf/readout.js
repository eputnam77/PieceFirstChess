/**
 * The PF7 Readout — the eight questions, answered in eight clauses.
 *
 * Think Like a GM computes the right thing and then buries it in prose. This
 * keeps the computation and replaces the presentation: one card, one line per
 * step of the protocol, one clause each.
 *
 * Two properties matter more than the wording:
 *
 * - **No LLM anywhere on this path.** Every line is engine- or detector-derived,
 *   so the readout works offline, with no key, and cannot invent a threat that
 *   is not on the board. The engine contributes exactly one thing — the MultiPV
 *   candidates for PF6 — and every other line is computed from the position by
 *   `chess.js`.
 * - **"Nothing obvious" is a real answer.** A detector that has found nothing
 *   says so. An honest blank beats a guess, because the whole value of the card
 *   is that the learner can trust each line without checking it.
 *
 * It is also the same eight questions the curriculum is indexed by, so reading
 * it during a game *is* protocol rehearsal — Live Mode reinforcing Study at
 * zero extra content cost.
 *
 * Pure module: takes a FEN, an optional last move, and an `analyze()` result.
 * No React, no I/O, no engine calls of its own.
 */

import { Chess } from "chess.js";

import { looseMaterial } from "@/lib/pf-error-log";
import { candidateSpread } from "@pf/verdict.js";

/** The honest blank. One string, so it is greppable and consistent. */
export const NOTHING = "nothing obvious";

const PIECE_NAMES = { p: "pawn", n: "N", b: "B", r: "R", q: "Q", k: "K" };
const VALUE = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** "Nf3", "pawn e4" — enough to find the piece on the board at a glance. */
const nameAt = (game, square) => {
  const piece = game.get(square);
  if (!piece) return square;
  return piece.type === "p"
    ? `pawn ${square}`
    : `${PIECE_NAMES[piece.type]}${square}`;
};

const other = (color) => (color === "w" ? "b" : "w");
const listOf = (items, limit = 3) =>
  items.slice(0, limit).join(", ") + (items.length > limit ? ", …" : "");

/**
 * The same position with the other side to move.
 *
 * This is how the readout asks "what do *they* want?" without an engine: hand
 * them the move and read off their forcing moves. It is a null move, so it can
 * produce a position `chess.js` rejects — most obviously when the side to move
 * is in check, where passing is not a legal thing to imagine. The caller gets
 * null and prints nothing rather than a fiction.
 * @param {string} fen the position
 * @returns {object|null} a `chess.js` game with the turn flipped, or null
 */
export const withTurnFlipped = (fen) => {
  const parts = fen.split(" ");
  if (parts.length < 4) return null;

  try {
    // The side to move must not already be in check. Handing the move to the
    // opponent in that position would let them capture a king, so "what do
    // they want next" is not a question the board can answer — and the flipped
    // position is not the one to ask it about either, because *it* is legal.
    // The illegality is on this side of the flip, which is why the guard is.
    if (new Chess(fen).isCheck()) return null;
  } catch {
    return null;
  }

  parts[1] = parts[1] === "w" ? "b" : "w";
  // A passed move cannot be answered by en passant, and the counters restart.
  parts[3] = "-";
  try {
    return new Chess(parts.join(" "));
  } catch {
    return null;
  }
};

// ── PF1: what changed ────────────────────────────────────────────────────────

/**
 * What the opponent's last move did to you.
 * @param {object} game the current position
 * @param {object|null} lastMove `{ san, to }` from the opponent's move
 * @returns {string} one clause
 */
export const pf1Changed = (game, lastMove) => {
  if (!lastMove?.to || !lastMove?.san) return "no move to read yet";

  const me = game.turn();
  const attacked = [];
  for (const [type, value] of Object.entries(VALUE)) {
    for (const square of game.findPiece({ type, color: me })) {
      if (game.attackers(square, other(me)).includes(lastMove.to)) {
        attacked.push({ square, value, label: nameAt(game, square) });
      }
    }
  }
  attacked.sort((a, b) => b.value - a.value);

  if (attacked.length === 0) {
    return `${lastMove.san} — nothing of yours is newly attacked by it`;
  }
  return `${lastMove.san} attacks your ${listOf(attacked.map((p) => p.label))}`;
};

// ── PF2: is everything safe ──────────────────────────────────────────────────

/**
 * Your own loose material, from the detector the error log already uses.
 * @param {object} game the current position
 * @returns {string} one clause
 */
export const pf2Safety = (game) => {
  const me = game.turn();
  const loose = looseMaterial(game, me)
    .sort((a, b) => b.value - a.value)
    .map((piece) => {
      const defenders = game.attackers(piece.square, me).length;
      const attackers = game
        .attackers(piece.square, other(me))
        .map((square) => nameAt(game, square));
      const detail = defenders === 0 ? "undefended" : "under-defended";
      return `your ${nameAt(game, piece.square)} (${detail}, attacked by ${listOf(attackers, 2)})`;
    });

  return loose.length === 0 ? "nothing of yours is loose" : listOf(loose, 2);
};

// ── PF3: forcing moves ───────────────────────────────────────────────────────

const isCapture = (move) =>
  move.flags.includes("c") || move.flags.includes("e");

/**
 * Quiet moves that would leave something of theirs loose.
 *
 * A threat is defined here as *a move that creates loose enemy material where
 * there was none* — computable from the board, and deliberately narrower than
 * the word usually means. Bounded, because it replays every quiet move and the
 * card must appear instantly.
 * @param {object} game the current position
 * @param {number} [limit] how many quiet moves to examine
 * @returns {string[]} SAN of the threatening moves found
 */
const threatMoves = (game, limit = 40) => {
  const me = game.turn();
  const before = Math.max(
    0,
    ...looseMaterial(game, other(me)).map((piece) => piece.value),
  );

  const quiet = game
    .moves({ verbose: true })
    .filter((move) => !isCapture(move) && !move.san.includes("+"))
    .slice(0, limit);

  const found = [];
  for (const move of quiet) {
    const probe = new Chess(game.fen());
    probe.move(move.san);
    const after = Math.max(
      0,
      ...looseMaterial(probe, other(me)).map((piece) => piece.value),
    );
    if (after > before) found.push(move.san);
  }
  return found;
};

/**
 * Checks, captures and threats — the forcing-move sweep.
 * @param {object} game the current position
 * @returns {string} one clause
 */
export const pf3Force = (game) => {
  const moves = game.moves({ verbose: true });
  const checks = moves.filter(
    (move) => move.san.includes("+") || move.san.includes("#"),
  );
  const captures = moves.filter((move) => isCapture(move));
  const threats = threatMoves(game);

  const parts = [];
  if (checks.length > 0) {
    parts.push(`checks: ${listOf(checks.map((m) => m.san))}`);
  }
  if (captures.length > 0) {
    parts.push(`captures: ${listOf(captures.map((m) => m.san))}`);
  }
  if (threats.length > 0) parts.push(`threats: ${listOf(threats, 2)}`);

  return parts.length === 0
    ? "no forcing move — a quiet position"
    : parts.join(" · ");
};

// ── PF4: pawn breaks ─────────────────────────────────────────────────────────

/**
 * Pawn moves that challenge the structure.
 *
 * A break is a pawn move that either attacks an enemy pawn or offers itself to
 * one — the two ways a pawn move opens a line rather than just occupying a
 * square.
 * @param {object} game the current position
 * @returns {string} one clause
 */
export const pf4Break = (game) => {
  const me = game.turn();
  const pawnMoves = game
    .moves({ verbose: true })
    .filter((move) => move.piece === "p" && !isCapture(move));

  const breaks = [];
  for (const move of pawnMoves) {
    const probe = new Chess(game.fen());
    probe.move(move.san);
    const enemyPawns = probe.findPiece({ type: "p", color: other(me) });
    const attacksAPawn = enemyPawns.some((square) =>
      probe.attackers(square, me).includes(move.to),
    );
    const offeredToAPawn = probe
      .attackers(move.to, other(me))
      .some((square) => probe.get(square)?.type === "p");
    if (attacksAPawn || offeredToAPawn) {
      breaks.push(`${move.san} would open the ${move.to[0]}-file`);
    }
  }

  return breaks.length === 0 ? NOTHING : listOf(breaks, 2);
};

// ── PF4.5: what they want ────────────────────────────────────────────────────

/**
 * The opponent's plan, read by handing them the move.
 * @param {string} fen the current position
 * @returns {string} one clause
 */
export const pf45Prevent = (fen) => {
  const theirs = withTurnFlipped(fen);
  if (!theirs) return NOTHING;

  const moves = theirs.moves({ verbose: true });
  const wants = [
    ...moves.filter((move) => move.san.includes("+")).map((m) => m.san),
    ...moves.filter((move) => isCapture(move)).map((m) => m.san),
    ...threatMoves(theirs, 24),
  ];

  return wants.length === 0 ? NOTHING : `they want ${listOf(wants, 3)}`;
};

// ── PF5: your worst piece ────────────────────────────────────────────────────

/**
 * The piece doing the least.
 *
 * Mobility as the proxy, ties broken by value: a queen with two squares is a
 * bigger problem than a knight with two squares, because more is being wasted.
 * Pawns and the king are excluded — neither is a piece you "improve" in the
 * sense this step means.
 * @param {object} game the current position
 * @returns {string} one clause
 */
export const pf5WorstPiece = (game) => {
  const me = game.turn();
  const mobility = new Map();
  for (const move of game.moves({ verbose: true })) {
    mobility.set(move.from, (mobility.get(move.from) ?? 0) + 1);
  }

  const pieces = [];
  for (const type of ["n", "b", "r", "q"]) {
    for (const square of game.findPiece({ type, color: me })) {
      pieces.push({
        square,
        value: VALUE[type],
        moves: mobility.get(square) ?? 0,
        label: nameAt(game, square),
      });
    }
  }
  if (pieces.length === 0) return NOTHING;

  pieces.sort((a, b) => a.moves - b.moves || b.value - a.value);
  const [worst] = pieces;
  return worst.moves === 0
    ? `your ${worst.label} has no moves at all`
    : `your ${worst.label} (${worst.moves} move${worst.moves === 1 ? "" : "s"})`;
};

// ── PF6: calculate ───────────────────────────────────────────────────────────

/** Centipawns, in pawns, signed. */
const fmt = (cp) =>
  cp === null || cp === undefined
    ? "?"
    : `${cp >= 0 ? "+" : ""}${(cp / 100).toFixed(1)}`;

/** SAN for a UCI move in a position, or the UCI when it will not parse. */
const sanOf = (fen, uci) => {
  if (!uci) return null;
  try {
    const probe = new Chess(fen);
    return (
      probe.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      })?.san ?? uci
    );
  } catch {
    return uci;
  }
};

/**
 * The engine's candidates, with what each is worth.
 * @param {string} fen the current position
 * @param {Array<object>} lines `analyze()` result lines
 * @returns {string} one clause
 */
export const pf6Calculate = (fen, lines) => {
  const spread = candidateSpread(lines);
  if (spread.length === 0) return "no engine lines for this position";
  return spread
    .slice(0, 3)
    .map((candidate) => {
      const label = candidate.isMate
        ? `M${Math.abs(candidate.mateIn)}`
        : fmt(candidate.cp);
      return `${sanOf(fen, candidate.uci)} (${label})`;
    })
    .join(" · ");
};

// ── PF7: verify ──────────────────────────────────────────────────────────────

/**
 * What the top move would leave hanging.
 *
 * The blunder scan, run on the move the engine likes — which is the step this
 * whole card is named after, and the one sub-1000 games are lost to.
 * @param {string} fen the current position
 * @param {Array<object>} lines `analyze()` result lines
 * @returns {string} one clause
 */
export const pf7Verify = (fen, lines) => {
  const [best] = candidateSpread(lines);
  const san = sanOf(fen, best?.uci);
  if (!san) return "no move to verify yet";

  let probe;
  try {
    probe = new Chess(fen);
    const me = probe.turn();
    if (!probe.move(san)) return "no move to verify yet";
    const loose = looseMaterial(probe, me).sort((a, b) => b.value - a.value);
    return loose.length === 0
      ? `after ${san} nothing of yours hangs`
      : `after ${san} your ${listOf(
          loose.map((piece) => nameAt(probe, piece.square)),
          2,
        )} would be loose`;
  } catch {
    return "no move to verify yet";
  }
};

// ── The card ─────────────────────────────────────────────────────────────────

/** The eight steps, in protocol order, with the label each line carries. */
export const READOUT_STEPS = Object.freeze([
  { step: "PF1", label: "changed" },
  { step: "PF2", label: "safety" },
  { step: "PF3", label: "force" },
  { step: "PF4", label: "break" },
  { step: "PF4.5", label: "prevent" },
  { step: "PF5", label: "worst" },
  { step: "PF6", label: "calculate" },
  { step: "PF7", label: "verify" },
]);

/**
 * Build the readout.
 * @param {object} options inputs
 * @param {string} options.fen the position to read
 * @param {Array<object>} [options.lines] `analyze()` result lines
 * @param {object|null} [options.lastMove] `{ san, to }` for the opponent's move
 * @returns {Array<{step: string, label: string, text: string}>} eight lines
 */
export const buildReadout = ({ fen, lines = [], lastMove = null }) => {
  let game;
  try {
    game = new Chess(fen);
  } catch {
    return [];
  }

  const answers = {
    PF1: pf1Changed(game, lastMove),
    PF2: pf2Safety(game),
    PF3: pf3Force(game),
    PF4: pf4Break(game),
    "PF4.5": pf45Prevent(fen),
    PF5: pf5WorstPiece(game),
    PF6: pf6Calculate(fen, lines),
    PF7: pf7Verify(fen, lines),
  };

  return READOUT_STEPS.map(({ step, label }) => ({
    step,
    label,
    text: answers[step] ?? NOTHING,
  }));
};

/**
 * Render the readout as markdown, so it rides the existing engine-message path
 * and no card renderer has to change.
 * @param {Array<object>} readout output of {@link buildReadout}
 * @param {string} fen the position, for the header
 * @returns {string} markdown
 */
export const renderReadout = (readout, fen) => {
  if (readout.length === 0) return "# PF7 Readout\n\nUnreadable position.";
  const width = Math.max(
    ...readout.map((row) => `${row.step} ${row.label}`.length),
  );
  const body = readout
    .map((row) => {
      const key = `${row.step} ${row.label}`.padEnd(width, " ");
      return `${key}  ${row.text}`;
    })
    .join("\n");
  return ["# PF7 Readout", "", "```", body, "```", "", `FEN \`${fen}\``].join(
    "\n",
  );
};
