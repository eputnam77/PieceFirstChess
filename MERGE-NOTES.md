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

175 of our 230 tracked files also exist upstream. The rows below cover every one
of those we have changed. Anything not listed is either upstream-identical or
ours alone.

### Application code

| File | Our edit | Why | Merge cost |
|---|---|---|---|
| `src/App.jsx` | Study + Curriculum overlay state, the due-count badge, and the game-report → PF error-tally fold | The closed loop of `docs/PF7/LEARNING-SYSTEM.md` §3.4: a finished game's report tags each mistake with the PF step that would have caught it, and the tally reorders the study queue | **High — the one to watch.** Currently ~125 added lines across several regions. PRD §85.3 targets collapsing this into one `usePieceFirst()` hook plus one `<PieceFirstLayer/>` mount in `src/pf/`, under 15 changed lines. Not yet done |
| `src/components/control-bar.jsx` | Two buttons — **Study** (primary, with the due badge) and **Curriculum** (ghost) — plus their three props | The only entry points to the curriculum | Low, and **frozen**: two buttons, no more, ever (PRD §74.4) |
| `src/lib/stockfish.js` | Optional `timeoutMs` on `getMove()`; optional `timeoutMs` + `movetimeMs` on `analyze()`, plus the `createWatchdog` helper | There is one `_pending` slot, so overlapping requests orphan a promise forever, and a depth search has no wall-clock bound — on the single-threaded lite WASM build depth 12 in a middlegame can take tens of seconds | Low: trailing optional arguments that default to the original behaviour, so upstream call sites are unaffected by construction |
| `src/lib/analyzer.js` | Imports its quality thresholds from `@pf/verdict.js` instead of defining them | One adjudicator for the whole app: the same move in the same position must get the same verdict in the game report, the hint cards and every drill (PRD §83.1) | Low: one import line replacing a local constant |
| `src/lib/intelligence.js` | Same — imports the threshold table instead of holding a byte-identical second copy | It builds the live-mode cards, so leaving it out would have left the one-verdict invariant false where the learner sees it most | Low: one import line replacing a local constant |
| `src/hooks/use-engine-coach.js` | One optional `commitGate` prop defaulting to `null`, read at two call sites; plus a new `handleProtocolReadout` | The Commit Gate (PRD §77) and the PF7 Readout (§77.3). With the prop absent or the flag off, Best Move and Analyze behave exactly as before | Low: one destructured default and two `commitGate?.` guards. An upstream rewrite drops them and nothing breaks |
| `src/components/chat-panel.jsx` | Two optional props defaulting to `null` — `commitGate` (renders `<CommitGateStrip/>` above the action area) and `onProtocolReadout` (adds one button beside Think Like a GM) | The gate needs somewhere to ask, and the readout needs a way in without touching the frozen control bar | Low, and **the card renderers are untouched**: the gate's comparison line and the readout both ride the existing markdown message path rather than needing a new card type |
| `src/components/settings-dialog.jsx` | One `<CommitGateSettings/>` mount | The gate's flag and its pilot readout, in the one place a flag belongs | Low: one import, one line of JSX |
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
| `.github/workflows/deploy.yml` | A `verify` job (`npm run lint`, `npm run test:run`, `npm run verify:drills -- --strict`) that `build` depends on | A curriculum whose grader can ship broken is not a curriculum (PRD §83.4) |
| `package.json` | `test:run`, `verify:endgames`, `verify:drills`, `certify:drills`, `generate:scan`, `import:puzzles`, `simulate:band` scripts and the deps they need | CI needs a non-watch test command; the content pipeline needs the rest, and D4 makes simulating the difficulty staircase a shipping condition |
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

---

## Ours, but worth knowing: the extension points

Not merge surface — these files have no upstream counterpart. Listed because
they are where the next drill type goes, and because getting one of them wrong
is how a new drill silently fails to appear.

