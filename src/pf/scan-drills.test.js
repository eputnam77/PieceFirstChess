import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { SCAN_POSITIONS } from "@/data/scan-drills";
import {
  RULE_STEPS,
  SCAN_RULES,
  checkSquares,
  describeScanResult,
  generateScanDrill,
  generateScanSet,
  gradeScan,
  knightForkSquares,
  looseSquares,
  proveTargets,
} from "@pf/scan-drills.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/**
 * Three loose white pieces: the queen on b3, the rook on f1 and the knight on
 * e7. Taken from the generated corpus so the fixture is a position the drill
 * really ships rather than one invented for the test.
 */
const LOOSE = "r2q1r1k/4N1bp/p2p2p1/2p3N1/Pp4P1/1Q5P/1P1n1P2/5RK1 w - - 1 22";

/** Black to move, with a loose rook on d8 and a loose rook on e5. */
const LOOSE_BLACK =
  "3r2k1/5pp1/2p4p/1p2r3/1Pq5/2N3QP/5PP1/3RR1K1 b - - 0 25";

/** Nd5-c7 forks the king on e8 and the rook on a8, and nothing can take it. */
const FORK = "r3k3/8/8/3N4/8/8/8/4K3 w - - 0 1";

describe("looseSquares", () => {
  it("finds nothing in the starting position", () => {
    expect(looseSquares(new Chess(START))).toEqual([]);
  });

  it("names your loose pieces, most valuable first", () => {
    const squares = looseSquares(new Chess(LOOSE));
    expect(squares).toEqual(["b3", "f1", "e7"]);
    // The queen is worth more than the rook, so it is the one to see first.
    expect(squares.indexOf("b3")).toBeLessThan(squares.indexOf("f1"));
  });
});

describe("knightForkSquares", () => {
  it("finds no fork where knights cannot move", () => {
    expect(knightForkSquares(new Chess("4k3/8/8/8/8/8/8/4K3 w - - 0 1"))).toEqual(
      [],
    );
  });

  it("finds a landing square that hits two pieces worth taking", () => {
    const squares = knightForkSquares(new Chess(FORK));
    // Nc7 hits the king on e8 and the rook on a8, and is unassailable there.
    expect(squares).toEqual(["c7"]);
    for (const square of squares) {
      // Every square returned must be reachable by a knight of ours.
      const game = new Chess(FORK);
      const legal = game
        .moves({ verbose: true })
        .filter((move) => move.piece === "n")
        .map((move) => move.to);
      expect(legal).toContain(square);
    }
  });

  it("refuses a fork the opponent can simply capture", () => {
    // The knight can reach f7, where the king takes it, and it forks nothing
    // that survives. Nothing safe is available, so nothing is returned.
    const enPrise = "4k3/5P2/8/4N3/8/8/8/4K3 w - - 0 1";
    expect(knightForkSquares(new Chess(enPrise))).toEqual([]);
  });
});

describe("checkSquares", () => {
  it("finds none in the starting position", () => {
    expect(checkSquares(new Chess(START))).toEqual([]);
  });

  it("returns each square once, sorted, however many pieces reach it", () => {
    const squares = checkSquares(
      new Chess("4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1"),
    );
    expect(squares).toEqual([...new Set(squares)].sort());
    expect(squares.length).toBeGreaterThan(0);
  });
});

describe("generateScanDrill", () => {
  it("returns null rather than an empty drill", () => {
    // A drill with no answer cannot be told apart from a broken generator.
    expect(
      generateScanDrill({
        fen: START,
        rule: SCAN_RULES.LOOSE_MATERIAL,
        id: "x",
      }),
    ).toBeNull();
  });

  it("refuses a sweep with only one answer", () => {
    // "Click every one" with a single target teaches stopping after one click.
    const single = "4k3/8/8/8/8/8/8/R3K3 b - - 0 1";
    expect(
      generateScanDrill({
        fen: single,
        rule: SCAN_RULES.LOOSE_MATERIAL,
        type: "sweep",
        id: "x",
      }),
    ).toBeNull();
  });

  it("refuses an illegal position where the previous mover is left in check", () => {
    expect(
      generateScanDrill({
        fen: "7k/5N1R/8/8/8/8/8/7K w - - 0 1",
        rule: SCAN_RULES.LOOSE_MATERIAL,
        type: "scan",
        id: "x",
      }),
    ).toBeNull();
  });

  it("builds a sweep with every target, tagged with the step it drills", () => {
    const drill = generateScanDrill({
      fen: LOOSE,
      rule: SCAN_RULES.LOOSE_MATERIAL,
      type: "sweep",
      id: "sweep-1",
    });
    expect(drill).toMatchObject({
      type: "sweep",
      rule: SCAN_RULES.LOOSE_MATERIAL,
      pfStep: "PF2",
      orientation: "white",
    });
    expect(drill.targets.length).toBeGreaterThan(1);
    expect(drill.prompt).toContain("every");
  });

  it("builds a scan with exactly one target", () => {
    const drill = generateScanDrill({
      fen: LOOSE,
      rule: SCAN_RULES.LOOSE_MATERIAL,
      type: "scan",
      id: "scan-1",
    });
    expect(drill.targets).toHaveLength(1);
    // The single answer is the most valuable one, not an arbitrary one.
    expect(drill.targets[0]).toBe("b3");
  });

  it("orients the board toward whoever is solving", () => {
    const black = generateScanDrill({
      fen: LOOSE_BLACK,
      rule: SCAN_RULES.LOOSE_MATERIAL,
      type: "sweep",
      id: "x",
    });
    expect(black?.orientation).toBe("black");
    expect(black?.targets).toEqual(["d8", "e5"]);
  });
});

