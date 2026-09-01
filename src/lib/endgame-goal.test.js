import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { ENDGAME_DRILLS, GOAL } from "@/data/endgame-drills";
import {
  evaluateOutcome,
  explainReason,
  movesRemaining,
  OUTCOME,
  REASON,
} from "@/lib/endgame-goal";

const winDrill = { goal: GOAL.WIN, studentColor: "white", maxMoves: 20 };
const holdDrill = { goal: GOAL.HOLD, studentColor: "white", maxMoves: 20 };
const blackWinDrill = { goal: GOAL.WIN, studentColor: "black", maxMoves: 20 };

/** Scholar's mate: Black is checkmated, so White delivered it. */
const BLACK_MATED =
  "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4";
/** Fool's mate: White is checkmated. */
const WHITE_MATED =
  "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3";
const STALEMATE = "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1";
const INSUFFICIENT = "7k/8/6K1/8/8/8/8/7B b - - 0 1";
const QUIET = "8/8/8/3k4/8/3K4/8/Q7 w - - 0 1";

describe("evaluateOutcome — checkmate", () => {
  it("counts mate delivered by the student as achieved", () => {
    const game = new Chess(BLACK_MATED);
    expect(game.isCheckmate()).toBe(true);

    expect(evaluateOutcome(game, winDrill, 5)).toEqual({
      outcome: OUTCOME.ACHIEVED,
      reason: REASON.CHECKMATE_DELIVERED,
    });
  });

  it("counts mate delivered even when the goal was only to hold", () => {
    // Winning is strictly better than holding, so this must not be a failure.
    const game = new Chess(BLACK_MATED);
    expect(evaluateOutcome(game, holdDrill, 5).outcome).toBe(OUTCOME.ACHIEVED);
  });

  it("counts being mated as failed", () => {
    const game = new Chess(WHITE_MATED);
    expect(game.isCheckmate()).toBe(true);

    expect(evaluateOutcome(game, winDrill, 5)).toEqual({
      outcome: OUTCOME.FAILED,
      reason: REASON.CHECKMATED,
    });
  });

  it("reads the mated side correctly when the student is Black", () => {
    // Black is mated here, so a Black student failed.
    const game = new Chess(BLACK_MATED);
    expect(evaluateOutcome(game, blackWinDrill, 5).outcome).toBe(
      OUTCOME.FAILED,
    );
  });
});

describe("evaluateOutcome — draws", () => {
  it("treats stalemate as a save when holding", () => {
    const game = new Chess(STALEMATE);
    expect(game.isStalemate()).toBe(true);

    expect(evaluateOutcome(game, holdDrill, 5)).toEqual({
      outcome: OUTCOME.ACHIEVED,
      reason: REASON.STALEMATE,
    });
  });

  it("treats stalemate as a botched conversion when winning", () => {
    // This is exactly the mistake the K+Q vs K drill exists to punish.
    const game = new Chess(STALEMATE);
    expect(evaluateOutcome(game, winDrill, 5)).toEqual({
      outcome: OUTCOME.FAILED,
      reason: REASON.DREW_BUT_NEEDED_WIN,
    });
  });

  it("recognises insufficient material as a hold", () => {
    const game = new Chess(INSUFFICIENT);
    expect(game.isInsufficientMaterial()).toBe(true);

    expect(evaluateOutcome(game, holdDrill, 5)).toEqual({
      outcome: OUTCOME.ACHIEVED,
      reason: REASON.INSUFFICIENT_MATERIAL,
    });
  });

  it("recognises threefold repetition as a hold", () => {
    const game = new Chess("8/8/8/3k4/8/3K4/8/Q7 w - - 0 1");
    // Shuffle the queen and kings back and forth to repeat the position.
    for (let round = 0; round < 2; round++) {
      game.move("Qb1");
      game.move("Kd6");
      game.move("Qa1");
      game.move("Kd5");
    }
    expect(game.isThreefoldRepetition()).toBe(true);

    expect(evaluateOutcome(game, holdDrill, 8)).toEqual({
      outcome: OUTCOME.ACHIEVED,
      reason: REASON.THREEFOLD,
    });
  });
});

