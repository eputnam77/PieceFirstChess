# Implementation plan of record

> Written 2026-09-04, after `.dev/PRD.md` §§74–88 and `docs/ai-notes.md` §6 were
> added (commit `7c345af`) with GPT review comments inline.
>
> **This file is the plan of record.** `.dev/PRD.md` §§74–88 is the *design*
> argument and keeps the review dialogue; `TIER-0-PROTOCOL-PLAN.md` is the
> detailed spec for one step of this sequence. Where any of them disagrees with
> this file on *order, scope, or a number*, this file wins — it is the one that
> has had the GPT comments resolved into decisions.

> **Status, 2026-09-05: steps 1–5 are built.** The foundation slice is done and
> green — `npm run lint` (0 errors), `npm run test:run` (281 passing),
> `npm run build`, and `npm run verify:endgames` (94/94). Step 6 (the Commit
> Gate) is the next thing to build. Per-step notes are in §7.

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
| 6 | **Commit Gate**, flag-off, ghost candidate, frozen FEN, `srs-db` v3 event store (D12) | medium | 4, 5 | One PF-tagged event per committed prediction; skip is one click; no game move can be committed by predicting |
| 7 | Commit Gate pilot readout: skip rate, completion rate, added seconds, events/session | tiny | 6 | Enough data to decide the default honestly |
| 8 | **PF7 Readout** card, beside Think Like a GM for one release | small | 4 | Eight one-clause lines, all engine- or detector-derived, "nothing obvious" allowed; no LLM on the path |
| 9 | `npm run verify:drills` — generalise `verify-endgames.js`; certificate schema per D14; wire into CI | medium | 2, 4 | No generated position ships without a reproducible certificate |
| 10 | **`scan` / `sweep`** drills + generator (D13), untimed first, latency as telemetry (D3) | medium | 9 | 20 reps/minute, offline, deterministic; `sweep` gives partial credit; PF2 has a dedicated drill |
| 11 | Adaptive warm-up (D6): 3–10 reps per step at the head of the queue, skippable | small | 10 | Session budget still honest with new `MINUTES_PER_POSITION` entries |
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
  mechanism; it already works six ways.
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

## 7. What steps 1–5 actually shipped

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

### Not done, and deliberately

- Steps 6–18. Step 6 (Commit Gate) is next and depends only on 4 and 5, both of
  which are in place.
- The `src/App.jsx` collapse described above. It is merge-cost work, not
  behaviour, and PRD §85.3 puts it under the Commit Gate's `<CommitGate/>` mount
  — worth doing as part of step 6 rather than twice.
