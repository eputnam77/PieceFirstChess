# Implementation plan of record

> Written 2026-09-04, after `.dev/PRD.md` §§74–88 and `docs/ai-notes.md` §6 were
> added (commit `7c345af`) with GPT review comments inline.
>
> **This file is the plan of record.** `.dev/PRD.md` §§74–88 is the *design*
> argument and keeps the review dialogue; `TIER-0-PROTOCOL-PLAN.md` is the
> detailed spec for one step of this sequence. Where any of them disagrees with
> this file on *order, scope, or a number*, this file wins — it is the one that
> has had the GPT comments resolved into decisions.

> **Status, 2026-09-05: steps 1–11 are built.** That is the whole minimum
> coherent slice §4 describes. Green on `npm run lint` (0 errors),
> `npm run test:run` (393 passing), `npm run build`,
> `npm run verify:drills -- --strict` (863/863, 598 certificates) and
> `npm run verify:endgames` (94/94).
> Step 12 (the Tier-0 ladder) is the next thing to build. Per-step notes are
> in §7.

---

## 1. Does the plan change? Yes — mainly the order

The previous plan of record was `TIER-0-PROTOCOL-PLAN.md`, whose own status note
says "Not yet implemented — resume at step 1". That is no longer the next thing
to build.

| | Before | Now |
|---|---|---|
| Next thing to build | Tier-0 protocol ladder (worked example → step drills → combine) | Merge hygiene + CI gate + `src/pf/verdict.js`, then the **Commit Gate** |
| Tier-0 ladder | The whole plan | Step 10 of 16, and expanded from 3 rungs to 5 (PRD §80.1) |
| PF2's missing drill | Deferred, "flag the trade-off" | Solved by `sweep` (PRD §80.4) — build it *before* the ladder |
| Grading | Each drill grades itself | One `src/pf/verdict.js`, precomputed certificates (PRD §83) |
| CI | Not in the plan | Moved ahead of the first generated drill |
| AI | OpenAI + Gemini, ad hoc | Provider registry + OpenRouter, last, and off by default in drills |

Three things did **not** change, and are still hard constraints: 99 items stays
99, no new top-level surface or button (PRD §74.4), and nothing in the plan may
require an API key.

## 2. Does any shipped code need reverting? No

Audited on a clean tree at `7c345af`. **None of PRD §§74–88 has been built yet**
— no `src/pf/`, no `verdict.js`, no `providers.js`, no `MERGE-NOTES.md`, no
`upstream` remote, no new position types. So there is nothing built on a
superseded assumption, and nothing to unwind.

The three recent code commits all survive intact:

| Shipped | Verdict | Note |
|---|---|---|
| Tier-3 endgame content (`endgame-drills.js`, +793 lines) | Keep | `npm run verify:endgames` re-run on the audit: **94/94 certified**. This is exactly the model PRD §83.2 generalises to `verify:drills` |
| Drill-board sizing fix (6 components) | Keep | Unrelated to this plan |
| `ProtocolDrill` off-by-one fix | Keep | The ladder in step 10 builds directly on it |
| `STEP_HINTS` in `protocol-drills.js` | Keep, then gate | Always-on scaffolding. PRD §80.3 says assistance must fade, so in step 10 these become the *stage 1–2* rendering rather than unconditional. Not a revert — a condition added around existing content |

Two pre-existing problems found during the audit, both of which now block a step
of this plan rather than being cosmetic:

- **`src/lib/db.test.js` "sorts newest-first by timestamp" fails on `main`.**
  `saveGame()` calls `Date.now()` twice (id, then `timestamp`) and the test
  mocks it with `mockReturnValueOnce`, so all three rows get the real clock,
  the sort ties, and order falls back to insertion order. Production code is
  fine; the mock should be `mockReturnValue`. **Must be fixed before step 2**,
  since step 2 makes a red test block deploys.
- **11 of the 13 `analyze()` call sites outside `stockfish.js` pass neither
  `timeoutMs` nor `movetimeMs`** — `use-engine-coach.js` ×8 (including the
  Best Move path at line 304 and Think Like a GM's MultiPV searches at 273 and
  448), `App.jsx` ×2, `analyzer.js` ×1. Only `structure-drill.jsx` ×2 pass
  both. This is the hang class CLAUDE.md already records, and it sits directly
  under the two features the Commit Gate and the PF7 Readout are built on.
  Step 5.

