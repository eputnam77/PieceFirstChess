# PieceFirst

## Product Requirements Document

**Version:** 1.0
**Status:** Initial Product Definition
**Product name:** PieceFirst
**Repository name:** `piecefirst-chess`
**License target:** MIT for PieceFirst source code, subject to third-party licenses
**Upstream project:** Chess King
**Primary platform:** Responsive web application
**Primary audience:** Beginner through intermediate chess players who know the rules but struggle to determine what to consider, which piece to examine, and why a move should be played

---

# 1. Executive Summary

**PieceFirst** is an open-source chess-learning application designed to teach players **how to think before they move**.

Most chess puzzle applications begin with:

> White to move. Find the best move.

PieceFirst begins one step earlier:

> What should you look at first?

The product specifically addresses a common learning gap: many players understand how chess pieces move and can solve simple tactical puzzles once they know a tactic exists, but they become lost in ordinary positions because they do not know:

* which piece deserves attention;
* what threats to check;
* which candidate moves to generate;
* how to reject irrelevant moves;
* how to compare plausible moves;
* what their opponent is threatening;
* what they should calculate before committing to a move.

PieceFirst combines:

* deterministic chess logic;
* Stockfish analysis;
* piece-level candidate evaluation;
* progressive hints;
* personalized learner modeling;
* adaptive training;
* spaced review;
* optional LLM explanations.

The defining feature is **piece-first candidate training**.

The learner can inspect any piece before moving it. PieceFirst explains whether that piece is:

* critical;
* a strong candidate;
* worth considering;
* low priority;
* irrelevant;
* dangerous to move;
* effectively forced.

The system then teaches the learner why.

PieceFirst does not aim merely to answer:

> What is the best move?

Its primary goal is to teach:

> Why should I have looked at that piece in the first place?

---

# 2. Product Tagline

**Know what to look at before you move.**

Alternative supporting line:

> Chess engines tell you the best move. PieceFirst teaches you what to consider first—and why.

---

# 3. Product Vision

## 3.1 Vision Statement

**Teach players a repeatable method for understanding a chess position before choosing a move.**

A successful PieceFirst learner should gradually internalize questions such as:

1. What changed after my opponent's last move?
2. What is my opponent threatening?
3. Is either king vulnerable?
4. Are any pieces hanging or overloaded?
5. What checks do I have?
6. What captures do I have?
7. What forcing threats do I have?
8. Which pieces can influence the important area?
9. Which two or three moves deserve calculation?
10. What is my opponent's strongest response?
11. Which candidate leaves me with the best resulting position?

The ultimate goal is for the user to need PieceFirst less over time.

---

# 4. Problem Statement

Many chess-learning systems assume the learner can already generate useful candidate moves.

Traditional puzzle:

> Find the best move.

Engine analysis:

> Stockfish prefers Bxh7+.

Post-game analysis:

> Nf3 was an inaccuracy.

These tools can explain what happened after the fact, but they often fail to teach the learner how to arrive at the relevant idea independently.

The PieceFirst user commonly experiences:

> I didn't even know I should be looking at that bishop.

or:

> I moved the knight because it seemed reasonable, but I had no idea what else I was supposed to consider.

The central product problem is therefore **candidate generation and attention allocation**, not merely move calculation.

---

# 5. Primary Product Objective

PieceFirst should teach the progression:

**Understand the position → identify relevant pieces → generate candidate moves → calculate responses → compare candidates → move → reflect**

rather than:

**Position → engine move**

---

# 6. Target Users

## 6.1 Primary User

A chess player who:

* understands legal chess moves;
* understands basic check, checkmate, and material;
* may know common tactical motifs;
* becomes confused in normal positions;
* frequently chooses a move without considering alternatives;
* overlooks threats;
* does not know which piece to analyze;
* wants explanations in plain language;
* learns through guided practice.

Typical ability range:

**Beginner through intermediate.**

PieceFirst should avoid hard-coding the experience around Elo alone.

---

## 6.2 Secondary Users

Future versions may support:

* stronger club players;
* chess coaches;
* parents teaching children;
* schools;
* self-study learners;
* players reviewing their own PGNs.

---

# 7. Product Principles

## 7.1 Teach reasoning, not answers

The system should reveal as little as necessary.

Preferred:

> Which part of the board deserves your attention?

before:

> Move the bishop.

---

## 7.2 Explain rejection

PieceFirst must explain not only why the correct move works, but also:

* why another piece is not important;
* why a move is tempting;
* why a natural move is too slow;
* why a move ignores a threat;
* why a move creates a weakness;
* why a plausible candidate ranks below another.

---

## 7.3 Engine truth is authoritative

Stockfish and deterministic chess logic determine chess facts.

An LLM may explain verified information.

An LLM must not independently determine:

* legal moves;
* checks;
* mates;
* material changes;
* attacks;
* defenders;
* piece positions;
* engine evaluation;
* principal variations.

---

## 7.4 Assistance fades

The system should progressively move the learner through:

**Show → Guide → Hint → Ask → Test**

---

## 7.5 Wrong moves are useful data

Wrong choices should improve both:

* the current explanation;
* the learner's future curriculum.

---

## 7.6 Local-first privacy

Core learning progress should be stored locally on the user's device by default.

PieceFirst should not require:

* an account;
* login;
* cloud storage;
* analytics;
* external AI.

---

## 7.7 The learner owns the data

Users should be able to:

* export progress;
* import progress;
* reset progress;
* delete all PieceFirst data.

---

# 8. Upstream Foundation

PieceFirst will fork the existing **Chess King** project.

Source:

https://github.com/Iamsdt/chess

The upstream project provides useful functionality including:

* React;
* Vite;
* browser-based chess board;
* Stockfish WASM;
* MultiPV analysis;
* AI coaching;
* puzzles;
* opening training;
* endgame training;
* FEN support;
* PGN support;
* local browser persistence.

PieceFirst should preserve stable upstream functionality where it remains useful rather than recreating mature features unnecessarily.

---

# 9. Core Differentiator

# Piece-First Candidate Training

For each training position, PieceFirst evaluates:

> Which pieces should a learner reasonably consider?

not merely:

> What is Stockfish's best move?

Each movable piece receives a teaching-oriented relevance classification.

Possible states:

* **Forced**
* **Critical**
* **Strong Candidate**
* **Worth Considering**
* **Low Priority**
* **Irrelevant**
* **Dangerous**

---

# 10. Signature Interaction

On desktop:

**Hover:** brief piece assessment
**Click:** expanded piece analysis

On mobile/tablet:

**Tap:** brief piece assessment
**Expand:** detailed reasoning

Example:

### Knight f3 — Low Priority

> This knight has legal moves, but none address the immediate tactical opportunity. Before making a routine developing move, check your forcing moves against the king.

### Bishop c4 — Strong Candidate

> This bishop attacks the king's position and has a forcing possibility. Examine the h7 square.

The learner should be able to investigate the board before choosing a move.

---

# 11. Core Learning Loop

## Stage 1 — Read the Position

Prompt:

> What changed?

Optional questions:

* What did the opponent's last move do?
* Is something attacked?
* Is your king safe?
* Is the opponent's king safe?
* Is anything undefended?

---

## Stage 2 — Identify the Important Area

Prompt:

> Where should you focus?

Possible categories:

* king safety;
* center;
* weak piece;
* open file;
* loose piece;
* tactical target;
* opponent threat.

---

## Stage 3 — Identify Candidate Pieces

Prompt:

> Which piece deserves your attention?

The learner inspects pieces.

PieceFirst provides progressively stronger feedback.

---

## Stage 4 — Generate Candidate Moves

Prompt:

> What could this piece do?

The user identifies potential moves.

---

## Stage 5 — Compare Candidates

Prompt:

> Which move is more forcing?

or:

> Which move best addresses the opponent's threat?

---

## Stage 6 — Calculate

Prompt:

> What is the opponent's strongest response?

---

## Stage 7 — Execute

The learner makes the move.

---

## Stage 8 — Explain

PieceFirst explains:

* why the piece mattered;
* why the move worked;
* what alternatives existed;
* why inferior moves failed;
* what principle should be remembered.

---

## Stage 9 — Generalize

Example:

> **Pattern to remember:** Before making a routine developing move, check all forcing moves against an exposed king.

---

# 12. Thinking Framework

PieceFirst should teach one consistent framework.

## DANGER

**What is my opponent threatening?**

---

## FORCE

**What checks, captures, and forcing threats do I have?**

---

## PIECES

**Which pieces can affect the important area?**

---

## CANDIDATES

**Which two or three moves deserve calculation?**

---

## RESPONSE

**What is the opponent's strongest reply?**

---

## COMPARE

**Which candidate produces the best resulting position?**

The wording may be refined through testing, but PieceFirst should avoid overwhelming beginners with multiple competing thinking systems.

---

# 13. Training Modes

## 13.1 Learn Mode

Maximum instructional support.

Features:

* piece relevance immediately available;
* guided questions;
* visual cues;
* progressive hints;
* why/why-not explanations;
* candidate comparison;
* complete solution explanation.

Best for introducing concepts.

---

## 13.2 Guided Mode

PieceFirst does not reveal relevant pieces immediately.

The learner must investigate.

Incorrect selection example:

> This rook is active, but the position contains something more forcing. Check pieces that can immediately attack the king.

---

## 13.3 Coach Mode

Assistance is available only on request.

Controls:

* What's happening?
* What changed?
* What is my opponent threatening?
* Give me a hint.
* Which area matters?
* Is this piece relevant?
* Why not this piece?
* Help me compare moves.
* Show the candidate piece.
* Show the move.
* Explain the solution.

---

## 13.4 Test Mode

Traditional puzzle experience.

No assistance unless explicitly requested.

After the attempt, PieceFirst provides full reasoning analysis.

---

## 13.5 Exploration Mode

Load any supported FEN or PGN position.

Users can inspect every piece.

Information may include:

* legal moves;
* best move originating from that piece;
* piece relevance;
* tactical role;
* defensive role;
* engine ranking;
* strategic relevance;
* risks.

---

## 13.6 Play With Coach

Future mode.

The user plays a full chess game.

PieceFirst teaches the decision-making process during the game without immediately revealing moves.

This is not required for MVP.

---

# 14. Piece-Relevance Engine

PieceFirst requires a new layer above Stockfish:

# Piece-Relevance Engine

Its job is to convert **move-level engine analysis** into **piece-level teaching analysis**.

For every legal piece:

1. enumerate legal moves;
2. identify the strongest move from that piece;
3. retrieve engine evaluation;
4. identify checks;
5. identify captures;
6. identify threats;
7. determine defensive value;
8. detect tactical consequences;
9. compare against top engine candidates;
10. classify the originating piece;
11. produce reason codes;
12. generate teaching metadata.

Example:

```json
{
  "piece": "bishop-c4",
  "bestMove": "Bxh7+",
  "engineRank": 1,
  "forcing": true,
  "check": true,
  "capture": true,
  "themes": ["king-exposure"],
  "pieceRelevance": "critical"
}
```

---

# 15. Piece Classification

## Forced

Rules or tactics effectively require action by this piece.

---

## Critical

The best solution originates from this piece and materially determines the position.

---

## Strong Candidate

The piece has one or more moves among the strongest practical candidates.

---

## Worth Considering

The piece has a reasonable move but is not central to the position.

---

## Low Priority

The piece can move, but stronger or more urgent ideas exist.

---

## Irrelevant

No current move from the piece meaningfully addresses the position.

---

## Dangerous

Moving the piece creates or permits a significant problem.

---

# 16. Move Classification

PieceFirst may retain conventional move categories:

* Best
* Excellent
* Good
* Playable
* Inaccuracy
* Mistake
* Blunder
* Forced

It should also use pedagogical categories such as:

