/**
 * The one rule step 14 must not get wrong: a stretch rep is drawn above the
 * learner's band on purpose, so missing it may not cost them anything (§81.4).
 *
 * The board itself is not exercised here — the drill components have their own
 * tests. What is under test is the wiring in `StudyMode`: which misses reach
 * the suggested FSRS grade, and which reach the difficulty staircase.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import StudyMode from "@/components/study-mode";
import { RATING } from "@/lib/srs";

const gradeItem = vi.fn(async () => ({ due: Date.now() + 86_400_000 }));
const recordBandOutcome = vi.fn(async () => null);

/** A puzzle whose only legal-looking answer is wrong, so it can be revealed. */
const puzzle = (id, extra = {}) => ({
  id,
  type: "puzzle",
  fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
  orientation: "white",
  solution: ["f3g5"],
  rating: 1200,
  ...extra,
});

let queue = [];

// react-chessboard measures its own squares on mount and throws "Square width
// not found" under happy-dom as soon as a re-render touches the board. The
// board is not what this file is testing, so it is stubbed out.
vi.mock("react-chessboard", () => ({
  Chessboard: ({ options }) => <div data-testid="board" id={options?.id} />,
}));

vi.mock("@/store/use-srs-store", () => ({
  default: () => ({
    isLoading: false,
    sessionQueue: queue,
    startSession: vi.fn(),
    gradeItem,
    getWeakSteps: () => [],
    recordBandOutcome,
  }),
}));

const entryWith = (...positions) => [
  {
    kind: "review",
    card: null,
    item: {
      id: "T-01",
      title: "Knight fork",
      pfStep: "PF3",
      summary: "Two targets, one knight.",
    },
    positions,
  },
];

/** Reveal the answer, which the drill reports as a miss plus "revealed". */
const revealIt = async (user) =>
  user.click(screen.getByRole("button", { name: /Show solution/i }));

const setup = () => {
  render(<StudyMode onClose={vi.fn()} itemIds={["T-01"]} />);
  return userEvent.setup();
};

beforeEach(() => {
  gradeItem.mockClear();
  recordBandOutcome.mockClear();
});

describe("a stretch rep", () => {
  it("says outright that it is above the learner's level", () => {
    queue = entryWith(puzzle("p1", { stretch: true }));
    setup();
    expect(screen.getByText("Stretch")).toBeTruthy();
    expect(screen.getByText(/above your level/i)).toBeTruthy();
  });

  it("cannot suggest Again, however badly it goes", async () => {
    queue = entryWith(puzzle("p1", { stretch: true }));
    const user = setup();
    await revealIt(user);

    // The suggested grade is the one carrying the "Suggested" marker. A
    // revealed ordinary position would make that Again; a stretch may not.
    const again = screen.getByRole("button", { name: /Again/ });
    expect(again.textContent).not.toMatch(/Suggested/i);
    await user.click(screen.getByRole("button", { name: /^Good/ }));
    expect(gradeItem).toHaveBeenCalled();
    expect(gradeItem.mock.calls[0][1]).not.toBe(RATING.AGAIN);
  });

  it("reports the miss to the band, which is where it is allowed to count", async () => {
    queue = entryWith(puzzle("p1", { stretch: true }));
    const user = setup();
    await revealIt(user);

    expect(recordBandOutcome).toHaveBeenCalledWith("PF3", {
      correct: false,
      stretch: true,
    });
  });
});

describe("an ordinary rep", () => {
  it("still suggests Again when the answer had to be shown", async () => {
    queue = entryWith(puzzle("p1"));
    const user = setup();
    await revealIt(user);

    const again = screen.getByRole("button", { name: /Again/ });
    expect(again.textContent).toMatch(/Suggested/i);
  });

  it("tells the band it was a miss, not a pass", async () => {
    queue = entryWith(puzzle("p1"));
    const user = setup();
    await revealIt(user);

    expect(recordBandOutcome).toHaveBeenCalledWith("PF3", {
      correct: false,
      stretch: false,
    });
  });

  it("leaves the band alone for a position with no rating", async () => {
    // An authored drill, an endgame or a tabiya card has no difficulty for the
    // staircase to read, so folding it in would make the number meaningless.
    queue = entryWith(puzzle("p1", { rating: undefined }));
    const user = setup();
    await revealIt(user);

    expect(recordBandOutcome).not.toHaveBeenCalled();
  });
});
