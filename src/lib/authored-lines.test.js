import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { AUTHORED_LINES } from "@/data/authored-lines";
import {
  AUTHORED_POSITIONS,
  replayAuthored,
  validateAuthoredLines,
} from "@/lib/authored-lines";

describe("authored lines", () => {
  it("are structurally sound", () => {
    expect(validateAuthoredLines()).toEqual([]);
  });

  it("cover Légal's mate, which the importer cannot find", () => {
    // Lichess has no theme for it and the pattern is not decidable from the
    // board, so if this drops out the item has no content at all.
    expect(AUTHORED_POSITIONS["M-11"]?.length).toBeGreaterThan(0);
  });

  it("really do end in checkmate where they claim to", () => {
    for (const entry of AUTHORED_LINES.filter((item) => item.endsInMate)) {
      expect(replayAuthored(entry.line, entry.id).isMate, entry.id).toBe(true);
    }
  });

  it("are playable from the position the student is shown", () => {
    for (const positions of Object.values(AUTHORED_POSITIONS)) {
      for (const position of positions) {
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
    }
  });

  it("end every solution on the student's move", () => {
    for (const positions of Object.values(AUTHORED_POSITIONS)) {
      for (const position of positions) {
        expect(position.solution.length % 2, position.id).toBe(1);
      }
    }
  });
});
