/**
 * The staircase has to converge where it claims to, and a stretch rep has to
 * cost nothing. Both are asserted here rather than trusted, because the rule
 * this replaced was arithmetically wrong and survived two drafts of a PRD.
 */

import { describe, expect, it } from "vitest";

import {
  BAND_WIDTH,
  DEFAULT_BAND,
  MAX_BAND,
  MIN_BAND,
  MIN_REPS_TO_SHOW,
  RUN_TO_ADVANCE,
  STEP_POINTS,
  STRETCH_EVERY,
  STRETCH_OFFSET,
  applyStretch,
  displayBand,
  initialBand,
  nextBandState,
  selectInBand,
  solvedStretch,
} from "@pf/band";

/** n correct answers in a row, from a given state. */
const runOf = (count, state = initialBand()) => {
  let current = state;
  for (let index = 0; index < count; index++) {
    current = nextBandState(current, true);
  }
  return current;
};

describe("the staircase", () => {
  it("holds still until the run is complete", () => {
    for (let count = 1; count < RUN_TO_ADVANCE; count++) {
      expect(runOf(count).band).toBe(DEFAULT_BAND);
    }
    expect(runOf(RUN_TO_ADVANCE).band).toBe(DEFAULT_BAND + STEP_POINTS);
  });

  it("drops a step on any miss, however good the run was", () => {
    const almost = runOf(RUN_TO_ADVANCE - 1);
    expect(nextBandState(almost, false).band).toBe(DEFAULT_BAND - STEP_POINTS);
  });

  it("clears the run counter going down as well as going up", () => {
    // Without this the learner could miss, then get one right, and rise —
    // which is what makes an up-down rule converge at 50% instead of 84%.
    const missed = nextBandState(runOf(RUN_TO_ADVANCE - 1), false);
    expect(missed.run).toBe(0);
    expect(runOf(RUN_TO_ADVANCE - 1, missed).band).toBe(missed.band);
  });

  it("counts every graded rep, up or down", () => {
    expect(runOf(6).reps).toBe(6);
    expect(nextBandState(runOf(6), false).reps).toBe(7);
  });

  it("stays inside the corpus it has to select from", () => {
    let low = { band: MIN_BAND, run: 0, reps: 0 };
    for (let index = 0; index < 20; index++) low = nextBandState(low, false);
    expect(low.band).toBe(MIN_BAND);

    let high = { band: MAX_BAND, run: 0, reps: 0 };
    for (let index = 0; index < 100; index++) high = nextBandState(high, true);
    expect(high.band).toBe(MAX_BAND);
  });
});

describe("convergence, simulated", () => {
  // The same simulation `scripts/simulate-band.js` prints, seeded and shrunk
  // so it runs in milliseconds. If someone changes RUN_TO_ADVANCE, this moves
  // with it: the target is derived, not hard-coded.
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

  const measure = (ability, seed) => {
    const random = rng(seed);
    let state = initialBand();
    let correct = 0;
    for (let rep = 0; rep < 3000; rep++) {
      const shown = state.band + (random() * 2 - 1) * BAND_WIDTH;
      const solved = random() < 1 / (1 + Math.exp((shown - ability) / 120));
      if (solved) correct++;
      state = nextBandState(state, solved);
    }
    return { accuracy: correct / 3000, band: state.band };
  };

  it("settles at 0.5^(1/run), the fixed point of the rule", () => {
    const target = 0.5 ** (1 / RUN_TO_ADVANCE);
    for (const ability of [1300, 1600]) {
      const runs = Array.from({ length: 40 }, (_, index) =>
        measure(ability, (index + 1) * 7919),
      );
      const mean =
        runs.reduce((sum, run) => sum + run.accuracy, 0) / runs.length;
      expect(Math.abs(mean - target)).toBeLessThan(0.02);
    }
  });

  it("tracks the learner, so two abilities do not land on one band", () => {
    const low = measure(1300, 7919).band;
    const high = measure(1600, 7919).band;
    expect(high).toBeGreaterThan(low);
  });

  it("cannot serve a learner below the corpus floor, and does not pretend to", () => {
    // Documented limit, asserted so it is not mistaken for a bug later: the
    // imported puzzles bottom out at 801, so a weak learner sits above their
    // own target no matter what the controller does.
    const { accuracy, band } = measure(700, 7919);
    expect(band).toBe(MIN_BAND);
    expect(accuracy).toBeLessThan(0.5 ** (1 / RUN_TO_ADVANCE));
  });
});

describe("the stretch rep", () => {
  it("raises the ceiling when it is solved", () => {
    expect(solvedStretch(initialBand()).band).toBe(DEFAULT_BAND + STEP_POINTS);
  });

  it("does not bank progress toward the next ordinary step", () => {
    // Otherwise a solved stretch would both raise the band and leave the run
    // three-quarters full, which is two promotions for one answer.
    expect(solvedStretch(runOf(RUN_TO_ADVANCE - 1)).run).toBe(0);
  });
});

