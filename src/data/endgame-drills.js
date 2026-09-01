/**
 * Endgame play-out drills for curriculum tier 3.
 *
 * Unlike puzzle positions these have no solution line — the student plays the
 * position out against Stockfish at full strength and the outcome is detected.
 *
 * Every FEN here is certified by `npm run verify:endgames`, which checks that
 * the position is legal, is not already finished, and that the engine's verdict
 * actually matches the declared goal. That gate exists because the original
 * `endgames.js` data did not survive it: a "two bishops mate" had both bishops
 * on dark squares (unwinnable), a "wrong-coloured bishop" draw had no pawn at
 * all, and several K+P endings labelled "promote" are dead drawn against
 * correct defence — drills the student could never complete.
 *
 * Goals are deliberately reduced to two objectively detectable outcomes:
 * WIN   – reach checkmate within the move budget
 * HOLD  – reach a draw, or survive the budget without losing
 *
 * Each drill:
 * id           – unique key
 * itemId       – curriculum item this drill teaches
 * fen          – start position; the side to move is always the student
 * goal         – GOAL.WIN | GOAL.HOLD
 * studentColor – "white" | "black", must match the side to move
 * maxMoves     – student moves allowed before the drill is scored
 * prompt       – what the student is being asked to do
 * concept      – the one idea this position exists to teach
 */

/** Objectively detectable drill outcomes. */
export const GOAL = Object.freeze({
  WIN: "win",
  HOLD: "hold",
});

