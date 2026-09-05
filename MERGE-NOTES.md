# MERGE-NOTES

Every intentional edit we make to a file that also exists **upstream**, one line
each, with the reason it is there.

When a conflict lands in `App.jsx` six months from now, this file is the
difference between re-applying a known change in two minutes and re-deriving it
in two hours (PRD §85.4).

---

## The remotes

| Remote | URL | Role |
|---|---|---|
| `origin` | `https://github.com/eputnam77/PieceFirstChess.git` | ours; push here |
| `upstream` | `https://github.com/Iamsdt/chess.git` | Chess King; fetch only |

`upstream`'s push URL is deliberately set to the invalid value
`DISABLED-no-push`, so `git push upstream` fails loudly rather than attempting
to write to someone else's repository.

## Pulling upstream

```bash
git fetch upstream
git merge --no-rebase upstream/main    # merge, never rebase a fork
```

**Merge, never rebase.** Rebasing rewrites our commits on every pull and turns
one conflict into a series of them (PRD §85.1).

As of 2026-09-05 the merge base is `4fb022b`, which is also `upstream/main`'s
tip: upstream has not moved since the fork, so no merge has been needed yet.

## The seam: `src/pf/`

Every **new** file goes in `src/pf/`, a directory upstream will never create, so
it can never conflict. The `@pf` alias points there and — per CLAUDE.md — is
registered in all four places that must stay in sync:

- `vite.config.js`
- `vitest.config.js`
- `jsconfig.json`
- `eslint.config.js` (`settings["import/resolver"].alias.map`)

Existing PieceFirst-only files (`src/lib/curriculum.js`, `srs.js`, `srs-db.js`,
`session.js`, `pf-error-log.js`, `protocol-drills.js`, `tabiya.js`,
`authored-lines.js`, `endgame-goal.js`, the drill components, the `src/data`
content) have no upstream counterpart and are already conflict-free. **Do not
move them** — a rename is merge cost with no benefit (PRD §85.2). The `src/pf/`
rule is forward-looking only.

## The rule for shared files

**One call site, additive, with a default.** A file we touch in one place
survives an upstream rewrite; a file we touch in twelve does not. Anything that
cannot be expressed that way belongs in `src/pf/` with a single mount point.

---

## The inventory

175 of our 230 tracked files also exist upstream. These are the 17 we have
changed. Anything not listed here is either upstream-identical or ours alone.

### Application code

| File | Our edit | Why | Merge cost |
|---|---|---|---|
| `src/App.jsx` | Study + Curriculum overlay state, the due-count badge, and the game-report → PF error-tally fold | The closed loop of `docs/PF7/LEARNING-SYSTEM.md` §3.4: a finished game's report tags each mistake with the PF step that would have caught it, and the tally reorders the study queue | **High — the one to watch.** Currently ~125 added lines across several regions. PRD §85.3 targets collapsing this into one `usePieceFirst()` hook plus one `<PieceFirstLayer/>` mount in `src/pf/`, under 15 changed lines. Not yet done |
| `src/components/control-bar.jsx` | Two buttons — **Study** (primary, with the due badge) and **Curriculum** (ghost) — plus their three props | The only entry points to the curriculum | Low, and **frozen**: two buttons, no more, ever (PRD §74.4) |
| `src/lib/stockfish.js` | Optional `timeoutMs` on `getMove()`; optional `timeoutMs` + `movetimeMs` on `analyze()`, plus the `createWatchdog` helper | There is one `_pending` slot, so overlapping requests orphan a promise forever, and a depth search has no wall-clock bound — on the single-threaded lite WASM build depth 12 in a middlegame can take tens of seconds | Low: trailing optional arguments that default to the original behaviour, so upstream call sites are unaffected by construction |
| `src/lib/analyzer.js` | Imports its quality thresholds from `@pf/verdict.js` instead of defining them | One adjudicator for the whole app: the same move in the same position must get the same verdict in the game report, the hint cards and every drill (PRD §83.1) | Low: one import line replacing a local constant |
| `src/lib/ai.js` | Timeout/abort via `fetch-with-timeout`, stricter response parsing, `getGMThoughtProcess` | Reliability; the GM card needs a structured response | Medium |
| `src/lib/google-ai.js` | Gemini provider with the `set_board_position` / `make_move` / `flip_board` function-calling tools | Board demonstrations from the chat coach | Medium |
| `src/lib/db.js` | `openDB()` wrapped in `try/catch` | Safari private browsing throws **synchronously** from `indexedDB.open` rather than going through `request.onerror`, so the promise never settles | Low — worth offering upstream |
| `src/lib/progress.js` | `openProgressDB()` wrapped in `try/catch` | Same Safari synchronous-throw fix | Low — worth offering upstream. Note PRD §85.3 lists this file as "untouched"; it is not, and this is why |

### Configuration and tooling

| File | Our edit | Why |
|---|---|---|
| `vite.config.js` | `@pf` alias | The merge seam |
| `vitest.config.js` | `@pf` alias | The merge seam |
| `jsconfig.json` | `@pf/*` path | The merge seam |
| `eslint.config.js` | `@pf` in the `import/resolver` alias map | The merge seam |
| `.github/workflows/deploy.yml` | A `verify` job (`npm run lint` + `npm run test:run`) that `build` depends on | A curriculum whose grader can ship broken is not a curriculum (PRD §83.4) |
| `package.json` | `test:run`, `verify:endgames`, `import:puzzles` scripts and the deps they need | CI needs a non-watch test command; the content pipeline needs the other two |
| `package-lock.json` | Follows `package.json` | Regenerate rather than merge — `git checkout --ours` then `npm install` |
| `.gitignore` | One added entry | — |
| `.claude/settings.json` | Local agent settings | Ours; take ours on conflict |
| `README.md` | PieceFirst description | Ours; take ours on conflict |

### Not upstream at all

`.gitattributes` is ours. It pins the working tree to LF on every platform,
because Prettier (via `eslint-plugin-prettier`) enforces LF and a CRLF checkout
otherwise produces ~17,000 lint errors on Windows. If upstream ever adds one,
keep both sets of rules.

---

## Conflict playbook

| Conflict in | Do this |
|---|---|
| `package-lock.json` | Take upstream's, then `npm install` and commit the result. Never hand-merge |
| `src/App.jsx` | Keep upstream's structure; re-apply our block from the table above. This is why the PRD wants it down to one hook and one mount |
| `src/components/control-bar.jsx` | Keep upstream's layout; re-insert the two buttons. Never add a third |
| `src/lib/stockfish.js` | Keep upstream's body; re-apply the optional trailing parameters and `createWatchdog` |
| Anything under `src/pf/` | Cannot conflict. If it does, something has gone wrong with the remote |
