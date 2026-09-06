import { create } from "zustand";

import { getCurriculumStats } from "@/lib/curriculum";
import { mergeIntoTally, rankSteps, tagErrors } from "@/lib/pf-error-log";
import { buildSession, summarizeSession } from "@/lib/session";
import { createCard, reviewCard } from "@/lib/srs";
import {
  clearBands,
  clearCards as clearAllCards,
  clearErrorTally,
  getAllCards,
  getErrorTally,
  putCard,
  putErrorTally,
} from "@/lib/srs-db";
import { readBands, recordBandOutcome } from "@pf/band";

/**
 * Spaced-repetition state for the curriculum.
 *
 * Mirrors `use-progress-store.js`: IndexedDB is the source of truth, this store
 * is the in-memory mirror the UI renders from. Writes update state optimistically
 * so grading feels instant, then persist.
 *
 * It also holds the PieceFirst failure-step tally, because the session builder
 * needs the cards and the tally together to order a queue — keeping them in one
 * store is what closes the loop between playing badly and studying the right
 * thing.
 */
const useSrsStore = create((set, get) => ({
  /** itemId → card */
  cards: {},
  /** `{ weights, games, errors, updatedAt }` from the error log, or null. */
  errorTally: null,
  /** PF step → `{ band, run, reps }`, the adaptive difficulty staircase (D4). */
  bands: {},
  /** Snapshot of the current study queue; null until a session starts. */
  sessionQueue: null,
  isLoading: true,
  error: null,

  fetchCards: async () => {
    set({ isLoading: true, error: null });
    try {
      // `readBands` swallows its own failures and returns {}, which the
      // session builder reads as "no band" — the pre-staircase behaviour.
      const [all, tally, bands] = await Promise.all([
        getAllCards(),
        getErrorTally().catch(() => null),
        readBands(),
      ]);
      const cards = {};
      for (const card of all) cards[card.itemId] = card;
      set({ cards, errorTally: tally, bands, isLoading: false });
    } catch (error) {
      console.error("Failed to load SRS cards:", error);
      // Fall back to an empty deck rather than blocking study entirely.
      set({ cards: {}, isLoading: false, error });
    }
  },

  getCard: (itemId) => get().cards[itemId] ?? null,

  /** PieceFirst step weights for the session builder. */
  getFailureWeights: () => get().errorTally?.weights ?? {},

  /** The steps the learner fails most often, worst first. */
  getWeakSteps: () => rankSteps(get().errorTally?.weights ?? {}),

  /**
   * Fold one resolved position into its step's difficulty band (§81.3, D4).
   *
   * Fire-and-forget from the drill's point of view: the band is read when a
   * session is built, so a write landing a moment later changes nothing on
   * screen. A missed stretch rep returns null and moves nothing, which is the
   * §81.4 rule the caller must not have to remember.
   * @param {string} pfStep the step the item is filed under
   * @param {object} outcome `{ correct, stretch }`
   * @returns {Promise<object|null>} the new band state, or null
   */
  recordBandOutcome: async (pfStep, outcome = {}) => {
    const next = await recordBandOutcome(pfStep, {
      ...outcome,
      state: get().bands[pfStep] ?? null,
    });
    if (next) set((state) => ({ bands: { ...state.bands, [pfStep]: next } }));
    return next;
  },

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

  /**
   * Fold a finished game's errors into the failure-step tally.
   *
   * Called once per analysed game. This is the input side of the feedback loop:
   * what you actually got wrong over the board decides what gets promoted in
   * tomorrow's queue.
   * @param {object[]} blunders entries from `analyzeFullGame().blunders`
   * @param {object} [options] `{ side }` to keep only your own errors
   * @returns {Promise<object|null>} the merged tally, or null on failure
   */
  recordGameErrors: async (blunders = [], options = {}) => {
    const tagged = tagErrors(blunders, options);
    const tally = mergeIntoTally(get().errorTally, tagged);
    set({ errorTally: tally });

    try {
      await putErrorTally(tally);
    } catch (error) {
      console.error("Failed to persist the error tally:", error);
      set({ error });
      return null;
    }
    return tally;
  },

  /** Build today's queue from current state. */
  buildSession: (options = {}) =>
    buildSession({
      cards: Object.values(get().cards),
      failureWeights: get().getFailureWeights(),
      bands: get().bands,
      ...options,
    }),

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
    const sessionQueue = get().buildSession(options);
    set({ sessionQueue });
    return sessionQueue;
  },

  getSessionSummary: (options = {}) =>
    summarizeSession(get().buildSession(options)),

  getStats: () => getCurriculumStats(get().cards),

  clearAll: async () => {
    try {
      await Promise.all([clearAllCards(), clearErrorTally(), clearBands()]);
      set({ cards: {}, errorTally: null, bands: {}, sessionQueue: null });
    } catch (error) {
      console.error("Failed to clear SRS cards:", error);
      set({ error });
    }
  },
}));

export default useSrsStore;
