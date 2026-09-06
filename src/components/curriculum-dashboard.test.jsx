/**
 * What step 13 added to the dashboard: a padlock, a sentence naming the key,
 * and — the part that is easy to break later — a lock that still lets you in.
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CurriculumDashboard from "@/components/curriculum-dashboard";
import { getCurriculumStats } from "@/lib/curriculum";

const cards = {};

vi.mock("@/store/use-srs-store", () => ({
  default: () => ({
    cards,
    getStats: () => getCurriculumStats(cards),
    getWeakSteps: () => [],
  }),
}));

const setup = () => {
  const onDrillItem = vi.fn();
  render(
    <CurriculumDashboard
      onClose={vi.fn()}
      onDrillItem={onDrillItem}
      onStartSession={vi.fn()}
      now={Date.now()}
    />,
  );
  return { onDrillItem, user: userEvent.setup() };
};

/** The row for one item id, found through its own Drill button. */
const rowFor = (title) =>
  screen.getByRole("button", { name: `Drill ${title}` }).closest("li");

beforeEach(() => {
  for (const key of Object.keys(cards)) delete cards[key];
});

describe("lock visibility", () => {
  it("names the key on a locked item", () => {
    setup();
    // T-01 sits directly behind the protocol on a fresh deck.
    expect(
      within(rowFor("Knight fork")).getByText(/^Unlocks after /),
    ).toBeTruthy();
  });

  it("says nothing at all on an open one", () => {
    setup();
    const row = rowFor("The PieceFirst 8-step protocol");
    expect(within(row).queryByText(/^Unlocks after /)).toBeNull();
    expect(within(row).queryByLabelText("Locked")).toBeNull();
  });

  it("still lets a locked item be drilled — locks gate the queue, not play", async () => {
    const { onDrillItem, user } = setup();
    const play = screen.getByRole("button", { name: "Drill Knight fork" });

    expect(play.hasAttribute("disabled")).toBe(false);
    await user.click(play);
    expect(onDrillItem).toHaveBeenCalledWith("T-01");
  });

  it("counts what is open in the header", () => {
    setup();
    // Nothing studied yet, so the protocol is the only thing on offer.
    expect(screen.getByText(/1 open now/)).toBeTruthy();
  });

  it("filters to just the locked items, and just the open ones", async () => {
    const { user } = setup();

    await user.click(screen.getByRole("button", { name: "Open now" }));
    expect(rowFor("The PieceFirst 8-step protocol")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Drill Knight fork" }),
    ).toBeNull();

    await user.click(screen.getByRole("button", { name: "Locked" }));
    expect(rowFor("Knight fork")).toBeTruthy();
    expect(
      screen.queryByRole("button", {
        name: "Drill The PieceFirst 8-step protocol",
      }),
    ).toBeNull();
  });
});