* forcing;
* natural but inferior;
* tempting mistake;
* defensive necessity;
* tactical shot;
* positional improvement;
* premature;
* ignores threat;
* unnecessary;
* quiet improvement.

---

# 17. Why-Not System

PieceFirst must be able to answer:

> Why shouldn't I move this piece?

Possible reason codes:

* `IGNORES_THREAT`
* `MISSES_CHECK`
* `MISSES_CAPTURE`
* `MISSES_FORCING_MOVE`
* `REMOVES_DEFENDER`
* `HANGS_PIECE`
* `WEAKENS_KING`
* `BLOCKS_ACTIVE_PIECE`
* `LOSES_TEMPO`
* `UNNECESSARY_REPEAT_MOVE`
* `ABANDONS_SQUARE`
* `ALLOWS_TACTIC`
* `POOR_EXCHANGE`
* `PREMATURE_PAWN_MOVE`
* `EARLY_QUEEN_MOVE`
* `PASSIVE`
* `NO_USEFUL_THREAT`
* `TACTICALLY_UNSOUND`
* `REASONABLE_BUT_NOT_URGENT`

These codes enable deterministic explanations and later learner analysis.

---

# 18. Progressive Hint Ladder

Each suitable puzzle should support structured assistance.

## Hint 0

No help.

> Find the best continuation.

## Hint 1

Position awareness.

> Is there anything immediately threatened?

## Hint 2

Concept.

> Look for forcing moves.

## Hint 3

Move category.

> Check all available checks.

## Hint 4

Board area.

> Focus on the kingside.

## Hint 5

Candidate piece.

> Examine the bishop on c4.

## Hint 6

Destination clue.

> What happens if the bishop captures on h7?

## Hint 7

Candidate move.

> Bxh7+ deserves calculation.

## Hint 8

Continuation.

> What happens if the king captures?

## Hint 9

Full solution.

Display verified principal variation and explanation.

PieceFirst records the deepest hint level used.

---

# 19. Persistent User Progress

PieceFirst should automatically save meaningful learning activity.

Core progress is stored locally in the browser using **IndexedDB**.

The application should save frequently enough that closing the browser does not erase meaningful progress from the session.

---

# 20. Local Data Architecture

Recommended database:

```text
PieceFirstDB

userProfile
puzzleProgress
skillProfile
sessions
games
settings
reviewQueue
errorHistory
```

---

# 21. User Profile

Example:

```json
{
  "totalPuzzles": 427,
  "totalSessions": 38,
  "correctPieceRate": 0.68,
  "unassistedSolveRate": 0.51,
  "averageHintLevel": 2.3,
  "currentTrainingLevel": 4
}
```

The profile contains summary information.

Raw event evidence should be stored separately wherever practical.

---

# 22. Puzzle Progress

Each puzzle may store:

```json
{
  "puzzleId": "pf_0001842",
  "attempts": 3,
  "solved": true,
  "correctPieceFirstTry": false,
  "incorrectPieces": [
    "knight-f3",
    "queen-d1"
  ],
  "incorrectMoves": [
    "Nf3-e5"
  ],
  "hintsUsed": 2,
  "maxHintLevel": 3,
  "completionTimeSeconds": 48,
  "lastAttempt": "2026-08-18"
}
```

---

# 23. Learner Model

The learner model is a core PieceFirst system.

It answers:

> What does this specific learner need to work on next?

Track underlying behaviors including:

* missed opponent threats;
* missed checks;
* missed captures;
* missed forcing moves;
* incorrect candidate-piece selections;
* correct piece but incorrect move;
* incomplete calculation;
* failure to consider opponent reply;
* routine move during tactical position;
* overuse of queen;
* failure to consider defensive moves;
* missed backward move;
* missed pawn break;
* missed hanging piece;
* premature attack;
* excessive hint dependence.

---

# 24. Skill Profile

PieceFirst may show skill dimensions such as:

```text
Position Awareness        62
Candidate Generation      48
Threat Detection          39
Forcing Moves             71
Calculation               53
Defensive Awareness       37
Tactical Recognition      68
Positional Planning       44
```

These are PieceFirst learning scores.

They are **not chess ratings**.

---

# 25. Preserve Raw Evidence

Do not store only calculated scores.

Example:

```json
{
  "missedOpponentThreat": 14,
  "missedChecks": 5,
  "missedCaptures": 9,
  "wrongPieceSelected": 31,
  "correctPieceWrongMove": 18,
  "routineMoveDuringTactic": 12
}
```

This allows future changes to the scoring algorithm without losing historical data.

---

# 26. Adaptive Training

PieceFirst should use learner data to determine future training.

Example:

The learner:

* performs well on forks;
* frequently misses opponent threats;
* often selects attacking pieces when defense is required.

PieceFirst should increase the frequency of:

* threat-recognition puzzles;
* defensive candidate generation;
* opponent-intent questions.

The learner should not simply receive random puzzles forever.

---

# 27. Spaced Review

PieceFirst should revisit difficult concepts.

Example:

```text
Day 1
Miss removal-of-defender puzzle.

Day 2
Receive a similar removal-of-defender puzzle.

Day 5
Original position returns.

Day 14
Harder related position appears.
```

Review can occur at:

* puzzle level;
* motif level;
* reasoning-error level.

---

# 28. Review Queue

Suggested record:

```json
{
  "itemId": "review_123",
  "type": "reasoning-skill",
  "skill": "opponent-threat-detection",
  "sourcePuzzle": "pf_0001842",
  "nextReview": "2026-08-20",
  "intervalDays": 2,
  "successfulReviews": 1
}
```

A sophisticated spaced-repetition algorithm is not required for MVP.

---

# 29. Session Tracking

A session should record:

* start time;
* end time;
* puzzles attempted;
* training mode;
* correct candidate pieces;
* correct moves;
* hints;
* recurring error categories;
* concepts practiced.

---

# 30. Session Summary

Example:

## Today's Training

**12 positions**

Correct candidate piece: **9/12**

Correct move after finding piece: **8/9**

Unassisted solutions: **6/12**

### Strong Today

* checks;
* forks;
* loose pieces.

### Needs Work

* opponent threats;
* defensive moves.

### Pattern Detected

> In three positions, you looked for your own attack before checking what your opponent threatened.

### Recommended Next Session

> Threat recognition + defensive candidate generation.

---

# 31. Progress Dashboard

Recommended dashboard sections:

## Overall Progress

* positions completed;
* unassisted accuracy;
* correct-piece percentage;
* hint dependence.

## Thinking Skills

Visual skill breakdown.

## Current Weaknesses

Top three actionable areas.

## Recent Improvement

Skills trending upward.

## Review Queue

Concepts requiring reinforcement.

## Recommended Training

Next session automatically selected by PieceFirst.

---

# 32. Data Persistence

PieceFirst should save after meaningful events including:

* piece inspected;
* candidate selected;
* wrong piece selected;
* hint requested;
* move attempted;
* puzzle completed;
* puzzle abandoned;
* session ended;
* user setting changed.

Writes may be batched for performance, but meaningful session data should not depend on a clean application shutdown.

---

# 33. Local-First Privacy Model

Default architecture:

```text
Browser
   |
   +-- PieceFirst UI
   |
   +-- chess.js
   |
   +-- Stockfish WASM
   |
   +-- Piece-Relevance Engine
   |
   +-- Learner Model
   |
   +-- IndexedDB
        |
        +-- progress
        +-- history
        +-- weaknesses
        +-- games
        +-- settings
```

No server is required for the MVP.

---

# 34. Account Requirements

Core PieceFirst should require:

**No account.**

Do not require:

* email;
* password;
* username;
* cloud profile;
* social login.

---

# 35. Data Export

PieceFirst should provide:

**Export PieceFirst Data**

Example filename:

```text
piecefirst-backup.json
```

Export should include:

* settings;
* training history;
* skill profile;
* puzzle progress;
* learner-model data;
* review queue;
* optionally saved games.

---

# 36. Data Import

Users should be able to import a previously exported PieceFirst backup.

Import must validate:

* schema version;
* required fields;
* malformed records;
* incompatible versions.

Future schema migrations should be supported.

---

# 37. Delete and Reset Controls

Settings should contain:

* Reset Training Progress
* Reset Skill Profile
* Delete Saved Games
* Delete All PieceFirst Data

Destructive actions require explicit confirmation.

---

# 38. Privacy Screen

Recommended:

## Your Data

### Stored on This Device

* training progress;
* puzzle history;
* learning profile;
* saved games;
* settings.

### Sent Externally

**Nothing by default.**

### If AI Coaching Is Enabled

The selected AI provider may receive only the information required for that coaching request.

Actions:

* Export Data
* Import Data
* Delete Training History
* Delete All Data

---

# 39. AI Architecture

AI coaching is optional.

PieceFirst should not depend on an external LLM for core functionality.

The AI layer receives structured, verified information.

Example:

```json
{
  "learnerLevel": "beginner",
  "currentWeakness": "opponent-threat-detection",
  "position": "...",
  "selectedPiece": "knight-f3",
  "piecePriority": "low",
  "reasonCodes": [
    "IGNORES_THREAT",
    "MISSES_FORCING_MOVE"
  ]
}
```

The AI's responsibility is to produce understandable language.

---

# 40. AI Privacy

PieceFirst should not automatically send:

* full puzzle history;
* entire learning profile;
* imported game collection;
* unrelated user settings.

Send only necessary context.

The UI should make it clear when an external AI provider is being used.

---

# 41. AI-Free Mode

PieceFirst must remain useful without AI.

AI-free mode includes:

* Stockfish analysis;
* Piece-Relevance Engine;
* move rankings;
* hint ladder;
* deterministic explanations;
* learner tracking;
* weakness detection;
* puzzle recommendations;
* session summaries.

---

# 42. Explanation System

The explanation system should combine:

## Deterministic Chess Layer

Responsible for:

* board state;
* legal moves;
* checks;
* captures;
* attackers;
* defenders;
* material;
* piece positions.

## Stockfish Layer

Responsible for:

* best moves;
* evaluation;
* MultiPV;
* principal variations;
* tactical verification.

## Teaching Layer

Responsible for:

* piece relevance;
* reason codes;
* hint selection;
* curriculum concept.

## Language Layer

Responsible for:

* readable explanations;
* learner-level wording;
* optional conversational tutoring.

---

# 43. Explanation Verification

Before displaying generated AI coaching, PieceFirst should verify factual claims where technically practical.

If generated text says:

> The bishop gives check.

the system verifies the move gives check.

If it says:

> The rook is undefended.

the system verifies defender information.

Unsupported statements should be rejected or regenerated.

---

# 44. Puzzle Sources

## CandidateCraft—Correction

All references to the former working title should be removed.

The product and content schema should use:

**PieceFirst**

---

## 44.1 Curated PieceFirst Positions

Highest-quality instructional positions.

Hand-selected or manually reviewed.

---

## 44.2 Lichess Puzzle Database

Potential large-scale puzzle source.

Lichess database:

https://database.lichess.org/

Lichess database exports are made available under open-data terms described on that site.

PieceFirst should preserve source metadata even where attribution is not legally required.

---

## 44.3 Famous Games

Positions may be drawn from historic games where legally appropriate.

PieceFirst should create its own:

* analysis;
* annotations;
* lesson structure;
* explanation text.

Do not copy modern copyrighted annotations.

---

## 44.4 User Games

Future versions should support PGN import.

PieceFirst should be able to turn recurring mistakes into personalized training positions.

---

# 45. Puzzle Curriculum

## Level 1 — Board Awareness

* hanging pieces;
* checks;
* basic captures;
* immediate threats;
* simple mates.

## Level 2 — Candidate Pieces

* which piece can participate;
* loose pieces;
* attackers and defenders;
* active pieces;
* king exposure.

