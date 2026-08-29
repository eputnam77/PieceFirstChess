import { describe, expect, it } from "vitest";

import {
  CARD_STATE,
  createCard,
  FSRS_DEFAULT_PARAMETERS,
  getDueCards,
  getRetrievability,
  isDue,
  nextInterval,
  RATING,
  retrievability,
  reviewCard,
  sortByDue,
} from "@/lib/srs";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 0, 1);

/** Review a fresh card `n` times at the interval the scheduler asks for. */
const runSchedule = (ratings, start = T0) => {
  let card = createCard("T-01", start);
  let now = start;
  const intervals = [];

  for (const rating of ratings) {
    const { card: next, log } = reviewCard(card, rating, now);
    intervals.push(log.intervalDays);
    card = next;
    now = card.due;
  }

  return { card, intervals };
};

describe("FSRS constants", () => {
  it("has exactly 21 default parameters", () => {
    expect(FSRS_DEFAULT_PARAMETERS).toHaveLength(21);
  });

  it("satisfies the defining identity R(t = stability) = 0.9", () => {
    // This is what stability *means*. If a parameter index were wrong, the
    // derived FACTOR/DECAY pair would not reproduce 0.9 here.
    for (const stability of [0.5, 1, 7, 30, 365]) {
      expect(retrievability(stability, stability)).toBeCloseTo(0.9, 10);
    }
  });

  it("rejects a parameter vector of the wrong length", () => {
    expect(() => nextInterval(10, { parameters: [1, 2, 3] })).toThrow(
      /21 parameters/,
    );
  });
});

describe("retrievability", () => {
  it("is 1 at zero elapsed time and decreases monotonically", () => {
    expect(retrievability(0, 10)).toBeCloseTo(1, 10);

    let previous = 1;
    for (let days = 1; days <= 400; days += 7) {
      const current = retrievability(days, 10);
      expect(current).toBeLessThan(previous);
      expect(current).toBeGreaterThan(0);
      previous = current;
    }
  });

  it("decays more slowly for a more stable memory", () => {
    expect(retrievability(30, 100)).toBeGreaterThan(retrievability(30, 10));
  });

  it("reports 1 for a never-reviewed card", () => {
    expect(getRetrievability(createCard("T-01", T0), T0 + 90 * DAY)).toBe(1);
  });
});

describe("nextInterval", () => {
  it("grows with stability and stays within bounds", () => {
    expect(nextInterval(1)).toBeGreaterThanOrEqual(1);
    expect(nextInterval(100)).toBeGreaterThan(nextInterval(10));
    expect(nextInterval(1e9)).toBeLessThanOrEqual(36_500);
  });

  it("schedules sooner when a higher retention is demanded", () => {
    const relaxed = nextInterval(50, { desiredRetention: 0.8 });
    const strict = nextInterval(50, { desiredRetention: 0.95 });
    expect(strict).toBeLessThan(relaxed);
  });
});

describe("createCard", () => {
  it("starts NEW, unscheduled, and immediately due", () => {
    const card = createCard("T-15", T0);
    expect(card).toMatchObject({
      itemId: "T-15",
      state: CARD_STATE.NEW,
      stability: null,
      difficulty: null,
      lastReview: null,
      reps: 0,
      lapses: 0,
    });
    expect(isDue(card, T0)).toBe(true);
  });
});

describe("reviewCard — first review", () => {
  it("assigns initial stability from the parameter matching the rating", () => {
    for (const rating of [RATING.AGAIN, RATING.HARD, RATING.GOOD, RATING.EASY]) {
      const { card } = reviewCard(createCard("T-01", T0), rating, T0);
      expect(card.stability).toBeCloseTo(FSRS_DEFAULT_PARAMETERS[rating - 1], 10);
    }
  });

  it("assigns easier difficulty for higher grades", () => {
    const grade = (rating) =>
      reviewCard(createCard("T-01", T0), rating, T0).card.difficulty;

    expect(grade(RATING.AGAIN)).toBeGreaterThan(grade(RATING.HARD));
    expect(grade(RATING.HARD)).toBeGreaterThan(grade(RATING.GOOD));
    expect(grade(RATING.GOOD)).toBeGreaterThan(grade(RATING.EASY));
  });

  it("graduates straight to REVIEW with the default empty learning steps", () => {
    const { card } = reviewCard(createCard("T-01", T0), RATING.GOOD, T0);
    expect(card.state).toBe(CARD_STATE.REVIEW);
  });

  it("stays in LEARNING when learning steps are configured", () => {
    const { card } = reviewCard(createCard("T-01", T0), RATING.GOOD, T0, {
      learningSteps: [1, 10],
    });
    expect(card.state).toBe(CARD_STATE.LEARNING);
  });

  it("rejects an invalid rating", () => {
    expect(() => reviewCard(createCard("T-01", T0), 7, T0)).toThrow(
      /Invalid rating/,
    );
  });
});

