/**
 * The warm-up — the musician's scales, sized to what you are actually failing.
 *
 * Every session opens with recognition reps on the two steps sub-1000 games are
 * lost to: PF7 VERIFY (blunder checks) and PF2 SAFETY (board sweeps). Both are
 * free content — already imported, or generated from the board — so the warm-up
 * is the part of a session that is *always* available offline with no key and no
 * authoring (PRD §82.5).
 *
 * ## Adaptive and skippable, not a fixed floor (D6)
 *
 * The PRD asked for a flat 20 reps, non-skippable. That is wrong in two ways: it
 * overrides FSRS even when those skills are stable, and twenty reps can eat a
 * whole 20-minute session, turning useful spacing into massed overpractice. So
 * the count is **3 to 10 per step**, driven by the learner's own error tally,
 * and skipping is one click.
 *
 * The floor of 3 is the actual "scales" claim — a few reps before you start,
 * every day, regardless. The ceiling of 10 is what stops a bad week from
 * crowding out everything scheduled.
 *
 * ## Every number here is tunable, and none of them is evidence
 *
 * `MIN_REPS`, `MAX_REPS` and `TALLY_MASS` are guesses with a rationale, in one
 * place, named. They are exactly the kind of parameter §5 of the plan of record
 * says must not be scattered.
 *
 * Pure module: takes the tally and the positions, returns queue entries.
 */

/** Reps every session opens with, whatever the tally says. */
export const MIN_REPS = 3;

/** The most any one step can claim, so a bad week cannot eat the schedule. */
export const MAX_REPS = 10;

/**
 * Total tallied error weight at which the tally is trusted to set the band.
 *
 * Below this the warm-up stays near the floor. Two errors in one game are not
 * a diagnosis, and letting them push a step to ten reps would make the warm-up
 * lurch around after every game — which is D11's point that the learner's own
 * tally sets the weights only *once it has mass*.
 */
export const TALLY_MASS = 10;

/**
 * The steps the warm-up drills, and what content each draws on.
 *
 * Deliberately just two. This is a warm-up, not a second curriculum: PF7 and
 * PF2 are where sub-1000 games are actually lost (PRD §76), and both have
 * content that costs nothing to produce.
 */
export const WARMUP_STEPS = Object.freeze([
  {
    step: "PF7",
    label: "Blunder check",
    types: ["blundercheck"],
    hint: "Is this move safe? Yes or no.",
  },
  {
    step: "PF2",
    label: "Board sweep",
    types: ["sweep", "scan"],
    hint: "Click what can be taken.",
  },
]);

/**
 * How many reps one step gets.
 *
 * The step's *share* of your errors, not its raw count: the tally is cumulative
 * across every game, so a raw count would only ever grow and the warm-up would
 * ratchet to the ceiling and stay there. Share is scaled by how much the tally
 * knows, so a learner with no history gets the floor.
 * @param {string} step a PF step key
 * @param {Record<string, number>} failureWeights the error tally's weights
 * @returns {number} reps, in `[MIN_REPS, MAX_REPS]`
 */
export const repsForStep = (step, failureWeights = {}) => {
  const total = Object.values(failureWeights).reduce(
    (sum, weight) => sum + weight,
    0,
  );
  if (total === 0) return MIN_REPS;

  const share = (failureWeights[step] ?? 0) / total;
  const confidence = Math.min(1, total / TALLY_MASS);
  const extra = Math.round(share * confidence * (MAX_REPS - MIN_REPS));
  return Math.min(MAX_REPS, MIN_REPS + extra);
};

/**
 * Pick this session's reps from an item's positions.
 *
 * Rotated by a counter rather than shuffled, for the same reason
 * `selectPositions()` in `session.js` rotates: the reps must differ between
 * sessions, and they must be the same on every device given the same counter.
 * Randomness here would make a session unreproducible for no benefit.
 * @param {object[]} positions every position available
 * @param {string[]} types which drill types qualify
 * @param {number} count how many to take
 * @param {number} [rotation] advances the window between sessions
 * @returns {object[]} the chosen positions
 */
export const selectWarmupReps = (
  positions = [],
  types = [],
  count = MIN_REPS,
  rotation = 0,
) => {
  const eligible = positions.filter((position) =>
    types.includes(position.type),
  );
  if (eligible.length === 0) return [];
  if (eligible.length <= count) return eligible;

  const start = (rotation * count) % eligible.length;
  const window = eligible.slice(start, start + count);
  return window.length === count
    ? window
    : [...window, ...eligible.slice(0, count - window.length)];
};

/**
 * Build the warm-up entries that go at the head of a queue.
 *
 * One entry per step, in `WARMUP_STEPS` order, each carrying its own reps. They
 * are queue entries of the ordinary shape, so the minute budget costs them like
 * anything else and `summarizeSession` counts them — which is what keeps the
 * session's advertised length honest once the new `MINUTES_PER_POSITION`
 * entries are in place.
 *
 * A step with no content is skipped silently rather than shipped empty.
 * @param {object} options builder inputs
 * @param {object} options.item the curriculum item the reps hang from
 * @param {object[]} options.positions every position for that item
 * @param {object|null} [options.card] its SRS card, for the rotation counter
 * @param {Record<string, number>} [options.failureWeights] the error tally
 * @returns {object[]} queue entries with `kind: "warmup"`
 */
export const buildWarmup = ({
  item,
  positions = [],
  card = null,
  failureWeights = {},
}) => {
  if (!item) return [];

  const entries = [];
  for (const spec of WARMUP_STEPS) {
    const reps = selectWarmupReps(
      positions,
      spec.types,
      repsForStep(spec.step, failureWeights),
      card?.reps ?? 0,
    );
    if (reps.length === 0) continue;
    entries.push({
      item,
      card,
      kind: "warmup",
      // Carried so the UI can say which step is being warmed up and why the
      // count is what it is, rather than presenting an unexplained number.
      warmup: { step: spec.step, label: spec.label, hint: spec.hint },
      positions: reps,
    });
  }
  return entries;
};

/**
 * Whether an entry is warm-up rather than scheduled work.
 *
 * Warm-up entries must never be graded: they are the same item every day, and
 * feeding them to FSRS would flatten that item's schedule to nothing. The
 * session grades what it scheduled; the warm-up is what happens first.
 * @param {object} entry a queue entry
 * @returns {boolean} true for a warm-up entry
 */
export const isWarmup = (entry) => entry?.kind === "warmup";
