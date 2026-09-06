/**
 * The adaptive difficulty band, and the stretch rep (PRD §81.3, §81.4; D4).
 *
 * 476 of the app's 895 drill positions carry a Lichess `rating` and, until
 * this module, nothing read it: `selectPositions()` rotated an item's eight
 * imported puzzles by review count whether they were 200 points below the
 * learner or 400 above. Difficulty inside an unlocked item was not adaptive at
 * all. This is the controller that makes it so.
 *
 * ## The staircase, and why it is not the one the PRD asked for
 *
 * PRD §81.3 specifies `+15` on a correct answer, `−30` on a miss, and claims
 * convergence to 80–85%. **That is arithmetically wrong.** Expected drift is
 * zero where `15p = 30(1 − p)`, which is p = 0.667, not 0.85. D4 replaced it
 * with a **transformed staircase**: difficulty up one step after
 * `RUN_TO_ADVANCE` consecutive correct answers, down one step on any miss. Its
 * fixed point is where `p ** RUN_TO_ADVANCE = 0.5` — with a run of four,
 * **p = 0.841**, which is the Wilson et al. target without fitting a model to
 * anything. (If per-answer deltas are ever wanted instead, the weighted
 * up-down equivalent for 85% is `+15 / −85`, the ratio `(1 − p) / p`.)
 *
 * D4 also required the controller be simulated before shipping. It was:
 * `scripts/simulate-band.js` reproduces the table in
 * `docs/IMPLEMENTATION-PLAN.md` §7, and `band.test.js` runs a seeded version
 * of the same simulation so the 0.84 claim cannot rot.
 *
 * ## It is a difficulty band, never a rating
 *
 * Per D15, a Lichess puzzle rating is *population difficulty* — the share of
 * players who solve it — and not a per-PF-step scale for one learner. So this
 * number is labelled "puzzle difficulty" everywhere it is shown, and it is not
 * shown at all until a step has `MIN_REPS_TO_SHOW` counted reps behind it.
 *
 * ## Known limit, in the content rather than the code
 *
 * The imported corpus bottoms out at rating 801. A learner whose true ability
 * is below roughly 1150 therefore sits above their own 84% target no matter
 * where the band walks, because there is nothing easier to serve them. Rated
 * content is also concentrated: PF3 has 328 rated positions, PF7 has no items
 * at all, and four steps have fewer than 40. The staircase starts working on
 * any step the importer later fills; it is not waiting on code.
 *
 * Pure except for `readBands` and `recordBandOutcome`, which wrap the v4
 * `bands` store the same way `scaffold.js` wraps `events`.
 */

import { getBands, putBand } from "@/lib/srs-db";

/** One step of the staircase, in rating points. */
export const STEP_POINTS = 50;

/**
 * Consecutive correct answers before difficulty rises.
 *
 * This single number sets the target accuracy: the staircase settles where
 * `p ** RUN_TO_ADVANCE = 0.5`. Four gives 0.841; three would give 0.794 and
 * five 0.871. It is the tunable parameter of the whole feature.
 */
export const RUN_TO_ADVANCE = 4;

/** Half-width of the selection window around the band. */
export const BAND_WIDTH = 100;

/** How far above the band a stretch rep is drawn (§81.4). */
export const STRETCH_OFFSET = 200;

/** One position in this many is a stretch rep. */
export const STRETCH_EVERY = 8;

/** Where a step starts, near the median of the imported corpus (1304). */
export const DEFAULT_BAND = 1200;

/** The corpus runs 801–1899; walking outside it would select nothing. */
export const MIN_BAND = 800;
export const MAX_BAND = 1900;

/**
 * Counted reps before a step's difficulty is worth showing a learner.
 *
 * The simulation puts median convergence at 1–16 reps and p90 at 31 from a
 * cold 1200 start. Twelve is inside that: enough that the number has moved off
 * its default for a reason, few enough that it appears within a week.
 */
export const MIN_REPS_TO_SHOW = 12;

/** A step's controller state before it has seen anything. */
export const initialBand = () => ({ band: DEFAULT_BAND, run: 0, reps: 0 });