describe("reviewCard — scheduling behavior", () => {
  it("expands intervals under repeated GOOD", () => {
    const { intervals } = runSchedule(Array.from({ length: 8 }, () => RATING.GOOD));

    for (let index = 1; index < intervals.length; index++) {
      expect(intervals[index]).toBeGreaterThan(intervals[index - 1]);
    }
    // Eight successful reviews should reach months, not days.
    expect(intervals.at(-1)).toBeGreaterThan(60);
  });

  it("orders next interval EASY >= GOOD >= HARD from the same state", () => {
    const { card } = runSchedule([RATING.GOOD, RATING.GOOD]);
    const later = card.due;

    const after = (rating) => reviewCard(card, rating, later).log.intervalDays;

    expect(after(RATING.EASY)).toBeGreaterThanOrEqual(after(RATING.GOOD));
    expect(after(RATING.GOOD)).toBeGreaterThanOrEqual(after(RATING.HARD));
    expect(after(RATING.HARD)).toBeGreaterThan(after(RATING.AGAIN));
  });

  it("drops stability and counts a lapse on AGAIN", () => {
    const { card } = runSchedule([RATING.GOOD, RATING.GOOD, RATING.GOOD]);
    const { card: lapsed } = reviewCard(card, RATING.AGAIN, card.due);

    expect(lapsed.stability).toBeLessThan(card.stability);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.difficulty).toBeGreaterThan(card.difficulty);
  });

  it("enters RELEARNING on a lapse when relearning steps are configured", () => {
    const { card } = runSchedule([RATING.GOOD, RATING.GOOD]);
    const { card: lapsed } = reviewCard(card, RATING.AGAIN, card.due, {
      relearningSteps: [10],
    });
    expect(lapsed.state).toBe(CARD_STATE.RELEARNING);
  });

  it("keeps a lapsing card on short intervals", () => {
    const alternating = [
      RATING.GOOD,
      RATING.AGAIN,
      RATING.GOOD,
      RATING.AGAIN,
      RATING.GOOD,
      RATING.AGAIN,
    ];
    const { intervals } = runSchedule(alternating);

    // A card you keep forgetting must not drift out to long intervals.
    expect(Math.max(...intervals)).toBeLessThan(30);
  });

  it("does not reduce stability on a same-day non-lapse repeat", () => {
    const { card } = runSchedule([RATING.GOOD]);
    const sameDay = card.lastReview + 3600_000;
    const { card: repeated } = reviewCard(card, RATING.GOOD, sameDay);

    expect(repeated.stability).toBeGreaterThanOrEqual(card.stability);
  });

  it("increments reps and records the review timestamp", () => {
    const { card } = runSchedule([RATING.GOOD, RATING.HARD, RATING.EASY]);
    expect(card.reps).toBe(3);
    expect(card.lastReview).not.toBeNull();
    expect(card.due).toBeGreaterThan(card.lastReview);
  });
});

describe("reviewCard — invariants", () => {
  it("never mutates the input card", () => {
    const card = createCard("T-01", T0);
    const snapshot = structuredClone(card);
    reviewCard(card, RATING.GOOD, T0);
    expect(card).toEqual(snapshot);
  });

  it("is deterministic for identical inputs", () => {
    const card = createCard("T-01", T0);
    expect(reviewCard(card, RATING.GOOD, T0)).toEqual(
      reviewCard(card, RATING.GOOD, T0),
    );
  });

  it("keeps difficulty in [1,10] and stability positive over a long random walk", () => {
    // Deterministic pseudo-random ratings — no dependence on Math.random.
    let seed = 42;
    const nextRating = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return (seed % 4) + 1;
    };

    let card = createCard("T-01", T0);
    let now = T0;

    for (let index = 0; index < 200; index++) {
      const { card: next } = reviewCard(card, nextRating(), now);
      card = next;
      now = card.due;

      expect(card.difficulty).toBeGreaterThanOrEqual(1);
      expect(card.difficulty).toBeLessThanOrEqual(10);
      expect(card.stability).toBeGreaterThanOrEqual(0.001);
      expect(Number.isFinite(card.stability)).toBe(true);
      expect(Number.isFinite(card.due)).toBe(true);
    }
  });
});

describe("queue helpers", () => {
  const build = (itemId, due) => ({ ...createCard(itemId, T0), due });

  it("returns only due cards, soonest first", () => {
    const cards = [
      build("c", T0 + 5 * DAY),
      build("a", T0 - 2 * DAY),
      build("b", T0 - 10 * DAY),
    ];

    expect(getDueCards(cards, T0).map((card) => card.itemId)).toEqual([
      "b",
      "a",
    ]);
  });

  it("sorts without mutating the input array", () => {
    const cards = [build("b", T0 + DAY), build("a", T0)];
    const sorted = sortByDue(cards);

    expect(sorted.map((card) => card.itemId)).toEqual(["a", "b"]);
    expect(cards.map((card) => card.itemId)).toEqual(["b", "a"]);
  });
});
