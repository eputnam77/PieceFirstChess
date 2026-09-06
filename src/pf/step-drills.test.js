import { Chess } from "chess.js";
import { describe, expect, it } from "vitest";

import { PF_STEPS } from "@/data/curriculum";
import { replayLine } from "@pf/notation.js";
import { pf5WorstPiece, withTurnFlipped } from "@pf/readout.js";
import {
  ANNOTATED_POSITIONS,
  COMPLETION_POSITIONS,
  CUE_POSITIONS,
  LADDER_POSITIONS,
  LADDER_STEPS,
  STEP_DRILL_POSITIONS,
  WORKED_EXAMPLE,
} from "@pf/step-drills.js";

/**
 * Assert one authored claim against the board.
 *
 * This is the whole reason the content is written as lines and claims rather
 * than as prose: none of it is engine-certifiable, so the mechanical half of
 * every answer has to be checkable here or it is checkable nowhere.
 */
const expectClaim = (position, claim) => {
  const label = position.id;
  for (const san of claim.moves ?? []) {
    const game = new Chess(position.fen);
    expect(game.move(san), `${label}: ${san} should be legal`).toBeTruthy();
  }
  for (const san of claim.theirMoves ?? []) {
    const flipped = withTurnFlipped(position.fen);
    expect(flipped, `${label}: turn cannot be handed over`).not.toBeNull();
    expect(
      flipped.move(san),
      `${label}: ${san} should be legal for the opponent`,
    ).toBeTruthy();
  }
  if (claim.worstPiece) {
    // The drill and the app's own PF5 detector must not tell a learner two
    // different things about the same board.
    const said = pf5WorstPiece(new Chess(position.fen));
    expect(said, `${label}: worst piece`).toContain(claim.worstPiece);
  }
};

describe("annotated positions", () => {
  it("replay from a line rather than a hand-typed FEN", () => {
    for (const entry of ANNOTATED_POSITIONS) {
      expect(replayLine(entry.line).fen(), entry.id).toBe(entry.fen);
    }
  });

  it("make lastMove true by construction", () => {
    for (const entry of ANNOTATED_POSITIONS) {
      expect(entry.lastMove, entry.id).toBe(entry.line.at(-1));

      // The line ends on the opponent's move, because the drill starts on the
      // learner's. If that were not so, PF1 would be asking about their own
      // move.
      const before = replayLine(entry.line.slice(0, -1));
      expect(before.turn(), entry.id).not.toBe(replayLine(entry.line).turn());
    }
  });

  it("answer all eight steps", () => {
    for (const entry of ANNOTATED_POSITIONS) {
      expect(Object.keys(entry.stepAnswers).sort(), entry.id).toEqual(
        Object.keys(PF_STEPS).sort(),
      );
      for (const [step, answer] of Object.entries(entry.stepAnswers)) {
        expect(answer.length, `${entry.id} ${step}`).toBeGreaterThan(20);
      }
    }
  });

  it("orient the board towards whoever is on move", () => {
    for (const entry of ANNOTATED_POSITIONS) {
      const expected = entry.fen.split(" ")[1] === "b" ? "black" : "white";
      expect(entry.orientation, entry.id).toBe(expected);
    }
  });
});

describe("the worked example", () => {
  it("is a protocol position carrying every answer", () => {
    expect(WORKED_EXAMPLE.type).toBe("protocol");
    expect(Object.keys(WORKED_EXAMPLE.stepAnswers)).toHaveLength(8);
    expect(WORKED_EXAMPLE.worked).toBe(true);
  });

  it("ends on a move the learner has to find", () => {
    // Odd ply count: the line alternates learner, opponent, learner.
    expect(WORKED_EXAMPLE.solution.length % 2).toBe(1);
    const game = new Chess(WORKED_EXAMPLE.fen);
    for (const uci of WORKED_EXAMPLE.solution) {
      expect(
        game.move({
          from: uci.slice(0, 2),
          to: uci.slice(2, 4),
          promotion: uci[4],
        }),
        uci,
      ).toBeTruthy();
    }
    expect(WORKED_EXAMPLE.answerSan).toBe("Nxf7");
  });
});

