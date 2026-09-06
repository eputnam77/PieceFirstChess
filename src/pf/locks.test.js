/**
 * The lock sentences have to be true, not merely present — a dashboard that
 * names the wrong key is worse than one that names none.
 */

import { describe, expect, it } from "vitest";

import { CURRICULUM } from "@/data/curriculum";
import { getItem, getStudyableItems, hasPositions } from "@/lib/curriculum";
import { getLearnedIds } from "@/lib/session";
import { learnedIdSet, lockFor, lockMap } from "@pf/locks.js";

/** A card in the state the gate calls "learned": one graded rep. */
const learnedCard = (itemId) => ({
  itemId,
  state: "review",
  stability: 1,
  reps: 1,
});

const cardsFor = (...ids) =>
  Object.fromEntries(ids.map((id) => [id, learnedCard(id)]));

describe("what counts as locked", () => {
  it("agrees exactly with the gate the session builder uses", () => {
    // The whole point: one predicate, read twice, never restated.
    for (const cards of [
      {},
      cardsFor("PF-PROTOCOL"),
      cardsFor("PF-PROTOCOL", "T-01", "T-06", "E-04"),
    ]) {
      const { locks } = lockMap(cards);
      const learned = new Set(getLearnedIds(Object.values(cards)));
      const studyable = new Set(
        getStudyableItems([...learned]).map((item) => item.id),
      );

      for (const item of CURRICULUM) {
        if (learned.has(item.id) || !hasPositions(item.id)) continue;
        expect(locks.has(item.id)).toBe(!studyable.has(item.id));
      }
    }
  });

  it("opens exactly one item on a fresh install — the protocol", () => {
    const { locks, openCount } = lockMap({});
    expect(openCount).toBe(1);
    expect(locks.has("PF-PROTOCOL")).toBe(false);
  });

  it("never locks an item the learner has already started", () => {
    // A prerequisite cannot be un-learned, but the guard is what makes the
    // dashboard safe to render off a partially loaded card set.
    const lock = lockFor(getItem("T-15"), learnedIdSet(cardsFor("T-15")));
    expect(lock).toBeNull();
  });

  it("counts a prerequisite the app cannot teach as no obstacle", () => {
    // Same carve-out as getStudyableItems. Every item has content today, so
    // this asserts the rule rather than a current gap.
    const withoutContent = CURRICULUM.filter(
      (item) => !hasPositions(item.id),
    ).length;
    expect(withoutContent).toBe(0);
  });
});

describe("the sentence", () => {
  const { locks } = lockMap({});

  it("names a key for every locked item", () => {
    expect(locks.size).toBe(CURRICULUM.length - 1);
    for (const lock of locks.values()) {
      expect(lock.sentence.startsWith("Unlocks after ")).toBe(true);
      expect(lock.blockers.length).toBeGreaterThan(0);
    }
  });

  it("names blockers that really are this item's own prerequisites", () => {
    for (const [id, lock] of locks) {
      const item = getItem(id);
      for (const blocker of lock.blockers) {
        expect(item.prereqs).toContain(blocker);
        expect(lock.sentence).toContain(blocker);
      }
    }
  });

  it("points at something the learner can actually start", () => {
    // "start with X" is the only actionable part of a deep chain, so X must be
    // open — otherwise the sentence sends the learner into another lock.
    const open = new Set(getStudyableItems([]).map((item) => item.id));
    for (const lock of locks.values()) {
      expect(open.has(lock.startWith)).toBe(true);
    }
  });

  it("says 'one session away' only when one item stands in the way", () => {
    for (const lock of locks.values()) {
      expect(lock.sentence.includes("one session away")).toBe(
        lock.distance === 1,
      );
      if (lock.distance > 1) {
        expect(lock.sentence).toContain(`${lock.distance} items away`);
      }
    }
  });

  it("shortens as the chain is cleared", () => {
    const before = lockFor(getItem("T-15"), learnedIdSet({}));
    const after = lockFor(
      getItem("T-15"),
      learnedIdSet(cardsFor("PF-PROTOCOL")),
    );
    expect(after.distance).toBeLessThan(before.distance);
    expect(after.startWith).not.toBe(before.startWith);
  });

  it("reads as a fact about the curriculum, never about the learner", () => {
    // PRD §81.5: the only permitted meaning is "Z depends on Y, and Y is not
    // learned yet".
    const forbidden = /\b(you are not|not ready|too hard|too advanced)\b/i;
    for (const lock of locks.values()) {
      expect(forbidden.test(lock.sentence)).toBe(false);
    }
  });
});

describe("the distance", () => {
  it("is the number of items still to study, counted without duplicates", () => {
    // T-15 has two prerequisites that share an ancestor; a naive sum would
    // double-count it.
    const lock = lockFor(
      getItem("T-15"),
      learnedIdSet(cardsFor("PF-PROTOCOL")),
    );
    expect(lock.blockers).toEqual(["T-06", "T-17"]);
    expect(lock.distance).toBe(2);
  });

  it("falls to zero — no lock at all — once the chain is learned", () => {
    const chain = ["PF-PROTOCOL", "T-06", "T-17"];
    expect(
      lockFor(getItem("T-15"), learnedIdSet(cardsFor(...chain))),
    ).toBeNull();
  });
});
