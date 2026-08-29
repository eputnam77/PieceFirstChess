# PieceFirst 7: A Practical Universal Chess System
Version 1.0 — Standard / Classical Chess

## Purpose

PieceFirst 7 is a complete practical decision system for human chess. It is not a claim that chess has been solved or that White has a forced win from the initial position. Its goal is different:

> Maximize practical playing strength while minimizing memory, indecision, and avoidable tactical errors.

The system combines:
- a repeatable seven-step move-selection protocol;
- a compact, sound opening repertoire;
- position-based middlegame planning;
- explicit endgame conversion rules;
- time-management rules;
- a Stockfish-assisted post-game feedback loop.

The system is designed so that the same thought process works in the opening, middlegame, and endgame.

---

# Part I — The Prime Directive

## The hierarchy

Never choose a move because it "looks active" until you have passed these gates:

1. **Legality and king safety**
2. **Opponent's immediate threats**
3. **Tactical soundness**
4. **Forcing opportunities**
5. **Position requirements**
6. **Piece improvement**
7. **Long-term plan**

A strategically beautiful move that loses a piece is a bad move. A quiet move that prevents a tactic may be the only good move.

## The central rule

> Before deciding what *you* want to do, determine what the opponent's last move changed.

Every move changes some combination of:
- attacks;
- defenses;
- lines;
- weak squares;
- pawn breaks;
- king safety;
- piece mobility;
- tactical motifs.

This is the anchor of PieceFirst 7.

---

# Part II — PieceFirst 7 Move Protocol

Use this on every serious move.

## PF1 — RESET: What changed?

After the opponent moves, do not immediately search for your own plan.

Ask:

- What piece moved?
- What square did it leave?
- What square did it enter?
- What new line opened?
- What line closed?
- What is now attacked?
- What is no longer defended?
- Is a pawn break now possible?
- Did king safety change?
- Did the move create a tactical motif?

This prevents "continuation blindness"—continuing your previous plan after the position has materially changed.

## PF2 — SAFETY: Is there an emergency?

Check in this order:

1. Am I in check?
2. Is checkmate threatened?
3. Is my queen attacked or trapped?
4. Is any piece hanging?
5. Is there a fork, pin, skewer, discovered attack, back-rank motif, or overloaded defender?
6. Is the opponent threatening a pawn break that changes the position immediately?

If yes, solve the emergency before ordinary planning.

### Loose-piece rule

Treat every undefended piece as a potential tactical liability.

Before moving:
- identify your undefended pieces;
- identify the opponent's undefended pieces;
- inspect pieces defended exactly once;
- inspect pinned defenders.

Many combinations begin with a loose piece or an overloaded defender.

## PF3 — FORCE: Examine forcing moves

Generate candidates in this order:

1. Checks
2. Captures
3. Direct threats
4. Tactical defensive moves

Do **not** automatically play a forcing move. Generate it and calculate it.

For every forcing candidate ask:

- What is the opponent's strongest reply?
- Can the opponent countercheck?
- Can the opponent capture the attacking piece?
- Does the line end with material gain, mate, perpetual check, or a favorable transition?
- What happens after the forcing sequence ends?

### Forcing-line discipline

Calculate forcing lines until the position becomes quiet enough to evaluate.

Never stop a calculation at "I win a pawn." Continue until you see whether:
- your queen gets trapped;
- your king becomes exposed;
- an intermediate move changes the result;
- the opponent wins something larger;
- the resulting endgame is favorable.

## PF4 — BREAK: Identify pawn breaks

If there is no tactical solution, identify the relevant pawn breaks.

Typical break questions:

- Can I challenge the center?
- Can I open a file for a rook?
- Can I open a diagonal for a bishop?
- Can I fix or attack a pawn weakness?
- Can I create a passed pawn?
- Can I undermine a pawn chain?
- Will the break expose my own king?

Pawn moves are irreversible. Require a reason.

### Pawn rule

> Do not make a pawn move merely because you cannot find a piece move.

Before every non-forced pawn move, ask what square or structure is permanently weakened.

## PF5 — PIECEFIRST: Improve the worst piece

If no immediate tactic or necessary pawn break dominates the position:

> Find your least useful piece and improve it.

