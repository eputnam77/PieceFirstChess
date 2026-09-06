/**
 * Drill positions for tier 0 — the protocol itself.
 *
 * The protocol is a habit, not knowledge, so it cannot be drilled by asking
 * questions about it. Two drills train it directly, and both are derived rather
 * than hand-authored:
 *
 * **Blunder check (PF7 VERIFY).** "Is this move safe?" — one position, one
 * candidate move, answer yes or no. `LICHESS_BLUNDER_CHECKS` supplies these for
 * free: a Lichess puzzle row is a position where somebody played a move that
 * allowed a decisive tactic, so the unsafe cases are real moves from real games
 * with the refutation already known. Half the deck is sound moves, so the drill
 * cannot be beaten by always answering "no".
 *
 * **Protocol rehearsal.** Walk all eight steps on a position, then play the move
 * the protocol should have found. The checklist half is self-paced; the move at
 * the end is what makes the drill objective.
 *
 * The rehearsal positions are drawn from across the tactical and mating tiers on
 * purpose: rehearsing the protocol on one kind of position would train the
 * pattern instead of the process.
 *
 * **Those two are rungs 4 and 5 of a five-rung ladder**, and the first three
 * are hand-authored in `@pf/step-drills.js`: a worked example with all eight
 * answers filled in, completion problems with one blanked, and per-step
 * multiple-choice drills for the five steps that had no dedicated practice.
 * This module's job is to put the whole thing in order — see
 * `TIER-0-PROTOCOL-PLAN.md` for the ladder and `docs/IMPLEMENTATION-PLAN.md`
 * §4 step 12 for where it sits in the build.
 */

import { PF_STEPS } from "@/data/curriculum";
import {
  LICHESS_BLUNDER_CHECKS,
  LICHESS_POSITIONS,
} from "@/data/lichess-positions";
import { applyMove, sideToMove, toSan } from "@pf/notation.js";
import { LADDER_POSITIONS } from "@pf/step-drills.js";

/** Curriculum items the rehearsal positions are sampled from. */
const REHEARSAL_SOURCES = [
  { itemId: "T-01", motif: "Knight fork" },
  { itemId: "T-06", motif: "Pin" },
  { itemId: "T-08", motif: "Skewer" },
  { itemId: "T-15", motif: "Deflection" },
  { itemId: "T-11", motif: "Discovered attack" },
  { itemId: "M-01", motif: "Back-rank mate" },
];

/**
 * Plain-language gloss for each step, for a learner who has not yet reached the
 * curriculum item that teaches the jargon in the question itself (e.g. "pawn
 * break", "worst piece"). Rehearsal is tier 0 and deliberately has no
 * prerequisites, so this is most people's first exposure to those terms.
 */
const STEP_HINTS = {
  PF1: "What piece did the opponent just move, and what does that change — new threats, new weaknesses?",
  PF2: "Is anything of yours hanging — capturable for free right now or next move?",
  PF3: "List every check, capture, and threat on the board. Forcing moves come first.",
  PF4: "Is there a pawn move that opens a file, attacks a pawn chain, or gains space? Skip this if nothing fits.",
  "PF4.5":
    "What is the opponent trying to do over their next few moves — can you stop it first?",
  PF5: "Which of your pieces is doing the least right now? Could it reach a better square?",
  PF6: "Narrow it to 2–4 candidate moves and calculate the most forcing lines a few moves deep.",
  PF7: "Before you play it: does the move hang anything or walk into a tactic?",
};

/** The eight steps in order, as prompts for the rehearsal walk-through. */
export const PROTOCOL_STEPS = Object.freeze(
  Object.entries(PF_STEPS).map(([key, text]) => {
    const [name, question] = text.split(" — ");
    return { key, name, question, hint: STEP_HINTS[key] };
  }),
);

// `toSan` moved to `@pf/notation.js` when `step-drills.js` needed it too; it is
// re-exported here because this module's own tests and readers still look for
// it where it has always been.
export { toSan };

const BLUNDER_CHECK_POSITIONS = LICHESS_BLUNDER_CHECKS.map((check) => ({
  type: "blundercheck",
  id: check.id,
  fen: check.fen,
  candidate: check.candidate,
  candidateSan: toSan(check.fen, check.candidate),
  safe: check.safe,
  refutation: check.refutation ?? null,
  refutationSan: check.refutation
    ? toSan(applyMove(check.fen, check.candidate), check.refutation)
    : null,
  orientation: sideToMove(check.fen),
  rating: check.rating,
  source: "lichess",
}));

const REHEARSAL_POSITIONS = REHEARSAL_SOURCES.flatMap(({ itemId, motif }) => {
  const position = LICHESS_POSITIONS[itemId]?.[0];
  if (!position) return [];
  return [
    {
      type: "protocol",
      id: `protocol-${position.id}`,
      fen: position.fen,
      solution: position.solution,
      orientation: sideToMove(position.fen),
      motif,
      answerSan: toSan(position.fen, position.solution[0]),
      prompt:
        "Work through all eight steps before you touch a piece, then play the move the protocol found.",
      source: "lichess",
    },
  ];
});

/**
 * Every tier-0 drill position, interleaved.
 *
 * The session builder shows a rotating window of three positions per sitting, so
 * concatenating the two kinds would mean the first dozen sittings are nothing but
 * blunder checks and the rehearsals are never reached. Leading each group of
 * three with a rehearsal puts one of each in every sitting, which is the point:
 * the protocol is the checklist *and* the scan, not one or the other.
 * @param {object[]} rehearsals full eight-step walk-throughs
 * @param {object[]} checks "is this move safe?" reps
 * @returns {object[]} one rehearsal, then two checks, repeating
 */
const interleave = (rehearsals, checks) => {
  const out = [];
  let checkIndex = 0;

  for (const rehearsal of rehearsals) {
    out.push(rehearsal, ...checks.slice(checkIndex, checkIndex + 2));
    checkIndex += 2;
  }
  // Whatever is left over is all checks, which is fine — by then the learner has
  // seen every rehearsal at least once.
  return [...out, ...checks.slice(checkIndex)];
};

/**
 * The five-rung ladder, with a blunder check every third position.
 *
 * `TIER-0-PROTOCOL-PLAN.md` §6 puts the ladder in front of the interleaved
 * tail as one solid block. Taken literally that is thirty-odd positions, or a
 * dozen sittings, before the learner sees a single blunder check — and PF7 is
 * the step club players actually lose to. Rung 4 of the ladder *is* speeded
 * reps, so running them alongside rather than after keeps the rung order
 * intact and keeps a PF7 rep in every sitting, which is the property
 * `protocol-drills.test.js` has asserted since the deck was built.
 * @param {object[]} ladder rungs 1, 2, 3 and 5, in rung order
 * @param {object[]} checks "is this move safe?" reps
 * @returns {object[]} two ladder positions, then one check, repeating
 */
const withChecks = (ladder, checks) => {
  const out = [];
  let checkIndex = 0;

  for (let index = 0; index < ladder.length; index++) {
    out.push(ladder[index]);
    if (index % 2 === 1 && checkIndex < checks.length) {
      out.push(checks[checkIndex++]);
    }
  }
  return { positions: out, used: checkIndex };
};

const LADDER = withChecks(LADDER_POSITIONS, BLUNDER_CHECK_POSITIONS);

export const PROTOCOL_POSITIONS = Object.freeze([
  ...LADDER.positions,
  ...interleave(
    REHEARSAL_POSITIONS,
    BLUNDER_CHECK_POSITIONS.slice(LADDER.used),
  ),
]);