## Level 3 — Forcing Moves

* checks;
* captures;
* threats;
* forcing sequences.

## Level 4 — Tactical Candidate Generation

* forks;
* pins;
* skewers;
* discovered attacks;
* deflection;
* removal of defender;
* overload;
* interference;
* zwischenzug.

## Level 5 — Defensive Thinking

* recognize threats;
* trade attackers;
* create escape squares;
* counterattack;
* simplify;
* protect tactical weaknesses.

## Level 6 — Positional Candidate Generation

* worst piece;
* open files;
* weak squares;
* outposts;
* pawn breaks;
* exchanges;
* space.

## Level 7 — Planning

* compare quiet moves;
* prophylaxis;
* endgame transitions;
* long-term weaknesses;
* strategic plans.

---

# 46. Puzzle Quality Requirements

Prefer positions with:

* identifiable teaching concept;
* understandable candidate pieces;
* at least one plausible human mistake;
* clear refutation;
* stable engine evaluation;
* reasonable calculation depth.

Avoid overuse of puzzles whose move is correct only because of extremely deep computer calculation.

---

# 47. Puzzle Preprocessing Pipeline

A preprocessing system should:

1. import a puzzle;
2. reconstruct FEN;
3. run Stockfish;
4. capture MultiPV;
5. identify legal pieces;
6. analyze strongest move per piece;
7. calculate piece relevance;
8. detect tactical metadata;
9. assign reason codes;
10. estimate instructional difficulty;
11. evaluate engine stability;
12. reject poor teaching positions;
13. save PieceFirst puzzle data.

Example:

```json
{
  "id": "pf_000001",
  "fen": "...",
  "side": "white",
  "difficulty": 2,
  "lesson": "forcing-moves",
  "bestPiece": "bishop-c4",
  "bestMove": "Bxh7+",
  "candidatePieces": [],
  "themes": [],
  "hints": [],
  "source": {},
  "engine": {}
}
```

---

# 48. Puzzle Quality Gate

Flag or reject puzzles where:

* engine rankings fluctuate significantly by depth;
* many moves are effectively equivalent;
* lesson depends on one arbitrary engine preference;
* move requires excessive calculation;
* explanation cannot be reduced to understandable reasoning;
* source metadata is insufficient.

---

# 49. User Interface

Recommended desktop layout:

```text
+-----------------------------------------------------+
| PieceFirst                                          |
+---------------------------+-------------------------+
|                           | POSITION                |
|                           | What is happening?      |
|       CHESS BOARD         |                         |
|                           | PIECE COACH             |
|                           | Bishop c4               |
|                           | Strong Candidate        |
|                           |                         |
|                           | HINTS                   |
|                           | Why?                    |
|                           | More Help               |
+---------------------------+-------------------------+
| DANGER -> FORCE -> PIECES -> CANDIDATES -> RESPONSE|
+-----------------------------------------------------+
```

---

# 50. Board Visualizations

Optional overlays:

* attacked squares;
* defended squares;
* loose pieces;
* attackers;
* defenders;
* checks;
* candidate arrows;
* danger zones;
* important board area.

These should remain optional.

Too much visual assistance can prevent board-vision development.

---

# 51. Mobile UX

Because hover is unavailable:

**Tap piece:** inspect.

**Tap explanation:** expand.

**Drag piece:** move.

An optional:

**Inspect Before Move**

setting may help prevent accidental moves.

---

# 52. Accessibility

Requirements:

* keyboard support where practical;
* screen-reader labels;
* scalable text;
* high contrast;
* no color-only indicators;
* touch-friendly controls;
* reduced motion;
* clear notation.

---

# 53. Performance Requirements

Piece inspection should feel immediate.

Do not require a fresh deep Stockfish calculation every time the pointer moves over a piece.

For training puzzles:

* preprocess analysis;
* cache piece metadata;
* cache reason codes;
* cache hints.

Stockfish can perform deeper secondary analysis after load if needed.

---

# 54. Technical Architecture

Retain compatible upstream technology where practical.

Expected base:

```text
React
Vite
Tailwind CSS
Radix UI
react-chessboard
chess.js
Zustand
IndexedDB
Stockfish WASM
```

Primary new modules:

```text
src/
  piecefirst/
    candidate-engine/
    piece-relevance/
    reason-codes/
    hint-engine/
    learner-model/
    adaptive-training/
    review-queue/
    explanations/
    curriculum/
    persistence/
    privacy/
```

Suggested services:

```text
PositionAnalyzer
CandidateGenerator
PieceRelevanceAnalyzer
ReasonCodeEngine
HintEngine
TeachingExplanationEngine
LearnerProfileEngine
ReviewScheduler
PuzzleSelector
ProgressRepository
ExplanationVerifier
```

---

# 55. Suggested IndexedDB Stores

```text
profile
puzzles
attempts
skills
sessions
reviewQueue
games
settings
schemaMetadata
```

Use schema versioning from the beginning.

---

# 56. Data Schema Versioning

Example:

```json
{
  "databaseVersion": 1,
  "productVersion": "1.0.0"
}
```

Future upgrades should include migration functions.

---

# 57. MVP Scope

## Required

1. Fork Chess King.
2. Rename application PieceFirst.
3. Rename repository `piecefirst-chess`.
4. Preserve upstream license notices.
5. Implement Piece-Relevance Engine.
6. Implement piece hover/tap inspection.
7. Classify candidate pieces.
8. Add deterministic reason codes.
9. Add Learn Mode.
10. Add Guided Mode.
11. Add Test Mode.
12. Add progressive hint ladder.
13. Connect Stockfish MultiPV.
14. Create 20–30 exceptional proof-of-concept positions.
15. Expand to at least 250 reviewed training positions after validation.
16. Store user progress in IndexedDB.
17. Track incorrect piece selections.
18. Track incorrect move selections.
19. Track hints.
20. Track completion time.
21. Implement learner-model foundation.
22. Detect basic recurring weaknesses.
23. Add session summaries.
24. Add basic adaptive puzzle selection.
25. Add review queue.
26. Add data export.
27. Add data import.
28. Add delete/reset controls.
29. Add privacy screen.
30. Support mobile and desktop.
31. Preserve offline Stockfish operation.
32. Ensure core application functions without an LLM.

---

# 58. MVP Non-Goals

Do not delay MVP for:

* multiplayer;
* tournaments;
* leaderboards;
* social networking;
* native iOS;
* native Android;
* required accounts;
* cloud sync;
* paid subscriptions;
* Chess.com account sync;
* Lichess account sync;
* voice coaching;
* Maia integration;
* advanced ratings;
* massive opening repertoire systems.

---

# 59. First Development Milestone

Before importing thousands of puzzles, build **20–30 exceptionally well-designed positions**.

For every position:

* classify every movable piece;
* define the best candidate piece;
* define plausible alternatives;
* create reason codes;
* build hint sequence;
* create post-solution explanation;
* verify engine stability;
* record user learning interactions.

Success criterion:

> Does PieceFirst genuinely teach the learner where to look?

If not, improve the teaching system before scaling.

---

# 60. Version 1.1

Potential additions:

* larger Lichess-derived corpus;
* stronger adaptive recommendation engine;
* PGN import;
* personalized review from user games;
* more positional training;
* more sophisticated spaced review;
* enhanced dashboard.

---

# 61. Version 1.2

Potential additions:

* Play With Coach;
* complete-game reasoning analysis;
* opening decision training;
* endgame candidate training;
* calculation-tree exercises;
* opponent-threat drills.

---

# 62. Future Research

Potential later features:

* Maia human-move modeling;
* human-likelihood estimates;
* rating-specific common mistakes;
* Socratic AI tutoring;
* local LLM support;
* voice coach;
* historical master-game curriculum;
* encrypted optional cloud sync.

---

# 63. Success Metrics

Primary product metric:

**Improvement in unassisted correct candidate-piece identification.**

Secondary metrics:

* reduction in hint usage;
* improved threat recognition;
* improved first-attempt piece selection;
* improved first-attempt move selection;
* reduced repeated error patterns;
* successful spaced reviews;
* improved performance when guidance is removed.

Do not optimize primarily for:

* screen time;
* streak length;
* number of puzzles clicked;
* hints consumed.

---

# 64. Product Health Metrics

For development:

* engine analysis failures;
* invalid explanation rate;
* puzzle rejection rate;
* average analysis load time;
* IndexedDB write failures;
* import/export failures;
* explanation verification failures.

No external telemetry should be required for core functionality.

---

# 65. Definition of Success

PieceFirst succeeds when a learner progresses from:

> I have no idea what piece to move.

to:

> First I should check what my opponent is threatening. Then I should look at forcing moves. The bishop attacks the king, so it deserves calculation before the knight.

That transition is the fundamental product outcome.

---

# 66. Licensing

## PieceFirst

PieceFirst-created source code should be released under the **MIT License**, except where individual files or third-party components specify another license.

---

## Chess King

Upstream:

https://github.com/Iamsdt/chess

Retain required copyright and license notices from the upstream project.

---

## Stockfish

Official project:

https://github.com/official-stockfish/Stockfish

Stockfish license:

https://github.com/official-stockfish/Stockfish/blob/master/Copying.txt

Stockfish remains subject to its own GPLv3 license requirements.

PieceFirst should therefore avoid claiming:

> Everything distributed with PieceFirst is MIT licensed.

Preferred wording:

> PieceFirst source code is released under the MIT License except where otherwise noted. Third-party components remain subject to their respective licenses. Stockfish is licensed separately under GPLv3.

Perform a dependency and license audit before public distribution.

This PRD does not constitute legal advice.

---

# 67. Repository Files

Recommended:

```text
README.md
LICENSE
NOTICE.md
THIRD_PARTY_LICENSES.md
PRIVACY.md
CONTRIBUTING.md
SECURITY.md
```

---

# 68. NOTICE.md

Should identify:

* PieceFirst;
* fork relationship to Chess King;
* upstream repository;
* meaningful modifications.

---

# 69. Privacy Documentation

`PRIVACY.md` should clearly state:

* core progress is stored locally;
* no account is required;
* no cloud storage is required;
* external AI is optional;
* AI requests may send limited chess/coaching context to the selected provider;
* users can export and delete their local data.

---

# 70. Repository Branding

**Repository**

```text
piecefirst-chess
```

**Product**

```text
PieceFirst
```

**Tagline**

> Know what to look at before you move.

**GitHub Description**

> ♟️ Learn what to consider before you move. PieceFirst uses Stockfish 18 + AI coaching to teach piece selection, candidate moves, tactics, and chess decision-making.

---

# 71. README Positioning

Recommended opening:

> # PieceFirst
>
> **Know what to look at before you move.**
>
> Chess engines tell you the best move. PieceFirst teaches you how to find it.
>
> Explore pieces before you move, learn which ones deserve consideration, understand why alternatives fail, and build the candidate-generation process used in stronger chess thinking.

---

# 72. Development Sequence

## Phase 0 — Fork and Foundation

* fork Chess King;
* rename project;
* preserve attribution;
* audit dependencies;
* confirm application builds;
* establish PieceFirst folder structure;
* establish IndexedDB schema.

---

## Phase 1 — Piece Inspection

* detect hover/tap;
* enumerate moves by piece;
* create piece card;
* expose Stockfish evaluation by originating piece.

---

## Phase 2 — Piece Relevance

* implement classification;
* implement reason codes;
* compare candidate pieces;
* generate deterministic explanations.

---

## Phase 3 — Guided Training

* implement PieceFirst puzzle schema;
* Learn Mode;
* Guided Mode;
* Test Mode;
* progressive hints.

---

## Phase 4 — Progress Persistence

* puzzle history;
* attempts;
* wrong pieces;
* wrong moves;
* hint history;
* session history;
* IndexedDB autosave.

---

## Phase 5 — Learner Model

