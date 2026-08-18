# Repository Guidelines

## Project Structure & Module Organization

This React 19/Vite app keeps code in `src/`: views in `components/`, hooks in `hooks/`, chess engines and utilities in `lib/`, Zustand state in `store/`, and curated positions in `data/`. Colocate unit tests as `*.test.js`. Stockfish WASM/worker files and tutorial/quiz JSON belong in `public/`. README screenshots live in `pics/`; project notes in `docs/`. Playwright discovers browser tests in `e2e/`.

## Build, Test, and Development Commands

- `npm install` installs the locked dependency set.
- `npm run dev` starts Vite at `http://localhost:5173`.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the production bundle locally.
- `npm test` starts Vitest in watch mode; use `npm test -- --run` for one pass.
- `npm run test:coverage` runs unit tests and reports aggregate coverage.
- `npm run test:e2e` runs Playwright against the Vite development server.
- `npm run lint` checks the repository; `npm run lint:fix` applies safe fixes.
- `npm run format` formats JavaScript, JSX, JSON, and CSS under `src/`.

## Coding Style & Naming Conventions

Use ES modules and functional React components. Prettier is the formatting authority; ESLint checks React, hooks, accessibility, promises, and complexity. Use `kebab-case` filenames (`opening-stats-panel.jsx`), `PascalCase` components, `camelCase` functions and variables, and `use-`/`useX` for hook files/exports. Prefer aliases such as `@/`, `@lib`, and `@hooks` over deep relative imports. Chess abbreviations (`fen`, `pgn`, `san`, `uci`, `pv`) are allowed.

## Testing Guidelines

Vitest runs in `happy-dom` with Testing Library setup from `vitest.setup.js`. Name unit tests `*.test.js` or `*.test.jsx`, colocate them with modules, and cover public behavior plus failure paths. Keep browser journeys in `e2e/*.spec.js`. Coverage scripts use an 80% aggregate benchmark; avoid reducing coverage for changed logic.

## Commit & Pull Request Guidelines

Recent history favors concise, imperative Conventional Commit subjects such as `feat: ...`, `refactor: ...`, and `chore: ...`; follow that pattern and keep each commit focused. Pull requests should explain the user-visible change, list verification commands, link related issues, and include screenshots for UI changes. Call out changes to Stockfish assets, tutorial data, deployment behavior, or environment configuration.

## Security & Configuration

Store AI credentials only in an untracked `.env` using `VITE_GOOGLE_AI_API_KEY` or `VITE_OPENAI_API_KEY`. Never commit real keys; remember that `VITE_` values are exposed to browser code.
