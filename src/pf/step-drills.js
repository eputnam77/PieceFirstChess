/**
 * Tier-0 rungs 1, 2, 3 and 5 — the protocol taught one step at a time.
 *
 * ## Why this exists
 *
 * `PF-PROTOCOL` is the first thing a learner sees, and until now its only
 * content was blunder-check reps and a combined eight-step walkthrough. That
 * gave **PF7 VERIFY** real dedicated practice and gave PF1, PF4, PF4.5, PF5 and
 * PF6 none: they were read once as one-line questions, on an unfamiliar
 * tactical position, with no worked example. This file is the missing middle —
 * `TIER-0-PROTOCOL-PLAN.md`, rungs 1 (`protocol` + `stepAnswers`), 2
 * (`completion`), 3 (`stepdrill`) and 5 (`cue`). Rung 4 already exists: `scan`,
 * `sweep` and `blundercheck`.
 *
 * Still **one curriculum item**. The 99 does not move; everything here happens
 * inside `PF-PROTOCOL`'s own content list.
 *
 * ## No hand-typed FENs
 *
 * Every position is written as the SAN line that reaches it and replayed at
 * import by `replayLine`. That is the rule `tabiya.js` already follows, and
 * here it buys something specific: **`lastMove` is true by construction**. PF1
 * RESET asks what the opponent's move changed, and an imported Lichess FEN
 * carries no record of what was just played — the answer would have to be
 * invented. A line cannot lie about its own last move.
 *
 * ## Which steps get authored content, and which do not
 *
 * PF1, PF4, PF4.5, PF5, PF6. **PF2 is covered by `sweep`** (click every piece
 * they can win — a generated answer key, thousands of reps), **PF7 by
 * blunder-check**, and **PF3 by the 58 tactical items of tiers 1 and 2**, where
 * it is the dominant step already. Authoring content for those would be
 * duplicating drills that exist and are cheaper.
 *
 * ## Not engine-certifiable, and marked so
 *
 * "Which of your pieces is worst placed" and "which step would have caught
 * this" are not questions a search can adjudicate — the same reason
 * `verify:drills` already exempts `line` and `card`. Everything here is
 * `source: "authored"` and exempt by construction. What *is* checked, by
 * `step-drills.test.js`, is every mechanical claim the content makes: named
 * moves must be legal in the position, named opponent moves must be legal with
 * the turn handed over, and a `worstPiece` claim must agree with
 * `pf5WorstPiece` in `readout.js` — so the app's own detector and a drill can
 * never tell a learner two different things.
 */

import { PF_STEPS } from "@/data/curriculum";
import { LICHESS_BLUNDER_CHECKS } from "@/data/lichess-positions";
import { classifyFailureStep } from "@/lib/pf-error-log";
import { replayLine, sideToMove, toSan } from "@pf/notation.js";

/** The five steps that had no dedicated drill before this file. */
export const LADDER_STEPS = Object.freeze([
  "PF1",
  "PF4",
  "PF4.5",
  "PF5",
  "PF6",
]);

/**
 * Backward cue drills kept per step.
 *
 * `classifyFailureStep` answers most blunder-check positions with PF7 — that is
 * what a blunder check *is* — so an uncapped generator would build a deck of
 * thirty identical questions.
 */
const MAX_CUES_PER_STEP = 2;

/**
 * The only two answers a backward cue may carry, and why the others are out.
 *
 * `classifyFailureStep` can return five steps, but only these two are honest
 * answers to "which step would have caught this?" on a blunder-check row:
 *
 * - **PF3 and PF6** need `bestSan` to separate them, and a blunder-check row
 *   records the move that was played and its refutation, never the move that
 *   should have been played. Without it the classifier cannot reach either
 *   branch, so a row can never legitimately be tagged with them here.
 * - **PF5** is the classifier's fallback, and it means "nothing material was
 *   at stake". Telling a learner that improving their worst piece would have
 *   caught a tactic is simply false.
 */
const CUE_ANSWERS = Object.freeze({
  PF7: "The move you chose is what hangs the material. The final blunder scan is the step that catches your own move — and it is the step club players skip.",
  PF2: "Something of yours was already loose before this move, and it stayed loose. SAFETY runs before you go looking for anything clever.",
});

// ── Shared shaping ───────────────────────────────────────────────────────────

/**
 * A stable small integer from a string.
 *
 * Used only to rotate answer order, so it needs to be deterministic across
 * machines and nothing else — the same drill must not put the correct answer
 * first for one learner and third for another, and it must not put it first
 * every time either.
 * @param {string} text any string
 * @returns {number} a non-negative integer
 */
const hashOf = (text) => {
  let hash = 0;
  for (let index = 0; index < text.length; index++) {
    hash = (hash * 31 + text.codePointAt(index)) % 100_000;
  }
  return hash;
};

/**
 * Answer choices in a stable, rotated order.
 * @param {string} seed anything unique to this question
 * @param {object[]} choices the authored choices, correct one anywhere
 * @returns {object[]} the same choices, rotated and given ids
 */