describe("proveTargets", () => {
  it("re-derives the key the generator produced, for every rule", () => {
    for (const rule of Object.values(SCAN_RULES)) {
      const drill =
        generateScanDrill({ fen: LOOSE, rule, type: "sweep", id: "x" }) ??
        generateScanDrill({ fen: FORK, rule, type: "sweep", id: "x" });
      if (!drill) continue;
      expect(proveTargets(drill), rule).toEqual(drill.targets);
    }
  });

  it("returns null for a rule nothing can prove", () => {
    expect(
      proveTargets({ fen: LOOSE, rule: "vibes", type: "sweep" }),
    ).toBeNull();
  });
});

describe("gradeScan", () => {
  const position = { type: "sweep", targets: ["b5", "e4", "g4"] };

  it("marks a complete, exact answer correct", () => {
    const result = gradeScan(position, ["e4", "g4", "b5"]);
    expect(result.correct).toBe(true);
    expect(result.score).toBe(1);
    expect(result.missed).toEqual([]);
  });

  it("gives partial credit and names what was missed", () => {
    const result = gradeScan(position, ["b5", "e4"]);
    expect(result.correct).toBe(false);
    expect(result.found).toEqual(["b5", "e4"]);
    expect(result.missed).toEqual(["g4"]);
    expect(result.score).toBeCloseTo(2 / 3);
    expect(describeScanResult(position, result)).toContain("missed g4");
  });

  it("charges a wrong click as much as a miss", () => {
    // Otherwise clicking every square on the board would score full marks.
    const all = gradeScan(position, ["a1", "a2", "b5", "e4", "g4"]);
    expect(all.correct).toBe(false);
    expect(all.score).toBeCloseTo(1 / 3);
  });

  it("never scores below zero", () => {
    const result = gradeScan(position, ["a1", "a2", "a3", "a4", "a5"]);
    expect(result.score).toBe(0);
  });

  it("handles an empty answer", () => {
    const result = gradeScan(position, []);
    expect(result.correct).toBe(false);
    expect(result.found).toEqual([]);
    expect(result.score).toBe(0);
  });
});

describe("describeScanResult", () => {
  it("is short and specific when everything was found", () => {
    const position = { type: "sweep", targets: ["b5", "e4"] };
    expect(describeScanResult(position, gradeScan(position, ["b5", "e4"]))).toBe(
      "All 2 of them, nothing extra.",
    );
  });

  it("says so plainly for a single-target scan", () => {
    const position = { type: "scan", targets: ["b5"] };
    expect(describeScanResult(position, gradeScan(position, ["b5"]))).toBe(
      "Found it.",
    );
  });

  it("names a wrong click as not being one", () => {
    const position = { type: "scan", targets: ["b5"] };
    const text = describeScanResult(position, gradeScan(position, ["a1"]));
    expect(text).toContain("a1 is not one");
  });
});

describe("generateScanSet", () => {
  const corpus = [
    { id: "a", fen: LOOSE },
    { id: "b", fen: START },
    { id: "c", fen: LOOSE }, // the same board again
  ];

  it("is deterministic — same input, same output", () => {
    const options = { corpus, rules: [SCAN_RULES.LOOSE_MATERIAL] };
    expect(generateScanSet(options)).toEqual(generateScanSet(options));
  });

  it("never emits the same board twice for the same rule", () => {
    const drills = generateScanSet({
      corpus,
      rules: [SCAN_RULES.LOOSE_MATERIAL],
    });
    const fens = drills.map((drill) => drill.fen);
    expect(fens).toEqual([...new Set(fens)]);
  });

  it("honours the limit", () => {
    const drills = generateScanSet({
      corpus: [
        { id: "a", fen: LOOSE },
        { id: "b", fen: LOOSE_BLACK },
        { id: "c", fen: FORK },
      ],
      rules: Object.values(SCAN_RULES),
      limit: 2,
    });
    expect(drills).toHaveLength(2);
  });

  it("skips positions where the rule finds nothing", () => {
    const drills = generateScanSet({
      corpus: [{ id: "b", fen: START }],
      rules: [SCAN_RULES.LOOSE_MATERIAL],
    });
    expect(drills).toEqual([]);
  });
});

describe("the committed corpus", () => {
  const all = Object.values(SCAN_POSITIONS).flat();

  it("ships drills for the items the generator plan names", () => {
    expect(Object.keys(SCAN_POSITIONS)).toEqual(["PF-PROTOCOL", "T-01"]);
    expect(all.length).toBeGreaterThan(100);
  });

  it("re-proves every answer key from its own FEN", () => {
    // The same assertion `npm run verify:drills` makes, kept here so a
    // regenerated file cannot land without the unit suite noticing.
    for (const position of all) {
      expect(proveTargets(position), position.id).toEqual(position.targets);
    }
  });

  it("tags every drill with a step the error tally can act on", () => {
    for (const position of all) {
      expect(position.pfStep, position.id).toBe(RULE_STEPS[position.rule]);
    }
  });

  it("gives every id a unique name", () => {
    const ids = all.map((position) => position.id);
    expect(ids).toEqual([...new Set(ids)]);
  });

  it("never ships a sweep with fewer than two answers", () => {
    for (const position of all.filter((p) => p.type === "sweep")) {
      expect(position.targets.length, position.id).toBeGreaterThan(1);
    }
  });
});