## 3. Decisions resolved from the GPT comments

The comments are review, not spec. These are the calls, so implementation is not
left choosing between a section and its own footnote.

| # | PRD/notes said | Resolution to implement |
|---|---|---|
| D1 | Stockfish is "the single source of truth" (§83, notes §6.1) | Rename throughout to **"the app's adjudicator under a recorded analysis budget."** Rules and tablebases outrank it. Never render a shallow score as an objective property of the position |
| D2 | `isRealTactic(lines)` = best vs 2nd-best gap > 150cp (§83.1) | **Insufficient alone.** Require a motif/refutation certificate **and** engine confirmation. Two equal winning moves are still a tactic; a quiet move can show a 150cp gap |
| D3 | `gradeFromEngine(cpLoss, ms)` (§83.1); latency maps to FSRS `easy/good/hard` (§79.3) | **Drop `ms` from the grade.** Signature is `gradeFromEngine(cpLoss)`. Latency is recorded as telemetry, reported as a within-learner median, and may not affect scheduling until app data shows it predicts later unprompted accuracy |
| D4 | Adaptive band: `+15` correct / `−30` miss "converges to 80–85%" (§81.3) | **Arithmetically wrong** — that rule has zero drift at 66.7%. Use a **transformed staircase: difficulty up one step (50 rating points) after 4 consecutive correct, down one step on any miss** — converges to ≈84% with no model fitting. (The weighted-up-down equivalent, if per-answer deltas are wanted, is +15/−85, not +15/−30.) Simulate before shipping. Label the dashboard value **"puzzle difficulty"**, never a rating |
| D5 | Wrong reason chip downgrades the move grade to `hard` (§78.4) | **No.** Move accuracy and explanation accuracy are two traces. Keep the objective move grade; schedule the concept card sooner instead. Several reason chips may be defensible |
| D6 | Fixed non-skippable 20-rep warm-up floor (§82.5) | **Adaptive and skippable:** 3–10 reps per step, driven by recent live-game errors. A fixed floor overrides FSRS on stable skills and can eat a whole 20-minute session |
| D7 | Scaffold fades at stability < 7d / ≥ 21d (§80.3) | Calendar thresholds are **defaults only**. Advance and restore the stage from demonstrated performance on fresh unlabelled transfer items — FSRS stability estimates card recall, not procedural fluency |
| D8 | Verify LLM output by regexing SAN/UCI and numbers (notes §6.5) | **Schema-constrained JSON** whose claims carry IDs referencing the supplied engine payload; render the final sentence deterministically. Validate referenced moves against the frozen FEN. Regex over prose is too brittle to be the safety boundary |
| D9 | OpenRouter attribution header `X-Title` (§84.2, notes §6.6) | Use **`X-OpenRouter-Title`**; `X-Title` is only the backward-compatible form. Also: OpenAI wire compatibility ≠ behavioural compatibility — tool/structured-output/streaming flags live **per curated model**, not per provider |
| D10 | Near-miss share 1 in 6 → "raise to 1 in 4" as research-derived (§75.4, §78.3) | Ship as a **named constant** with the importer and a test enforcing whatever it is set to; treat 1-in-4 as a hypothesis to compare, not a finding |
| D11 | Priority order PF7 → PF2 → PF3 → PF6 → rest (§76) | This is the **cold-start prior**, not a permanent rule. Once the learner's own error tally has mass, it sets the weights |
| D12 | Commit Gate default on ("Coached reveal", default on) (§77.1) | **Default off, behind a flag, for one instrumented pilot.** Selecting a candidate must never commit the game move or let the engine reply first: snapshot the queried FEN and use a reversible ghost-candidate interaction. Decide default-on from measured skip rate, completion rate, and added seconds per query |
| D13 | Scan/sweep answer keys are Stockfish-verified (§79.2, §83.2) | Prove keys **first by deterministic legal-board logic** (`chess.js`, `looseMaterial()`); the engine may only *reject* unsound targets. Semantic prompts like "the piece doing all the defending" cannot be engine-certified — those stay hand-authored or ship later |
| D14 | Certificates carry `{ depth, engineVersion, verifiedAt }` (§83.2) | Record the **full analysis contract**: engine version/binary hash, depth *and* node budget, MultiPV, non-default options, score perspective, and mate handling. A certificate you cannot reproduce is not a certificate |
| D15 | 85% is the optimal training accuracy (§75.3); "recognition, not search" (§75.1) | Framing only, but it changes copy: 85% is a **starting target to test**, and recognition **guides selective search** rather than replacing it — so PF6 CALCULATE is not deprioritised on a false dichotomy. Lichess `rating` is population difficulty, not a per-PF-step scale |
| D16 | "One protocol, three surfaces", but the UI has four (§74.3) | Real ambiguity, **unresolved — see §6**. Study and Curriculum need either one sentence each or a visible merge |