For each piece ask:
- Does it attack something meaningful?
- Does it defend something necessary?
- Does it control a useful file, rank, diagonal, or outpost?
- Is it blocked by my own pawn?
- Does it have a better square?
- Can it join the side of the board where the game is happening?

### Piece priority

Default order for improvement:

1. Unsafe king
2. Trapped or tactically vulnerable piece
3. Completely undeveloped piece
4. Badly placed queen
5. Inactive rook
6. Bad minor piece
7. Already-active piece that can become stronger

### Typical improvement ideas

**Knight**
- seek protected central/outpost squares;
- avoid rim squares unless tactically justified;
- reroute if it has no future.

**Bishop**
- open its diagonal;
- move it outside a pawn chain before locking the structure;
- trade a bad bishop only when the trade improves the remaining position.

**Rook**
- open file;
- semi-open file;
- seventh rank;
- behind a passed pawn;
- double rooks when penetration is realistic.

**Queen**
- improve last unless a tactical opportunity exists;
- avoid becoming a target for tempo-gaining attacks.

**King**
- castle early when the center can open;
- in the endgame, activate aggressively when tactical danger has fallen.

## PF6 — CALCULATE: Compare 2–4 serious candidates

Do not calculate twenty moves shallowly.

Generate 2–4 serious candidates:
- best forcing move;
- best defensive/prophylactic move;
- best pawn break;
- best worst-piece improvement.

For each candidate:

1. Play it mentally.
2. Find the opponent's strongest forcing reply.
3. Find your best answer.
4. Continue while moves are forcing.
5. Evaluate the resulting position.

### Static evaluation checklist

At the end of a calculated line compare:

- Material
- King safety
- Piece activity
- Pawn structure
- Space
- Weak squares
- Open files / diagonals
- Passed pawns
- Initiative / tempo
- Endgame quality

Do not add arbitrary centipawn numbers over the board. Use qualitative categories:

- Clearly better
- Slightly better
- Equal / unclear
- Slightly worse
- Clearly worse

## PF7 — VERIFY: Final blunder scan

Immediately before touching the piece:

1. If I make this move, what checks does the opponent have?
2. What captures?
3. What direct threats?
4. Is the moved piece safe?
5. Did I leave something behind undefended?
6. Did I open a line toward my king?
7. Is there an intermediate move?
8. Did I miss a simpler move?

Then move.

This final scan should become automatic.

---

# Part III — The Position Map

Whenever the position changes materially—especially after a pawn exchange, queen trade, castling decision, or transition to an endgame—rebuild the map.

## A. Material

Do not count only nominal values. Ask:
- Who has the bishop pair?
- Is an exchange actually useful?
- Is a pawn extra but impossible to defend?
- Is material temporarily displaced?

Approximate values are useful only as orientation:
- Pawn ≈ 1
- Knight ≈ 3
- Bishop ≈ 3
- Rook ≈ 5
- Queen ≈ 9

Position can override nominal value.

## B. King safety

Compare:
- pawn cover;
- open files near the king;
- attacking pieces;
- defenders;
- available checks;
- escape squares.

If your opponent has the safer king, do not casually open the position unless calculation justifies it.

## C. Pawn structure

Identify:
- isolated pawns;
- doubled pawns;
- backward pawns;
- pawn chains;
- pawn majorities;
- passed pawns;
- candidate passed pawns;
- fixed targets.

Pawns tell you where your pieces belong.

## D. Space

The side with more space can often maneuver more easily but can also create overextended targets.

If cramped:
- trade pieces;
- seek pawn breaks;
- avoid unnecessary pawn weaknesses.

If you have space:
- avoid relieving the opponent without a reason;
- improve pieces behind the space advantage.

## E. Weak squares

A weak square matters only if:
- the opponent can occupy it;
- you cannot challenge that piece effectively;
- it affects important targets or king safety.

## F. Files and diagonals

Open lines are roads. Put long-range pieces on roads that lead somewhere.

## G. Initiative

Ask:
- Who is making threats?
- Who is reacting?
- Is the initiative temporary?
- Does continuing it require unsound material sacrifice?

An initiative has value, but only if it produces concrete gains or long-term positional advantages.

---

# Part IV — Opening Repertoire

This repertoire is a recommendation optimized for:
- objective soundness;
- manageable memory;
- recurring plans;
- broad chess education;
- practical usefulness in classical play.

