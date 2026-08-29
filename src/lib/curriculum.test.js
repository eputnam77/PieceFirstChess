import { describe, expect, it } from "vitest";

import { CURRICULUM, PF_STEPS, TIERS } from "@/data/curriculum";
import {
  getCurriculumStats,
  getItem,
  getItemStatus,
  getItemsByPfStep,
  getItemsByTier,
  getUnlockedItems,
  validateCurriculum,
} from "@/lib/curriculum";
import { CARD_STATE, createCard, RATING, reviewCard } from "@/lib/srs";

/** Tier sizes from docs/PF7/LEARNING-SYSTEM.md §1. */
const EXPECTED_TIER_COUNTS = { 0: 1, 1: 42, 2: 16, 3: 18, 4: 8, 5: 14 };
const EXPECTED_TOTAL = 99;

describe("curriculum dataset", () => {
  it("passes structural validation", () => {
    expect(validateCurriculum()).toEqual([]);
  });

  it("contains exactly 99 items", () => {
    expect(CURRICULUM).toHaveLength(EXPECTED_TOTAL);
  });

  it("matches the documented tier counts", () => {
    for (const [tier, count] of Object.entries(EXPECTED_TIER_COUNTS)) {
      expect(getItemsByTier(Number(tier))).toHaveLength(count);
    }

    const summed = Object.values(EXPECTED_TIER_COUNTS).reduce(
      (sum, count) => sum + count,
      0,
    );
    expect(summed).toBe(EXPECTED_TOTAL);
  });

  it("has unique ids", () => {
    const ids = CURRICULUM.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prefixes every id with its tier's prefix", () => {
    for (const item of CURRICULUM) {
      expect(item.id.startsWith(TIERS[item.tier].idPrefix)).toBe(true);
    }
  });

  it("uses only known PieceFirst steps", () => {
    for (const item of CURRICULUM) {
      expect(Object.keys(PF_STEPS)).toContain(item.pfStep);
    }
  });

  it("gives every item a non-empty summary and mastery test", () => {
    for (const item of CURRICULUM) {
      expect(item.summary.length).toBeGreaterThan(10);
      expect(item.mastery.length).toBeGreaterThan(10);
    }
  });

  it("resolves every prerequisite to a real item", () => {
    for (const item of CURRICULUM) {
      for (const prereq of item.prereqs) {
        expect(getItem(prereq), `${item.id} → ${prereq}`).not.toBeNull();
      }
    }
  });

  it("never depends on a later tier", () => {
    for (const item of CURRICULUM) {
      for (const prereq of item.prereqs) {
        expect(getItem(prereq).tier).toBeLessThanOrEqual(item.tier);
      }
    }
  });

  it("has no prerequisite cycles", () => {
    // A cycle makes an item permanently unreachable via getUnlockedItems.
    const resolved = new Set();
    let progressed = true;

    while (progressed) {
      progressed = false;
      for (const item of CURRICULUM) {
        if (resolved.has(item.id)) continue;
        if (item.prereqs.every((prereq) => resolved.has(prereq))) {
          resolved.add(item.id);
          progressed = true;
        }
      }
    }

    expect(resolved.size).toBe(CURRICULUM.length);
  });

  it("starts from exactly one root item", () => {
    const roots = CURRICULUM.filter((item) => item.prereqs.length === 0);
    expect(roots.map((item) => item.id)).toEqual(["PF-PROTOCOL"]);
  });

  it("leaves positions empty for now, as an array", () => {
    for (const item of CURRICULUM) {
      expect(Array.isArray(item.positions)).toBe(true);
    }
  });
});

describe("queries", () => {
  it("looks items up by id", () => {
    expect(getItem("T-15")).toMatchObject({ title: "Deflection", tier: 1 });
    expect(getItem("nope")).toBeNull();
  });

  it("groups by PieceFirst step", () => {
    const forcing = getItemsByPfStep("PF3");
    expect(forcing.length).toBeGreaterThan(20);
    for (const item of forcing) expect(item.pfStep).toBe("PF3");
  });

  it("assigns every mating pattern to PF3 FORCE", () => {
    for (const item of getItemsByTier(2)) {
      expect(item.pfStep).toBe("PF3");
    }
  });
});

describe("getUnlockedItems", () => {
  it("offers only the protocol when nothing is mastered", () => {
    expect(getUnlockedItems([]).map((item) => item.id)).toEqual([
      "PF-PROTOCOL",
    ]);
  });

  it("opens up the first tier once the protocol is mastered", () => {
    const unlocked = getUnlockedItems(["PF-PROTOCOL"]).map((item) => item.id);

    expect(unlocked).toContain("T-01");
    expect(unlocked).toContain("T-06");
    expect(unlocked).not.toContain("PF-PROTOCOL"); // already mastered
    expect(unlocked).not.toContain("T-13"); // needs T-11 and T-12 first
  });

  it("requires every prerequisite, not just one", () => {
    // T-15 Deflection needs both T-06 (pins) and T-17 (overloading).
    const partial = getUnlockedItems(["PF-PROTOCOL", "T-06"]);
    expect(partial.map((item) => item.id)).not.toContain("T-15");

    const complete = getUnlockedItems(["PF-PROTOCOL", "T-06", "T-17"]);
    expect(complete.map((item) => item.id)).toContain("T-15");
  });

  it("becomes empty once everything is mastered", () => {
    const allIds = CURRICULUM.map((item) => item.id);
    expect(getUnlockedItems(allIds)).toEqual([]);
  });
});

describe("progress reporting", () => {
  it("classifies card status by state and stability", () => {
    expect(getItemStatus(undefined)).toBe("new");
    expect(getItemStatus(createCard("T-01"))).toBe("new");
    expect(getItemStatus({ state: CARD_STATE.RELEARNING, stability: 99 })).toBe(
      "learning",
    );
    expect(getItemStatus({ state: CARD_STATE.REVIEW, stability: 5 })).toBe(
      "young",
    );
    expect(getItemStatus({ state: CARD_STATE.REVIEW, stability: 40 })).toBe(
      "mature",
    );
  });

  it("counts everything as new with no cards", () => {
    const stats = getCurriculumStats();
    expect(stats.total).toMatchObject({ new: EXPECTED_TOTAL, total: EXPECTED_TOTAL });
    expect(stats.tiers[1].total).toBe(EXPECTED_TIER_COUNTS[1]);
  });

  it("moves an item out of new once it is reviewed", () => {
    const start = Date.UTC(2026, 0, 1);
    let card = createCard("T-01", start);
    let now = start;

    // Several successful reviews should carry it past the maturity threshold.
    for (let index = 0; index < 5; index++) {
      const result = reviewCard(card, RATING.GOOD, now);
      card = result.card;
      now = card.due;
    }

    const stats = getCurriculumStats({ "T-01": card });
    expect(stats.total.new).toBe(EXPECTED_TOTAL - 1);
    expect(stats.total.mature).toBe(1);
    expect(stats.tiers[1].mature).toBe(1);
  });
});
