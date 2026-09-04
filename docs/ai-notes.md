# AI Reliability Architecture Implementation Plan

> Scope note: this is a **frontend-only React 19 + Vite 6 SPA** with no backend, no Python, and no CLI. The review below follows the requested structure but maps each reliability practice onto this stack's actual tools: ESLint/Prettier instead of ruff, Vitest instead of pytest, Zod (recommended addition) instead of Pydantic, `npm audit`/Dependabot instead of pip-audit, `eslint-plugin-security` + manual review instead of bandit. No code was changed as part of this analysis.

Analysis date: 2026-08-18. Repo: `PieceFirstChess` (chess coaching app — Stockfish + custom engine opponents, OpenAI/Gemini AI coaching, IndexedDB persistence, training modes).

---

## Reliability Findings

- **Deploy pipeline has zero quality gates.** `.github/workflows/deploy.yml` runs `npm ci` → `npm run build` → deploy to GitHub Pages on every push to `main`. It never runs `npm run lint` or `npm test`. A broken test suite or a lint-level bug ships to production as long as the bundler doesn't hard-fail.
- **Test coverage is concentrated in the wrong place.** Only 5 of 52 source files have tests (`use-chess-clock`, `opening-tutorials`, `progress`, `puzzle-quizzes`, `stockfish`). The untested set includes the highest-risk files: `App.jsx` (1097 lines, owns all core game state), `ai.js`/`google-ai.js` (external API integration, prompt construction, JSON parsing of model output), `analyzer.js` (move-quality classification shown to users), `engine.js` (custom opponent logic), `use-ai-chat.js` (640 lines), `use-engine-coach.js` (521 lines), and `db.js` (IndexedDB persistence). None of the training-mode or dialog components have tests either.
- **`App.jsx` is a god component.** It owns the live `Chess` instance, move history, clock, board orientation, live/coach mode, training overlay state, and wires four large hooks together via prop drilling (per `CLAUDE.md`, this is a known/accepted architecture choice, not an accident — but it is the single largest reliability liability in the repo given the near-total lack of tests around it).
- **Two chess engines have no shared interface.** `stockfish.js` (Stockfish WASM worker) and `engine.js` (custom minimax) are selected via `opponent`/`difficulty` branching logic inside `App.jsx` rather than behind a common `ChessOpponent` interface, so every call site needs to know which engine it's talking to.
- **AI provider code duplicates fetch/error/localStorage logic.** `ai.js` (OpenAI) and `google-ai.js` (Gemini) each independently build request bodies, parse responses, and throw ad hoc `Error`s. localStorage key reads for provider/apiKey/model/elo are duplicated across `App.jsx`, `use-ai-chat.js`, `use-engine-coach.js`, and `settings-dialog.jsx` — five call sites with independently hand-typed default values that can drift out of sync.
- **Reserved path aliases are configuration drift risk.** `@context`, `@pages`, `@api`, `@query`, `@store` are defined in `vite.config.js`, `vitest.config.js`, `jsconfig.json`, and the ESLint import resolver but point at directories that don't exist. Harmless today, but any future edit to one config without the others will silently desync import resolution between build, test, and lint.

## Stability Risks

- **Stockfish per-call hangs are unrecoverable.** `StockfishEngine.init()` has a 90s timeout and resets cleanly on failure — good. But `getMove()` and `analyze()` have **no timeout at all**: if the worker stalls mid-search (WASM crash, browser throttling a backgrounded tab, corrupted position), the returned promise never resolves or rejects, and the coach/analysis UI freezes indefinitely with no way to recover short of a page reload.
- **AI provider calls have no timeout or retry.** `fetch()` calls to `api.openai.com` and the Gemini SDK in `ai.js`/`google-ai.js` have no `AbortController` timeout and no backoff on transient failures (network blip, 429 rate limit, 5xx). A flaky connection surfaces as an immediate hard error to the user instead of a transparent retry.
- **No circuit breaker on repeated AI failures.** A bad/expired API key causes the exact same doomed request to be retried on every user interaction, with no short-circuit or user-facing "your key looks invalid" state derived from repeated failures.
- **Malformed AI output is only checked at the JSON boundary.** `ai.js:288` wraps `JSON.parse(raw)` in try/catch, but nothing validates the *shape* of the parsed object against the prompt's expected schema (`step1`..`step4`, `bestMove`, etc.) before it's rendered — a subtly malformed but valid-JSON response from the model will propagate into the UI and fail later, further from the actual cause.
- **IndexedDB has no failure fallback.** `db.js` assumes IndexedDB is available. Private-browsing restrictions, storage-quota errors, or blocked storage will surface as unhandled rejections; autosave (debounced 500ms in `App.jsx`) has no visible failure state, so a user could believe their game is being saved when it silently isn't.
- **Duplicated localStorage defaults can silently diverge.** E.g. default ELO/model fallback strings are hand-typed in multiple files; a future edit to one and not the others produces inconsistent behavior between the settings dialog and the actual coaching call, with no test to catch it.

## Missing Infrastructure

- No CI test/lint gate (tests and lint are configured but never invoked automatically).
- No PR-triggered CI at all — `deploy.yml` fires only on push to `main`; nothing gates a pull request before merge.
- No runtime schema/response validation library (no Zod/Yup/Ajv) anywhere in the dependency tree — all external data (AI JSON responses, Stockfish UCI text, localStorage-persisted JSON) is accessed via optional chaining and manual parsing rather than validated against a schema.
- No unified error taxonomy — errors are raw `new Error("...")` throws or silently swallowed empty `catch {}` blocks (e.g. `handleAISetPosition` in `App.jsx:213-224` deliberately ignores invalid AI-supplied FEN, which is reasonable, but the same undifferentiated pattern is used for both "safe to ignore" and "should surface to user" failures elsewhere).
- No structured/leveled logging — `console.error`/`console.warn` calls exist in 5 files with no consistent format, no correlation ID, and nothing captured for later inspection.
- No client-side error tracking (e.g. Sentry) — for a purely client-side app, this is the *only* way the maintainer would ever learn about production failures a user doesn't report.
- No dependency vulnerability scanning (`npm audit` not run in CI; no Dependabot config).
- No Content-Security-Policy — `index.html` has no CSP meta tag, notable given the app calls two third-party AI APIs directly from the browser using a user-supplied key.
- No E2E test suite (no Playwright/Cypress) covering the golden paths: play a full game, save/load from IndexedDB, run a puzzle, run an opening drill.
- `web-vitals` is an installed dependency that is never imported/used anywhere in `src/` — dead weight, not wired to any reporting.

