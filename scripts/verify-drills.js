#!/usr/bin/env node
/**
 * Certify every drill position in the curriculum.
 *
 * `verify:endgames` proved the idea on 94 positions: no endgame ships without
 * passing it. This generalises that to all 655, because a generated drill with
 * a wrong answer key is worse than no drill at all — it teaches the wrong
 * pattern *and* destroys the learner's trust in the grader, which is the app's
 * only real asset (PRD §83.4).
 *
 * ## Two layers, and the split matters
 *
 * **Structural** (`npm run verify:drills`) — no engine, seconds, runs in CI on
 * every push. Legal FEN, legal solution line, the fields each drill type needs
 * to be playable at all, and every answer key that can be *proved from the
 * board*. D13: prove keys first by deterministic legal-board logic; the engine
 * may only reject unsound ones, never certify them alone.
 *
 * **Engine** (`npm run certify:drills`) — the expensive search, run once on a
 * developer machine, writing `src/pf/drill-certificates.json`. The runtime
 * cannot afford this: the build is single-threaded WASM and a scan drill needs
 * twenty answers a minute (PRD §83.2). Certificates are committed, so CI can
 * check that every position *has* a current one without searching again.
 *
 * Each certificate carries the **full analysis contract** — engine build, both
 * search bounds, MultiPV, non-default options, score perspective, and how mate
 * was handled. A certificate you cannot reproduce is not a certificate (D14).
 *
 * ```
 * npm run verify:drills              # structural only
 * npm run verify:drills -- --strict  # also fail on a missing/stale certificate
 * npm run certify:drills             # run the engine and write certificates
 * npm run certify:drills -- --only=T-01
 * ```
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { Chess } from "chess.js";

import { POSITIONS_BY_ITEM } from "../src/data/curriculum-positions.js";
import { GOAL } from "../src/data/endgame-drills.js";
import { proveTargets } from "../src/pf/scan-drills.js";

import {
  ENGINE_BUILD,
  ROOT,
  createEngine,
  describeScore,
} from "./uci-engine.js";
import {
  DRAW_BAND_CP,
  WIN_THRESHOLD_CP,
  goalProblems,
  staticProblems,
} from "./verify-endgames.js";

const CERTIFICATE_PATH = path.join(ROOT, "src/pf/drill-certificates.json");

/**
 * The analysis contract every certificate in one run is issued under.
 *
 * Changing any field here invalidates every certificate, by design: the same
 * position at a different budget is a different verdict, and pretending
 * otherwise is how a stale answer key survives a threshold change.
 */
const CONTRACT = Object.freeze({
  engineBuild: ENGINE_BUILD,
  engineVersion: "18",
  depth: null,
  scorePerspective: "side-to-move",
  mateHandling: "reported separately as mate-in-N, never folded to centipawns",

  /**
   * One budget per position type, because a verdict is only meaningful under
   * the budget it was reached at (D1, D14).
   *
   * The endgame row is not a preference: `verify-endgames.js` calibrated
   * `WIN_THRESHOLD_CP` at 3000ms and MultiPV 1, and certifying the same
   * positions at 1500ms and MultiPV 3 failed one of them (`E-09`
   * majority-crippled read +1.79 where it reads +2.4 at the original budget).
   * MultiPV splits the search effort, so reading line 1 of three is a weaker
   * evaluation than searching one line — reusing a threshold across budgets is
   * exactly the mistake this table exists to prevent.
   */
  budgets: {
    endgame: { movetimeMs: 3000, multiPV: 1 },
    blundercheck: { movetimeMs: 1500, multiPV: 1 },
    puzzle: { movetimeMs: 1500, multiPV: 3 },
    protocol: { movetimeMs: 1500, multiPV: 3 },
  },

  thresholds: {
    winCp: WIN_THRESHOLD_CP,
    drawBandCp: DRAW_BAND_CP,
    // A solution the engine says throws away more than this is not a solution.
    solutionRejectCp: 300,
    /**
     * How much a "safe" candidate may cost.
     *
     * Applied **only when the move also leaves the student out of a winning
     * position** — see `safetyProblems`. Centipawn loss on its own is
     * meaningless once a game is decided: `verify-002Uy` goes from +41.5 to
     * +13.8 for the student, a 2770cp "loss" that is still completely winning,
     * and calling that unsafe would teach the learner that winning moves are
     * blunders.
     */
    safeRejectCp: 150,
    /** An "unsafe" candidate that costs less than this was mislabelled. */
    unsafeRejectCp: 200,
  },
});

