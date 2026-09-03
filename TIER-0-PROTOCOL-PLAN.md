# Tier-0 protocol: teach each PF step before combining them

## Context

The Tier-0 curriculum item `PF-PROTOCOL` (`src/data/curriculum.js`) is the very
first thing a learner sees, by design (no prereqs). Today its only content
(`PROTOCOL_POSITIONS` in `src/lib/protocol-drills.js`) is:

- `type: "protocol"` — read all 8 step *names* once (generic, same on every
  position), then find a tactic. Just fixed an off-by-one bug here so PF7
  actually displays, but the deeper problem remains.
- `type: "blundercheck"` — "is this move safe?" reps, which is PF7 VERIFY's
  dedicated many-reps drill, sourced for free from the Lichess puzzle import.

The user's feedback: PF7 gets real dedicated practice (the blunder-check
reps), but PF1–PF6 never do — they're only ever read as one-line questions
inside the combined walkthrough, on an unfamiliar tactical position, with no
worked example and no isolated practice. The ask: explain the protocol at a
high level with a worked example, then drill each step individually with many
reps (blunder-check style), *then* combine into the full walkthrough — mirroring
what already works well for PF7.

Constraint already agreed with the user: **keep `PF-PROTOCOL` as the single
Tier-0 item** — the "99 items" count is a documented, test-enforced headline
number (`curriculum.test.js` asserts `EXPECTED_TOTAL = 99`) and isn't changing.
Everything below happens *inside* that one item's content and drill sequence.

## Approach

### 1. Worked-example intro — reuse `ProtocolDrill`, don't build a new screen

Rather than a separate intro component, enrich the **first** `protocol`-type
position with an optional `stepAnswers` map (`{ PF1: "...", PF2: "...", ... }`).
In `src/components/protocol-drill.jsx`, when a step has a `stepAnswers` entry
for the current position, render it under the existing hint text — a
concrete, filled-in answer ("Black just played ...Nf3, attacking your queen
and threatening ...Nxd2" / "Nothing of yours hangs" / "Yes: Nxd5+ forks king
and rook — that's the move") instead of a blank question. It still ends on
the same "find the move" grading it does today, so no new grading path, no
new component, and it reuses the off-by-one fix already shipped.

Pick the existing T-01 knight-fork rehearsal position (already imported via
`LICHESS_POSITIONS`) as the worked example and hand-write its 8 step answers
in `protocol-drills.js`. It isn't strictly "one-time" — since `selectPositions`
rotates a window by `card.reps`, it will resurface again once the rotation
wraps — which is fine and consistent with spaced repetition; no extra
one-shot state machinery needed.

### 2. Per-step isolated drills — new `StepDrill` component, cloned from `BlunderCheckDrill`

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

**Skipping PF2, PF3, PF7 for new content** — PF7 already has its dedicated
many-reps drill (blunder-check), PF3 FORCE is the dominant step across nearly
all of Tier 1/2 (42+16 items), and PF2 defensive-motif recognition lives
there too. Flag this trade-off; easy to add a PF2-specific "is there an
emergency" drill later using the same `StepDrill` component if it turns out
to still feel thin.

These are hand-picked, textbook-clear positions (not Stockfish-gated like the
endgame tier — "worst piece"/"pawn break" aren't binary-verifiable the way a
king-and-pawn endgame is), each with an explanation string shown after
answering.

### 3. Reorder `PROTOCOL_POSITIONS`

In `protocol-drills.js`, change the sequence to:

```
[worked-example rehearsal]
→ [PF1 stepdrills] → [PF4] → [PF4.5] → [PF5] → [PF6]
→ interleave(remaining rehearsals, blunder-checks)   // unchanged from today
```

`selectPositions` already shows a rotating window of `POSITIONS_PER_ITEM` (3)
per sitting, advancing by `card.reps`, so this delivers the sequence
gradually across sittings rather than all at once — consistent with how the
rest of the app paces content.

### 4. Wiring

- `src/components/study-mode.jsx`: add `stepdrill: StepDrill` to
  `DRILL_COMPONENTS` and `DRILL_LABELS` (same one-line-per-type pattern
  already used there).
- `src/lib/session.js`: add a `stepdrill` entry to `MINUTES_PER_POSITION`
  (similar to `blundercheck`'s 0.5).
- `src/lib/session.test.js`: extend the position-`type` whitelist (the test
  named "tags every position with a known type", ~line 120-134) with
  `"stepdrill"`, and add a `case "stepdrill":` branch to `expectPlayable`
  (~line 34-57) checking `position.choices` is a non-empty array with exactly
  one `correct: true` entry.
- `src/lib/protocol-drills.test.js`: add coverage — worked example is first
  and carries all 8 `stepAnswers`; each of the five steps has stepdrill
  content; ordering puts stepdrills before the interleaved rehearsal/blunder-
  check tail.

### 5. Docs

Add a short note under Tier 0 in `docs/PF7/LEARNING-SYSTEM.md` describing the
richer internal sequence (still 1 item, still 99 total) — the doc already
states "the book is generated from curriculum.js... otherwise the book and
the app drift," so this keeps that promise for the one item whose *internal*
structure just changed.

## Files touched

- `src/components/protocol-drill.jsx` — render optional `stepAnswers`
- `src/components/step-drill.jsx` — new
- `src/data/step-drills.js` — new, hand-authored content
- `src/lib/protocol-drills.js` — worked example content, reordering, imports
- `src/components/study-mode.jsx` — dispatch/label wiring
- `src/lib/session.js` — cost estimate for new type
- `src/lib/session.test.js`, `src/lib/protocol-drills.test.js` — test coverage
- `docs/PF7/LEARNING-SYSTEM.md` — Tier 0 note

## Verification

- `npx vitest run src/lib/protocol-drills.test.js src/lib/session.test.js src/lib/curriculum.test.js`
- `npm run lint`
- Manually run `npm run dev`, open Study/Curriculum, drill `PF-PROTOCOL` from
  a fresh (no-card) state and confirm: worked example first with filled-in
  answers, then step-specific MC quizzes, then the existing combined
  walkthrough.

## Status when paused

Not yet implemented. Was mid-way through re-reading `src/lib/protocol-drills.js`
(current state, including the earlier off-by-one fix and step hints already
shipped) and `src/data/lichess-positions.js` (`T-01` entries, to pick the
worked-example FEN) before writing the new content. No code changes made yet
for this plan — resume at step 1 above.
