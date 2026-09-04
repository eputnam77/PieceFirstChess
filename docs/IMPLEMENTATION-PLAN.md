# Implementation plan of record

> Written 2026-09-04, after `.dev/PRD.md` §§74–88 and `docs/ai-notes.md` §6 were
> added (commit `7c345af`) with GPT review comments inline.
>
> **This file is the plan of record.** `.dev/PRD.md` §§74–88 is the *design*
> argument and keeps the review dialogue; `TIER-0-PROTOCOL-PLAN.md` is the
> detailed spec for one step of this sequence. Where any of them disagrees with
> this file on *order, scope, or a number*, this file wins — it is the one that
> has had the GPT comments resolved into decisions.

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
| 1 | Fix `db.test.js` mock (§2) | tiny | — | `npx vitest run` is green |
| 2 | CI gate: `lint` + `test` in `.github/workflows/deploy.yml` | small | 1 | A failing test blocks a deploy |
| 3 | Merge hygiene: `upstream` remote (**needs URL, §6**), `MERGE-NOTES.md`, `@pf` alias in all four config files, empty `src/pf/` | small | — | `git fetch upstream` works; `@pf/x` resolves in vite, vitest, jsconfig, eslint |
| 4 | `src/pf/verdict.js`: `verdictFor`, `practicalLoss`, `candidateSpread`, `gradeFromEngine(cpLoss)` (D3), `isRealTactic(lines, certificate)` (D2), `analysisBudget(useCase)`. `analyzer.js` imports its thresholds from here | small | 3 | Same move + same position ⇒ same verdict in analyzer, hints, and every drill; unit-tested with no worker and no IndexedDB |
| 5 | Analysis-budget enforcement: the 11 unbounded call sites pass both bounds from `analysisBudget()`; add the test or `no-restricted-syntax` rule | small | 4 | No bare `analyze(fen, depth, multiPV)` outside `stockfish.js` |
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

## 6. Open questions — needed from you, not derivable

1. **The Chess King upstream repository URL.** Step 3 cannot run without it, and
   until it does there is still no way to pull upstream changes at all
   (PRD §85.1). Everything else in the plan proceeds regardless.
2. **Study vs Curriculum (D16).** The architecture says three surfaces; the UI
   shows four buttons. Either give each a one-sentence job — e.g. Study =
   "today's queue", Curriculum = "the map and your progress" — or merge them
   visibly. This is a naming and UX call, and PRD §74.4 freezes the control bar
   either way.
3. **Commit Gate default** after the step-7 pilot: on everywhere, on for
   Analyze only, or opt-in.
