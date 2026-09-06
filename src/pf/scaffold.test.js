import { beforeEach, describe, expect, it, vi } from "vitest";

import { CARD_STATE } from "@/lib/srs";

const events = [];

vi.mock("@/lib/srs-db", () => ({
  putEvent: vi.fn(async (event) => {
    events.push(event);
    return events.length;
  }),
  getEvents: vi.fn(async ({ source } = {}) =>
    events.filter((event) => !source || event.source === source),
  ),
}));

const {
  MATURE_STABILITY_DAYS,
  PASSES_FOR_STAGE_4,
  PERFORMANCE_WINDOW,
  readUnlabelledPerformance,
  recordUnlabelledRep,
  scaffoldStage,
  showsAnswers,
  showsHints,
  showsSteps,
} = await import("@pf/scaffold.js");

const card = (state, stability = 0) => ({ state, stability });

beforeEach(() => {
  events.length = 0;
});

describe("scaffoldStage", () => {
  it("starts at stage 1 with no card at all", () => {
    expect(scaffoldStage(null)).toBe(1);
    expect(scaffoldStage(card(CARD_STATE.NEW))).toBe(1);
  });

  it("drops the filled-in answers once the card is learning", () => {
    expect(scaffoldStage(card(CARD_STATE.LEARNING))).toBe(2);
    expect(scaffoldStage(card(CARD_STATE.RELEARNING))).toBe(2);
  });

  it("drops the hints in review", () => {
    expect(scaffoldStage(card(CARD_STATE.REVIEW, 3))).toBe(3);
    expect(scaffoldStage(card(CARD_STATE.REVIEW, 40))).toBe(3);
  });

  it("only removes the steps entirely on demonstrated performance (D7)", () => {
    const mature = card(CARD_STATE.REVIEW, MATURE_STABILITY_DAYS);
    // Stability alone is not enough — that is the whole of D7.
    expect(scaffoldStage(mature, { passes: PASSES_FOR_STAGE_4 - 1 })).toBe(3);
    expect(scaffoldStage(mature, { passes: PASSES_FOR_STAGE_4 })).toBe(4);

    // …and performance alone is not enough either.
    const young = card(CARD_STATE.REVIEW, MATURE_STABILITY_DAYS - 1);
    expect(scaffoldStage(young, { passes: 10 })).toBe(3);
  });

  it("puts the hints back when the misses outweigh the passes", () => {
    const mature = card(CARD_STATE.REVIEW, 30);
    expect(scaffoldStage(mature, { passes: 5, misses: 1 })).toBe(4);
    expect(scaffoldStage(mature, { passes: 1, misses: 3 })).toBe(2);
  });

  it("says what each stage shows", () => {
    expect([1, 2, 3, 4].map(showsAnswers)).toEqual([true, false, false, false]);
    expect([1, 2, 3, 4].map(showsHints)).toEqual([true, true, false, false]);
    expect([1, 2, 3, 4].map(showsSteps)).toEqual([true, true, true, false]);
  });
});

describe("recordUnlabelledRep", () => {
  it("ignores reps that still had the scaffold up", async () => {
    expect(await recordUnlabelledRep({ stage: 1, outcome: "solved" })).toBeNull();
    expect(await recordUnlabelledRep({ stage: 2, outcome: "solved" })).toBeNull();
    expect(events).toHaveLength(0);
  });

  it("records passes and misses from stage 3 up", async () => {
    await recordUnlabelledRep({ stage: 3, outcome: "solved" });
    await recordUnlabelledRep({ stage: 4, outcome: "revealed" });
    expect(await readUnlabelledPerformance()).toEqual({
      passes: 1,
      misses: 1,
    });
  });

  it("reads only the recent window, so the counters keep moving", async () => {
    for (let index = 0; index < PERFORMANCE_WINDOW + 5; index++) {
      await recordUnlabelledRep({ stage: 4, outcome: "solved" });
    }
    await recordUnlabelledRep({ stage: 4, outcome: "wrong" });

    const { passes, misses } = await readUnlabelledPerformance();
    expect(passes + misses).toBe(PERFORMANCE_WINDOW);
    expect(misses).toBe(1);
  });
});
