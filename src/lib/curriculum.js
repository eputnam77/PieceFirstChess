/**
 * Curriculum queries and structural validation.
 *
 * Pairs with the data in `src/data/curriculum.js`, the same way `openings.js`
 * pairs `OPENINGS` with `detectOpening()`. Pure functions — SRS card state is
 * passed in rather than read from storage, so this module stays testable and
 * usable from both the app and a future Node-side session builder.
 */

import { CURRICULUM, PF_STEPS, TIERS } from "@/data/curriculum";
import { CARD_STATE } from "@/lib/srs";

/** Stability, in days, above which an item counts as "mature". */
const MATURE_STABILITY_DAYS = 21;

const BY_ID = new Map(CURRICULUM.map((item) => [item.id, item]));

/**
 * Look up a single curriculum item.
 * @param {string} id item id, e.g. "T-15"
 * @returns {object|null} the item, or null if unknown
 */
export const getItem = (id) => BY_ID.get(id) ?? null;

/**
 * All items in a tier, in curriculum order.
 * @param {number} tier tier number 0–5
 * @returns {object[]} matching items
 */
export const getItemsByTier = (tier) =>
  CURRICULUM.filter((item) => item.tier === tier);

/**
 * All items surfaced by a given PieceFirst step.
 * @param {string} pfStep step key, e.g. "PF3"
 * @returns {object[]} matching items
 */
export const getItemsByPfStep = (pfStep) =>
  CURRICULUM.filter((item) => item.pfStep === pfStep);

/**
 * Items whose prerequisites are all mastered — the legal "start something new" set.
 * Already-mastered items are excluded.
 * @param {string[]} masteredIds ids the learner has mastered
 * @returns {object[]} unlocked, not-yet-mastered items in curriculum order
 */
export const getUnlockedItems = (masteredIds = []) => {
  const mastered = new Set(masteredIds);
  return CURRICULUM.filter(
    (item) =>
      !mastered.has(item.id) &&
      item.prereqs.every((prereq) => mastered.has(prereq)),
  );
};

/**
 * Classify one item's learning state from its SRS card.
 * @param {object|null|undefined} card the item's SRS card, if any
 * @returns {"new"|"learning"|"young"|"mature"} bucket for progress display
 */
export const getItemStatus = (card) => {
  if (!card || card.state === CARD_STATE.NEW) return "new";
  if (
    card.state === CARD_STATE.LEARNING ||
    card.state === CARD_STATE.RELEARNING
  ) {
    return "learning";
  }
  return card.stability >= MATURE_STABILITY_DAYS ? "mature" : "young";
};

/**
 * Per-tier and overall progress rollup — the Mastery Dashboard's data source.
 * @param {object} [cardsByItemId] map of item id to SRS card
 * @returns {{tiers: object, total: object}} counts bucketed by status
 */
export const getCurriculumStats = (cardsByItemId = {}) => {
  const emptyCounts = () => ({
    new: 0,
    learning: 0,
    young: 0,
    mature: 0,
    total: 0,
  });

  const tiers = {};
  const total = emptyCounts();

  for (const tierKey of Object.keys(TIERS)) {
    tiers[tierKey] = { ...emptyCounts(), name: TIERS[tierKey].name };
  }

  for (const item of CURRICULUM) {
    const status = getItemStatus(cardsByItemId[item.id]);
    const tier = tiers[item.tier];

    tier[status]++;
    tier.total++;
    total[status]++;
    total.total++;
  }

  return { tiers, total };
};

/**
 * Structural check of the curriculum dataset.
 *
 * Returns errors rather than throwing so it can back both a test and a
 * dev-only in-app check.
 * @returns {string[]} human-readable problems; empty means the dataset is sound
 */
export const validateCurriculum = () => {
  const errors = [];
  const seen = new Set();

  for (const item of CURRICULUM) {
    const where = `item ${item.id}`;

    if (seen.has(item.id)) errors.push(`${where}: duplicate id`);
    seen.add(item.id);

    const tier = TIERS[item.tier];
    if (!tier) {
      errors.push(`${where}: unknown tier ${item.tier}`);
    } else if (!item.id.startsWith(tier.idPrefix)) {
      errors.push(
        `${where}: id should start with "${tier.idPrefix}" for tier ${item.tier}`,
      );
    }

    if (!PF_STEPS[item.pfStep]) {
      errors.push(`${where}: unknown pfStep "${item.pfStep}"`);
    }

    for (const field of ["title", "summary", "mastery"]) {
      if (!item[field] || item[field].trim() === "") {
        errors.push(`${where}: missing ${field}`);
      }
    }

    if (!Array.isArray(item.positions)) {
      errors.push(`${where}: positions must be an array`);
    }

    if (!Array.isArray(item.prereqs)) {
      errors.push(`${where}: prereqs must be an array`);
      continue;
    }

    for (const prereq of item.prereqs) {
      const target = BY_ID.get(prereq);
      if (!target) {
        errors.push(`${where}: prereq "${prereq}" does not exist`);
      } else if (target.tier > item.tier) {
        errors.push(
          `${where}: prereq "${prereq}" is in a later tier (${target.tier} > ${item.tier})`,
        );
      }
    }
  }

  errors.push(...findPrereqCycles());

  return errors;
};

/**
 * Detect prerequisite cycles via depth-first search.
 * A cycle would make an item permanently unreachable.
 * @returns {string[]} one message per cycle found
 */
const findPrereqCycles = () => {
  const errors = [];
  const UNVISITED = 0;
  const IN_PROGRESS = 1;
  const DONE = 2;
  const marks = new Map(CURRICULUM.map((item) => [item.id, UNVISITED]));

  const visit = (id, path) => {
    const mark = marks.get(id);
    if (mark === DONE) return;
    if (mark === IN_PROGRESS) {
      errors.push(
        `prerequisite cycle: ${[...path.slice(path.indexOf(id)), id].join(" → ")}`,
      );
      return;
    }

    marks.set(id, IN_PROGRESS);
    for (const prereq of BY_ID.get(id)?.prereqs ?? []) {
      if (BY_ID.has(prereq)) visit(prereq, [...path, id]);
    }
    marks.set(id, DONE);
  };

  for (const item of CURRICULUM) visit(item.id, []);

  return errors;
};

export { CURRICULUM, PF_STEPS, TIERS };
