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

  {
    id: "kqk-far-corner",
    itemId: "E-01",
    fen: "8/8/8/2k5/8/8/8/Q6K w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt: "Queen and king against a bare king in the centre. Mate it.",
    concept:
      "Cut the king's space with the queen a rank at a time, then walk your own king up to finish.",
  },
  {
    id: "kqk-black-open",
    itemId: "E-01",
    fen: "8/8/8/8/1k6/8/q7/7K b - - 0 1",
    goal: GOAL.WIN,
    studentColor: "black",
    maxMoves: 25,
    prompt: "You have queen and king against a bare king. Mate it.",
    concept:
      "The same box works from either colour; the queen needs no checks at all until your king arrives.",
  },
  {
    id: "kqk-stalemate-trap",
    itemId: "E-01",
    fen: "7k/8/6Q1/8/8/8/8/K7 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 25,
    prompt:
      "The king is already in the corner and your queen is a knight's move away. Bring your own king up without stalemating.",
    concept:
      "A queen a knight's move from the enemy king confines it perfectly. Leave it there and walk the king over.",
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

  {
    id: "krk-black",
    itemId: "E-02",
    fen: "3r4/8/8/8/8/3k4/8/4K3 b - - 0 1",
    goal: GOAL.WIN,
    studentColor: "black",
    maxMoves: 30,
    prompt: "Rook and king against a bare king. Mate it.",
    concept:
      "The rook draws the line the enemy king may not cross; your king does the pushing.",
  },
  {
    id: "krk-cut-off",
    itemId: "E-02",
    fen: "8/8/8/2k5/8/8/8/R3K3 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 35,
    prompt: "Cut the black king off first, then shrink the box.",
    concept:
      "Every rook move should make the box smaller or hold it. Never chase with checks.",
  },
  {
    id: "krk-edge-finish",
    itemId: "E-02",
    fen: "8/8/8/8/8/1k6/8/1K5R w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 20,
    prompt:
      "The king is already on the edge and you have the opposition. Finish it.",
    concept:
      "Opposition plus a rook check along the edge rank is the whole mating pattern.",
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

  {
    id: "two-bishops-open",
    itemId: "E-03",
    fen: "8/8/8/8/4k3/8/8/2B1KB2 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 50,
    prompt:
      "Two bishops against a bare king, everything still at home. Mate it.",
    concept:
      "Put the bishops on adjacent diagonals to build a wall, then push the wall forward with the king.",
  },
  {
    id: "two-bishops-black",
    itemId: "E-03",
    fen: "2bbk3/8/8/4K3/8/8/8/8 b - - 0 1",
    goal: GOAL.WIN,
    studentColor: "black",
    maxMoves: 50,
    prompt: "Two bishops against a bare king. Drive it to a corner.",
    concept:
      "Any corner will do. Unlike bishop and knight, two bishops cover both colours between them.",
  },
  {
    id: "two-bishops-corner",
    itemId: "E-03",
    fen: "k7/8/1K6/8/8/8/8/2BB4 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 20,
    prompt:
      "The king is in the corner and yours is holding it there. Deliver mate.",
    concept:
      "With the king confined, one bishop takes the escape square and the other gives mate.",
  },
  {
    id: "two-bishops-kingside",
    itemId: "E-03",
    fen: "8/8/8/3k4/8/8/8/3K1BB1 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 50,
    prompt:
      "Both bishops undeveloped, the enemy king central. Mate it inside the move budget.",
    concept:
      "Bishops confine, king drives. Done in that order it is never close to the fifty-move limit.",
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

  {
    id: "opposition-seize",
    itemId: "E-04",
    fen: "8/8/8/3k4/8/4K3/3P4/8 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt: "One move decides this. Take the opposition, then escort the pawn.",
    concept:
      "Step in front of the pawn facing the enemy king with one square between: he has to give ground.",
  },
  {
    id: "opposition-front-hold",
    itemId: "E-04",
    fen: "8/8/8/8/3k4/8/3P4/3K4 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 20,
    prompt: "You are a pawn down with your king in front of it. Hold the draw.",
    concept:
      "The king in front of the pawn holds, provided you keep taking the opposition instead of stepping aside.",
  },
  {
    id: "opposition-blockade",
    itemId: "E-04",
    fen: "8/8/8/8/8/3k4/3P4/3K4 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 20,
    prompt:
      "You are blockading the pawn from directly in front. Do not let White past.",
    concept:
      "A pawn whose own king cannot get in front of it never promotes. Step back to the same file each time.",
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

  {
    id: "key-squares-sixth",
    itemId: "E-05",
    fen: "8/8/2K5/2P5/8/2k5/8/8 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt:
      "Your king already stands on a key square. Convert without needing the opposition.",
    concept:
      "King on the sixth ahead of its own pawn wins whoever is to move. That is what a key square means.",
  },
  {
    id: "key-squares-e-file",
    itemId: "E-05",
    fen: "8/8/4K3/4P3/8/4k3/8/8 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 25,
    prompt: "Same key square, different file. Promote the pawn.",
    concept:
      "For a pawn on the fifth the key squares are the three squares on the sixth rank around it.",
  },
  {
    id: "key-squares-black",
    itemId: "E-05",
    fen: "8/8/2K5/8/2p5/2k5/8/8 b - - 0 1",
    goal: GOAL.WIN,
    studentColor: "black",
    maxMoves: 30,
    prompt:
      "Your king is ahead of your own pawn on a key square. Bring it home.",
    concept:
      "Key squares mirror exactly: for Black the third rank does the job White's sixth does.",
  },
  {
    id: "key-squares-rook-pawn",
    itemId: "E-05",
    fen: "1k6/8/K7/P7/8/8/8/8 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt:
      "Your king is ahead of your pawn and Black's is not. Push it and find out why this is still only a draw.",
    concept:
      "A rook pawn has no key squares: there is no file on the far side for the king to use, so the defender just sits in the corner.",
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

  {
    id: "square-race-black",
    itemId: "E-06",
    fen: "7k/p7/8/8/8/8/8/7K b - - 0 1",
    goal: GOAL.WIN,
    studentColor: "black",
    maxMoves: 25,
    prompt:
      "Count the square before you push. Can the white king catch this pawn?",
    concept:
      "Draw the square from the pawn to its promotion rank. If the enemy king is outside it and not to move, the pawn runs.",
  },
  {
    id: "square-just-outside",
    itemId: "E-06",
    fen: "8/8/8/8/7k/8/1P6/7K w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 25,
    prompt:
      "The black king looks close enough to catch this. Draw the square and check again.",
    concept:
      "A pawn still on its second rank draws its square from the fourth. The double step is worth a whole file of catching distance.",
  },
  {
    id: "square-just-inside",
    itemId: "E-06",
    fen: "8/8/8/8/6k1/8/1P6/7K b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 20,
    prompt:
      "One file closer than the previous drill, and that flips the verdict. Catch the pawn.",
    concept:
      "Inside the square means the king arrives in time. Step diagonally toward the promotion square, never sideways.",
  },
  {
    id: "square-catch-a-pawn",
    itemId: "E-06",
    fen: "8/8/8/8/3k4/8/P7/7K b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 20,
    prompt: "A rook pawn on the far wing. Judge the square and run it down.",
    concept:
      "The square is the only calculation this needs. Once you trust it, pawn races stop costing you clock time.",
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

  {
    id: "distant-opposition-win",
    itemId: "E-07",
    fen: "8/8/8/8/8/8/4P3/4K2k w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt:
      "The black king is a long way from your pawn. Count the race before you push anything.",
    concept:
      "Distance is counted, not felt: if the enemy king cannot reach the pawn's file in time, the opposition never comes up at all.",
  },
  {
    id: "distant-opposition-hold",
    itemId: "E-07",
    fen: "8/4k3/8/8/8/8/4P3/4K3 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt:
      "You are a pawn down but you already hold the distant opposition. Keep it and hold the draw.",
    concept:
      "Answer every king move by restoring the same-file, odd-gap relationship and White never makes progress.",
  },
  {
    id: "diagonal-opposition",
    itemId: "E-07",
    fen: "8/8/8/8/2k5/8/4P3/3K4 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt:
      "The kings face each other on a diagonal, not a file. Take the opposition and hold the draw.",
    concept:
      "Diagonal opposition is the same rule turned forty-five degrees: an odd gap along the diagonal with the opponent to move.",
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

  {
    id: "mutual-zugzwang-blocked",
    itemId: "E-08",
    fen: "8/8/8/1k1p4/3P4/2K5/8/8 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt:
      "The pawns are locked and neither king can be improved. Do not be the one who gives way.",
    concept:
      "When every move worsens your position you are in zugzwang. Recognise it early and steer for the repetition.",
  },
  {
    id: "zugzwang-front-block",
    itemId: "E-08",
    fen: "8/8/8/8/1k6/1p6/8/1K6 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt: "A pawn down with your king directly in front of it. Hold.",
    concept:
      "The defender holds by never leaving the pawn's file. It is the attacker who runs out of useful moves.",
  },
  {
    id: "zugzwang-tempo",
    itemId: "E-08",
    fen: "8/8/8/8/1k1p4/8/3P4/3K4 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt:
      "One pawn each and neither can be defended by force. Find the drawing shuffle.",
    concept:
      "Count who runs out of waiting moves first. That count, not the material, decides these positions.",
  },
  {
    id: "trebuchet-step-in",
    itemId: "E-08",
    fen: "8/8/8/1K1p4/3Pk3/8/8/8 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt:
      "One king move turns this into a position where whoever moves loses — and it will be Black's turn. Find it.",
    concept:
      "A trebuchet is only useful if you are the one handing it over. Step in with a tempo to spare, never a tempo short.",
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

  {
    id: "majority-3v2-queenside",
    itemId: "E-09",
    fen: "8/1pp5/8/8/8/8/PPP5/K5k1 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 25,
    prompt:
      "Three pawns against two on one wing, kings out of play. Make a passer.",
    concept:
      "Push the pawn that has no opponent facing it first. The unopposed pawn is the one that becomes the passer.",
  },
  {
    id: "majority-black",
    itemId: "E-09",
    fen: "6K1/ppp5/8/8/8/8/1PP5/k7 b - - 0 1",
    goal: GOAL.WIN,
    studentColor: "black",
    maxMoves: 25,
    prompt: "You hold the queenside majority. Turn it into a passed pawn.",
    concept:
      "Candidate first, and never push the pawn that lets the defender trade its way out of the majority.",
  },
  {
    id: "majority-4v3-kingside",
    itemId: "E-09",
    fen: "6k1/5ppp/8/8/8/8/4PPPP/6K1 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 35,
    prompt:
      "Four against three on the kingside with both kings nearby. Create the passer and escort it.",
    concept:
      "A healthy majority is a won ending, but the king has to join: a passer on its own rarely queens.",
  },
  {
    id: "majority-crippled",
    itemId: "E-09",
    fen: "6k1/5ppp/8/8/8/5P2/5PPP/6K1 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 35,
    prompt:
      "Four pawns against three, but yours are doubled, so the majority will not make a passer on its own. Win anyway.",
    concept:
      "Count healthy pawns, not pawns. A doubled majority still wins, but the king has to do the work the passer would have done.",
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

  {
    id: "lucena-textbook",
    itemId: "E-10",
    fen: "3K4/3P1k2/8/8/8/8/r7/4R3 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt:
      "Your king is stuck in front of its own pawn and the black rook will check forever. Build the bridge.",
    concept:
      "Rook to the fourth rank first. Then the king walks out and the rook interposes against the last check.",
  },
  {
    id: "lucena-black",
    itemId: "E-10",
    fen: "4r3/R7/8/8/8/8/3p1K2/3k4 b - - 0 1",
    goal: GOAL.WIN,
    studentColor: "black",
    maxMoves: 30,
    prompt:
      "The same technique from the other side. Shelter your king and promote.",
    concept:
      "The bridge is a fixed four-move recipe. Learn it as moves, not as ideas.",
  },
  {
    id: "lucena-bridge-set",
    itemId: "E-10",
    fen: "3K4/3P1k2/8/8/4R3/8/r7/8 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 25,
    prompt: "The rook is already on the fourth rank. Take it from here.",
    concept:
      "With the rook posted, every check is answered by stepping toward it until the rook can block.",
  },
  {
    id: "lucena-knight-pawn",
    itemId: "E-10",
    fen: "1K6/1P3k2/8/8/8/8/r7/2R5 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt:
      "A knight pawn instead of a centre pawn. The bridge still works. Find it.",
    concept:
      "The bridge needs three files of space on one side, and a knight pawn just barely has them.",
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

  {
    id: "philidor-d-file",
    itemId: "E-11",
    fen: "8/3k4/1r6/3P4/3K4/8/8/R7 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt:
      "Your rook is on the sixth rank and the pawn has not advanced yet. Hold the draw.",
    concept:
      "Sit on the rank three in front of the pawn: while it stays put, the enemy king cannot come forward.",
  },
  {
    id: "philidor-white-defends",
    itemId: "E-11",
    fen: "r7/8/8/3k4/3p4/1R6/3K4/8 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 25,
    prompt:
      "You are the defender for once. Set up the third-rank defence and hold.",
    concept:
      "The method is colour-blind: rook on the rank three in front of the pawn, king in front of the pawn.",
  },
  {
    id: "philidor-check-from-behind",
    itemId: "E-11",
    fen: "8/4k3/4P3/4K3/8/8/7R/r7 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt:
      "The pawn has advanced, so the third rank is no longer the answer. Check from behind instead.",
    concept:
      "Once the pawn reaches the sixth the enemy king has no shelter. Start checking from the far end of the board.",
  },
  {
    id: "philidor-f-file",
    itemId: "E-11",
    fen: "8/5k2/2r5/5P2/5K2/8/8/R7 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt: "Third-rank defence again, this time against an f-pawn. Hold it.",
    concept:
      "The rook does not have to sit on the pawn's file. Anywhere on that rank does the same job.",
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

  {
    id: "short-side-defence-white",
    itemId: "E-12",
    fen: "R7/8/8/8/4k3/4p3/1r6/4K3 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 25,
    prompt:
      "Your king is in front of the pawn and your rook has the long side. Hold the draw.",
    concept:
      "King to the short side, rook to the long side: the rook needs at least three files for its checks to bite.",
  },
  {
    id: "long-side-checking-distance",
    itemId: "E-12",
    fen: "5k2/2R5/5P2/5K2/8/8/8/r7 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt: "Your rook is far from the pawn on purpose. Use the distance.",
    concept:
      "Checking distance is counted in files between your rook and the enemy king. Three is enough, one is not.",
  },
  {
    id: "long-side-d-pawn",
    itemId: "E-12",
    fen: "3k4/1R6/3P4/3K4/8/8/8/7r b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt:
      "A d-pawn, so the long side is the kingside. Your rook is already there. Hold.",
    concept:
      "Work out which side is longer before the king commits. With a d-pawn it is the e- to h-files.",
  },
  {
    id: "long-side-c-pawn",
    itemId: "E-12",
    fen: "2k5/1R6/2P5/2K5/8/8/8/7r b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt: "A c-pawn leaves only two files on the short side. Hold anyway.",
    concept:
      "The short side only needs room for the king to step aside. The long side is where the checks come from.",
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

  {
    id: "rook-behind-enemy-passer",
    itemId: "E-13",
    fen: "7r/8/8/8/8/1p3k2/8/1R2K3 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 25,
    prompt:
      "Black has a passed pawn and your rook is behind it. Hold the draw.",
    concept:
      "Tarrasch's rule cuts both ways: behind the enemy passer, your rook gains scope as the pawn advances.",
  },
  {
    id: "rook-behind-passer-black",
    itemId: "E-13",
    fen: "1r6/8/2k5/8/1p6/8/5K2/R7 b - - 0 1",
    goal: GOAL.WIN,
    studentColor: "black",
    maxMoves: 40,
    prompt:
      "Your rook is behind your own passer and White's is in front of it. Convert.",
    concept:
      "The rook behind gains squares as the pawn advances; the rook in front loses them.",
  },
  {
    id: "rook-behind-passer-far",
    itemId: "E-13",
    fen: "r7/8/8/8/1P6/8/1R6/4K1k1 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 40,
    prompt:
      "Rook behind the pawn, black rook in front of it, kings far away. Push it through.",
    concept:
      "This is the standard winning structure. Get the rook behind before you start pushing, not after.",
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

  {
    id: "rook-wins-loose-pawn",
    itemId: "E-14",
    fen: "5k2/8/8/8/8/8/2p5/2K3R1 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt:
      "The pawn is one square from queening but nothing defends it. Take it, then mate.",
    concept:
      "Check the pawn's defender first: an unsupported pawn on the seventh is still just a pawn.",
  },
  {
    id: "rook-blockades-then-wins",
    itemId: "E-14",
    fen: "5k2/8/8/8/8/8/5p2/5K1R w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt:
      "Your king is already in front of the pawn. Collect it and convert.",
    concept:
      "The king blockades and the rook mates. Trying it the other way round is what loses these endings.",
  },
  {
    id: "rook-vs-pawn-black",
    itemId: "E-14",
    fen: "2k3r1/2P5/2K5/8/8/8/8/8 b - - 0 1",
    goal: GOAL.WIN,
    studentColor: "black",
    maxMoves: 50,
    prompt:
      "White's pawn is on the seventh and its king is defending it. Win it anyway.",
    concept:
      "Attack the pawn from behind with the rook and drive the king off it with your own.",
  },
  {
    id: "rook-runs-pawn-down",
    itemId: "E-14",
    fen: "8/8/8/7k/8/8/1p6/1K4R1 w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 30,
    prompt: "The black king is too far away to help its pawn. Deal with it.",
    concept:
      "When the defending king is out of range, king and rook simply collect the pawn. No sacrifice needed.",
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

  {
    id: "wrong-bishop-white-holds",
    itemId: "E-15",
    fen: "8/8/8/8/8/6kp/8/b6K w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt:
      "A bishop and a rook pawn against your bare king. Stay exactly where you are.",
    concept:
      "If the bishop cannot control the promotion square, the corner is a fortress. Walk in and never leave.",
  },
  {
    id: "wrong-bishop-a-pawn",
    itemId: "E-15",
    fen: "k7/8/P7/8/3B4/8/8/6K1 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 15,
    prompt:
      "White has bishop and a-pawn. Your king is already on the right square, so keep it there.",
    concept:
      "The a8 corner is light; a dark-squared bishop can never evict a king that refuses to leave it.",
  },
  {
    id: "wrong-bishop-mirror",
    itemId: "E-15",
    fen: "6k1/8/8/4b3/7p/8/8/7K w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 15,
    prompt:
      "Black has bishop and h-pawn against your bare king. Find the drawing square.",
    concept:
      "Head for the corner in front of the pawn and compare its colour with the bishop's. That is the whole assessment.",
  },
  {
    id: "wrong-bishop-run-for-it",
    itemId: "E-15",
    fen: "8/6k1/8/7P/4B3/8/8/6K1 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 15,
    prompt: "You are not in the corner yet. Get there before the pawn does.",
    concept:
      "Recognising the draw is worth nothing if the king has already walked the wrong way. Head for the corner immediately.",
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

  {
    id: "opposite-bishops-white-holds",
    itemId: "E-16",
    fen: "8/4k3/3b4/2p1p3/2B5/4K3/8/8 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 25,
    prompt:
      "Two pawns down with bishops of opposite colour. Set up the blockade.",
    concept:
      "Put the blockade on squares your own bishop controls; the enemy bishop can then never dislodge it.",
  },
  {
    id: "opposite-bishops-two-connected",
    itemId: "E-16",
    fen: "8/8/8/2k5/2P1P3/8/3B4/3b1K2 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt:
      "Two connected passers against your bishop and king. Stop them both.",
    concept:
      "One pawn is stopped by the bishop, the other by the king. With opposite bishops that division of labour is usually enough.",
  },
  {
    id: "opposite-bishops-far-bishop",
    itemId: "E-16",
    fen: "5b2/8/3k4/8/1PP5/8/4B3/4K3 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 25,
    prompt:
      "Your bishop is on the far side of the board. Get it onto the blockading diagonal in time.",
    concept:
      "With opposite bishops the defence is a diagonal, not a square. Pick the long one and the pawns never move again.",
  },
  {
    id: "opposite-bishops-defend-white",
    itemId: "E-16",
    fen: "8/4k3/8/8/2pp4/1B6/8/4K1b1 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 25,
    prompt: "Two pawns down again, this time as White. Blockade and hold.",
    concept:
      "Two extra pawns with opposite bishops is usually not a win. Stop calculating and start blockading.",
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

  {
    id: "bishop-vs-knight-both-wings",
    itemId: "E-17",
    fen: "8/p4pkp/8/2n5/8/6K1/P4P1P/3B4 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 30,
    prompt: "Bishop against knight with pawns on both wings. Keep the balance.",
    concept:
      "Pawns on both wings favour the bishop, but only if you actually create play on both. Otherwise it is just a draw.",
  },
  {
    id: "knight-vs-bishop-black",
    itemId: "E-17",
    fen: "3b4/p4p1p/6k1/8/2N5/8/P4PKP/8 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 30,
    prompt:
      "Now you hold the bishop and White has the knight. Hold the balance.",
    concept:
      "Judge the trade by the pawn structure, not by the piece. With everything on one wing the knight is fine.",
  },
  {
    id: "knight-in-closed-position",
    itemId: "E-17",
    fen: "8/3k1b2/3p4/2pPp3/2P1P3/8/3N4/3K4 w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 30,
    prompt:
      "A locked pawn chain, knight against bishop. Hold, and notice which piece has the moves.",
    concept:
      "Fixed pawns on one colour blunt the bishop; the knight hops over the chain and is at least its equal.",
  },
  {
    id: "bishop-open-position",
    itemId: "E-17",
    fen: "8/5p2/4k3/8/1b6/8/4KP2/5N2 b - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "black",
    maxMoves: 30,
    prompt:
      "An open board, bishop against knight, one pawn each. Hold the balance.",
    concept:
      "The bishop's range only matters when there is something on both sides of the board to hit.",
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

  {
    id: "queen-vs-centre-pawn",
    itemId: "E-18",
    fen: "8/8/8/8/8/7Q/3p4/3k3K w - - 0 1",
    goal: GOAL.WIN,
    studentColor: "white",
    maxMoves: 40,
    prompt: "A centre pawn one square from queening. Win it.",
    concept:
      "Check the king onto the promotion square itself. That is the free tempo you need to bring your own king closer.",
  },
  {
    id: "queen-vs-bishop-pawn",
    itemId: "E-18",
    fen: "8/8/8/8/8/7Q/2p5/2k4K w - - 0 1",
    goal: GOAL.HOLD,
    studentColor: "white",
    maxMoves: 20,
    prompt:
      "The same technique as against a centre pawn, but it fails here. Play it out and find the reason.",
    concept:
      "On a bishop pawn the king steps into the corner and stalemate saves Black. Check the file before you start.",
  },
  {
    id: "queen-vs-pawn-black",
    itemId: "E-18",
    fen: "1K6/1P6/7q/8/8/8/8/7k b - - 0 1",
    goal: GOAL.WIN,
    studentColor: "black",
    maxMoves: 40,
    prompt: "White's knight pawn is on the seventh. Stop it and win it.",
    concept:
      "Approach with checks that force the king in front of its own pawn, then gain a tempo with your king.",
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
