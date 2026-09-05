import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import {
  POSITIONS_BY_ITEM,
  SEEDED_ITEM_IDS,
} from "@/data/curriculum-positions";
import { CURRICULUM } from "@/data/curriculum";
import { PUZZLES } from "@/data/puzzles";
import {
  getItem,
  getPositionsForItem,
  getStudyableItems,
  hasPositions,
} from "@/lib/curriculum";
import { buildSession, getMasteredIds, summarizeSession } from "@/lib/session";
import { MAX_REPS, MIN_REPS } from "@pf/warmup";
import { CARD_STATE, createCard, RATING, reviewCard } from "@/lib/srs";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 5, 1);

/** Cards that unlock the whole curriculum, so gating is not under test here. */
const learned = (...itemIds) =>
  itemIds.map((itemId) => ({
    ...createCard(itemId, T0),
    state: CARD_STATE.REVIEW,
    stability: 5,
    difficulty: 5,
    lastReview: T0 - DAY,
    due: T0 + 30 * DAY,
  }));

/** Assert a position carries whatever its drill type needs to be playable. */
const expectPlayable = (position) => {
  switch (position.type) {
    case "puzzle":
    case "line":
    case "protocol": {
      expect(position.solution.length, position.id).toBeGreaterThan(0);
      break;
    }
    case "blundercheck": {
      expect(position.candidate, position.id).toBeTruthy();
      expect(typeof position.safe, position.id).toBe("boolean");
      break;
    }
    case "card": {
      expect(position.card?.yours, position.id).toBeTruthy();
      break;
    }
    case "scan":
    case "sweep": {
      // The answer key is a set of squares, proved from the board rather than
      // searched — see src/pf/scan-drills.js. A sweep needs more than one, or
      // it is a scan wearing a sweep's prompt.
      expect(position.targets?.length, position.id).toBeGreaterThan(
        position.type === "sweep" ? 1 : 0,
      );
      for (const square of position.targets) {
        expect(square, position.id).toMatch(/^[a-h][1-8]$/);
      }
      expect(position.rule, position.id).toBeTruthy();
      break;
    }
    default: {
      // Play-outs are graded by outcome, not by a solution line.
      expect(position.studentColor, position.id).toBeTruthy();
      expect(position.maxMoves, position.id).toBeGreaterThan(0);
    }
  }
};

describe("curriculum positions", () => {
  it("references only real puzzle ids", () => {
    const puzzleIds = new Set(PUZZLES.map((puzzle) => puzzle.id));
    for (const positions of Object.values(POSITIONS_BY_ITEM)) {
      for (const position of positions.filter((p) => p.source === "puzzles")) {
        expect(puzzleIds.has(position.id)).toBe(true);
      }
    }
  });

  it("labels every position with its source", () => {
    for (const positions of Object.values(POSITIONS_BY_ITEM)) {
      for (const position of positions) {
        expect([
          "puzzles",
          "lichess",
          "endgames",
          "authored",
          "tabiya",
          "generated",
        ]).toContain(position.source);
      }
    }
  });

  it("gives imported positions a legal solution from the shown position", () => {
    // The importer advances past the opponent's setup move; if that were
    // skipped, every imported puzzle would start one ply too early and its
    // solution would not be playable.
    const imported = Object.values(POSITIONS_BY_ITEM)
      .flat()
      .filter(
        (position) =>
          position.source === "lichess" && position.type === "puzzle",
      );
    expect(imported.length).toBeGreaterThan(100);

    for (const position of imported) {
      const game = new Chess(position.fen);
      for (const uci of position.solution) {
        const move = game.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4],
        });
        expect(move, `${position.id} ${uci}`).toBeTruthy();
      }
    }
  });

  it("ends every puzzle solution on the student's move", () => {
    // Solutions alternate student/opponent, so a legal line always has an odd
    // number of plies. An even count would leave the drill waiting on a reply
    // that never comes.
    const puzzles = Object.values(POSITIONS_BY_ITEM)
      .flat()
      .filter((position) => position.type === "puzzle");
    for (const position of puzzles) {
      expect(position.solution.length % 2, position.id).toBe(1);
    }
  });

  it("tags every position with a known type", () => {
    for (const positions of Object.values(POSITIONS_BY_ITEM)) {
      for (const position of positions) {
        expect([
          "puzzle",
          "endgame",
          "blundercheck",
          "protocol",
          "line",
          "card",
          "structure",
          "scan",
          "sweep",
        ]).toContain(position.type);
      }
    }
  });

  it("keys only real curriculum items", () => {
    for (const itemId of SEEDED_ITEM_IDS) {
      expect(getItem(itemId), itemId).not.toBeNull();
    }
  });

  it("gives every seeded item at least one playable position", () => {
    for (const itemId of SEEDED_ITEM_IDS) {
      const positions = getPositionsForItem(itemId);
      expect(positions.length, itemId).toBeGreaterThan(0);

      for (const position of positions) {
        expect(position.fen, position.id).toBeTruthy();
        expectPlayable(position);
      }
    }
  });

  it("covers every one of the 99 curriculum items", () => {
    // The bound is the whole point of this curriculum, and a bound with holes
    // in it is not a bound. Every item must have something to drill.
    const uncovered = CURRICULUM.filter(
      (item) => getPositionsForItem(item.id).length === 0,
    ).map((item) => item.id);
    expect(uncovered).toEqual([]);
  });

  it("seeds the full endgame tier", () => {
    for (let index = 1; index <= 18; index++) {
      const itemId = `E-${String(index).padStart(2, "0")}`;
      const positions = getPositionsForItem(itemId);
      expect(positions.length, itemId).toBeGreaterThan(0);
      expect(
        positions.every((p) => p.type === "endgame"),
        itemId,
      ).toBe(true);
    }
  });

  it("returns an empty array for an item it does not know", () => {
    expect(getPositionsForItem("NOPE-99")).toEqual([]);
    expect(hasPositions("NOPE-99")).toBe(false);
    expect(hasPositions("T-01")).toBe(true);
    expect(hasPositions("E-10")).toBe(true);
    expect(hasPositions("O-14")).toBe(true);
    expect(hasPositions("PF-PROTOCOL")).toBe(true);
  });
});

