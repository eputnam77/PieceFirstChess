import { create } from "zustand";

import { getCurriculumStats } from "@/lib/curriculum";
import { buildSession, summarizeSession } from "@/lib/session";
import { createCard, reviewCard } from "@/lib/srs";
import {
  clearCards as clearAllCards,
  getAllCards,
  putCard,
} from "@/lib/srs-db";

/**
 * Spaced-repetition state for the curriculum.
 *
 * Mirrors `use-progress-store.js`: IndexedDB is the source of truth, this store
 * is the in-memory mirror the UI renders from. Writes update state optimistically
 * so grading feels instant, then persist.
 */
const useSrsStore = create((set, get) => ({
  /** itemId → card */
  cards: {},
  /** Snapshot of the current study queue; null until a session starts. */
  sessionQueue: null,
  isLoading: true,
  error: null,

  fetchCards: async () => {
    set({ isLoading: true, error: null });
    try {
      const all = await getAllCards();
      const cards = {};
      for (const card of all) cards[card.itemId] = card;
      set({ cards, isLoading: false });
    } catch (error) {
      console.error("Failed to load SRS cards:", error);
      // Fall back to an empty deck rather than blocking study entirely.
      set({ cards: {}, isLoading: false, error });
    }
  },

  getCard: (itemId) => get().cards[itemId] ?? null,

  /**
   * Grade an item and schedule its next review.
   * @param {string} itemId curriculum item id
   * @param {number} rating RATING.AGAIN | HARD | GOOD | EASY
   * @param {number} [now] review timestamp
   * @returns {Promise<object|null>} the updated card, or null on failure
   */
  gradeItem: async (itemId, rating, now = Date.now()) => {
    const existing = get().cards[itemId] ?? createCard(itemId, now);
    const { card } = reviewCard(existing, rating, now);

    set((state) => ({ cards: { ...state.cards, [itemId]: card } }));

    try {
      await putCard(card);
    } catch (error) {
      console.error("Failed to persist SRS card:", error);
      set({ error });
      return null;
    }
    return card;
  },

  /** Build today's queue from current state. */
  buildSession: (options = {}) =>
    buildSession({ cards: Object.values(get().cards), ...options }),

  /**
   * Load cards and snapshot a study queue.
   *
   * The queue is snapshotted rather than derived so grading an item does not
   * make it vanish from under the learner mid-session.
   * @param {object} [options] passed through to `buildSession`
   * @returns {Promise<object[]>} the queue that was built
   */
  startSession: async (options = {}) => {
    await get().fetchCards();
    const sessionQueue = buildSession({
      cards: Object.values(get().cards),
      ...options,
    });
    set({ sessionQueue });
    return sessionQueue;
  },

  getSessionSummary: (options = {}) =>
    summarizeSession(
      buildSession({ cards: Object.values(get().cards), ...options }),
    ),

  getStats: () => getCurriculumStats(get().cards),

  clearAll: async () => {
    try {
      await clearAllCards();
      set({ cards: {} });
    } catch (error) {
      console.error("Failed to clear SRS cards:", error);
      set({ error });
    }
  },
}));

export default useSrsStore;
