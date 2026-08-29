import { describe, expect, it } from "vitest";

import { POSITIONS_BY_ITEM, SEEDED_ITEM_IDS } from "@/data/curriculum-positions";
import { CURRICULUM } from "@/data/curriculum";
import { PUZZLES } from "@/data/puzzles";
import {
  getItem,
  getPositionsForItem,
  getStudyableItems,
  hasPositions,
} from "@/lib/curriculum";
import {
  buildSession,
  getMasteredIds,
  summarizeSession,
} from "@/lib/session";
import { CARD_STATE, createCard, RATING, reviewCard } from "@/lib/srs";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 5, 1);

describe("curriculum positions", () => {
  it("references only real puzzle ids", () => {
    const puzzleIds = new Set(PUZZLES.map((puzzle) => puzzle.id));
    for (const positions of Object.values(POSITIONS_BY_ITEM)) {
      for (const position of positions) {
        expect(puzzleIds.has(position.id)).toBe(true);
      }
    }
  });

  it("keys only real curriculum items", () => {
    for (const itemId of SEEDED_ITEM_IDS) {
      expect(getItem(itemId), itemId).not.toBeNull();
    }
  });

  it("gives every seeded item at least one position with a solution", () => {
    for (const itemId of SEEDED_ITEM_IDS) {
      const positions = getPositionsForItem(itemId);
      expect(positions.length).toBeGreaterThan(0);
      for (const position of positions) {
        expect(position.fen).toBeTruthy();
        expect(position.solution.length).toBeGreaterThan(0);
      }
    }
  });

  it("returns an empty array for unseeded items", () => {
    expect(getPositionsForItem("O-14")).toEqual([]);
    expect(hasPositions("O-14")).toBe(false);
    expect(hasPositions("T-01")).toBe(true);
  });
});

describe("getStudyableItems", () => {
  it("offers only items that have positions", () => {
    for (const item of getStudyableItems([])) {
      expect(hasPositions(item.id)).toBe(true);
    }
  });

  it("is not blocked by prerequisites that have no content yet", () => {
    // T-06 requires PF-PROTOCOL, which has no positions. If un-drillable
    // prereqs blocked, nothing would ever unlock.
    const ids = getStudyableItems([]).map((item) => item.id);
    expect(ids).toContain("T-06");
    expect(ids).toContain("T-01");
  });

  it("still enforces prerequisites that do have content", () => {
    // T-08 Skewer requires T-06 Absolute pin, and both are seeded.
    expect(getItem("T-08").prereqs).toContain("T-06");
    expect(getStudyableItems([]).map((item) => item.id)).not.toContain("T-08");
    expect(getStudyableItems(["T-06"]).map((item) => item.id)).toContain(
      "T-08",
    );
  });

  it("excludes items already mastered", () => {
    expect(getStudyableItems(["T-01"]).map((item) => item.id)).not.toContain(
      "T-01",
    );
  });
});

describe("getMasteredIds", () => {
  it("counts only reviewed cards past the stability threshold", () => {
    const cards = [
      { itemId: "a", state: CARD_STATE.REVIEW, stability: 40 },
      { itemId: "b", state: CARD_STATE.REVIEW, stability: 3 },
      { itemId: "c", state: CARD_STATE.RELEARNING, stability: 99 },
    ];
    expect(getMasteredIds(cards)).toEqual(["a"]);
  });

  it("handles an empty deck", () => {
    expect(getMasteredIds()).toEqual([]);
  });
});

describe("buildSession", () => {
  it("offers new items when nothing has been studied", () => {
    const queue = buildSession({ cards: [], now: T0 });

    expect(queue.length).toBeGreaterThan(0);
    for (const entry of queue) {
      expect(entry.kind).toBe("new");
      expect(entry.card).toBeNull();
      expect(entry.positions.length).toBeGreaterThan(0);
    }
  });

  it("puts due reviews before new material", () => {
    const { card } = reviewCard(createCard("T-01", T0 - 30 * DAY), RATING.GOOD, T0 - 30 * DAY);
    const queue = buildSession({ cards: [card], now: T0 });

    expect(queue[0].kind).toBe("review");
    expect(queue[0].item.id).toBe("T-01");
    expect(queue.slice(1).every((entry) => entry.kind === "new")).toBe(true);
  });

  it("orders reviews most-overdue first", () => {
    const mk = (itemId, dueOffsetDays) => ({
      ...createCard(itemId, T0),
      state: CARD_STATE.REVIEW,
      stability: 5,
      difficulty: 5,
      lastReview: T0 - 40 * DAY,
      due: T0 + dueOffsetDays * DAY,
    });

    const queue = buildSession({
      cards: [mk("T-01", -1), mk("T-06", -20), mk("T-11", -5)],
      now: T0,
      includeNew: false,
    });

    expect(queue.map((entry) => entry.item.id)).toEqual([
      "T-06",
      "T-11",
      "T-01",
    ]);
  });

  it("omits cards that are not yet due", () => {
    const future = { ...createCard("T-01", T0), due: T0 + 10 * DAY };
    const queue = buildSession({
      cards: [future],
      now: T0,
      includeNew: false,
    });
    expect(queue).toEqual([]);
  });

  it("respects maxItems", () => {
    expect(buildSession({ cards: [], now: T0, maxItems: 3 })).toHaveLength(3);
  });

  it("does not offer an item that already has a card as new", () => {
    const { card } = reviewCard(createCard("T-01", T0), RATING.GOOD, T0);
    // Card is scheduled into the future, so it is neither due nor new.
    const queue = buildSession({ cards: [card], now: T0 });
    expect(queue.map((entry) => entry.item.id)).not.toContain("T-01");
  });

  it("ignores cards whose curriculum item no longer exists", () => {
    const orphan = { ...createCard("GONE-99", T0), due: T0 - DAY };
    expect(() => buildSession({ cards: [orphan], now: T0 })).not.toThrow();
    expect(
      buildSession({ cards: [orphan], now: T0, includeNew: false }),
    ).toEqual([]);
  });

  it("can suppress new material", () => {
    expect(buildSession({ cards: [], now: T0, includeNew: false })).toEqual([]);
  });
});

describe("summarizeSession", () => {
  it("counts reviews, new items, and total positions", () => {
    const queue = buildSession({ cards: [], now: T0, maxItems: 2 });
    const summary = summarizeSession(queue);

    expect(summary.total).toBe(2);
    expect(summary.fresh).toBe(2);
    expect(summary.review).toBe(0);
    expect(summary.positions).toBe(
      queue.reduce((sum, entry) => sum + entry.positions.length, 0),
    );
  });

  it("handles an empty queue", () => {
    expect(summarizeSession([])).toEqual({
      total: 0,
      review: 0,
      fresh: 0,
      positions: 0,
    });
  });
});

describe("seeded content sanity", () => {
  it("seeds a meaningful slice of the curriculum", () => {
    expect(SEEDED_ITEM_IDS.length).toBeGreaterThanOrEqual(8);
    const totalPositions = SEEDED_ITEM_IDS.reduce(
      (sum, itemId) => sum + getPositionsForItem(itemId).length,
      0,
    );
    expect(totalPositions).toBeGreaterThanOrEqual(30);
  });

  it("seeds items drawn from the real curriculum", () => {
    const curriculumIds = new Set(CURRICULUM.map((item) => item.id));
    for (const itemId of SEEDED_ITEM_IDS) {
      expect(curriculumIds.has(itemId)).toBe(true);
    }
  });
});