/** The budget one position type is certified under. */
const budgetFor = (type) =>
  CONTRACT.budgets[type] ?? { movetimeMs: 1500, multiPV: 1 };

/** A position's stable identity across runs: its content, not its index. */
const keyOf = (itemId, position) => `${itemId}/${position.id}`;
const digestOf = (position) =>
  createHash("sha256")
    .update(
      JSON.stringify({
        fen: position.fen ?? null,
        type: position.type,
        solution: position.solution ?? null,
        candidate: position.candidate ?? null,
        safe: position.safe ?? null,
        goal: position.goal ?? null,
        targets: position.targets ?? null,
      }),
    )
    .digest("hex")
    .slice(0, 16);

// ── Structural checks ────────────────────────────────────────────────────────

/** Whether the side that just moved was left in check — an illegal position. */
const leavesMoverInCheck = (game) => {
  const waiting = game.turn() === "w" ? "b" : "w";
  const king = game
    .board()
    .flat()
    .find((piece) => piece && piece.type === "k" && piece.color === waiting);
  return Boolean(king && game.isAttacked(king.square, game.turn()));
};

/** Every position needs a FEN that is a real, playable position. */
const fenProblems = (position) => {
  if (!position.fen) return ["no FEN"];
  let game;
  try {
    game = new Chess(position.fen);
  } catch {
    return [`illegal FEN: ${position.fen}`];
  }
  if (leavesMoverInCheck(game)) {
    return ["illegal position: the side that just moved is left in check"];
  }
  return [];
};

/** A solution must replay, move by move, from the position it claims. */
const solutionProblems = (position) => {
  const problems = [];
  const solution = position.solution ?? [];
  if (solution.length === 0) return ["no solution line"];
  // Solutions alternate student, opponent, student — so a well-formed line ends
  // on the student's move and has an odd number of plies. An even count means
  // the drill plays the opponent's reply and then waits forever.
  if (solution.length % 2 === 0) {
    problems.push(`solution has ${solution.length} plies — must be odd`);
  }

  try {
    const game = new Chess(position.fen);
    for (const [index, uci] of solution.entries()) {
      const move = game.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });
      if (!move) {
        problems.push(`solution ply ${index + 1} (${uci}) is not legal`);
        break;
      }
    }
  } catch (error) {
    problems.push(`solution does not replay: ${error.message}`);
  }
  return problems;
};

/**
 * Re-prove a scan or sweep answer key from the board (D13).
 *
 * The key for "every piece of yours they can win" is not an opinion: it is
 * exactly what `looseMaterial()` computes from the position. So the check is
 * equality with the recomputed set, not a search — and an engine could not
 * certify it anyway, because "this piece is loose" is a claim about the board
 * rather than a number.
 *
 * Crucially this calls **the same prover the generator called**
 * (`proveTargets` in `src/pf/scan-drills.js`), so the committed data file
 * cannot drift away from the rule it claims to follow. A second
 * implementation here would only test that two copies agree.
 */
const targetProblems = (position) => {
  const targets = position.targets ?? [];
  if (targets.length === 0) return ["no target squares"];

  const problems = [];
  for (const square of targets) {
    if (!/^[a-h][1-8]$/.test(square)) {
      problems.push(`"${square}" is not a square`);
    }
  }

  const proved = proveTargets(position);
  if (proved === null) {
    problems.push(
      `unknown rule "${position.rule}" — nothing can prove this key`,
    );
    return problems;
  }
  const declared = [...targets].sort().join(",");
  if ([...proved].sort().join(",") !== declared) {
    problems.push(
      `answer key disagrees with the board: declared [${declared}], proved [${[...proved].sort()}]`,
    );
  }
  return problems;
};

