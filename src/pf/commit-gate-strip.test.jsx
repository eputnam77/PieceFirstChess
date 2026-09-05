/**
 * The gate's two hard rules, exercised through the component rather than
 * asserted in a docstring:
 *
 * 1. predicting never touches a board, and
 * 2. skip is one click.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import CommitGateStrip from "@pf/commit-gate-strip.jsx";

const ITALIAN =
  "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";

const setup = (overrides = {}) => {
  const onCommit = vi.fn();
  const onSkip = vi.fn();
  render(
    <CommitGateStrip
      fen={ITALIAN}
      onCommit={onCommit}
      onSkip={onSkip}
      {...overrides}
    />,
  );
  return {
    onCommit,
    onSkip,
    input: screen.getByLabelText("Your predicted move"),
    user: userEvent.setup(),
  };
};

describe("CommitGateStrip", () => {
  it("asks before it answers", () => {
    setup();
    expect(screen.getByText("Your move first")).toBeTruthy();
  });

  it("renders no board at all — a prediction cannot move a piece (D12)", () => {
    const { container } = render(
      <CommitGateStrip fen={ITALIAN} onCommit={vi.fn()} onSkip={vi.fn()} />,
    );
    // No board, no drag surface, nothing wired to the live game: the only way
    // in is the text input, parsed against a frozen FEN.
    expect(container.querySelectorAll("[data-square]")).toHaveLength(0);
    expect(container.querySelectorAll("img")).toHaveLength(0);
  });

  it("commits a SAN move with its UCI form", async () => {
    const { onCommit, input, user } = setup();
    await user.type(input, "Ng5");
    await user.click(screen.getByRole("button", { name: /commit/i }));

    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0][0]).toMatchObject({
      uci: "f3g5",
      san: "Ng5",
      reasonChip: null,
    });
  });

  it("commits on Enter, because typing a move ends with Enter", async () => {
    const { onCommit, input, user } = setup();
    await user.type(input, "d3{Enter}");
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0][0].uci).toBe("d2d3");
  });

  it("refuses an illegal move without committing anything", async () => {
    const { onCommit, input, user } = setup();
    await user.type(input, "Qh8");
    await user.click(screen.getByRole("button", { name: /commit/i }));

    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText(/Not a legal move here/)).toBeTruthy();
  });

  it("clears the rejection as soon as the learner types again", async () => {
    const { input, user } = setup();
    await user.type(input, "Qh8");
    await user.click(screen.getByRole("button", { name: /commit/i }));
    expect(screen.queryByText(/Not a legal move here/)).toBeTruthy();

    await user.type(input, "x");
    expect(screen.queryByText(/Not a legal move here/)).toBeNull();
  });

  it("skips in one click, with no move typed", async () => {
    const { onSkip, onCommit, user } = setup();
    await user.click(screen.getByRole("button", { name: /skip/i }));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
    // A skip still reports how long it took — that is the pilot's whole point.
    expect(onSkip.mock.calls[0][0]).toHaveProperty("ms");
  });

  it("carries an optional reason chip, and lets it be unset", async () => {
    const { onCommit, input, user } = setup();
    const chip = screen.getByRole("button", { name: /PF3 force/ });

    await user.click(chip);
    await user.click(chip); // a second click unselects
    await user.click(screen.getByRole("button", { name: /PF7 verify/ }));
    await user.type(input, "d3{Enter}");

    expect(onCommit.mock.calls[0][0].reasonChip).toBe("PF7");
  });

  it("cannot be committed empty", async () => {
    const { onCommit, user } = setup();
    await user.click(screen.getByRole("button", { name: /commit/i }));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("changes its copy for Analyze, which shows analysis rather than a move", () => {
    setup({ trigger: "analyze" });
    expect(screen.getByText(/see the analysis/)).toBeTruthy();
  });
});