const shapeChoices = (seed, choices) => {
  const offset = hashOf(seed) % choices.length;
  const rotated = [...choices.slice(offset), ...choices.slice(0, offset)];
  return rotated.map((choice, index) => ({
    id: `${seed}-${index}`,
    correct: false,
    ...choice,
  }));
};

// ── Rungs 1 and 2: fully annotated positions ─────────────────────────────────

/**
 * Positions with a written answer for all eight steps.
 *
 * One entry serves two rungs. Rung 1 shows every answer — the worked example.
 * Rung 2 blanks one step and asks for it — the completion problem. Authoring
 * the position once and deriving both is what keeps a five-rung ladder inside
 * one curriculum item affordable.
 *
 * Every claim below was checked against the board before it was written: the
 * attacker and defender counts, the "only legal move" claims, and each named
 * follow-up. The test re-checks the mechanical ones on every run.
 */
const ANNOTATED = [
  {
    id: "fried-liver",
    title: "The worked example",
    line: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5", "exd5", "Nxd5"],
    motif: "Knight fork on f7",
    solution: ["g5f7", "e8f7", "d1f3"],
    prompt:
      "Read all eight answers, then play the move the protocol found. This is the only position where you are given the answers — after this you supply them.",
    stepAnswers: {
      PF1: "Black recaptured with the knight, …Nxd5. The knight left f6, it now stands on d5 attacked by your c4 bishop, and the black king is still on e8 with f7 guarded by nothing but the king itself.",
      PF2: "Your knight on g5 is undefended. …h6 hits it, so whatever you do here has a one-move clock on it.",
      PF3: "No checks. Three captures — Nxf7, Nxh7 and Bxd5. Nxf7 is the one that matters: it hits the queen on d8 and the rook on h8 at the same time, and it drags the king onto the board.",
      PF4: "d2–d4 is available and would be the move in a quiet position. This is not a quiet position.",
      "PF4.5":
        "Black wants …Nb6 or …Be6 to shore up d5, then castle and be simply fine. Every quiet move you play hands them that.",
      PF5: "Your whole queenside is still at home — Nb1, Bc1, Ra1. That is what you would fix if nothing forcing existed.",
      PF6: "Two candidates: Nxf7 and d4. Count Nxf7 Kxf7 Qf3+ Ke6 — the king is dragged to e6, and your bishop then pins the d5 knight against it.",
      PF7: "After Nxf7 Kxf7 Qf3+ Ke6, nothing of yours is attacked — the g5 knight has been traded off — and the pin on d5 is what pays for the piece.",
    },
  },
  {
    id: "french-advance",
    title: "French Advance, Black to move",
    line: [
      "e4",
      "e6",
      "d4",
      "d5",
      "e5",
      "c5",
      "c3",
      "Nc6",
      "Nf3",
      "Qb6",
      "Be2",
      "Nge7",
      "O-O",
    ],
    stepAnswers: {
      PF1: "White castled short. The king steps off the e-file and the f1 rook now stands behind an f2–f4 push. Nothing of yours came under attack.",
      PF2: "Nothing of yours is hanging. The pressure runs the other way: your c5 pawn and c6 knight both hit d4.",
      PF3: "No checks. Captures: …cxd4, …Nxd4, …Nxe5 and …Qxb2. Only …cxd4 stands up — the two knight captures drop a piece to the recapture, and …Qxb2 sends the queen to the wrong side of the board for a pawn.",
      PF4: "Yes, two of them. …cxd4 cracks the base of the d4–e5 chain now, while it is held only by c3 and the f3 knight; …f6 hits the head of it later. Take on d4 first.",
      "PF4.5":
        "White wants dxc5, or Nb1–a3–c2 to prop d4 up, and then f4–f5 with the extra space. Taking on d4 first denies them the choice.",
      PF5: "The c8 bishop. Its only legal move is …Bd7, and even that does nothing until the c6 knight shifts. Everything else you own already has a job.",
      PF6: "Candidates: …cxd4, …Bd7, …Ng6, …a6. Calculate …cxd4 cxd4 and then whether …Nf5 or …Qb4 keeps the pressure on d4.",
      PF7: "After …cxd4 cxd4 nothing of yours is attacked, and your queen on b6 now bears on d4 down the a7–g1 diagonal: two attackers against two defenders.",
    },
    blanks: {
      PF1: [
        "White is threatening f2–f4–f5 immediately, and you have to stop it this move.",
        "White castled queenside and is coming at your king with the h-pawn.",
      ],
      PF4: [
        "There is no break here — play on the kingside with …g5 instead.",
        "…b5 and …b4, hitting the c3 pawn that holds the chain together.",
      ],
      "PF4.5": [
        "White wants to trade queens on b6 and grind out the endgame.",
        "White intends Bb5, pinning the c6 knight and winning the d5 pawn.",
      ],
      PF5: [
        "The queen on b6 — it is exposed and should retreat to c7.",
        "The e7 knight — it has nowhere to go and blocks the f8 bishop.",
      ],
      PF6: [
        "Only one candidate matters: …Qxb2, and you have to calculate whether the queen gets out.",
        "…Nxe5 and …Nxd4 — the two captures in the centre are the whole decision.",
      ],
    },
  },
  {
    id: "carlsbad",
    title: "Carlsbad structure, White to move",
    line: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "cxd5",
      "exd5",
      "Bg5",
      "Be7",
      "e3",
      "O-O",
      "Bd3",
      "c6",
      "Qc2",
      "Re8",
      "Nge2",
      "Nbd7",
      "O-O",
      "Nf8",
    ],
    stepAnswers: {
      PF1: "Black played …Nf8. It clears d7 for the c8 bishop and heads for e6 or g6 — and it stops guarding f6, so the pinned knight there is now held only by the e7 bishop and the g7 pawn.",
      PF2: "Nothing of yours is hanging, and nothing of Black's is loose either: d5 has three defenders against your one attacker.",
      PF3: "One check, Bxh7+, and it simply loses a bishop — h7 is covered three times. Two captures, Bxf6 and Nxd5, and both hand material straight back. Nothing forcing works here.",
      PF4: "b2–b4, heading for b5: the minority attack. Two pawns against three, aiming to leave Black a weak pawn on c6 or an isolated one on d5.",
      "PF4.5":
        "Black wants …Ne6, hitting your g5 bishop and d4, and …Ne4 to plant a knight in the middle. Neither can be stopped by force, so get on with your own plan first.",
      PF5: "The a1 rook. It is the only piece with nothing to do — Rab1 backs the b4 break, Rae1 backs an e3–e4 push.",
      PF6: "Candidates: Rab1, b4 straight away, Rae1, and Bxf6. Calculate whether b4–b5 ever lands with tempo before you commit the rook.",
      PF7: "Before Rab1: nothing of yours is attacked now and nothing is after it. Black has no piece bearing on d4, on a2, or down the b-file.",
    },
    blanks: {
      PF1: [
        "Black played …Nf8 to defend h7 — it was hanging to your bishop and queen battery.",
        "Black played …Nf8 preparing …Ng6 and …Nh4, which wins your f3 knight.",
      ],
      PF4: [
        "e3–e4 at once: blow the centre open while Black's pieces are on the back rank.",
        "f2–f4–f5, storming the kingside where you have the extra space.",
      ],
      "PF4.5": [
        "Black wants to castle queenside and double rooks on the c-file.",
        "Black is threatening …Nxd5, winning the pawn because your knight is pinned.",
      ],
      PF5: [
        "The g5 bishop — it is doing nothing behind the pinned knight and should retreat.",
        "The c2 queen — it is exposed on the b1–h7 diagonal.",
      ],
      PF6: [
        "Bxh7+ is the only candidate that needs calculating; everything else is quiet.",
        "There is nothing to calculate in a position this closed — just improve a piece.",
      ],
    },
  },
];

