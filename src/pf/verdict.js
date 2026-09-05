/**
 * The app's adjudicator.
 *
 * One place turns engine numbers into judgements. Everything that grades a move
 * — `analyzer.js` (game reports), `intelligence.js` (live-mode cards), every
 * drill, the Commit Gate, the PF7 Readout — calls in here, so that **the same
 * move in the same position gets the same verdict everywhere in the app**
 * (PRD §83.1). A drill calling something correct that the game report calls a
 * Mistake is corrosive to trust in exactly the component the learner must trust
 * most.
 *
 * ## What "source of truth" means here
 *
 * Not infallible ground truth — *the app's consistent adjudicator under a
 * recorded analysis budget* (D1). Stockfish's move choices and centipawn values
 * are estimates conditional on engine version, options, search budget and score
 * perspective. **Rules and tablebases outrank it where they apply**, and a
 * shallow score is never to be rendered as an objective property of the
 * position — it is this engine's opinion at this budget.
 *
 * ## Conventions
 *
 * - **cpLoss** is always ≥ 0 and always from the *mover's* perspective: how
 *   much worse the played move is than the best available one.
 * - **Line scores** (`scoreCp`) arrive from the engine in the *side-to-move*
 *   perspective, which is what `candidateSpread` expects. Callers holding
 *   White-perspective numbers must flip before calling.
 * - Mates are folded into a scalar so that mate-in-1 outranks mate-in-5.
 *
 * Pure module: no React, no I/O, no worker, no IndexedDB.
 */

import { RATING } from "@lib/srs.js";

// ─── Identity of the adjudicator ─────────────────────────────────────────────

/**
 * Which engine produced any verdict from this module, for provenance stamping
 * (D14). The build in `public/` is the single-threaded lite WASM one; its
 * strength and its speed are both part of the contract.
 */
export const ENGINE_ID = Object.freeze({
  name: "Stockfish",
  version: "18",
  build: "stockfish-18-lite-single",
  npmPackage: "stockfish@18.0.5",
  threads: 1,
});

// ─── Move quality ────────────────────────────────────────────────────────────

/**
 * The frozen quality table, in centipawns lost versus the best available move.
 *
 * These numbers are the **migration source**: they are exactly what
 * `analyzer.js` and `intelligence.js` each defined separately before this
 * module existed, so no verdict shifts under a learner on upgrade. Changing a
 * boundary here re-grades every past game report, so treat the table as frozen
 * unless there is a reason to accept that.
 *
 * `score` feeds the game report's per-move score; `emoji`/`color`/`blurb` are
 * presentation carried along so consumers do not re-derive them.
 */
export const QUALITY_LEVELS = Object.freeze(
  [
    {
      max: 15,
      label: "Brilliant",
      emoji: "💎",
      color: "cyan",
      score: 100,
      blurb: "top-engine  level",
    },
    {
      max: 30,
      label: "Excellent",
      emoji: "✨",
      color: "emerald",
      score: 95,
      blurb: "very strong move",
    },
    {
      max: 70,
      label: "Good",
      emoji: "👍",
      color: "green",
      score: 85,
      blurb: "solid choice",
    },
    {
      max: 150,
      label: "Inaccuracy",
      emoji: "⚠️",
      color: "yellow",
      score: 65,
      blurb: "minor imprecision",
    },
    {
      max: 300,
      label: "Mistake",
      emoji: "❌",
      color: "orange",
      score: 35,
      blurb: "significant error",
    },
    {
      max: Infinity,
      label: "Blunder",
      emoji: "💥",
      color: "red",
      score: 10,
      blurb: "serious error",
    },
  ].map((level) => Object.freeze(level)),
);

/**
 * The verdict used when the engine gave no usable answer.
 *
 * "Good" rather than "unknown", because both call sites it replaces already
 * defaulted that way and an unknown verdict has nowhere to render. A missing
 * engine answer must never look like a blunder.
 */
export const DEFAULT_QUALITY = QUALITY_LEVELS[2];

/** Largest cpLoss any single move is credited with, matching `analyzer.js`. */
export const MAX_CP_LOSS = 1000;

/** Scalar magnitude standing in for a forced mate. */
export const MATE_SCORE_CP = 30_000;

/**
 * Classify a move by how many centipawns it gave away versus the best move.
 * @param {number|null|undefined} cpLoss centipawns lost, from the mover's side
 * @returns {object} one frozen entry of {@link QUALITY_LEVELS}
 */
export const verdictFor = (cpLoss) => {
  if (cpLoss === null || cpLoss === undefined || Number.isNaN(cpLoss)) {
    return DEFAULT_QUALITY;
  }
  const loss = Math.max(0, cpLoss);
  for (const level of QUALITY_LEVELS) {
    if (loss <= level.max) return level;
  }
  return QUALITY_LEVELS.at(-1);
};