## 4. Build order (revised)

Supersedes PRD §87. Changes from it: a red test is fixed first; CI gates move
from 14 to 2 (ahead of the first generated content); the Commit Gate ships
behind a flag with instrumentation; `sweep` lands before the Tier-0 ladder that
depends on it.

| # | Step | Size | Depends on | Done when |
|---|---|---|---|---|
| 1 | ✅ Fix `db.test.js` mock (§2) | tiny | — | `npx vitest run` is green |
| 2 | ✅ CI gate: `lint` + `test` in `.github/workflows/deploy.yml` | small | 1 | A failing test blocks a deploy |
| 3 | ✅ Merge hygiene: `upstream` remote, `MERGE-NOTES.md`, `@pf` alias in all four config files, `src/pf/` | small | — | `git fetch upstream` works; `@pf/x` resolves in vite, vitest, jsconfig, eslint |
| 4 | ✅ `src/pf/verdict.js`: `verdictFor`, `practicalLoss`, `candidateSpread`, `gradeFromEngine(cpLoss)` (D3), `isRealTactic(lines, certificate)` (D2), `analysisBudget(useCase)`. `analyzer.js` imports its thresholds from here | small | 3 | Same move + same position ⇒ same verdict in analyzer, hints, and every drill; unit-tested with no worker and no IndexedDB |
| 5 | ✅ Analysis-budget enforcement: the 11 unbounded call sites pass both bounds from `analysisBudget()`; add the test or `no-restricted-syntax` rule | small | 4 | No bare `analyze(fen, depth, multiPV)` outside `stockfish.js` |
| 6 | ✅ **Commit Gate**, flag-off, ghost candidate, frozen FEN, `srs-db` v3 event store (D12) | medium | 4, 5 | One PF-tagged event per committed prediction; skip is one click; no game move can be committed by predicting |
| 7 | ✅ Commit Gate pilot readout: skip rate, completion rate, added seconds, events/session | tiny | 6 | Enough data to decide the default honestly |
| 8 | ✅ **PF7 Readout** card, beside Think Like a GM for one release | small | 4 | Eight one-clause lines, all engine- or detector-derived, "nothing obvious" allowed; no LLM on the path |
| 9 | ✅ `npm run verify:drills` — generalise `verify-endgames.js`; certificate schema per D14; wire into CI | medium | 2, 4 | No generated position ships without a reproducible certificate |
| 10 | ✅ **`scan` / `sweep`** drills + generator (D13), untimed first, latency as telemetry (D3) | medium | 9 | 20 reps/minute, offline, deterministic; `sweep` gives partial credit; PF2 has a dedicated drill |
| 11 | ✅ Adaptive warm-up (D6): 3–10 reps per step at the head of the queue, skippable | small | 10 | Session budget still honest with new `MINUTES_PER_POSITION` entries |
| 12 | **Tier-0 ladder** — `TIER-0-PROTOCOL-PLAN.md` as revised, plus rungs 2 (`completion`) and 5 (unlabelled), `cue` type, scaffold stages (D7) | medium | 10 | Still 1 item, still 99; worked example → completion → `stepdrill` → speeded → unlabelled; `STEP_HINTS` shown only at stages 1–2 |
| 13 | Lock visibility in `curriculum-dashboard.jsx` (§81.2) | small | — | Every locked item names its key in one sentence |
| 14 | Adaptive band + stretch rep (D4), simulated before shipping | small | 10, 12 | Per-PF-step difficulty converges near the target band; a missed stretch rep neither lowers the band nor grades `again` |
| 15 | **`compare` drills** — stronger / recovery / near-miss (D5, D10) | medium | 9 | One component, three generators; recovery graded on `practicalLoss`; near-miss share enforced by test |
| 16 | **Personal deck** — `positions` store, own blunders as `compare` drills, then structurally similar family reps (GPT §82.2) | medium | 6, 15 | A Tuesday blunder returns Thursday with your own move as a candidate, and seeds discrimination reps rather than exact-FEN memorisation |
| 17 | Recurrence escalation + retire, constants marked tunable (§82.3) | small | 16 | Pin announces itself once and states its exit condition |
| 18 | Provider registry + OpenRouter (D8, D9); AI off by default in drills | small | — | Adding a provider is a data entry; every AI surface has an engine-authored fallback as its default rendering path |