/** A `chess.js` game per annotated position, replayed once at import. */
const gameOf = (entry) => replayLine(entry.line);

/**
 * The annotated positions, with the derived board fields attached.
 *
 * `lastMove` is the final SAN of the line, which is the opponent's move by
 * definition — the line always ends on their turn, because the drill starts on
 * yours.
 */
export const ANNOTATED_POSITIONS = Object.freeze(
  ANNOTATED.map((entry) => {
    const game = gameOf(entry);
    const fen = game.fen();
    return Object.freeze({
      ...entry,
      fen,
      orientation: sideToMove(fen),
      lastMove: entry.line.at(-1),
      answerSan: entry.solution ? toSan(fen, entry.solution[0]) : null,
    });
  }),
);

/**
 * Rung 1 — the worked example.
 *
 * A `protocol` position like the six rehearsals already in the deck, so it uses
 * the same component and the same grading; the only difference is that it
 * carries `stepAnswers`, which `ProtocolDrill` renders under each step instead
 * of leaving the question blank. It is the one position in the item where the
 * learner is shown the answers.
 */
export const WORKED_EXAMPLE = Object.freeze({
  type: "protocol",
  id: "protocol-worked-fried-liver",
  fen: ANNOTATED_POSITIONS[0].fen,
  solution: ANNOTATED_POSITIONS[0].solution,
  orientation: ANNOTATED_POSITIONS[0].orientation,
  lastMove: ANNOTATED_POSITIONS[0].lastMove,
  motif: ANNOTATED_POSITIONS[0].motif,
  answerSan: ANNOTATED_POSITIONS[0].answerSan,
  prompt: ANNOTATED_POSITIONS[0].prompt,
  stepAnswers: ANNOTATED_POSITIONS[0].stepAnswers,
  worked: true,
  source: "authored",
});

/**
 * Rung 2 — completion problems.
 *
 * Seven answers are filled in and one is missing; supplying the missing one is
 * the whole task. There is deliberately **no move to find at the end**: the
 * claim a completion makes is about the eight questions, not about a best move,
 * and requiring a single "correct" move on a quiet strategic position would
 * mark a learner wrong for playing a perfectly good alternative. It is also
 * what keeps the type out of `ENGINE_TYPES` in `verify:drills` — there is no
 * move for a search to adjudicate.
 */