/**
 * Whether a verdict is an error worth putting in front of the learner again.
 * @param {string} label a `QUALITY_LEVELS` label
 * @returns {boolean} true for Mistake and Blunder
 */
export const isError = (label) => label === "Mistake" || label === "Blunder";

// ─── FSRS grade ──────────────────────────────────────────────────────────────

/**
 * Turn a move's centipawn loss into an FSRS review grade.
 *
 * **Latency is deliberately not an argument** (D3). Response time also contains
 * reading, pointing, device, animation and distraction, and accuracy and
 * latency can reflect different processes; mapping `ms` straight onto
 * `easy/good/hard` is not yet justified. Record latency as telemetry, report it
 * as a within-learner median per PF step, and only let it touch scheduling once
 * this app's own data shows it predicts later *unprompted* accuracy.
 *
 * The boundaries are the {@link QUALITY_LEVELS} boundaries, not a second set of
 * numbers, so a move graded `again` here is exactly a move the game report calls
 * a Mistake or a Blunder.
 * @param {number|null|undefined} cpLoss centipawns lost, from the mover's side
 * @returns {number} one of `RATING.AGAIN | HARD | GOOD | EASY`
 */
export const gradeFromEngine = (cpLoss) => {
  const { label } = verdictFor(cpLoss);
  if (isError(label)) return RATING.AGAIN;
  if (label === "Inaccuracy") return RATING.HARD;
  if (label === "Good") return RATING.GOOD;
  return RATING.EASY; // Excellent, Brilliant
};

// ─── Relative loss ───────────────────────────────────────────────────────────

/**
 * Centipawn loss of a move versus the best that was available.
 *
 * This is the grading rule for recovery drills (PRD §78.2), and getting it
 * relative rather than absolute matters more than it sounds: a recovery
 * position starts at −2 to −4, so grading on the absolute evaluation makes
 * every answer look like a loss. A move that holds −2.1 in a −2.3 position is a
 * **correct** answer and must be marked correct.
 *
 * Both arguments must already be in the same perspective — the mover's — with
 * higher meaning better for the mover.
 * @param {number|null|undefined} cpBefore best evaluation available before the move
 * @param {number|null|undefined} cpAfter evaluation actually reached by the move
 * @returns {number|null} loss in centipawns, clamped to `[0, MAX_CP_LOSS]`, or null
 */
export const practicalLoss = (cpBefore, cpAfter) => {
  if (
    cpBefore === null ||
    cpBefore === undefined ||
    Number.isNaN(cpBefore) ||
    cpAfter === null ||
    cpAfter === undefined ||
    Number.isNaN(cpAfter)
  ) {
    return null;
  }
  return Math.min(MAX_CP_LOSS, Math.max(0, cpBefore - cpAfter));
};

// ─── Candidates ──────────────────────────────────────────────────────────────

/**
 * Collapse one engine line's score to a single comparable number.
 *
 * Mate is folded to `±(MATE_SCORE_CP − |mateIn|)`, so a faster mate outranks a
 * slower one and any mate outranks any centipawn score.
 * @param {{scoreCp: number|null, isMate: boolean, mateIn: number|null}} line one engine line
 * @returns {number|null} comparable score in the side-to-move perspective
 */
export const lineScoreCp = (line) => {
  if (!line) return null;
  if (line.isMate && line.mateIn !== null && line.mateIn !== undefined) {
    const magnitude = MATE_SCORE_CP - Math.min(Math.abs(line.mateIn), 1000);
    return line.mateIn >= 0 ? magnitude : -magnitude;
  }
  return line.scoreCp ?? null;
};

/**
 * Rank a MultiPV result into candidates with their loss against the best line.
 *
 * The input is `analyze()`'s `lines` array, whose scores are in the
 * side-to-move perspective — which is also the mover's perspective, so the
 * losses come out directly comparable to {@link QUALITY_LEVELS}.
 *
 * Lines the engine could not score are dropped rather than ranked last, because
 * an unscored line is an absence of evidence, not evidence of a bad move.
 * @param {Array<object>} lines `analyze()` result lines
 * @returns {Array<object>} ranked candidates, best first
 */
