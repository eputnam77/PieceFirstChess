import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { MATCHERS } from "./puzzle-matchers.js";

/**
 * The pattern detectors in the importer decide what the student is taught, and
 * a wrong one files a position under the wrong name — worse than no content at
 * all. These are the archetypal diagrams for each detected pattern, taken from
 * https://en.wikipedia.org/wiki/Checkmate_pattern, so a detector that stops
 * firing (or starts firing on the wrong pattern) fails here.
 */

/** Build the context shape the detectors expect from a FEN plus a UCI line. */
const context = (fen, ucis) => {
  const start = new Chess(fen);
  const replay = new Chess(fen);
  const moves = [];
  let after = null;
  for (const uci of ucis) {
    const played = replay.move({
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
    moves.push(played);
    if (moves.length === 1) after = new Chess(replay.fen());
  }
  return {
    start,
    after,
    final: replay,
    student: start.turn(),
    moves,
    firstMove: moves[0],
  };
};

const matcherFor = (itemId) => MATCHERS.find((m) => m.itemId === itemId);

const MATE_CASES = [
  // Kg8 boxed by its own g7 pawn and f8 rook; Qh7 mates, propped by g6.
  ["M-06", "5rk1/6p1/6P1/7Q/8/8/8/6K1 w - - 0 1", ["h5h7"]],
  // The rooks on d8 and f8 are the epaulettes.
  ["M-07", "3rkr2/8/8/8/8/4Q3/8/6K1 w - - 0 1", ["e3e6"]],
  // Qh5 mates down the h-file; Bc4 takes g8, the g7 pawn takes g7.
  ["M-08", "7k/6p1/8/8/2B5/8/8/6KQ w - - 0 1", ["h1h5"]],
  // Ra8 mates on the rank Rb7 has already cut off.
  ["M-10", "6k1/1R6/8/8/8/8/8/R5K1 w - - 0 1", ["a1a8"]],
  // Qg7 mates in the fianchetto hole, propped by the f6 pawn.
  ["M-12", "r5k1/5p2/5PpQ/8/8/8/8/6K1 w - - 0 1", ["h6g7"]],
  // Bf6 mates on the long diagonal; Rg1 holds the g-file, h7 is Black's own.
  ["M-13", "r6k/7p/8/8/8/8/1B6/1K4R1 w - - 0 1", ["b2f6"]],
  // Morphy's Opera game, final move: Rd8# guarded by Bg5.
  ["M-14", "1n2kb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2KR4 w - - 0 17", ["d1d8"]],
  // Bh7 mates, guarded by Ng5, with Bb2 covering g7 and h8.
  ["M-15", "5rk1/8/8/6N1/8/3B4/1B6/6K1 w - - 0 1", ["d3h7"]],
];

const TACTIC_CASES = [
  // Nd6 hits the king on e8 and the queen on c8.
  ["T-05", "2q1k3/8/8/1N6/8/8/8/6K1 w - - 0 1", ["b5d6"]],
  // Rd4 pins the d5 knight against the queen behind it, not the king.
  ["T-07", "3qk3/8/8/3n4/8/8/8/3RK3 w - - 0 1", ["d1d4"]],
  // The bishop steps aside and the rook behind it delivers the check.
  ["T-12", "4k3/8/8/8/8/4B3/8/4RK2 w - - 0 1", ["e3c5"]],
  // Qe5 lines up in front of Re1, both aimed at the rook on e8.
  ["T-14", "4rk2/8/8/8/8/8/4Q3/4R1K1 w - - 0 1", ["e2e5"]],
  // Rd1 defends the d7 knight through the black rook standing on d5.
  ["T-10", "2k5/3N4/8/3r4/8/8/8/1R4K1 w - - 0 1", ["b1d1"]],
  // The e6 knight is guarding both rooks; Bxe6 removes a piece doing two jobs.
  ["T-17", "3r1rk1/8/4n3/8/2B5/8/8/6K1 w - - 0 1", ["c4e6"]],
  // fxe6 takes the pawn that props up the d5 pawn — the base of the chain.
  ["T-20", "4k3/8/4p3/3p1P2/8/8/8/4K3 w - - 0 1", ["f5e6"]],
  // The d5 knight is lost to the e6 pawn, so it takes on f6 on its way out.
  ["T-26", "6k1/6p1/4pn2/3N4/8/8/8/6K1 w - - 0 1", ["d5f6", "g7f6"]],
  // Rook and bishop windmill: the king shuttles g8/h8 while the rook collects.
  [
    "T-32",
    "r6k/2p2pR1/8/8/8/8/1B6/7K w - - 0 1",
    ["g7f7", "h8g8", "f7g7", "g8h8", "g7c7", "h8g8", "c7g7", "g8h8"],
  ],
  // Two rooks down, White survives by checking on e5 and e6 forever.
  [
    "T-33",
    "r4r1k/7p/8/8/8/8/q3Q1PP/6K1 w - - 0 1",
    ["e2e5", "h8g8", "e5e6", "g8h8", "e6e5", "h8g8"],
  ],
  // Qb2+ must be taken, and then White has no move at all.
  ["T-34", "1Q6/8/8/8/8/2q3p1/5k2/7K w - - 0 1", ["b8b2", "c3b2"]],
  // h3 before the back rank matters: prophylaxis, not tactics.
  ["T-42", "6k1/5ppp/8/8/8/8/5PPP/5RK1 w - - 0 1", ["h2h3"]],
];

describe("mating-pattern detectors", () => {
  for (const [itemId, fen, ucis] of MATE_CASES) {
    it(`recognises the archetype for ${itemId}`, () => {
      const matcher = matcherFor(itemId);
      expect(matcher?.match).toBeTypeOf("function");
      expect(matcher.match(context(fen, ucis))).toBe(true);
    });
  }

  it("does not file one archetype under two patterns", () => {
    for (const [itemId, fen, ucis] of MATE_CASES) {
      const built = context(fen, ucis);
      const claims = MATE_CASES.map(([other]) => other).filter((other) =>
        Boolean(matcherFor(other).match(built)),
      );
      expect(claims, `${itemId} was claimed by ${claims.join(", ")}`).toEqual([
        itemId,
      ]);
    }
  });
});

describe("tactical detectors", () => {
  for (const [itemId, fen, ucis] of TACTIC_CASES) {
    it(`recognises the archetype for ${itemId}`, () => {
      const matcher = matcherFor(itemId);
      expect(matcher?.match).toBeTypeOf("function");
      expect(matcher.match(context(fen, ucis))).toBe(true);
    });
  }

  it("does not call an absolute pin a relative one", () => {
    // Rd4 pins the knight against the king: absolute, so T-07 must decline it.
    const absolute = context("3k4/8/8/3n4/8/8/8/3RK3 w - - 0 1", ["d1d4"]);
    expect(matcherFor("T-07").match(absolute)).toBe(false);
  });

  it("does not call a direct check a discovered one", () => {
    const direct = context("4k3/8/8/8/8/8/8/4RK2 w - - 0 1", ["e1e7"]);
    expect(matcherFor("T-12").match(direct)).toBe(false);
  });
});

describe("matcher table", () => {
  it("gives every matcher a priority so ordering is deterministic", () => {
    for (const matcher of MATCHERS) {
      expect(matcher.priority, matcher.itemId).toBeTypeOf("number");
      expect(matcher.themes.length, matcher.itemId).toBeGreaterThan(0);
    }
  });

  it("only uses the generic mate theme behind a detector", () => {
    for (const matcher of MATCHERS) {
      if (matcher.themes.includes("mate")) {
        expect(matcher.match, matcher.itemId).toBeTypeOf("function");
      }
    }
  });
});