const clampBand = (band) => Math.min(MAX_BAND, Math.max(MIN_BAND, band));

/**
 * The staircase itself: one graded outcome in, the next state out.
 *
 * A miss resets the run and drops a step immediately — that asymmetry is what
 * makes the rule converge above 50%, and it is why the run counter must be
 * cleared on the way down as well as on the way up.
 * @param {object} [state] current `{ band, run, reps }`
 * @param {boolean} correct whether the learner got it
 * @returns {{band: number, run: number, reps: number}} the next state
 */
export const nextBandState = (state, correct) => {
  const { band, run, reps } = { ...initialBand(), ...state };

  if (!correct) {
    return { band: clampBand(band - STEP_POINTS), run: 0, reps: reps + 1 };
  }

  const advanced = run + 1;
  return advanced >= RUN_TO_ADVANCE
    ? { band: clampBand(band + STEP_POINTS), run: 0, reps: reps + 1 }
    : { band, run: advanced, reps: reps + 1 };
};

/**
 * A solved stretch rep, which raises the ceiling.
 *
 * §81.4: a stretch is drawn above the band deliberately, so it is scored
 * separately from the staircase — a *solved* one bumps the band a full step,
 * and a missed one does nothing at all. Feeding a miss back in would punish
 * the learner for the app's own choice of position and ratchet the band down.
 * @param {object} [state] current `{ band, run, reps }`
 * @returns {{band: number, run: number, reps: number}} the next state
 */
export const solvedStretch = (state) => {
  const current = { ...initialBand(), ...state };
  return {
    ...current,
    band: clampBand(current.band + STEP_POINTS),
    run: 0,
  };
};

/** Whether a position's difficulty is known to the band at all. */
const isRated = (position) => typeof position?.rating === "number";

/**
 * The rotation `selectPositions` has always used, over an arbitrary list.
 *
 * Repeated reviews of one item must not be repeated reviews of the same three
 * boards, which is the difference between learning a pattern and memorising a
 * position. Band filtering happens first and then this rotates what survives,
 * so both properties hold at once.
 */
const rotate = (positions, reps, limit) => {
  if (positions.length <= limit) return positions;
  const start = (reps * limit) % positions.length;
  const window = positions.slice(start, start + limit);
  return window.length === limit
    ? window
    : [...window, ...positions.slice(0, limit - window.length)];
};

/**
 * The stretch position for this item, or null if it has nothing hard enough.
 *
 * "Roughly +200" is a target, not a threshold: the nearest rated position at
 * or above `band + STRETCH_OFFSET` is used, and if the item's hardest content
 * does not reach that far there is simply no stretch rep. Relabelling an
 * in-band position as a stretch would make the badge — and the promise that a
 * miss here costs nothing — a lie.
 */
const stretchPosition = (positions, band) => {
  const above = positions
    .filter(
      (position) =>
        isRated(position) && position.rating >= band + STRETCH_OFFSET,
    )
    .sort((a, b) => a.rating - b.rating);
  return above[0] ?? null;
};

/** Distance from the band, for topping up when too few are in range. */
const distanceFrom = (band) => (position) =>
  isRated(position) ? Math.abs(position.rating - band) : 0;

/**
 * Choose the positions to show, at the learner's difficulty.
 *
 * Unrated positions — authored drills, endgames, tabiya, everything the
 * importer did not touch — are **always eligible** (§81.3). They are the
 * majority of the deck, and excluding them would silently delete most of the
 * curriculum for anyone whose band drifted.
 * @param {object[]} positions every position for the item
 * @param {object} options selection inputs
 * @param {number} options.band the step's current difficulty band
 * @param {number} [options.reps] the card's review count, for rotation
 * @param {number} [options.limit] how many positions to return
 * @returns {object[]} the positions for this sitting
 */