* skill categories;
* recurring errors;
* weakness detection;
* session summary;
* recommended next training.

---

## Phase 6 — Review System

* review queue;
* repeated concepts;
* basic spaced-repetition scheduling;
* success/failure tracking.

---

## Phase 7 — Data Ownership

* export;
* import;
* schema migration;
* reset;
* delete;
* privacy UI.

---

## Phase 8 — Dataset Expansion

* Lichess import;
* Stockfish preprocessing;
* puzzle filtering;
* curriculum tagging;
* quality gate.

---

## Phase 9 — AI Coaching

Only after deterministic teaching behavior is reliable:

* provider abstraction;
* structured prompts;
* explanation generation;
* privacy controls;
* verification safeguards.

---

# 73. Product Thesis

PieceFirst is based on a simple idea:

> **Chess improvement requires learning how to identify the right questions before memorizing more answers.**

Stockfish can determine which move works.

PieceFirst teaches the learner:

> **Why should I have looked there in the first place?**

That is the feature around which the entire product should be designed.

----

# Human Comment

9/3/2026

I'm still unsure what I want this to be. I like the idea of PF7 curriculum but Chess King is already pretty good with the Training area. I don't want to repeat that. Maybe curriculum could be the PF7 program and how to use it, but we integrate the puzzles and training into the current training area. That's already quite good na dhave many examples. how can we integrate PF7 better into what's already there, without overdoing and making the UI busy/cluttered?

I also reallty like the existing Live Mode > Engine > Best Move. I like Think Like a GM too, but that's a bit cluttered and tough to read. Best Move engine, though, is great.

what about puzzles that say you have a couple options. which option do you take? which is stronger? use stockfish engine to determine the strongest piece to take. and explain why briefly.

add open router to options for AI. though I'm not sure yet how is use AI in this context. stockfish might suffice by providing the best options. I want to lean the highest rated option. what move should I make. 

how about puzzles where you made a blunder and need to recover. what options do you have? stockfish provides best recovery rating on moves.

Im a musician and learn from repetitive actions. I want the same in chess. maybe like a Wheres Waldo thing. find the knight fork. find the hidden queen take. find the (something). 

rather than trying to build something else, king chess is good. I want to build within that more. I want to take advantage of what's already there. there are some good things. but I also need a place for the curriculum and then find ways to integrate pf7 into the current existing Chess King. 

I want to look at learning and puzzles and everything else in a new way. take the best of other things and make it this. PF7 is the outcome. King Chess is the current engine. how can we push the limits of king chess and me as a player. 

can king chess and pf7 learn from me as well. like what I always get wrong so that it can hammer me on those issues until I get them right? how about the ensuring that I follow the pf7 curriculum needs and don't immediately jump into something more advanced than I'm ready (lock/unlock mechanism?). you succeeded with x, let's add y now. you aren't ready for z yet. 



----

# 74. Response to the 9/3 Human Comment — the integration thesis

> Written 9/4/2026, in answer to the Human Comment above and to
> `TIER-0-PROTOCOL-PLAN.md`. Sections 74–88 supersede §72's phase list wherever
> the two disagree: §72 was written for a from-scratch app, and this app is a
> Chess King fork with a working curriculum already in it.

## 74.1 What Chess King already does well, and must keep doing

Three things in the upstream app are better than anything PF7 would build to
replace them, and they are load-bearing for this plan:

1. **Live Mode → Engine → Best Move.** Compact, instant, engine-truthful, and it
   draws the arrow. It is the single most-used surface in the app.
2. **The Training panel** (`training-panel.jsx` → puzzle quizzes + opening
   tutorials). Good content, good pacing, already written.
3. **Post-game analysis** (`analyzer.js` → `game-report-dialog.jsx` →
   `blunder-review-mode.jsx`). Real Stockfish classification of every move in a
   finished game.

**Think Like a GM is the exception.** The feature is right; the presentation is
wrong. It emits a wall of markdown (`buildGMMarkdownFromEngine` /
`buildGMMarkdownFromAI` in `use-engine-coach.js`) that is hard to read in a side
panel and impossible to read mid-game. §77.3 replaces the *presentation* and
keeps the *computation*.

## 74.2 What PF7 adds that Chess King cannot

Chess King answers **"what is the best move here?"** It never answers **"why
should I have looked there?"** — and it has no memory of the learner.
Concretely, upstream has no scheduler, no readiness model, no error attribution,
and `progress.js` records `solved: true` and nothing else. The curriculum
(`curriculum.js`, `srs.js`, `session.js`, `pf-error-log.js`) is the part of this
repo with no upstream equivalent, and it is the part worth defending.

## 74.3 The thesis: PF7 is the spine, not a fourth app

The mistake to avoid is building a fourth surface. The app already has three —
Live Mode, Training, and Study/Curriculum — and a fourth would guarantee exactly
the clutter the Human Comment is worried about.

> **One protocol, three surfaces.** Every surface either *asks a PF7 question
> before it answers one*, or *reports back which PF step failed*. Nothing new
> appears at the top level; each existing surface gains one PF7 seam.

| Surface | Owns | PF7 seam |
|---|---|---|
| **Live Mode** | Playing, and engine truth on demand | **Commit Gate** (§77) — predict before reveal; logs a PF-tagged event |
| **Training** | Browsing content by choice | **"Drill this in Study"** — one affordance, hands a position to the scheduler |
| **Study / Curriculum** | Deciding what you practise today | Everything else: the queue, the bands, the personal deck |

The division of labour is *who chooses the position*. Training is where **you**
choose; Study is where the **scheduler** chooses. That is a real difference, so
neither duplicates the other, and neither has to be rewritten.

> GPT Comment: I agree with the updated integration thesis: PF7 is strongest as
> a shared questioning, tagging, and scheduling layer inside the good Chess King
> workflows, not as another destination. One naming issue remains: the text says
> "three surfaces" but the UI has Live, Training, Study, and Curriculum. Give
> Study and Curriculum separate one-sentence jobs (for example, "today's queue"
> versus "map, instruction, and progress") or combine them visibly; otherwise
> the architecture is clear internally while still feeling duplicated to the
> learner.

## 74.4 Anti-clutter constraints (hard rules)

Requirements, not preferences. Anything violating one is rejected regardless of
pedagogical merit.

- **No new top-level buttons.** The control bar is frozen at: Opponent,
  Difficulty, Live/Training, New Game, Save/Load, **Study**, **Curriculum**.
- **One number on the outside.** The due badge on Study is the only counter
  visible from the main screen. No streaks, no XP, no percentages in the chrome.
- **No new board.** Every drill uses the existing training-board protocol
  (`onBoardUpdate` / `onRegisterMoveHandler`).
- **New drills are new `type` values, not new modes.** A drill is a `type` on a
  position plus one entry in `DRILL_COMPONENTS` (`study-mode.jsx`). That is the
  entire extension mechanism and it already works six ways.
- **Every in-game addition is one inline strip, collapsed by default, one click
  to bypass.** The Commit Gate is a strip above the engine card, not a modal.
- **Offline and key-free is the default path.** Nothing in this plan requires an
  API key. See §84.

---

# 75. The learning science this is built on

The relevant literature is education and motor-learning research, not chess
literature. Where a finding was established outside chess, this document says so
and names the analogy rather than pretending the transfer is proven.

## 75.1 How the brain actually stores chess

Chess expertise is **recognition**, not search. Chase & Simon (1973) showed that
the master's advantage over the novice in reconstructing a position vanishes for
random positions — what the master holds is not board memory but a large store
of meaningful *chunks*, extended by Gobet & Simon's template theory into larger
schematic units with slots. Charness et al. (2005) found that serious, effortful
*study* of positions predicts chess rating substantially better than hours
played.