describe("evaluateOutcome — move budget", () => {
  it("stays in progress while moves remain", () => {
    const game = new Chess(QUIET);
    expect(evaluateOutcome(game, winDrill, 3)).toEqual({
      outcome: OUTCOME.IN_PROGRESS,
      reason: null,
    });
  });

  it("counts surviving the budget as a successful hold", () => {
    const game = new Chess(QUIET);
    expect(evaluateOutcome(game, holdDrill, 20)).toEqual({
      outcome: OUTCOME.ACHIEVED,
      reason: REASON.BUDGET_SURVIVED,
    });
  });

  it("counts running out of moves as a failed conversion", () => {
    const game = new Chess(QUIET);
    expect(evaluateOutcome(game, winDrill, 20)).toEqual({
      outcome: OUTCOME.FAILED,
      reason: REASON.BUDGET_EXHAUSTED,
    });
  });

  it("does not let the budget override a finished game", () => {
    const game = new Chess(BLACK_MATED);
    expect(evaluateOutcome(game, winDrill, 999).outcome).toBe(OUTCOME.ACHIEVED);
  });
});

describe("movesRemaining", () => {
  it("counts down and never goes negative", () => {
    expect(movesRemaining(winDrill, 0)).toBe(20);
    expect(movesRemaining(winDrill, 15)).toBe(5);
    expect(movesRemaining(winDrill, 40)).toBe(0);
  });
});

describe("explainReason", () => {
  it("has text for every reason", () => {
    for (const reason of Object.values(REASON)) {
      expect(explainReason(reason).length).toBeGreaterThan(0);
    }
  });

  it("returns empty for an unknown reason", () => {
    expect(explainReason("nope")).toBe("");
  });
});

describe("drill dataset", () => {
  it("covers all 18 endgame curriculum items", () => {
    const items = new Set(ENDGAME_DRILLS.map((drill) => drill.itemId));
    for (let index = 1; index <= 18; index++) {
      expect(items).toContain(`E-${String(index).padStart(2, "0")}`);
    }
  });

  it("also serves the two tier-1 items that need a play-out", () => {
    // A stalemate save and a fortress are held over several moves rather than
    // found in one, so they are drilled here even though they are tactics.
    const items = new Set(ENDGAME_DRILLS.map((drill) => drill.itemId));
    expect(items).toContain("T-34");
    expect(items).toContain("T-35");
    expect(items.size).toBe(20);
  });

  it("only uses detectable goals", () => {
    for (const drill of ENDGAME_DRILLS) {
      expect([GOAL.WIN, GOAL.HOLD]).toContain(drill.goal);
    }
  });

  it("starts every drill with the student to move", () => {
    // The verifier enforces this against Stockfish too; this keeps it true
    // without needing an engine in the test run.
    for (const drill of ENDGAME_DRILLS) {
      const sideToMove = drill.fen.split(" ")[1] === "w" ? "white" : "black";
      expect(sideToMove, drill.id).toBe(drill.studentColor);
    }
  });

  it("starts from legal, unfinished positions", () => {
    for (const drill of ENDGAME_DRILLS) {
      const game = new Chess();
      expect(() => game.load(drill.fen), drill.id).not.toThrow();
      expect(game.isGameOver(), drill.id).toBe(false);
      expect(game.moves().length, drill.id).toBeGreaterThan(0);
    }
  });

  it("never leaves the side that just moved in check", () => {
    // An illegal position Stockfish silently refuses to search — this caught
    // two authored FENs during development.
    for (const drill of ENDGAME_DRILLS) {
      const game = new Chess(drill.fen);
      const waiting = game.turn() === "w" ? "b" : "w";
      const king = game
        .board()
        .flat()
        .find(
          (piece) => piece && piece.type === "k" && piece.color === waiting,
        );
      expect(game.isAttacked(king.square, game.turn()), drill.id).toBe(false);
    }
  });

  it("gives every drill a sane move budget and unique id", () => {
    const ids = ENDGAME_DRILLS.map((drill) => drill.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const drill of ENDGAME_DRILLS) {
      expect(drill.maxMoves, drill.id).toBeGreaterThanOrEqual(10);
      expect(drill.maxMoves, drill.id).toBeLessThanOrEqual(60);
      expect(drill.prompt.length, drill.id).toBeGreaterThan(10);
      expect(drill.concept.length, drill.id).toBeGreaterThan(10);
    }
  });
});
