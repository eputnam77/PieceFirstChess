/**
 * The two things that make a multiple-choice rep worth anything: it grades
 * honestly, and it explains every answer once the question is decided —
 * including the one you nearly picked.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import StepDrill from "@pf/step-drill.jsx";

const POSITION = {
  type: "stepdrill",
  id: "pf5-demo",
  pfStep: "PF5",
  fen: "r1bqkb1r/pp1n1ppp/2n1p3/3pP3/3P4/3B4/PP1NNPPP/R1BQK2R b KQkq - 0 8",
  orientation: "black",
  lastMove: "cxd4",
  prompt: "Which of your pieces is worst placed?",
  choices: [
    {
      id: "a",
      label: "The c8 bishop — it has no legal move at all.",
      correct: true,
      explanation: "The French problem bishop.",
    },
    {
      id: "b",
      label: "The queen on d8.",
      correct: false,
      explanation: "It has plenty of squares.",
    },
  ],
};

const setup = (position = POSITION) => {
  const handlers = { onMiss: vi.fn(), onHelp: vi.fn(), onResolve: vi.fn() };
  render(<StepDrill position={position} {...handlers} />);
  return { handlers, user: userEvent.setup() };
};

describe("StepDrill", () => {
  it("resolves solved on the right answer and reports no miss", async () => {
    const { handlers, user } = setup();
    await user.click(screen.getByText(POSITION.choices[0].label));

    expect(handlers.onResolve).toHaveBeenCalledWith("solved");
    expect(handlers.onMiss).not.toHaveBeenCalled();
    expect(screen.getByText("Correct")).toBeTruthy();
  });

  it("counts a wrong answer as a miss", async () => {
    const { handlers, user } = setup();
    await user.click(screen.getByText(POSITION.choices[1].label));

    expect(handlers.onMiss).toHaveBeenCalledTimes(1);
    expect(handlers.onResolve).toHaveBeenCalledWith("revealed");
  });

  it("explains every answer once the question is decided, not before", async () => {
    const { user } = setup();
    expect(screen.queryByText("It has plenty of squares.")).toBeNull();

    await user.click(screen.getByText(POSITION.choices[0].label));
    expect(screen.getByText("It has plenty of squares.")).toBeTruthy();
    expect(screen.getByText("The French problem bishop.")).toBeTruthy();
  });

  it("cannot be answered twice", async () => {
    const { handlers, user } = setup();
    await user.click(screen.getByText(POSITION.choices[1].label));
    await user.click(screen.getByText(POSITION.choices[0].label));

    expect(handlers.onResolve).toHaveBeenCalledTimes(1);
  });

  it("counts giving up as both help and a miss", async () => {
    const { handlers, user } = setup();
    await user.click(screen.getByText("Show me"));

    expect(handlers.onHelp).toHaveBeenCalledTimes(1);
    expect(handlers.onMiss).toHaveBeenCalledTimes(1);
    expect(handlers.onResolve).toHaveBeenCalledWith("revealed");
    expect(screen.getByText("Answer shown")).toBeTruthy();
  });
});