export const COMPLETION_POSITIONS = Object.freeze(
  ANNOTATED_POSITIONS.filter((entry) => entry.blanks).flatMap((entry) =>
    LADDER_STEPS.map((step) => {
      const seed = `completion-${entry.id}-${step}`;
      const shown = Object.fromEntries(
        Object.entries(entry.stepAnswers).filter(([key]) => key !== step),
      );
      return Object.freeze({
        type: "completion",
        id: seed,
        fen: entry.fen,
        orientation: entry.orientation,
        lastMove: entry.lastMove,
        pfStep: step,
        blankStep: step,
        stepAnswers: shown,
        prompt: `Seven steps are filled in. Supply ${step}.`,
        choices: shapeChoices(seed, [
          { label: entry.stepAnswers[step], correct: true },
          ...entry.blanks[step].map((label) => ({ label })),
        ]),
        source: "authored",
      });
    }),
  ),
);

// ── Rung 3: one step, one question, a fresh position ─────────────────────────

/**
 * Rung 3 — the step in isolation.
 *
 * Same shape as a blunder check: a board you cannot touch, one question, a row
 * of answers. The skill being trained is answering *that step*, so there is no
 * move to play — letting the learner play instead of answer would train
 * something else, which is the argument `blunder-check-drill.jsx` already
 * makes.
 *
 * `claim` on the correct choice is what the test checks: `moves` must be legal
 * for the side to move, `theirMoves` legal once the move is handed over, and
 * `worstPiece` must be the square `pf5WorstPiece` names.
 */
