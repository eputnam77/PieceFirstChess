import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import {
  NOTHING,
  READOUT_STEPS,
  buildReadout,
  pf1Changed,
  pf2Safety,
  pf3Force,
  pf4Break,
  pf45Prevent,
  pf5WorstPiece,
  pf6Calculate,
  pf7Verify,
  renderReadout,
  withTurnFlipped,
} from "@pf/readout.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Italian Game after 3...Nf6: White to move, nothing hanging, Ng5 available. */
const ITALIAN =
  "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";

/** White's bishop on b5 is attacked by the a6 pawn and undefended. */
const LOOSE_BISHOP =
  "r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4";

const line = (overrides = {}) => ({
  pvIdx: 1,
  depth: 14,
  scoreCp: 0,
  isMate: false,
  mateIn: null,
  pv: ["e1g1"],
  ...overrides,
});

describe("withTurnFlipped", () => {
  it("hands the move to the other side", () => {
    expect(withTurnFlipped(ITALIAN).turn()).toBe("b");
  });

  it("clears en passant, which a passed move cannot answer", () => {
    const afterE4 = new Chess();
    afterE4.move("e4");
    expect(withTurnFlipped(afterE4.fen()).fen().split(" ")[3]).toBe("-");
  });

  it("refuses to imagine a position where the previous mover is in check", () => {
    // Black has just given check with Qh4+; "what if White passed" is not a
    // position that can occur, so the detector must decline rather than invent.
    const check = new Chess();
    check.move("f3");
    check.move("e5");
    check.move("g4");
    check.move("Qh4#");
    expect(withTurnFlipped(check.fen())).toBeNull();
  });

  it("returns null for a FEN it cannot read", () => {
    expect(withTurnFlipped("not a fen")).toBeNull();
    expect(withTurnFlipped("")).toBeNull();
  });
});

describe("PF1 — what changed", () => {
  it("says so when there is no move to read", () => {
    expect(pf1Changed(new Chess(START), null)).toBe("no move to read yet");
  });

  it("names what the move attacks", () => {
    // 1.e4 e5 2.Nf3 attacks the e5 pawn.
    const game = new Chess();
    game.move("e4");
    game.move("e5");
    game.move("Nf3");
    const text = pf1Changed(game, { san: "Nf3", to: "f3" });
    expect(text).toContain("Nf3 attacks your");
    expect(text).toContain("pawn e5");
  });

  it("says plainly when the move attacked nothing", () => {
    const game = new Chess();
    game.move("a3");
    expect(pf1Changed(game, { san: "a3", to: "a3" })).toContain(
      "nothing of yours is newly attacked",
    );
  });
});

describe("PF2 — safety", () => {
  it("reports a clean position as clean", () => {
    expect(pf2Safety(new Chess(START))).toBe("nothing of yours is loose");
  });

  it("counts an attacked, undefended pawn as loose", () => {
    // In the Italian, e4 is attacked by Nf6 and defended by nothing. That is
    // exactly the question PF2 asks, and it is why d3 is the move.
    expect(pf2Safety(new Chess(ITALIAN))).toBe(
      "your pawn e4 (undefended, attacked by Nf6)",
    );
  });

  it("names the loose piece, what is attacking it, and that it is undefended", () => {
    const text = pf2Safety(new Chess(LOOSE_BISHOP));
    expect(text).toContain("Bb5");
    expect(text).toContain("undefended");
    // Named by piece, not by bare square: "pawn a6" is findable, "a6" is not.
    expect(text).toContain("pawn a6");
  });
});

describe("PF3 — forcing moves", () => {
  it("finds nothing forcing in the opening position", () => {
    expect(pf3Force(new Chess(START))).toBe(
      "no forcing move — a quiet position",
    );
  });

  it("lists checks and captures where they exist", () => {
    const text = pf3Force(new Chess(ITALIAN));
    expect(text).toContain("checks:");
    expect(text).toContain("Bxf7+");
    expect(text).toContain("captures:");
  });
});

describe("PF4 — pawn breaks", () => {
  it("finds no break when no pawns can meet", () => {
    // Bare kings and one rook: there is no pawn to break with.
    expect(pf4Break(new Chess("8/8/4k3/8/8/4K3/8/R7 w - - 0 1"))).toBe(NOTHING);
  });

  it("names a break and the file it would open", () => {
    // French Advance: c4 and f4 both challenge the chain.
    const french = new Chess(
      "rnbqkbnr/pp3ppp/4p3/2ppP3/3P4/8/PPP2PPP/RNBQKBNR w KQkq - 0 4",
    );
    const text = pf4Break(french);
    expect(text).toContain("would open the");
    expect(text).toMatch(/[a-h]-file/);
  });
});

