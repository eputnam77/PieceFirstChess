/**
 * FSRS-6 spaced-repetition scheduler.
 *
 * Pure functions only — no IndexedDB, no React, no globals. `now` is injected on
 * every call so scheduling is fully deterministic and testable. Persistence and
 * store wiring live elsewhere.
 *
 * Why this exists: `progress.js` records a binary `solved: true`, so an item is
 * marked done forever after one correct answer. That is a completion tracker,
 * not a memory system. Engraining a pattern requires re-testing it at expanding
 * intervals, which is what this module schedules.
 *
 * Algorithm: FSRS-6, transcribed from the reference implementation at
 * open-spaced-repetition/py-fsrs (`fsrs/scheduler.py`). Note that the FSRS wiki's
 * prose summary uses parameter indices that contradict the weight values
 * themselves — the indices below follow the reference code, and `srs.test.js`
 * pins the defining identity R(t = stability) = 0.9 so an index slip is caught.
 *
 * Ratings are the standard four-point scale: Again / Hard / Good / Easy.
 */

// ─── Rating and state enums ──────────────────────────────────────────────────

/** Review grades. Values are significant: FSRS indexes parameters by rating. */
export const RATING = {
  AGAIN: 1,
  HARD: 2,
  GOOD: 3,
  EASY: 4,
};

/** Card lifecycle states. */
export const CARD_STATE = {
  NEW: "new",
  LEARNING: "learning",
  REVIEW: "review",
  RELEARNING: "relearning",
};

const VALID_RATINGS = new Set([
  RATING.AGAIN,
  RATING.HARD,
  RATING.GOOD,
  RATING.EASY,
]);

// ─── FSRS-6 constants ────────────────────────────────────────────────────────

/**
 * FSRS-6 default parameters (21 values).
 *
 * Index map, per the reference implementation:
 * 0–3   initial stability per rating (Again, Hard, Good, Easy)
 * 4–5   initial difficulty
 * 6–7   difficulty update: delta, then mean reversion
 * 8–10  stability after successful recall
 * 11–14 stability after a lapse
 * 15    hard penalty
 * 16    easy bonus
 * 17–19 same-day / short-term stability
 * 20    decay
 */
export const FSRS_DEFAULT_PARAMETERS = Object.freeze([
  0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666,
  0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658,
  0.1542,
]);

const STABILITY_MIN = 0.001;
const DIFFICULTY_MIN = 1;
const DIFFICULTY_MAX = 10;

const MILLISECONDS_PER_DAY = 86_400_000;

/** Default scheduler configuration. */
export const SRS_DEFAULT_CONFIG = Object.freeze({
  parameters: FSRS_DEFAULT_PARAMETERS,
  /** Probability of recall targeted when scheduling the next review. */
  desiredRetention: 0.9,
  /** Upper bound on an interval, in days (100 years). */
  maximumInterval: 36_500,
  /**
   * Sub-day steps, in minutes, before a card graduates to day-based intervals.
   * Empty (the default) means pure day-based scheduling — the simple path. The
   * short-term stability branch is still implemented, so steps can be enabled
   * later without reworking this module.
   */
  learningSteps: [],
  relearningSteps: [],
  /**
   * Spread due dates slightly to avoid review pile-ups. Off by default so
   * scheduling stays deterministic; callers that want it supply their own RNG.
   */
  enableFuzz: false,
});

// ─── Small helpers ───────────────────────────────────────────────────────────

const clampStability = (stability) => Math.max(stability, STABILITY_MIN);

const clampDifficulty = (difficulty) =>
  Math.min(Math.max(difficulty, DIFFICULTY_MIN), DIFFICULTY_MAX);

const toEpoch = (value) =>
  value instanceof Date ? value.getTime() : Number(value);

const daysBetween = (laterEpoch, earlierEpoch) =>
  Math.max(0, (laterEpoch - earlierEpoch) / MILLISECONDS_PER_DAY);

const resolveConfig = (options) => {
  const config = { ...SRS_DEFAULT_CONFIG, ...options };
  if (!Array.isArray(config.parameters) || config.parameters.length !== 21) {
    throw new Error("FSRS requires exactly 21 parameters");
  }
  return config;
};

/** Decay is stored positive in the parameter vector but applied negative. */
const getDecay = (parameters) => -parameters[20];

/**
 * FACTOR is derived so that retrievability equals exactly 0.9 when elapsed time
 * equals stability — that identity is the definition of stability.
 */
const getFactor = (parameters) => 0.9 ** (1 / getDecay(parameters)) - 1;

// ─── FSRS-6 core formulas ────────────────────────────────────────────────────