const STEP_DRILLS = [
  // ── PF1 RESET — what did that move change? ────────────────────────────────
  {
    id: "pf1-scholars",
    pfStep: "PF1",
    line: ["e4", "e5", "Bc4", "Nc6", "Qh5"],
    prompt: "White has just played Qh5. What did it change?",
    choices: [
      {
        label:
          "The queen and the bishop now both hit f7, and f7 is defended only by the king — Qxf7 is mate next move.",
        correct: true,
        explanation:
          "Two attackers, one defender, and the defender is the king. This is the whole content of PF1 here: a move that creates a mate threat has to be seen the moment it is played.",
        claim: { theirMoves: ["Qxf7#"] },
      },
      {
        label:
          "Nothing much — the queen is misplaced on h5 and you can chase it with …Nf6.",
        explanation:
          "…Nf6 does hit the queen, but it does not stop Qxf7#. Reading the threat comes before reading the tempo.",
      },
      {
        label: "It threatens Qxe5+, forking the king and the c6 knight.",
        explanation:
          "Qxe5+ is legal, but e5 is defended by the c6 knight — it loses the queen. The real threat is on f7.",
      },
    ],
  },
  {
    id: "pf1-qgd-pin",
    pfStep: "PF1",
    line: ["d4", "d5", "c4", "e6", "Nc3", "Nf6", "Bg5"],
    prompt: "White has just played Bg5. What did it change?",
    choices: [
      {
        label:
          "The f6 knight is pinned to the queen, so it can no longer be counted as a defender of d5 or e4.",
        correct: true,
        explanation:
          "A pinned piece is a piece that is only pretending to defend. That is what the move changed, and it is why …Be7 or …Nbd7 comes next.",
        claim: { moves: ["Be7", "Nbd7", "h6"] },
      },
      {
        label: "It threatens Bxf6, winning a piece.",
        explanation:
          "Bxf6 is met by …Qxf6 — a bishop for a knight, not a piece. The pin is positional, not material.",
      },
      {
        label:
          "It attacks h7 through the knight and prepares a sacrifice there.",
        explanation:
          "The g5 bishop does not act on h7 at all. Check what a piece actually sees before you fear it.",
      },
    ],
  },
  {
    id: "pf1-najdorf-e5",
    pfStep: "PF1",
    line: [
      "e4",
      "c5",
      "Nf3",
      "d6",
      "d4",
      "cxd4",
      "Nxd4",
      "Nf6",
      "Nc3",
      "a6",
      "Be3",
      "e5",
    ],
    prompt: "Black has just played …e5. What did it change?",
    choices: [
      {
        label:
          "It kicks the d4 knight and takes the centre, at the price of a permanent hole on d5 and a backward pawn on d6.",
        correct: true,
        explanation:
          "Every pawn move gives something up. PF1 is where you notice what — the knight has to move, but d5 is yours forever.",
        claim: { moves: ["Nb3", "Nf5", "Nf3"] },
      },
      {
        label: "It traps the d4 knight — it has no safe square.",
        explanation:
          "Nb3 and Nf3 are both available and both safe. A pawn hitting a piece is not the same as trapping it.",
      },
      {
        label: "Nothing — …e5 is a developing move that changes no lines.",
        explanation:
          "A pawn move never changes nothing. It opened the a7–g1 diagonal, closed the centre and conceded d5.",
      },
    ],
  },

  // ── PF4 BREAK — is there a pawn break? ────────────────────────────────────
  {
    id: "pf4-french-advance",
    pfStep: "PF4",
    line: ["e4", "e6", "d4", "d5", "e5", "c5", "c3", "Nc6", "Nf3", "Qb6", "a3"],
    prompt: "Black to move. Is there a pawn break, and which pawn?",
    choices: [
      {
        label:
          "…cxd4 now, hitting the base of the d4–e5 chain, and …f6 against its head later.",
        correct: true,
        explanation:
          "A pawn chain is attacked at its base first. d4 is held by c3 and the f3 knight; take there before White gets Na3–c2 in.",
        claim: { moves: ["cxd4", "f6"] },
      },
      {
        label:
          "No break exists here — play on the kingside with …g5 and …h5 instead.",
        explanation:
          "There are two breaks. Storming with the king still in the centre is how a French goes wrong.",
      },
      {
        label:
          "…Nge7 and …Nf5, putting pressure on d4 with pieces alone — no pawn move needed.",
        explanation:
          "Pieces alone will not shift a defended pawn chain. Pieces support the break; they do not replace it.",
      },
    ],
  },
  {
    id: "pf4-kings-indian",
    pfStep: "PF4",
    line: [
      "d4",
      "Nf6",
      "c4",
      "g6",
      "Nc3",
      "Bg7",
      "e4",
      "d6",
      "Nf3",
      "O-O",
      "Be2",
      "e5",
      "O-O",
      "Nc6",
      "d5",
      "Ne7",
      "Ne1",
    ],
    prompt: "Black to move. The centre is locked. Where is the break?",
    choices: [
      {
        label:
          "…f5 — but the f6 knight is in the way, so …Ne8 or …Nd7 has to come first.",
        correct: true,
        explanation:
          "With the centre locked by d5 and e4, you break on the side your pawns point at. Seeing that the break needs one move of preparation is the actual skill here.",
        claim: { moves: ["Ne8", "Nd7"] },
      },
      {
        label: "…f5 immediately.",
        explanation:
          "It is not legal — your own knight is on f6. A break you cannot play yet is a plan, not a move.",
      },
      {
        label: "…b5, gaining space on the queenside.",
        explanation:
          "…b5 is met by cxb5, and Black has nothing on that wing. The pawn chain points at the kingside.",
      },
    ],
  },
  {
    id: "pf4-carlsbad-minority",
    pfStep: "PF4",
    line: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "cxd5",
      "exd5",
      "Bg5",
      "c6",
      "e3",
      "Bf5",
      "Bd3",
      "Bxd3",
      "Qxd3",
      "Be7",
      "Nf3",
      "Nbd7",
      "O-O",
      "O-O",
    ],
    prompt: "White to move. Which pawn break defines this structure?",
    choices: [
      {
        label:
          "b2–b4–b5: the minority attack. Two pawns against three, to leave Black a weak c6 pawn or an isolated d5 pawn.",
        correct: true,
        explanation:
          "The Carlsbad structure has one plan for White on the queenside and it is this. Rab1 first, then b4.",
        claim: { moves: ["b4", "Rab1"] },
      },
      {
        label: "a2–a4–a5, gaining space and fixing the b7 pawn.",
        explanation:
          "The a-pawn alone creates nothing to attack. It is the b-pawn arriving on b5 that forces a concession on c6.",
      },
      {
        label: "f2–f4–f5, storming the kingside.",
        explanation:
          "That is Black's side of the board in this structure. White's pawn majority is on the other wing.",
      },
    ],
  },

  // ── PF4.5 PREVENT — what does my opponent want? ───────────────────────────
  {
    id: "pf45-greek-gift",
    pfStep: "PF4.5",
    line: [
      "e4",
      "e6",
      "d4",
      "d5",
      "Nc3",
      "Nf6",
      "Bg5",
      "Be7",
      "e5",
      "Nfd7",
      "Bxe7",
      "Qxe7",
      "f4",
      "O-O",
      "Nf3",
      "c5",
      "Bd3",
    ],
    prompt: "Black to move. What is White planning?",
    choices: [
      {
        label:
          "Bxh7+ — the Greek gift. Kxh7 Ng5+ and the queen comes to h5 behind it.",
        correct: true,
        explanation:
          "Bishop on d3, knight ready for g5, queen with a route to h5, and h7 defended by the king alone: the pattern is complete. …g6 or …f5 first, not after.",
        claim: { theirMoves: ["Bxh7+"] },
      },
      {
        label: "dxc5, simply winning a pawn.",
        explanation:
          "…Qxc5 or …Nxc5 takes it back at once. Look for the sacrifice before the pawn grab.",
      },
      {
        label: "Castling queenside and attacking down the b-file.",
        explanation:
          "White's attack is already aimed at h7. Nothing on the board points at the b-file.",
      },
    ],
  },
  {
    id: "pf45-ruy-na5",
    pfStep: "PF4.5",
    line: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bb5",
      "a6",
      "Ba4",
      "Nf6",
      "O-O",
      "Be7",
      "Re1",
      "b5",
      "Bb3",
      "d6",
      "c3",
      "O-O",
      "h3",
      "Na5",
    ],
    prompt: "White to move. What is Black planning?",
    choices: [
      {
        label:
          "…Nxb3, trading off your good bishop, and then …c5 and …c4 to take the queenside.",
        correct: true,
        explanation:
          "The knight went to a5 for one reason. Bc2 keeps the bishop and is why that retreat is automatic here.",
        claim: { theirMoves: ["Nxb3", "c5"] },
      },
      {
        label: "…Ng4, hitting h3 and f2.",
        explanation:
          "The h3 pawn covers g4 — the knight would simply be taken. h2–h3 was played to rule this out.",
      },
      {
        label: "Nothing in particular; Black is shuffling pieces.",
        explanation:
          '"No plan" is almost never the answer at PF4.5. If you cannot name their plan, you have not looked.',
      },
    ],
  },
  {
    id: "pf45-minority-defence",
    pfStep: "PF4.5",
    line: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "cxd5",
      "exd5",
      "Bg5",
      "c6",
      "e3",
      "Bf5",
      "Bd3",
      "Bxd3",
      "Qxd3",
      "Be7",
      "Nf3",
      "Nbd7",
      "O-O",
      "O-O",
      "Rab1",
    ],
    prompt: "Black to move. Rab1 was just played. What is White planning?",
    choices: [
      {
        label:
          "b2–b4–b5: the minority attack, trading on c6 to leave you a weak pawn there.",
        correct: true,
        explanation:
          "Rab1 has one purpose in this structure. Counter in the centre or on the kingside — you will not win the queenside race.",
        claim: { theirMoves: ["b4"] },
      },
      {
        label: "Doubling on the b-file to invade on b7.",
        explanation:
          "b7 is defended and the file is closed. The rook is behind a pawn that is going to advance, not behind an open file.",
      },
      {
        label: "Bxf6 followed by Nxd5, winning a pawn.",
        explanation:
          "d5 is defended three times. Count the defenders before you believe a pawn is falling.",
      },
    ],
  },

  // ── PF5 PIECEFIRST — improve the worst piece ──────────────────────────────
  {
    id: "pf5-french-bishop",
    pfStep: "PF5",
    line: [
      "e4",
      "e6",
      "d4",
      "d5",
      "Nd2",
      "Nf6",
      "e5",
      "Nfd7",
      "Bd3",
      "c5",
      "c3",
      "Nc6",
      "Ne2",
      "cxd4",
      "cxd4",
    ],
    prompt: "Black to move. Which of your pieces is worst placed?",
    choices: [
      {
        label:
          "The c8 bishop — it has no legal move at all, walled in by its own e6 pawn.",
        correct: true,
        explanation:
          "The French problem bishop. …b6 and …Ba6 is the standard way to give it a life, and it is worth two tempi to do it.",
        claim: { worstPiece: "c8", moves: ["b6"] },
      },
      {
        label: "The queen on d8 — it has no open file and should go to b6.",
        explanation:
          'The queen has plenty of squares and no urgent job. "Worst placed" means least useful, and a piece with zero moves wins that argument.',
      },
      {
        label: "The rook on a8 — it is undeveloped.",
        explanation:
          "It is undeveloped, but it has a future the moment a file opens. The c8 bishop has none until a pawn moves.",
      },
    ],
  },
  {
    id: "pf5-ruy-rook",
    pfStep: "PF5",
    line: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bb5",
      "a6",
      "Ba4",
      "Nf6",
      "O-O",
      "Be7",
      "Re1",
      "b5",
      "Bb3",
      "d6",
      "c3",
      "O-O",
      "h3",
      "Na5",
    ],
    prompt: "White to move. Which of your pieces is worst placed?",
    choices: [
      {
        label:
          "The a1 rook — it has no legal move, with the b1 knight and c1 bishop still at home in front of it.",
        correct: true,
        explanation:
          "This is why d2–d4 and Nb1–d2 are the moves in this structure: they are not just development, they are the only way the a1 rook ever plays.",
        claim: { worstPiece: "a1", moves: ["d4", "d3"] },
      },
      {
        label: "The b3 bishop — Black is about to trade it off with …Nxb3.",
        explanation:
          "It is about to be challenged, which is a reason to move it, but it is aimed at f7 and doing work right now.",
      },
      {
        label: "The h3 pawn — it weakens the king.",
        explanation:
          "A pawn is not a piece to improve, and h3 was played on purpose to take g4 away from a knight.",
      },
    ],
  },
  {
    id: "pf5-qid-rook",
    pfStep: "PF5",
    line: [
      "d4",
      "Nf6",
      "c4",
      "e6",
      "Nf3",
      "b6",
      "g3",
      "Bb7",
      "Bg2",
      "Be7",
      "O-O",
      "O-O",
      "Nc3",
      "Ne4",
      "Qc2",
      "Nxc3",
      "Qxc3",
      "f5",
      "b3",
      "Bf6",
      "Bb2",
      "d6",
      "Rad1",
      "Qe7",
      "Ne1",
    ],
    prompt: "Black to move. Which of your pieces is worst placed?",
    choices: [
      {
        label:
          "The a8 rook — it has no legal move and no file to aim at; the b8 knight has to come out first.",
        correct: true,
        explanation:
          "…Nd7 is not really a knight move here, it is a rook move. That is the PF5 habit: name the worst piece, then find the move that frees it.",
        claim: { worstPiece: "a8", moves: ["Nd7", "Na6"] },
      },
      {
        label: "The b7 bishop — it is biting on the g2 bishop and granite.",
        explanation:
          "It is blunted, but it is on the long diagonal and one …e5 from being your best piece. The a8 rook is doing nothing at all.",
      },
      {
        label: "The f6 bishop — it is in front of your own pawns.",
        explanation:
          "It is aimed straight at d4 through the centre. Compare mobility before you judge a piece by where it stands.",
      },
    ],
  },

  // ── PF6 CALCULATE — compare 2–4 candidates ────────────────────────────────
  {
    id: "pf6-evans",
    pfStep: "PF6",
    line: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "b4"],
    prompt:
      "Black to move — the Evans Gambit. Which moves are worth calculating?",
    choices: [
      {
        label:
          "…Bxb4, …Bb6 and …Nxb4 — your bishop is attacked, so the candidates are the ways of answering that.",
        correct: true,
        explanation:
          "When a piece is hit, the candidate list writes itself: take, move, or defend. Anything else has to be worth a bishop.",
        claim: { moves: ["Bxb4", "Bb6", "Nxb4"] },
      },
      {
        label: "…Bxf2+ — it is the only check, so it is the only candidate.",
        explanation:
          "Checks come first in PF3, not last in PF6. Kxf2 leaves you a bishop down for a pawn; a check you have calculated and rejected is done with.",
      },
      {
        label: "…d6, …Nf6 and …O-O — just develop and let White prove it.",
        explanation:
          "Developing while a bishop hangs is not a candidate list, it is skipping the step. Deal with the attacked piece.",
      },
    ],
  },
  {
    id: "pf6-two-knights",
    pfStep: "PF6",
    line: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "Ng5", "d5", "exd5", "Na5"],
    prompt: "White to move. Which moves are worth calculating?",
    choices: [
      {
        label:
          "Bb5+ and d2–d3 first, with Be2 and Bb3 as the fallbacks — your bishop is attacked and the d5 pawn is loose.",
        correct: true,
        explanation:
          "Two things need answering at once, so the candidates are the moves that answer both. Bb5+ keeps the check in hand; d3 holds the extra pawn.",
        claim: { moves: ["Bb5+", "d3", "Be2", "Bb3"] },
      },
      {
        label: "Nxf7 — the same sacrifice that works one move earlier.",
        explanation:
          "It is legal and it forks the queen and rook, but …Kxf7 leaves Black a piece up with the c4 bishop still attacked. A pattern is not a calculation.",
      },
      {
        label: "Qf3 — pile a second attacker onto f7.",
        explanation:
          "The bishop on c4 is hanging while you do it. PF6 compares candidates; it does not get to ignore the one problem on the board.",
      },
    ],
  },
  {
    id: "pf6-opera",
    pfStep: "PF6",
    line: [
      "e4",
      "e5",
      "Nf3",
      "d6",
      "d4",
      "Bg4",
      "dxe5",
      "Bxf3",
      "Qxf3",
      "dxe5",
      "Bc4",
      "Nf6",
      "Qb3",
    ],
    prompt: "Black to move. Which moves are worth calculating?",
    choices: [
      {
        label:
          "…Qe7, …Qd7 and …b6 — b7 is attacked and undefended, so calculate Qxb7 against each of them.",
        correct: true,
        explanation:
          "…Qe7 is the move because after Qxb7 comes …Qb4+, trading queens. That is a calculation, not a rule — which is exactly why the candidates get counted rather than guessed.",
        claim: { moves: ["Qe7", "Qd7", "b6"] },
      },
      {
        label: "…Nc6, developing and defending b7 at the same time.",
        explanation:
          "A knight on c6 does not see b7. Check the geometry before you count a piece as a defender.",
      },
      {
        label: "…Nxe4 — count the tactic, White's queen has left the centre.",
        explanation:
          "Bxf7+ and it is Qe6 mate whichever way the king goes. Counting only your own tactic is how PF6 becomes wishful thinking.",
      },
    ],
  },
];

