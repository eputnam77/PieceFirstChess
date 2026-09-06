/**
 * How much of the protocol to show, and when to stop showing it.
 *
 * The eight-step scaffold — the `STEP_HINTS` gloss and the filled-in
 * `stepAnswers` of the worked example — is exactly right for someone meeting
 * the protocol for the first time and actively harmful for someone who has
 * internalised it. That is Kalyuga's expertise-reversal effect, and it is the
 * reason this module exists: guidance that never fades trains a learner to read
 * the checklist instead of running it.
 *
 * ## Four stages
 *
 * | Stage | What is shown |
 * |---|---|
 * | 1 | Every step, its hint, and a filled-in answer |
 * | 2 | Every step and its hint; the learner answers |
 * | 3 | Step names only |
 * | 4 | Nothing. Find the move; the protocol is checked only on a miss |
 *
 * ## Calendar thresholds are the default, not the trigger (D7)
 *
 * `docs/IMPLEMENTATION-PLAN.md` decision D7: FSRS stability estimates *card
 * recall*, not procedural fluency, so a stability number alone cannot say
 * whether someone can run the protocol unprompted. It sets the default stage;
 * **demonstrated performance on unlabelled reps moves it**. An unlabelled rep
 * is a rehearsal run at stage 3 or above — step names and nothing else — and
 * three clean ones promote a mature card to stage 4, while more misses than
 * passes put the hints back. Restoring the scaffold on a miss is the half of
 * fading that is usually left out.
 *
 * Both counters are read over a **window of the last ten reps**, not over the
 * learner's lifetime. A lifetime tally stops responding: after fifty passes a
 * bad week cannot move it, which is the opposite of what an adaptive scaffold
 * is for.
 *
 * The rows live in the v3 `events` store that the Commit Gate already added,
 * under a `source` of its own. No schema change, and no new database.
 */

import { CARD_STATE } from "@/lib/srs";
import { getEvents, putEvent } from "@/lib/srs-db";

/** The `events` row source for an unlabelled protocol rehearsal. */
export const SCAFFOLD_SOURCE = "protocol-unlabelled";

/**
 * Stability at which a card is treated as mature.
 *
 * The same 21 days `session.js` uses for "mastered", deliberately: two
 * different bars for maturity in one app would be one bar and one bug.
 */
export const MATURE_STABILITY_DAYS = 21;

/** Clean unlabelled rehearsals needed before the scaffold comes off entirely. */
export const PASSES_FOR_STAGE_4 = 3;

/** How many recent unlabelled reps the two counters are read over. */
export const PERFORMANCE_WINDOW = 10;

/** The lowest stage whose reps count as unlabelled evidence. */
export const UNLABELLED_FROM_STAGE = 3;

/**
 * Which stage of the scaffold a learner is on.
 *
 * Pure. Takes the card and the two counters and returns 1–4; it reads no
 * database and no clock, so the whole ladder can be tested without one.
 * @param {object|null} card the `PF-PROTOCOL` SRS card, or null if it is new
 * @param {object} [performance] demonstrated unlabelled performance
 * @param {number} [performance.passes] clean unlabelled rehearsals
 * @param {number} [performance.misses] unlabelled rehearsals missed or revealed
 * @returns {1|2|3|4} the stage
 */
export const scaffoldStage = (card, { passes = 0, misses = 0 } = {}) => {
  if (!card || card.state === CARD_STATE.NEW) return 1;
  if (card.state !== CARD_STATE.REVIEW) return 2;

  // A miss on an unlabelled rep is the signal the calendar cannot give: the
  // card is due in three weeks and the procedure still is not automatic.
  if (misses > passes) return 2;

  const mature = (card.stability ?? 0) >= MATURE_STABILITY_DAYS;
  return mature && passes >= PASSES_FOR_STAGE_4 ? 4 : 3;
};

/** Whether a stage still shows the per-step hints and answers. */
export const showsAnswers = (stage) => stage <= 1;

/** Whether a stage still shows the `STEP_HINTS` gloss. */
export const showsHints = (stage) => stage <= 2;

/** Whether a stage still walks the eight steps at all. */
export const showsSteps = (stage) => stage <= 3;

/**
 * Record one unlabelled rehearsal.
 *
 * Only stage 3 and 4 reps count. The question these rows answer is "can they
 * run the protocol with nothing filled in", and a rep with the answers or the
 * hints on screen is not evidence about that. Failures are stored too: a
 * promotion rule with no demotion rule only ever ratchets.
 * @param {object} rep the rep
 * @param {number} rep.stage the stage the rep was shown at
 * @param {string} rep.outcome "solved" for a clean find, anything else a miss
 * @param {string} [rep.positionId] which position, for later analysis
 * @param {number} [rep.ts] timestamp, for tests
 * @returns {Promise<number|null>} the row id, or null if the rep did not count
 */
export const recordUnlabelledRep = async ({
  stage,
  outcome,
  positionId = null,
  ts = Date.now(),
}) => {
  if (!(stage >= UNLABELLED_FROM_STAGE)) return null;
  try {
    return await putEvent({
      ts,
      source: SCAFFOLD_SOURCE,
      positionId,
      passed: outcome === "solved",
    });
  } catch {
    // A drill must not fail because telemetry could not be written.
    return null;
  }
};

/**
 * Unlabelled performance over the last `PERFORMANCE_WINDOW` reps.
 * @returns {Promise<{passes: number, misses: number}>} the two counters
 */
export const readUnlabelledPerformance = async () => {
  try {
    const events = await getEvents({ source: SCAFFOLD_SOURCE });
    const recent = events.slice(-PERFORMANCE_WINDOW);
    return {
      passes: recent.filter((event) => event.passed).length,
      misses: recent.filter((event) => !event.passed).length,
    };
  } catch {
    // The stage falls back to the calendar default, which is the safe side:
    // a learner sees the scaffold they would have seen before this existed.
    return { passes: 0, misses: 0 };
  }
};