**Steps 1–11 are the minimum coherent slice.** They deliver: a green gate, one
verdict module, a Best Move that asks before it answers, a readable protocol
readout, thousands of free recognition reps, and a live error loop — without
touching the 99, the control bar, or requiring a key.

## 5. Cross-cutting rules

- **Every new file goes in `src/pf/`.** Existing PF-only files do not move
  (PRD §85.2, §88) — a rename is merge cost with no benefit.
- **Every edit to an upstream-shared file is one additive call site with a
  default**, and gets a line in `MERGE-NOTES.md` with its reason.
- **New drills are new `type` values**, one entry each in `DRILL_COMPONENTS`,
  `DRILL_LABELS`, and `MINUTES_PER_POSITION`, plus the `session.test.js`
  whitelist and an `expectPlayable` branch. That is the whole extension
  mechanism; it now works **eight** ways, `scan` and `sweep` being the two added
  in step 10.
- **Numbers in §§75–82 are falsifiable parameters, not settled science.** Any
  ratio, threshold, or cadence ships as a named constant in one place.
- **Instrument before defaulting.** Nothing becomes default-on for a behaviour
  change (the gate, the band, latency-driven scheduling) until the app's own
  data supports it.

## 6. Open questions

1. ~~**The Chess King upstream repository URL.**~~ **Answered 2026-09-05:**
   `https://github.com/Iamsdt/chess`. Added as `upstream` and fetched; the merge
   base is `4fb022b`, which is also `upstream/main`'s tip, so upstream has not
   moved since the fork and no merge has been needed yet. Its *push* URL is set
   to the invalid `DISABLED-no-push` so a stray `git push upstream` fails
   loudly. See `MERGE-NOTES.md`.
2. ~~**Study vs Curriculum (D16).**~~ **Resolved 2026-09-05: one sentence each,
   no merge.** Study is *"Today's queue — what to work on now, chosen for
   you"*; Curriculum is *"The map and your progress — every item, and where you
   stand on it."* Both are subtitles in the respective overlay headers; the
   control bar is untouched and stays frozen at two buttons (PRD §74.4).
3. **Commit Gate default** after the step-7 pilot: on everywhere, on for
   Analyze only, or opt-in. Still open — and by D12 it is *supposed* to stay
   open until the pilot has data.

---

## 7. What steps 1–11 actually shipped

Notes for whoever picks up step 6, including the places the implementation went
past the letter of a step and why.

### Step 1 — the red test

`src/lib/db.test.js` "sorts newest-first by timestamp". `saveGame()` calls
`Date.now()` twice per record (once for the id, once for `timestamp`), so
`mockReturnValueOnce` only ever covered the id and left the timestamp on the
real clock; all three rows tied and the sort became a no-op. `mockReturnValue`
fixes it. Production code was never wrong.

### Step 2 — the CI gate, and the CRLF problem underneath it

`deploy.yml` gained a `verify` job (`npm run lint`, `npm run test:run`) that
`build` now `needs:`, so a red test blocks the deploy instead of following it.
`npm run test:run` is new — `npm test` is watch mode and would hang CI.