// ── Selection ──────────────────────────────────────────────────────────────

const rated = (id, rating) => ({ id, type: "puzzle", rating });
const unrated = (id) => ({ id, type: "endgame" });

describe("selecting in band", () => {
  const pool = [
    rated("a", 800),
    rated("b", 1150),
    rated("c", 1200),
    rated("d", 1250),
    rated("e", 1600),
    rated("f", 1850),
  ];

  it("shows only what is within the window", () => {
    const chosen = selectInBand(pool, { band: 1200, limit: 3 });
    for (const position of chosen) {
      expect(Math.abs(position.rating - 1200)).toBeLessThanOrEqual(BAND_WIDTH);
    }
  });

  it("keeps unrated positions eligible whatever the band says", () => {
    // They are the majority of the deck — authored drills, endgames, tabiya.
    // Filtering them out would delete most of the curriculum.
    const mixed = [rated("a", 1850), unrated("x"), unrated("y"), unrated("z")];
    const chosen = selectInBand(mixed, { band: 900, limit: 3 });
    expect(chosen.map((position) => position.id)).toEqual(["x", "y", "z"]);
  });

  it("tops up with the nearest rather than starving the sitting", () => {
    const sparse = [rated("a", 800), rated("b", 1600), rated("c", 1850)];
    const chosen = selectInBand(sparse, { band: 1200, limit: 2 });
    expect(chosen).toHaveLength(2);
    expect(chosen.map((position) => position.id)).toContain("b");
  });

  it("still rotates, so a second review is not the same three boards", () => {
    const wide = Array.from({ length: 9 }, (_, index) =>
      rated(`p${index}`, 1200),
    );
    const first = selectInBand(wide, { band: 1200, reps: 0, limit: 3 });
    const second = selectInBand(wide, { band: 1200, reps: 1, limit: 3 });
    expect(first.map((p) => p.id)).not.toEqual(second.map((p) => p.id));
  });

  it("returns everything when the item has no more than the limit", () => {
    const two = [rated("a", 1850), rated("b", 800)];
    expect(selectInBand(two, { band: 1200, limit: 3 })).toEqual(two);
  });
});

describe("placing the stretch reps", () => {
  const entry = (id, pfStep, count) => ({
    item: { id, pfStep },
    positions: Array.from({ length: count }, (_, index) =>
      rated(`${id}-${index}`, 1200),
    ),
  });

  const pool = [
    rated("hard", 1200 + STRETCH_OFFSET),
    rated("harder", 1800),
    rated("easy", 900),
  ];

  const place = (entries, bands = { PF3: { band: 1200 } }) =>
    applyStretch(entries, { bands, poolFor: () => pool });

  it("marks one position in eight, counted across the whole queue", () => {
    const entries = place([
      entry("T-01", "PF3", 3),
      entry("T-02", "PF3", 3),
      entry("T-03", "PF3", 3),
    ]);
    const flagged = entries
      .flatMap((one) => one.positions)
      .filter((position) => position.stretch);
    expect(flagged).toHaveLength(Math.floor(9 / STRETCH_EVERY));
  });

  it("draws it from above the band, never inside it", () => {
    const [only] = place([entry("T-01", "PF3", STRETCH_EVERY)]);
    const stretch = only.positions.find((position) => position.stretch);
    expect(stretch.rating).toBeGreaterThanOrEqual(1200 + STRETCH_OFFSET);
  });

  it("marks nothing for a step with no band yet", () => {
    const entries = place([entry("T-01", "PF6", STRETCH_EVERY)]);
    expect(entries[0].positions.some((position) => position.stretch)).toBe(
      false,
    );
  });

  it("leaves the warm-up alone — it is never graded", () => {
    const warm = { ...entry("PF-PROTOCOL", "PF3", STRETCH_EVERY), warmup: {} };
    const entries = place([warm]);
    expect(entries[0].positions.some((position) => position.stretch)).toBe(
      false,
    );
  });

  it("does nothing when the item has nothing hard enough", () => {
    const entries = applyStretch([entry("T-01", "PF3", STRETCH_EVERY)], {
      bands: { PF3: { band: 1800 } },
      poolFor: () => pool,
    });
    expect(entries[0].positions.some((position) => position.stretch)).toBe(
      false,
    );
  });
});

describe("what the learner is shown", () => {
  it("says nothing until the number means something", () => {
    expect(displayBand({ band: 1350, reps: MIN_REPS_TO_SHOW - 1 })).toBeNull();
    expect(displayBand({ band: 1350, reps: MIN_REPS_TO_SHOW })).toBe(1350);
    expect(displayBand(null)).toBeNull();
  });
});