export const candidateSpread = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) return [];

  const scored = lines
    .map((line) => ({ line, cp: lineScoreCp(line) }))
    .filter((entry) => entry.cp !== null)
    .sort((a, b) => b.cp - a.cp);

  if (scored.length === 0) return [];

  const [best] = scored;
  return scored.map((entry, index) => {
    const cpLoss = Math.min(MAX_CP_LOSS, Math.max(0, best.cp - entry.cp));
    const [firstMove = null] = entry.line.pv ?? [];
    return {
      rank: index + 1,
      uci: firstMove,
      pv: entry.line.pv ?? [],
      cp: entry.cp,
      scoreCp: entry.line.scoreCp ?? null,
      isMate: Boolean(entry.line.isMate),
      mateIn: entry.line.mateIn ?? null,
      depth: entry.line.depth ?? null,
      cpLoss,
      verdict: verdictFor(cpLoss).label,
    };
  });
};

// ─── Tactics ─────────────────────────────────────────────────────────────────

/**
 * How far ahead of the best *non-solution* alternative a tactic must be.
 *
 * A falsifiable parameter, not settled science: one number, one place.
 */
export const TACTIC_GAP_CP = 150;

const solutionSet = (certificate) => {
  const raw = certificate?.solution;
  const moves = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return new Set(moves.filter(Boolean).map((m) => String(m).toLowerCase()));
};

/**
 * Whether a position really contains the tactic its content claims.
 *
 * **A best-versus-second-best gap alone is not the test** (D2). It is not
 * necessary — two equal winning moves are still a tactic, and would show no gap
 * at all — and it is not sufficient — a quiet positional move can show 150cp.
 * So this requires two independent things:
 *
 * 1. **A motif/refutation certificate**, naming the motif and the move(s) that
 *    execute it. Detector- or author-supplied; the engine cannot produce it,
 *    because "there is a fork here" is a semantic claim about the board, not a
 *    number.
 * 2. **Engine confirmation**, at the certificate's own recorded budget: the
 *    engine's own best move is one of the certified solution moves, and that
 *    solution is decisively better than the best alternative *outside* the
 *    solution set — or mates.
 *
 * Measuring the gap against the best non-solution line, rather than against
 * rank 2, is what lets two equally winning solution moves both count.
 *
 * A near-miss position — motif on the board, tactic refuted — correctly returns
 * `false` here, since the engine's best move will not be the certified one.
 * @param {Array<object>} lines `analyze()` result lines, side-to-move perspective
 * @param {{motif: string, solution: string|string[]}} certificate motif certificate
 * @param {number} [gapCp] required edge over the best non-solution move
 * @returns {boolean} true only when certificate and engine agree
 */
export const isRealTactic = (lines, certificate, gapCp = TACTIC_GAP_CP) => {
  if (!certificate?.motif) return false;

  const solutions = solutionSet(certificate);
  if (solutions.size === 0) return false;

  const candidates = candidateSpread(lines);
  if (candidates.length === 0) return false;

  const [best] = candidates;
  if (!best.uci || !solutions.has(best.uci.toLowerCase())) return false;

  // Any forced mate for the mover is decisive by definition; no gap needed.
  if (best.isMate && best.mateIn > 0) return true;

  const bestAlternative = candidates.find(
    (c) => c.uci && !solutions.has(c.uci.toLowerCase()),
  );

  // Every line the engine returned executes the motif: nothing to lose to.
  if (!bestAlternative) return true;

  return best.cp - bestAlternative.cp > gapCp;
};

// ─── The analysis budget contract ────────────────────────────────────────────

/**
 * Every search the app runs, with its wall-clock ceiling.
 *
 * `analyze()` has a single `_pending` slot, so two overlapping requests orphan
 * the first — neither resolved nor rejected — and whatever awaits it waits
 * forever. Separately, a depth search has no time bound at all: on this
 * single-threaded lite WASM build a cluttered middlegame at depth 12 can take
 * tens of seconds. Together those are the app's whole hang class.
 *
 * So the rule (PRD §83.3): **no call passes fewer than both bounds.** `depth`
 * is the search's target and `movetimeMs` its ceiling — the engine stops at
 * whichever comes first — while `timeoutMs` is the caller's escape hatch if the
 * worker never answers at all.
 *
 * Budgets are tuned here and nowhere else. They are falsifiable parameters:
 * every one is a guess about what a learner will sit through.
 */