**The gate was unusable until a line-ending problem was fixed.** `npm run lint`
reported **16,914 errors, every one of them `prettier/prettier` "Delete ␍"**:
the index is LF, `core.autocrlf=true` checks the tree out as CRLF on Windows,
and Prettier enforces LF. A lint gate that is red for a reason unrelated to the
change under test is not a gate. Fixed with a `.gitattributes` pinning
`* text=auto eol=lf` plus a one-off normalisation of the 171 affected
working-tree files. `git diff` confirms this changed no committed content — the
index was already LF. Lint is now **0 errors, 127 warnings**.

### Step 3 — merge hygiene

`upstream` added and fetched (see §6.1). `@pf` registered in all four config
files. `MERGE-NOTES.md` written, and rather than restating the PRD's predicted
merge surface it carries the **measured** one: 175 of our 230 tracked files also
exist upstream, and we have changed 17 of them. Two corrections to PRD §85.3
fell out of that:

- `src/lib/progress.js` is listed there as "untouched". It is not — it carries
  the same Safari-private-browsing `try/catch` fix as `db.js`, because
  `indexedDB.open` throws synchronously there instead of going through
  `request.onerror`, leaving the promise unsettled. Both fixes are worth
  offering upstream.
- `src/App.jsx` is the one genuinely expensive row (~125 added lines across
  several regions). Collapsing it to one `usePieceFirst()` hook and one
  `<PieceFirstLayer/>` mount, as §85.3 wants, is **not done**, and is the
  highest-value merge-cost work left.

### Step 4 — `src/pf/verdict.js`

Exports `verdictFor`, `isError`, `gradeFromEngine(cpLoss)`, `practicalLoss`,
`lineScoreCp`, `candidateSpread`, `isRealTactic(lines, certificate, gapCp?)`,
`analysisBudget`, `analyzeArguments`, `analysisContract`, plus the frozen
`QUALITY_LEVELS` / `ANALYSIS_BUDGETS` / `ENGINE_ID` tables. Pure — no React, no
worker, no IndexedDB. 54 unit tests.

Decisions worth knowing:

- **`QUALITY_LEVELS` is migrated verbatim** from `analyzer.js` (and
  `intelligence.js`, which held a byte-identical second copy), so no verdict
  shifts under a learner on upgrade. `verdict.test.js` asserts `analyzer.js` and
  the module agree at every boundary.
- **`intelligence.js` was migrated too**, not just `analyzer.js` as the step
  text says. It held the duplicate table, and the step's own done-when names
  hints — the live-mode cards are built there, so leaving it out would have left
  the invariant false. One import line; recorded in `MERGE-NOTES.md`.
- **`isRealTactic` measures the gap against the best move *outside* the
  certificate's solution set**, not against rank 2. That is what makes D2's
  "two equal winning moves are still a tactic" actually pass: a second winning
  execution of the same motif no longer suppresses the gap. Mates are accepted
  without a gap. A near-miss position returns `false`, which is the point.
- **`gradeFromEngine` has arity 1** and a test asserts it, so D3's "latency is
  not a grade input" cannot be quietly undone by adding a parameter.
- **`analysisBudget` throws on an unknown key** rather than returning
  `undefined`, so a typo cannot silently mean "no bound".
- `analysisContract()` records the full D14 contract — engine identity and
  build, both bounds, MultiPV, non-default options, score perspective and mate
  handling — ready for step 9's certificates.

### Step 5 — the budget contract

All 11 unbounded call sites now read
`engine.analyze(fen, ...analyzeArguments("<useCase>"))`: `evalBar` ×3,
`moveReviewBefore`, `moveReviewAfter`, `analyzePosition`, `bestMove`, `hint`,
`liveAnalysis`, `thinkLikeGM`, and `postGame` inside `analyzeFullGame`. The two
drill components that already passed both bounds were moved onto the same table,
so no budget is written twice; `structure-drill.jsx`'s local
`THREAD_LOST_CP = 150` — a hand-copied Mistake threshold — became
`isError(entry.quality)`.