/** What each drill type needs before it can be played at all. */
const shapeProblems = (position) => {
  switch (position.type) {
    case "puzzle":
    case "line":
    case "protocol": {
      return solutionProblems(position);
    }
    case "blundercheck": {
      const problems = [];
      if (!position.candidate) problems.push("no candidate move");
      if (typeof position.safe !== "boolean") problems.push("no safe verdict");
      if (position.candidate) {
        try {
          const game = new Chess(position.fen);
          const move = game.move({
            from: position.candidate.slice(0, 2),
            to: position.candidate.slice(2, 4),
            promotion: position.candidate[4],
          });
          if (!move) {
            problems.push(`candidate ${position.candidate} is illegal`);
          }
        } catch {
          problems.push(`candidate ${position.candidate} is illegal`);
        }
      }
      return problems;
    }
    case "card": {
      return position.card?.yours ? [] : ["card has no plan to recall"];
    }
    case "scan":
    case "sweep": {
      const problems = position.prompt ? [] : ["no prompt"];
      return [...problems, ...targetProblems(position)];
    }
    case "endgame": {
      // Delegated wholesale to the verifier that already owns these rules.
      return staticProblems(position);
    }
    default: {
      // Play-outs are graded by outcome, not by a solution line.
      const problems = [];
      if (!position.studentColor) problems.push("no studentColor");
      if (!(position.maxMoves > 0)) problems.push("no maxMoves");
      return problems;
    }
  }
};

/** Position types the engine is asked to adjudicate at all. */
const ENGINE_TYPES = new Set(["puzzle", "protocol", "blundercheck", "endgame"]);

/**
 * Whether a type gets an engine certificate.
 *
 * `line` and `card` are deliberately excluded. An opening line is not a tactic
 * and a shallow search will disagree with book moves all day; a plan-recall card
 * has no single move to adjudicate. Certifying them would produce noise that
 * teaches everyone to ignore the gate.
 */
export const needsCertificate = (position) => ENGINE_TYPES.has(position.type);

// ── Engine checks ────────────────────────────────────────────────────────────

/** Centipawns for the side to move, with mate folded for comparison only. */
const toCp = (score) => {
  if (!score) return null;
  if (score.mate !== undefined && score.mate !== null) {
    return score.mate > 0 ? 30_000 - score.mate : -30_000 - score.mate;
  }
  return score.cp;
};

const MATE_CP = 30_000;

/**
 * The student's evaluation of the position their candidate reaches.
 *
 * Two cases the engine cannot answer, and both were charged as catastrophic
 * losses before this existed:
 *
 * - **The move is checkmate.** The position is over, so Stockfish returns no
 *   score at all, and treating a missing score as 0 charged the whole mate
 *   value as loss — four mating moves (`Nf2#`, `Qh5#`, `Qg3#`, `Nxg3#`) were
 *   reported as "declared safe but loses 299.99".
 * - **The move draws**, by stalemate or insufficient material. Also over, also
 *   scoreless, and genuinely 0 for the student — which is a real loss from a
 *   winning position and correctly counted as one.
 *
 * Engine scores come back from the side to move, which after the student's move
 * is the opponent, so they are negated into the student's perspective.
 * @param {object} engine a `uci-engine` client
 * @param {object} after the position after the candidate, as a `chess.js` game
 * @param {object} budget the movetime and MultiPV to search under
 * @returns {Promise<number|null>} centipawns for the student, or null
 */
const studentEvalAfter = async (engine, after, budget) => {
  if (after.isCheckmate()) return MATE_CP;
  if (after.isGameOver()) return 0;
  const score = await engine.score(
    after.fen(),
    budget.movetimeMs,
    budget.multiPV,
  );
  const cp = toCp(score);
  return cp === null ? null : -cp;
};

/**
 * Whether "is this move safe?" has the answer the drill claims.
 *
 * "Safe" is not "within 150cp of best". The question the drill asks is whether
 * the move throws the game away, so the test is whether it **changes the
 * result**, not whether it costs centipawns:
 *
 * - a move that keeps a won position won is safe, however many centipawns it
 *   sheds — a learner told that +13.8 is a blunder learns something false;
 * - a move that turns "not losing" into "losing" is unsafe, however small the
 *   number;
 * - and in between, a real drop that also leaves the student out of a win is
 *   unsafe.
 * @param {object} position the blundercheck position
 * @param {number|null} before the student's evaluation before the move
 * @param {number|null} after the student's evaluation after it
 * @returns {{problems: string[], unsafe: boolean|null, cost: number|null}} verdict
 */