/**
 * Probability of recall after `elapsedDays` given a stability.
 * @param {number} elapsedDays days since the last review
 * @param {number} stability current memory stability, in days
 * @param {number[]} parameters FSRS parameter vector
 * @returns {number} retrievability in (0, 1]
 */
export const retrievability = (
  elapsedDays,
  stability,
  parameters = FSRS_DEFAULT_PARAMETERS,
) => {
  if (stability <= 0) return 0;
  const decay = getDecay(parameters);
  const factor = getFactor(parameters);
  return (1 + (factor * elapsedDays) / stability) ** decay;
};

/**
 * Days until retrievability decays to `desiredRetention`.
 * @param {number} stability memory stability, in days
 * @param {object} [options] scheduler config overrides
 * @returns {number} whole days, at least 1 and at most the configured maximum
 */
export const nextInterval = (stability, options) => {
  const { parameters, desiredRetention, maximumInterval } =
    resolveConfig(options);
  const decay = getDecay(parameters);
  const factor = getFactor(parameters);
  const interval = (stability / factor) * (desiredRetention ** (1 / decay) - 1);
  return Math.min(Math.max(Math.round(interval), 1), maximumInterval);
};

/** Stability assigned to a brand-new card, chosen by its first grade. */
const initialStability = (rating, parameters) =>
  clampStability(parameters[rating - 1]);

/**
 * Difficulty assigned to a brand-new card.
 * Left unclamped for the mean-reversion target, per the reference implementation.
 */
const initialDifficulty = (rating, parameters, clamp = true) => {
  const difficulty =
    parameters[4] - Math.E ** (parameters[5] * (rating - 1)) + 1;
  return clamp ? clampDifficulty(difficulty) : difficulty;
};

/**
 * Update difficulty after a review.
 *
 * Two effects compose: a linear-damped step toward easier/harder based on the
 * grade, then mean reversion toward the "easy" baseline so difficulty cannot
 * ratchet upward forever.
 */
const nextDifficulty = (difficulty, rating, parameters) => {
  const deltaDifficulty = -(parameters[6] * (rating - 3));
  const damped = difficulty + ((10 - difficulty) * deltaDifficulty) / 9;
  const reversionTarget = initialDifficulty(RATING.EASY, parameters, false);
  const reverted =
    parameters[7] * reversionTarget + (1 - parameters[7]) * damped;
  return clampDifficulty(reverted);
};

/** Stability after a successful recall (Hard, Good, or Easy). */
const recallStability = (
  difficulty,
  stability,
  currentRetrievability,
  rating,
  parameters,
) => {
  const hardPenalty = rating === RATING.HARD ? parameters[15] : 1;
  const easyBonus = rating === RATING.EASY ? parameters[16] : 1;

  return (
    stability *
    (1 +
      Math.E ** parameters[8] *
        (11 - difficulty) *
        stability ** -parameters[9] *
        (Math.E ** ((1 - currentRetrievability) * parameters[10]) - 1) *
        hardPenalty *
        easyBonus)
  );
};

/**
 * Stability after a lapse (Again).
 * Capped by a short-term term so a lapse can never *raise* stability.
 */
const forgetStability = (
  difficulty,
  stability,
  currentRetrievability,
  parameters,
) => {
  const longTerm =
    parameters[11] *
    difficulty ** -parameters[12] *
    ((stability + 1) ** parameters[13] - 1) *
    Math.E ** ((1 - currentRetrievability) * parameters[14]);

  const shortTerm = stability / Math.E ** (parameters[17] * parameters[18]);

  return Math.min(longTerm, shortTerm);
};

/** Stability change for a same-day repeat, used while a card is in learning. */
const shortTermStability = (stability, rating, parameters) => {
  let increase =
    Math.E ** (parameters[17] * (rating - 3 + parameters[18])) *
    stability ** -parameters[19];

  // A non-lapse same-day review must never reduce stability.
  if (rating >= RATING.HARD) {
    increase = Math.max(increase, 1);
  }

  return clampStability(stability * increase);
};

// ─── Card lifecycle ──────────────────────────────────────────────────────────

/**
 * Create a fresh, never-reviewed card for a curriculum item.
 * @param {string} itemId curriculum item id this card tracks
 * @param {number|Date} [now] creation timestamp; the card is immediately due
 * @returns {object} a new card
 */
export const createCard = (itemId, now = Date.now()) => ({
  itemId,
  state: CARD_STATE.NEW,
  stability: null,
  difficulty: null,
  due: toEpoch(now),
  lastReview: null,
  reps: 0,
  lapses: 0,
});

/**
 * Whether a card is due for review at `now`.
 * @param {object} card the card
 * @param {number|Date} [now] comparison timestamp
 * @returns {boolean} true when due
 */
