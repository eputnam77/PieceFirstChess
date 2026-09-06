import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { PF_STEPS } from "@/data/curriculum";
import { LICHESS_BLUNDER_CHECKS } from "@/data/lichess-positions";
import {
  PROTOCOL_POSITIONS,
  PROTOCOL_STEPS,
  toSan,
} from "@/lib/protocol-drills";

const byType = (type) =>
  PROTOCOL_POSITIONS.filter((position) => position.type === type);

describe("protocol step list", () => {
  it("covers all eight steps in order, including PF4.5 PREVENT", () => {
    expect(PROTOCOL_STEPS.map((step) => step.key)).toEqual(
      Object.keys(PF_STEPS),
    );
    expect(PROTOCOL_STEPS).toHaveLength(8);
    expect(PROTOCOL_STEPS.map((step) => step.key)).toContain("PF4.5");
  });

  it("splits each step into a name and a question", () => {
    for (const step of PROTOCOL_STEPS) {
      expect(step.name, step.key).toBeTruthy();
      expect(step.question, step.key).toBeTruthy();
    }
  });
});

describe("blunder-check drills", () => {
  const checks = byType("blundercheck");

  it("exist in quantity", () => {
    expect(checks.length).toBeGreaterThanOrEqual(20);
  });

  it("are not answerable by always saying the move is unsafe", () => {
    const unsafe = checks.filter((check) => !check.safe).length;
    const safe = checks.filter((check) => check.safe).length;
    expect(safe).toBeGreaterThan(0);
    expect(unsafe).toBeGreaterThan(0);
    // Neither answer may be more than three quarters of the deck.
    expect(safe / checks.length).toBeLessThan(0.75);
    expect(unsafe / checks.length).toBeLessThan(0.75);
  });

  it("offer a candidate move that is legal in the position shown", () => {
    for (const check of checks) {
      const game = new Chess(check.fen);
      const move = game.move({
        from: check.candidate.slice(0, 2),
        to: check.candidate.slice(2, 4),
        promotion: check.candidate[4],
      });
      expect(move, check.id).toBeTruthy();
      expect(check.candidateSan, check.id).toBe(move.san);
    }
  });

  it("attach a legal refutation to every unsafe move", () => {
    for (const check of checks.filter((entry) => !entry.safe)) {
      expect(check.refutation, check.id).toBeTruthy();

      const game = new Chess(check.fen);
      game.move({
        from: check.candidate.slice(0, 2),
        to: check.candidate.slice(2, 4),
        promotion: check.candidate[4],
      });
      const punish = game.move({
        from: check.refutation.slice(0, 2),
        to: check.refutation.slice(2, 4),
        promotion: check.refutation[4],
      });
      expect(punish, `${check.id} refutation`).toBeTruthy();
      expect(check.refutationSan, check.id).toBe(punish.san);
    }
  });

  it("orients the board towards whoever is on move", () => {
    for (const check of checks) {
      const expected = check.fen.split(" ")[1] === "b" ? "black" : "white";
      expect(check.orientation, check.id).toBe(expected);
    }
  });
});

describe("the tier-0 deck", () => {
  it("opens on the worked example", () => {
    // Rung 1. The one position in the item where the learner is shown the
    // answers, and it has to be the first thing they see or it is not a worked
    // example, it is a hint.
    const [first] = PROTOCOL_POSITIONS;
    expect(first.type).toBe("protocol");
    expect(Object.keys(first.stepAnswers ?? {})).toHaveLength(8);
  });

  it("puts a blunder check in every sitting, ladder or not", () => {
    // The session builder shows three positions per sitting. The ladder is
    // thirty-odd positions, so running it as one block would mean a dozen
    // sittings with no PF7 rep in them — and PF7 is the step club players
    // actually lose to. One check every third position keeps the rung order
    // and keeps the reps flowing.
    for (let start = 0; start + 3 <= 30; start += 3) {
      const sitting = PROTOCOL_POSITIONS.slice(start, start + 3).map(
        (position) => position.type,
      );
      expect(sitting, `sitting at ${start}`).toContain("blundercheck");
    }
  });

  it("runs the ladder in rung order before the rehearsal tail", () => {
    const types = PROTOCOL_POSITIONS.map((position) => position.type);
    const firstOf = (type) => types.indexOf(type);
    expect(firstOf("completion")).toBeLessThan(firstOf("stepdrill"));
    expect(firstOf("stepdrill")).toBeLessThan(firstOf("cue"));
    // The six imported rehearsals are the unlabelled tail; they come last.
    const lastLadder = Math.max(
      types.lastIndexOf("completion"),
      types.lastIndexOf("stepdrill"),
      types.lastIndexOf("cue"),
    );
    const rehearsals = PROTOCOL_POSITIONS.map((position, index) =>
      position.type === "protocol" && position.source === "lichess"
        ? index
        : -1,
    ).filter((index) => index >= 0);
    expect(Math.min(...rehearsals)).toBeGreaterThan(lastLadder);
  });

  it("gives every position a unique id", () => {
    const ids = PROTOCOL_POSITIONS.map((position) => position.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("loses nothing in the interleave", () => {
    expect(PROTOCOL_POSITIONS).toHaveLength(
      byType("protocol").length +
        byType("blundercheck").length +
        byType("completion").length +
        byType("stepdrill").length +
        byType("cue").length,
    );
  });

  it("uses every blunder check exactly once", () => {
    // The ladder consumes checks and the tail interleaves what is left. An
    // off-by-one in either would duplicate a rep or silently drop one.
    const ids = byType("blundercheck").map((position) => position.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(LICHESS_BLUNDER_CHECKS.length);
  });
});

describe("protocol rehearsals", () => {
  const rehearsals = byType("protocol");

  it("draw positions from more than one motif", () => {
    expect(rehearsals.length).toBeGreaterThanOrEqual(4);
    // The worked example is the Fried Liver and the six imported rehearsals
    // are one motif each, so every motif in the deck is distinct.
    expect(new Set(rehearsals.map((entry) => entry.motif)).size).toBe(
      rehearsals.length,
    );
  });

  it("end on a move the student has to find", () => {
    for (const rehearsal of rehearsals) {
      expect(rehearsal.solution.length % 2, rehearsal.id).toBe(1);
      expect(rehearsal.answerSan, rehearsal.id).toBeTruthy();

      const game = new Chess(rehearsal.fen);
      for (const uci of rehearsal.solution) {
        expect(
          game.move({
            from: uci.slice(0, 2),
            to: uci.slice(2, 4),
            promotion: uci[4],
          }),
          `${rehearsal.id} ${uci}`,
        ).toBeTruthy();
      }
    }
  });
});

describe("toSan", () => {
  it("converts a legal move", () => {
    expect(toSan("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a1a8")).toBe("Ra8+");
  });

  it("falls back to the UCI rather than throwing", () => {
    expect(toSan("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "h1h8")).toBe("h1h8");
    expect(toSan("nonsense", "a1a8")).toBe("a1a8");
  });
});