It is *not* claimed to be the only best repertoire.

## White: 1.e4

Why:
- immediately contests the center;
- creates open and semi-open positions;
- teaches tactical and positional play;
- gives clear development priorities.

### Against 1...e5: Italian Game

Core:
1. e4 e5
2. Nf3 Nc6
3. Bc4

Default plan in quieter structures:
- d3
- O-O
- Re1
- c3
- Nbd2
- Bb3 when attacked
- Nf1–g3 or Nf1–e3
- prepare d4 under favorable conditions

Strategic themes:
- control d4;
- maintain pressure against f7;
- avoid premature attacks;
- use central expansion when development is complete.

If Black plays ...Bc5, the Giuoco Pianissimo structure is an excellent default.

### Against the Sicilian: Alapin

1. e4 c5
2. c3

Goal:
- build d4;
- reduce highly specialized Open Sicilian theory;
- obtain clear central structures.

Main response to ...d5:
- exd5 followed by d4 when appropriate.

Main response to ...Nf6:
- e5 followed by d4.

Strategic objective:
- establish a durable center without allowing Black effortless counterplay.

### Against the French: Advance

1. e4 e6
2. d4 d5
3. e5

Plan:
- c3
- Nf3
- Bd3 or Be2
- O-O
- challenge Black's queenside/center counterplay
- prepare c4 in appropriate structures

Critical concept:
Black will attack the pawn chain with ...c5 and often ...f6. Do not defend e5 passively forever; use the space to create active play.

### Against the Caro-Kann: Advance

1. e4 c6
2. d4 d5
3. e5

Plan:
- develop quickly;
- avoid unnecessary pawn overextension;
- use kingside space;
- react to ...c5 and ...f6 breaks.

### Against the Scandinavian

1. e4 d5
2. exd5

If ...Qxd5:
3. Nc3, gaining development with tempo.

Then:
- d4
- Nf3
- Bc4 / Be2 as position dictates
- O-O

### Against Pirc / Modern

Build the classical center:
- e4
- d4
- Nc3
- Nf3
- Be2 / Be3
- O-O

Do not force an attack unless Black's setup gives you concrete targets.

### Against Alekhine

Use the center but do not become addicted to pawn chasing:
1. e4 Nf6
2. e5 Nd5
3. d4

Develop and stabilize the center.

---

## Black against 1.e4: Caro-Kann

1. e4 c6
2. d4 d5

Purpose:
- challenge White's center immediately;
- develop the light-squared bishop outside the pawn chain in many lines;
- obtain structurally sound positions;
- reduce early tactical chaos compared with many 1...e5 and Sicilian branches.

### Classical: 3.Nc3 / 3.Nd2

Typical:
3...dxe4
4.Nxe4 Bf5

Then:
- ...e6
- ...Nd7
- ...Ngf6
- ...Be7
- ...O-O

Do not memorize only moves; remember the development order and breaks.

### Advance: 3.e5

Default:
3...Bf5

Then often:
- ...e6
- ...c5
- ...Nc6
- ...Qb6 when useful
- pressure d4

The important strategic idea is the ...c5 break.

### Exchange

After exd5 cxd5:
- develop naturally;
- pressure the center;
- do not fear symmetry—piece activity creates imbalance.

### Panov

Against c4 structures:
- treat the position as an isolated-queen's-pawn type;
- blockade d4;
- pressure the isolated pawn;
- beware White's active piece play.

---

## Black against 1.d4: Queen's Gambit Declined shell

1. d4 d5
2. c4 e6

Then usually:
- ...Nf6
- ...Be7
- ...O-O
- ...Nbd7
- challenge the center with ...c5 or ...e5 when prepared

The goal is not passive defense. The goal is to complete development and then strike the center.

### Against the London

Use an active setup rather than mirror passivity:
- ...d5
- ...Nf6
- ...e6
- ...c5
- ...Nc6
- ...Bd6 or ...Be7
- ...O-O

Question the d4/e3 chain with ...c5.

### Against 1.Nf3

Default:
- ...d5

If 2.d4:
- transpose to QGD structures.

If 2.c4:
- ...e6 and develop flexibly.

### Against 1.c4

