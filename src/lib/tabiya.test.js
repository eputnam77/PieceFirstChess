import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { TABIYA } from "@/data/tabiya";
import { replayLine, TABIYA_POSITIONS, validateTabiya } from "@/lib/tabiya";

describe("tabiya data", () => {
  it("is structurally sound", () => {
    expect(validateTabiya()).toEqual([]);
  });

  it("covers all eight structures and all fourteen opening cards", () => {
    const ids = TABIYA.map((entry) => entry.id);
    const structures = ids.filter((id) => id.startsWith("S-"));
    const openings = ids.filter((id) => id.startsWith("O-"));
    expect(structures).toHaveLength(8);
    expect(openings).toHaveLength(14);
  });

  it("replays every line to a legal position", () => {
    for (const entry of TABIYA) {
      const { fen } = replayLine(entry.line, entry.id);
      expect(() => new Chess(fen), entry.id).not.toThrow();
    }
  });

  it("starts every line drill on the student's move", () => {
    for (const entry of TABIYA.filter((item) => item.id.startsWith("O-"))) {
      const line = TABIYA_POSITIONS[entry.id].find(
        (position) => position.type === "line",
      );
      expect(line, entry.id).toBeDefined();
      const game = new Chess(line.fen);
      expect(game.turn(), entry.id).toBe(entry.side === "black" ? "b" : "w");
    }
  });

  it("makes every line drill replayable from its own starting position", () => {
    for (const line of Object.values(TABIYA_POSITIONS)
      .flat()
      .filter((position) => position.type === "line")) {
      const game = new Chess(line.fen);
      for (const uci of line.solution) {
        const move = game.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4],
        });
        expect(move, `${line.id}: ${uci}`).toBeTruthy();
      }
    }
  });

  it("does not ask you to memorise your way into a structure", () => {
    // A structure is reached from many openings; the drill that teaches it is
    // the play-out, not a move order.
    for (const entry of TABIYA.filter((item) => item.id.startsWith("S-"))) {
      const kinds = TABIYA_POSITIONS[entry.id].map(
        (position) => position.type,
      );
      expect(kinds, entry.id).not.toContain("line");
      expect(kinds, entry.id).toContain("card");
      expect(kinds, entry.id).toContain("structure");
    }
  });
});

describe("derived drill positions", () => {
  it("gives every opening card a line drill and a plan card", () => {
    for (const entry of TABIYA.filter((item) => item.id.startsWith("O-"))) {
      const kinds = TABIYA_POSITIONS[entry.id].map((position) => position.type);
      expect(kinds, entry.id).toEqual(["line", "card"]);
    }
  });

  it("gives every structure a play-out, and both sides where it matters", () => {
    for (const entry of TABIYA.filter((item) => item.id.startsWith("S-"))) {
      const playOuts = TABIYA_POSITIONS[entry.id].filter(
        (position) => position.type === "structure",
      );
      expect(playOuts.length, entry.id).toBe(entry.bothSides ? 2 : 1);
      for (const playOut of playOuts) {
        expect(playOut.maxMoves, entry.id).toBeGreaterThan(0);
        const game = new Chess(playOut.fen);
        expect(game.turn(), `${entry.id} ${playOut.studentColor}`).toBe(
          playOut.studentColor === "black" ? "b" : "w",
        );
      }
    }
  });

  it("gives every position a stable unique id", () => {
    const ids = Object.values(TABIYA_POSITIONS)
      .flat()
      .map((position) => position.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
