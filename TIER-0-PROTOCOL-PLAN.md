# Tier-0 protocol: teach each PF step before combining them

> **Revised 2026-09-04** against `.dev/PRD.md` §80 and the decisions in
> `docs/IMPLEMENTATION-PLAN.md`. Two things changed since the first draft:
> the ladder grew from three rungs to five, and this is **step 12 of 18**, not
> the next thing to build — it now depends on `sweep` (step 10), which supplies
> the PF2 drill the first draft had to defer. Read
> `docs/IMPLEMENTATION-PLAN.md` §4 for the order and §3 for the numbers.

## Context

The Tier-0 curriculum item `PF-PROTOCOL` (`src/data/curriculum.js`) is the very
first thing a learner sees, by design (no prereqs). Today its only content
(`PROTOCOL_POSITIONS` in `src/lib/protocol-drills.js`) is:

- `type: "protocol"` — read all 8 step names once, with a `STEP_HINTS` gloss per
  step (shipped in `fff2c7a`, along with the off-by-one fix that made PF7
  display at all), then find a tactic.
- `type: "blundercheck"` — "is this move safe?" reps, which is PF7 VERIFY's
  dedicated many-reps drill, sourced for free from the Lichess puzzle import.

The user's feedback: PF7 gets real dedicated practice (the blunder-check reps),
but PF1–PF6 never do — they're only ever read as one-line questions inside the
combined walkthrough, on an unfamiliar tactical position, with no worked example
and no isolated practice. The ask: explain the protocol at a high level with a
worked example, then drill each step individually with many reps
(blunder-check style), *then* combine into the full walkthrough — mirroring what
already works well for PF7.

Constraint already agreed with the user: **keep `PF-PROTOCOL` as the single
Tier-0 item** — the "99 items" count is a documented, test-enforced headline
number (`curriculum.test.js` asserts `EXPECTED_TOTAL = 99`) and isn't changing.
Everything below happens *inside* that one item's content and drill sequence.

## The five-rung ladder

The original plan went worked example → multiple choice → combined walkthrough.
Cognitive load theory puts a rung between the first two, and the interleaving
literature puts one after the last (PRD §80.1). The full ladder, per PF step:

| Rung | Type | What the learner does |
|---|---|---|
| 1 | `protocol` + `stepAnswers` | Studies the step fully answered on a real position |
| 2 | `completion` | Seven steps are filled in; supplies the missing one |
| 3 | `stepdrill` | Answers that step alone on a fresh position, multiple choice |
| 4 | `scan` / `sweep` / `blundercheck` | Many fast reps of the same question |
| 5 | `protocol` unlabelled, or `cue` | Isn't told which step applies, and has to notice |

Rung 4 is why this step now waits on `sweep`: rungs 1–3 are cheap and hand-authored,
and rung 4 is not authorable at volume — it has to be generated (PRD §79.2).

## Approach

### 1. Worked-example intro — reuse `ProtocolDrill`, don't build a new screen