Default practical shell:
- ...e6
- ...d5 when available

Aim to transpose into familiar d4/d5 structures.

---

# Part V — Opening Rules That Override Repertoire Memory

Never play a memorized move if the board makes it tactically wrong.

Opening priorities:

1. Fight for the center.
2. Develop minor pieces.
3. Secure the king.
4. Connect rooks.
5. Avoid repeated moves without a concrete reason.
6. Avoid early queen adventures.
7. Do not start a wing attack while the center is unstable.
8. Know your pawn breaks.
9. Know your worst piece.
10. Leave book when you no longer understand the position.

The correct question is not "What is move 14 of theory?"

It is:

> "What is this opening trying to achieve, and what changed on the board?"

---

# Part VI — Middlegame Plan Selection

When no tactic dominates, choose the plan by the pawn structure.

## Open center

Priorities:
- king safety;
- development;
- rook activity;
- bishops;
- tactical calculation.

Avoid slow pawn maneuvers when lines are open.

## Closed center

Priorities:
- maneuvering;
- knight outposts;
- flank pawn breaks;
- identifying which side has more space.

You can often attack on a wing because the center is less likely to open immediately—but verify breaks first.

## Isolated Queen's Pawn (IQP)

With the IQP:
- use activity;
- seek e5 or d5 piece outposts;
- consider d5 break or tactical pressure before simplification;
- avoid drifting into a passive endgame.

Against the IQP:
- blockade;
- trade active pieces;
- pressure the pawn;
- do not allow a favorable pawn break.

## Hanging pawns

With hanging pawns:
- preserve dynamic potential;
- prepare a central advance;
- avoid allowing them to become fixed targets.

Against:
- restrain them;
- provoke an advance;
- attack the resulting weakness.

## Minority-attack structure

If you have queenside pawn minority:
- advance to create a target;
- do not sacrifice king safety to do it;
- position rooks and queen to exploit the weakness after the pawn exchange.

## Opposite-side castling

Speed matters more.

Priorities:
- calculate forcing lines;
- pawn storms can be justified;
- do not waste tempi on cosmetic moves;
- compare whose attack lands first.

## Same-side castling

Be more cautious with pawn moves in front of your king.

Attack through:
- piece pressure;
- central breaks;
- files;
- sacrifices only when calculated.

---

# Part VII — Attack Rules

Do not attack merely because you have pieces pointing at the king.

Before launching an attack ask:

1. Is the center stable enough?
2. Do I have more attacking pieces than the defender has defenders?
3. Can I open lines?
4. Can I bring the queen safely?
5. Does the opponent have a central counterstrike?
6. What happens if queens are exchanged?

### Attack trigger

A serious king attack is justified when at least two of these are present:
- damaged pawn cover;
- open file/diagonal to king;
- trapped king;
- significant local piece superiority;
- strong sacrifice motif;
- restricted defenders;
- stable center.

If the attack is not ready, improve the worst attacking piece.

---

# Part VIII — Defense Rules

When worse:

1. Stop immediate tactical losses.
2. Trade the opponent's most dangerous attacking piece.
3. Seek counterplay.
4. Create practical problems.
5. Avoid unnecessary pawn weaknesses.
6. Do not simplify blindly if the resulting endgame is lost.
7. Look for perpetual check, fortress, stalemate, opposite-colored bishops, and repetition resources where relevant.

When under attack:
- count attackers and defenders;
- create luft if back-rank danger exists;
- exchange queens if it clearly kills the attack;
- return material if that ends the attack safely.

---

# Part IX — Trading Rules

## When ahead

General preference:
- trade pieces;
- keep enough pawns to win;
- remove counterplay;
- avoid exchanging into an unexpectedly drawn pawn ending.

## When behind

General preference:
- keep pieces;
- retain tactical possibilities;
- avoid a sterile simplification;
- trade pawns if it reduces the opponent's winning material, when tactically safe.

## Never use "trade when ahead" mechanically

Before every trade compare:
- resulting pawn ending;
- king activity;
- passed pawns;
- opposite-colored bishops;
- rook activity;
- tactical transition.

---

# Part X — Endgame System

When queens leave the board, do not mentally "relax." Endgames punish one tempo.

## Endgame priority ladder