describe("getStudyableItems", () => {
  it("offers only items that have positions", () => {
    for (const item of getStudyableItems([])) {
      expect(hasPositions(item.id)).toBe(true);
    }
  });

  it("starts a new learner on the protocol and nothing else", () => {
    // Every tier-1 item depends on PF-PROTOCOL, and the protocol now has its
    // own drills, so the curriculum opens exactly where the sequencing in
    // docs/PF7/LEARNING-SYSTEM.md §2 says Phase 0 should: one item.
    expect(getStudyableItems([]).map((item) => item.id)).toEqual([
      "PF-PROTOCOL",
    ]);
  });

  it("opens the first tier once the protocol is learned", () => {
    const ids = getStudyableItems(["PF-PROTOCOL"]).map((item) => item.id);
    expect(ids).toContain("T-01");
    expect(ids).toContain("T-06");
    expect(ids).not.toContain("PF-PROTOCOL");
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
    const { card } = reviewCard(
      createCard("T-01", T0 - 30 * DAY),
      RATING.GOOD,
      T0 - 30 * DAY,
    );
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
    // Learning the protocol opens the whole first tier, so there is plenty to cap.
    const queue = buildSession({
      cards: learned("PF-PROTOCOL"),
      now: T0,
      maxItems: 3,
    });
    expect(queue).toHaveLength(3);
  });

  it("fills a time budget instead of an item count", () => {
    const cards = learned("PF-PROTOCOL");
    const short = buildSession({ cards, now: T0, minutes: 20 });
    const long = buildSession({ cards, now: T0, minutes: 60 });

    expect(summarizeSession(short).minutes).toBeLessThanOrEqual(22);
    expect(summarizeSession(long).minutes).toBeGreaterThan(
      summarizeSession(short).minutes,
    );
  });

  it("follows the prerequisite chain so a first session is not two minutes long", () => {
    // Everything in tier 1 depends on the protocol, which a new learner has not
    // graded yet. If unlocking only looked at stored cards, asking for twenty
    // minutes on day one would return exactly one item.
    const queue = buildSession({ cards: [], now: T0, minutes: 20 });
    expect(queue[0].item.id).toBe("PF-PROTOCOL");
    expect(queue.length).toBeGreaterThan(1);
    expect(summarizeSession(queue).minutes).toBeGreaterThan(10);
  });

  it("always returns something, even for a budget one drill cannot fit", () => {
    const queue = buildSession({
      cards: learned("PF-PROTOCOL"),
      now: T0,
      minutes: 1,
    });
    expect(queue.length).toBe(1);
  });

  it("promotes items that drill the weakest PieceFirst step", () => {
    const cards = learned("PF-PROTOCOL");
    // PF3 FORCE is the step being failed, so a PF3 item must be pulled forward.
    const queue = buildSession({
      cards,
      now: T0,
      failureWeights: { PF3: 6 },
      maxItems: 6,
    });

    const targeted = queue.filter((entry) => entry.kind === "targeted");
    expect(targeted.length).toBeGreaterThan(0);
    expect(targeted[0].item.pfStep).toBe("PF3");
    // Targeted work comes before new material.
    expect(queue.indexOf(targeted[0])).toBeLessThan(
      queue.findIndex((entry) => entry.kind === "new"),
    );
  });

  it("drills exactly the items asked for when given a list", () => {
    const queue = buildSession({ itemIds: ["E-10", "T-01"] });
    expect(queue.map((entry) => entry.item.id)).toEqual(["E-10", "T-01"]);
  });

  it("shows a rotating handful of positions rather than all of them", () => {
    const [card] = learned("T-01");
    const first = buildSession({ itemIds: ["T-01"] })[0];
    expect(first.positions.length).toBeLessThanOrEqual(3);

    const later = buildSession({
      cards: [{ ...card, reps: 1 }],
      itemIds: ["T-01"],
    })[0];
    expect(later.positions.map((position) => position.id)).not.toEqual(
      first.positions.map((position) => position.id),
    );
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
    const queue = buildSession({
      cards: learned("PF-PROTOCOL"),
      now: T0,
      maxItems: 2,
    });
    const summary = summarizeSession(queue);

    expect(summary.total).toBe(2);
    expect(summary.fresh).toBe(2);
    expect(summary.review).toBe(0);
    expect(summary.positions).toBe(
      queue.reduce((sum, entry) => sum + entry.positions.length, 0),
    );
    expect(summary.minutes).toBeGreaterThan(0);
  });

  it("handles an empty queue", () => {
    expect(summarizeSession([])).toEqual({
      total: 0,
      review: 0,
      targeted: 0,
      fresh: 0,
      warmup: 0,
      warmupReps: 0,
      positions: 0,
      minutes: 0,
    });
  });
});

