/**
 * Daily study session builder.
 *
 * This is the feature that actually removes the overwhelm: it replaces "what
 * should I study?" with a queue that is already decided. The order follows
 * `docs/PF7/LEARNING-SYSTEM.md` §3.3:
 *
 *   1. items due for review, most overdue first
 *   2. drills targeting your most frequent PieceFirst failure step
 *   3. one new item, only if its prerequisites are met
 *   4. one endgame or structure play-out to finish
 *
 * Two things make the queue usable rather than merely correct.
 *
 * **It is budgeted in minutes, not items.** Handbook Part XV specifies 60- and
 * 20-minute sessions, so the builder costs each entry by drill type and fills
 * the budget. A play-out against Stockfish is not the same size as a fork.
 *
 * **Each item shows a rotating handful of its positions, not all of them.** Some
 * items have dozens; grinding every one before a single grade would be its own
 * kind of overwhelm. The window advances with the card's review count, so a
 * second review of the same item shows different positions.
 *
 * Pure functions: `now`, the card set and the failure weights are all passed in.
 */

import {
  getItem,
  getPositionsForItem,
  getStudyableItems,
} from "@/lib/curriculum";
import { rankSteps } from "@/lib/pf-error-log";
import { CARD_STATE, isDue } from "@/lib/srs";

/** Stability, in days, at which an item counts as mastered for unlocking. */
const MASTERY_STABILITY_DAYS = 21;

/** Default number of items in one session, when counting rather than timing. */
export const DEFAULT_SESSION_SIZE = 12;

/** Handbook Part XV models. */
export const SESSION_LENGTHS = Object.freeze([
  { minutes: 20, label: "20 min", hint: "Short model" },
  { minutes: 40, label: "40 min", hint: "Half session" },
  { minutes: 60, label: "60 min", hint: "Full model" },
]);

/** Positions shown per item in one sitting. */
export const POSITIONS_PER_ITEM = 3;

/**
 * Rough minutes per position, by drill type.
 *
 * These are estimates, and deliberately generous for the play-outs — a
 * structure or endgame against the engine really does eat several minutes,
 * and a budget that pretended otherwise would overfill every session.
 */
const MINUTES_PER_POSITION = Object.freeze({
  puzzle: 1,
  blundercheck: 0.5,
  protocol: 2,
  line: 1.5,
  card: 2,
  endgame: 5,
  structure: 6,
});

const DEFAULT_MINUTES_PER_POSITION = 1.5;

/** Estimated minutes for one position. */
const costOf = (position) =>
  MINUTES_PER_POSITION[position.type] ?? DEFAULT_MINUTES_PER_POSITION;

/** Estimated minutes for a queue entry. */
export const entryCost = (entry) =>
  entry.positions.reduce((total, position) => total + costOf(position), 0);

/**
 * Item ids the learner has mastered — 21 days of stability in review.
 *
 * This is the dashboard's bar for "mature", and the bar the mastery tests in the
 * curriculum describe. It is deliberately *not* the bar for unlocking: see
 * `getLearnedIds`.
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
 * Item ids that count as learned, for the purpose of unlocking what follows.
 *
 * Prerequisites gate on this rather than on mastery. Gating on 21 days of
 * stability would mean a new learner sees one item — the protocol — and nothing
 * else for three weeks, which is the opposite of what a bounded, finishable
 * curriculum is for. Graduating an item into review is enough to move on; the
 * spacing keeps bringing it back regardless.
 * @param {object[]} cards SRS cards
 * @returns {string[]} learned item ids
 */
export const getLearnedIds = (cards = []) =>
  cards
    .filter(
      (card) =>
        card.state === CARD_STATE.REVIEW ||
        card.state === CARD_STATE.RELEARNING,
    )
    .map((card) => card.itemId);

/**
 * The slice of an item's positions to show this time round.
 *
 * Rotating by review count means repeated reviews of the same item are not
 * repeated reviews of the same three boards — which is the difference between
 * learning a pattern and memorising a position.
 * @param {object[]} positions every position for the item
 * @param {number} reps how many times the item has been reviewed
 * @param {number} [limit] how many to show
 * @returns {object[]} the positions for this sitting
 */
export const selectPositions = (
  positions,
  reps = 0,
  limit = POSITIONS_PER_ITEM,
) => {
  if (positions.length <= limit) return positions;
  const start = (reps * limit) % positions.length;
  const window = positions.slice(start, start + limit);
  // Wrap around rather than returning a short window at the end of the list.
  return window.length === limit
    ? window
    : [...window, ...positions.slice(0, limit - window.length)];
};

/** Build one queue entry for an item. */
const toEntry = (item, card, kind, limit) => ({
  item,
  card,
  kind,
  positions: selectPositions(
    getPositionsForItem(item.id),
    card?.reps ?? 0,
    limit,
  ),
});

/**
 * Items that drill the learner's weakest PieceFirst steps.
 *
 * This is the closed loop from `pf-error-log.js`: the steps you actually fail
 * over the board decide which curriculum items get promoted. An item is only
 * eligible if it has content and is not already in the queue.
 * @param {object} options selection inputs
 * @param {Record<string, number>} options.failureWeights step key to weight
 * @param {Set<string>} options.taken item ids already queued
 * @param {Map<string, object>} options.cardByItemId cards, for position rotation
 * @param {string[]} options.learnedIds learned item ids
 * @returns {object[]} queue entries, weakest step first
 */
const targetedEntries = ({
  failureWeights,
  taken,
  cardByItemId,
  learnedIds,
}) => {
  const ranked = rankSteps(failureWeights);
  if (ranked.length === 0) return [];

  const studyable = getStudyableItems(learnedIds);
  const entries = [];

  for (const step of ranked) {
    for (const item of studyable) {
      if (item.pfStep !== step || taken.has(item.id)) continue;
      taken.add(item.id);
      entries.push(
        toEntry(item, cardByItemId.get(item.id) ?? null, "targeted"),
      );
      // One item per weak step keeps the session varied.
      break;
    }
  }

  return entries;
};