describe("completion problems", () => {
  it("cover every ladder step from more than one position", () => {
    const sources = new Set(
      COMPLETION_POSITIONS.map((position) => position.id.split("-")[1]),
    );
    expect(sources.size).toBeGreaterThan(1);
    for (const step of LADDER_STEPS) {
      const forStep = COMPLETION_POSITIONS.filter(
        (position) => position.blankStep === step,
      );
      expect(forStep.length, step).toBeGreaterThanOrEqual(2);
    }
  });

  it("blank exactly one step and fill in the other seven", () => {
    for (const position of COMPLETION_POSITIONS) {
      const shown = Object.keys(position.stepAnswers);
      expect(shown, position.id).toHaveLength(7);
      expect(shown, position.id).not.toContain(position.blankStep);
    }
  });

  it("offer exactly one correct answer, and it is the missing one", () => {
    for (const position of COMPLETION_POSITIONS) {
      const correct = position.choices.filter((choice) => choice.correct);
      expect(correct, position.id).toHaveLength(1);

      const source = ANNOTATED_POSITIONS.find(
        (entry) => entry.fen === position.fen,
      );
      expect(correct[0].label, position.id).toBe(
        source.stepAnswers[position.blankStep],
      );
    }
  });

  it("carry no solution — a completion grades the answer, not a move", () => {
    // This is also what keeps the type out of `ENGINE_TYPES` in
    // `verify:drills`: there is no move for a search to adjudicate.
    for (const position of COMPLETION_POSITIONS) {
      expect(position.solution, position.id).toBeUndefined();
    }
  });

  it("does not always put the correct answer first", () => {
    const firsts = COMPLETION_POSITIONS.filter(
      (position) => position.choices[0].correct,
    );
    expect(firsts.length).toBeLessThan(COMPLETION_POSITIONS.length);
  });
});

describe("step drills", () => {
  it("cover the five steps that had no dedicated drill", () => {
    for (const step of LADDER_STEPS) {
      const forStep = STEP_DRILL_POSITIONS.filter(
        (position) => position.pfStep === step,
      );
      expect(forStep.length, step).toBeGreaterThanOrEqual(3);
    }
  });

  it("leave PF2, PF3 and PF7 alone — they are drilled elsewhere", () => {
    // sweep, tiers 1–2, and blundercheck respectively. Authoring content for
    // them here would duplicate drills that already exist and are cheaper.
    const steps = new Set(
      STEP_DRILL_POSITIONS.map((position) => position.pfStep),
    );
    expect([...steps].sort()).toEqual([...LADDER_STEPS].sort());
  });

  it("replay from a line and are legal positions", () => {
    for (const position of STEP_DRILL_POSITIONS) {
      expect(replayLine(position.line).fen(), position.id).toBe(position.fen);
    }
  });

  it("offer one correct answer and an explanation for every answer", () => {
    for (const position of STEP_DRILL_POSITIONS) {
      const correct = position.choices.filter((choice) => choice.correct);
      expect(correct, position.id).toHaveLength(1);
      expect(position.choices.length, position.id).toBeGreaterThanOrEqual(3);
      for (const choice of position.choices) {
        expect(choice.explanation, `${position.id} ${choice.id}`).toBeTruthy();
      }
    }
  });

  it("make only claims that hold on the board", () => {
    let checked = 0;
    for (const position of STEP_DRILL_POSITIONS) {
      for (const choice of position.choices) {
        if (!choice.claim) continue;
        expectClaim(position, choice.claim);
        checked++;
      }
    }
    // Every correct answer carries one; a silent zero here would mean the
    // whole check had quietly stopped running.
    expect(checked).toBe(STEP_DRILL_POSITIONS.length);
  });
});

describe("cue drills", () => {
  it("answer with a step the classifier can defend", () => {
    // PF5 is the classifier's "nothing material was at stake" fallback and PF3
    // and PF6 need a best move a blunder-check row does not carry, so a
    // generated cue may only be PF7 or PF2.
    const generated = CUE_POSITIONS.filter(
      (position) => position.source === "lichess",
    );
    expect(generated.length).toBeGreaterThan(0);
    for (const position of generated) {
      expect(["PF7", "PF2"], position.id).toContain(position.pfStep);
    }
  });

  it("offer the eight steps, one of them correct", () => {
    for (const position of CUE_POSITIONS) {
      expect(position.choices, position.id).toHaveLength(8);
      const correct = position.choices.filter((choice) => choice.correct);
      expect(correct, position.id).toHaveLength(1);
      expect(correct[0].label, position.id).toContain(position.pfStep);
    }
  });

  it("cover the steps the classifier never returns", () => {
    const authored = CUE_POSITIONS.filter(
      (position) => position.source === "authored",
    ).map((position) => position.pfStep);
    expect(authored).toContain("PF4");
    expect(authored).toContain("PF4.5");
  });

  it("show a position the played move is legal in", () => {
    for (const position of CUE_POSITIONS.filter((entry) => entry.playedSan)) {
      const game = new Chess(position.fen);
      expect(game.move(position.playedSan), position.id).toBeTruthy();
    }
  });
});

describe("the ladder", () => {
  it("runs worked example, completion, step drill, cue", () => {
    expect(LADDER_POSITIONS[0]).toBe(WORKED_EXAMPLE);
    const order = LADDER_POSITIONS.map((position) => position.type);
    expect(order.indexOf("completion")).toBeLessThan(order.indexOf("stepdrill"));
    expect(order.indexOf("stepdrill")).toBeLessThan(order.indexOf("cue"));
  });

  it("gives every position a unique id", () => {
    const ids = LADDER_POSITIONS.map((position) => position.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks hand-authored content as authored", () => {
    for (const position of LADDER_POSITIONS) {
      expect(["authored", "lichess"], position.id).toContain(position.source);
    }
  });
});
