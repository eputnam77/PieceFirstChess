#!/usr/bin/env node
/**
 * Certify every endgame drill position against Stockfish.
 *
 * Why this exists: the original `src/data/endgames.js` shipped positions that
 * contradicted their own labels — a "two bishops mate" with both bishops on
 * dark squares (insufficient material, unwinnable), a "wrong-coloured bishop"
 * draw with no pawn on the board, and several K+P endings labelled "promote"
 * that are dead drawn against correct defence. A drill you cannot complete
 * teaches nothing; a drill with the wrong verdict teaches something false.
 *
 * So no position ships without passing this script. Run:
 *   npm run verify:endgames
 *
 * Exits non-zero if any drill contradicts its declared goal, so it can gate CI.
 *
 * Uses the Node build of the already-installed `stockfish` package over UCI
 * stdio — no extra dependency, no browser.
 */

import { Chess } from "chess.js";

import { ENDGAME_DRILLS, GOAL } from "../src/data/endgame-drills.js";

import { createEngine, describeScore } from "./uci-engine.js";

const MOVETIME_MS = Number(process.env.VERIFY_MOVETIME ?? 3000);
/** Above this (in the student's favour) the position is a real win. */
export const WIN_THRESHOLD_CP = 200;
/**
 * Inside this band the position counts as a genuine draw.
 *
 * Deliberately wider than "about zero": engines report a small material-based
 * plus in known fortress draws they cannot prove without tablebases. The
 * wrong-coloured-bishop draw evaluates near -1.00 at depth 35 while being a
 * dead draw. The band still rejects anything actually decisive.
 */
export const DRAW_BAND_CP = 150;

// ── Checks ───────────────────────────────────────────────────────────────────

/** Static checks that need no engine. These caught the worst original bugs. */
export const staticProblems = (drill) => {
  const problems = [];
  const game = new Chess();

  try {
    game.load(drill.fen);
  } catch {
    return [`illegal FEN: ${drill.fen}`];
  }

  const sideToMove = game.turn() === "w" ? "white" : "black";
  if (sideToMove !== drill.studentColor) {
    problems.push(
      `studentColor is "${drill.studentColor}" but "${sideToMove}" is to move`,
    );
  }

  // The side that just moved must not be left in check. chess.js will happily
  // load such a FEN, but the position is illegal and Stockfish refuses to
  // search it — returning "bestmove (none)" with a meaningless score of 0.00,
  // which would otherwise sail through as a passing HOLD.
  const waiting = game.turn() === "w" ? "b" : "w";
  const waitingKing = game
    .board()
    .flat()
    .find((piece) => piece && piece.type === "k" && piece.color === waiting);
  if (waitingKing && game.isAttacked(waitingKing.square, game.turn())) {
    problems.push(
      "illegal position: the side that just moved is left in check",
    );
  }
  if (game.isGameOver()) {
    let why = "game over";
    if (game.isCheckmate()) why = "already checkmate";
    else if (game.isStalemate()) why = "already stalemate";
    else if (game.isInsufficientMaterial()) why = "insufficient material";
    else if (game.isDraw()) why = "already drawn";
    problems.push(`position is finished before the student moves: ${why}`);
  }
  if (drill.goal === GOAL.WIN && game.isInsufficientMaterial()) {
    problems.push("WIN goal is impossible: insufficient mating material");
  }
  return problems;
};

/** Does the engine's verdict actually match the declared goal? */
export const goalProblems = (drill, score) => {
  if (!score) {
    return ["engine returned no usable score (illegal or finished position)"];
  }

  // Scores come back from the side to move, which is always the student.
  if (score.mate !== undefined) {
    const studentMates = score.mate > 0;
    if (drill.goal === GOAL.WIN && !studentMates) {
      return [`declared WIN but the student is getting mated (${score.mate})`];
    }
    if (drill.goal === GOAL.HOLD) {
      return studentMates
        ? [`declared HOLD but the student has a forced mate (${score.mate})`]
        : [`declared HOLD but the student is getting mated (${score.mate})`];
    }
    return [];
  }

  const { cp } = score;
  if (drill.goal === GOAL.WIN && cp < WIN_THRESHOLD_CP) {
    return [
      `declared WIN but evaluates ${(cp / 100).toFixed(2)} — not winning, so the drill is uncompletable against correct defence`,
    ];
  }
  if (drill.goal === GOAL.HOLD && Math.abs(cp) > DRAW_BAND_CP) {
    return [
      `declared HOLD but evaluates ${(cp / 100).toFixed(2)} — not a balanced position`,
    ];
  }
  return [];
};

// ── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  const engine = createEngine();
  await engine.init();

  const failures = [];
  console.log(
    `Verifying ${ENDGAME_DRILLS.length} endgame drills at ${MOVETIME_MS}ms each…\n`,
  );

  for (const drill of ENDGAME_DRILLS) {
    const problems = staticProblems(drill);
    const score = problems.some((p) => p.startsWith("illegal"))
      ? null
      : await engine.score(drill.fen, MOVETIME_MS);

    problems.push(...goalProblems(drill, score));

    const status = problems.length === 0 ? "ok  " : "FAIL";
    console.log(
      `${status} ${drill.itemId.padEnd(5)} ${drill.id.padEnd(22)} ${drill.goal.padEnd(4)} ${describeScore(score).padStart(9)}`,
    );
    for (const problem of problems) console.log(`       ↳ ${problem}`);
    if (problems.length > 0) failures.push({ drill, problems });
  }

  engine.quit();

  console.log(
    `\n${ENDGAME_DRILLS.length - failures.length}/${ENDGAME_DRILLS.length} certified.`,
  );
  if (failures.length > 0) {
    console.error(`\n${failures.length} drill(s) failed verification.`);
    process.exit(1);
  }
};

// Importable by `verify-drills.js` without running the whole suite.
if (process.argv[1] && process.argv[1].endsWith("verify-endgames.js")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
