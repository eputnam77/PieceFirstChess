import { describe, expect, it } from "vitest";

import {
  GATE_SOURCE,
  REASON_CHIPS,
  describePrediction,
  isReasonStep,
  parseCandidate,
  renderComparison,
  summarizePilot,
  toGateEvent,
  uciToSan,
} from "@pf/commit-gate.js";

/** Italian Game, after 3...Nf6 — Bxf7+ and Ng5 are both real tries here. */
const ITALIAN =
  "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";

const line = (overrides = {}) => ({
  pvIdx: 1,
  depth: 14,
  scoreCp: 0,
  isMate: false,
  mateIn: null,
  pv: ["e1g1"],
  ...overrides,
});

describe("parseCandidate", () => {
  it("accepts SAN as a learner would type it", () => {
    expect(parseCandidate(ITALIAN, "Ng5")).toEqual({ uci: "f3g5", san: "Ng5" });
    expect(parseCandidate(ITALIAN, "O-O")).toEqual({ uci: "e1g1", san: "O-O" });
    expect(parseCandidate(ITALIAN, "  d3  ")).toEqual({
      uci: "d2d3",
      san: "d3",
    });
  });

  it("accepts raw UCI too, because a learner mid-game types whichever is faster", () => {
    expect(parseCandidate(ITALIAN, "f3g5")).toEqual({
      uci: "f3g5",
      san: "Ng5",
    });
    expect(parseCandidate(ITALIAN, "C4F7")).toEqual({
      uci: "c4f7",
      san: "Bxf7+",
    });
  });

  it("reads a bare pawn push as the move, not as a square name", () => {
    // "b4" is legal SAN here; treating it as a UCI fragment would lose it.
    expect(parseCandidate(ITALIAN, "b4")?.san).toBe("b4");
  });

  it("rejects an illegal or unparseable move", () => {
    expect(parseCandidate(ITALIAN, "Qh8")).toBeNull();
    expect(parseCandidate(ITALIAN, "e9e9")).toBeNull();
    expect(parseCandidate(ITALIAN, "banana")).toBeNull();
    expect(parseCandidate(ITALIAN, "")).toBeNull();
    expect(parseCandidate("", "Ng5")).toBeNull();
  });

  it("never mutates the position it is given", () => {
    parseCandidate(ITALIAN, "Ng5");
    // The FEN is a string, so the only way to check is that a second parse of
    // the same move still succeeds from the same starting position.
    expect(parseCandidate(ITALIAN, "Ng5")?.san).toBe("Ng5");
  });
});

describe("uciToSan", () => {
  it("names a legal move and refuses an illegal one", () => {
    expect(uciToSan(ITALIAN, "c4f7")).toBe("Bxf7+");
    expect(uciToSan(ITALIAN, "a1a8")).toBeNull();
    expect(uciToSan(ITALIAN, null)).toBeNull();
  });
});

describe("describePrediction", () => {
  const lines = [
    line({ pvIdx: 1, scoreCp: 60, pv: ["d2d3", "d7d6"] }),
    line({ pvIdx: 2, scoreCp: 20, pv: ["e1g1"] }),
    line({ pvIdx: 3, scoreCp: -110, pv: ["f3g5"] }),
  ];

  it("reads rank and loss straight off the search when the move is in it", () => {
    const prediction = describePrediction({
      fen: ITALIAN,
      playedUci: "f3g5",
      lines,
    });
    expect(prediction).toMatchObject({
      playedSan: "Ng5",
      bestSan: "d3",
      inSpread: true,
      rank: 3,
      of: 3,
      cpLoss: 170,
      verdict: "Mistake",
      matchedBest: false,
    });
  });

  it("recognises the learner finding the engine's own move", () => {
    const prediction = describePrediction({
      fen: ITALIAN,
      playedUci: "d2d3",
      lines,
    });
    expect(prediction.matchedBest).toBe(true);
    expect(prediction.cpLoss).toBe(0);
    expect(prediction.rank).toBe(1);
  });

  it("reports an honest null loss for a move outside the returned lines", () => {
    // The common case for a real mistake: the engine gave three lines and the
    // learner played a fourth move. Guessing a loss here would be a lie.
    const prediction = describePrediction({
      fen: ITALIAN,
      playedUci: "h2h4",
      lines,
    });
    expect(prediction.inSpread).toBe(false);
    expect(prediction.rank).toBeNull();
    expect(prediction.cpLoss).toBeNull();
    expect(prediction.verdict).toBe("Good"); // the no-answer default
  });

  it("prices an outside move once a second evaluation is supplied", () => {
    const prediction = describePrediction({
      fen: ITALIAN,
      playedUci: "h2h4",
      lines,
      afterCp: -260,
    });
    expect(prediction.cpLoss).toBe(320);
    expect(prediction.verdict).toBe("Blunder");
  });

  it("survives a search that returned nothing", () => {
    const prediction = describePrediction({
      fen: ITALIAN,
      playedUci: "d2d3",
      lines: [],
    });
    expect(prediction.bestSan).toBeNull();
    expect(prediction.cpLoss).toBeNull();
    expect(prediction.matchedBest).toBe(false);
  });
});