> GPT Comment: This section is cognitive psychology and expertise research, not
> neurology, and "recognition, not search" is too absolute. The stronger account
> is that domain-specific recognition guides selective search; complex positions
> can still produce meaningful skill differences in search depth and breadth.
> Rephrase the heading and first sentence accordingly. This matters because PF6
> should not be deprioritized on a false recognition-versus-calculation choice.
> See [Campitelli & Gobet's chess-search study](https://dspace.brunel.ac.uk/bitstream/2438/825/1/Gobet_Search_ICGA.pdf).

Three consequences shape every decision below:

1. **Volume of recognition reps beats depth of calculation at this level.** A
   sub-1000 player's bottleneck is not calculating three moves deep; it is
   noticing the bishop is loose. Reps-per-minute is therefore a first-class
   design metric (§79).
2. **Retrieval strength is separate from storage strength, and it is what fails
   over the board.** "I knew that pattern, I just didn't see it" is a retrieval
   failure. The fix is to file patterns under the *cue* that should surface
   them — exactly what indexing the curriculum by PF step does
   (`LEARNING-SYSTEM.md` §0).
3. **Automaticity has a latency signature.** A pattern recognised in 1.5s and
   one recognised in 12s are not the same knowledge, and accuracy alone cannot
   tell them apart. Drills must therefore measure time, not only correctness
   (§79.3).

## 75.2 The mechanisms to implement

| Mechanism | Evidence base | Where it lands here |
|---|---|---|
| **Retrieval practice** — recall beats re-reading | Roediger & Karpicke 2006; Karpicke & Roediger 2008 | Every drill demands an answer before showing one. The Commit Gate extends this to Live Mode (§77) |
| **Spacing with expanding intervals** | Cepeda et al. 2006 (meta-analysis) | Already built: FSRS-6 in `srs.js` |
| **Generation / prediction before feedback** | Generation effect; prediction-error literature | Commit Gate (§77): Best Move does not reveal until you commit |
| **Self-explanation / elaborative interrogation** | Chi et al.; Pressley et al. | Reason chips: you pick *why*, not only *what* (§77.1, §78.4) |
| **Worked example → completion → full problem** | Sweller, cognitive load theory | The five-rung ladder per PF step (§80.1) |
| **Expertise reversal — fade the scaffold** | Kalyuga et al. | Scaffold stage driven by card stability (§80.3); already a stated principle in §7.4 |
| **Interleaving / contextual interference** | Rohrer & Taylor 2007; Shea & Morgan 1979 (motor) | Unlabelled and mixed-motif rungs; near-miss positions (§75.4, §78.3) |
| **Learning from errors, with immediate correction** | Metcalfe 2017 | Personal deck: the position you blundered in comes back with your own move as a candidate (§82.2) |
| **Implementation intentions (if–then cue pairing)** | Gollwitzer 1999 | PF7 taught as cue→question pairs, not a list to recite (§80.2) |
| **Transfer-appropriate processing** | Morris, Bransford & Franks 1977 | The last rung of every ladder is an *unlabelled* position, ideally from your own games (§75.4, §82) |
| **~85% success is the optimal training difficulty** | Wilson et al. 2019 | The adaptive rating band (§81.3) |
| **Deliberate practice: just beyond reach, immediate feedback, corrected repetition** | Ericsson et al. 1993 | The band plus the stretch rep (§81.4) |
| **Short, daily, sleep-spaced sessions** | Consolidation literature; spacing | Already built: `buildSession({ minutes })`, 20/40/60 models |

> GPT Comment: The mechanism list is directionally strong, especially retrieval,
> spacing, worked examples, fading, and later unlabelled discrimination. Add an
> "evidence status" column: direct chess evidence, robust general-learning
> evidence, cross-domain analogy, or PF7 product hypothesis. At present the table
> visually gives all rows equal certainty even though several implementation
> choices (reason chips, a five-rung sequence, fixed daily duration, and the
> stretch-rep policy) have not been tested for chess learning.

## 75.3 The 85% rule — difficulty calibration

Wilson et al. (2019) derive, for a broad class of learning systems, that the
training accuracy maximising rate of learning is about **85%** — not 100% (no
information) and not 50% (mostly noise). This is the most directly actionable
number in the literature for this app, because the imported Lichess positions
**already carry a `rating` field** (`curriculum-positions.js` →
`IMPORTED_POSITIONS`) — difficulty is a dial we already have and currently
ignore.

Implement it as a per-PF-step staircase rather than one global number (§81.3): a
learner can be solid on forks and hopeless on pins, and a single number averages
that away.

> GPT Comment: Do not present 85% as a human-learning law. Wilson et al. derive
> it for binary classification under particular learning models and demonstrate
> it in artificial and biologically plausible neural networks, not chess
> learners. It is a sensible starting target to test, not a validated mastery
> threshold. Lichess puzzle rating is also a noisy population difficulty measure,
> not a per-PF-step scale. Instrument outcomes and compare bands before making
> 85% normative. See the [original paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC6831579/).

## 75.4 Desirable difficulty: why labelled puzzles under-train

This is the sharpest critique of *all* puzzle training, this repo's current
drills included, and it is worth stating plainly:

> **If the screen says "Knight fork", you no longer have to notice it is a
> knight fork.** The hardest and most game-relevant half of the skill —
> discrimination — has been done for you.

Bjork's desirable-difficulties framing and Rohrer & Taylor's interleaving
results point the same way: blocked, labelled practice produces better
in-session performance and worse retention and transfer. Chess-specifically,
over the board nothing is labelled, no one tells you a tactic exists, and about
half of what matters is the opponent's tactic rather than yours.

Three corrections, all cheap:

1. **Unlabelled rungs.** Late positions within an item show "White to move" and
   nothing else. `study-mode.jsx` currently renders the PF step badge and item
   title above every board; that badge is precisely what to withhold at rung 5.
2. **Near-miss positions.** The pattern is on the board and does **not** work.
   `LEARNING-SYSTEM.md` allocates 1 in 6 to this; it should be nearer 1 in 4,
   and it needs its own drill type so "no, and here is why" is a gradeable
   answer (§78.3).
3. **Opponent-side reps.** 2 of every 6 positions should be *the opponent*
   threatening the motif (PF2 recognition). Already specified in
   `LEARNING-SYSTEM.md`; not yet enforced by the importer or by any test.

> GPT Comment: I agree with introducing unlabelled, opponent-side, and near-miss
> positions, but the proposed ratios are design hypotheses. Interleaving is most
> useful when learners must discriminate similar categories, and its effect is
> moderated by the material; initial blocked and labelled examples can still be
> useful for acquisition. The five-rung ladder later in this document already
> gives the right sequence. Test 1-in-6 versus 1-in-4 rather than declaring the
> latter research-derived. See the [interleaving meta-analysis](https://pubmed.ncbi.nlm.nih.gov/31556629/).

## 75.5 The musician's model

The Human Comment's instinct — "I'm a musician and learn from repetitive
actions" — maps onto the motor-learning literature almost exactly, and gives the
app a vocabulary worth using in the UI:

| Music | Chess | Built as |
|---|---|---|
| **Scales** — daily, fast, unmusical, non-negotiable | Blunder-check and scan reps | The warm-up floor (§82.5); scan drills (§79) |
| **Études** — one difficulty isolated, slowly, correctly | One PF step drilled alone | Step drills (§80.1) |
| **Repertoire** — the whole piece, in tempo, no stopping | A full protocol walkthrough; a game | Protocol rehearsal, play-outs |
| **Slow practice then speed** | Untimed reps → timed reps | Scan drill timing bands (§79.3) |
| **Random-order practice beats blocked for retention** | Interleaved motif sets | §75.4 |

The one place the analogy misleads: a musician can drill a passage in isolation
because the passage recurs identically. Chess positions never recur identically,
so the target of repetition must be the **question**, not the position. That is
the whole reason the curriculum is indexed by PF step rather than by motif
chapter.

## 75.6 What the research does not support

Stated so the plan does not drift into folk pedagogy:

- **"Learning styles" are not supported.** Being a musician does not mean a
  kinesthetic presentation works better; what transfers is the *practice
  structure* above, not a modality.
- **Time-on-task is not the mechanism.** Long sessions do not beat short spaced
  ones, and streak-chasing is a motivation feature, not a learning feature.
- **Massed puzzle rushes feel productive and largely are not.** Gains from
  puzzle-storm are mostly within-format.
- **The claim "PF7 beats standard play" remains untested.** See
  `docs/ai-notes.md` §2. Nothing in the UI should imply otherwise.

---

# 76. The sub-1000 diagnosis, and the priority it forces

At sub-1000, essentially no game is decided by opening theory, plan quality, or
depth of calculation. Games are decided by **material handed over in a single
move**, by either side. The app can confirm this per learner rather than assume
it: `analyzer.js` already classifies every move of every saved game, and
`pf-error-log.js` already attributes each error to a PF step.

That produces a strict priority order, and the queue must **enforce** it rather
than merely offer it:

| Priority | Step | Drill | Why here |
|---|---|---|---|
| 1 | **PF7 VERIFY** | Blunder-check reps | Directly removes the loss mechanism. Cheapest reps in the app, and content is already derived free from the import |
| 2 | **PF2 SAFETY** | Scan / sweep drills | The other half of the same loss: what *they* can take |
| 3 | **PF3 FORCE** | Tactical recognition, unlabelled | Where the wins come from once you stop losing |
| 4 | **PF6 CALCULATE** | Compare drills | Choosing correctly *between* forcing moves |
| 5 | PF1 / PF4 / PF4.5 / PF5 | Step drills, structures | Real, but not decisive below roughly 1400 |

**Concrete rule:** every session opens with a fixed floor of priority-1 and -2
reps regardless of what is due (§82.5), and the queue's targeted slot
(`targetedEntries` in `session.js`) falls back to this order while the error log
is still thin — which for a new learner it always is.

**The first target to hit is not a rating:** halve blunders per 100 moves.
Rating is a lagging, noisy indicator; blunder rate is the leading one, and the
app can already compute it (§86).

> GPT Comment: Make this priority order the cold-start prior, not a permanent
> rule inferred from rating alone. "Essentially no game" and "not decisive below
> roughly 1400" are stronger claims than the cited research supports, and rating
> pools plus time controls are not interchangeable. The better PF7 idea is
> empirical personalization: start PF7/PF2-heavy, then let the learner's own
> game reports change the weights. Keep "halve blunders per 100 moves" as a
> motivating target, but establish an individual baseline before promising a
> 50% reduction.

---

# 77. Integration point 1 — the Commit Gate in Live Mode

**This is the highest-value change in the whole plan and one of the smallest.**
It upgrades the feature the Human Comment singles out as the best in the app
(Live Mode → Engine → Best Move) without moving it, renaming it, or adding a
screen.

## 77.1 Interaction

Today `handleEngineBestMove` (`use-engine-coach.js`) runs
`sf.analyze(fen, 15, 1)` and immediately renders a best-move card plus arrows.
The learner gets the answer without ever having produced one, which forfeits the
generation effect, the prediction-error signal, and any chance of attributing
the miss to a PF step.

The gate inserts one step:

```
[ Your move first ]                                    (skip ▸)
Play a move on the board, or type SAN.
Why?   PF2 safe?   PF3 force   PF4 break   PF5 worst piece   PF6 calc
```

1. Click **Best Move** (or **Analyze**). A one-line strip appears above the
   card. Stockfish starts searching *immediately and in the background* — the
   gate costs no latency, it spends the latency that was already there.
2. The learner commits: drag a move on the board (the board is already there),
   or click a suggested-move chip, and optionally tap one reason chip.
3. Reveal. The card that appears is the existing best-move card **plus one
   line**:

```
You played Nxd5 · −0.9   (2nd of 3)
Best      Bxf7+ · +2.1   Nxd5 gives back the pin; Bxf7+ wins the piece outright.
```

4. **Skip is always one click**, and the gate is a single toggle in settings
   ("Coached reveal", default on). It never blocks the answer, it only asks
   first.

> GPT Comment: I agree this is the highest-value integration experiment, with
> one implementation caveat: selecting a candidate on the live board must not
> accidentally commit the game move or let the opponent respond before the
> comparison is rendered. Snapshot the queried FEN and use a clearly reversible
> "ghost candidate" interaction, or define the feature explicitly as after-move
> review. Measure skip rate, query completion, and added seconds per interaction
> before making the gate default-on everywhere.

## 77.2 Why this is the highest-value change

One interaction delivers five of the mechanisms in §75.2 at once — generation,
prediction-before-feedback, immediate corrective feedback, self-explanation, and
error attribution — on **the surface the learner already uses most**, in a live
position they actually care about. That is the definition of
transfer-appropriate practice (§75.4): a real game, nothing labelled, no one
telling you a tactic exists.

It also fixes the deepest structural gap in the app: **every drill event today
comes from curated content, and none from the learner's live play.** The gate
produces one PF-tagged, engine-scored, self-explained event per query, in the
context where it matters, for free.

## 77.3 The PF7 Readout — replacing the Think Like a GM wall

The Human Comment: *"I like Think Like a GM too, but that's a bit cluttered and
tough to read."* Correct diagnosis. Keep the computation
(`sf.analyze(fen, 18, 3)`), replace the presentation.

**PF7 Readout** is one card, eight lines, one clause each, all engine- or
detector-derived — **no LLM required**:

```
PF1 changed    ...Nf3 attacks your queen and eyes d2
PF2 safety     your Bb5 is loose (attacked by a6, undefended)
PF3 force      checks: Bxf7+ · captures: Nxd5, Bxc6 · threats: Qa4
PF4 break      c4 would open the c-file
PF4.5 prevent  they want ...Nd4 and ...c5
PF5 worst      your Ra1 (no open file, no target)
PF6 calculate  Bxf7+ (+2.1) · Nxd5 (−0.9) · Qa4 (+0.4)
PF7 verify     after Bxf7+ nothing of yours hangs
```

Three notes:

- **Most of these lines already exist.** `intelligence.js` has
  `buildThreatCard` and `buildMyMoveCard`; `pf-error-log.js` has a working
  loose-material detector (`looseMaterial`). PF3 and PF6 come straight out of
  MultiPV. Only PF4, PF4.5 and PF5 need new detectors, and they are allowed to
  print "nothing obvious" — an honest blank beats a guess.
- **It is the same eight questions the curriculum is indexed by.** Reading it
  during a game *is* protocol rehearsal, so Live Mode reinforces Study at zero
  extra content cost.
- **Ship it beside Think Like a GM, not instead of it, for one release.** GM
  view stays behind its existing button for when the learner wants prose. If the
  readout wins, the GM path becomes a "more detail" expander inside it.

## 77.4 What the gate logs

Each committed prediction appends one event (new store, `srs-db.js` v3):

```js
{ ts, fen, playedUci, bestUci, cpLoss, rank, reasonChip, pfStep, source: "commit-gate" }
```

- `pfStep` comes from `classifyFailureStep()` — the *same* classifier the game
  report uses, so live play and post-game analysis never disagree.
- `cpLoss` and `rank` come from Stockfish MultiPV. Nothing here is an opinion.
- Events feed the error tally (`mergeIntoTally`), which reorders tomorrow's
  queue. **The loop closes during play, not only after it.**
- When `cpLoss` crosses the blunder threshold, the position is offered to the
  personal deck (§82.2) with one tap.

---

# 78. Integration point 2 — Candidate Ladder drills (`type: "compare"`)

The Human Comment asks for three new puzzle kinds:

> *"puzzles that say you have a couple options. which option do you take? which
> is stronger? … puzzles where you made a blunder and need to recover … stockfish
> provides best recovery rating on moves."*

All three are **the same interaction**: N candidate moves, Stockfish scores
them, you choose, then you say why. Build **one** drill component with three
generators — not three modes.

Position shape:

```js
{
  type: "compare", id, pfStep, fen, orientation,
  prompt,                     // "Two captures. Which one?"
  candidates: [               // engine-certified at build time (§83.2)
    { uci, san, cp, verdict, why }   // verdict from the shared module
  ],
  reasons: [                  // second question: why the runner-up fails
    { id, label, correct }
  ],
  variant: "stronger" | "recovery" | "nearmiss",
  source: "generated" | "authored" | "personal",
}
```

## 78.1 "Which is stronger?" — the two-captures drill

Two or three legal, *plausible* moves are offered — typically two captures of
the same-looking material, or a check versus a capture. The learner picks. The
reveal shows all candidates with their centipawn scores and a one-clause reason
for each.

The pedagogical point is precise, and it is what makes this better than a
standard puzzle: at sub-1000 the failure is rarely "I saw no capture", it is
**"I took with the wrong piece"** or **"I took the wrong thing."** A one-answer
puzzle never trains that discrimination; a forced choice between two attractive
moves trains exactly it (§75.4).

## 78.2 Recovery drills — "you blundered, now what?"

Position starts at roughly −2 to −4 for the learner. The question is not "win"
but **"what is the best available?"**

**Grading must be relative, and this matters more than it sounds.** Grading a
recovery drill on absolute evaluation is both wrong and demoralising: every
answer looks like a loss. Grade on *centipawn loss versus the best available
move*, using the same thresholds as everywhere else (§83.1). A move that holds
−2.1 in a −2.3 position is a **correct** answer and should be marked correct,
loudly.

Two content sources, and the second is the good one:

- **Generated** — take any imported position and hand the learner the side that
  is losing after a plausible error.
- **Personal** — positions from the learner's own saved games where
  `analyzer.js` flagged a Mistake or Blunder. The move you actually played
  appears as one of the candidates. This is §82.2, and it is the most valuable
  content in the app because it is the only content that is *about you*.

## 78.3 Near-miss drills — the pattern that does not work

The motif is on the board; the tactic fails (defended, an in-between check, a
back-rank problem). Correct answer is either "no tactic here — play X" or "the
fork loses to the intermediate check."

`LEARNING-SYSTEM.md` allocates 1 in 6 positions per Tier-1 item to this and the
importer does not enforce it. Raise it to roughly **1 in 4** and enforce it in
the importer plus a test, because this rung is where discrimination is actually
built. Without near-misses, an item teaches "the fork works" rather than "look
for the fork."

## 78.4 Grading: Stockfish owns the verdict, the learner owns the reason

Two graded questions per position, in this order:

1. **The move.** Objective, from precomputed centipawn scores. Verdict
   thresholds come from the single shared module (§83.1), so a compare drill and
   a game report call the same loss "a Mistake."
2. **The reason.** Multiple choice, one correct, distractors hand-authored or
   derived (e.g. the runner-up's actual refutation line). This is the
   self-explanation mechanism (§75.2), and it is what turns "I guessed right"
   into knowledge. **Getting the move right and the reason wrong grades as
   `hard`, not `good`,** which is the honest signal to give FSRS.

> GPT Comment: Keep move accuracy and explanation accuracy as two learning
> traces. A Stockfish line can establish that a move loses value, but it does not
> always establish one uniquely correct human explanation; several reason chips
> may be defensible. Do not automatically downgrade the move's FSRS grade because
> an authored rationale was missed. Schedule the concept/reason card sooner while
> preserving the objective move grade, then validate whether explanation choice
> predicts later transfer.

## 78.5 Content generation

Almost free, from data already in the repo:

- Every entry in `LICHESS_POSITIONS` has a `solution`; ply 0 gives the correct
  candidate.
- Distractor candidates: legal captures and checks in the same position, scored
  by Stockfish at import time (§83.2), keeping those that are plausible
  (material-equal-looking) but measurably worse.
- Reason distractors start hand-authored per motif — roughly 40 strings, one set
  per Tier-1 family, not per position — and are reused across positions of the
  same motif.

---

# 79. Integration point 3 — Scan drills (`type: "scan"` / `"sweep"`)

> *"maybe like a Wheres Waldo thing. find the knight fork. find the hidden queen
> take. find the (something)."*

This is the right instinct and the most under-served drill format in the app.
It is also the one with the highest reps-per-minute, which by §75.1 makes it the
most valuable format at sub-1000.

## 79.1 Interaction

**You do not move a piece. You click a square.**

| Variant | Prompt | Answer |
|---|---|---|
| `scan` | "Click the piece of yours that can be won." | one square |
| `scan` | "Click the square where you have a knight fork." | one square |
| `scan` | "Click the piece that is doing all the defending." | one square |
| `sweep` | "Click **every** piece of yours the opponent can win material from." | N squares, scored on completeness |
| `sweep` | "Click every square you can give check from." | N squares |

Three to eight seconds each. **Twenty per set.** No drag, no promotion dialog,
no engine reply, no waiting — one board update and one click. That is roughly
5–8× the rep rate of a puzzle, and it is the format that trains perceptual
chunking directly.

`sweep` is the more important of the two: it trains the *board sweep* that PF2
and PF7 actually require, and partial credit ("4 of 5 — you missed the knight on
g4") is precisely the corrective feedback the literature asks for.

## 79.2 Content generation is nearly unbounded

**This is the reason to build it.** Content authoring is the dominant cost in the
whole curriculum (`LEARNING-SYSTEM.md` §3), and scan drills escape it:

- `looseMaterial()` in `pf-error-log.js` already computes "every piece of yours
  worth more than its cheapest attacker" for *any* FEN. That is a complete
  `sweep` answer key, computed from the board, for free.
- `chess.js` supplies every legal check and capture — the answer keys for the
  check-and-capture sweeps.
- Knight-fork targets are enumerable directly: for each empty square a knight
  could reach, does a knight there attack two pieces of value?
- Every FEN in the repo, plus every position from every saved game, is eligible.
  **Thousands of reps with no authoring at all.**

Each generated target is Stockfish-verified at build time (§83.2) so a
detector's false positive never ships as a drill.

## 79.3 Timing, latency, and automaticity

Scan drills are the app's only measure of **retrieval speed**, which by §75.1 is
a distinct dimension from accuracy and the one that decides whether a pattern
fires over the board.

- Record `ms` per rep. Report median per PF step, not per position.
- **Grade on the pair, not on correctness alone.** Feed FSRS:
  `correct && fast → easy`, `correct && slow → good`, `correct && very slow →
  hard`, `wrong → again`. This is a well-supported use of response time as a
  proxy for retrieval strength, and it stops "eventually got there" from looking
  like mastery.
- **Slow practice before speed** (§75.5): a new pattern is drilled untimed; the
  timer appears only once the card graduates to review. Never time a pattern
  the learner has not yet learned — that trains guessing.
- Per-step latency targets are learner-relative: the goal is *your* median
  falling, not hitting an absolute number.

> GPT Comment: Recording within-learner latency is valuable; mapping it directly
> to FSRS `easy/good/hard` is not yet justified. Response time also contains
> reading, pointing, device, animation, distraction, and speed-accuracy tradeoff,
> and accuracy and latency can reflect different processes. Keep latency as a
> secondary metric at first, exclude UI time where possible, and only let it
> affect scheduling after app data shows that it predicts future unprompted
> accuracy. See [MacLeod & Nelson](https://www.sciencedirect.com/science/article/pii/0001691884900325).

---

# 80. Integration point 4 — the Curriculum menu: explain, then quiz, then combine

> *"We likely or might still need a separate Curriculum menu but with better
> explaining and quizzing the steps (see TIER-0-PROTOCOL-PLAN.md, which can be
> expanded upon)."*

Keep the Curriculum menu. It answers "how far in am I?" — the thing a bounded
curriculum exists to answer — and nothing else can. `TIER-0-PROTOCOL-PLAN.md` is
the right shape and its instinct (worked example → isolated reps → combine) is
straight out of cognitive load theory. What follows expands it.

## 80.1 The five-rung ladder per PF step

The plan as written jumps from worked example to multiple-choice quiz to the
combined walkthrough. Cognitive load theory puts a rung between the first two
and the interleaving literature puts one after the last:

| Rung | Format | Cognitive-load role |
|---|---|---|
| 1 | **Worked example** — the step, fully answered on a real position | Worked-example effect: novices learn more from studying a solution than from attempting a problem |
| 2 | **Completion problem** — six of eight steps filled in, you supply the missing one | The missing middle. Bridges example to problem without the full load of either |
| 3 | **Full problem** — the step alone, on a fresh position, multiple choice (`stepdrill` as planned) | Retrieval practice |
| 4 | **Speeded rep** — the same question, timed, many positions (`scan` / `blundercheck`) | Automaticity (§79.3) |
| 5 | **Interleaved / unlabelled** — the step is not named; you have to notice which question applies | Transfer. This is the rung the app is missing entirely today |

Rung 5 is where the combined eight-step walkthrough belongs, and rung 5 is what
the game itself is. Reaching it is the point.

## 80.2 Quiz the cue, not only the answer

The single most useful addition to the Tier-0 plan. PF7 is not knowledge to
recite; it is a set of **if–then cue→action pairs** (Gollwitzer's implementation
intentions), and it should be quizzed in the direction it is used:

- **Forward (weak, what the plan has today):** "What does PF2 ask?" → recite.
- **Backward (strong, add this):** *here is a position and the move someone
  played; which step would have caught this?* → answer PF7.
- **Cue-first (strongest):** *the opponent just moved.* Which question do you
  ask first? → PF1.

The backward direction is generatable for free — `classifyFailureStep()` already
produces the answer key for any tagged error, including the learner's own. It
also delivers exactly what the Human Comment asks for, since the positions can
be *your own blunders*: "which step would have caught this?" about your own game
is the most memorable quiz item the app can construct.

## 80.3 Fade the scaffold on a schedule

§7.4 states assistance fades; here is the mechanism, driven off the PF-PROTOCOL
card's stability so it is automatic rather than a setting:

| Stage | Trigger | What is shown |
|---|---|---|
| 1 | new card | All eight steps, each with its question and a filled-in answer |
| 2 | learning | All eight step names; you answer each |
| 3 | review, stability < 7d | Step names hidden; a prompt asks which steps you used |
| 4 | stability ≥ 21d | Nothing. Find the move; the protocol is checked only if you miss |

Kalyuga's expertise-reversal effect is the reason this must fade rather than
persist: guidance that helps a novice actively harms a learner who has
internalised the procedure, because they now have to reconcile the scaffold with
their own routine.

> GPT Comment: Fade scaffolding, but do not use FSRS stability at fixed 7/21-day
> cutoffs as a proxy for procedural fluency. Stability estimates recall of a
> card, while the target is successful use of PF7 in fresh, unlabelled positions.
> Advance or restore scaffolding from demonstrated performance on those transfer
> items, with the calendar thresholds only as defaults. Expertise reversal is an
> aptitude-treatment interaction, not evidence for these specific time cutoffs.

## 80.4 Concretely, relative to TIER-0-PROTOCOL-PLAN.md

Keep everything in that plan. It stays one curriculum item; **99 remains 99**
and `curriculum.test.js`'s `EXPECTED_TOTAL` does not move. Additions:

- `type: "completion"` for rung 2 — same component as `protocol`, with
  `stepAnswers` present for all steps but one.
- `type: "cue"` for §80.2 — same component as `stepdrill`, answer set is the
  eight steps.
- `type: "scan"` / `"sweep"` for rung 4 (§79).
- The scaffold stage in §80.3 replaces the plan's implicit "worked example
  resurfaces on rotation" behaviour with something deliberate.
- Its §2 defers PF2 for lack of a dedicated drill. **`sweep` is that drill** —
  "click every piece of yours they can win" is PF2 SAFETY in one click, with a
  free answer key. Build it and PF2 stops being the thin step.

---

# 81. Readiness — locks, bands, and the stretch rep

> *"how about ensuring that I follow the pf7 curriculum needs and don't
> immediately jump into something more advanced than I'm ready (lock/unlock
> mechanism?). you succeeded with x, let's add y now. you aren't ready for z
> yet."*

The mechanism exists (`prereqs` in `curriculum.js`, `getLearnedIds` /
`getStudyableItems` in `session.js`). What is missing is that it is **invisible,
binary, and silent**.

## 81.1 Locks apply to the queue, never to play

Non-negotiable. Locks decide what the *scheduler* offers. They never prevent
playing a game, opening the Training panel, or drilling any item by hand from the
dashboard (already supported via `studyItemIds`). A curriculum that refuses to
show you something is a cage, and it will be resented within a week.

## 81.2 Make the key visible

A lock only motivates if the key is visible. Every locked item in
`curriculum-dashboard.jsx` shows one sentence naming what unlocks it and the
distance:

```
T-15 Deflection            🔒  Unlocks after T-06 Absolute pin graduates (2 of 3 reps)
E-10 Lucena                🔒  Unlocks after E-02 K+R vs K · due in 2 days
```

And when something opens, the app says so in the language the Human Comment
used — one line at the top of the session, never a popup:

```
You cleared T-01 Knight fork. Adding T-05 Royal fork today.
Not yet: T-32 Windmill — it needs discovered attack first.
```

## 81.3 The adaptive rating band — the "gradually push limits" mechanism

Within an unlocked item, difficulty should be continuous rather than binary. The
imported positions carry `rating`; use it to hold success near 85% (§75.3).

- Store `targetRating` **per PF step** (not global) in `srs-db.js`.
- Move it on a **1-up / 2-down staircase**: correct → `+15`; miss → `−30`. This
  classic psychophysical rule converges to roughly 80–85% accuracy without any
  model fitting, and it is four lines of code.
- `selectPositions()` (`session.js`) picks from `[target − 100, target + 100]`
  before falling back to its current rotation. Positions without a `rating`
  (authored, endgame, tabiya) are exempt and always eligible.
- Show it plainly in the dashboard: "Forks: solving around 1150. Pins: around
  850." That is the most honest picture of skill the app can give, and it is far
  more useful than a single number.

> GPT Comment: The staircase math is incorrect. With `+15` after a correct answer
> and `-30` after a miss, zero expected movement occurs at 66.7% correct
> (`15p - 30(1-p) = 0`), not 80–85%. A classic transformed staircase reaches a
> target through a rule such as multiple consecutive correct responses before
> increasing difficulty, not these per-answer deltas. Specify and simulate the
> controller before implementation. Also label the dashboard value "puzzle
> difficulty" rather than implying that a motif-specific estimate is the
> learner's chess rating.

## 81.4 The stretch rep — the "then push beyond" mechanism

Holding 85% forever is a plateau. **One position in eight is drawn deliberately
above band** (roughly +200 rating), badged `Stretch`, and:

- **A missed stretch rep does not lower the band and does not grade the card
  `again`.** It is scored separately. Otherwise the staircase punishes the
  learner for the app's own choice, and the band ratchets down.
- A *solved* stretch rep bumps the band by a full step. This is how the ceiling
  actually rises.
- Framing in the UI is explicit — "this one is above your level, have a go" —
  because expected failure that is labelled as such is motivating, and expected
  failure that is unlabelled is discouraging.

## 81.5 What "you are not ready for Z" is allowed to mean

Only ever: *"Z depends on Y, and Y is not learned yet."* Never a judgement about
the learner, and never a refusal to show something on request. Every lock traces
to a `prereqs` edge in `curriculum.js`, so the reason is always nameable — and
if a lock cannot be explained in one sentence, the edge is wrong and should be
deleted.

---

# 82. The closed loop — your own mistakes become the curriculum

> *"can king chess and pf7 learn from me as well. like what I always get wrong so
> that it can hammer me on those issues until I get them right?"*

This is the feature no commercial product will build for one person, and this
repo is closer to it than to anything else in this document.

## 82.1 What already works

`analyzer.js` classifies every move of a finished game → `tagErrors()` attributes
each error to a PF step → `mergeIntoTally()` accumulates weights in IndexedDB →
`targetedEntries()` in `session.js` promotes items on the weakest step. The loop
runs today.

Its limits: it remembers **steps**, not **positions**; it never escalates; and
it has no way to stop hammering once you have fixed something.

## 82.2 The personal deck — position-level SRS

Add a `positions` store (`srs-db.js` v3) holding the actual positions the learner
got wrong, each with its own FSRS card:

- From the game report: every Mistake and Blunder on the learner's side.
- From the Commit Gate (§77.4): every prediction that lost material.
- From drills: any position missed twice.

Each comes back as a `compare` drill (§78.2) **with the learner's own move as one
of the candidates**, scheduled by the same FSRS scheduler as everything else. So
the position you lost a rook in on Tuesday returns Thursday, next week, and next
month — with the mistake shown next to the alternative.

Metcalfe (2017): errors help *when they are corrected promptly and the correct
answer is encoded*. This is that, mechanised. It is also the drill the learner is
most likely to actually do, because it is unmistakably about their own game.

Cap the deck (say 100 positions, oldest-mastered evicted) so it stays a deck and
not an archive.

> GPT Comment: Replaying a personal mistake is excellent for relevance and
> correction, but repeated recall of the exact FEN can become episodic
> memorization. After one or two exact-position reviews, schedule structurally
> similar examples and a near-miss from the same `(pfStep, motif)` cluster. The
> personal position should seed a family of discrimination reps, not be the whole
> intervention; that is more likely to transfer to a new game.

## 82.3 Recurrence escalation, and its retire condition

"Hammer me until I get it right" needs both halves specified, or it becomes
either toothless or inescapable.

**Escalate.** When the same `(pfStep, motif)` pair fails three times inside 14
days:

- Pin the corresponding curriculum item to the head of the queue.
- Double its share of the session budget.
- **Say it out loud, once:**
  `"Third time this week you took with the wrong piece. T-01 and the compare drills are pinned until you clear five in a row."`

**Retire.** The pin clears on **five consecutive correct at band** — and the app
says that too: `"Cleared. Unpinning T-01."` Without a stated exit the feature is
a punishment loop; with one it is a challenge, which is the difference between
motivating and grinding.

## 82.4 Filling the PF1 / PF4 / PF4.5 hole honestly

`pf-error-log.js` deliberately never assigns PF1, PF4 or PF4.5, and its reasoning
is right: those failures are not decidable from one position plus one engine
line, and a classifier that guessed would poison the queue it steers.

The fix is not a better classifier. It is to **ask**. The Commit Gate's reason
chips (§77.1) are learner-supplied step attribution, and for exactly the three
steps the engine cannot adjudicate they are the only available signal. Keep the
two sources separate in storage — `source: "classified"` versus `"self"` — and
weight self-reports lower, so a bad mood cannot rewrite the curriculum. But do
collect them: a learner who keeps tapping "PF4 break" and keeps being wrong has
told you something no engine line can.

## 82.5 The warm-up floor — the scales

Every session, regardless of what is due, opens with a fixed floor:

- **10 blunder-check reps** (PF7) — content already free from the import.
- **10 scan/sweep reps** (PF2) — content generated (§79.2).

Roughly five minutes, non-skippable in the sense that it is simply first in the
queue. This is the musician's scales (§75.5) and it is justified by §76: this is
the loss mechanism at sub-1000, and it should not have to compete with the
scheduler for attention. It is also the part of the session that is *always*
available offline, with no key and no content authoring.

`MINUTES_PER_POSITION` in `session.js` needs entries for `scan` (0.15),
`sweep` (0.4), `compare` (1), `completion` (1.5) and `cue` (0.4) for the budget
to stay honest.

> GPT Comment: Make the 20-rep warm-up a skippable, adaptive default rather than
> a fixed non-skippable floor. It otherwise overrides FSRS even when those skills
> are stable, consumes an entire short session, and may turn useful spacing into
> massed overpractice. A bounded range driven by recent live-game errors (for
> example, 3–10 per step) preserves the musician's warm-up idea without treating
> every learner and every day identically. The 3-in-14 escalation and 5-in-a-row
> retirement rules above should likewise be marked as tunable starting values.

---

# 83. Stockfish as the single source of truth

> *"Stockfish is also critical for how it rates or scores moves. I want that to
> dictate the best moves."*

§7.3 already states engine truth is authoritative. This section makes it
enforceable rather than aspirational, because right now three different places
decide what a "good move" is: `analyzer.js` (game reports), `chess-helpers.js`
(best-move and hint cards), and each drill component's own grading.

## 83.1 One verdict module

New `src/pf/verdict.js` — pure, no React, no I/O — is the only place in the app
that turns engine numbers into judgements:

```js
verdictFor(cpLoss)                  // Excellent | Good | Inaccuracy | Mistake | Blunder
isRealTactic(lines)                 // best vs 2nd-best gap > ~150cp
practicalLoss(cpBefore, cpAfter)    // recovery grading: loss vs best available (§78.2)
gradeFromEngine(cpLoss, ms)         // → FSRS again | hard | good | easy
candidateSpread(lines)              // ranked candidates for compare drills
```

Every consumer — `analyzer.js`, the Commit Gate, every drill, the PF7 Readout —
calls this. The invariant to hold: **the same move in the same position gets the
same verdict everywhere in the app.** Today a drill can call something correct
that the game report calls a Mistake, and that inconsistency is corrosive to
trust in exactly the component the learner must trust most.

Thresholds live in one frozen table with their rationale in a comment, and
`analyzer.js`'s existing numbers are the migration source so no verdict shifts
under the learner on upgrade.

## 83.2 Precomputed engine certificates

**The runtime cannot afford MultiPV at depth 18.** The build is
`stockfish-18-lite-single.js` — single-threaded WASM — and CLAUDE.md already
records that depth 12 in a middlegame can take tens of seconds there. A scan
drill needs 20 answers per minute. These are irreconcilable at runtime.

So: **every drill position ships with its engine verdict baked into the data
file**, produced at build time by the same kind of script as
`npm run verify:endgames`:

- `compare` positions store `cp` for every candidate.
- `scan` / `sweep` positions store the verified answer key.
- `blundercheck` positions store the safe/unsafe verdict.
- Each carries `{ depth, engineVersion, verifiedAt }` for provenance.

Consequences, all good: drills are instant, drills are deterministic (the same
position never grades differently twice), drills work fully offline, and the
expensive search happens once on a developer machine rather than a thousand
times on the learner's laptop.

Runtime Stockfish is then reserved for the three things that genuinely need a
live position: the Commit Gate, the play-out drills (endgame/structure), and
post-game analysis.

> GPT Comment: "Single source of truth" should mean the app's consistent
> adjudicator, not infallible ground truth. Stockfish's move and centipawn values
> are estimates conditional on engine version, options, search budget, and score
> perspective; tablebases and chess rules are stronger authorities where they
> apply. Certificates should record the full analysis contract (engine binary
> hash/version, depth or nodes, MultiPV, options, score perspective, and mate
> handling). Scan/sweep keys should be proven first by deterministic legal-board
> logic; an engine can reject tactically unsound targets but cannot by itself
> certify semantic labels such as "the piece doing all the defending."

## 83.3 The analysis budget contract

CLAUDE.md records the gotcha: `analyze()` has one `_pending` slot, so
overlapping requests orphan a promise forever, and a depth search has no
wall-clock bound. Make it a rule rather than a note:

- **Every interactive call passes both `timeoutMs` and `movetimeMs`.** No
  exceptions on any path that a board is waiting on.
- One helper in `src/pf/verdict.js` (or a sibling) owns the budget per use case
  — Commit Gate 600ms, play-out reply 400ms, post-game 10 depth — so budgets are
  tuned in one file.
- A lint rule or a test asserting no bare two-argument `analyze()` call outside
  `stockfish.js` would make this stick.

## 83.4 The drill gate

`npm run verify:endgames` is already a gate: no endgame position ships without
passing it. Generalise it to `npm run verify:drills`, covering compare, scan and
blundercheck content, and run it in CI. A generated drill with a wrong answer
key is worse than no drill at all — it teaches the wrong pattern *and* destroys
the learner's trust in the grader, which is the app's only real asset.

Related, and worth fixing while here: `.github/workflows/deploy.yml` runs
neither `npm run lint` nor `npm test` before deploying (see `docs/ai-notes.md`
§Reliability Findings). A curriculum whose grader can ship broken is not a
curriculum.

---

# 84. The AI layer — narrowed, and OpenRouter added

> *"add open router to options for AI. though I'm not sure yet how i use AI in
> this context. stockfish might suffice by providing the best options."*

That instinct is correct, and it deserves to be written down as a boundary
rather than left as a doubt.

## 84.1 The division of labour

| Decision | Owner |
|---|---|
| What is the best move | **Stockfish** |
| How much worse another move is | **Stockfish** |
| Whether a tactic is real | **Stockfish** |
| Whether an answer is correct | **Stockfish** |
| What to study today | **The scheduler** |
| Which PF step failed | **The classifier** (engine-derived) or the learner |
| How to phrase one sentence at this learner's level | The LLM, optionally |

**The LLM never decides anything; it only phrases things already decided.** It
receives a structured verdict object and returns prose. It may not name a move,
a score, or a reason that is not present in its input — and the app should verify
that before rendering (see §43 above, and `docs/ai-notes.md` §6).

Everything works with no API key. That is already true — `handleThinkLikeGM`
falls back to `buildGMMarkdownFromEngine` — and it must stay true for every new
feature. **Default the AI off for drills.** At sub-1000 the marginal value of
prose is small compared with reps, and a coach that pauses for a network call
between reps actively damages the rep rate that §79 depends on.

## 84.2 OpenRouter

Cheap, because `src/lib/ai.js` is already OpenAI chat-completions-shaped and
posts to a hard-coded URL in three places. Replace those with a provider
registry:

```js
// src/lib/providers.js
{ id: "openai",     baseUrl: "https://api.openai.com/v1",     keyKey: "chess-coach-api-key",  tools: "openai" }
{ id: "google",     baseUrl: "…generativelanguage…",          keyKey: "chess-google-api-key", tools: "google" }
{ id: "openrouter", baseUrl: "https://openrouter.ai/api/v1",  keyKey: "chess-openrouter-key", tools: "openai" }
```

OpenRouter takes the identical request body plus `HTTP-Referer` and `X-Title`
headers, so it is one registry entry, one extra button in `settings-dialog.jsx`
(which already has a two-provider toggle), and a model list. Details and the
tool-calling caveat are in `docs/ai-notes.md` §6.

> GPT Comment: Update this implementation note to use `X-OpenRouter-Title`;
> `X-Title` is only the backward-compatible form in the current OpenRouter docs.
> Treat "identical request body" as transport compatibility, not a promise that
> every routed model supports the same tools or structured-output behavior; put
> those capabilities on each curated model entry.

Why it is worth having: one key reaches many models, which makes it cheap to
find the smallest model that can phrase a verdict acceptably — and for this
workload that is the whole optimisation. Note that board-control function
calling currently exists only on the Gemini path (`google-ai.js`); OpenRouter
starts as chat-only and gains tools behind the registry's `tools` flag.

---

# 85. Keeping the upstream merge cheap

> *"I still want to be able to git pull any changes they make in that repo
> without breaking things in ours as much as possible."*

## 85.1 The remote does not exist yet

`git remote -v` shows only `origin` → `eputnam77/PieceFirstChess`. **There is
currently no way to pull Chess King changes at all.** First action:

```bash
git remote add upstream <chess-king-repo-url>
git fetch upstream
git merge --no-rebase upstream/main      # merge, never rebase a fork
```

Merge rather than rebase: rebasing rewrites our commits every time and turns one
conflict into a series of them.

## 85.2 The seam: `src/pf/`

Every new file in this plan goes under `src/pf/` — a directory upstream will
never create, so it can never conflict. Add a `@pf` alias, remembering CLAUDE.md's
warning that aliases live in **four** places that must stay in sync
(`vite.config.js`, `vitest.config.js`, `jsconfig.json`, `eslint.config.js`).

Existing PF-only files (`curriculum.js`, `srs*.js`, `session.js`,
`pf-error-log.js`, `protocol-drills.js`, `tabiya.js`, the drill components, the
`src/data` content) are already conflict-free by that logic — they have no
upstream counterpart. **Do not move them**; a rename is a merge cost with no
benefit. The rule is forward-looking only.

## 85.3 The merge-surface inventory

The real risk is concentrated in a handful of shared files. Keep the list short
and keep the edits *additive*:

| Upstream file | Our edits | How to keep it cheap |
|---|---|---|
| `App.jsx` | Study/curriculum state, autosave of PF data, report→tally fold | Collapse into **one** `usePieceFirst()` hook in `src/pf/` and **one** `<PieceFirstLayer/>` mount. Target: under 15 changed lines |
| `control-bar.jsx` | Study + Curriculum buttons, due badge | Frozen by §74.4. Two buttons, no more, ever |
| `chat-panel.jsx` | Commit Gate strip, PF7 Readout card | One `<CommitGate/>` import rendered above the card list; the card renderer itself untouched |
| `training-panel.jsx` | "Drill this in Study" affordance | One optional prop with a default, so an upstream rewrite of the panel drops our call site and nothing breaks |
| `stockfish.js` | `timeoutMs` / `movetimeMs` parameters (already added) | Additive optional arguments — upstream-compatible by construction |
| `analyzer.js` | Verdict thresholds | Move the thresholds *out* into `src/pf/verdict.js` and have `analyzer.js` import them; that is one import line instead of scattered constants |
| `progress.js` | Untouched | Leave it alone. Curriculum progress lives in `srs-db.js` |

The pattern in every row: **one call site, additive, with a default.** A file we
touch in one place survives an upstream rewrite; a file we touch in twelve does
not.

## 85.4 MERGE-NOTES.md

Add a repo-root `MERGE-NOTES.md` listing every intentional edit to an
upstream-shared file, one line each, with the reason. When a conflict lands in
`App.jsx` six months from now, that file is the difference between re-applying a
known change in two minutes and re-deriving it in two hours.

---

# 86. Measurement — what progress looks like before rating moves

Rating below 1000 is dominated by noise and opponent variance. These are the
numbers to put on the dashboard instead, all computable from data the app
already stores:

| Metric | Source | Why it matters |
|---|---|---|
| **Blunders per 100 moves** | game reports | The leading indicator at this level. §76's first target: halve it |
| **Games with zero pieces hung** | game reports | Binary, motivating, and the actual skill being trained |
| **PF-step error mix, over time** | error tally | Shows the loop working: PF7's share should fall first, then PF2's |
| **Accuracy at band, per PF step** | drill grades | Should sit near 85% (§75.3). Far above means the band is too easy |
| **Median recognition latency, per PF step** | scan drills | The automaticity measure (§79.3). Should fall even when accuracy is flat |
| **Items mature / total 99** | SRS cards | The bound made visible — the reason the curriculum is bounded at all |
| **Stretch reps solved** | stretch scoring | Evidence the ceiling is moving, not just the floor |

Two anti-metrics, deliberately absent: streaks and total puzzles solved. Both
reward volume over difficulty, and both are exactly what §75.6 warns about.

---

# 87. Build order

Sequenced so each step is independently useful and nothing large is built on an
unverified assumption.

| # | Step | Cost | Why here |
|---|---|---|---|
| 1 | `git remote add upstream` + `MERGE-NOTES.md` (§85.1, §85.4) | minutes | Zero-cost, and everything after this is easier to merge |
| 2 | `src/pf/verdict.js` — thresholds, grades, budgets (§83.1, §83.3) | small | Every later step calls it; `analyzer.js` gets more consistent immediately |
| 3 | **Commit Gate** in Live Mode (§77.1, §77.4) | small | Highest value per line in the plan. Improves the most-used feature and starts collecting live PF-tagged data on day one |
| 4 | **PF7 Readout** card (§77.3) | small | Fixes the Think Like a GM complaint; reuses `intelligence.js` detectors |
| 5 | **`scan` / `sweep` drills** + generator + `verify:drills` (§79, §83.2, §83.4) | medium | Unbounded free content, highest rep rate, and it fills the PF2 gap that `TIER-0-PROTOCOL-PLAN.md` had to defer |
| 6 | **Warm-up floor** in `session.js` (§82.5) | small | Two lines of queue ordering; directly implements §76's priority |
| 7 | **Tier-0 ladder**: `completion` + `cue` types, scaffold fading (§80) | medium | This is `TIER-0-PROTOCOL-PLAN.md` executed, plus rungs 2 and 5 |
| 8 | **Adaptive band + stretch rep** (§81.3, §81.4) | small | Needs drill volume from 5 and 7 before the staircase has anything to move on |
| 9 | **Lock visibility** in the dashboard (§81.2) | small | Pure UI on a mechanism that already exists |
| 10 | **`compare` drills**, generated (§78.1, §78.3) | medium | The Human Comment's "which is stronger?" ask. After 5 because it shares the certificate pipeline |
| 11 | **Personal deck** — `positions` store, recovery drills from own games (§78.2, §82.2) | medium | The payoff of steps 3 and 10 combined; needs both to exist first |
| 12 | **Recurrence escalation + retire** (§82.3) | small | Needs the deck's history to fire on |
| 13 | **Provider registry + OpenRouter** (§84.2) | small | Independent of everything else; do it when prose actually matters |
| 14 | CI gates: lint + test + `verify:drills` on deploy (§83.4) | small | Should be earlier if the grader ever ships wrong |

**Steps 1–6 are the minimum coherent slice** — roughly one focused week — and
they deliver: a better Best Move, a readable protocol readout, thousands of free
recognition reps, a non-negotiable warm-up, and a live error loop. Everything
after that is refinement of a system that is already closed.

> GPT Comment: The build order conflicts with `docs/ai-notes.md` §4, which says
> to run PF7 candidate-coverage work before building the panel, and it leaves CI
> gates until step 14 even though generated certificates ship at step 5. Move
> lint/tests/`verify:drills` ahead of the first generated drill, and insert a
> small instrumented pilot before defaulting the Commit Gate or hard-coding queue
> weights. The updated direction is worth pursuing; its strongest version treats
> the numeric policies in §§75–82 as falsifiable parameters rather than settled
> science.

---

# 88. Non-goals for this integration

Stated so scope creep has something to bump against:

- **Not rebuilding Chess King's Training area.** It stays. Study is the
  scheduled surface; Training is the browse surface (§74.3).
- **Not migrating existing PF files into `src/pf/`.** No merge benefit, real
  cost (§85.2).
- **Not changing the 99.** The count is a headline number and a test-enforced
  invariant. Every addition in this document lands *inside* existing items as
  new position types.
- **Not building a fourth top-level surface**, and not adding a top-level
  button (§74.4).
- **Not making the LLM a grader, a scheduler, or a source of chess truth**
  (§84.1).
- **Not gamifying.** No streaks, XP, leagues, or daily-goal nags. §75.6 and §86.
- **Not running MultiPV at depth in the browser for drill grading.** Certificates
  are precomputed (§83.2).
- **Not claiming PF7 is novel or that it beats standard play.** Untested; see
  `docs/ai-notes.md` §2.