1. Calculate forced tactics and pawn races.
2. Activate the king.
3. Identify passed pawns.
4. Put rooks actively.
5. Improve the worst piece.
6. Fix weaknesses.
7. Create a second weakness.
8. Convert without unnecessary pawn moves.

## King activation

In many endgames, the king changes from liability to fighting piece.

Ask:
- Can my king enter the center?
- Can I attack a pawn?
- Can I escort a passer?
- Can I take opposition?

## Passed pawns

A passed pawn must be:
- pushed when safe;
- supported;
- used to distract enemy pieces.

A distant passed pawn can be more valuable than a nearby material gain if it drags the enemy king away.

## Rook rule

Default principle:
- active rook over passive rook;
- rook behind passed pawn when practical;
- cut off the enemy king;
- use checks from distance.

## Must-master theoretical endings

Minimum technical curriculum:

1. King + queen vs king
2. King + rook vs king
3. King + pawn vs king
4. Opposition
5. Key squares
6. Basic pawn races and the square rule
7. Lucena position
8. Philidor position
9. Rook vs advanced pawn basics
10. Basic minor-piece endings
11. Wrong-colored bishop + rook pawn draw
12. Opposite-colored bishop drawing mechanisms

Do not attempt to memorize every tablebase ending. Master recurring mechanisms.

---

# Part XI — Time Management for Classical Chess

Use percentages so the system works at different time controls.

## Opening

If still in known territory:
- move efficiently;
- do not burn large blocks of time proving remembered theory again.

The instant you do not understand the position:
- stop calling it "book";
- switch to PieceFirst 7.

## Critical-position triggers

Spend extra time when:
- there is a tactical sequence;
- a pawn break changes the structure;
- a piece sacrifice is possible;
- queens may be exchanged;
- the king may become exposed;
- the position is transitioning to an endgame;
- two candidate moves lead to completely different structures.

## Clock checkpoints

A practical default:
- around move 10: preserve the majority of your time;
- around move 20: avoid having spent nearly everything;
- entering move 30+: maintain a real calculation reserve.

Exact percentages depend on increment and time control. The principle is to spend time on *critical positions*, not uniformly.

## Low-time protocol

If time becomes short, compress PieceFirst 7 to:

1. Check?
2. Opponent threat?
3. My checks/captures?
4. Worst piece?
5. Blunder scan.

---

# Part XII — Evaluation Without an Engine

Do not ask "Who is winning?" on every move.

Ask:
- What is my worst problem?
- What is the opponent's worst problem?
- What is the most important break?
- What is the most important piece?
- Which side benefits from trades?
- Which king is safer?
- Where is the play?

A useful plan solves one of your problems while creating one for the opponent.

---

# Part XIII — Stockfish Training Protocol

Stockfish should be used for preparation and post-game analysis, not as live assistance in games where outside assistance is prohibited.

## Recommended analysis sequence

### Pass 1 — Human review

Before turning on Stockfish:
- annotate where you were uncertain;
- write your candidate moves;
- identify what you thought the opponent threatened;
- mark your intended plan.

This preserves the learning signal.

### Pass 2 — Shallow engine review

Use MultiPV 3.

Goal:
- find major tactical misses;
- identify where your candidate set omitted the best move.

### Pass 3 — Deep critical-position review

Only deeply analyze positions where:
- evaluation swings;
- you had a difficult choice;
- your plan was wrong;
- tactical lines were unclear.

### Pass 4 — Explain the difference

For every meaningful error record:

- My move
- Better move
- What I missed
- Which PF step failed
- Pattern
- Training action

Example:

| Field | Example |
|---|---|
| My move | 21.Re1 |
| Better | 21.d5 |
| Failure | PF4 BREAK |
| What I missed | Center could be closed with tempo |
| Pattern | Missed central pawn break |
| Training | 10 positions on pawn breaks |

The purpose is not to memorize Stockfish moves. It is to repair your decision process.

---

# Part XIV — Error Taxonomy

Tag every important error with one primary cause.

## Tactical

- T1: missed check
- T2: missed capture
- T3: missed threat
- T4: hanging piece
- T5: fork
- T6: pin/skewer
- T7: discovered attack
- T8: intermediate move
- T9: back-rank motif
- T10: calculation stopped too early

## Positional

