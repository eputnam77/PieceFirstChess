# The PieceFirst Curriculum — A Bounded Chess Learning System

> Design document. Created 2026-08-29. Companion to `PieceFirst_7_Handbook.md`.
>
> **Goal:** one book you can finish, and one app that engrains it. This document defines the complete curriculum, the sequencing, and the repo changes needed to drill it.

---

## 0. The reframe, and why it fixes the problem

The original hope was that PF7 was a *new* system. It is not — it is a compression of consensus pedagogy (see `../ai-notes.md` §1 for the sourcing). Under the new goal, **that is an asset, not a disappointment:**

- A novel system would be an untested experiment you would be running on your own rating.
- The consensus is the consensus because it survived a century of testing.
- What is genuinely missing from the world is not a new system — it is a **bounded, finishable, personally-scheduled** presentation of the existing one. That is what this document specifies, and it is the thing that actually solves overwhelm.

**The overwhelm is a curriculum-design problem, not a knowledge problem.** You are drowning because chess literature is written for an audience that includes professionals, so it presents the professional's volume. Below ~2000, essentially no game is decided by opening theory. They are decided by hanging pieces and missed one-movers. The correct response to "there is too much to learn" is not to learn faster. **It is to delete 90% of the curriculum and drill the remainder until it is automatic.**

### The headline number

The complete curriculum below is **99 items.**

| Tier | Content | Items |
|---|---|---|
| 0 | The protocol (PF7, amended) | 1 |
| 1 | Tactical motifs | 42 |
| 2 | Named mating patterns | 16 |
| 3 | Must-know endgames | 18 |
| 4 | Pawn structures | 8 |
| 5 | Opening tabiya cards | 14 |
| | **Total** | **99** |

That is the entire thing. Not "there are so many openings" — **fourteen opening cards**, and they come *last*. You can put a number on what you need to know, and the number is under a hundred.

### The organizing insight: PF7 is the index, not the content

This is the piece that makes the whole system cohere.

The common failure mode for club players is *"I knew that pattern, I just didn't see it."* That is a **retrieval** failure, not a storage failure. It happens because patterns are usually learned filed under a taxonomy ("chapter 4: deflection") rather than filed under **the moment you would need them.**

So: every item in this curriculum is tagged with the PF step that would surface it.

| PF step | What is filed here |
|---|---|
| PF1 RESET | Position-diff habits; what a move changes |
| PF2 SAFETY | Loose pieces, all defensive motif recognition, opponent's tactics |
| PF3 FORCE | Every offensive tactical motif, every mating net |
| PF4 BREAK | Pawn structures and their breaks |
| PF4.5 PREVENT | Prophylaxis — **added**, see below |
| PF5 PIECEFIRST | Piece placement, outposts, good/bad bishop, rook activity |
| PF6 CALCULATE | Calculation technique, candidate discipline |
| PF7 VERIFY | Blunder-check habit |

The seven steps become the **retrieval structure**. You are not learning 99 facts; you are learning 8 questions, each with a stocked answer set. That is a dramatically smaller cognitive load, and it is why the protocol and the content must ship as one system rather than as a checklist plus a pile of puzzles.

### Amendment carried over from the review

**Add PF4.5 PREVENT — "what does my opponent want over the next 3–5 moves?"** The original handbook has `P10: opponent plan ignored` in its error taxonomy with no protocol step that would ever catch it. Prophylaxis is the highest-value positional question there is (Aagaard) and the original protocol has no home for it. All eight steps are used as the index above.

---

## 1. The curriculum

### Tier 0 — The protocol (1 item)

`PF-PROTOCOL` — the amended eight-step card, memorized cold. Not knowledge; a habit. Drilled by forcing the steps in the UI until they are automatic, then withdrawing the scaffold.

**Mastery test:** on 20 consecutive positions, you can state what changed, name the threats, and list the forcing moves — without prompting, in under 60 seconds each.

---

### Tier 1 — Tactical motifs (42 items) · *PF2 / PF3*

The single highest-ROI tier. Everything here is a **pattern**, and patterns are recognized, not calculated.

**Double attack family (5)**
`T-01` Knight fork · `T-02` Pawn fork · `T-03` Queen double attack · `T-04` Bishop/rook double attack · `T-05` Royal fork