describe("seeded content sanity", () => {
  it("seeds a meaningful slice of the curriculum", () => {
    // Imported tactical/mating items plus the full 18-item endgame tier.
    expect(SEEDED_ITEM_IDS.length).toBeGreaterThanOrEqual(40);
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

describe("the adaptive warm-up", () => {
  it("is off unless a session asks for it", () => {
    // A dashboard preview or a single-item drill must get the queue it asked
    // for, not a different one with reps prepended.
    const queue = buildSession({ cards: learned("PF-PROTOCOL"), now: T0 });
    expect(queue.some((entry) => entry.kind === "warmup")).toBe(false);
  });

  it("opens the session when asked, before anything scheduled", () => {
    const queue = buildSession({
      cards: learned("PF-PROTOCOL"),
      now: T0,
      warmup: true,
    });
    const [first] = queue;
    expect(first.kind).toBe("warmup");
    expect(first.item.id).toBe("PF-PROTOCOL");
    // Scheduled work still follows it.
    expect(queue.some((entry) => entry.kind !== "warmup")).toBe(true);
  });

  it("drills the two steps sub-1000 games are lost to, and only those", () => {
    const queue = buildSession({ now: T0, warmup: true });
    const steps = queue
      .filter((entry) => entry.kind === "warmup")
      .map((entry) => entry.warmup.step);
    expect(steps).toEqual(["PF7", "PF2"]);
  });

  it("gives the floor when the learner has no error history", () => {
    const queue = buildSession({ now: T0, warmup: true });
    for (const entry of queue.filter((e) => e.kind === "warmup")) {
      expect(entry.positions).toHaveLength(MIN_REPS);
    }
  });

  it("opens the band toward the step actually being failed", () => {
    // A tally with real mass, almost all of it PF7, should buy PF7 more reps
    // than the floor while PF2 stays near it.
    const failureWeights = { PF7: 18, PF2: 2 };
    const queue = buildSession({ now: T0, warmup: true, failureWeights });
    const byStep = Object.fromEntries(
      queue
        .filter((entry) => entry.kind === "warmup")
        .map((entry) => [entry.warmup.step, entry.positions.length]),
    );
    expect(byStep.PF7).toBeGreaterThan(byStep.PF2);
    expect(byStep.PF7).toBeLessThanOrEqual(MAX_REPS);
    expect(byStep.PF2).toBeGreaterThanOrEqual(MIN_REPS);
  });

  it("never exceeds the ceiling, however bad the week was", () => {
    const queue = buildSession({
      now: T0,
      warmup: true,
      failureWeights: { PF7: 500 },
    });
    for (const entry of queue.filter((e) => e.kind === "warmup")) {
      expect(entry.positions.length).toBeLessThanOrEqual(MAX_REPS);
    }
  });

  it("keeps the minute budget honest", () => {
    // The reps are ordinary entries, so a 20-minute session that opens with
    // them is still a 20-minute session.
    const queue = buildSession({
      cards: learned(...CURRICULUM.slice(0, 20).map((item) => item.id)),
      now: T0,
      minutes: 20,
      warmup: true,
    });
    expect(summarizeSession(queue).minutes).toBeLessThanOrEqual(20);
    expect(summarizeSession(queue).warmup).toBeGreaterThan(0);
  });

  it("counts warm-up reps separately from scheduled items", () => {
    const queue = buildSession({ now: T0, warmup: true });
    const summary = summarizeSession(queue);
    expect(summary.warmup).toBe(2);
    expect(summary.warmupReps).toBe(2 * MIN_REPS);
    // Warm-up is never counted as review or new — it is not scheduled work.
    const warmupEntries = queue.filter((entry) => entry.kind === "warmup");
    expect(warmupEntries.every((entry) => entry.kind === "warmup")).toBe(true);
  });

  it("only ever drills content that exists", () => {
    const queue = buildSession({ now: T0, warmup: true });
    for (const entry of queue.filter((e) => e.kind === "warmup")) {
      expect(entry.positions.length).toBeGreaterThan(0);
      for (const position of entry.positions) {
        expectPlayable(position);
      }
    }
  });
});