| File | Its job |
|---|---|
| `src/components/study-mode.jsx` | `DRILL_COMPONENTS` and `DRILL_LABELS` — one entry per position `type` |
| `src/lib/session.js` | `MINUTES_PER_POSITION` — the budget has to know what a drill costs, or the advertised session length is a lie |
| `src/data/curriculum-positions.js` | The merge of every content source, and `isPlayableLine`, which now replays every solution line before it can reach a board |
| `src/lib/session.test.js` | The `type` whitelist and the `expectPlayable` branch |
| `src/lib/srs-db.js` | v3: `cards`, `errors`, and now `events` — one append-only row per learner prediction |
| `src/lib/pf-error-log.js` | `looseMaterial` is exported: it is a complete PF2 answer key for any position, so the readout and the `sweep` generator both use it |

Adding a drill type means five entries and nothing else. That mechanism now
works eight ways.

## The scripts, and what they gate

| Command | Engine? | In CI | What it proves |
|---|---|---|---|
| `npm run verify:drills` | no | **yes**, with `--strict` | Every drill position has a legal FEN, a replayable solution line, and the fields its type needs. For `scan`/`sweep`, the answer key equals what `chess.js` recomputes. `--strict` also requires a current engine certificate for every type that gets one |
| `npm run certify:drills` | yes | no | Writes `src/pf/drill-certificates.json`. Run on a developer machine, commit the result. Changing any field of the recorded analysis contract invalidates every certificate, by design (D14) |
| `npm run verify:endgames` | yes | no | The original 94-position gate. Its checks are now imported by `verify:drills`, so endgames are covered structurally too |
| `npm run generate:scan` | no | no | Regenerates `src/data/scan-drills.js` from every FEN in the repo. Deterministic: same inputs, same file |

`scripts/alias-hooks.js` teaches plain `node` the path aliases so these scripts
can import app modules, and it **reads the alias list out of `jsconfig.json`**
rather than restating it. CLAUDE.md warns that aliases live in four places that
must stay in sync; a fifth hand-written copy is exactly the bug that warning is
about.

## What the drill gate found on its first run

Worth recording, because it is the argument for the gate existing at all.

- **Eleven hand-curated puzzles in `src/data/puzzles.js` have solutions that are
  illegal in their own FENs.** `m20` "Alekhine's Gun" runs a rook through a pawn;
  `m16` and `m19` move a pawn the way a knight moves; `e13` "Skewer the King"
  moves a bishop that is absolutely pinned; `h06` and `h07` break at ply 1 and
  ply 2. A learner reaching one of these cannot solve it — the drill can only be
  revealed.
- **One tabiya line (`O-02`) ended on the opponent's move**, which leaves the
  drill waiting forever for a student move that is not in the line.
- **One corpus FEN (`e09`) is an illegal position** — Black in check with White
  to move. `chess.js` loads it happily and generates moves for it, so the scan
  generator produced two drills from it before the guard was added. Same trap
  `verify-endgames.js` documents, where Stockfish answers "bestmove (none)" with
  a meaningless 0.00.

All of them are filtered at the merge layer rather than edited, because the
intended idea behind a broken FEN is a guess, and a guessed puzzle is the thing
the verifier exists to keep out. Correcting an entry makes it start passing with
no code change.

Then the **engine** layer found two bugs in itself, both worth knowing before
touching `verify-drills.js`:

- **Thresholds do not travel between budgets.** `E-09` passes
  `verify:endgames` at 3000ms / MultiPV 1 and failed certification at 1500ms /
  MultiPV 3, because MultiPV splits the search effort and line 1 of three reads
  weaker than one line alone. `CONTRACT.budgets` now holds one budget per
  position type, and `uci-engine.js` sets MultiPV per search.
- **Centipawn loss is meaningless in a decided position.** A mating move looked
  like a 300-pawn blunder (the position after mate has no score, and a missing
  score read as 0), and a move going from +41.5 to +13.8 looked like a 27-pawn
  blunder while being completely winning. `safetyProblems` now asks whether the
  move changes the *result*.
