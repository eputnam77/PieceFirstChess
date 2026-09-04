# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev              # start dev server (localhost:5173)
npm run build             # production build (base path /chess/)
npm run lint               # eslint
npm run lint:fix
npm run format             # prettier on src/**/*.{js,jsx,json,css}
npm test                   # vitest (watch)
npx vitest run path/to/file.test.js   # run a single test file
npx vitest run -t "test name"          # run a single test by name
npm run test:coverage      # vitest run --coverage + combined % summary
```

Tests are co-located with source (`foo.js` + `foo.test.js`), run via vitest with `happy-dom`. ESLint ignores `*.test.{js,jsx}` files entirely (see `eslint.config.js`), so relaxed style there doesn't need to match app code.

## Architecture

Frontend-only React 19 + Vite 6 app, no backend. Everything — chess engine, AI API calls, saved games — runs client-side; AI features call OpenAI/Gemini directly from the browser using a user-supplied API key stored in `localStorage` (`chess-coach-api-key`).

**State lives in `src/App.jsx`**, not in the Zustand store. `App.jsx` owns the live `Chess` game instance (`gameReference`, a `chess.js` object, mutated via `.move()`/`.undo()`), plus move history, board orientation, clock, live-mode/coach-mode toggles, and training-mode overlay state. It wires together large custom hooks (`useEngineCoach`, `useAiChat`, `useChessClock`, `useDarkMode`) and passes their handlers down as props — there is no context provider. `src/store/use-game-store.js` (Zustand) is only used for the saved-games list backed by IndexedDB (`src/lib/db.js`); it is not general app state.

**Two independent chess engines:**
- `src/lib/stockfish.js` — `StockfishEngine` class wrapping the real Stockfish 18 WASM worker (loaded from `public/stockfish-18-lite-single.js`, resolved via `withBaseUrl` since the build is served from `/chess/`). Singleton accessed via `getStockfishEngine()`/`destroyStockfishEngine()`. Used for both opponent play (`opponent: "engine"`) and analysis/coaching (multi-PV `analyze()`).
- `src/lib/engine.js` — a from-scratch minimax + alpha-beta engine with piece-square tables, used when `opponent: "custom"` (non-Stockfish difficulty levels).

Which one moves the opponent, and how deep it thinks, is controlled by `opponent`/`difficulty` state in `App.jsx`, not baked into either engine module.

**Two coaching backends**, selected by `coachMode` ("engine" vs "ai"):
- Engine coaching (`useEngineCoach` + `src/lib/analyzer.js`) — pure Stockfish evaluation, move classification (Excellent/Good/Inaccuracy/Mistake/Blunder), threat detection, post-game reports. Works offline, no API key needed.
- AI coaching (`useAiChat` + `src/lib/ai.js` for OpenAI, `src/lib/google-ai.js` for Gemini) — conversational LLM coach. `google-ai.js` additionally exposes function-calling tools (`set_board_position`, `make_move`, `flip_board`) the model can invoke to demonstrate on the board — routed back through `App.jsx`'s `handleAISetPosition`/`handleAIMakeMove`/`handleAIFlipBoard` callbacks. Both AI modules are instructed to explain rather than act by default; the model only touches the board when the user explicitly asks for a demonstration.

**Training modes** (`PuzzleMode`, `OpeningDrillMode`, `EndgameMode`, `BlunderReviewMode`) are self-contained overlays that take over the board via a shared "training board" protocol: they call `onBoardUpdate`/`onRegisterMoveHandler` props to push FEN/arrows/orientation into `App.jsx`'s `trainingBoard` state and intercept move input, rather than mutating `gameReference` directly. Static training content lives in `src/data/puzzles.js`, `src/data/endgames.js`, `src/lib/openings.js`, `src/lib/opening-tutorials.js`, `src/lib/puzzle-quizzes.js`.

**The PieceFirst curriculum** is a separate, self-contained system from the training modes above — designed in `docs/PF7/LEARNING-SYSTEM.md`, reachable from the **Study** and **Curriculum** buttons in the control bar. 99 bounded items, spaced repetition, and a closed loop back from your own games:

- `src/data/curriculum.js` — the 99 items (id, tier, PF step, prereqs, mastery test). The single source of truth for *what* is learned.
- `src/data/curriculum-positions.js` — merges drill positions per item from six sources; the `type` field on each position selects a drill component. Every item has content, and `session.test.js` fails if one does not.
- `src/lib/srs.js` + `srs-db.js` — FSRS-6 scheduler and its own IndexedDB (`chess-srs-db`, v2: `cards` + `errors`).
- `src/lib/session.js` — the queue builder: reviews, then items on your weakest PF step, then new material, fitted to a minute budget. Shows a rotating window of positions per item rather than all of them.
- `src/lib/pf-error-log.js` — tags each analysed mistake with the PF step that would have caught it. `App.jsx` folds a finished game's report into the tally, and the tally reorders the queue.
- Drill components, one per position `type`: `study-mode.jsx` (`puzzle`, `line`), `endgame-drill.jsx`, `blunder-check-drill.jsx`, `protocol-drill.jsx`, `tabiya-card.jsx`, `structure-drill.jsx`. All take `position`/`onMiss`/`onHelp`/`onResolve` and are dispatched by `DRILL_COMPONENTS` in `study-mode.jsx`.
- `curriculum-dashboard.jsx` — all 99 items with per-item state, and the way to drill any single one.

**Generated and certified content.** Tactical and mating positions are imported from the CC0 Lichess database by `npm run import:puzzles` (theme tags plus board-level detectors in `scripts/puzzle-matchers.js`; `scripts/zstd-frames.js` exists because the archive is multi-frame zstd and Node's decompressor silently stops after the first frame). Tier 4/5 tabiya are SAN lines in `src/data/tabiya.js` replayed by `src/lib/tabiya.js` — no hand-written FENs. Endgame and play-out FENs are certified against Stockfish by `npm run verify:endgames`, which is a gate: no position ships without passing it.

**Persistence**: `src/lib/db.js` wraps IndexedDB (`idb`) for saved games and an autosave slot (debounced 500ms in `App.jsx`, restored on mount). Opening/puzzle progress is tracked separately via `src/lib/progress.js` and `src/lib/opening-stats.js`; curriculum progress lives in `srs-db.js` instead.

## Gotchas worth knowing

- **`useRef` cancellation flags must reset on effect setup, not just cleanup.** StrictMode runs mount → cleanup → mount in development, so a flag only ever set to `true` stays `true` through the second mount. This silently discarded every engine reply in the play-out drills.
- **`StockfishEngine.analyze()` takes an optional `timeoutMs` and `movetimeMs`.** There is one `_pending` slot, so overlapping requests can orphan a promise forever; and a depth search has no wall-clock bound — on the single-threaded lite WASM build, depth 12 in a middlegame can take tens of seconds. Anything driving an interactive board should pass both.
- **`react-chessboard` v5 hands `onPieceDrop` a single object**, not positional `(from, to)` arguments.

**Path aliases** (`@`, `@hooks`, `@lib`, `@context`, `@pages`, `@constants`, `@api`, `@query`, `@store`, `@public`, `@assets`) are defined in three places that must stay in sync: `vite.config.js`, `vitest.config.js`, `jsconfig.json`, and the `import/resolver` section of `eslint.config.js`. Most aliases beyond `@`, `@hooks`, `@lib` point at directories that don't exist yet (`@context`, `@pages`, `@api`, `@query`, `@store` under `src/services/...`) — they're reserved, not currently used.

## Linting notes

`eslint.config.js` relaxes several rules specifically for this project's chess logic (higher complexity/depth/function-length limits, chess notation abbreviations like `fen`/`san`/`uci`/`pgn` allowed through `unicorn/prevent-abbreviations`). Don't fight these by refactoring for the sake of satisfying stricter defaults — they're intentional for this domain.

## Workflow

When a change touches 3+ files, use Plan Mode (`Shift+Tab`) before implementing.

## Docs

- `docs/IMPLEMENTATION-PLAN.md` is the **plan of record** for in-flight work: build order, resolved decisions, and what is deliberately not built yet. `.dev/PRD.md` §§74–88 and `docs/ai-notes.md` §6 are the design argument behind it (with review comments left inline); where they disagree with the plan of record on order, scope, or a number, the plan of record wins. `TIER-0-PROTOCOL-PLAN.md` is the detailed spec for one step of it.
- `.dev/PRD.md` and `Plan.md` are product/planning docs, not implementation guides — architecture above reflects actual code, which has moved on from what's described there (e.g. more components/hooks exist than the structure listed in README.md).
- `.github/workflows/deploy.yml` deploys `main` to GitHub Pages at the `/chess/` base path on every push — and currently runs neither `npm run lint` nor `npm test` first, which is step 2 of the plan of record.