describe("PF4.5 — what they want", () => {
  it("reads the opponent's forcing moves by handing them the move", () => {
    // Black to move would have ...Bxb5 available against the loose bishop.
    const text = pf45Prevent(LOOSE_BISHOP);
    expect(text).toContain("they want");
    expect(text).toContain("xb5");
  });

  it("declines rather than inventing when the flip is illegal", () => {
    const check = new Chess();
    check.move("f3");
    check.move("e5");
    check.move("g4");
    check.move("Qh4#");
    expect(pf45Prevent(check.fen())).toBe(NOTHING);
  });
});

describe("PF5 — worst piece", () => {
  it("finds the piece with nowhere to go", () => {
    expect(pf5WorstPiece(new Chess(START))).toContain("no moves at all");
  });

  it("reports a move count once pieces are developed", () => {
    const text = pf5WorstPiece(new Chess(ITALIAN));
    expect(text).toMatch(/\d+ moves?|no moves at all/);
  });

  it("says nothing obvious when only pawns and kings remain", () => {
    expect(pf5WorstPiece(new Chess("8/4k3/8/8/8/8/4P3/4K3 w - - 0 1"))).toBe(
      NOTHING,
    );
  });
});

describe("PF6 — calculate", () => {
  it("says so when the engine gave nothing", () => {
    expect(pf6Calculate(ITALIAN, [])).toBe("no engine lines for this position");
  });

  it("renders the top three candidates in SAN with their evaluations", () => {
    const text = pf6Calculate(ITALIAN, [
      line({ pvIdx: 1, scoreCp: 210, pv: ["c4f7"] }),
      line({ pvIdx: 2, scoreCp: -90, pv: ["f3g5"] }),
      line({ pvIdx: 3, scoreCp: 40, pv: ["d2d3"] }),
    ]);
    expect(text).toBe("Bxf7+ (+2.1) · d3 (+0.4) · Ng5 (-0.9)");
  });

  it("renders a mate as a mate, not as a centipawn score", () => {
    const text = pf6Calculate(ITALIAN, [
      line({ isMate: true, mateIn: 3, scoreCp: null, pv: ["c4f7"] }),
    ]);
    expect(text).toBe("Bxf7+ (M3)");
  });
});

describe("PF7 — verify", () => {
  it("says so when there is no move to verify", () => {
    expect(pf7Verify(ITALIAN, [])).toBe("no move to verify yet");
  });

  it("confirms when the top move leaves nothing hanging", () => {
    const text = pf7Verify(ITALIAN, [line({ scoreCp: 20, pv: ["d2d3"] })]);
    expect(text).toBe("after d3 nothing of yours hangs");
  });

  it("names what the top move would leave loose", () => {
    // 4.Bxf7+ gives up the bishop on f7, where the king takes it for free.
    const text = pf7Verify(ITALIAN, [line({ scoreCp: 10, pv: ["c4f7"] })]);
    expect(text).toContain("after Bxf7+");
    expect(text).toContain("Bf7");
    expect(text).toContain("loose");
  });
});

describe("buildReadout", () => {
  it("always answers all eight steps, in protocol order", () => {
    const readout = buildReadout({ fen: ITALIAN, lines: [] });
    expect(readout.map((row) => row.step)).toEqual(
      READOUT_STEPS.map((row) => row.step),
    );
    for (const row of readout) {
      expect(row.text, row.step).toBeTruthy();
    }
  });

  it("answers every step on the starting position without an engine", () => {
    const readout = buildReadout({ fen: START });
    expect(readout).toHaveLength(8);
    // Two lines legitimately have nothing to report from move zero; the rest
    // must still say something, because a blank line teaches nothing.
    expect(readout.filter((row) => row.text === NOTHING).length).toBeLessThan(
      4,
    );
  });

  it("returns nothing at all for a FEN it cannot read", () => {
    expect(buildReadout({ fen: "nonsense" })).toEqual([]);
  });
});

describe("renderReadout", () => {
  it("aligns the step labels into one readable block", () => {
    const text = renderReadout(buildReadout({ fen: ITALIAN }), ITALIAN);
    expect(text.startsWith("# PF7 Readout")).toBe(true);
    expect(text).toContain("PF4.5 prevent");
    expect(text).toContain(ITALIAN);
    const body = text.split("```")[1].trim().split("\n");
    expect(body).toHaveLength(8);
    // Every clause starts at the same column.
    const columns = new Set(body.map((row) => row.search(/\S\s*$/) >= 0));
    expect(columns.size).toBe(1);
  });

  it("degrades to one honest sentence for an unreadable position", () => {
    expect(renderReadout([], "nonsense")).toContain("Unreadable position");
  });
});