const safetyProblems = (position, before, after) => {
  if (before === null || after === null) {
    return {
      problems: ["engine returned no usable score for the candidate"],
      unsafe: null,
      cost: null,
    };
  }

  const { winCp, safeRejectCp, unsafeRejectCp } = CONTRACT.thresholds;
  const cost = before - after;
  const stillWinning = after >= winCp;
  const nowLosing = after < 0 && before >= 0;
  const unsafe = nowLosing || (!stillWinning && cost > safeRejectCp);

  const name = position.candidateSan ?? position.candidate;
  const money = (cp) => (cp / 100).toFixed(2);

  if (position.safe && unsafe) {
    return {
      problems: [
        `declared safe but ${name} takes the student from ${money(before)} to ${money(after)}`,
      ],
      unsafe,
      cost,
    };
  }
  if (!position.safe && !unsafe) {
    // The mirror check, and it needs its own threshold: a move that is merely
    // imprecise is not the blunder the drill promises.
    if (cost < unsafeRejectCp && after >= 0) {
      return {
        problems: [
          `declared unsafe but ${name} only costs ${money(cost)} and leaves ${money(after)}`,
        ],
        unsafe,
        cost,
      };
    }
  }
  return { problems: [], unsafe, cost };
};

/**
 * The engine's verdict on one position.
 *
 * It may **reject**, never certify on its own: every answer key here was proved
 * structurally first, and the search exists to catch the case where the proof
 * was of the wrong thing (D13).
 * @param {object} engine a `uci-engine` client
 * @param {object} position the drill position
 * @returns {Promise<{problems: string[], evidence: object}>} verdict and evidence
 */
const engineProblems = async (engine, position) => {
  const { thresholds } = CONTRACT;
  const budget = budgetFor(position.type);

  if (position.type === "endgame") {
    const score = await engine.score(
      position.fen,
      budget.movetimeMs,
      budget.multiPV,
    );
    return {
      problems: goalProblems(position, score),
      evidence: { goal: position.goal, score: describeScore(score) },
    };
  }

  if (position.type === "blundercheck") {
    const before = toCp(
      await engine.score(position.fen, budget.movetimeMs, budget.multiPV),
    );
    const game = new Chess(position.fen);
    game.move({
      from: position.candidate.slice(0, 2),
      to: position.candidate.slice(2, 4),
      promotion: position.candidate[4],
    });
    const after = await studentEvalAfter(engine, game, budget);
    const { problems, unsafe, cost } = safetyProblems(position, before, after);
    return {
      problems,
      evidence: { safe: position.safe, unsafe, cpCost: cost, before, after },
    };
  }

  // puzzle / protocol: the first move of the solution is the claim.
  const lines = await engine.lines(
    position.fen,
    budget.movetimeMs,
    budget.multiPV,
  );
  if (lines.length === 0) {
    return {
      problems: ["engine returned no lines (illegal or finished position)"],
      evidence: {},
    };
  }
  const [best] = lines;
  const [answer] = position.solution;
  const match = lines.find((entry) => entry.uci === answer) ?? null;
  const loss = match === null ? null : Math.max(0, toCp(best) - toCp(match));

  const problems = [];
  // The engine may only reject. A solution it merely ranks second at 1.5s on a
  // single-threaded build is not thereby wrong — deep tactics routinely need
  // more than that — so only a move it says throws material away is a failure.
  if (loss !== null && loss > thresholds.solutionRejectCp) {
    problems.push(
      `solution ${answer} loses ${(loss / 100).toFixed(2)} against ${best.uci}`,
    );
  }
  return {
    problems,
    evidence: {
      answer,
      engineBest: best.uci,
      agrees: best.uci === answer,
      rank: match?.index ?? null,
      cpLoss: loss,
    },
  };
};

// ── Certificate store ────────────────────────────────────────────────────────

const loadCertificates = () => {
  try {
    return JSON.parse(readFileSync(CERTIFICATE_PATH, "utf8"));
  } catch {
    return { contract: null, certificates: {} };
  }
};

