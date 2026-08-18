import { Chess } from "chess.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getBestMove } from "@/lib/engine";

const STALEMATE_FEN = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1";
const FOOLS_MATE_FEN =
  "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
// Back-rank mate in one: 1. Rd8#
const MATE_IN_ONE_FEN = "6k1/5ppp/8/8/8/8/8/3R2K1 w - - 0 1";

describe("getBestMove", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("no legal moves", () => {
    it("returns null for a stalemate position", () => {
      // Sanity-check the fixture actually has zero legal moves and is a stalemate.
      const check = new Chess(STALEMATE_FEN);
      expect(check.moves()).toHaveLength(0);
      expect(check.isStalemate()).toBe(true);

      expect(getBestMove(STALEMATE_FEN)).toBeNull();
      expect(getBestMove(STALEMATE_FEN, "easy")).toBeNull();
      expect(getBestMove(STALEMATE_FEN, "hard")).toBeNull();
    });

    it("returns null for a checkmate position", () => {
      const check = new Chess(FOOLS_MATE_FEN);
      expect(check.moves()).toHaveLength(0);
      expect(check.isCheckmate()).toBe(true);

      expect(getBestMove(FOOLS_MATE_FEN)).toBeNull();
    });
  });

  describe("legal move selection per difficulty", () => {
    it.each(["easy", "medium", "hard"])(
      "returns a legal SAN move for difficulty=%s on a mid-game position",
      (difficulty) => {
        const legalMoves = new Chess(START_FEN).moves();
        const move = getBestMove(START_FEN, difficulty);
        expect(typeof move).toBe("string");
        expect(legalMoves).toContain(move);
      },
    );

    it("defaults to medium behavior when no difficulty is passed", () => {
      const legalMoves = new Chess(START_FEN).moves();
      const move = getBestMove(START_FEN);
      expect(legalMoves).toContain(move);
    });
  });

  describe("easy difficulty is pure random selection", () => {
    it("deterministically picks moves[Math.floor(random * length)] with a mocked Math.random", () => {
      const game = new Chess(START_FEN);
      const legalMoves = game.moves();

      const fixedRandom = 0.37;
      vi.spyOn(Math, "random").mockReturnValue(fixedRandom);

      const expectedMove =
        legalMoves[Math.floor(fixedRandom * legalMoves.length)];

      const move = getBestMove(START_FEN, "easy");

      expect(move).toBe(expectedMove);
    });

    it("picks a different index when Math.random returns a different value", () => {
      const game = new Chess(START_FEN);
      const legalMoves = game.moves();

      vi.spyOn(Math, "random").mockReturnValue(0);
      const firstMove = getBestMove(START_FEN, "easy");
      expect(firstMove).toBe(legalMoves[0]);

      vi.spyOn(Math, "random").mockReturnValue(0.999);
      const lastMove = getBestMove(START_FEN, "easy");
      expect(lastMove).toBe(legalMoves[legalMoves.length - 1]);
    });
  });

  describe("minimax difficulties find tactically sound moves", () => {
    it("finds the mating move for medium (depth 2)", () => {
      const move = getBestMove(MATE_IN_ONE_FEN, "medium");
      expect(move).toBe("Rd8#");
    });

    it("finds the mating move for hard (depth 3)", () => {
      const move = getBestMove(MATE_IN_ONE_FEN, "hard");
      expect(move).toBe("Rd8#");
    });

    it("does not blunder into a losing move when a much better one exists", () => {
      // White queen can capture a hanging black queen for free via Qxd8.
      const fen = "3q1k2/8/8/8/8/8/8/3QK3 w - - 0 1";
      const legalMoves = new Chess(fen).moves();
      expect(legalMoves).toContain("Qxd8+");

      const move = getBestMove(fen, "hard");
      expect(legalMoves).toContain(move);
      expect(move).toBe("Qxd8+");
    });
  });

  describe("malformed input", () => {
    it("throws on an invalid FEN string (no try/catch in getBestMove)", () => {
      expect(() => getBestMove("this is not a fen")).toThrow();
    });

    it("throws on a structurally invalid FEN (bad castling rights)", () => {
      expect(() =>
        getBestMove("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w ZZZZ - 0 1"),
      ).toThrow();
    });
  });

  describe("unknown difficulty string", () => {
    it("falls back to hard-depth behavior and still returns a legal move", () => {
      const legalMoves = new Chess(START_FEN).moves();
      const move = getBestMove(START_FEN, "expert");
      expect(legalMoves).toContain(move);
    });

    it("still finds mate-in-one with an unrecognized difficulty label", () => {
      const move = getBestMove(MATE_IN_ONE_FEN, "nonsense");
      expect(move).toBe("Rd8#");
    });
  });
});
