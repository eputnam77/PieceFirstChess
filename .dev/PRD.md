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