export const isDue = (card, now = Date.now()) => card.due <= toEpoch(now);

/**
 * Current probability of recall for a card.
 * @param {object} card the card
 * @param {number|Date} [now] comparison timestamp
 * @param {object} [options] scheduler config overrides
 * @returns {number} retrievability in [0, 1]; 1 for a never-reviewed card
 */
export const getRetrievability = (card, now = Date.now(), options = {}) => {
  const { parameters } = resolveConfig(options);
  if (card.state === CARD_STATE.NEW || card.lastReview === null) return 1;
  const elapsedDays = daysBetween(toEpoch(now), card.lastReview);
  return retrievability(elapsedDays, card.stability, parameters);
};

/**
 * Next lifecycle state.
 *
 * With the default empty learning steps a card graduates to REVIEW on its first
 * review and returns there immediately after a lapse, giving pure day-based
 * scheduling. Configured steps keep the card in LEARNING/RELEARNING instead.
 */
const nextState = (currentState, rating, config) => {
  const hasLearningSteps = config.learningSteps.length > 0;
  const hasRelearningSteps = config.relearningSteps.length > 0;

  if (rating === RATING.AGAIN) {
    return hasRelearningSteps ? CARD_STATE.RELEARNING : CARD_STATE.REVIEW;
  }

  if (currentState === CARD_STATE.NEW) {
    return hasLearningSteps ? CARD_STATE.LEARNING : CARD_STATE.REVIEW;
  }

  return CARD_STATE.REVIEW;
};

/**
 * Apply a review to a card and schedule the next one.
 *
 * Returns a new card object — the input is never mutated, so callers can diff
 * before/after and store state optimistically.
 * @param {object} card the card being reviewed
 * @param {number} rating one of RATING.AGAIN | HARD | GOOD | EASY
 * @param {number|Date} [now] review timestamp
 * @param {object} [options] scheduler config overrides
 * @returns {{card: object, log: object}} the updated card and a review-log entry
 */
export const reviewCard = (card, rating, now = Date.now(), options = {}) => {
  if (!VALID_RATINGS.has(rating)) {
    throw new Error(`Invalid rating: ${rating}`);
  }
  const config = resolveConfig(options);
  const { parameters } = config;

  const reviewedAt = toEpoch(now);
  const elapsedDays =
    card.lastReview === null ? 0 : daysBetween(reviewedAt, card.lastReview);
  const currentRetrievability = getRetrievability(card, reviewedAt, config);

  let { stability, difficulty } = card;

  if (card.state === CARD_STATE.NEW) {
    stability = initialStability(rating, parameters);
    difficulty = initialDifficulty(rating, parameters);
  } else if (elapsedDays < 1) {
    // Same-day repeat: memory has not measurably decayed yet.
    stability = shortTermStability(card.stability, rating, parameters);
    difficulty = nextDifficulty(card.difficulty, rating, parameters);
  } else {
    stability =
      rating === RATING.AGAIN
        ? forgetStability(
            card.difficulty,
            card.stability,
            currentRetrievability,
            parameters,
          )
        : recallStability(
            card.difficulty,
            card.stability,
            currentRetrievability,
            rating,
            parameters,
          );
    difficulty = nextDifficulty(card.difficulty, rating, parameters);
  }

  stability = clampStability(stability);
  difficulty = clampDifficulty(difficulty);

  const state = nextState(card.state, rating, config);
  const intervalDays = nextInterval(stability, config);

  return {
    card: {
      ...card,
      state,
      stability,
      difficulty,
      due: reviewedAt + intervalDays * MILLISECONDS_PER_DAY,
      lastReview: reviewedAt,
      reps: card.reps + 1,
      lapses: card.lapses + (rating === RATING.AGAIN ? 1 : 0),
    },
    log: {
      itemId: card.itemId,
      rating,
      state: card.state,
      reviewedAt,
      elapsedDays,
      retrievability: currentRetrievability,
      intervalDays,
    },
  };
};

// ─── Queue helpers ───────────────────────────────────────────────────────────

/**
 * Cards due at `now`, soonest-due first.
 * @param {object[]} cards cards to filter
 * @param {number|Date} [now] comparison timestamp
 * @returns {object[]} the due subset, sorted
 */
export const getDueCards = (cards, now = Date.now()) =>
  cards.filter((card) => isDue(card, now)).sort((a, b) => a.due - b.due);

/**
 * Sort a copy of `cards` by due date, soonest first.
 * @param {object[]} cards cards to sort
 * @returns {object[]} a new sorted array
 */
export const sortByDue = (cards) => [...cards].sort((a, b) => a.due - b.due);
