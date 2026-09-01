/**
 * Tabiya cards for curriculum tiers 4 and 5.
 *
 * Specified in `docs/PF7/LEARNING-SYSTEM.md` §1 and drawn from
 * `docs/PF7/PieceFirst_7_Handbook.md` Part IV (repertoire), Part VI (middlegame
 * plans) and Part XVI (what an opening card must store).
 *
 * Two ideas shape this file.
 *
 * **A card is a position plus its plans, never a move list.** The handbook's
 * rule is explicit: memorise moves only far enough to reach a position you
 * understand. So each entry stores the moves as the *route* to a tabiya, and
 * everything the student is actually meant to know lives in `card`.
 *
 * **Fourteen opening cards resolve into five structures.** That is the whole
 * design of the repertoire, and `structure` is the link. Two of the five —
 * the French chain and the isolated queen's pawn — are learned from *both*
 * sides, which is worth more than knowing eight structures from one side.
 *
 * Lines are stored as SAN and replayed with chess.js at load time (see
 * `src/lib/tabiya.js`), so there is no hand-written FEN in this file to drift
 * out of step with the moves. `tabiya.test.js` replays every line.
 *
 * Each entry:
 * id         – the curriculum item this card teaches
 * title      – display name
 * side       – "white" | "black": the side the student plays
 * line       – SAN moves from the initial position, ending at the tabiya
 * structure  – the tier-4 structure item this resolves into (tier-5 cards only)
 * card       – what the student must be able to state from the position alone
 * playOut    – how many student moves a structure play-out drill runs for
 */

/** The plan fields a card must fill, per Handbook Part XVI. */
export const CARD_FIELDS = Object.freeze([
  { key: "yours", label: "Your plans" },
  { key: "theirs", label: "Their plans" },
  { key: "breaks", label: "Pawn breaks" },
  { key: "placement", label: "Best piece placement" },
  { key: "worstPiece", label: "Your worst piece" },
  { key: "endgame", label: "Endgame verdict" },
  { key: "avoidTrade", label: "Trade to avoid" },
]);

// ═══ Tier 4 — pawn structures ═══════════════════════════════════════════════
// Drilled by playing the structure out against Stockfish from the tabiya, from
// both sides where the repertoire reaches it from both sides.

