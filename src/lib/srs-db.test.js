import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import {
  clearBands,
  clearCards,
  getAllCards,
  getBands,
  getCard,
  putBand,
  putCard,
  putCards,
} from "@/lib/srs-db";
import { createCard, RATING, reviewCard } from "@/lib/srs";

const T0 = Date.UTC(2026, 5, 1);

describe("srs-db", () => {
  beforeEach(async () => {
    await clearCards();
  });

  it("starts empty", async () => {
    expect(await getAllCards()).toEqual([]);
  });

  it("returns null for an unknown card", async () => {
    expect(await getCard("T-01")).toBeNull();
  });

  it("round-trips a card", async () => {
    const { card } = reviewCard(createCard("T-01", T0), RATING.GOOD, T0);
    await putCard(card);

    expect(await getCard("T-01")).toEqual(card);
  });

  it("replaces on repeat writes rather than duplicating", async () => {
    const first = reviewCard(createCard("T-01", T0), RATING.GOOD, T0).card;
    await putCard(first);

    const second = reviewCard(first, RATING.EASY, first.due).card;
    await putCard(second);

    const all = await getAllCards();
    expect(all).toHaveLength(1);
    expect(all[0].reps).toBe(2);
    expect(all[0].due).toBe(second.due);
  });

  it("writes many cards in one transaction", async () => {
    const cards = ["T-01", "T-06", "T-08"].map(
      (itemId) => reviewCard(createCard(itemId, T0), RATING.GOOD, T0).card,
    );
    await putCards(cards);

    const stored = await getAllCards();
    expect(stored.map((card) => card.itemId).sort()).toEqual([
      "T-01",
      "T-06",
      "T-08",
    ]);
  });

  it("preserves the scheduling fields that matter", async () => {
    const { card } = reviewCard(createCard("T-15", T0), RATING.HARD, T0);
    await putCard(card);

    const stored = await getCard("T-15");
    expect(stored.stability).toBeCloseTo(card.stability, 10);
    expect(stored.difficulty).toBeCloseTo(card.difficulty, 10);
    expect(stored.due).toBe(card.due);
    expect(stored.state).toBe(card.state);
    expect(stored.lapses).toBe(card.lapses);
  });

  it("clears everything", async () => {
    await putCard(reviewCard(createCard("T-01", T0), RATING.GOOD, T0).card);
    await clearCards();
    expect(await getAllCards()).toEqual([]);
  });
});

describe("the v4 bands store", () => {
  beforeEach(async () => {
    await clearBands();
  });

  it("starts empty, which the band module reads as 'no band yet'", async () => {
    expect(await getBands()).toEqual([]);
  });

  it("round-trips one step's staircase state", async () => {
    await putBand({ pfStep: "PF3", band: 1350, run: 2, reps: 40 });
    expect(await getBands()).toEqual([
      { pfStep: "PF3", band: 1350, run: 2, reps: 40 },
    ]);
  });

  it("keeps one row per step rather than a history", async () => {
    await putBand({ pfStep: "PF3", band: 1200, run: 0, reps: 1 });
    await putBand({ pfStep: "PF3", band: 1250, run: 0, reps: 5 });
    await putBand({ pfStep: "PF6", band: 1100, run: 1, reps: 3 });

    const rows = await getBands();
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.pfStep === "PF3").band).toBe(1250);
  });

  it("clears without touching the cards beside it", async () => {
    await putCard(createCard("T-01", T0));
    await putBand({ pfStep: "PF3", band: 1250, run: 0, reps: 5 });
    await clearBands();

    expect(await getBands()).toEqual([]);
    expect(await getAllCards()).toHaveLength(1);
  });
});
