/**
 * Simulate the adaptive difficulty staircase before trusting it (D4).
 *
 * The plan of record makes this a shipping condition, not a nicety, because
 * the rule this replaced was wrong in a way nobody noticed for two drafts:
 * PRD §81.3's `+15 correct / −30 miss` was claimed to converge to 80–85% and
 * actually has zero expected drift at 66.7%. A controller nobody has run is a
 * controller nobody has checked.
 *
 * What is simulated: a logistic learner of a given ability answers positions
 * drawn from the band, and the staircase in `src/pf/band.js` — the real one,
 * imported, not a copy — walks in response. The measured accuracy should sit
 * at the theoretical fixed point of a `RUN_TO_ADVANCE`-up / 1-down rule,
 * `p ** RUN_TO_ADVANCE = 0.5`.
 *
 *   node --import ./scripts/register-aliases.js scripts/simulate-band.js
 *   npm run simulate:band
 */

import {
  BAND_WIDTH,
  DEFAULT_BAND,
  MIN_BAND,
  RUN_TO_ADVANCE,
  STRETCH_EVERY,
  STRETCH_OFFSET,
  initialBand,
  nextBandState,
  solvedStretch,
} from "../src/pf/band.js";

/**
 * Ability spread of the logistic learner, in rating points.
 *
 * The distance over which success probability goes from ~73% to ~27%. 120 is
 * a deliberately ordinary guess: the fixed point of a transformed staircase
 * does not depend on it, which is most of why this rule was chosen over one
 * that needs a fitted model.
 */
const SPREAD = 120;

const SEEDS = 200;
const REPS = 4000;

/** xorshift32 — small, seeded, and reproducible across machines. */
const rng = (seed) => {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4_294_967_296;
  };
};

/**
 * One learner, one run.
 * @param {object} options run inputs
 * @param {number} options.ability the learner's true level in rating points
 * @param {number} options.seed RNG seed
 * @param {boolean} options.stretch whether one rep in eight is a stretch
 * @returns {{accuracy: number, band: number}} counted accuracy and mean band
 *   over the second half of the run
 */
const simulate = ({ ability, seed, stretch }) => {
  const random = rng(seed);
  let state = initialBand();
  let correct = 0;
  let counted = 0;
  let bandSum = 0;
  let bandCount = 0;

  for (let rep = 1; rep <= REPS; rep++) {
    const isStretch = stretch && rep % STRETCH_EVERY === 0;
    // Selection is a window, not a point: a position is drawn from anywhere
    // in [band − 100, band + 100], which is what `selectInBand` does.
    const jitter = (random() * 2 - 1) * BAND_WIDTH;
    const shown = state.band + (isStretch ? STRETCH_OFFSET : 0) + jitter;
    const solved = random() < 1 / (1 + Math.exp((shown - ability) / SPREAD));

    if (isStretch) {
      // Scored separately and excluded from the accuracy figure, because the
      // app chose to show it above band (§81.4).
      if (solved) state = solvedStretch(state);
    } else {
      counted++;
      if (solved) correct++;
      state = nextBandState(state, solved);
    }

    if (rep > REPS / 2) {
      bandSum += state.band;
      bandCount++;
    }
  }

  return { accuracy: correct / counted, band: bandSum / bandCount };
};

/** Reps until the band first reaches its asymptote, from a cold start. */
const convergence = (ability) => {
  const target = Math.max(MIN_BAND, ability - 200);
  const reached = [];

  for (let seed = 1; seed <= 300; seed++) {
    const random = rng(seed * 104_729);
    let state = initialBand();
    let at = 600;
    for (let rep = 0; rep < 600; rep++) {
      const shown = state.band + (random() * 2 - 1) * BAND_WIDTH;
      state = nextBandState(
        state,
        random() < 1 / (1 + Math.exp((shown - ability) / SPREAD)),
      );
      if (Math.abs(state.band - target) <= 50) {
        at = rep;
        break;
      }
    }
    reached.push(at);
  }

  reached.sort((a, b) => a - b);
  return { median: reached[150], p90: reached[270] };
};

const mean = (values) => values.reduce((a, b) => a + b, 0) / values.length;

const run = ({ ability, stretch }) => {
  const runs = Array.from({ length: SEEDS }, (_, index) =>
    simulate({ ability, seed: (index + 1) * 7919, stretch }),
  );
  return {
    accuracy: mean(runs.map((r) => r.accuracy)),
    band: mean(runs.map((r) => r.band)),
  };
};

const target = 0.5 ** (1 / RUN_TO_ADVANCE);

console.log(
  `\nTransformed staircase: up one step after ${RUN_TO_ADVANCE} consecutive correct, down on any miss.`,
);
console.log(
  `Theoretical fixed point 0.5^(1/${RUN_TO_ADVANCE}) = ${target.toFixed(4)}\n`,
);
console.log(
  `${SEEDS} seeds x ${REPS} reps, logistic learner (spread ${SPREAD}), start band ${DEFAULT_BAND}\n`,
);
console.log("ability  stretch  accuracy  mean band");

for (const ability of [1600, 1300, 1000]) {
  for (const stretch of [false, true]) {
    const { accuracy, band } = run({ ability, stretch });
    console.log(
      `${String(ability).padStart(7)}  ${(stretch ? `1 in ${STRETCH_EVERY}` : "off").padStart(7)}  ${accuracy.toFixed(3).padStart(8)}  ${Math.round(band).toString().padStart(9)}`,
    );
  }
}

console.log("\nReps to reach the band from a cold start:");
for (const ability of [1600, 1300, 1000]) {
  const { median, p90 } = convergence(ability);
  console.log(
    `${String(ability).padStart(7)}  median ${String(median).padStart(3)}  p90 ${String(p90).padStart(3)}`,
  );
}

console.log(
  `\nNote: the corpus bottoms out at rating 801 and the band floors at ${MIN_BAND}, so an
ability much below ~1150 cannot be served down to its own target. That is a
content limit, not a controller fault.\n`,
);
