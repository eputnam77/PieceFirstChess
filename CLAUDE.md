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

**Persistence**: `src/lib/db.js` wraps IndexedDB (`idb`) for saved games and an autosave slot (debounced 500ms in `App.jsx`, restored on mount). Opening/puzzle progress is tracked separately via `src/lib/progress.js` and `src/lib/opening-stats.js`.

**Path aliases** (`@`, `@hooks`, `@lib`, `@context`, `@pages`, `@constants`, `@api`, `@query`, `@store`, `@public`, `@assets`) are defined in three places that must stay in sync: `vite.config.js`, `vitest.config.js`, `jsconfig.json`, and the `import/resolver` section of `eslint.config.js`. Most aliases beyond `@`, `@hooks`, `@lib` point at directories that don't exist yet (`@context`, `@pages`, `@api`, `@query`, `@store` under `src/services/...`) — they're reserved, not currently used.

## Linting notes

`eslint.config.js` relaxes several rules specifically for this project's chess logic (higher complexity/depth/function-length limits, chess notation abbreviations like `fen`/`san`/`uci`/`pgn` allowed through `unicorn/prevent-abbreviations`). Don't fight these by refactoring for the sake of satisfying stricter defaults — they're intentional for this domain.

## Workflow

When a change touches 3+ files, use Plan Mode (`Shift+Tab`) before implementing.

## Docs

- `.dev/PRD.md` and `Plan.md` are product/planning docs, not implementation guides — architecture above reflects actual code, which has moved on from what's described there (e.g. more components/hooks exist than the structure listed in README.md).
- `.github/workflows/deploy.yml` deploys `main` to GitHub Pages at the `/chess/` base path on every push.
