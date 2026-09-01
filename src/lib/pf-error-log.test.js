import { describe, expect, it } from "vitest";

import {
  classifyFailureStep,
  mergeIntoTally,
  rankSteps,
  tagErrors,
  weighByStep,
} from "@/lib/pf-error-log";

/**
 * The classifier decides which curriculum items get promoted, so a wrong rule
 * quietly points training at the wrong thing. Each case below is a position
 * where one specific step of the protocol is the one that would have caught the
 * mistake.
 */

describe("classifyFailureStep", () => {
  it("blames the blunder scan when the move played hangs a piece", () => {
    // Rd5 walks the rook onto a square the a2 bishop covers; nothing was loose
    // before it moved. PF7 VERIFY is exactly the step that catches this.
    expect(
      classifyFailureStep({
        preFen: "4k3/8/8/8/8/8/b7/3RK3 w - - 0 1",
        san: "Rd5",
        bestSan: "Rd2",
      }),
    ).toBe("PF7");
  });

  it("blames safety when something was already hanging", () => {
    // The rook on a8 is attacked by the g2 bishop and undefended; h4 ignores it.
    expect(
      classifyFailureStep({
        preFen: "R7/8/3k4/8/8/7P/6b1/4K3 w - - 0 1",
        san: "h4",
        bestSan: "Ra1",
      }),
    ).toBe("PF2");
  });

  it("blames the forcing-move step when a check or capture was missed", () => {
    expect(
      classifyFailureStep({
        preFen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
        san: "Kf1",
        bestSan: "Ra8+",
      }),
    ).toBe("PF3");
  });

  it("blames calculation when a forcing move was played, but the wrong one", () => {
    expect(
      classifyFailureStep({
        preFen: "6k1/5ppp/8/8/8/8/5PPP/R2R2K1 w - - 0 1",
        san: "Rd8+",
        bestSan: "Ra8+",
      }),
    ).toBe("PF6");
  });

  it("falls back to piece placement for a quiet move with nothing at stake", () => {
    expect(
      classifyFailureStep({
        preFen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
        san: "Kf1",
        bestSan: "Ra4",
      }),
    ).toBe("PF5");
  });

  it("returns null rather than guessing on unusable input", () => {
    expect(classifyFailureStep(null)).toBeNull();
    expect(classifyFailureStep({ san: "e4" })).toBeNull();
    expect(classifyFailureStep({ preFen: "not a fen", san: "e4" })).toBeNull();
    expect(
      classifyFailureStep({
        preFen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
        san: "Qh5",
      }),
    ).toBeNull();
  });
});

describe("tagErrors", () => {
  const errors = [
    {
      side: "w",
      quality: "Blunder",
      preFen: "4k3/8/8/8/8/8/b7/3RK3 w - - 0 1",
      san: "Rd5",
      bestSan: "Rd2",
    },
    {
      side: "b",
      quality: "Mistake",
      preFen: "3rk3/B7/8/8/8/8/8/4K3 b - - 0 1",
      san: "Rd5",
      bestSan: "Rd2",
    },
  ];

  it("keeps only your own side when asked", () => {
    expect(tagErrors(errors, { side: "w" })).toHaveLength(1);
    expect(tagErrors(errors, { side: "w" })[0].pfStep).toBe("PF7");
  });

  it("keeps both sides by default", () => {
    expect(tagErrors(errors)).toHaveLength(2);
  });

  it("drops entries it cannot classify", () => {
    expect(tagErrors([{ side: "w", san: "e4" }])).toEqual([]);
  });

  it("handles no input", () => {
    expect(tagErrors()).toEqual([]);
  });
});

describe("weighByStep and rankSteps", () => {
  it("counts a blunder as worth two of anything else", () => {
    const weights = weighByStep([
      { pfStep: "PF7", quality: "Blunder" },
      { pfStep: "PF3", quality: "Mistake" },
    ]);
    expect(weights).toEqual({ PF7: 2, PF3: 1 });
  });

  it("ranks the worst step first", () => {
    expect(rankSteps({ PF3: 1, PF7: 5, PF2: 3 })).toEqual([
      "PF7",
      "PF2",
      "PF3",
    ]);
  });

  it("breaks ties deterministically", () => {
    expect(rankSteps({ PF7: 2, PF2: 2 })).toEqual(["PF2", "PF7"]);
  });

  it("handles no errors", () => {
    expect(rankSteps({})).toEqual([]);
    expect(weighByStep()).toEqual({});
  });
});

describe("mergeIntoTally", () => {
  it("accumulates across games", () => {
    const first = mergeIntoTally(
      undefined,
      [{ pfStep: "PF7", quality: "Blunder" }],
      1000,
    );
    expect(first).toMatchObject({
      weights: { PF7: 2 },
      games: 1,
      errors: 1,
      updatedAt: 1000,
    });

    const second = mergeIntoTally(
      first,
      [
        { pfStep: "PF7", quality: "Mistake" },
        { pfStep: "PF3", quality: "Mistake" },
      ],
      2000,
    );
    expect(second).toMatchObject({
      weights: { PF7: 3, PF3: 1 },
      games: 2,
      errors: 3,
      updatedAt: 2000,
    });
  });

  it("counts a game with no errors", () => {
    expect(mergeIntoTally(undefined, [], 1)).toMatchObject({
      weights: {},
      games: 1,
      errors: 0,
    });
  });
});
