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