describe("renderComparison", () => {
  it("says so, plainly, when the learner found it first", () => {
    const text = renderComparison(
      describePrediction({
        fen: ITALIAN,
        playedUci: "d2d3",
        lines: [line({ scoreCp: 60, pv: ["d2d3"] })],
      }),
    );
    expect(text).toContain("You played d3");
    expect(text).toContain("so did Stockfish");
  });

  it("gives the rank, the cost and the better move when they differ", () => {
    const text = renderComparison(
      describePrediction({
        fen: ITALIAN,
        playedUci: "f3g5",
        lines: [
          line({ pvIdx: 1, scoreCp: 60, pv: ["d2d3"] }),
          line({ pvIdx: 2, scoreCp: -110, pv: ["f3g5"] }),
        ],
      }),
    );
    expect(text).toContain("You played Ng5");
    expect(text).toContain("2 of 2");
    expect(text).toContain("−1.7");
    expect(text).toContain("Best is d3");
  });

  it("says nothing at all when there was no prediction", () => {
    expect(renderComparison(null)).toBe("");
    expect(renderComparison({ playedSan: null })).toBe("");
  });
});

describe("REASON_CHIPS", () => {
  it("covers the protocol steps a single position can actually answer for", () => {
    expect(REASON_CHIPS.map((chip) => chip.step)).toEqual([
      "PF2",
      "PF3",
      "PF4",
      "PF5",
      "PF6",
      "PF7",
    ]);
    expect(isReasonStep("PF3")).toBe(true);
    expect(isReasonStep("PF9")).toBe(false);
  });
});

describe("toGateEvent", () => {
  it("records a skip as a real row, not as an absence", () => {
    // The whole pilot question is how often the gate is skipped; a store that
    // only kept answers could not report that.
    const event = toGateEvent({ fen: ITALIAN, skipped: true, ts: 1000 });
    expect(event).toMatchObject({
      source: GATE_SOURCE,
      skipped: true,
      playedUci: null,
      cpLoss: null,
      ts: 1000,
    });
  });

  it("carries the reason chip and the PF step alongside the engine numbers", () => {
    const event = toGateEvent({
      fen: ITALIAN,
      prediction: describePrediction({
        fen: ITALIAN,
        playedUci: "f3g5",
        lines: [
          line({ pvIdx: 1, scoreCp: 60, pv: ["d2d3"] }),
          line({ pvIdx: 2, scoreCp: -110, pv: ["f3g5"] }),
        ],
      }),
      reasonChip: "PF3",
      pfStep: "PF7",
      msToCommit: 4200,
      sessionId: "s-1",
      ts: 2000,
    });
    expect(event).toMatchObject({
      playedSan: "Ng5",
      bestSan: "d3",
      cpLoss: 170,
      rank: 2,
      reasonChip: "PF3",
      pfStep: "PF7",
      msToCommit: 4200,
      sessionId: "s-1",
      skipped: false,
    });
  });
});

describe("summarizePilot", () => {
  const event = (overrides) => ({
    ts: 1,
    source: GATE_SOURCE,
    sessionId: "s-1",
    skipped: false,
    matchedBest: false,
    msToCommit: 5000,
    ...overrides,
  });

  it("reports nothing rather than zero when there is no data", () => {
    const pilot = summarizePilot([]);
    expect(pilot.queries).toBe(0);
    expect(pilot.skipRate).toBeNull();
    expect(pilot.completionRate).toBeNull();
    expect(pilot.medianSecondsToCommit).toBeNull();
    expect(pilot.eventsPerSession).toBeNull();
    expect(pilot.accuracy).toBeNull();
  });

  it("splits answered from skipped", () => {
    const pilot = summarizePilot([
      event({}),
      event({ skipped: true, msToCommit: 900 }),
      event({ matchedBest: true }),
      event({ skipped: true, msToCommit: 400 }),
    ]);
    expect(pilot.queries).toBe(4);
    expect(pilot.committed).toBe(2);
    expect(pilot.skipped).toBe(2);
    expect(pilot.skipRate).toBe(0.5);
    expect(pilot.completionRate).toBe(0.5);
    expect(pilot.accuracy).toBe(0.5);
  });

  it("takes a median, not a mean, of the time cost", () => {
    // One learner walking away mid-prediction must not decide the question.
    const pilot = summarizePilot([
      event({ msToCommit: 3000 }),
      event({ msToCommit: 4000 }),
      event({ msToCommit: 600_000 }),
    ]);
    expect(pilot.medianSecondsToCommit).toBe(4);
  });

  it("counts events per distinct session", () => {
    const pilot = summarizePilot([
      event({ sessionId: "a" }),
      event({ sessionId: "a" }),
      event({ sessionId: "b" }),
    ]);
    expect(pilot.sessions).toBe(2);
    expect(pilot.eventsPerSession).toBe(1.5);
  });

  it("ignores events written by anything but the gate", () => {
    const pilot = summarizePilot([event({}), { ts: 2, source: "study" }]);
    expect(pilot.queries).toBe(1);
  });
});