/** Rung 3 positions, with the board fields replayed from each line. */
export const STEP_DRILL_POSITIONS = Object.freeze(
  STEP_DRILLS.map((entry) => {
    const fen = replayLine(entry.line).fen();
    return Object.freeze({
      type: "stepdrill",
      id: entry.id,
      pfStep: entry.pfStep,
      line: entry.line,
      fen,
      orientation: sideToMove(fen),
      lastMove: entry.line.at(-1),
      prompt: entry.prompt,
      choices: shapeChoices(entry.id, entry.choices),
      source: "authored",
    });
  }),
);

// ── Rung 5: cue drills, quizzed in the direction the protocol is used ────────

/** The eight steps as an answer set, correct flag set for one of them. */
const stepChoices = (seed, answer) =>
  Object.entries(PF_STEPS).map(([key, text]) => ({
    id: `${seed}-${key}`,
    label: `${key} ${text.split(" — ")[0]}`,
    correct: key === answer,
    explanation: text,
  }));

/**
 * Backward cues — "which step would have caught this?"
 *
 * These cost nothing to author, and that is the point: `classifyFailureStep()`
 * is already the classifier that tags the learner's own game errors, so the
 * answer key here is the same key the game report uses. A drill and a report
 * can never name different steps for the same mistake, because there is one
 * classifier.
 *
 * Only the unsafe half of the blunder-check deck is usable — a sound move was
 * not caught by any step, because there was nothing to catch.
 */