const sameContract = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── Main ─────────────────────────────────────────────────────────────────────

const allPositions = () => {
  const rows = [];
  for (const [itemId, positions] of Object.entries(POSITIONS_BY_ITEM)) {
    for (const position of positions) rows.push({ itemId, position });
  }
  return rows;
};

const main = async () => {
  const argv = process.argv.slice(2);
  const withEngine = argv.includes("--engine");
  const strict = argv.includes("--strict");
  const only = argv.find((a) => a.startsWith("--only="))?.slice(7) ?? null;

  const rows = allPositions().filter(
    ({ itemId }) => only === null || itemId === only,
  );
  const stored = loadCertificates();
  const contractCurrent = sameContract(stored.contract, CONTRACT);
  const certificates = contractCurrent ? { ...stored.certificates } : {};

  const budgetSummary = Object.entries(CONTRACT.budgets)
    .map(([type, b]) => `${type} ${b.movetimeMs}ms/pv${b.multiPV}`)
    .join(" · ");
  console.log(
    `${withEngine ? "Certifying" : "Checking"} ${rows.length} drill positions${
      withEngine ? ` — ${budgetSummary}` : "…"
    }`,
  );
  if (withEngine && !contractCurrent && stored.contract) {
    console.log("The analysis contract changed — recertifying everything.\n");
  }

  // MultiPV is set per search from the per-type budget, so the instance only
  // needs a starting value.
  const engine = withEngine ? createEngine({ multiPV: 1 }) : null;
  if (engine) await engine.init();

  const failures = [];
  const missing = [];
  const byType = {};

  for (const { itemId, position } of rows) {
    byType[position.type] = (byType[position.type] ?? 0) + 1;
    const key = keyOf(itemId, position);
    const digest = digestOf(position);

    const problems = [
      ...fenProblems(position),
      // A broken FEN makes every other check meaningless noise.
      ...(fenProblems(position).length > 0 ? [] : shapeProblems(position)),
    ];

    if (engine && problems.length === 0 && needsCertificate(position)) {
      const { problems: engineFound, evidence } = await engineProblems(
        engine,
        position,
      );
      problems.push(...engineFound);
      if (engineFound.length === 0) {
        certificates[key] = { digest, ...evidence };
      } else {
        delete certificates[key];
      }
    } else if (!engine && needsCertificate(position)) {
      const held = certificates[key];
      if (!held || held.digest !== digest) {
        missing.push(`${key} (${position.type})`);
      }
    }

    if (problems.length > 0) {
      console.log(`FAIL ${key} [${position.type}]`);
      for (const problem of problems) console.log(`       ↳ ${problem}`);
      failures.push({ key, problems });
    }
  }

  engine?.quit();

  if (engine) {
    writeFileSync(
      CERTIFICATE_PATH,
      `${JSON.stringify({ contract: CONTRACT, generatedAt: new Date().toISOString(), certificates }, null, 2)}\n`,
    );
    console.log(
      `\nWrote ${Object.keys(certificates).length} certificates to ${path.relative(ROOT, CERTIFICATE_PATH)}`,
    );
  }

  const counts = Object.entries(byType)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([type, count]) => `${type} ${count}`)
    .join(" · ");
  console.log(
    `\n${rows.length - failures.length}/${rows.length} passed. ${counts}`,
  );

  if (missing.length > 0) {
    const verb = strict ? "MISSING" : "uncertified";
    console.log(
      `\n${missing.length} position(s) ${verb}: run \`npm run certify:drills\`.`,
    );
    for (const key of missing.slice(0, 10)) console.log(`       ↳ ${key}`);
    if (missing.length > 10) {
      console.log(`       ↳ …and ${missing.length - 10} more`);
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} position(s) failed verification.`);
    process.exit(1);
  }
  if (strict && missing.length > 0) {
    console.error(
      "\nStrict mode: every engine-checked position needs a certificate.",
    );
    process.exit(1);
  }
};

if (process.argv[1] && process.argv[1].endsWith("verify-drills.js")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { CONTRACT, digestOf, fenProblems, keyOf, shapeProblems, GOAL };