## Implementation Roadmap

### P0 – Critical Reliability Work

**Task: Add CI Test & Lint Gate Before Deploy**
Problem: `deploy.yml` builds and deploys straight to production with no test or lint run — a regression that fails tests still ships.
Recommendation: Add a `pull_request` trigger running lint + test + build, and make the existing `deploy` job on `main` depend on that same check job succeeding.
Implementation: New job `verify` in `.github/workflows/deploy.yml` (or a separate `ci.yml`) running `npm run lint`, `npx vitest run`, `npm run build`; add `needs: verify` to the existing `build` job; add a second workflow triggered on `pull_request` running the same `verify` job so branches can't merge red.
Affected Files: `.github/workflows/deploy.yml`, new `.github/workflows/ci.yml`

**Task: Add Per-Call Timeout to Stockfish Operations**
Problem: `getMove()`/`analyze()` in `src/lib/stockfish.js` have no timeout — a stalled worker hangs the coach/analysis UI forever with no recovery path.
Recommendation: Wrap each pending UCI operation with a timeout (e.g. `movetime`/`depth`-scaled: 2× expected search time, min 10s) that rejects and resets `_pending`/worker state, mirroring the existing `init()` timeout pattern.
Implementation: In `StockfishEngine.getMove`/`analyze`, race the returned promise against a `setTimeout` that calls `this._abort()` (or a harder `destroy()`+reinit if `_abort` itself doesn't respond) and rejects with a typed `EngineTimeoutError`.
Affected Files: `src/lib/stockfish.js`, `src/lib/stockfish.test.js`

**Task: Add Timeout + Retry to AI Provider Calls**
Problem: `fetch()` calls in `src/lib/ai.js` and the Gemini calls in `src/lib/google-ai.js` have no timeout and no retry — transient network/5xx/429 failures surface as immediate hard errors.
Recommendation: Wrap all outbound AI calls with an `AbortController`-based timeout (e.g. 30s) and a small bounded retry with exponential backoff (2 attempts, only on network error/5xx/429 — never retry 4xx auth errors).
Implementation: Add a shared `src/lib/http.js` helper (`fetchWithTimeoutAndRetry(url, options, { timeoutMs, retries })`) used by both `ai.js` and `google-ai.js`; classify errors via the taxonomy below to decide retry eligibility.
Affected Files: new `src/lib/http.js`, `src/lib/ai.js`, `src/lib/google-ai.js`

**Task: Introduce a Unified Error Taxonomy**
Problem: Errors are raw `Error` throws or silently swallowed with no consistent classification, making it impossible to decide "retry vs. surface vs. ignore" consistently.
Recommendation: Define a small set of typed error classes and require call sites to throw/catch them instead of bare `Error`.
Implementation: New `src/lib/errors.js` exporting `AppError` (base), `ProviderError` (AI API failures — carries `retryable: boolean` and `status`), `EngineError` (Stockfish/custom engine failures), `ConfigError` (invalid/missing API key, malformed localStorage settings), `ParseError` (schema/JSON validation failures on AI or engine output). Update `ai.js`, `google-ai.js`, `stockfish.js`, `engine.js`, `db.js` to throw these instead of generic `Error`.
Affected Files: new `src/lib/errors.js`, `src/lib/ai.js`, `src/lib/google-ai.js`, `src/lib/stockfish.js`, `src/lib/engine.js`, `src/lib/db.js`

### P1 – Stability Improvements

**Task: Validate AI Response Shape with Schemas**
Problem: `JSON.parse(raw)` in `ai.js` only guards against invalid JSON syntax, not against a validly-parsed object missing expected fields (`step1`..`step4`, `bestMove`, `bestMoveReason`) — malformed-but-valid responses fail later, away from the actual cause.
Recommendation: Add `zod` (small, tree-shakeable, no runtime deps) and define schemas for every AI response contract and for the `set_board_position`/`make_move`/`flip_board` tool-call arguments in `google-ai.js`.
Implementation: New `src/lib/schemas.js` with `zod` schemas (`CoachingReportSchema`, `BoardActionSchema`, etc.); parse-and-validate immediately after `JSON.parse`/`functionCalls` extraction, throwing `ParseError` on mismatch instead of letting bad data reach React state.
Affected Files: new `src/lib/schemas.js`, `src/lib/ai.js`, `src/lib/google-ai.js`, `package.json` (add `zod`)

**Task: Centralize Settings/localStorage Access**
Problem: Provider/API-key/model/ELO localStorage reads (and their default fallback values) are duplicated across `App.jsx`, `use-ai-chat.js`, `use-engine-coach.js`, and `settings-dialog.jsx` — five independently-maintained sources of truth that can silently diverge.
Recommendation: Introduce a single `src/lib/settings.js` module owning every localStorage key, default value, and read/write function; all four call sites import from it instead of calling `localStorage` directly.
Implementation: `getSettings()`/`setSetting(key, value)` with one canonical defaults object; add a Vitest suite asserting defaults match across all consumers by construction (impossible to diverge once centralized).
Affected Files: new `src/lib/settings.js`, `src/App.jsx`, `src/hooks/use-ai-chat.js`, `src/hooks/use-engine-coach.js`, `src/components/settings-dialog.jsx`, new `src/lib/settings.test.js`

**Task: Add Test Coverage for Untested Critical Paths**
Problem: `ai.js`, `google-ai.js`, `analyzer.js`, `engine.js`, `use-ai-chat.js`, `use-engine-coach.js`, and `db.js` have zero test coverage despite being the app's highest-risk logic (external API integration, move-quality scoring shown to users, persistence).
Recommendation: Add Vitest suites per module using `msw` (already a dependency) to mock OpenAI/Gemini HTTP calls, and `fake-indexeddb` (or happy-dom's IDB shim) for `db.js`.
Implementation: `src/lib/ai.test.js`, `src/lib/google-ai.test.js` (mock success/timeout/malformed-JSON/429 cases against the new retry/schema logic), `src/lib/analyzer.test.js` (golden-output tests: known FEN + eval → expected classification), `src/lib/engine.test.js` (known position → expected best move within tolerance), `src/lib/db.test.js` (save/load/autosave/quota-exceeded).
Affected Files: `src/lib/ai.test.js`, `src/lib/google-ai.test.js`, `src/lib/analyzer.test.js`, `src/lib/engine.test.js`, `src/lib/db.test.js`

**Task: Enforce a Minimum Coverage Threshold in CI**
Problem: `test:coverage` computes a percentage but nothing enforces a floor — coverage can silently regress.
Recommendation: Add `coverage.thresholds` to `vitest.config.js` and run `npm run test:coverage` (not just `vitest run`) in the new CI gate.
Implementation: Set initial thresholds slightly below current measured coverage (so CI doesn't immediately fail) with a plan to ratchet up as P1 test tasks land.
Affected Files: `vitest.config.js`, `.github/workflows/ci.yml`

**Task: Add Dependency Vulnerability Scanning**
Problem: No automated check for known-vulnerable dependencies in `package-lock.json`.
Recommendation: Add `npm audit --audit-level=high` as a CI step and enable Dependabot for version updates.
Implementation: CI step in `ci.yml`; add `.github/dependabot.yml` with `package-ecosystem: npm`, weekly schedule.
Affected Files: `.github/workflows/ci.yml`, new `.github/dependabot.yml`

### P2 – Long-term Hardening

**Task: Extract Chess Engine Interface**
Problem: `StockfishEngine` and the custom `engine.js` minimax have no shared interface; `App.jsx` branches on `opponent` to call the right one.
Recommendation: Define a common `ChessOpponent` interface (`getMove(fen, options)`, `destroy()`) that both engines implement; `App.jsx` calls the interface, not the concrete class.
Implementation: `src/lib/opponent.js` exporting `createOpponent(kind, difficulty)` returning a uniform object; both engines adapt to it internally.
Affected Files: `src/lib/stockfish.js`, `src/lib/engine.js`, new `src/lib/opponent.js`, `src/App.jsx`

**Task: Add a React Error Boundary**
Problem: There is no `ErrorBoundary` anywhere in the tree — an uncaught render-time exception (e.g. from a bad training-mode overlay state) blanks the entire app with no recovery UI.
Recommendation: Wrap the app root in a top-level error boundary that logs via the new error taxonomy and offers a "reset / reload" action, plus a narrower boundary around each training-mode overlay so a crash there doesn't take down the whole board.
Implementation: New `src/components/error-boundary.jsx`; wrap `<App />` in `main.jsx` and wrap each of `PuzzleMode`/`OpeningDrillMode`/`EndgameMode`/`BlunderReviewMode` individually.
Affected Files: new `src/components/error-boundary.jsx`, `src/main.jsx`, `src/App.jsx`

**Task: Add Lightweight Client-Side Error Reporting**
Problem: This is a purely client-side app with no backend — production errors are invisible to the maintainer unless a user reports them.
Recommendation: Add a minimal error-capture hook (Sentry's browser SDK free tier, or a homegrown `window.onerror`/`onunhandledrejection` handler that POSTs to a lightweight endpoint or just persists to IndexedDB for later export) wired through the new `AppError` taxonomy so every thrown `ProviderError`/`EngineError` is captured with context (provider, model, difficulty) but never the API key itself.
Implementation: `src/lib/telemetry.js`; hook into the new `ErrorBoundary` and into `errors.js`'s base `AppError` constructor.
Affected Files: new `src/lib/telemetry.js`, `src/components/error-boundary.jsx`, `src/lib/errors.js`

**Task: Add a Content-Security-Policy**
Problem: `index.html` has no CSP; the app fetches directly from `api.openai.com` and Google's Gemini endpoints using a user-supplied key held in localStorage, making this an XSS-to-key-theft path with no defense-in-depth.
Recommendation: Add a CSP meta tag (or Vite plugin) restricting `connect-src` to the known AI API hosts and `script-src` to self.
Implementation: `<meta http-equiv="Content-Security-Policy" ...>` in `index.html`, scoped to allow `https://api.openai.com` and `https://generativelanguage.googleapis.com`.
Affected Files: `index.html`

**Task: Remove or Wire Up `web-vitals`**
Problem: `web-vitals` is a dependency with zero references in `src/` — either dead weight or a missed observability opportunity.
Recommendation: Either remove it from `package.json`, or wire it into the new `telemetry.js` to report Core Web Vitals for real-world performance visibility.
Implementation: Decision task — no code change until resolved.
Affected Files: `package.json`, `src/lib/telemetry.js` (if kept)

**Task: Add E2E Coverage for Golden Paths**
Problem: No end-to-end test exercises the full user flow (load app → play moves → get AI coaching → save/reload a game → run a puzzle).
Recommendation: Add Playwright with 3–5 smoke-level E2E tests covering the golden paths listed above, run in CI as a separate (non-blocking initially, then blocking) job.
Implementation: `e2e/` directory, `playwright.config.js`, CI job `e2e` in `.github/workflows/ci.yml` (mock AI calls via route interception, not real API keys).
Affected Files: new `e2e/*.spec.js`, new `playwright.config.js`, `.github/workflows/ci.yml`, `package.json`

---

## Production Readiness Checklist

Use this before any release (i.e., any merge to `main`, since every merge auto-deploys):

- [ ] `npm run lint` passes with zero errors
- [ ] `npx vitest run` passes, coverage meets the configured threshold
- [ ] `npm run build` completes without warnings about missing/unresolved modules
- [ ] `npm audit --audit-level=high` reports no unaddressed high/critical vulnerabilities
- [ ] Any new localStorage key or AI response contract has a corresponding schema in `src/lib/schemas.js`
- [ ] Any new external call (AI provider, IndexedDB) has a timeout and is wrapped in the `AppError` taxonomy
- [ ] No API key or user PGN/game data is logged to `console.*` or sent to telemetry
- [ ] Manually smoke-tested in a real browser: play a move against each opponent type, ask the AI coach a question, save and reload a game, complete one puzzle
- [ ] Rollback strategy: GitHub Pages deploys are simple `dist/` artifact swaps — rollback is `git revert` the offending commit on `main` and let `deploy.yml` redeploy; no database/migration state to unwind, so this is low-risk but should still be stated explicitly in the PR before merging risky changes

---

## Simplicity Review

- **`App.jsx` (1097 lines) is the single biggest complexity/reliability risk in the repo.** It is architecturally intentional per `CLAUDE.md` (no context provider, hooks wired via props), but the near-zero test coverage over it means every change is a blind edit. Priority should be *testing* it thoroughly (P1 task above) before considering any structural split — a split without tests would just move the risk, not reduce it.
- **Duplicated localStorage default values** (five call sites reading the same keys with independently-typed fallbacks) is exactly the kind of "hidden complexity" that causes silent drift; centralizing into `src/lib/settings.js` (P1) directly removes it.
- **Two engines with no shared interface** spreads opponent-selection branching across `App.jsx` instead of behind one seam — the P2 `ChessOpponent` interface task addresses this, but it's lower priority than testing/CI because it's a refactor, not a correctness or availability risk today.
- **Empty `catch {}` blocks** (e.g. `handleAISetPosition`) are currently the *correct* simple choice for "AI gave us garbage FEN, ignore it" — the fix here is not to add complexity but to make that intent explicit by catching a typed `ParseError` instead of a bare exception, so a future reader can tell "ignored on purpose" from "forgotten."
- **No deep fallback chains or hidden provider logic were found** — `ai.js`/`google-ai.js` are refreshingly linear (no undocumented multi-provider failover, no hidden retries today). The recommendation is to *add* the missing resilience (timeout/retry/circuit-breaker) in one shared, well-tested place (`http.js`) rather than duplicating ad hoc logic per provider file, which would recreate the complexity problem this review is meant to prevent.

---
---

# PieceFirst 7 (PF7): System Assessment & Integration Plan

> **Follow-up:** the curriculum built on top of this assessment lives in [`docs/PF7/LEARNING-SYSTEM.md`](PF7/LEARNING-SYSTEM.md) — a bounded 99-item chess learning system using PF7 as its retrieval index. Read that document for the *learning* plan; this section remains the *evaluation* of PF7 as a system.

> Added 2026-08-29. Scope: evaluation of `docs/PF7/` (Handbook v1.0, OTB card, `piecefirst_coach.py`, `piecefirst_repertoire.json`) and a concrete plan for integrating, teaching, and **empirically testing** PF7 inside this repo. Separate concern from the AI-reliability review above; grouped here at the maintainer's request.

## 1. Verdict on the system

**Is it sound? Yes — almost entirely. Is it new? No.** PF7 is a well-organized, unusually disciplined compression of mainstream chess pedagogy into one page. Nearly every step has a direct ancestor in the literature:

| PF step | Prior art |
|---|---|
| PF1 RESET ("what did their move change?") | Purdy's "examine moves that smite"; Heisman's *Real Chess* — the canonical fix for continuation blindness |
| PF2 SAFETY + loose-piece rule | Nunn's **LPDO** ("Loose Pieces Drop Off"); Heisman's "Seeds of Tactical Destruction" |
| PF3 FORCE (checks -> captures -> threats) | Heisman's **CCT**, essentially verbatim |
| PF4 BREAK | Standard pawn-structure planning (Kmoch; Soltis, *Pawn Structure Chess*) |
| PF5 PIECEFIRST ("improve your worst piece") | **Makogonov's rule**; Aagaard's *Positional Play* three questions |
| PF6 CALCULATE (2-4 candidates) | Kotov's candidate-move tree, moderated by Tisdall/Aagaard's critique of rigid trees |
| PF7 VERIFY (blunder scan) | Heisman's final safety check |
| Position Map | Silman's imbalances, item-for-item |
| Error taxonomy (T/P/E/R) | The most genuinely useful part — coaches do error logs, but rarely this concretely codified |

That is not a criticism. **A one-page card you actually use beats three books you don't.** The compression *is* the contribution, and the handbook is refreshingly honest about its own limits (Part XVIII explicitly disclaims solving chess).

### Where I disagree or would amend

1. **The name oversells the wrong step.** "PieceFirst" implies piece improvement is the headline, but PF5 is step five of seven and only fires when nothing else is happening. The system's actual center of gravity is **PF2 + PF7 (threat detection and blunder checking)** — which is correct, because that is where club-level games are decided. The branding points at the least load-bearing component.

2. **Missing step: prophylaxis (the opponent's *plan*, not their *threat*).** PF1/PF2 catch one-move threats. Nothing in the protocol asks *"what does my opponent want to do over the next 3-5 moves, and can I prevent it?"* — Aagaard treats this as the single highest-value positional question. The handbook knows it is missing: `P10: opponent plan ignored` appears in the error taxonomy (Part XIV) with **no protocol step that would ever catch it**. **Recommendation: add a PF4.5 PREVENT step**, or fold "what is their plan?" into PF5 so worst-piece improvement has to compete against prophylactic moves.

3. **PF4 before PF5 is the wrong default ordering.** Putting BREAK ahead of PIECEFIRST implies pawn breaks outrank piece improvement in quiet positions. The usual correct instinct is the reverse: *improve pieces until the break is ready*. The handbook itself says this in Part VII ("If the attack is not ready, improve the worst attacking piece"), so this is an internal inconsistency in the ordering rather than a wrong belief. Since pawn moves are irreversible and piece moves are not, the cheaper-to-be-wrong step should come first.

4. **The repertoire is coherent but systematically one-sided.** Italian + Alapin + French/Caro Advance for White, Caro-Kann + QGD for Black is genuinely low-memory and sound. But it is an **all-slow repertoire** — a player raised exclusively on it will have a systematic hole in open, sharp, gambit-heavy positions, which is precisely where sub-1800 games are actually decided. Also, "manageable memory" is oversold for the **Advance Caro-Kann**: the Short System and the 3...Bf5 4.Nf3 e6 5.Be2 c5 lines are more concrete theory today than several Open Sicilian sidelines. The Alapin and Italian choices are excellent on this criterion; the two Advance lines are not.

5. **No "I cannot decide" escape hatch.** Part XI gives time-management percentages but never says what to do when a position resists analysis. The biggest clock-killer for club players is burning 15 minutes on a position they were never going to solve. **Add: if two candidates still look equal after N minutes, play the one that leaves more of your pieces defended, and move on.**

6. **`worst_piece_heuristic` in `piecefirst_coach.py` is the weakest code in the bundle.** It ranks pieces by raw legal-move count. A knight on a protected central outpost has *low* mobility and is often your *best* piece; a queen on an exposed square has high mobility and is a liability. Mobility alone is a poor proxy — see section 3A for a better formulation.

7. **`piecefirst_coach.py` does 2x the engine work it needs.** `analyse_position()` runs a MultiPV search and *then* a second `root_moves=[played]` search. The played move's score is usually already present in the MultiPV list; falling back to the second search only when it is absent would roughly halve analysis time. (Not a correctness bug — the score-POV handling is right.)

## 2. The central question: "can PF7 win games? Does it hold an advantage over standard moves?"

This needs a direct answer, because the framing of the question contains a trap.

**PF7 is not a competing move-generation policy. It is a search-control policy for a human.** It does not produce moves a strong player would not play — it is a procedure for *not missing* the move that ordinary chess understanding would already suggest. Therefore:

- **"PF7 vs. standard chess" is not a well-formed matchup.** PF7's output *is* standard chess. There is no such thing as "a PF7 move."
- **The real comparison is PF7 vs. no process** — the same player, with and without the checklist. Against that baseline, PF7 is clearly positive.
- **Against Stockfish, PF7 loses ~100% of games.** So does every human system ever devised. That result tells you nothing.

**The honest, testable claim is:**

> A player following PF7 has a **lower blunder rate and lower average centipawn loss** than the same player not following it, at the cost of **more time per move**.

Concrete predictions this repo can check:
- **Blunder count (cpLost > 300) drops the most** — PF2 and PF7 target exactly this.
- **Average CPL drops moderately.**
- **Accuracy in quiet positions barely changes** — PF5's "improve your worst piece" is weak sauce next to real positional pattern knowledge.
- **Time per move rises substantially.** In blitz/bullet PF7 will make you *worse* by flagging. It is a classical-time-control system, and the handbook says so.

### The trap: you cannot answer this by simulating PF7 against Stockfish

If you implement PF7 as a bot, you have implemented an **engine**, and that bot's strength is determined by the quality of its evaluation function — **not by the checklist**. Two failure modes:

- A "PF7 bot" that calls Stockfish to evaluate its candidates *is Stockfish wearing a costume*. It plays at whatever strength you gave Stockfish. Result: meaningless.
- A "PF7 bot" built on hand-written heuristics is just a weak engine. It loses to Stockfish, which tells you nothing about whether the human protocol is useful.

**A "PF7 vs. Stockfish" simulation would produce a number that means nothing. Do not build that first.**

### What *is* meaningfully testable: the ablation study

Isolate the checklist's contribution by holding the evaluation function fixed and toggling PF gates on and off.

1. **Baseline: a deliberately human-like agent.** `src/lib/engine.js` (the existing minimax + piece-square-table engine) at shallow depth, plus Gaussian eval noise `sigma` and a tunable blunder-injection rate — calibrated so its CPL distribution matches a target rating band.
2. **Add PF gates one at a time, as pure filters on the candidate set:**
   - `+PF2`: reject candidates that leave a piece hanging (1-ply static-exchange check).
   - `+PF3`: force all checks/captures/threats into the candidate set before choosing.
   - `+PF5`: bias toward moves that improve the lowest-scoring piece.
   - `+PF7`: after choosing, run the opponent's checks/captures at 1 ply; if refuted, re-pick.
3. **Measure Elo against a fixed opponent ladder**, plus CPL distribution, blunder rate, and errors bucketed into the T/P/E/R taxonomy.

**Prediction, recorded before running so the experiment can falsify it:** PF2 and PF7 produce **large** gains (roughly 100-300 Elo at club strength); PF3 produces **moderate** gains; PF5 produces **near-zero or slightly negative** results (mobility-style heuristics are a poor proxy for "worst piece"); PF4 produces **near-zero**. If PF5 measurably helps, that is the interesting result, and it means the worst-piece formula in section 3A is better than expected.

This makes the handbook **falsifiable**, which is the genuinely valuable move here.

### The best experiment in this plan: PF7 candidate coverage

Cheaper than the ablation, and it answers the most important question about the system that **nobody has ever measured**:

> Over N positions, what fraction of Stockfish's best moves would PF7's candidate generation have **even considered**?

For each position, classify Stockfish's top move as forcing (PF3), a pawn break (PF4), a worst-piece improvement (PF5), prophylactic, or *none of the above*. The "none of the above" bucket is **PF7's blind spot, measured**.

- Coverage >= 85% -> the protocol is excellent; the one-page card is genuinely sufficient.
- Coverage ~55-70% -> there is a real structural hole, and the "none of the above" moves tell you exactly which step is missing (my bet: prophylaxis, per section 1.2).

This is a few hundred lines of code against machinery this repo already has, and it produces a result worth writing up. **Build this first.**

### Is it worth learning?

**Yes — but understand what you are buying.** PF7 is *scaffolding, not the building*. It reliably suppresses errors; it teaches **zero pattern knowledge**, and pattern knowledge is what actually makes players strong. Compared to no process: clearly worth it. Compared to reading Heisman, Aagaard, and Silman directly: PF7 is a *compression* of them — you lose depth, you gain something you will actually use on every move. Use PF7 as the process layer and get patterns from tactics training, which this repo already has in `PuzzleMode`.

## 3. Integration architecture

Reassuring finding: **the repo already implements roughly half of PF7 without knowing it.** `src/lib/intelligence.js` has `findHangingPieces`, `detectFork`, and `detectPinsAndSkewers` (= PF2) plus `buildThreatCard` (= PF1/PF2); `src/lib/stockfish.js#analyze` returns MultiPV candidates (= PF6); `src/lib/analyzer.js` classifies moves by centipawn loss (= Part XIII). The work is **assembling and labeling**, not building from scratch.

### A. `src/lib/pf7.js` — the protocol engine (pure functions, no React, no I/O)

Single entry point `runPf7(fen, { prevFen, analysis })` returning one structured object per step. Reuses the existing detectors, and stays environment-agnostic so the browser and the Node harness import the same code.

| Step | Implementation | Status |
|---|---|---|
| PF1 RESET | New `diffPositions(prevFen, fen)` — square vacated/occupied, lines opened/closed, newly attacked squares, king-safety delta | **new** |
| PF2 SAFETY | `inCheck` + `findHangingPieces` + `detectFork` + `detectPinsAndSkewers`, run for **both** colors | reuse `intelligence.js` |
| PF3 FORCE | Enumerate legal moves, tag check/capture/threat via chess.js | **new**, trivial |
| PF4 BREAK | Pawn moves that contact an enemy pawn (capture-or-be-captured), classified central vs. flank | **new** |
| PF5 PIECEFIRST | Worst-piece score, see below | **new** |
| PF6 CALCULATE | Take the Stockfish MultiPV lines and **label each with its PF category** | reuse `stockfish.js#analyze` |
| PF7 VERIFY | Push the candidate, enumerate the opponent's checks/captures/threats, SEE the moved piece, list newly-undefended own pieces | **new** |

**A better worst-piece formula than the Python coach's raw mobility** — score each piece on:
- mobility **relative to that piece type's typical maximum**, not absolute count;
- is it defended? is it attacked by a *lesser* piece?
- is it blocked by its own pawns (bad bishop, knight with no outposts)?
- distance from the "action zone" (centroid of contested/attacked squares);
- **bonus, not penalty, for a defended piece on an outpost** — this is the specific case that raw mobility gets backwards.

### B. Coach mode: `coachMode: "engine" | "ai" | "pf7"`

A new panel rendering the seven steps as a **progressive-reveal checklist**. Critically, per Handbook Part XIII Pass 1: **hide the engine's evaluation until the user commits their own candidate.** If PF7 mode shows Stockfish's answer up front it is just another hint button and teaches nothing. The reveal order preserves the learning signal — that is the entire point of the system.

### C. Side-by-side with Stockfish: sequenced, not simultaneous

This answers the open question of whether to show PF7 alongside Stockfish. **Recommendation: yes, but sequenced.** Three columns:

1. **PF7 says** — worst piece, available breaks, forcing moves (shown *before* you move)
2. **You say** — your candidate plus which PF step drove it (shown *before* you move)
3. **Stockfish says** — top 3 and an agreement verdict (revealed *only after* you commit)

Simultaneous display trains you to read the engine, not the position. Sequenced display carries the same information with the learning signal intact — and it generates the agreement data for the section 2 coverage experiment for free, out of real play.

### D. `scripts/pf7-sim.mjs` — the simulation harness (verified viable, zero new dependencies)

The browser Stockfish is a WASM worker and cannot be driven from Node directly — but the already-installed `stockfish@18.0.5` package ships Node-runnable builds. **Verified working in this repo:**

```bash
node node_modules/stockfish/bin/stockfish-18-lite-single.js   # speaks UCI on stdin/stdout
```

Spawned as a child process it answers `uci` / `position` / `go depth N` at roughly **600k nps** — fast enough for thousands of games. Adapter shape: a `UciEngine` class matching `StockfishEngine`'s interface (`getMove` / `analyze`) so `pf7.js` behaves identically in both environments. Playwright is already a devDependency and is the fallback if exact browser-build parity ever matters.

Agents to pit against each other:
- `stockfish-elo-N` — `UCI_LimitStrength` + `UCI_Elo`, the calibrated ladder
- `custom-N` — the existing `engine.js` at depth N
- `human-sim-sigma` — `engine.js` plus eval noise and blunder injection (the ablation baseline)
- `pf7(base)` — the gate wrapper around any base agent

**Determinism gotcha:** deterministic engines replay the *identical* game forever, so a 1000-game match yields one game's worth of information. **A balanced opening book is mandatory** — a fixed set of roughly 50 starting FENs, each played twice with colors reversed. This also removes opening choice as a confound.

**Statistical power:** detecting a 50-Elo difference at 95% confidence needs roughly **400-1000 games**, depending on draw rate. Report confidence intervals, not bare Elo point estimates — at 100 games a 50-Elo "gain" is indistinguishable from noise. Persist results as JSON under `docs/PF7/experiments/` so runs stay comparable over time.

### E. Close the training loop (highest value for actual improvement)

Handbook Parts XIV-XV describe an error-log-driven training loop that this repo is *one step* away from running end to end:

1. Extend `src/lib/analyzer.js` with `diagnosePfFailure(board, played, best, cpLost)` — port the logic from `piecefirst_coach.py#pf_failure_hint`, but resolve it against the **actual** T/P/E/R taxonomy in a shared `src/lib/pf7-taxonomy.js`.
2. Tag every blunder in the existing game report with its PF failure step.
3. Extend the existing `blunder-review-mode.jsx` to aggregate failures **by PF step across all saved games** — this is the "personal error database" of Part XVIII, and IndexedDB already holds the games.
4. Add a `Pf7DrillMode` overlay, following the existing `onBoardUpdate` / `onRegisterMoveHandler` training-board protocol, that **generates drills targeting the user's most frequent failure step.**

Step 3 is the piece nothing else provides and is where the real improvement comes from. It makes training frequency-driven rather than random, exactly as Part XIV prescribes.

### F. Repertoire

Convert `piecefirst_repertoire.json` into `src/lib/piecefirst-repertoire.js` and register it as a named preset in `opening-drill-mode.jsx`. Two upgrades over a straight port:
- **Use the Part XVI tabiya-card schema** (structure / best piece / bad piece / main break / opponent's plan / favorable endgame / bad trade) as the drill unit rather than SAN sequences. Drilling *plans* instead of move strings is the handbook's own advice and fits the existing `opening-tutorials.js` format better.
- **Add a repertoire-deviation detector** — during play, flag when you leave your own repertoire and *which* branch you left. Cheap to build on top of the existing `detectOpening()`.

### G. Retire the Python tool

`piecefirst_coach.py` duplicates `analyzer.js` but requires Python, a separate Stockfish binary, and a manual PGN export. Once E.1 lands, the browser does everything it does — against the user's own saved games, already in IndexedDB. Keep the file as reference for the taxonomy mapping; do not maintain two implementations.

## 4. Recommended build order

| # | Task | Why in this position |
|---|---|---|
| 1 | `src/lib/pf7.js` + tests | Everything else depends on it; pure functions, easy to test, and about half of it is wiring up existing `intelligence.js` detectors |
| 2 | **Coverage experiment** (section 2) as a vitest/Node script | Cheapest experiment with the highest information yield — tells you whether PF7 has a structural hole *before* you build UI around it |
| 3 | `diagnosePfFailure()` in `analyzer.js` + `pf7-taxonomy.js` | Small, and immediately improves the existing game report |
| 4 | PF7 coach panel with sequenced reveal (B, C) | The actual daily-use feature |
| 5 | Error aggregation in `blunder-review-mode.jsx` (E.3) | Highest real improvement value; depends on #3 |
| 6 | `scripts/pf7-sim.mjs` + ablation (D) | Most interesting, most expensive, and — importantly — **not needed to start using PF7** |
| 7 | Repertoire preset + deviation detector (F) | Nice to have |

**Do #2 before #4.** If coverage comes back at 60%, the panel should be built around a *revised* protocol rather than the current one.

## 5. Caveats to keep in the UI

- **FIDE Article 11.3** (cited in the handbook's own sources) prohibits electronic assistance during rated play. The handbook is explicit that its tooling is for **post-game analysis and preparation only**. Any PF7 hint feature in this app should carry that framing: it is a training tool, not a playing aid.
- **Do not present PF7 as beating Stockfish, or as a novel discovery.** It is a disciplined restatement of known pedagogy, and its value is real precisely *because* it is conventional wisdom made checkable. Overclaiming in the UI would undercut the one thing the system actually delivers.
- **Report simulation results with confidence intervals.** The easiest way to fool yourself here is a 100-game match showing a 40-Elo "improvement" that is pure noise.

## 6. Engine authority and the AI provider layer

> Added 9/4/2026, alongside `.dev/PRD.md` §§74–88. Sections 1–5 above assessed
> whether PF7 is worth building and how to wire it in. This section fixes the
> *reliability* contract for the two systems that decide what the learner is
> told: Stockfish, which is authoritative, and the LLM, which is not.

### 6.1 The authority contract

The failure mode this section exists to prevent is a coaching app that
contradicts itself — a drill calling a move correct that the game report calls a
Mistake, or an LLM inventing a refutation the engine never found. For a learning
tool, a confident wrong verdict is worse than no verdict, because the learner has
no way to detect it and encodes it as knowledge.

| Decision | Owner | Never |
|---|---|---|
| Best move; how much worse an alternative is | Stockfish MultiPV | The LLM |
| Whether a tactic is real (best vs 2nd-best gap) | Stockfish | A board detector alone |
| Whether a drill answer is correct | Precomputed engine certificate (§6.3) | Runtime heuristics |
| Which PF step failed | `pf-error-log.js` classifier, or the learner's own tap | The LLM |
| What to study today | `session.js` scheduler | The LLM |
| Wording of one sentence at the learner's level | The LLM, optionally | — |

**Rule: the LLM may not name a move, a score, a line, or a refutation that is
not present in its input payload.** It rephrases a structured verdict; it does
not reason about chess. This is the same constraint PRD §43 (Explanation
Verification) states, made concrete as a runtime check in §6.5.

> GPT Comment: I agree with this authority split, but rename Stockfish from
> "authoritative" to "the app's adjudicator under a recorded analysis budget."
> Its output is still an estimate and may change with engine version, options,
> depth/time, MultiPV, score perspective, and mate handling. Chess rules and
> tablebases are stronger authorities where applicable. This wording preserves
> consistency without teaching the learner that a shallow engine score is an
> objective property of the position.

### 6.2 One verdict module, because three exist today

`analyzer.js` (game reports), `chess-helpers.js` (best-move and hint cards) and
each drill component independently decide what a "good move" is. Consolidate
into `src/pf/verdict.js` — pure, no React, no I/O:

```
verdictFor(cpLoss)                 Excellent | Good | Inaccuracy | Mistake | Blunder
isRealTactic(lines)                best vs 2nd-best gap > ~150cp
practicalLoss(cpBefore, cpAfter)   recovery grading: loss vs best available, not vs 0.00
gradeFromEngine(cpLoss, ms)        → FSRS again | hard | good | easy
candidateSpread(lines)             ranked candidates for compare drills
analysisBudget(useCase)            → { depth, multiPV, timeoutMs, movetimeMs }
```

> GPT Comment: `isRealTactic(lines)` cannot be defined by a best-versus-second
> gap alone. A forcing tactic may have two equally winning moves, while a quiet
> positional move may be separated from alternatives by 150 cp. Require a
> tactical feature/refutation certificate plus engine confirmation. Also keep
> response latency out of `gradeFromEngine` initially; it is learner/UI telemetry,
> not an engine verdict, and should remain separate until it predicts retention.

Migrate `analyzer.js`'s existing thresholds in as the source values, so no
verdict shifts under a learner who already has history. Testable without a
worker or a database, which is the point — this is the module whose correctness
the learner is trusting most, and it should be the easiest thing in the repo to
test.

### 6.3 Precomputed engine certificates

**The runtime cannot afford MultiPV at depth.** The shipped build is
`stockfish-18-lite-single.js`, single-threaded WASM; CLAUDE.md already records
that depth 12 in a middlegame can take tens of seconds. A scan drill
(`.dev/PRD.md` §79) needs twenty graded answers per minute. Those two facts do
not reconcile at runtime.

So every drill position ships with its verdict in the data file, produced by a
build script in the mould of `npm run verify:endgames`:

```js
{ …position,
  certificate: { candidates: [{ uci, cp }], answerKey, depth, engineVersion, verifiedAt } }
```

Reliability properties this buys, all of which matter more than they sound:

- **Deterministic.** The same position cannot grade differently on two runs — a
  real hazard with time-bounded searches, and a trust-destroying one.
- **Offline.** No worker, no wait, no failure path mid-rep.
- **Auditable.** `verifiedAt` and `engineVersion` mean a stale certificate is
  findable rather than invisible.
- **Cheap at runtime.** The expensive search happens once, on a dev machine.

Runtime Stockfish is then reserved for the three cases that need a live position:
the Commit Gate, play-out drills, and post-game analysis.

### 6.4 The analysis budget contract

CLAUDE.md records the gotcha; make it a rule. `StockfishEngine` has a single
`_pending` slot, so two overlapping requests orphan the first — neither resolved
nor rejected — and a depth search has no wall-clock bound.

- **Every call on a path a board is waiting on passes both `timeoutMs` and
  `movetimeMs`.** No exceptions.
- Budgets come from `analysisBudget(useCase)` (§6.2), not from call-site
  literals, so they are tunable in one file: Commit Gate ~600ms, play-out reply
  ~400ms, post-game depth 10, PF7 Readout ~800ms/MultiPV 3.
- Add a test (or an ESLint restricted-syntax rule) asserting no bare
  two-argument `analyze()` call exists outside `stockfish.js`. This is the class
  of bug that silently hangs a drill forever, and it has already happened once.

### 6.5 Verifying LLM output before rendering

Given the §6.1 rule, verification is mechanical and worth doing, because a
plausible fabricated line is the single most damaging thing this app can show:

1. **Move extraction.** Regex SAN/UCI tokens out of the response; reject the
   response if any token is not a legal move in the FEN, or not present in the
   engine payload that was sent.
2. **Score extraction.** Reject any numeric evaluation the payload did not
   contain. The model may *describe* +2.1 as "clearly better"; it may not
   produce +1.4 from nowhere.
3. **On rejection, fall back — do not retry.** `handleThinkLikeGM` already has
   the right shape: engine-authored markdown when the AI path fails. Every AI
   surface should have that fallback, and the fallback should be the default
   rendering path, with the LLM as an enhancement layer on top.
4. **Log rejections.** A model that fails verification often is the wrong model
   for this workload, and that is only visible if the rejections are counted.

> GPT Comment: Regex extraction of SAN/UCI and numbers is too brittle to be the
> safety boundary: prose contains move-like tokens, SAN is context-sensitive,
> and ordinary numbers can look like evaluations. Prefer schema-constrained JSON
> whose claims reference IDs from the supplied engine payload, then render the
> final sentence deterministically. Validate referenced moves against the frozen
> FEN and payload; if validation fails, use the engine-authored fallback. This
> turns verification from natural-language parsing into an allowlist check.

### 6.6 Provider registry, and OpenRouter

`ai.js` hard-codes `https://api.openai.com/v1/chat/completions` in three places
(lines ~41, ~137, ~266) and `settings-dialog.jsx` toggles two providers by
`localStorage` key. Replace with a registry so adding a provider is data, not
code:

```js
// src/lib/providers.js
export const PROVIDERS = {
  openai:     { baseUrl: "https://api.openai.com/v1",    keyKey: "chess-coach-api-key",  tools: "openai", models: [...] },
  google:     { baseUrl: GEMINI_BASE,                    keyKey: "chess-google-api-key", tools: "google", models: GEMINI_MODELS },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", keyKey: "chess-openrouter-key", tools: "openai", models: [...],
                headers: { "HTTP-Referer": location.origin, "X-Title": "PieceFirst Chess" } },
};
```

OpenRouter specifics:

- **Wire-compatible** with OpenAI chat completions, so `sendChatMessage`,
  `getGMThoughtProcess` and `summarizeConversation` work unchanged once the base
  URL and headers come from the registry.
- `HTTP-Referer` and `X-Title` are optional but expected; without them requests
  are unattributed.
- Model ids are namespaced (`anthropic/…`, `openai/…`, `google/…`). Keep the
  model list short and curated rather than fetching the full catalogue — a
  hundred-entry dropdown is its own usability bug.

> GPT Comment: The provider direction is sound, but update the attribution header
> to `X-OpenRouter-Title`; `X-Title` is retained only for backward compatibility.
> OpenAI-compatible transport also does not imply identical behavior across
> models for tools, structured output, streaming, or safety settings, so capability
> flags belong at the provider-model level rather than one `tools` value for the
> whole provider. See the current [OpenRouter quickstart](https://openrouter.ai/docs/quickstart)
> and [app-attribution documentation](https://openrouter.ai/docs/app-attribution).

- **Tool calling starts off.** Agentic board control
  (`set_board_position` / `make_move` / `flip_board`) exists only on the Gemini
  path today. Gate it on the registry's `tools` field so an OpenAI-style tools
  implementation can be added later without a second code path per provider.
- **Same key-handling posture as the existing providers:** the key stays in
  `localStorage`, is sent only to that provider's host, and is never logged.
  Adding a provider adds a destination, so the privacy screen (PRD §38) must
  list it.

Why bother, given §6.1 limits the LLM to phrasing: one key reaches many models,
which makes it cheap to find the *smallest* model that phrases a verdict
acceptably. For a workload that is "rewrite this structured object as two
sentences", that search is the entire optimisation — and a smaller model is also
a faster one, which matters because latency between reps is the thing that
actually degrades practice.

### 6.7 Cost and latency posture for a drill loop

- **AI off by default in drills.** Sub-1000 improvement comes from rep volume
  (`.dev/PRD.md` §75.1); a network round trip between reps is a direct tax on
  the mechanism.
- **On-demand only**, one button: "why was my move worse?" — after the engine
  verdict is already on screen.
- **Cap output tokens** (a card is two sentences, not an essay) and cache by
  `(fen, feature, model)` in memory for the session. The same position is
  re-examined constantly during review.
- **Never block a grade on a network call.** The grade is engine-owned (§6.1);
  prose arrives after, or not at all.

> GPT Comment: I agree with this AI posture. Optional, post-verdict explanation
> is a useful accessibility and coaching layer; making it absent from the grading
> and scheduling loop protects latency, offline use, reproducibility, and trust.
> Measure whether learners request and use the explanation before optimizing
> model choice further.