export const ANALYSIS_BUDGETS = Object.freeze({
  /** Eval bar after a move, and on restoring a saved game. Cheap, discardable. */
  evalBar: { depth: 10, multiPV: 1, movetimeMs: 400, timeoutMs: 8_000 },

  /** Live mode: the position before the learner's move, to find the best move. */
  moveReviewBefore: {
    depth: 14,
    multiPV: 1,
    movetimeMs: 700,
    timeoutMs: 10_000,
  },

  /** Live mode: the position after it, to price what the move actually cost. */
  moveReviewAfter: {
    depth: 10,
    multiPV: 1,
    movetimeMs: 500,
    timeoutMs: 10_000,
  },

  /** Live mode: the running commentary line. */
  liveAnalysis: { depth: 12, multiPV: 1, movetimeMs: 700, timeoutMs: 10_000 },

  /** "🎯 Hint" — one line, and the learner is waiting on it. */
  hint: { depth: 12, multiPV: 1, movetimeMs: 700, timeoutMs: 10_000 },

  /** "💡 Best Move" — one line, drawn on the board as an arrow. */
  bestMove: { depth: 15, multiPV: 1, movetimeMs: 1_000, timeoutMs: 12_000 },

  /** "🔍 Analyze position" — three lines, a card the learner reads. */
  analyzePosition: {
    depth: 18,
    multiPV: 3,
    movetimeMs: 2_000,
    timeoutMs: 20_000,
  },

  /** "Think Like a GM" — the deepest thing the UI asks for. */
  thinkLikeGM: { depth: 18, multiPV: 3, movetimeMs: 2_500, timeoutMs: 30_000 },

  /**
   * Post-game report, once per position of a finished game. Depth-led rather
   * than time-led — this is a batch job behind a progress bar — but still
   * ceilinged, because sixty unbounded searches is how a report never finishes.
   */
  postGame: { depth: 10, multiPV: 1, movetimeMs: 1_000, timeoutMs: 15_000 },

  /** Commit Gate: the learner has predicted and is waiting for the verdict. */
  commitGate: { depth: 14, multiPV: 3, movetimeMs: 600, timeoutMs: 8_000 },

  /** Play-out drills: the engine's reply move in an endgame drill. */
  playoutReply: { depth: 12, multiPV: 1, movetimeMs: 400, timeoutMs: 15_000 },

  /** Structure drills: scoring a move, then answering it. */
  structureReply: {
    depth: 16,
    multiPV: 1,
    movetimeMs: 1_200,
    timeoutMs: 20_000,
  },

  /**
   * Build-time certification (`verify:endgames`, later `verify:drills`). Runs
   * on a developer machine, once, and nobody is watching — so it is the one
   * budget allowed to be expensive.
   */
  certify: { depth: 20, multiPV: 3, movetimeMs: 0, timeoutMs: 300_000 },
});

/**
 * The budget for one use case.
 * @param {string} useCase a key of {@link ANALYSIS_BUDGETS}
 * @returns {{depth: number, multiPV: number, movetimeMs: number, timeoutMs: number}} the frozen budget
 * @throws {Error} on an unknown use case, so a typo cannot silently mean "no bound"
 */
export const analysisBudget = (useCase) => {
  const budget = ANALYSIS_BUDGETS[useCase];
  if (!budget) {
    throw new Error(
      `Unknown analysis budget "${useCase}". Add it to ANALYSIS_BUDGETS in src/pf/verdict.js rather than passing numbers at the call site.`,
    );
  }
  return budget;
};

/**
 * Spread a budget into `analyze()`'s positional arguments.
 *
 * `engine.analyze(fen, ...analyzeArguments("hint"))` is the whole call, which is
 * what keeps the four numbers from drifting apart at thirteen call sites.
 * @param {string} useCase a key of {@link ANALYSIS_BUDGETS}
 * @returns {Array<number>} `[depth, multiPV, timeoutMs, movetimeMs]`
 */
export const analyzeArguments = (useCase) => {
  const { depth, multiPV, timeoutMs, movetimeMs } = analysisBudget(useCase);
  return [depth, multiPV, timeoutMs, movetimeMs];
};

/**
 * The reproducible record of *how* a verdict was reached (D14).
 *
 * A certificate you cannot reproduce is not a certificate, so this carries the
 * whole contract — engine identity, both search bounds, MultiPV, the score
 * perspective the numbers are in, and how mate was folded to a scalar — not
 * just a depth and a date.
 * @param {string} useCase the budget the search ran under
 * @param {object} [extra] anything the caller wants stamped alongside
 * @returns {object} a frozen provenance record
 */
export const analysisContract = (useCase, extra = {}) => {
  const budget = analysisBudget(useCase);
  return Object.freeze({
    engine: ENGINE_ID,
    useCase,
    depth: budget.depth,
    multiPV: budget.multiPV,
    movetimeMs: budget.movetimeMs,
    timeoutMs: budget.timeoutMs,
    nonDefaultOptions: { "Skill Level": 20 },
    scorePerspective: "side-to-move",
    mateHandling: `folded to ±(${MATE_SCORE_CP} − |mateIn|)`,
    verifiedAt: new Date().toISOString(),
    ...extra,
  });
};