const backwardCues = () => {
  const perStep = {};
  const cues = [];

  for (const check of LICHESS_BLUNDER_CHECKS) {
    if (check.safe) continue;
    const playedSan = toSan(check.fen, check.candidate);
    const step = classifyFailureStep({ preFen: check.fen, san: playedSan });
    if (!step || !(step in CUE_ANSWERS)) continue;
    perStep[step] = (perStep[step] ?? 0) + 1;
    if (perStep[step] > MAX_CUES_PER_STEP) continue;

    const seed = `cue-${check.id}`;
    cues.push(
      Object.freeze({
        type: "cue",
        id: seed,
        pfStep: step,
        fen: check.fen,
        orientation: sideToMove(check.fen),
        playedSan,
        prompt: `${playedSan} was played here, and it was a mistake. Which step would have caught it?`,
        note: CUE_ANSWERS[step],
        choices: stepChoices(seed, step),
        source: "lichess",
      }),
    );
  }
  return cues;
};

/**
 * Cue-first drills — "which step decides this position?"
 *
 * `TIER-0-PROTOCOL-PLAN.md` §4 asks for "the opponent just moved — which
 * question do you ask first?". Taken literally the answer is PF1 in every
 * position, so the drill stops teaching after two reps and the remainder are
 * free marks. Asked one step later — you have run RESET and SAFETY, now what
 * decides it — the answer moves with the position, and it covers the steps
 * `classifyFailureStep` never returns.
 */