Enforcement is a `no-restricted-syntax` rule in `eslint.config.js` rejecting any
`analyze()` call with fewer than five arguments (verified to fire, and to stay
quiet on a bounded call), plus a test that every use case named anywhere in
`src/` or `scripts/` is a real budget — the lint rule cannot catch a typo in the
string, and some of these paths are taken rarely.

**One change to `stockfish.js` beyond passing arguments.** The wrapper used to
treat `movetimeMs` as a *replacement* for depth (`movetimeMs > 0 ? go movetime :
go depth`), which would have thrown away every depth in the budget table. It now
sends both limits when both are set, so `depth` is the target and `movetimeMs`
the ceiling. Verified against the shipped `stockfish-18-lite-single` build:
`go depth 18 movetime 600` returns in 624 ms at depth 17 (the ceiling wins) and
`go depth 4 movetime 30000` returns in 29 ms (the target wins). Still additive —
a call passing neither, or only one, behaves exactly as before.

### Step 6 — the Commit Gate

Four files in `src/pf/`: `commit-gate.js` (pure), `commit-gate-strip.jsx` (the
one-line strip), `use-commit-gate.js` (state, persistence, the seam) and
`commit-gate-settings.jsx` (step 7). Default **off** behind
`localStorage["pf-commit-gate"]`. 22 unit tests.

The two rules D12 insists on, and how each is met:

- **Predicting can never move a piece.** The strip owns no board. The learner
  types a move (SAN as written, or raw UCI — a learner mid-game types whichever
  is faster) and it is parsed against a *frozen FEN snapshot*, so nothing the
  gate does can commit the game move or let the engine reply first. This is a
  deliberate departure from the PRD's "drag a move on the board": the live board
  is wired to the real game, and a ghost piece on it would be one state bug away
  from playing the move for real. Typing is also the purer generation task.
- **Skip is one click**, and a skip is recorded as a real row with
  `skipped: true`. A store that only kept answers could not measure the skip
  rate, which is the number the pilot exists to find out.

Other decisions worth knowing:

- **The gate costs no latency.** The search starts before the strip appears and
  is awaited after the learner commits, so the gate spends the wait that was
  already there. When it is on, Best Move uses the `commitGate` budget
  (MultiPV 3) rather than `bestMove` (MultiPV 1), because "2nd of 3" is half the
  feedback and one line cannot rank an answer against anything.
- **An off-spread answer gets an honest `null`, then a second opinion.** The
  common case for a real mistake is that the engine returned three lines and the
  learner played a fourth move. `describePrediction` reports `cpLoss: null`
  there rather than guessing; the hook then evaluates the position after the
  move at the same budget and re-prices it.
- **The reason chip does not touch the move grade** (D5). Move accuracy and
  explanation accuracy are two traces.
- **`pfStep` comes from `classifyFailureStep()`** — the same classifier the game
  report uses — so live play and post-game analysis can never name different
  steps for the same mistake.
- **The comparison line is markdown on the existing message path**, so
  `chat-panel.jsx`'s best-move card renderer is untouched. That is the
  difference between one merge conflict and none.

`srs-db.js` is v3 with an append-only `events` store, keyed by autoincrement
with a `ts` index.

### Step 7 — the pilot readout

Lives in the settings dialog beside the flag, because making the gate default-on
is not a taste question and the switch and the measurement belong together. It
reports answered/skipped share, **median** seconds to answer (a mean would let
one learner walking away mid-prediction decide the question), questions per
session, and — as a sanity check, not a decision input — how often the learner
matched the engine's move. There is no target and no green tick: a target set
before the data would be the same guess wearing a number.

### Step 8 — the PF7 Readout

`src/pf/readout.js`, 30 tests, eight one-clause lines. Detectors: PF1 from the
last move's new attacks, PF2 from `looseMaterial` (now exported from
`pf-error-log.js`), PF3 from `chess.js` checks and captures plus a bounded
threat search, PF4 from pawn moves that attack or offer themselves to an enemy
pawn, PF4.5 by handing the opponent the move, PF5 by mobility with ties broken
by piece value, PF6 from `candidateSpread`, PF7 by replaying the top move and
re-running the blunder scan. **No LLM on the path**, and "nothing obvious" is a
real answer.

Two bugs the tests caught while writing it, both worth recording:

- `withTurnFlipped` guarded the wrong side. It checked whether the side to move
  *after* the flip was in check; the illegality is on the other side of the flip
  — handing the move to the opponent while the current mover is in check means
  their king could be captured. Fixed to test the position before flipping.
- PF2 named attackers by bare square ("attacked by f6") rather than by piece
  ("attacked by Nf6"). A square is not findable at a glance; a piece is.

It also surfaced a true fact the first test expectation got wrong: in the
Italian, `e4` really is attacked and undefended, which is exactly why `d3` is
the move. The detector was right and the test was wrong.

### Step 9 — `verify:drills`

Two layers, and the split is the point:

- **Structural** — no engine, ~2s, runs in CI on every push with `--strict`.
  Legal FEN, replayable solution, per-type shape, and every answer key that can
  be *proved from the board*.
- **Engine** (`npm run certify:drills`) — the expensive search, once on a
  developer machine, writing `src/pf/drill-certificates.json`, which is
  committed so `--strict` can require a current certificate without searching
  again. Each certificate carries the full D14 contract, and changing any field
  of that contract invalidates all of them by design.

`verify-endgames.js` was refactored rather than duplicated: the UCI harness
moved to `scripts/uci-engine.js` and its two check functions are exported and
imported by the umbrella. Re-run on the refactor: still 94/94. Scan and sweep
keys are re-proved by **the same function the generator used**
(`proveTargets`), so the committed data cannot drift from the rule it claims —
a second implementation in the verifier would only test that two copies agree.

Plain `node` cannot resolve `@/…`, and the alternative to teaching it was adding
a runner as a dependency for one script. `scripts/alias-hooks.js` does it with
`module.register()` and **reads the alias list out of `jsconfig.json`**, because
CLAUDE.md already warns those live in four places that must stay in sync and a
fifth hand-written copy is the bug that warning is about.

**The gate failed on its first run, and every failure was real** — see
`MERGE-NOTES.md` for the list. Eleven hand-curated puzzles have solutions that
are illegal in their own FENs (`m20` runs a rook through a pawn, `m16` moves a
pawn like a knight, `e13` moves an absolutely pinned bishop); one tabiya line
ends on the opponent's move; one corpus FEN is an illegal position. All are now
filtered by a strengthened `isPlayableLine` in `curriculum-positions.js` rather
than edited, because the intended idea behind a broken FEN is a guess and a
guessed puzzle is what the verifier exists to keep out. 863/863 now pass.

One cost decision inside that: replaying all 481 solution lines at import costs
~143ms of app startup. The filter therefore runs over every **hand-written**
source and not the Lichess import, which is 462 of them and is machine-generated
from a database, changes only by re-running a script that must pass the gate,
and is checked in full by CI anyway. Import cost is 86ms.

**The engine layer then found two things wrong with the engine layer**, which is
worth recording because both are the kind of bug a gate is supposed to have:

- **A budget is part of a verdict, and thresholds do not travel between
  budgets.** `E-09` "majority-crippled" passes `verify:endgames` at 3000ms /
  MultiPV 1 and *failed* certification at 1500ms / MultiPV 3, reading +1.79
  against a `WIN_THRESHOLD_CP` of 200 that was calibrated at the first budget.
  MultiPV splits the search effort, so line 1 of three is a weaker evaluation
  than one line searched alone. The contract now carries **one budget per
  position type** — endgames at the budget their threshold was calibrated at —
  and `uci-engine.js` sets MultiPV per search rather than once per process.
  This is D1 and D14 arriving as a concrete bug rather than a principle.
- **"Is this move safe?" is not "within 150cp of best".** The first
  implementation charged centipawn loss, and got two classes of answer wrong.
  Four *mating* moves (`Nf2#`, `Qh5#`, `Qg3#`, `Nxg3#`) were reported as
  "declared safe but loses 299.99": the position after a mate is over, so the
  engine returns no score, and a missing score read as 0 charged the whole mate
  value as loss. And `verify-002Uy` was failed for taking the student from
  +41.5 to +13.8 — a 2770cp "loss" that is still completely winning. Safety is
  now judged on whether the move **changes the result**: a move that keeps a won
  position won is safe however many centipawns it sheds, a move that turns "not
  losing" into "losing" is unsafe however small the number, and mate and draw
  after the move are computed from the board rather than asked of an engine that
  cannot answer.

