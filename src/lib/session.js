/**
 * Daily study session builder.
 *
 * This is the feature that actually removes the overwhelm: it replaces "what
 * should I study?" with a queue that is already decided. Reviews come first —
 * a pattern you are about to forget is worth more than a new one — then new
 * material, only from items whose prerequisites are met.
 *
 * Pure functions; `now` and the card set are passed in.
 */

import {
  getItem,
  getPositionsForItem,
  getStudyableItems,
} from "@/lib/curriculum";
import { CARD_STATE, isDue } from "@/lib/srs";

/** Stability, in days, at which an item counts as mastered for unlocking. */
const MASTERY_STABILITY_DAYS = 21;

/** Default number of items in one session. */
export const DEFAULT_SESSION_SIZE = 12;

/**
 * Item ids the learner has mastered well enough to unlock what follows.
 * @param {object[]} cards SRS cards
 * @returns {string[]} mastered item ids
 */
export const getMasteredIds = (cards = []) =>
  cards
    .filter(
      (card) =>
        card.state === CARD_STATE.REVIEW &&
        card.stability >= MASTERY_STABILITY_DAYS,
    )
    .map((card) => card.itemId);

/**
 * Build an ordered study queue.
 *
 * Reviews first, most overdue first, then new items in curriculum order.
 * @param {object} [options] builder inputs
 * @param {object[]} [options.cards] existing SRS cards
 * @param {number} [options.now] timestamp used for due checks
 * @param {number} [options.maxItems] cap on queue length
 * @param {boolean} [options.includeNew] whether to append new items
 * @returns {object[]} queue entries: { item, card, positions, kind }
 */
export const buildSession = ({
  cards = [],
  now = Date.now(),
  maxItems = DEFAULT_SESSION_SIZE,
  includeNew = true,
} = {}) => {
  const cardByItemId = new Map(cards.map((card) => [card.itemId, card]));

  const due = cards
    .filter(
      (card) => isDue(card, now) && getPositionsForItem(card.itemId).length > 0,
    )
    .sort((a, b) => a.due - b.due)
    .map((card) => ({
      item: getItem(card.itemId),
      card,
      positions: getPositionsForItem(card.itemId),
      kind: "review",
    }))
    // An item can be dropped from the curriculum while its card lingers.
    .filter((entry) => entry.item !== null);

  if (due.length >= maxItems) return due.slice(0, maxItems);
  if (!includeNew) return due;

  const seen = new Set(due.map((entry) => entry.item.id));
  const fresh = getStudyableItems(getMasteredIds(cards))
    .filter((item) => !seen.has(item.id) && !cardByItemId.has(item.id))
    .map((item) => ({
      item,
      card: null,
      positions: getPositionsForItem(item.id),
      kind: "new",
    }));

  return [...due, ...fresh].slice(0, maxItems);
};

/**
 * Counts for the session header.
 * @param {object[]} queue a built session queue
 * @returns {{total: number, review: number, fresh: number, positions: number}} counts
 */
export const summarizeSession = (queue = []) => ({
  total: queue.length,
  review: queue.filter((entry) => entry.kind === "review").length,
  fresh: queue.filter((entry) => entry.kind === "new").length,
  positions: queue.reduce((sum, entry) => sum + entry.positions.length, 0),
});