- P1: ignored worst piece
- P2: wrong pawn break
- P3: unnecessary pawn move
- P4: bad trade
- P5: weak-square concession
- P6: poor rook placement
- P7: bad minor-piece exchange
- P8: king-safety neglect
- P9: no plan after structure changed
- P10: opponent plan ignored

## Endgame

- E1: inactive king
- E2: bad rook activity
- E3: pawn race miscalculated
- E4: passed pawn mishandled
- E5: opposition/key-square error
- E6: Lucena/Philidor error
- E7: wrong exchange
- E8: unnecessary pawn move

## Process

- R1: moved too fast
- R2: spent too much time
- R3: only considered one candidate
- R4: did not inspect opponent's last move
- R5: skipped blunder check
- R6: relied on opening memory after leaving known position

Your training should be driven by error frequency, not by random content.

---

# Part XV — Training System

## The 60-minute model

A balanced session:

- 20 min: calculation/tactics
- 10 min: endgames
- 10 min: repertoire recall
- 15 min: annotated master game or your own game
- 5 min: error-log review

## If only 20 minutes

- 10 min tactics/calculation
- 5 min one endgame mechanism
- 5 min review one previous error

## Weekly

Play at least one game slowly enough to use PieceFirst 7.

Afterward:
1. human analysis;
2. Stockfish analysis;
3. classify errors;
4. extract 3–5 positions;
5. retry those positions later without the engine.

---

# Part XVI — Opening Study Method

Do not memorize openings as a string of SAN moves.

For every repertoire branch store:

- tabiya position;
- pawn structure;
- best piece placement;
- bad piece;
- main pawn break;
- opponent's main plan;
- tactical motifs;
- favorable endgame;
- unfavorable trade.

Use move memorization only to reach understood positions.

---

# Part XVII — One-Page Over-the-Board Card

## After every opponent move

**RESET**
- What changed?

**SAFETY**
- Check?
- Mate threat?
- Hanging piece?
- New tactic?

**FORCE**
- Checks
- Captures
- Threats

**BREAK**
- Is there a necessary pawn break?

**PIECEFIRST**
- What is my worst piece?
- What is its best realistic square?

**CALCULATE**
- 2–4 candidates
- opponent's best reply
- evaluate resulting position

**VERIFY**
- Their checks?
- Their captures?
- Their threats?
- Is my move tactically safe?

## Position questions

- Who has safer king?
- Who has better pieces?
- What pawn break matters?
- What weakness is attackable?
- Who benefits from exchanges?
- Where should the game be played?

---

# Part XVIII — What "Perfect" Means Here

No human-usable system can guarantee victory from the initial position against every opponent.

PieceFirst 7 instead seeks practical perfection in process:

- never skip threat detection;
- never skip tactical candidates;
- never make a plan without reading the pawn structure;
- never leave a bad piece bad without a reason;
- never trust an engine move you cannot explain;
- never repeat the same error without training the underlying pattern.

The system becomes stronger as your personal error database grows.

---

# Part XIX — Machine-Readable Architecture

Recommended files:

- `PieceFirst_7_Handbook.md` — complete human system.
- `piecefirst_repertoire.json` — repertoire and plan database.
- `piecefirst_coach.py` — Stockfish-assisted PGN analyzer.
- `piecefirst_config.json` — local engine settings.
- `requirements.txt` — Python dependency.
- `PieceFirst_7_Card.txt` — compact over-the-board memory card.

The Python tool is designed for **post-game analysis and training**.

---

# Part XX — Sources and Technical References

Stockfish 18:
https://stockfishchess.org/blog/2026/stockfish-18/

Stockfish downloads:
https://stockfishchess.org/download/

Stockfish advanced topics / Syzygy:
https://official-stockfish.github.io/docs/stockfish-wiki/Advanced-topics.html

python-chess engine API:
https://python-chess.readthedocs.io/en/stable/engine.html

Lichess open database:
https://database.lichess.org/

Lichess opening explorer:
https://lichess.org/opening

Lichess practice:
https://lichess.org/practice

FIDE Laws of Chess:
https://rcc.fide.com/fide-laws-of-chess_fulltexthtml/

FIDE Handbook, Article 11.3 restrictions on notes/electronic devices during play:
https://handbook.fide.com/chapter/e012023