**Line attacks (9)**
`T-06` Absolute pin · `T-07` Relative pin · `T-08` Skewer · `T-09` X-ray attack · `T-10` X-ray defense · `T-11` Discovered attack · `T-12` Discovered check · `T-13` Double check · `T-14` Batteries (Q+B, Q+R, Alekhine's gun)

**Removing the defender (6)**
`T-15` Deflection · `T-16` Decoy / attraction · `T-17` Overloading · `T-18` Removal of the guard · `T-19` Interference / obstruction · `T-20` Undermining the base of a chain

**Pawn tactics (4)**
`T-21` Passed-pawn breakthrough · `T-22` Promotion tactics & underpromotion · `T-23` Outside passer as decoy · `T-24` Connected passers vs. a rook

**Timing and move order (5)**
`T-25` Zwischenzug · `T-26` Desperado · `T-27` Zugzwang · `T-28` Clearance sacrifice · `T-29` Tempo gain with check

**Trapping and drawing resources (6)**
`T-30` Trapped piece · `T-31` The trapped-bishop pattern (…Bxh2 / Bxa7) · `T-32` Windmill · `T-33` Perpetual check · `T-34` Stalemate resource · `T-35` Fortress

**King attack (7)**
`T-36` Back-rank weakness · `T-37` Greek gift (Bxh7+) · `T-38` Nxf7 / Bxf7 demolition · `T-39` h-file demolition (Rxh7) · `T-40` Destroying the castled king's cover (Bxf6) · `T-41` Pawn-storm breakthrough · `T-42` Luft and back-rank prophylaxis

Each item needs **~6 positions**: 3 where you execute it, 2 where the *opponent* threatens it (PF2 recognition — this is the half that most training skips), 1 near-miss where the pattern is on the board but does not work.

---

### Tier 2 — Named mating patterns (16 items) · *PF3*

Finite, nameable, and they recur forever. Mating nets are the cheapest pattern knowledge in chess.

`M-01` Back-rank · `M-02` Smothered (Philidor's legacy) · `M-03` Anastasia's · `M-04` Arabian · `M-05` Boden's · `M-06` Damiano's · `M-07` Epaulette · `M-08` Greco's · `M-09` Hook · `M-10` Ladder / lawnmower · `M-11` Legal's · `M-12` Lolli's · `M-13` Morphy's · `M-14` Opera · `M-15` Blackburne's · `M-16` Vukovic's

**~4 positions each.** Mate-in-1 to recognize, mate-in-2/3 to execute, one where you must *set it up*.

---

### Tier 3 — Must-know endgames (18 items) · *PF5 / PF6*

**Capablanca's advice: study endgames before openings.** The reason is exactly your problem — endgame knowledge is *finite, concrete, and transferable*. There is a correct answer, you can verify it, and once known it never rots. This is the most completable tier in chess and the fastest route to feeling like you have solid ground under you.

**Basic mates (3)**
`E-01` K+Q vs K · `E-02` K+R vs K · `E-03` Two bishops vs K

**Pawn endings (6)**
`E-04` Opposition · `E-05` Key squares · `E-06` Rule of the square · `E-07` Distant & diagonal opposition · `E-08` Trébuchet / mutual zugzwang · `E-09` Creating a passer from a majority

**Rook endings (5)** — the most common endgame in practice
`E-10` Lucena (building the bridge) · `E-11` Philidor (third-rank defense) · `E-12` Short-side / long-side defense · `E-13` Rook behind the passed pawn (Tarrasch) · `E-14` Rook vs. advanced passed pawn

**Minor-piece & queen (4)**
`E-15` Wrong-colored bishop + rook pawn = draw · `E-16` Opposite-colored bishop drawing mechanism · `E-17` Bishop vs. knight — when each is better · `E-18` Q vs. pawn on the 7th (and the rook/bishop-pawn exceptions)

**~3 positions each**, all played out against the engine to a result — not solved as puzzles. Technique must be executed, not recognized.

---

### Tier 4 — Pawn structures (8 items) · *PF4 / PF4.5 / PF5*

**This tier is where the repertoire pays off, and it is the answer to "there are too many middlegame strategies."**

There are roughly 14 canonical pawn structures in all of chess. **The PF7 repertoire reduces your required set to five** — and it has an elegant property the handbook never points out: *several of them are learned from both sides.*

| Structure | You get it as White via | You get it as Black via |
|---|---|---|
| `S-01` **French chain** (e5/d4/c3 vs e6/d5/c5) | French Advance, Caro Advance | Caro-Kann Advance |
| `S-02` **IQP** | Alapin (exd5, d4) | Panov attack against your Caro |
| `S-03` **Carlsbad** (minority attack) | — | QGD Exchange, Caro Exchange |
| `S-04` **Caro/Slav formation** (c6/e6/d5) | — | Caro-Kann Classical |
| `S-05` **Closed e4/d3 centre** (Pianissimo) | Italian | — |

Two of your five structures are learned from **both** sides of the board. Knowing both sides of the French chain and both sides of the IQP is worth far more than knowing eight structures from one side — you learn what the opponent is trying to do because you have *been* the opponent.

Plus three you will meet regardless of repertoire:
`S-06` Hanging pawns (c5+d5) · `S-07` Half-open file play after central exchanges · `S-08` Backward pawn on a half-open file

**Per structure you store the Part XVI tabiya card:** typical plans for both sides, the main pawn break, best piece placement, the bad piece, the favorable endgame, the trade to avoid. **Drilled by playing the structure out against Stockfish from a tabiya position** — not by reading about it.

---

### Tier 5 — Opening tabiya cards (14 items) · *PF4 / PF5*

**Last, smallest, and deliberately so.** These are not move lists. Each card is a *position* (roughly move 8–12) plus its plans. You memorize moves only far enough to reach a position you understand.

**White, 1.e4 (7):** `O-01` Italian/Pianissimo · `O-02` Alapin vs …d5 · `O-03` Alapin vs …Nf6 · `O-04` French Advance · `O-05` Caro Advance · `O-06` Scandinavian · `O-07` Pirc/Modern & Alekhine (classical centre)

**Black vs 1.e4 — Caro-Kann (4):** `O-08` Classical (3.Nc3/3.Nd2) · `O-09` Advance · `O-10` Exchange · `O-11` Panov

**Black vs 1.d4 and others (3):** `O-12` QGD main · `O-13` QGD Exchange (Carlsbad) · `O-14` London / 1.Nf3 / 1.c4 transpositions

Note how tightly this couples to Tier 4: **every card resolves to one of your five structures.** That is the whole design. You are not learning fourteen openings; you are learning five structures and fourteen routes into them.

> **Repertoire caveat carried over from the review:** this is an all-slow repertoire. It is sound and low-memory, but it will leave you weaker in sharp open positions than in the quiet ones. Compensate deliberately in Tier 1 — do not let the repertoire narrow your tactical diet. Also note the Advance Caro is more concrete theory than its "low theory" billing suggests.

---

## 2. Sequencing — the order that beats overwhelm

The order matters more than the content. Each phase is *finishable*, and each ends with a visible completion.

| Phase | Weeks | Focus | Why here |
|---|---|---|---|
| **0. Ground floor** | 1–2 | PF7 protocol + blunder-check habit + `E-01`…`E-03` | Tiny, completable, immediate. You end week 2 having *finished* something and never losing to a basic mate again. |
| **1. Pattern engine** | 3–12 | Tiers 1 & 2 under spaced repetition | Highest ROI in chess. This is where rating actually moves. |
| **2. Solid ground** | 8–18 *(overlaps)* | Tier 3 endgames | Concrete and verifiable. Overlaps Phase 1 deliberately — endgame study is a rest from tactics, not a competitor. |
| **3. Understanding** | 12–26 | Tier 4 structures, played out vs. engine | Only meaningful once you stop hanging pieces. Before that, plans are irrelevant. |
| **4. Openings** | 20+ *(ongoing)* | Tier 5 cards | **Last. Deliberately.** By now each card is just a route into a structure you already know. |

**Two rules that make this work:**

1. **Do not start Phase 4 early.** The urge to fix your opening is nearly always misdirected anxiety about losing. You are not losing because of your opening.
2. **Phases overlap; tiers do not restart.** Once an item enters spaced repetition it stays there forever at expanding intervals. Nothing is ever "finished and dropped."

---

## 3. What the repo must become

> **Implementation status, 2026-09-01: built.** All six changes below are in the
> repo, and every one of the 99 items has drill content. What shipped differs
> from this section in four places, each for a reason found during the build:
>
> - **Unlocking uses "learned", not "mastered".** Gating on 21 days of stability
>   meant a new learner saw one item — the protocol — and nothing else for three
>   weeks. Prerequisites now clear once an item graduates into review; mastery is
>   still what the dashboard reports. The session builder also follows the
>   prerequisite chain *within* one session, so day one fills its time budget
>   instead of ending after two minutes.
> - **A session is budgeted in minutes, and each item shows three positions, not
>   all of them.** Some items have 42.
> - **Tiers 4 and 5 are stored as SAN lines, not positions.** `tabiya.js` replays
>   them, so there is no hand-written FEN to drift out of step with the moves.
> - **Two tier-1 items are play-outs, not puzzles.** A stalemate resource (T-34)
>   and a fortress (T-35) are held over several moves rather than found in one,
>   and Lichess has nothing to offer for either — they live in
>   `endgame-drills.js` and pass the same Stockfish gate.
>
> Content, as built: 440 imported Lichess positions across 55 items, 36 free
> blunder-check reps derived from the import, 28 Stockfish-certified play-outs, 22
> tabiya cards, and 2 hand-authored lines for Légal's mate. The one thing the
> importer could not reach at all was T-34, for the reason above.


### The critical finding

**`src/lib/progress.js` records `solved: true` and nothing else.** Solve a puzzle once, it is marked done permanently. That is the exact opposite of engraining — it is a completion tracker, not a memory system. **Replacing this is the single highest-priority change in the entire plan.** Everything else is content; this is the mechanism.

### Required changes, in build order

**1. `src/lib/srs.js` — spaced repetition** *(the keystone)*

Implement **FSRS** (modern, open, better-calibrated than SM-2). Per item: stability, difficulty, due date, review log. Grades: again / hard / good / easy.

- Migration: existing `solved: true` records seed as a single "good" review so no progress is lost.
- `progress.js` keeps its API surface for tutorials/quizzes; puzzles and curriculum items move to SRS.
- Needs an IndexedDB version bump (`PROGRESS_DB_VERSION` 1 → 2) plus a `due` index for cheap queue queries.

**2. `src/data/curriculum.js` — single source of truth**

All 99 items: `{ id, tier, title, pfStep, prereqs[], positions[], masteryTest, plans? }`.

> **Architectural point worth insisting on: the book is *generated* from this file.** One source of truth, two renderings — a printable/browsable handbook and the drill app. Add a pattern once and both update. Otherwise the book and the app drift within a month, and you end up trusting neither.

**3. `src/lib/session.js` — the daily session builder**

`buildSession({ minutes })` → a concrete ordered list. **This is the feature that actually kills overwhelm**, because it replaces "what should I study?" with a queue that is already decided:

1. SRS items due today (cap by time budget)
2. Drills targeting your **most frequent PF failure step** (from the error log, per `../ai-notes.md` §E)
3. One new item, only if prerequisites are mastered
4. One structure game or endgame conversion

Maps directly onto Handbook Part XV's 60/20-minute models.

**4. Error log → curriculum feedback loop**

Already specified in `../ai-notes.md` §E: tag each blunder with its PF failure step, aggregate across saved games in IndexedDB. Here it gains its purpose — **the error log reorders the study queue.** Frequency-driven training, exactly as Handbook Part XIV prescribes. This closed loop is the thing no commercial product does well for you personally.

**5. New drill modes** (following the existing `onBoardUpdate` / `onRegisterMoveHandler` training-board protocol)

- `BlunderCheckMode` — rapid "is this move safe?" reps. Pure PF7 VERIFY. Highest-value drill in the app.
- `StructureMode` — play a Tier 4 structure out against Stockfish from a tabiya, with plan checkpoints ("what is the break here?") before the engine replies.
- `Pf7DrillMode` — protocol rehearsal with progressive reveal.
- Extend the existing `PuzzleMode` to be SRS-driven and motif-tagged rather than a flat list.

**6. `MasteryDashboard`** — the book's table of contents with per-item state (new / learning / young / mature). Answers "how far in am I?" at a glance. Bounded curricula are motivating **only if the bound is visible.**

### The content problem, and its solution

99 items × ~5 positions ≈ **500 positions**. The repo currently has 44 puzzles and 21 endgames. Hand-authoring the rest is the single largest cost in this plan.

**Use the Lichess puzzle database.** It is **CC0-licensed**, contains millions of puzzles derived from real games, and — critically — **each puzzle carries theme tags and a rating.** The theme vocabulary maps almost one-to-one onto Tier 1 and Tier 2 above (`fork`, `pin`, `skewer`, `discoveredAttack`, `deflection`, `attraction`, `interference`, `clearance`, `xRayAttack`, `zugzwang`, `backRankMate`, `smotheredMate`, `anastasiaMate`, `arabianMate`, `bodenMate`, `hookMate`, `vukovicMate`, plus `rookEndgame` / `pawnEndgame` / `bishopEndgame` families).

Build `scripts/build-curriculum.mjs` to filter that dump by theme and rating band, select N per motif, and emit `src/data/curriculum-positions.js`. This turns ~500 hand-authored positions into a filtering script. Verify the license terms and current file format before committing to it, but this is the practical path — **do not hand-author 500 positions.**

Tiers 3–5 still need hand-authoring (~90 positions plus the plan text). That is real work, but it is bounded and it is the part where the thinking has value.

---

## 4. Honest expectations

- **Timeline.** Phases 0–2 are roughly six months at 30–45 min/day. That is the realistic window for tactics and endgames to become automatic. Anyone promising faster is selling something.
- **Where the gains come from.** Almost entirely Tier 1, Tier 2, and the blunder-check habit. Tiers 4 and 5 are what make chess *comprehensible* and enjoyable, but they are not what moves your rating first.
- **This system is not novel and should not try to be.** Its value is that it is bounded, sequenced, personally scheduled, and closed-loop against your own errors. That combination is genuinely rare, and it is worth far more to you than a new idea would be.
- **The protocol without the patterns is empty; the patterns without the protocol are unretrievable.** Ship them as one system. That is the actual thesis of this document.
- **Build order is not negotiable at one point:** `srs.js` before content. A large curriculum on top of a binary solved/unsolved tracker will teach you nothing, no matter how good the content is.
