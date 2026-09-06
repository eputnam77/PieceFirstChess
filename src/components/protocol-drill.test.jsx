/**
 * The two things the tier-0 ladder added to this component: a completion
 * problem grades a choice instead of a move, and the scaffold fades.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ProtocolDrill from "@/components/protocol-drill";
import { PROTOCOL_STEPS } from "@/lib/protocol-drills";
import { COMPLETION_POSITIONS, WORKED_EXAMPLE } from "@pf/step-drills.js";

const setup = (position, stage) => {
  const handlers = { onMiss: vi.fn(), onHelp: vi.fn(), onResolve: vi.fn() };
  render(<ProtocolDrill position={position} stage={stage} {...handlers} />);
  return { handlers, user: userEvent.setup() };
};

/** Click through the eight-step walkthrough. */
const walkTheSteps = async (user) => {
  for (let index = 0; index < PROTOCOL_STEPS.length; index++) {
    const next = screen.queryByRole("button", { name: /Next step|Done —/ });
    if (!next) return;
    await user.click(next);
  }
};

describe("the worked example", () => {
  it("shows a filled-in answer under every step at stage 1", async () => {
    const { user } = setup(WORKED_EXAMPLE, 1);
    await walkTheSteps(user);

    for (const answer of Object.values(WORKED_EXAMPLE.stepAnswers)) {
      expect(screen.getByText(answer)).toBeTruthy();
    }
  });

  it("drops the answers at stage 2 but keeps the steps and hints", async () => {
    const { user } = setup(WORKED_EXAMPLE, 2);
    await walkTheSteps(user);

    expect(screen.queryByText(WORKED_EXAMPLE.stepAnswers.PF1)).toBeNull();
    expect(screen.getByText(PROTOCOL_STEPS[0].question)).toBeTruthy();
    expect(screen.getByText(PROTOCOL_STEPS[0].hint)).toBeTruthy();
  });

  it("shows nothing but the board at stage 4", () => {
    setup(WORKED_EXAMPLE, 4);
    expect(screen.queryByText(PROTOCOL_STEPS[0].question)).toBeNull();
    expect(screen.queryByRole("button", { name: /Next step/ })).toBeNull();
    // Straight to "find the move".
    expect(screen.getByRole("button", { name: /Show the move/ })).toBeTruthy();
  });
});

describe("completion problems", () => {
  const [position] = COMPLETION_POSITIONS;
  const answer = position.choices.find((choice) => choice.correct);

  it("fills in seven steps and blanks the one being asked", async () => {
    const { user } = setup(position, 1);
    await walkTheSteps(user);

    for (const filled of Object.values(position.stepAnswers)) {
      expect(screen.getByText(filled)).toBeTruthy();
    }
    expect(screen.getByText("This is the one you supply.")).toBeTruthy();
  });

  it("grades the choice, and never asks for a move", async () => {
    const { handlers, user } = setup(position, 1);
    await walkTheSteps(user);
    await user.click(screen.getByText(answer.label));

    expect(handlers.onResolve).toHaveBeenCalledWith("solved");
    expect(handlers.onMiss).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /Show the move/ })).toBeNull();
  });

  it("counts a wrong choice as a miss", async () => {
    const wrong = position.choices.find((choice) => !choice.correct);
    const { handlers, user } = setup(position, 1);
    await walkTheSteps(user);
    await user.click(screen.getByText(wrong.label));

    expect(handlers.onMiss).toHaveBeenCalledTimes(1);
    expect(handlers.onResolve).toHaveBeenCalledWith("revealed");
  });

  it("keeps its filled-in answers whatever the stage says", async () => {
    // They are the question, not the scaffold — a completion with the answers
    // hidden is just a step drill with no choices.
    const { user } = setup(position, 4);
    await walkTheSteps(user);
    expect(
      screen.getByText(Object.values(position.stepAnswers)[0]),
    ).toBeTruthy();
  });
});