/** How far ahead the new-item chain is followed before the budget trims it. */
const MAX_FRESH_LOOKAHEAD = 48;

/**
 * New items to offer, following the prerequisite chain within one session.
 *
 * An item unlocked by another item *in this same queue* counts as unlocked.
 * Without that, a new learner who asks for twenty minutes gets a two-minute
 * session: everything in tier 1 depends on the protocol, and the protocol has
 * not been graded yet. Curriculum order already puts a prerequisite ahead of
 * whatever it unlocks, so the queue is still studied in a legal order.
 * @param {object} options selection inputs
 * @param {string[]} options.learnedIds ids already learned
 * @param {Set<string>} options.taken item ids already queued
 * @param {Map<string, object>} options.cardByItemId existing cards
 * @param {number} options.positionsPerItem positions to show per item
 * @returns {object[]} new-item queue entries in curriculum order
 */
const freshEntries = ({
  learnedIds,
  taken,
  cardByItemId,
  positionsPerItem,
}) => {
  const unlocked = new Set(learnedIds);
  const entries = [];

  while (entries.length < MAX_FRESH_LOOKAHEAD) {
    const next = getStudyableItems([...unlocked]).find(
      (item) => !taken.has(item.id) && !cardByItemId.has(item.id),
    );
    if (!next) break;

    taken.add(next.id);
    unlocked.add(next.id);
    entries.push(toEntry(next, null, "new", positionsPerItem));
  }

  return entries;
};

/**
 * Build an ordered study queue.
 *
 * When `minutes` is given the queue is filled to that time budget; otherwise it
 * is capped at `maxItems`. Reviews always come first — a pattern you are about
 * to forget is worth more than a new one.
 * @param {object} [options] builder inputs
 * @param {object[]} [options.cards] existing SRS cards
 * @param {number} [options.now] timestamp used for due checks
 * @param {number} [options.minutes] time budget; overrides `maxItems`
 * @param {number} [options.maxItems] cap on queue length
 * @param {boolean} [options.includeNew] whether to append new items
 * @param {Record<string, number>} [options.failureWeights] PF step weights
 * @param {string[]} [options.itemIds] drill exactly these items, in this order
 * @param {number} [options.positionsPerItem] positions to show per item
 * @returns {object[]} queue entries: { item, card, positions, kind }
 */
export const buildSession = ({
  cards = [],
  now = Date.now(),
  minutes = null,
  maxItems = DEFAULT_SESSION_SIZE,
  includeNew = true,
  failureWeights = {},
  itemIds = null,
  positionsPerItem = POSITIONS_PER_ITEM,
} = {}) => {
  const cardByItemId = new Map(cards.map((card) => [card.itemId, card]));

  // An explicit item list is a direct request from the dashboard, so it
  // bypasses scheduling entirely and is returned as asked for.
  if (itemIds) {
    return itemIds
      .map((itemId) => getItem(itemId))
      .filter(
        (item) => item !== null && getPositionsForItem(item.id).length > 0,
      )
      .map((item) =>
        toEntry(
          item,
          cardByItemId.get(item.id) ?? null,
          cardByItemId.has(item.id) ? "review" : "new",
          positionsPerItem,
        ),
      );
  }

  const taken = new Set();
  const due = cards
    .filter(
      (card) => isDue(card, now) && getPositionsForItem(card.itemId).length > 0,
    )
    .sort((a, b) => a.due - b.due)
    .map((card) => ({ card, item: getItem(card.itemId) }))
    // An item can be dropped from the curriculum while its card lingers.
    .filter(({ item }) => item !== null)
    .map(({ card, item }) => {
      taken.add(item.id);
      return toEntry(item, card, "review", positionsPerItem);
    });

  const learnedIds = getLearnedIds(cards);

  const targeted = targetedEntries({
    failureWeights,
    taken,
    cardByItemId,
    learnedIds,
  });

  const fresh = includeNew
    ? freshEntries({ learnedIds, taken, cardByItemId, positionsPerItem })
    : [];

  const ordered = [...due, ...targeted, ...fresh];
  return minutes === null
    ? ordered.slice(0, maxItems)
    : fitToBudget(ordered, minutes);
};

/**
 * Take entries until the time budget is spent.
 *
 * The first entry is always included even if it alone exceeds the budget —
 * a 20-minute session that returns nothing because the only due item is an
 * endgame play-out would be worse than one that runs slightly long.
 * @param {object[]} entries ordered queue entries
 * @param {number} minutes the budget
 * @returns {object[]} the entries that fit
 */
export const fitToBudget = (entries, minutes) => {
  const kept = [];
  let spent = 0;
  for (const entry of entries) {
    const cost = entryCost(entry);
    if (kept.length > 0 && spent + cost > minutes) continue;
    kept.push(entry);
    spent += cost;
    if (spent >= minutes) break;
  }
  return kept;
};

/**
 * Counts for the session header.
 * @param {object[]} queue a built session queue
 * @returns {{total: number, review: number, targeted: number, fresh: number, positions: number, minutes: number}} counts
 */
export const summarizeSession = (queue = []) => ({
  total: queue.length,
  review: queue.filter((entry) => entry.kind === "review").length,
  targeted: queue.filter((entry) => entry.kind === "targeted").length,
  fresh: queue.filter((entry) => entry.kind === "new").length,
  positions: queue.reduce((sum, entry) => sum + entry.positions.length, 0),
  minutes: Math.round(queue.reduce((sum, entry) => sum + entryCost(entry), 0)),
});
