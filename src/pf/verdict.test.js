/**
 * The adjudicator's contract.
 *
 * No worker and no IndexedDB anywhere in here — that is the point of the module
 * being pure, and it is what makes the invariant cheap to assert.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { classifyMove as analyzerClassify } from "@lib/analyzer.js";
import { RATING } from "@lib/srs.js";
import {
  ANALYSIS_BUDGETS,
  DEFAULT_QUALITY,
  MATE_SCORE_CP,
  MAX_CP_LOSS,
  QUALITY_LEVELS,
  TACTIC_GAP_CP,
  analysisBudget,
  analysisContract,
  analyzeArguments,
  candidateSpread,
  gradeFromEngine,
  isError,
  isRealTactic,
  lineScoreCp,
  practicalLoss,
  verdictFor,
} from "@pf/verdict.js";

const line = (overrides = {}) => ({
  pvIdx: 1,
  depth: 14,
  scoreCp: 0,
  isMate: false,
  mateIn: null,
  pv: ["e2e4"],
  ...overrides,
});

describe("verdictFor", () => {
  it.each([
    [0, "Brilliant"],
    [15, "Brilliant"],
    [16, "Excellent"],
    [30, "Excellent"],
    [31, "Good"],
    [70, "Good"],
    [71, "Inaccuracy"],
    [150, "Inaccuracy"],
    [151, "Mistake"],
    [300, "Mistake"],
    [301, "Blunder"],
    [10_000, "Blunder"],
  ])("grades %ocp lost as %s", (cpLoss, label) => {
    expect(verdictFor(cpLoss).label).toBe(label);
  });

  it("treats a negative loss as no loss at all", () => {
    // The learner found something better than the engine's stated best, which
    // happens when the two searches ran at different budgets.
    expect(verdictFor(-40).label).toBe("Brilliant");
  });

  it("falls back to Good, never to Blunder, when the engine gave no answer", () => {
    for (const missing of [null, undefined, Number.NaN]) {
      expect(verdictFor(missing)).toBe(DEFAULT_QUALITY);
      expect(verdictFor(missing).label).toBe("Good");
    }
  });

  it("returns frozen table entries, so a consumer cannot mutate the thresholds", () => {
    expect(Object.isFrozen(QUALITY_LEVELS)).toBe(true);
    expect(Object.isFrozen(verdictFor(0))).toBe(true);
  });

  it("keeps every level's presentation fields populated", () => {
    for (const level of QUALITY_LEVELS) {
      expect(level.label).toBeTruthy();
      expect(level.emoji).toBeTruthy();
      expect(level.color).toBeTruthy();
      expect(typeof level.score).toBe("number");
    }
  });
});

describe("the one-adjudicator invariant", () => {
  it("gives the game report and the module the same verdict at every boundary", () => {
    // analyzer.js is the migration source for these numbers; if it ever grows a
    // second table again, this fails.
    for (const cpLoss of [0, 15, 16, 30, 31, 70, 71, 150, 151, 300, 301, 900]) {
      expect(analyzerClassify(cpLoss).label).toBe(verdictFor(cpLoss).label);
    }
  });

  it("agrees with the FSRS grade at every boundary", () => {
    for (const cpLoss of [0, 15, 30, 70, 150, 300, 1000]) {
      const graded = gradeFromEngine(cpLoss);
      const { label } = verdictFor(cpLoss);
      expect(graded === RATING.AGAIN).toBe(isError(label));
    }
  });
});

describe("isError", () => {
  it("counts only Mistake and Blunder", () => {
    expect(QUALITY_LEVELS.filter((l) => isError(l.label)).map((l) => l.label))
      .toEqual(["Mistake", "Blunder"]);
  });
});

describe("gradeFromEngine", () => {
  it.each([
    [0, RATING.EASY],
    [20, RATING.EASY],
    [50, RATING.GOOD],
    [120, RATING.HARD],
    [200, RATING.AGAIN],
    [800, RATING.AGAIN],
  ])("grades %ocp lost as rating %o", (cpLoss, rating) => {
    expect(gradeFromEngine(cpLoss)).toBe(rating);
  });

  it("takes only the loss — latency is telemetry, not a grade input (D3)", () => {
    expect(gradeFromEngine.length).toBe(1);
    // A second argument, if some caller passes one, must change nothing.
    expect(gradeFromEngine(50, 30_000)).toBe(gradeFromEngine(50));
  });

  it("never grades a missing engine answer as again", () => {
    expect(gradeFromEngine(null)).toBe(RATING.GOOD);
  });
});

describe("practicalLoss", () => {
  it("marks a move that holds a lost position as no loss", () => {
    // −2.3 was the best available; the learner held −2.1. Correct, loudly.
    expect(practicalLoss(-230, -210)).toBe(0);
    expect(verdictFor(practicalLoss(-230, -210)).label).toBe("Brilliant");
  });

  it("prices the loss relative to the best available, not to zero", () => {
    expect(practicalLoss(-230, -300)).toBe(70);
    expect(verdictFor(practicalLoss(-230, -300)).label).toBe("Good");
  });

  it("clamps a catastrophe to MAX_CP_LOSS", () => {
    expect(practicalLoss(200, -30_000)).toBe(MAX_CP_LOSS);
  });

  it("returns null when either side is unknown", () => {
    expect(practicalLoss(null, -100)).toBeNull();
    expect(practicalLoss(-100, undefined)).toBeNull();
    expect(practicalLoss(Number.NaN, 0)).toBeNull();
  });
});

describe("lineScoreCp", () => {
  it("ranks a faster mate above a slower one", () => {
    const fast = lineScoreCp(line({ isMate: true, mateIn: 1, scoreCp: null }));
    const slow = lineScoreCp(line({ isMate: true, mateIn: 5, scoreCp: null }));
    expect(fast).toBeGreaterThan(slow);
  });

  it("ranks any mate above any centipawn score", () => {
    const mate = lineScoreCp(line({ isMate: true, mateIn: 12, scoreCp: null }));
    expect(mate).toBeGreaterThan(lineScoreCp(line({ scoreCp: 2000 })));
  });

  it("signs a mate being received as a loss", () => {
    expect(lineScoreCp(line({ isMate: true, mateIn: -2, scoreCp: null }))).toBe(
      -(MATE_SCORE_CP - 2),
    );
  });

  it("returns null for an unscored line", () => {
    expect(lineScoreCp(line({ scoreCp: null }))).toBeNull();
    expect(lineScoreCp(null)).toBeNull();
  });
});

describe("candidateSpread", () => {
  it("ranks candidates best-first with their loss against the best", () => {
    const spread = candidateSpread([
      line({ pvIdx: 1, scoreCp: 300, pv: ["d5e7", "e8e7"] }),
      line({ pvIdx: 2, scoreCp: 120, pv: ["f3g5"] }),
      line({ pvIdx: 3, scoreCp: -50, pv: ["a2a3"] }),
    ]);

    expect(spread.map((c) => c.uci)).toEqual(["d5e7", "f3g5", "a2a3"]);
    expect(spread.map((c) => c.cpLoss)).toEqual([0, 180, 350]);
    expect(spread.map((c) => c.verdict)).toEqual([
      "Brilliant",
      "Mistake",
      "Blunder",
    ]);
    expect(spread.map((c) => c.rank)).toEqual([1, 2, 3]);
  });

  it("re-sorts lines the engine reported out of order", () => {
    const spread = candidateSpread([
      line({ pvIdx: 1, scoreCp: 10, pv: ["a2a3"] }),
      line({ pvIdx: 2, scoreCp: 400, pv: ["d1h5"] }),
    ]);
    expect(spread[0].uci).toBe("d1h5");
  });

  it("drops unscored lines rather than ranking them last", () => {
    const spread = candidateSpread([
      line({ pvIdx: 1, scoreCp: 100, pv: ["e2e4"] }),
      line({ pvIdx: 2, scoreCp: null, pv: ["d2d4"] }),
    ]);
    expect(spread).toHaveLength(1);
  });

  it("returns [] for an empty or absent result", () => {
    expect(candidateSpread([])).toEqual([]);
    expect(candidateSpread(null)).toEqual([]);
    expect(candidateSpread([line({ scoreCp: null })])).toEqual([]);
  });
});

describe("isRealTactic", () => {
  const forkCertificate = { motif: "fork", solution: ["d5e7"] };

  it("rejects a gap with no certificate behind it (D2)", () => {
    const quietButLarge = [
      line({ pvIdx: 1, scoreCp: 300, pv: ["a2a4"] }),
      line({ pvIdx: 2, scoreCp: 100, pv: ["h2h3"] }),
    ];
    expect(isRealTactic(quietButLarge, null)).toBe(false);
    expect(isRealTactic(quietButLarge, { motif: "fork" })).toBe(false);
    expect(isRealTactic(quietButLarge, { solution: ["a2a4"] })).toBe(false);
  });

  it("accepts a certified motif the engine confirms is decisively best", () => {
    expect(
      isRealTactic(
        [
          line({ pvIdx: 1, scoreCp: 400, pv: ["d5e7", "e8e7"] }),
          line({ pvIdx: 2, scoreCp: 40, pv: ["f3g5"] }),
        ],
        forkCertificate,
      ),
    ).toBe(true);
  });

  it("accepts two equally winning solution moves, which show no gap at all", () => {
    // The gap is measured against the best move OUTSIDE the solution set, so a
    // second winning execution of the same motif does not disqualify it.
    expect(
      isRealTactic(
        [
          line({ pvIdx: 1, scoreCp: 500, pv: ["d5e7"] }),
          line({ pvIdx: 2, scoreCp: 500, pv: ["d5f6"] }),
          line({ pvIdx: 3, scoreCp: 20, pv: ["a2a3"] }),
        ],
        { motif: "fork", solution: ["d5e7", "d5f6"] },
      ),
    ).toBe(true);
  });

  it("accepts a mate without asking for a gap", () => {
    expect(
      isRealTactic(
        [
          line({ pvIdx: 1, isMate: true, mateIn: 2, scoreCp: null, pv: ["h5f7"] }),
          line({ pvIdx: 2, isMate: true, mateIn: 4, scoreCp: null, pv: ["h5h7"] }),
        ],
        { motif: "smothered-mate", solution: "h5f7" },
      ),
    ).toBe(true);
  });

  it("accepts when every line the engine returned executes the motif", () => {
    expect(
      isRealTactic(
        [line({ pvIdx: 1, scoreCp: 350, pv: ["d5e7"] })],
        forkCertificate,
      ),
    ).toBe(true);
  });

  it("rejects a near-miss: the motif is there and the engine plays something else", () => {
    expect(
      isRealTactic(
        [
          line({ pvIdx: 1, scoreCp: 60, pv: ["c1e3"] }),
          line({ pvIdx: 2, scoreCp: -400, pv: ["d5e7"] }),
        ],
        { motif: "fork", solution: ["d5e7"], refutation: ["e8e7"] },
      ),
    ).toBe(false);
  });

  it("rejects a certified move that is best by too little to be a tactic", () => {
    expect(
      isRealTactic(
        [
          line({ pvIdx: 1, scoreCp: 200, pv: ["d5e7"] }),
          line({ pvIdx: 2, scoreCp: 100, pv: ["f3g5"] }),
        ],
        forkCertificate,
      ),
    ).toBe(false);
    expect(TACTIC_GAP_CP).toBe(150);
  });

  it("honours a caller-supplied gap", () => {
    const lines = [
      line({ pvIdx: 1, scoreCp: 200, pv: ["d5e7"] }),
      line({ pvIdx: 2, scoreCp: 100, pv: ["f3g5"] }),
    ];
    expect(isRealTactic(lines, forkCertificate, 50)).toBe(true);
  });

  it("rejects when the engine gave nothing to confirm against", () => {
    expect(isRealTactic([], forkCertificate)).toBe(false);
  });
});

describe("the analysis budget contract", () => {
  it("bounds every budget on both axes", () => {
    for (const [useCase, budget] of Object.entries(ANALYSIS_BUDGETS)) {
      expect(budget.timeoutMs, `${useCase} timeoutMs`).toBeGreaterThan(0);
      expect(budget.multiPV, `${useCase} multiPV`).toBeGreaterThanOrEqual(1);
      // Build-time certification is the one search nobody is waiting on.
      if (useCase !== "certify") {
        expect(budget.movetimeMs, `${useCase} movetimeMs`).toBeGreaterThan(0);
        expect(
          budget.movetimeMs,
          `${useCase} movetimeMs must be under its timeout`,
        ).toBeLessThan(budget.timeoutMs);
      }
    }
  });

  it("keeps every interactive budget inside a few seconds", () => {
    const interactive = ["evalBar", "hint", "bestMove", "commitGate", "playoutReply"];
    for (const useCase of interactive) {
      expect(analysisBudget(useCase).movetimeMs).toBeLessThanOrEqual(1_000);
    }
  });

  it("throws on an unknown use case rather than silently meaning unbounded", () => {
    expect(() => analysisBudget("bestmove")).toThrow(/Unknown analysis budget/);
  });

  it("spreads into analyze()'s argument order", () => {
    const { depth, multiPV, timeoutMs, movetimeMs } = analysisBudget("hint");
    expect(analyzeArguments("hint")).toEqual([
      depth,
      multiPV,
      timeoutMs,
      movetimeMs,
    ]);
  });

  it("records the whole contract, not just a depth and a date (D14)", () => {
    const contract = analysisContract("commitGate", { positionId: "pf-7" });
    expect(contract).toMatchObject({
      useCase: "commitGate",
      depth: 14,
      multiPV: 3,
      movetimeMs: 600,
      timeoutMs: 8_000,
      scorePerspective: "side-to-move",
      positionId: "pf-7",
    });
    expect(contract.engine.build).toBe("stockfish-18-lite-single");
    expect(contract.mateHandling).toContain(String(MATE_SCORE_CP));
    expect(Date.parse(contract.verifiedAt)).not.toBeNaN();
    expect(Object.isFrozen(contract)).toBe(true);
  });
});

describe("every budget the app asks for exists", () => {
  // The lint rule (`no-restricted-syntax` in eslint.config.js) stops anyone
  // calling analyze() without both bounds. It cannot catch the other half: a
  // typo in the use-case name, which throws only when that path is first taken —
  // and some of these paths are taken rarely.
  const sourceFiles = () => {
    const roots = ["src", "scripts"];
    const found = [];
    const walk = (dir) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules") walk(full);
        } else if (
          /\.jsx?$/.test(entry.name) &&
          !/\.test\.jsx?$/.test(entry.name)
        ) {
          found.push(full);
        }
      }
    };
    for (const root of roots) walk(root);
    return found;
  };

  it("names only keys of ANALYSIS_BUDGETS", () => {
    const asked = new Set();
    for (const file of sourceFiles()) {
      const source = readFileSync(file, "utf8");
      for (const [, key] of source.matchAll(
        /analy(?:sisBudget|zeArguments)\(\s*["'`]([^"'`]+)["'`]\s*\)/g,
      )) {
        asked.add(key);
      }
    }

    expect(asked.size).toBeGreaterThan(0);
    for (const key of asked) {
      expect(
        Object.keys(ANALYSIS_BUDGETS),
        `"${key}" is asked for in the source but is not a budget`,
      ).toContain(key);
    }
  });
});