Rather than a separate intro component, enrich the **first** `protocol`-type
position with an optional `stepAnswers` map (`{ PF1: "...", PF2: "...", ... }`).
In `src/components/protocol-drill.jsx`, when a step has a `stepAnswers` entry
for the current position, render it under the existing hint text — a concrete,
filled-in answer ("Black just played ...Nf3, attacking your queen and
threatening ...Nxd2" / "Nothing of yours hangs" / "Yes: Nxd5+ forks king and
rook — that's the move") instead of a blank question. It still ends on the same
"find the move" grading it does today, so no new grading path and no new
component.

Pick the existing T-01 knight-fork rehearsal position (already imported via
`LICHESS_POSITIONS`) as the worked example and hand-write its 8 step answers in
`protocol-drills.js`.

### 2. Completion problems — the missing middle (`type: "completion"`)

Same component as `protocol`, with `stepAnswers` present for **all steps but
one**. The blank step is the graded one: the learner picks its answer from a
short list before the walkthrough continues. This is the rung that bridges
worked example to full problem without the load of either, and it costs one
optional field plus one branch in `ProtocolDrill` — no new component.

Author 2 per step for the five steps in §3, reusing the same positions.

### 3. Per-step isolated drills — new `StepDrill` component, cloned from `BlunderCheckDrill`

New component `src/components/step-drill.jsx`: same shape as
`blunder-check-drill.jsx` (board, no drag, a prompt, a row of choice buttons,
correct/incorrect result panel, `onMiss`/`onHelp`/`onResolve` contract) but
generalized to N multiple-choice answers instead of yes/no.

Position shape (`type: "stepdrill"`):
```js
{
  type: "stepdrill", id, pfStep, fen, orientation, prompt,
  choices: [{ id, label, correct: bool, explanation }],
  source: "authored",
}
```

New content file `src/data/step-drills.js` — hand-authored, ~3 positions each
for the five steps that have **no dedicated practice today**:

- PF1 RESET — "what did that move change?" (MC: which threat/weakness is new)
- PF4 BREAK — "is there a pawn break here, and which pawn?"
- PF4.5 PREVENT — "what is the opponent's plan?"
- PF5 PIECEFIRST — "which of your pieces is worst placed?"
- PF6 CALCULATE — "which 2–4 moves are worth calculating here?"

**PF2 and PF7 need no authored content here, and that is the change from the
first draft.** PF7 has blunder-check; PF2 now has `sweep` — "click every piece
of yours they can win" is PF2 SAFETY in one click with a generated answer key
(PRD §80.4), so the step that was the thinnest becomes the one with the most
reps. PF3 FORCE stays out because it is the dominant step across nearly all of
Tier 1/2 (42+16 items) and is already drilled there.

These five are hand-picked, textbook-clear positions (not Stockfish-gated like
the endgame tier — "worst piece"/"pawn break" aren't binary-verifiable the way a
king-and-pawn endgame is), each with an explanation string shown after
answering. Because they are not certifiable, they are exempt from
`verify:drills` by construction and must be marked `source: "authored"` so the
gate can tell the difference.

### 4. Cue drills — quiz the cue, not only the answer (`type: "cue"`)

The most useful addition from PRD §80.2. PF7 is a set of if–then cue→action
pairs, so quiz it in the direction it is used:

- **Backward:** here is a position and the move someone played — *which step
  would have caught this?*
- **Cue-first:** the opponent just moved — *which question do you ask first?*

Same component as `StepDrill`; the answer set is the eight steps. The backward
direction generates for free: `classifyFailureStep()` already produces the
answer key for any tagged error — including the learner's own, which makes this
the most memorable quiz item the app can build. Cap it to the steps the
classifier will actually assign (it deliberately never returns PF1/PF4/PF4.5 —
see PRD §82.4), and hand-author the rest.

### 5. Scaffold stages, replacing "it resurfaces on rotation"

The first draft leaned on `selectPositions` rotation to re-show the worked
example. Replace that with a deliberate stage, driven off the `PF-PROTOCOL`
card — and per decision D7 in `docs/IMPLEMENTATION-PLAN.md`, driven by
demonstrated performance on unlabelled positions, with FSRS stability only as
the default trigger:

| Stage | Default trigger | What is shown |
|---|---|---|
| 1 | new card | All eight steps, each with `STEP_HINTS` and a filled-in `stepAnswers` |
| 2 | learning | All eight step names plus `STEP_HINTS`; learner answers each |
| 3 | review, stability < 7d | Step names only, no hints; a prompt asks which steps were used |
| 4 | stability ≥ 21d, and unlabelled reps passing | Nothing. Find the move; the protocol is checked only on a miss |

This is what gates the already-shipped `STEP_HINTS`: they stay exactly as
written and become stage-1–2 content instead of unconditional. Kalyuga's
expertise-reversal effect is the reason it must fade — guidance that helps a
novice actively harms someone who has internalised the procedure.

### 6. Reorder `PROTOCOL_POSITIONS`

In `protocol-drills.js`, change the sequence to:

```
[worked example: protocol + stepAnswers]
→ [completion ×5 steps]
→ [stepdrill: PF1 → PF4 → PF4.5 → PF5 → PF6]
→ [cue drills]
→ interleave(remaining rehearsals, blunder-checks)   // unchanged from today
                                                     // rehearsal tail runs unlabelled at stage 4
```

`selectPositions` already shows a rotating window of `POSITIONS_PER_ITEM` (3)
per sitting, advancing by `card.reps`, so this delivers the ladder gradually
across sittings rather than all at once — consistent with how the rest of the
app paces content, and it is what makes a five-rung ladder fit inside one item.

### 7. Wiring

- `src/components/study-mode.jsx`: add `stepdrill: StepDrill`, `cue: StepDrill`
  and `completion: ProtocolDrill` to `DRILL_COMPONENTS` and `DRILL_LABELS`
  (same one-line-per-type pattern already used there).
- `src/lib/session.js`: add `MINUTES_PER_POSITION` entries — `stepdrill` 0.5,
  `cue` 0.4, `completion` 1.5.
- `src/lib/session.test.js`: extend the position-`type` whitelist (the test
  named "tags every position with a known type", ~line 120-134) with the three
  new types, and add `expectPlayable` branches (~line 34-57): `stepdrill` and
  `cue` need `choices` as a non-empty array with exactly one `correct: true`
  entry; `completion` needs `stepAnswers` with exactly one step missing.
- `src/lib/protocol-drills.test.js`: worked example is first and carries all 8
  `stepAnswers`; each of the five steps has completion and stepdrill content;
  ordering puts the ladder before the interleaved rehearsal/blunder-check tail;
  the stage selector returns 1 for a new card and 4 for a mature one.

### 8. Docs

Update the Tier 0 section of `docs/PF7/LEARNING-SYSTEM.md` to describe the
richer internal sequence (still 1 item, still 99 total) — the doc already
states "the book is generated from curriculum.js... otherwise the book and the
app drift," so this keeps that promise for the one item whose *internal*
structure changed.

## Files touched

- `src/components/protocol-drill.jsx` — `stepAnswers`, completion branch, stage gating
- `src/components/step-drill.jsx` — new, serves both `stepdrill` and `cue`
- `src/data/step-drills.js` — new, hand-authored content
- `src/lib/protocol-drills.js` — worked example, completion, cue, reordering, stage selector
- `src/components/study-mode.jsx` — dispatch/label wiring for three types
- `src/lib/session.js` — cost estimates for the new types
- `src/lib/session.test.js`, `src/lib/protocol-drills.test.js` — coverage
- `docs/PF7/LEARNING-SYSTEM.md` — Tier 0 note

## Verification

- `npx vitest run src/lib/protocol-drills.test.js src/lib/session.test.js src/lib/curriculum.test.js`
- `npm run lint`
- Manually run `npm run dev`, open Study/Curriculum, drill `PF-PROTOCOL` from a
  fresh (no-card) state and confirm the ladder in order: worked example with
  filled-in answers → completion → step-specific MC quizzes → cue quiz → the
  combined walkthrough, then confirm a mature card shows no hints.

## Status

**Implemented, 2026-09-06** — step 12 of `docs/IMPLEMENTATION-PLAN.md`. See §7
of that file for what shipped and where the implementation departed from this
spec. The four departures, in short:

1. **New files live in `src/pf/`,** per the plan of record's cross-cutting rule,
   not in `src/components/` and `src/data/` as the "Files touched" list above
   says: `step-drills.js`, `step-drill.jsx`, `scaffold.js`, `notation.js`.
2. **A `completion` carries no solution.** This spec has it continue to the
   move; requiring one "correct" move on a quiet strategic position would mark
   a learner wrong for playing a perfectly good alternative. The graded claim
   is the missing step, which is also what keeps the type out of `ENGINE_TYPES`
   in `verify:drills`.
3. **The ladder is not one solid block.** A blunder check runs every third
   position through it. Thirty-odd ladder positions is a dozen sittings, and
   PF7 is the step club players lose to — rung 4 running alongside rungs 1–3
   preserves the rung order and the reps.
4. **Cue-first asks a different question.** "Which question do you ask first?"
   has the answer PF1 in every position. It is asked one step later instead:
   "you have run RESET and SAFETY — which step decides this position?"

Positions are written as SAN lines and replayed at import, never as hand-typed
FENs, which is what makes `lastMove` — and therefore PF1 RESET — answerable at
all.