export const selectInBand = (
  positions,
  { band = DEFAULT_BAND, reps = 0, limit = 3 } = {},
) => {
  if (positions.length <= limit) return positions;

  const eligible = positions.filter(
    (position) =>
      !isRated(position) || Math.abs(position.rating - band) <= BAND_WIDTH,
  );

  // Too few in range is normal — an item has eight rated puzzles spread over
  // 500 points. Top up with the nearest, so a narrow band never starves the
  // sitting; rotation still applies to whatever the pool ends up being.
  const pool =
    eligible.length >= limit
      ? eligible
      : [...positions].sort(
          (a, b) => distanceFrom(band)(a) - distanceFrom(band)(b),
        );

  return rotate(pool, reps, limit);
};

/**
 * Swap one position in eight for something deliberately above band (§81.4).
 *
 * This runs over the **finished, ordered queue** rather than inside
 * `selectInBand`, and that is the whole reason it is a separate pass: entries
 * are built in four batches (warm-up, due, targeted, new) and concatenated
 * afterwards, so a counter kept during selection would count in an order the
 * learner never sees. One in eight has to mean one in eight of what actually
 * appears.
 *
 * Warm-up entries are skipped — they are never graded, so a stretch rep in one
 * would be a badge with no consequence attached.
 * @param {object[]} entries the ordered queue
 * @param {object} options inputs
 * @param {Record<string, object>} options.bands step key to band state
 * @param {Function} options.poolFor item id to that item's full position list
 * @returns {object[]} the queue, with stretch positions flagged
 */
export const applyStretch = (entries, { bands = {}, poolFor } = {}) => {
  let seen = 0;

  return entries.map((entry) => {
    const state = bands[entry.item?.pfStep];
    if (!state || entry.warmup) {
      seen += entry.positions.length;
      return entry;
    }

    const stretch = stretchPosition(poolFor(entry.item.id), state.band);
    const positions = entry.positions.map((position, index) => {
      const due = (seen + index) % STRETCH_EVERY === STRETCH_EVERY - 1;
      const alreadyShown = entry.positions.some(
        (other) => other.id === stretch?.id,
      );
      return stretch && due && !alreadyShown
        ? { ...stretch, stretch: true }
        : position;
    });

    seen += entry.positions.length;
    return { ...entry, positions };
  });
};

/**
 * A step's difficulty, phrased for a learner, or null when it is too early.
 * @param {object} [state] the step's `{ band, reps }`
 * @returns {number|null} the band to display, or null
 */
export const displayBand = (state) =>
  (state?.reps ?? 0) >= MIN_REPS_TO_SHOW ? (state?.band ?? null) : null;

// ── Persistence ────────────────────────────────────────────────────────────
// Both swallow their errors. A learner whose IndexedDB is unavailable — Safari
// private browsing, a cleared profile — should get the default band and an
// ordinary session, not a broken one.

/**
 * Every stored band, keyed by PF step.
 * @returns {Promise<Record<string, object>>} step key to `{ band, run, reps }`
 */
export const readBands = async () => {
  try {
    const rows = await getBands();
    return Object.fromEntries(rows.map((row) => [row.pfStep, row]));
  } catch {
    return {};
  }
};

/**
 * Fold one resolved position into its step's band.
 *
 * Returns the new state rather than only writing it, so the caller can update
 * its mirror without a re-read.
 * @param {string} pfStep the step the item is filed under
 * @param {object} outcome what happened
 * @param {object} [outcome.state] the step's current state
 * @param {boolean} outcome.correct whether the learner solved it
 * @param {boolean} [outcome.stretch] whether it was a stretch rep
 * @returns {Promise<object|null>} the new state, or null when nothing changed
 */
export const recordBandOutcome = async (
  pfStep,
  { state = null, correct = false, stretch = false } = {},
) => {
  if (!pfStep) return null;

  // A missed stretch changes nothing — not the band, not the run, not the rep
  // count. It was the app's choice to show it, so it is not evidence about the
  // learner's level (§81.4).
  if (stretch && !correct) return null;

  const next = stretch ? solvedStretch(state) : nextBandState(state, correct);

  try {
    await putBand({ ...next, pfStep });
  } catch {
    // The band is a convenience, not a correctness requirement.
  }
  return next;
};
