/**
 * Lock visibility — why an item is not being offered yet, in one sentence.
 *
 * The lock *mechanism* has existed since the curriculum shipped: `prereqs` in
 * `src/data/curriculum.js`, enforced by `getStudyableItems()` in
 * `src/lib/curriculum.js` and read by the session builder. What was missing is
 * that it is invisible, binary and silent (PRD §81). A lock only motivates if
 * the key is visible — otherwise the learner sees ninety-eight items they
 * cannot tell apart from the one they can start, and the bound stops being the
 * motivating thing `docs/PF7/LEARNING-SYSTEM.md` §3.6 says it is.
 *
 * ## What this module is not allowed to do
 *
 * **It never blocks anything.** PRD §81.1 is non-negotiable: locks decide what
 * the *scheduler* offers, never what the learner may open. Every item on the
 * dashboard stays drillable by hand, locked or not. This module returns prose
 * and a distance; nothing here disables a control.
 *
 * ## It reads the real gate, never a second copy of it
 *
 * The one failure mode for a screen like this is explaining a rule the
 * scheduler does not actually use. So the predicate here is imported, not
 * restated: `isLearned` wraps `getLearnedIds` from `src/lib/session.js`, and
 * the "prereqs with no content don't count" carve-out is the one already in
 * `getStudyableItems`. If the gate moves, this moves with it.
 *
 * ## The distance is honest about this scheduler
 *
 * PRD §81.2 sketches `Unlocks after T-06 Absolute pin graduates (2 of 3 reps)`.
 * There is no such fraction to show: `SRS_DEFAULT_CONFIG.learningSteps` is
 * empty, so `nextState()` sends a card from `NEW` straight to `REVIEW` on its
 * first graded rep whatever the rating. Graduating a prerequisite is exactly
 * one session, and saying "2 of 3 reps" would be inventing progress the app
 * does not track. What is genuinely variable — and worth showing — is how far
 * down the chain the item sits: the curriculum has a single root and runs eight
 * deep, so "3 items away, start with T-01" is the sentence that actually tells
 * a learner what to do next.
 *
 * Pure: cards are passed in, nothing is read from storage, no React.
 */

import { CURRICULUM } from "@/data/curriculum";
import { getItem, hasPositions } from "@/lib/curriculum";
import { getLearnedIds } from "@/lib/session";

/** Curriculum order, for picking a stable "start here" out of a set. */
const ORDER = new Map(CURRICULUM.map((item, index) => [item.id, index]));

/**
 * Ids that count as learned for the purposes of unlocking.
 *
 * Wraps the session builder's own predicate so the dashboard cannot drift from
 * the queue: one graded rep, not twenty-one days of stability.
 * @param {object|object[]} cards the card map or card list
 * @returns {Set<string>} learned item ids
 */
export const learnedIdSet = (cards = {}) =>
  new Set(getLearnedIds(Array.isArray(cards) ? cards : Object.values(cards)));

/**
 * The prerequisites of an item that are still standing in its way.
 *
 * Mirrors `getStudyableItems`: a prerequisite the app cannot teach yet is
 * skipped, because being blocked by an item with no content would be a lock
 * with no key at all.
 * @param {object} item a curriculum item
 * @param {Set<string>} learned learned item ids
 * @returns {string[]} blocking prerequisite ids, in curriculum order
 */
const blockingPrereqs = (item, learned) =>
  item.prereqs.filter((id) => hasPositions(id) && !learned.has(id));

/**
 * Every unlearned item that must be studied before this one opens.
 *
 * Depth-first over the prerequisite graph. `validateCurriculum` already proves
 * the graph is acyclic, but the `seen` set makes the walk safe anyway — this
 * runs on every dashboard row and must never hang the screen.
 * @param {object} item a curriculum item
 * @param {Set<string>} learned learned item ids
 * @returns {Set<string>} ids of the unlearned ancestors
 */
const unlearnedAncestors = (item, learned) => {
  const seen = new Set();
  const stack = blockingPrereqs(item, learned);

  while (stack.length > 0) {
    const id = stack.pop();
    if (seen.has(id)) continue;
    seen.add(id);
    const prereq = getItem(id);
    if (prereq) stack.push(...blockingPrereqs(prereq, learned));
  }

  return seen;
};

/** The earliest item in curriculum order, by id. */
const firstInOrder = (ids) =>
  [...ids].sort((a, b) => (ORDER.get(a) ?? 0) - (ORDER.get(b) ?? 0))[0] ?? null;

/** "T-06 Absolute pin", or just the id if the item has gone missing. */
const nameOf = (id) => {
  const item = getItem(id);
  return item ? `${id} ${item.title}` : id;
};

/** "T-06 Absolute pin and T-09 Skewer" — at most two are ever named. */
const listNames = (ids) => ids.map((id) => nameOf(id)).join(" and ");

/**
 * Why an item is locked, or `null` if it is not.
 *
 * The returned `sentence` is the whole point of the feature: one line naming
 * the key and the distance, per PRD §81.2 and §81.5 ("Z depends on Y, and Y is
 * not learned yet" — never a judgement about the learner).
 * @param {object} item a curriculum item
 * @param {Set<string>} learned learned item ids, from `learnedIdSet`
 * @returns {{blockers: string[], startWith: string, distance: number,
 *   sentence: string}|null} the lock, or null when the item is open
 */
export const lockFor = (item, learned = new Set()) => {
  // An item you have already started is open by definition, whatever its
  // prerequisites say — the queue would never withhold it from you now.
  if (!item || learned.has(item.id)) return null;

  const blockers = blockingPrereqs(item, learned);
  if (blockers.length === 0) return null;

  const ancestors = unlearnedAncestors(item, learned);
  const distance = ancestors.size;
  // The actionable end of the chain: the earliest ancestor with nothing left
  // in its own way. The graph is acyclic, so one always exists.
  const open = [...ancestors].filter(
    (id) => blockingPrereqs(getItem(id), learned).length === 0,
  );
  const startWith = firstInOrder(open) ?? firstInOrder(blockers);

  const key = listNames(blockers);
  const sentence =
    distance === 1
      ? `Unlocks after ${key} — one session away, and it is open now.`
      : `Unlocks after ${key} — ${distance} items away; start with ${nameOf(startWith)}.`;

  return { blockers, startWith, distance, sentence };
};

/**
 * Lock state for the whole curriculum in one pass.
 *
 * The dashboard renders ninety-nine rows at once, so it asks once rather than
 * ninety-nine times.
 * @param {object|object[]} cards the card map or card list
 * @returns {{locks: Map<string, object>, openCount: number}} locks by item id,
 *   and how many items the scheduler would be willing to offer
 */
export const lockMap = (cards = {}) => {
  const learned = learnedIdSet(cards);
  const locks = new Map();

  for (const item of CURRICULUM) {
    const lock = lockFor(item, learned);
    if (lock) locks.set(item.id, lock);
  }

  return { locks, openCount: CURRICULUM.length - locks.size };
};