export const ENDGAME_DRILLS = [
  // ── E-01 King and queen vs king ────────────────────────────────────────────
  {
    id: "kqk-black",
    itemId: "E-01",
    fen: "8/8/8/8/5k2/6q1/8/7K b - - 0 1",
    goal: GOAL.WIN,
    studentColor: "black",
    maxMoves: 10,
    prompt: "Mate the white king. It is already cornered.",
    concept: "Box the king with the queen, then bring your own king.",
  },
  {
    id: "kqk-centre",
    itemId: "E-01",
    fen: "8/8/8/3k4/8/3K4/8/Q7 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt: "Mate the black king from the centre. Avoid stalemate.",
    concept: "Shrink the box a rank at a time; never stalemate.",
  },

  // ── E-02 King and rook vs king ─────────────────────────────────────────────
  {
    id: "krk-corner",
    itemId: "E-02",
    fen: "8/8/8/8/8/2k5/8/R1K5 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 35,
    prompt: "Mate with king and rook.",
    concept: "Cut the king off, take the opposition, deliver on the edge.",
  },
  {
    id: "krk-open",
    itemId: "E-02",
    fen: "8/8/8/4k3/8/8/8/R3K3 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 40,
    prompt: "Mate with king and rook from an open position.",
    concept: "Build the box with the rook, walk the king up.",
  },

  // ── E-03 Two bishops vs king ───────────────────────────────────────────────
  {
    id: "two-bishops",
    itemId: "E-03",
    fen: "8/8/8/3k4/8/8/8/2BBK3 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 45,
    prompt: "Mate with the two bishops.",
    concept:
      "Bishops on adjacent diagonals build a wall; the king drives from behind.",
  },

  // ── E-04 Opposition ────────────────────────────────────────────────────────
  {
    id: "opposition-blocked",
    itemId: "E-04",
    fen: "8/8/8/3k4/3P4/3K4/8/8 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt:
      "You are a pawn up, but Black holds the opposition. Hold the draw and see why the extra pawn does not win.",
    concept: "Without the opposition the extra pawn is not enough.",
  },
  {
    id: "opposition-stalemate",
    itemId: "E-04",
    fen: "8/8/8/8/8/k7/p7/K7 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 15,
    prompt: "You have an extra pawn but only a draw. Avoid stalemating White.",
    concept: "The rook pawn plus a trapped king is a stalemate draw.",
  },

  // ── E-05 Key squares ───────────────────────────────────────────────────────
  {
    id: "key-squares-win",
    itemId: "E-05",
    fen: "8/8/3K4/3P4/8/3k4/8/8 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt: "Your king has reached a key square. Convert it.",
    concept: "King on the sixth ahead of the pawn wins regardless of turn.",
  },

  // ── E-06 Rule of the square ────────────────────────────────────────────────
  {
    id: "square-race",
    itemId: "E-06",
    fen: "7k/8/8/8/8/8/P7/7K w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 25,
    prompt: "Is the black king inside the square of the pawn? Run it.",
    concept: "Draw the square to judge a pawn race at a glance.",
  },

  // ── E-07 Distant and diagonal opposition ───────────────────────────────────
  {
    id: "triangulation",
    itemId: "E-07",
    fen: "8/8/3k4/3P4/8/3K4/8/8 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 20,
    prompt: "Hold the draw against the extra pawn by keeping the opposition.",
    concept: "Whoever must give ground loses the opposition.",
  },
  {
    id: "king-march",
    itemId: "E-07",
    fen: "8/5p2/6k1/8/8/6K1/5P2/8 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt: "A symmetrical race. Hold the balance with correct king play.",
    concept: "Mirror the enemy king to keep the distant opposition.",
  },

  // ── E-08 Trébuchet and mutual zugzwang ─────────────────────────────────────
  {
    id: "trebuchet",
    itemId: "E-08",
    fen: "8/8/p1k5/8/8/K7/8/8 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt: "You are a pawn down. Hold the draw.",
    concept: "Whoever must move first in a mutual zugzwang gives way.",
  },

  // ── E-09 Creating a passer from a majority ─────────────────────────────────
  {
    id: "pawn-breakthrough",
    itemId: "E-09",
    fen: "8/ppp5/8/PPP5/8/8/8/4K1k1 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 20,
    prompt: "Three against three. Force a passed pawn through.",
    concept: "The middle pawn breaks first; sacrifice to clear the path.",
  },

  // ── E-10 Lucena ────────────────────────────────────────────────────────────
  {
    id: "lucena",
    itemId: "E-10",
    fen: "1K1k4/1P6/8/8/8/8/r7/4R3 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt: "Build the bridge and promote.",
    concept: "Rook to the fourth rank, then shelter the king from checks.",
  },

  // ── E-11 Philidor ──────────────────────────────────────────────────────────
  {
    id: "philidor",
    itemId: "E-11",
    fen: "8/4k3/1r6/4P3/4K3/8/8/R7 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt: "Hold the third-rank defence, then check from behind.",
    concept: "Sit on the sixth until the pawn advances, then check from afar.",
  },

  // ── E-12 Short-side and long-side defence ──────────────────────────────────
  {
    id: "short-side-defence",
    itemId: "E-12",
    fen: "4k3/1R6/4P3/4K3/8/8/8/r7 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt:
      "Your king is in front of the pawn and your rook has the long side. Hold the draw.",
    concept: "Keep the rook on the long side for checking distance.",
  },

  // ── E-13 Rook behind the passed pawn ───────────────────────────────────────
  {
    id: "rook-behind-passer",
    itemId: "E-13",
    fen: "r7/5k2/8/1P6/8/2K5/8/1R6 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 40,
    prompt: "Your rook is behind your passer. Escort it home.",
    concept: "Tarrasch: rooks belong behind passed pawns, yours and theirs.",
  },
  {
    id: "rook-active-king",
    itemId: "E-13",
    fen: "5r2/8/5k2/8/8/4K3/8/3R4 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt: "Level material. Keep the balance with active pieces.",
    concept: "An active rook and centralised king hold equal rook endings.",
  },

  // ── E-14 Rook vs advanced passed pawn ──────────────────────────────────────
  {
    id: "rook-vs-pawn",
    itemId: "E-14",
    fen: "8/8/8/8/8/2k5/2p5/2K3R1 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 50,
    prompt: "The pawn is one step from queening. Stop it, win it, then mate.",
    concept: "Blockade first; give the rook for the pawn when you must.",
  },

  // ── E-15 Wrong-coloured bishop and rook pawn ───────────────────────────────
  {
    id: "wrong-bishop",
    itemId: "E-15",
    fen: "7k/8/8/7P/4B3/8/8/6K1 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 15,
    prompt:
      "White has a bishop and a pawn. Head for the corner the bishop cannot cover.",
    concept: "A rook pawn plus the wrong-coloured bishop is only a draw.",
  },

  // ── E-16 Opposite-coloured bishops ─────────────────────────────────────────
  {
    id: "opposite-bishops",
    itemId: "E-16",
    fen: "8/8/4k3/2b5/2P1P3/3B4/4K3/8 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt: "Two pawns down with opposite bishops. Blockade and hold.",
    concept: "Blockade on the colour your own bishop controls.",
  },

  // ── E-17 Bishop versus knight ──────────────────────────────────────────────
  {
    id: "bishop-vs-knight",
    itemId: "E-17",
    fen: "8/5pk1/8/3n4/8/3B2K1/5P1P/8 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 30,
    prompt:
      "Bishop against knight, level material. Hold the balance and feel where each piece is strong.",
    concept:
      "A bishop is not automatically better; the pawn structure decides.",
  },

  // ── E-18 Queen versus pawn on the seventh ──────────────────────────────────
  {
    id: "queen-vs-knight-pawn",
    itemId: "E-18",
    fen: "7K/8/8/8/8/7Q/1p6/1k6 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 40,
    prompt: "Stop the knight pawn and win it.",
    concept: "Check to force the king in front of its own pawn, then approach.",
  },
  {
    id: "queen-vs-rook-pawn",
    itemId: "E-18",
    fen: "7K/8/8/8/8/7Q/p7/k7 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt:
      "The same technique fails here. Find out why and settle for the draw.",
    concept: "Rook and bishop pawns escape by stalemate.",
  },

  // ── T-34 Stalemate resource ────────────────────────────────────────────────
  // Tier 1, not tier 3, but the drill has to be a play-out: a stalemate save is
  // a *mechanism* you have to steer towards over several moves, and there is no
  // single move to grade. The Lichess importer finds nothing for this item
  // because Lichess puzzles are never solved by having no move at all.
  {
    id: "stalemate-corner-rook-pawn",
    itemId: "T-34",
    fen: "8/8/8/8/8/6kp/8/7K w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt:
      "A pawn down with nothing else on the board. Head for the one square that draws.",
    concept:
      "In the corner in front of a rook pawn, having no legal move is the draw.",
  },
  {
    id: "stalemate-queen-vs-rook-pawn",
    itemId: "T-34",
    fen: "7K/8/8/8/8/7Q/p7/k7 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 20,
    prompt:
      "A whole queen down, with a pawn one square from promoting. Do not run — let yourself be sealed in.",
    concept:
      "A king with no legal move and no check is a draw, however much material is missing.",
  },

  // ── T-35 Fortress ─────────────────────────────────────────────────────────
  // Same reasoning as T-34: a fortress is held, not found.
  {
    id: "fortress-bishop-holds-promotion-square",
    itemId: "T-35",
    fen: "8/8/5B2/2K5/8/pk6/8/8 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 24,
    prompt:
      "Black's pawn is two squares from promoting and you have only a bishop. Stop it permanently instead of chasing it.",
    concept:
      "A bishop that controls the promotion square makes the pawn worthless forever.",
  },
  {
    id: "fortress-opposite-bishops-blockade",
    itemId: "T-35",
    fen: "8/8/5b2/3k4/3p4/3K4/8/5B2 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt:
      "A pawn down with opposite-coloured bishops. Keep the king on the blockade square and the extra pawn never matters.",
    concept:
      "With opposite-coloured bishops, a blockade on a square the enemy bishop can never attack cannot be broken. Recognise one and stop calculating.",
  },
];

/** Curriculum item id → its endgame drills. */
export const DRILLS_BY_ITEM = ENDGAME_DRILLS.reduce((map, drill) => {
  (map[drill.itemId] ??= []).push(drill);
  return map;
}, {});

export default ENDGAME_DRILLS;