const STRUCTURES = [
  {
    id: "S-01",
    title: "The French chain (e5/d4/c3 vs e6/d5/c5)",
    side: "white",
    bothSides: true,
    playOut: 12,
    line: [
      "e4",
      "e6",
      "d4",
      "d5",
      "e5",
      "c5",
      "c3",
      "Nc6",
      "Nf3",
      "Qb6",
      "Be2",
    ],
    card: {
      yours:
        "Hold d4 with c3 and pieces, then use the kingside space the e5 pawn buys you: Re1, Bf4 or Bg5, Nb1–d2–f1–g3, sometimes h4 and Nh2–g4. Consider dxc5 followed by b4 if Black over-commits.",
      theirs:
        "Attack the base and the head of the chain: ...cxd4 and ...Qb6, ...Nge7–f5 and ...Rc8 against d4, then ...f6 against e5. Trade off the bad c8 bishop if allowed.",
      breaks:
        "White: c4, or f4–f5 if Black's king lingers in the centre. Black: ...c5 (already played) and ...f6.",
      placement:
        "White: c3, Nf3 heading for e5 or via d2–f1–g3, Be3 or Bf4, rooks e1 and c1. Black: Nc6, Nge7–f5, Qb6, Rc8, bishop out via d7.",
      worstPiece:
        "Black's c8 bishop, locked behind ...e6 and ...d5. Every French plan on both sides is really about that piece.",
      endgame:
        "Good for White if the e5 wedge survives and Black's light bishop never got out; good for Black once ...f6 has dissolved the chain.",
      avoidTrade:
        "White must not shed the dark-squared bishop while d4 still needs guarding, and must not let Black trade the bad bishop for free.",
    },
  },
  {
    id: "S-02",
    title: "The isolated queen's pawn",
    side: "white",
    bothSides: true,
    playOut: 12,
    line: [
      "e4",
      "c5",
      "c3",
      "d5",
      "exd5",
      "Qxd5",
      "d4",
      "Nf6",
      "Nf3",
      "e6",
      "Be3",
      "cxd4",
      "cxd4",
      "Nc6",
      "Nc3",
      "Qd6",
      "Bd3",
      "Be7",
      "O-O",
      "O-O",
    ],
    card: {
      yours:
        "The IQP is a middlegame asset and an endgame liability, so keep pieces on. Occupy e5, aim a bishop at h7, support the d5 push with Re1, Rc1 and Qe2, and push d5 the moment the blockade wobbles.",
      theirs:
        "Blockade d5 with a knight, trade minor pieces, double on the d-file, and steer for an endgame where the pawn is simply weak.",
      breaks:
        "d4–d5 for the IQP side. The defender has no pawn break — exchanges are the plan.",
      placement:
        "IQP side: Ne5, Bd3, Bg5 or Bf4, Re1, Rc1, Qe2 or Qd3. Defender: knight on d5, rooks on d8 and c8, bishop on e7 then f6.",
      worstPiece:
        "For the IQP side, whichever rook is not yet on c1 or e1. For the defender, the c8 bishop until ...b6 and ...Bb7 or ...Bd7–e6.",
      endgame:
        "Bad for the IQP side. If the position simplifies you are defending a weak pawn, so spend the activity while you have it.",
      avoidTrade:
        "The IQP side should refuse every minor-piece trade that does not win something concrete. The defender should not trade the blockading knight if it frees d5.",
    },
  },
  {
    id: "S-03",
    title: "The Carlsbad structure and the minority attack",
    side: "black",
    playOut: 12,
    line: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "cxd5",
      "exd5",
      "Bg5",
      "Be7",
      "e3",
      "O-O",
      "Bd3",
      "Nbd7",
      "Nf3",
      "c6",
      "O-O",
      "Re8",
    ],
    card: {
      yours:
        "Expect b4–b5. Answer it with ...a6 and ...Rb8, or meet b5 with ...c5 or ...axb5. Reroute the passive pieces — ...Ne8–d6 and ...Nf8–e6 — and counter in the centre with ...Ne4 or on the kingside once White commits to the queenside.",
      theirs:
        "The minority attack: b4, Rb1, b5, leaving Black a backward c-pawn on a half-open file. Failing that, Ne5 and f3/e4 with a central push.",
      breaks:
        "White: b5. Black: ...c5, which frees the position at the cost of an isolated d-pawn, plus ...Ne4 as a piece break.",
      placement:
        "Black: knights heading for d6 and e6, rook e8, bishop e7 or d6, queen c7. White: Rb1, Rc1, Bd3, knight to e5 or a4.",
      worstPiece:
        "Black's c8 bishop until ...Bf5 or ...Be6, and any Black piece tied to defending c6.",
      endgame:
        "Dangerous for Black if White lands the minority attack: the c6 pawn becomes a permanent target that never repairs itself.",
      avoidTrade:
        "Black must not trade off the pieces guarding c6 before answering b5.",
    },
  },
  {
    id: "S-04",
    title: "The solid c6/e6/d5 shell",
    side: "black",
    playOut: 12,
    line: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "Nf3",
      "Be7",
      "Bf4",
      "O-O",
      "e3",
      "Nbd7",
      "Rc1",
      "c6",
      "Bd3",
    ],
    card: {
      yours:
        "Finish development first — ...Nf6, ...Be7, ...O-O, ...Nbd7, ...c6 — and only then strike. Free yourself with ...dxc4 followed by ...b5 and ...c5, or with ...e5 when White's pieces allow it.",
      theirs:
        "Central pressure with Bd3, Qc2 and e4, or a switch to the minority attack if the structure turns Carlsbad.",
      breaks:
        "Black: ...c5 and ...e5. One of them must happen — passivity, not the structure, is what loses this position.",
      placement:
        "Black: rook e8, knights d7 and f6 (or e8 and d6), bishop e7, queen c7 or a5. White: Rc1, Bd3, Qc2, knight to e5.",
      worstPiece:
        "The c8 bishop. ...dxc4 with ...b6 and ...Bb7, or ...b6 and ...Bb7 after ...c5, is the cure.",
      endgame:
        "Sound for Black — no structural weakness anywhere. The only real risk is never becoming active.",
      avoidTrade:
        "Black should not trade the e7 bishop for a knight while the queenside is still undeveloped.",
    },
  },
  {
    id: "S-05",
    title: "The closed e4/d3 centre",
    side: "white",
    playOut: 12,
    line: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "d3",
      "Nf6",
      "c3",
      "d6",
      "O-O",
      "O-O",
      "Re1",
      "a6",
      "Nbd2",
    ],
    card: {
      yours:
        "Nothing is urgent, and that is the point. Reroute the b1 knight (Nbd2–f1–g3 or –e3), drop the bishop to b3, add h3 and Re1, and only then break with d4.",
      theirs:
        "...Ba7 or ...Bb6 to keep the bishop and press d4/f2, ...Ne7–g6 and ...c6 followed by ...d5, or ...Re8, ...h6 and ...Be6 to neutralise your bishop.",
      breaks:
        "d4 for White, ...d5 for Black. Whoever plays it before the pieces support it hands over the initiative.",
      placement:
        "White: Bb3, Re1, knight on g3 or e3, pawn h3, queen c2 or e2. Black: mirror it — ...Ba7, ...Ne7–g6, ...Re8, ...h6.",
      worstPiece:
        "White's b1 knight until it reaches g3 or e3. Improving it is the whole manoeuvre.",
      endgame:
        "Slightly better for whoever kept the more useful bishop; the structure itself is balanced.",
      avoidTrade:
        "Do not swap the c4/b3 bishop for a knight without a concrete reason — it is the pressure on f7 and d5.",
    },
  },
  {
    id: "S-06",
    title: "Hanging pawns on c5 and d5",
    side: "black",
    playOut: 12,
    line: [
      "d4",
      "Nf6",
      "Nf3",
      "e6",
      "c4",
      "b6",
      "g3",
      "Bb7",
      "Bg2",
      "Be7",
      "O-O",
      "O-O",
      "Nc3",
      "d5",
      "cxd5",
      "exd5",
      "Bf4",
      "c5",
      "dxc5",
      "bxc5",
    ],
    card: {
      yours:
        "Hanging pawns are strong while they can advance and weak once they are frozen. Keep them mobile, control d4 and e5 with pieces, and look for the right moment to play ...d4 or ...c4.",
      theirs:
        "Freeze them. Pile up on c5 and d5 with Rc1, Qa4, Na4 and Be3, provoke one of them forward so the other becomes backward, then win it.",
      breaks:
        "Owner: ...d4 or ...c4, whichever gains space without leaving the other pawn stranded. Opponent: b4 to fix the pair, or e4 against d5.",
      placement:
        "Owner: rooks c8 and d8 (or e8), bishop b7 on the long diagonal, knights c6 and f6 covering d4 and e4. Opponent: Rc1, Be3, Na4 or Nb5, queen a4 or b3.",
      worstPiece:
        "Whichever of the owner's rooks is not behind a hanging pawn — they are the pawns' only defenders once pieces come off.",
      endgame:
        "Bad for the owner: two pawns that need constant piece support are a liability without pieces.",
      avoidTrade:
        "The owner must not trade the pieces covering d4 and e5. Trading into a minor-piece endgame with hanging pawns is a slow loss.",
    },
  },
  {
    id: "S-07",
    title: "Half-open file play after central exchanges",
    side: "black",
    playOut: 12,
    line: [
      "e4",
      "c6",
      "d4",
      "d5",
      "exd5",
      "cxd5",
      "Bd3",
      "Nc6",
      "c3",
      "Nf6",
      "Bf4",
      "e6",
      "Nd2",
      "Bd6",
      "Bxd6",
      "Qxd6",
      "Ngf3",
      "O-O",
    ],
    card: {
      yours:
        "The half-open file is the whole asset: ...Rc8, ...Qc7, and a knight to b4 or a5 hitting the d3 bishop. Symmetry is not equality until your pieces are the better-placed ones.",
      theirs:
        "Quiet build-up with Bd3, c3, Ne5 and Qc2 pointing at h7, then contest the same file with Rc1.",
      breaks:
        "...e5 once the pieces support it; sometimes ...f6 and ...e5 together. For White, an eventual b4 or f4.",
      placement:
        "Rook on the half-open file, queen behind it, knights on c6 and f6, and the light bishop developed to f5 or g4 *before* ...e6 shuts it in.",
      worstPiece:
        "The c8 bishop if ...e6 comes too early. Solve that piece before making the file your project.",
      endgame:
        "Balanced. Piece activity rather than structure decides these positions.",
      avoidTrade:
        "Do not trade into a dead-symmetrical endgame while your pieces are the passive ones.",
    },
  },
  {
    id: "S-08",
    title: "A backward pawn on a half-open file",
    side: "white",
    playOut: 12,
    line: [
      "e4",
      "c5",
      "Nf3",
      "d6",
      "d4",
      "cxd4",
      "Nxd4",
      "Nf6",
      "Nc3",
      "a6",
      "Be2",
      "e6",
      "O-O",
      "Be7",
      "f4",
      "O-O",
    ],
    card: {
      yours:
        "The d6 pawn cannot be defended by another pawn, and the d-file is half open. Pile up on it: Rd1, Qd2 or Qe1–g3, a knight to b3 or f3, and provoke ...d5 or ...e5 only when it creates a second weakness.",
      theirs:
        "Get rid of the weakness by playing ...d5 or ...e5 under favourable circumstances, or make it irrelevant with counterplay on the c-file and the long diagonal.",
      breaks:
        "For the attacker, e5 or f5 to open lines at the pawn. For the defender, ...d5 or ...e5 — timing is everything.",
      placement:
        "Attacker: rooks on d1 and e1, queen on d2 or f3, knights on d4 and c3, bishop on e3 or f4. Defender: Rc8, Qc7, ...Nc6 or ...Nbd7, bishop b7.",
      worstPiece:
        "The defender's pieces tied to guarding d6 — usually a knight on d7 and a rook on d8.",
      endgame:
        "Good for the attacker: a backward pawn on a half-open file does not get better with fewer pieces.",
      avoidTrade:
        "The attacker should not trade the rooks and queen that create the pressure. The defender should trade them at almost any cost.",
    },
  },
];

