/**
 * The behaviour that makes `sweep` worth building: partial credit, and a wrong
 * click costing as much as a miss.
 *
 * The board is `react-chessboard`, so these drive the component through its
 * rendered squares rather than mocking the library — a mocked board would test
 * the mock.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ScanDrill from "@pf/scan-drill.jsx";

/** Three loose white pieces: the queen on b3, the rook on f1, the knight e7. */
const SWEEP = {
  type: "sweep",
  id: "s1",
  fen: "r2q1r1k/4N1bp/p2p2p1/2p3N1/Pp4P1/1Q5P/1P1n1P2/5RK1 w - - 1 22",
  rule: "loose-material",
  targets: ["b3", "f1", "e7"],
  prompt: "Click **every** piece of yours the opponent can win material from.",
  orientation: "white",
};

const SCAN = { ...SWEEP, type: "scan", id: "s2", targets: ["b3"] };

const setup = (position = SWEEP) => {
  const handlers = {
    onMiss: vi.fn(),
    onHelp: vi.fn(),
    onResolve: vi.fn(),
  };
  const { container } = render(<ScanDrill position={position} {...handlers} />);
  /** Click one square on the rendered board. */
  const clickSquare = async (user, square) => {
    const element = container.querySelector(`[data-square="${square}"]`);
    if (!element) throw new Error(`no square ${square} on the board`);
    await user.click(element);
  };
  return { ...handlers, container, clickSquare, user: userEvent.setup() };
};

describe("ScanDrill", () => {
  it("shows the prompt without its markdown emphasis", () => {
    setup();
    expect(
      screen.getByText(
        "Click every piece of yours the opponent can win material from.",
      ),
    ).toBeTruthy();
  });

  it("marks a complete sweep correct", async () => {
    const { user, clickSquare, onResolve, onMiss } = setup();
    for (const square of ["b3", "f1", "e7"]) await clickSquare(user, square);
    await user.click(screen.getByRole("button", { name: /check/i }));

    expect(onResolve).toHaveBeenCalledWith("solved");
    expect(onMiss).not.toHaveBeenCalled();
    expect(screen.getByText(/All 3 of them/)).toBeTruthy();
  });

  it("gives partial credit and names the square that was missed", async () => {
    const { user, clickSquare, onResolve, onMiss } = setup();
    await clickSquare(user, "b3");
    await clickSquare(user, "f1");
    await user.click(screen.getByRole("button", { name: /check/i }));

    expect(onResolve).toHaveBeenCalledWith("wrong");
    expect(onMiss).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/missed e7/)).toBeTruthy();
    expect(screen.getByText(/67%/)).toBeTruthy();
  });

  it("charges a wrong click, so clicking everything does not score full marks", async () => {
    const { user, clickSquare } = setup();
    for (const square of ["b3", "f1", "e7", "a1", "h1"]) {
      await clickSquare(user, square);
    }
    await user.click(screen.getByRole("button", { name: /check/i }));
    expect(screen.getByText(/33%/)).toBeTruthy();
  });

  it("lets a click be taken back before checking", async () => {
    const { user, clickSquare } = setup();
    await clickSquare(user, "b3");
    expect(screen.getByText(/1 selected/)).toBeTruthy();
    await clickSquare(user, "b3");
    expect(screen.getByText(/Click every square that qualifies/)).toBeTruthy();
  });

  it("replaces rather than adds on a scan, where there is one answer", async () => {
    const { user, clickSquare, onResolve } = setup(SCAN);
    await clickSquare(user, "a1"); // a wrong first guess
    await clickSquare(user, "b3"); // changed mind
    await user.click(screen.getByRole("button", { name: /check/i }));

    // A second click must not read as a wrong answer alongside the right one.
    expect(onResolve).toHaveBeenCalledWith("solved");
    expect(screen.getByText("Found it.")).toBeTruthy();
  });

  it("cannot be checked with nothing selected", async () => {
    const { user, onResolve } = setup();
    await user.click(screen.getByRole("button", { name: /check/i }));
    expect(onResolve).not.toHaveBeenCalled();
  });

  it("counts a reveal as help and as a miss", async () => {
    const { user, onHelp, onMiss, onResolve } = setup();
    await user.click(screen.getByRole("button", { name: /show me/i }));

    expect(onHelp).toHaveBeenCalledTimes(1);
    expect(onMiss).toHaveBeenCalledTimes(1);
    expect(onResolve).toHaveBeenCalledWith("revealed");
  });

  it("stops accepting clicks once it is finished", async () => {
    const { user, clickSquare, onResolve } = setup();
    await clickSquare(user, "b3");
    await user.click(screen.getByRole("button", { name: /check/i }));
    expect(onResolve).toHaveBeenCalledTimes(1);

    // The buttons are gone and further clicks change nothing.
    expect(screen.queryByRole("button", { name: /check/i })).toBeNull();
    await clickSquare(user, "f1");
    expect(onResolve).toHaveBeenCalledTimes(1);
  });
});