### Step 10 — `scan` and `sweep`

`src/pf/scan-drills.js` (generator and grader, 32 tests),
`src/pf/scan-drill.jsx` (the board), `scripts/generate-scan-drills.js`, and
`src/data/scan-drills.js` — 220 committed drills across three rules, from a
corpus of 484 distinct FENs already in the repo. **PF2 now has a dedicated
drill**, which was §80.4's whole point.

- Keys are proved by `looseMaterial()` and `chess.js`'s move generator, never
  searched (D13). Semantic prompts that need a human — "the piece doing all the
  defending" — are not generated at all.
- Generated at build time, not import: enumerating knight-fork landing squares
  replays every knight move and re-attacks the board for each.
- **Untimed** (D3). Latency is telemetry; a new pattern is drilled slowly first
  and a timer would train guessing.
- `sweep` gives partial credit and **a wrong click costs as much as a miss** —
  otherwise clicking every square scores full marks.
- A `sweep` with fewer than two answers is refused: it is a `scan` wearing a
  sweep's prompt, and it would teach stopping after the first click.
- A drill with no answer is refused too. Recognising a safe position is a real
  skill, but an empty drill cannot be told apart from a broken generator, and
  anything that cannot be told apart from a bug will be assumed to be one.
- Deterministic: same corpus in the same order, same file out, on any machine.
  The rotation a learner sees comes from `selectPositions()`, keyed to their own
  review count.

The generator inherited an illegal FEN from the corpus on its first run and
produced two drills from it. `load()` now refuses a position where the side that
just moved is left in check — the same trap `verify-endgames.js` documents.

### Step 11 — the adaptive warm-up

`src/pf/warmup.js`, 10 new session tests. 3–10 reps on each of PF7 (blunder
checks) and PF2 (board sweeps) at the head of a session, skippable in one click.

- **Adaptive by share, not by count** (D6). The tally is cumulative over every
  game, so a raw count would only grow and the warm-up would ratchet to the
  ceiling and stay there. Reps come from the step's *share* of the tally, scaled
  by `min(1, total / TALLY_MASS)` so a learner with no history gets the floor and
  the band opens as the tally gains mass — which is D11's "once the tally has
  mass, it sets the weights", made concrete.
- `MIN_REPS`, `MAX_REPS` and `TALLY_MASS` are named, in one file, and documented
  as guesses rather than evidence.
- **Opt-in in `buildSession`**, default off. A dashboard preview or a
  single-item drill must get the queue it asked for, not a different one with
  reps prepended; only a real study session passes `warmup: true`.
- The reps hang from `PF-PROTOCOL` rather than a new item, because **99 stays
  99**. They are ordinary queue entries, so the minute budget costs them and the
  summary counts them — a test asserts a 20-minute session with a warm-up is
  still under 20 minutes.
- **Warm-up entries are never graded.** They are the same item every day, so
  feeding them to FSRS would flatten that item's schedule to nothing. The
  session grades what it scheduled.
- Skipping jumps past *every* remaining warm-up entry, not one at a time: a
  learner who does not want the scales today does not want the second half of
  them either.

### Not done, and deliberately

- Steps 12–18. Step 12 (the Tier-0 ladder) is next; it depends on 10, which is
  in place.
- **The `src/App.jsx` collapse.** Still not done, and now slightly larger: the
  Commit Gate added one hook call and two threaded props. It is merge-cost work,
  not behaviour — PRD §85.3 wants one `usePieceFirst()` hook and one
  `<PieceFirstLayer/>` mount, under 15 changed lines against upstream.
- **Timing on scan drills.** Deliberately absent per D3 and §75.5: the
  infrastructure records latency, nothing schedules on it, and nothing will
  until this app's own data shows it predicts later unprompted accuracy.
- **The personal deck** (step 16) is what closes the Commit Gate's loop all the
  way: §77.4 says a blunder crossing the threshold should be offered to the deck
  with one tap. The events are being logged for it; the deck is not built.