// ═══ Tier 5 — opening tabiya cards ══════════════════════════════════════════
// Last and smallest by design. Every card resolves into one of the structures
// above, so this tier is fourteen routes into five ideas, not fourteen openings.

const OPENINGS = [
  {
    id: "O-01",
    title: "Italian Game / Giuoco Pianissimo",
    side: "white",
    structure: "S-05",
    line: [
      "e4",
      "e5",
      "Nf3",
      "Nc6",
      "Bc4",
      "Bc5",
      "d3",
      "Nf6",
      "c3",
      "d6",
      "O-O",
      "O-O",
      "Re1",
      "a6",
      "Nbd2",
    ],
    card: {
      yours:
        "Reroute the b1 knight (Nbd2–f1–g3 or –e3), keep the c4 bishop by dropping it to b3 the moment ...Na5 comes, add h3 and Re1, and break with d4 only when everything supports it.",
      theirs:
        "...Ba7 or ...Bb6 to keep the bishop and pressure d4 and f2; ...Ne7–g6 with ...c6 and ...d5; or ...Re8, ...h6 and ...Be6.",
      breaks:
        "d4, and only after Re1, c3 and the knight manoeuvre are in place. Early d4 gives Black the initiative.",
      placement: "Bb3, Re1, knight on g3 or e3, pawn h3, queen c2 or e2.",
      worstPiece:
        "The b1 knight until it reaches g3 or e3. That manoeuvre is the opening.",
      endgame:
        "Good for you if you keep the light-squared bishop while Black's is stuck behind ...e5 and ...d6.",
      avoidTrade:
        "Do not exchange the c4/b3 bishop for a knight without a concrete reason.",
    },
  },
  {
    id: "O-02",
    title: "Alapin Sicilian vs 2...d5",
    side: "white",
    structure: "S-02",
    line: [
      "e4",
      "c5",
      "c3",
      "d5",
      "exd5",
      "Qxd5",
      "d4",
      "Nf6",
      "Nf3",
      "e6",
      "Be3",
      "cxd4",
      "cxd4",
      "Nc6",
      "Nc3",
      "Qd6",
      "Bd3",
      "Be7",
      "O-O",
      "O-O",
    ],
    card: {
      yours:
        "You have the isolated d-pawn, so keep pieces on: Ne5, Bd3 at h7, Re1 and Rc1, and push d5 when Black's blockade slips. Every developing move should also prepare that push.",
      theirs:
        "Blockade d5 with a knight, trade minor pieces, double on the d-file and head for an endgame.",
      breaks: "d4–d5. Black has none — his plan is exchanges.",
      placement: "Ne5, Bd3, Bg5 or Bf4, Re1, Rc1, queen on e2 or d3.",
      worstPiece: "Whichever rook is not yet on c1 or e1.",
      endgame:
        "Bad for you — a simplified IQP position is a defensive task. Spend the activity in the middlegame.",
      avoidTrade:
        "Refuse minor-piece trades unless they win something concrete.",
    },
  },
  {
    id: "O-03",
    title: "Alapin Sicilian vs 2...Nf6",
    side: "white",
    structure: "S-07",
    line: [
      "e4",
      "c5",
      "c3",
      "Nf6",
      "e5",
      "Nd5",
      "d4",
      "cxd4",
      "Nf3",
      "Nc6",
      "cxd4",
      "d6",
      "Bc4",
      "Nb6",
      "Bb5",
    ],
    card: {
      yours:
        "Hold the e5 wedge — it cramps Black and denies f6 to his knight — and develop with tempo against the wandering knight. Once the minor pieces come off, the d-file and the extra space are yours.",
      theirs:
        "...d6 and ...dxe5 to dissolve the wedge, quick development with ...Bd7 and ...e6, and pressure on d4 from the half-open c-file.",
      breaks:
        "Yours: d4–d5, or exd6 at the right moment. Theirs: ...d6, sometimes ...f6.",
      placement:
        "Bishop on b5 or c4 hitting the knight, Nc3, rooks on c1 and e1, and a pawn on h3 before anything ambitious.",
      worstPiece:
        "The c1 bishop — give it f4 or e3 before pushing anything else.",
      endgame:
        "Roughly balanced; your space edge fades with the pieces, so use it early.",
      avoidTrade:
        "Do not trade away the pieces that hold e5. Without that pawn the whole space advantage evaporates.",
    },
  },
  {
    id: "O-04",
    title: "French Advance",
    side: "white",
    structure: "S-01",
    line: [
      "e4",
      "e6",
      "d4",
      "d5",
      "e5",
      "c5",
      "c3",
      "Nc6",
      "Nf3",
      "Bd7",
      "Be2",
      "Nge7",
      "O-O",
    ],
    card: {
      yours:
        "Hold d4 with c3 and pieces rather than passive defence, then use the space: Re1, Bf4 or Bg5, Nb1–d2–f1–g3, sometimes h4 and Nh2–g4. dxc5 followed by b4 is a real option when Black over-commits.",
      theirs:
        "...cxd4 and pressure on d4 with ...Qb6, ...Nf5 and ...Rc8; ...f6 against e5; and any chance to trade off the bad c8 bishop.",
      breaks:
        "Yours: c4 in some structures, f4–f5 if Black's king stays central. Theirs: ...c5 and ...f6.",
      placement:
        "Pawn c3, knight to e5 or via d2–f1–g3, bishop e3 or f4, rooks e1 and c1.",
      worstPiece:
        "Black's c8 bishop — the whole French. Your job is to keep it bad.",
      endgame:
        "Favourable if the e5 wedge survives and Black's light bishop never got out.",
      avoidTrade:
        "Do not let Black trade the light-squared bishop for free, and do not give up your dark-squared bishop while d4 still needs it.",
    },
  },
  {
    id: "O-05",
    title: "Caro-Kann Advance (White)",
    side: "white",
    structure: "S-01",
    line: [
      "e4",
      "c6",
      "d4",
      "d5",
      "e5",
      "Bf5",
      "Nf3",
      "e6",
      "Be2",
      "c5",
      "Be3",
      "Nc6",
      "O-O",
    ],
    card: {
      yours:
        "Support d4 with c3 or Be3, keep the e5 pawn, develop Nbd2 with Nb3 or Nh4 ideas, and use the kingside space patiently — the pawn on e5 already does the cramping.",
      theirs:
        "...c5 and ...Qb6 against d4, ...Nc6 and ...Nge7, then ...f6. Unlike the French, Black's light bishop is already outside the chain.",
      breaks: "Yours: dxc5 or c4. Theirs: ...c5 and ...f6.",
      placement:
        "Be3 or pawn c3 holding d4, Nbd2, rooks c1 and e1, a knight aiming at h4 or b3.",
      worstPiece: "Whichever knight has no route to d4, f4 or b3.",
      endgame:
        "Slightly better for you while e5 stands, but Black's structure is sound — do not expect a free endgame.",
      avoidTrade:
        "Do not exchange your light-squared bishop for Black's f5 bishop for free. That trade is his whole wish.",
      note: "The Advance Caro carries more concrete theory than its low-theory billing suggests. Expect to be tested in this line specifically.",
    },
  },
  {
    id: "O-06",
    title: "Scandinavian",
    side: "white",
    structure: "S-07",
    line: [
      "e4",
      "d5",
      "exd5",
      "Qxd5",
      "Nc3",
      "Qa5",
      "d4",
      "Nf6",
      "Nf3",
      "c6",
      "Bc4",
      "Bf5",
      "Bd2",
      "e6",
      "Qe2",
    ],
    card: {
      yours:
        "Bank the development lead: every move should gain a tempo on the queen or cover d5 and e4. Bd2 and Qe2 support Nd5 and a possible d4–d5; castle, connect, and open the centre while the queen is still awkward.",
      theirs:
        "Consolidate with ...c6, ...Bf5, ...e6 and ...Nbd7, retreat the queen to c7, and equalise slowly in a sound if passive position.",
      breaks: "d4–d5, plus Ne4 and Nd5 jumps that behave like breaks.",
      placement:
        "Both knights eyeing d5 and e5, Bc4 on the a2–g8 diagonal, Bd2 guarding c3 and enabling Nd5.",
      worstPiece: "The c1 bishop until Bd2 or Bf4 gives it a job.",
      endgame:
        "Fine for you, but extra tempi are a middlegame asset — spend them before they expire.",
      avoidTrade:
        "Do not trade your active pieces to reach a symmetrical endgame. That is Black's plan, not yours.",
    },
  },
  {
    id: "O-07",
    title: "Classical centre vs Pirc, Modern and Alekhine",
    side: "white",
    structure: "S-05",
    line: [
      "e4",
      "d6",
      "d4",
      "Nf6",
      "Nc3",
      "g6",
      "Nf3",
      "Bg7",
      "Be2",
      "O-O",
      "O-O",
    ],
    card: {
      yours:
        "Build the classical centre and hold it — e4, d4, Nc3, Nf3, Be2 or Be3, O-O, then Re1 and h3. Consider e5 or d5 only afterwards, and never start a wing attack while Black can still hit the centre.",
      theirs:
        "...c5 or ...e5 against d4, ...Nc6 or ...Nbd7 with ...Bg4, and queenside expansion with ...a6 and ...b5. Black wants you over-extended.",
      breaks:
        "e5 and d5 for you, ...c5 and ...e5 for Black. Whoever breaks without support usually regrets it.",
      placement:
        "Be3, Re1, pawn h3, queen d2; knights stay on c3 and f3 until a target appears.",
      worstPiece:
        "Your c1 bishop before Be3, and the a1 rook until the centre is settled.",
      endgame:
        "Comfortable — you hold more space, and Black's g7 bishop can end up biting on granite.",
      avoidTrade:
        "Do not exchange dark-squared bishops on Black's terms; the g7 bishop is his best piece.",
      note: "The same recipe answers the Alekhine after 1.e4 Nf6 2.e5 Nd5 3.d4 — develop and stabilise instead of chasing the knight.",
    },
  },
  {
    id: "O-08",
    title: "Caro-Kann Classical (3.Nc3 / 3.Nd2)",
    side: "black",
    structure: "S-04",
    line: [
      "e4",
      "c6",
      "d4",
      "d5",
      "Nc3",
      "dxe4",
      "Nxe4",
      "Bf5",
      "Ng3",
      "Bg6",
      "h4",
      "h6",
      "Nf3",
      "e6",
      "Bd3",
      "Bxd3",
      "Qxd3",
      "Nd7",
    ],
    card: {
      yours:
        "Get the light-squared bishop out before ...e6 shuts it in — that is the entire point of the Caro-Kann. Then ...e6, ...Nd7, ...Ngf6, ...Be7, ...O-O in that order, and aim for ...c5.",
      theirs:
        "h4–h5 to harass the bishop and take kingside space, Ne5 with Bf4 or Bd2, Qe2 and long castling, then a pawn storm.",
      breaks:
        "...c5 first, ...e5 second. Without one of them you are solid but passive.",
      placement:
        "Knights on d7 and f6, bishop e7, rooks c8 and d8 or e8, queen c7.",
      worstPiece:
        "The f8 bishop until ...e6 and ...Be7. Do not delay that development.",
      endgame:
        "Good for you — the structure is sound and there are no weaknesses to babysit.",
      avoidTrade:
        "Do not trade the g6 bishop for a knight unless it gains a tempo, and never let h5 trap it.",
    },
  },
  {
    id: "O-09",
    title: "Caro-Kann Advance (Black)",
    side: "black",
    structure: "S-01",
    line: [
      "e4",
      "c6",
      "d4",
      "d5",
      "e5",
      "Bf5",
      "Nf3",
      "e6",
      "Be2",
      "c5",
      "Be3",
      "Nc6",
      "O-O",
      "Nge7",
    ],
    card: {
      yours:
        "The bishop goes to f5 on move three, outside the chain — the structural gift the French never gets. Then hit the base with ...c5, pile on with ...Qb6, ...Nc6 and ...Nge7, and prepare ...f6 only once the pieces already press d4.",
      theirs:
        "Hold d4 with c3 and Be3, take kingside space, look for Nh4 to win the f5 bishop, or dxc5 followed by b4.",
      breaks: "...c5 and ...f6. The c5 break comes first, and almost always.",
      placement:
        "Bishop f5, retreating to g6 when hit; knights c6 and e7; queen b6; rook c8.",
      worstPiece:
        "The f8 bishop. ...Nge7 with ...Be7 or ...Ng6 sorts it out quickly.",
      endgame:
        "Good — you have no bad bishop, and White's e5 pawn becomes a target once the pieces come off.",
      avoidTrade:
        "Do not trade the f5 bishop for a knight for nothing. White wants exactly that.",
    },
  },
  {
    id: "O-10",
    title: "Caro-Kann Exchange",
    side: "black",
    structure: "S-07",
    line: [
      "e4",
      "c6",
      "d4",
      "d5",
      "exd5",
      "cxd5",
      "Bd3",
      "Nc6",
      "c3",
      "Nf6",
      "Bf4",
      "e6",
      "Nd2",
      "Bd6",
      "Bxd6",
      "Qxd6",
    ],
    card: {
      yours:
        "Develop actively — symmetry is not equality until your pieces are the better ones. Use the half-open c-file with ...Rc8 and ...Qc7, and a knight to b4 or a5 against the d3 bishop.",
      theirs:
        "Bd3, c3, Nf3 or Ne2 and quiet play, then Ne5 and a kingside build-up, or Qc2 pressuring h7 and contesting the c-file.",
      breaks:
        "...e5 once the pieces support it; occasionally ...f6 and ...e5 together.",
      placement:
        "Rook c8, queen c7, knights c6 and f6, bishop on f5 or g4 before ...e6 commits.",
      worstPiece: "The c8 bishop if ...e6 comes too early. Solve it first.",
      endgame: "Balanced. Piece activity, not structure, decides this one.",
      avoidTrade:
        "Do not trade into a dead-symmetrical endgame while your pieces are the passive ones.",
    },
  },
  {
    id: "O-11",
    title: "Panov Attack (Black)",
    side: "black",
    structure: "S-02",
    line: [
      "e4",
      "c6",
      "d4",
      "d5",
      "exd5",
      "cxd5",
      "c4",
      "Nf6",
      "Nc3",
      "e6",
      "Nf3",
      "Be7",
      "cxd5",
      "Nxd5",
      "Bd3",
      "Nc6",
      "O-O",
      "O-O",
    ],
    card: {
      yours:
        "White has the isolated d-pawn, so blockade d5 with a knight and keep it there, trade minor pieces, double on the d-file and steer for an endgame.",
      theirs:
        "Ne5, Bd3 and Re1 aiming at h7, the d5 push at the first opportunity, and every piece kept on the board.",
      breaks:
        "You do not need one — the exchange of pieces is your break. White's is d4–d5.",
      placement:
        "Knight d5 or f6, bishop e7 then f6 or e6, rooks d8 and c8, queen d6 or b6.",
      worstPiece:
        "The c8 bishop. ...b6 with ...Bb7, or ...Bd7–e6, gives it a diagonal.",
      endgame: "Very good for you. Reaching one is the whole plan.",
      avoidTrade:
        "Do not trade the blockading knight for White's bishop if it frees the d5 square.",
    },
  },
  {
    id: "O-12",
    title: "Queen's Gambit Declined, main shell",
    side: "black",
    structure: "S-04",
    line: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "Nf3",
      "Be7",
      "Bf4",
      "O-O",
      "e3",
      "Nbd7",
      "Rc1",
      "c6",
    ],
    card: {
      yours:
        "Complete development first — ...Nf6, ...Be7, ...O-O, ...Nbd7, ...c6 — then strike. Free the position with ...dxc4 followed by ...b5 and ...c5, or with ...e5 when White's pieces allow it.",
      theirs:
        "Central pressure with Bd3, Qc2 and e4, or the minority attack if the structure turns Carlsbad.",
      breaks:
        "...c5 and ...e5. The goal is not passive defence — it is development and then a break.",
      placement:
        "Rook e8, knights d7 and f6 or e8 and d6, bishop e7, queen c7 or a5.",
      worstPiece:
        "The c8 bishop. ...dxc4 with ...b6 and ...Bb7 is the standard cure.",
      endgame:
        "Sound — no structural weakness. The danger is inactivity, not the pawns.",
      avoidTrade:
        "Do not trade the e7 bishop for a knight while the queenside is undeveloped.",
    },
  },
  {
    id: "O-13",
    title: "Queen's Gambit Declined, Exchange (Carlsbad)",
    side: "black",
    structure: "S-03",
    line: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "cxd5",
      "exd5",
      "Bg5",
      "Be7",
      "e3",
      "O-O",
      "Bd3",
      "Nbd7",
      "Nf3",
      "c6",
    ],
    card: {
      yours:
        "Expect b4–b5. Prepare ...a6 and ...Rb8, or answer b5 with ...c5 or ...axb5. Reroute with ...Ne8–d6 and ...Nf8–e6, and counter with ...Ne4 in the centre or on the kingside once White commits.",
      theirs:
        "The minority attack — b4, Rb1, b5 — to leave you a backward c-pawn on a half-open file. Otherwise Ne5 with f3 and e4.",
      breaks:
        "White: b5. You: ...c5, which frees you at the cost of an isolated d-pawn, plus ...Ne4 as a piece break.",
      placement:
        "Knights heading for d6 and e6, rook e8, bishop e7 or d6, queen c7.",
      worstPiece:
        "The c8 bishop until ...Bf5 or ...Be6 — and any piece tied to defending c6.",
      endgame:
        "Dangerous if White lands the minority attack: the c6 pawn becomes permanent.",
      avoidTrade:
        "Do not trade off the pieces guarding c6 before you have an answer to b5.",
    },
  },
  {
    id: "O-14",
    title: "London System, 1.Nf3 and 1.c4",
    side: "black",
    structure: "S-07",
    line: [
      "d4",
      "d5",
      "Nf3",
      "Nf6",
      "Bf4",
      "e6",
      "e3",
      "c5",
      "c3",
      "Nc6",
      "Nbd2",
      "Bd6",
      "Bg3",
      "O-O",
    ],
    card: {
      yours:
        "Do not mirror White's setup. Question the d4/e3 chain with ...c5 straight away, offer the trade with ...Bd6, then ...O-O, ...Qc7 or ...b6, and pressure on the queenside.",
      theirs:
        "Bd3, Nbd2, Ne5 and a slow kingside build-up with Qf3 and h4, or Bxd6 followed by e4.",
      breaks: "...c5 first, then ...e5 or ...cxd4 to open the c-file.",
      placement:
        "Bishop d6, knights c6 and f6, rook c8, queen c7 or b6, and ...Bb7 after ...cxd4.",
      worstPiece:
        "The c8 bishop. ...b6 with ...Bb7 after ...cxd4, or ...Bd7–e8, is the cure.",
      endgame: "Balanced; the half-open c-file is your long-term asset.",
      avoidTrade:
        "Do not allow Bxd6 for free if it hands White the e5 square and the e4 push.",
      note: "1.Nf3 and 1.c4 transpose into the same shell: answer with ...d5 and ...e6 and steer for these structures.",
    },
  },
];

/** Every tabiya card, tiers 4 and 5, in curriculum order. */
export const TABIYA = Object.freeze([...STRUCTURES, ...OPENINGS]);
