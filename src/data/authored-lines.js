/**
 * Hand-authored drill lines, stored as SAN and sliced into positions.
 *
 * Almost every tactical and mating item is filled from the Lichess database by
 * `npm run import:puzzles`. A few cannot be: Lichess has no theme for them and
 * they are not decidable from the board, so the importer deliberately does not
 * guess. Those live here.
 *
 * Lines are SAN from the initial position and are replayed with chess.js at load
 * time (`src/lib/authored-lines.js`), which is why there is no FEN in this file.
 * `authored-lines.test.js` replays every line and checks that a line claiming to
 * end in mate actually does.
 *
 * Each entry:
 * itemId      – the curriculum item this drills
 * id          – unique drill id
 * line        – SAN moves from the initial position
 * studentFrom – ply index the drill starts at; the student is on move there and
 *               plays every remaining move of the line, so the number of plies
 *               from here must be odd
 * prompt      – what the student is being asked to do
 * endsInMate  – assert the line finishes with checkmate
 */

/**
 * Légal's mate — two knights and a bishop, reached from the trap that made the
 * pattern famous. It is drilled from the sacrifice and again from the mate
 * itself, because recognising the finish and choosing to enter it are different
 * skills.
 */
const LEGALS_LINE = [
  "e4",
  "e5",
  "Nf3",
  "d6",
  "Bc4",
  "Bg4",
  "Nc3",
  "g6",
  "Nxe5",
  "Bxd1",
  "Bxf7+",
  "Ke7",
  "Nd5#",
];

export const AUTHORED_LINES = Object.freeze([
  {
    itemId: "M-11",
    id: "legals-mate-in-one",
    line: LEGALS_LINE,
    studentFrom: 12,
    prompt: "Mate in one. Two knights and a bishop have the king sealed in.",
    endsInMate: true,
  },
  {
    itemId: "M-11",
    id: "legals-trap",
    line: LEGALS_LINE,
    studentFrom: 8,
    prompt:
      "Black's bishop is pinning your knight to the queen — or is it? Give up the queen and mate in three.",
    endsInMate: true,
  },
]);