const CUE_FIRST = [
  {
    id: "cue-decide-force",
    answer: "PF3",
    line: ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6"],
    prompt:
      "You have run RESET and SAFETY. Which step decides this position for White?",
    note: "…Nf6 attacked your queen, and it is irrelevant: Qxf7 is mate. A step that produces a check, a capture or a threat outranks every quiet one, every time.",
  },
  {
    id: "cue-decide-break",
    answer: "PF4",
    line: [
      "d4",
      "Nf6",
      "c4",
      "g6",
      "Nc3",
      "Bg7",
      "e4",
      "d6",
      "Nf3",
      "O-O",
      "Be2",
      "e5",
      "O-O",
      "Nc6",
      "d5",
      "Ne7",
      "Ne1",
      "Nd7",
    ],
    prompt:
      "There is not one legal capture or check on the board. Which step decides this position for White?",
    note: "A locked centre is decided by where the pawns break — c4–c5 for White, …f5 for Black. When the forcing steps come back empty, this is the one that produces a move.",
  },
  {
    id: "cue-decide-prevent",
    answer: "PF4.5",
    line: [
      "e4",
      "e6",
      "d4",
      "d5",
      "Nc3",
      "Nf6",
      "Bg5",
      "Be7",
      "e5",
      "Nfd7",
      "Bxe7",
      "Qxe7",
      "f4",
      "O-O",
      "Nf3",
      "c5",
      "Bd3",
    ],
    prompt:
      "Nothing of yours is hanging, and the one capture available changes nothing. Which step decides this position for Black?",
    note: "White is one move from Bxh7+ Kxh7 Ng5+ and Qh5. …g6 or …f5 now costs a tempo; a move later it costs the game. Their plan is the move here.",
  },
];

const cueFirstPositions = () =>
  CUE_FIRST.map((entry) => {
    const fen = replayLine(entry.line).fen();
    return Object.freeze({
      type: "cue",
      id: entry.id,
      pfStep: entry.answer,
      line: entry.line,
      fen,
      orientation: sideToMove(fen),
      lastMove: entry.line.at(-1),
      prompt: entry.prompt,
      note: entry.note,
      choices: stepChoices(entry.id, entry.answer),
      source: "authored",
    });
  });

/** Rung 5 — both cue directions, backward first. */
export const CUE_POSITIONS = Object.freeze([
  ...backwardCues(),
  ...cueFirstPositions(),
]);

/**
 * The whole ladder, in rung order.
 *
 * `protocol-drills.js` folds this into the tier-0 deck. Rung 4 is not in the
 * list because it is not authored here: blunder checks are interleaved through
 * the ladder by the deck builder, and `scan` / `sweep` reach the learner
 * through the warm-up at the head of every session.
 */
export const LADDER_POSITIONS = Object.freeze([
  WORKED_EXAMPLE,
  ...COMPLETION_POSITIONS,
  ...STEP_DRILL_POSITIONS,
  ...CUE_POSITIONS,
]);
