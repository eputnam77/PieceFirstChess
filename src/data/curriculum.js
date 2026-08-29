/**
 * The PieceFirst curriculum — 99 bounded items.
 *
 * Specified in `docs/PF7/LEARNING-SYSTEM.md`. The premise: chess feels
 * overwhelming because its literature is written for an audience that includes
 * professionals. Below ~2000 almost no game is decided by opening theory, so the
 * fix is not to learn faster but to delete most of the curriculum and drill the
 * remainder until it is automatic. This file is that remainder.
 *
 * Every item is tagged with the PieceFirst step that would surface it. That is
 * the organizing idea: the common failure is "I knew that pattern, I just didn't
 * see it" — a retrieval failure, caused by filing patterns under a taxonomy
 * instead of under the moment you would need them. The eight steps act as the
 * retrieval index, so this is 8 questions with stocked answers, not 99 facts.
 *
 * Each item:
 * id        – stable key; prefix encodes the tier (T/M/E/S/O)
 * tier      – 0–5, see TIERS below
 * title     – display name
 * pfStep    – the PieceFirst step that surfaces this item
 * prereqs   – item ids that should be mastered first; encodes learning order
 * summary   – one or two sentences: what the item is
 * mastery   – the concrete test for "I know this"
 * positions – drill positions; filled later (Tiers 1–2 via the Lichess import,
 * Tiers 3–5 by hand). Empty for now by design.
 *
 * Invariants are enforced by `curriculum.test.js`: unique ids, resolvable
 * prereqs, no cycles, no forward-tier dependencies, exact tier counts.
 */

/** PieceFirst protocol steps, including the added prophylaxis step. */
export const PF_STEPS = Object.freeze({
  PF1: "RESET — what did the opponent's move change?",
  PF2: "SAFETY — is there an emergency?",
  PF3: "FORCE — checks, captures, threats",
  PF4: "BREAK — is there a pawn break?",
  "PF4.5": "PREVENT — what does my opponent want?",
  PF5: "PIECEFIRST — improve the worst piece",
  PF6: "CALCULATE — compare 2–4 candidates",
  PF7: "VERIFY — final blunder scan",
});

/** Curriculum tiers, in study order. */
export const TIERS = Object.freeze({
  0: {
    name: "The protocol",
    idPrefix: "PF",
    description:
      "The eight-step decision process itself. A habit, not knowledge.",
  },
  1: {
    name: "Tactical motifs",
    idPrefix: "T",
    description:
      "The highest-return tier. Patterns are recognized, not calculated.",
  },
  2: {
    name: "Mating patterns",
    idPrefix: "M",
    description:
      "Finite, nameable, and they recur forever. The cheapest pattern knowledge in chess.",
  },
  3: {
    name: "Endgames",
    idPrefix: "E",
    description:
      "Concrete, verifiable, and it never rots. Studied before openings, per Capablanca.",
  },
  4: {
    name: "Pawn structures",
    idPrefix: "S",
    description:
      "The middlegame unlock. The repertoire deliberately reduces this to five core structures.",
  },
  5: {
    name: "Opening tabiya",
    idPrefix: "O",
    description:
      "Last and smallest. Positions and plans, not move lists — each resolves into a known structure.",
  },
});

export const CURRICULUM = [
  // ═══ Tier 0 — The protocol ═════════════════════════════════════════════════
  {
    id: "PF-PROTOCOL",
    tier: 0,
    title: "The PieceFirst 8-step protocol",
    pfStep: "PF1",
    prereqs: [],
    summary:
      "Reset, Safety, Force, Break, Prevent, PieceFirst, Calculate, Verify — run on every serious move. The scaffold every other item hangs from.",
    mastery:
      "On 20 consecutive positions, state what changed, name the threats, and list the forcing moves unprompted in under 60 seconds each.",
    positions: [],
  },

  // ═══ Tier 1 — Tactical motifs ══════════════════════════════════════════════
  // ── Double attack family ──
  {
    id: "T-01",
    tier: 1,
    title: "Knight fork",
    pfStep: "PF3",
    prereqs: ["PF-PROTOCOL"],
    summary:
      "One knight attacks two or more targets at once. The hardest fork to see, because knight moves do not follow lines.",
    mastery: "Find the fork in 5 consecutive positions in under 30s each.",
    positions: [],
  },
  {
    id: "T-02",
    tier: 1,
    title: "Pawn fork",
    pfStep: "PF3",
    prereqs: ["PF-PROTOCOL"],
    summary:
      "A pawn attacks two pieces. Cheap and brutal: the defender can rarely capture the pawn profitably.",
    mastery: "Spot the pawn fork in 5 consecutive positions.",
    positions: [],
  },
  {
    id: "T-03",
    tier: 1,
    title: "Queen double attack",
    pfStep: "PF3",
    prereqs: ["T-01"],
    summary:
      "The queen hits two targets from one square, often combining a threat against the king with a loose piece elsewhere.",
    mastery: "Find the double attack in 5 consecutive positions.",
    positions: [],
  },
  {
    id: "T-04",
    tier: 1,
    title: "Bishop and rook double attack",
    pfStep: "PF3",
    prereqs: ["T-01"],
    summary:
      "Line pieces forking along a diagonal, rank, or file. Usually needs a preparatory move to align the targets.",
    mastery: "Find the double attack in 5 consecutive positions.",
    positions: [],
  },
  {
    id: "T-05",
    tier: 1,
    title: "Royal fork",
    pfStep: "PF3",
    prereqs: ["T-01"],
    summary:
      "A fork that includes the king, so the reply is forced and the second target simply falls.",
    mastery: "Find the royal fork in 5 consecutive positions.",
    positions: [],
  },

  // ── Line attacks ──
  {
    id: "T-06",
    tier: 1,
    title: "Absolute pin",
    pfStep: "PF3",
    prereqs: ["PF-PROTOCOL"],
    summary:
      "A piece cannot legally move because its king stands behind it. A pinned piece is not really defending anything.",
    mastery:
      "Identify every pin on the board in 5 positions, and say what each one stops.",
    positions: [],
  },
  {
    id: "T-07",
    tier: 1,
    title: "Relative pin",
    pfStep: "PF3",
    prereqs: ["T-06"],
    summary:
      "Moving the pinned piece is legal but loses material behind it. Weaker than an absolute pin and easier to miss.",
    mastery: "Find the relative pin and its exploitation in 5 positions.",
    positions: [],
  },
  {
    id: "T-08",
    tier: 1,
    title: "Skewer",
    pfStep: "PF3",
    prereqs: ["T-06"],
    summary:
      "A pin in reverse: the valuable piece is in front, must move, and exposes the lesser piece behind it.",
    mastery: "Find the skewer in 5 consecutive positions.",
    positions: [],
  },
  {
    id: "T-09",
    tier: 1,
    title: "X-ray attack",
    pfStep: "PF3",
    prereqs: ["T-08"],
    summary:
      "A line piece exerts pressure straight through an enemy piece to something behind it.",
    mastery: "Spot the x-ray and use it in 5 positions.",
    positions: [],
  },
  {
    id: "T-10",
    tier: 1,
    title: "X-ray defense",
    pfStep: "PF2",
    prereqs: ["T-09"],
    summary:
      "Your own piece is defended through an intervening piece — so a capture that looks winning is not.",
    mastery:
      "Correctly evaluate 5 positions where an apparently hanging piece is x-ray defended.",
    positions: [],
  },
  {
    id: "T-11",
    tier: 1,
    title: "Discovered attack",
    pfStep: "PF3",
    prereqs: ["T-06"],
    summary:
      "Moving one piece unveils an attack from the piece behind it, so two threats appear in one move.",
    mastery: "Find the discovery in 5 consecutive positions.",
    positions: [],
  },
  {
    id: "T-12",
    tier: 1,
    title: "Discovered check",
    pfStep: "PF3",
    prereqs: ["T-11"],
    summary:
      "A discovery where the unveiled attack is check — the moving piece can go anywhere, including somewhere absurd.",
    mastery: "Find the discovered check in 5 consecutive positions.",
    positions: [],
  },
  {
    id: "T-13",
    tier: 1,
    title: "Double check",
    pfStep: "PF3",
    prereqs: ["T-12"],
    summary:
      "Two pieces give check at once. The king must move — blocking and capturing are both impossible.",
    mastery: "Find the double check in 5 positions, including two mating nets.",
    positions: [],
  },
  {
    id: "T-14",
    tier: 1,
    title: "Batteries",
    pfStep: "PF5",
    prereqs: ["T-11"],
    summary:
      "Stacking queen and bishop, queen and rook, or doubled rooks on one line. Alekhine's gun is the heavy version.",
    mastery: "Build the correct battery in 5 positions and justify the order.",
    positions: [],
  },

  // ── Removing the defender ──
  {
    id: "T-15",
    tier: 1,
    title: "Deflection",
    pfStep: "PF3",
    prereqs: ["T-06", "T-17"],
    summary:
      "Force a defender away from a square or piece it must keep guarding.",
    mastery: "Spot the deflection in 5 consecutive positions under 30s.",
    positions: [],
  },
  {
    id: "T-16",
    tier: 1,
    title: "Decoy / attraction",
    pfStep: "PF3",
    prereqs: ["T-15"],
    summary:
      "Lure a piece onto a bad square — usually with a sacrifice — so a follow-up tactic works.",
    mastery: "Find the decoy sacrifice in 5 consecutive positions.",
    positions: [],
  },
  {
    id: "T-17",
    tier: 1,
    title: "Overloading",
    pfStep: "PF2",
    prereqs: ["T-06"],
    summary:
      "A piece with two jobs can only do one. Counting defenders is not enough — check whether they are already busy.",
    mastery:
      "Identify the overloaded defender in 5 positions before calculating.",
    positions: [],
  },
  {
    id: "T-18",
    tier: 1,
    title: "Removal of the guard",
    pfStep: "PF3",
    prereqs: ["PF-PROTOCOL"],
    summary:
      "Simply capture or chase the defender, then take what it was defending.",
    mastery: "Find the correct capture order in 5 positions.",
    positions: [],
  },
  {
    id: "T-19",
    tier: 1,
    title: "Interference",
    pfStep: "PF3",
    prereqs: ["T-06"],
    summary:
      "Interpose a piece — often a sacrifice — to cut the line between a defender and what it defends.",
    mastery: "Find the interference move in 5 positions.",
    positions: [],
  },
  {
    id: "T-20",
    tier: 1,
    title: "Undermining the base of a chain",
    pfStep: "PF4",
    prereqs: ["T-18"],
    summary:
      "Attack the pawn that holds a chain up. The whole structure above it becomes weak at once.",
    mastery: "Identify the base and the correct break in 5 positions.",
    positions: [],
  },

  // ── Pawn tactics ──
  {
    id: "T-21",
    tier: 1,
    title: "Passed-pawn breakthrough",
    pfStep: "PF3",
    prereqs: ["T-02"],
    summary:
      "A pawn sacrifice that forces a passer through a blockading pawn wall.",
    mastery:
      "Find the breakthrough in 5 positions and calculate it to promotion.",
    positions: [],
  },
  {
    id: "T-22",
    tier: 1,
    title: "Promotion tactics and underpromotion",
    pfStep: "PF3",
    prereqs: ["T-21"],
    summary:
      "Promotion combinations, including the rare cases where a knight or rook wins and a queen only draws.",
    mastery: "Solve 5 promotion puzzles including at least one underpromotion.",
    positions: [],
  },
  {
    id: "T-23",
    tier: 1,
    title: "Outside passed pawn as decoy",
    pfStep: "PF4",
    prereqs: ["T-21", "T-16"],
    summary:
      "A distant passer drags the enemy king away so your king wins material on the other wing.",
    mastery: "Convert 5 positions using the outside passer as a decoy.",
    positions: [],
  },
  {
    id: "T-24",
    tier: 1,
    title: "Connected passers versus a rook",
    pfStep: "PF6",
    prereqs: ["T-21"],
    summary:
      "Two connected pawns on the sixth rank beat a rook. Knowing this changes which endgames you enter.",
    mastery: "Calculate the race correctly in 5 positions.",
    positions: [],
  },

  // ── Timing and move order ──
  {
    id: "T-25",
    tier: 1,
    title: "Zwischenzug",
    pfStep: "PF6",
    prereqs: ["T-18"],
    summary:
      "An in-between move inserted before the 'obvious' recapture, changing the whole evaluation.",
    mastery:
      "Find the zwischenzug in 5 positions where the natural recapture fails.",
    positions: [],
  },
  {
    id: "T-26",
    tier: 1,
    title: "Desperado",
    pfStep: "PF6",
    prereqs: ["T-25"],
    summary:
      "A doomed piece sells itself as expensively as possible before it is lost.",
    mastery: "Find the desperado resource in 5 positions.",
    positions: [],
  },
  {
    id: "T-27",
    tier: 1,
    title: "Zugzwang",
    pfStep: "PF6",
    prereqs: ["PF-PROTOCOL"],
    summary:
      "The obligation to move is itself the problem — every legal move worsens the position.",
    mastery: "Identify zugzwang and the correct waiting move in 5 positions.",
    positions: [],
  },
  {
    id: "T-28",
    tier: 1,
    title: "Clearance sacrifice",
    pfStep: "PF3",
    prereqs: ["T-19"],
    summary:
      "Give up material to vacate a square or line your own pieces need.",
    mastery: "Find the clearance move in 5 positions.",
    positions: [],
  },
  {
    id: "T-29",
    tier: 1,
    title: "Tempo gain with check",
    pfStep: "PF3",
    prereqs: ["PF-PROTOCOL"],
    summary:
      "Use forcing checks to reach a needed square or configuration for free. The engine of most combinations.",
    mastery: "Find the correct checking sequence in 5 positions.",
    positions: [],
  },

  // ── Trapping and drawing resources ──
  {
    id: "T-30",
    tier: 1,
    title: "Trapped piece",
    pfStep: "PF2",
    prereqs: ["T-18"],
    summary:
      "A piece with no safe squares can be won by attacking it, even if it is not currently hanging.",
    mastery: "Find the trapping move in 5 positions.",
    positions: [],
  },
  {
    id: "T-31",
    tier: 1,
    title: "The trapped-bishop pattern",
    pfStep: "PF2",
    prereqs: ["T-30"],
    summary:
      "The recurring ...Bxh2/Bxa7 pawn-grab that loses the bishop to a3/h3 and a king walk.",
    mastery: "Correctly judge the pawn grab in 5 positions, both colors.",
    positions: [],
  },
  {
    id: "T-32",
    tier: 1,
    title: "Windmill",
    pfStep: "PF3",
    prereqs: ["T-12"],
    summary:
      "A repeating discovered-check cycle that harvests material on every rotation.",
    mastery: "Execute the windmill to the end in 3 positions.",
    positions: [],
  },
  {
    id: "T-33",
    tier: 1,
    title: "Perpetual check",
    pfStep: "PF3",
    prereqs: ["T-29"],
    summary:
      "A forced draw by endless check. The most common way a lost position is saved.",
    mastery: "Find the perpetual in 5 losing positions.",
    positions: [],
  },
  {
    id: "T-34",
    tier: 1,
    title: "Stalemate resource",
    pfStep: "PF2",
    prereqs: ["T-27"],
    summary:
      "Deliberately eliminating your own legal moves to escape with a draw.",
    mastery: "Find the stalemate save in 5 positions.",
    positions: [],
  },
  {
    id: "T-35",
    tier: 1,
    title: "Fortress",
    pfStep: "PF2",
    prereqs: ["T-34"],
    summary:
      "An impenetrable setup that holds a draw despite a large material deficit.",
    mastery: "Build and hold the fortress in 3 positions against the engine.",
    positions: [],
  },

  // ── King attack ──
  {
    id: "T-36",
    tier: 1,
    title: "Back-rank weakness",
    pfStep: "PF2",
    prereqs: ["T-15"],
    summary:
      "A castled king boxed in by its own pawns. The most common way a club game ends abruptly.",
    mastery:
      "Spot the back-rank motif in 5 positions, from both the attacking and defending side.",
    positions: [],
  },
  {
    id: "T-37",
    tier: 1,
    title: "Greek gift (Bxh7+)",
    pfStep: "PF3",
    prereqs: ["T-36"],
    summary:
      "The classic bishop sacrifice on h7 followed by Ng5+ and Qh5. Know the preconditions, not just the moves.",
    mastery:
      "Correctly judge whether the sacrifice works in 5 positions — including two where it does not.",
    positions: [],
  },
  {
    id: "T-38",
    tier: 1,
    title: "Nxf7 / Bxf7 demolition",
    pfStep: "PF3",
    prereqs: ["T-37"],
    summary:
      "Sacrifices against f7/f2, the square defended only by the king in the opening.",
    mastery: "Judge the sacrifice correctly in 5 positions.",
    positions: [],
  },
  {
    id: "T-39",
    tier: 1,
    title: "h-file demolition (Rxh7)",
    pfStep: "PF3",
    prereqs: ["T-37"],
    summary:
      "Opening the h-file by force, usually after a pawn storm, and crashing through with a rook.",
    mastery: "Find the demolition sacrifice in 5 positions.",
    positions: [],
  },
  {
    id: "T-40",
    tier: 1,
    title: "Destroying the castled king's cover",
    pfStep: "PF3",
    prereqs: ["T-39"],
    summary:
      "Trading off the defending knight (Bxf6) or bishop to strip the pawn shield and the key defender together.",
    mastery: "Identify the key defender and the correct trade in 5 positions.",
    positions: [],
  },
  {
    id: "T-41",
    tier: 1,
    title: "Pawn-storm breakthrough",
    pfStep: "PF4",
    prereqs: ["T-21", "T-40"],
    summary:
      "Advancing the pawns in front of your own king to rip open lines — sound mainly with opposite-side castling.",
    mastery: "Judge whether the storm is justified in 5 positions.",
    positions: [],
  },
  {
    id: "T-42",
    tier: 1,
    title: "Luft and back-rank prophylaxis",
    pfStep: "PF4.5",
    prereqs: ["T-36"],
    summary:
      "Spending a tempo on h6/g6 before the back rank becomes fatal. The cheapest prophylaxis in chess.",
    mastery:
      "Decide correctly in 5 positions whether luft is needed now or is a wasted tempo.",
    positions: [],
  },

  // ═══ Tier 2 — Mating patterns ══════════════════════════════════════════════
  {
    id: "M-01",
    tier: 2,
    title: "Back-rank mate",
    pfStep: "PF3",
    prereqs: ["T-36"],
    summary:
      "Rook or queen mates on the first rank behind an unmoved pawn shield.",
    mastery: "Deliver or prevent it in 5 positions.",
    positions: [],
  },
  {
    id: "M-02",
    tier: 2,
    title: "Smothered mate",
    pfStep: "PF3",
    prereqs: ["T-01", "T-13"],
    summary:
      "Philidor's legacy: queen sacrifice forces the rook to block, and the knight mates a king buried by its own pieces.",
    mastery: "Execute the full sequence from 3 positions from memory.",
    positions: [],
  },
  {
    id: "M-03",
    tier: 2,
    title: "Anastasia's mate",
    pfStep: "PF3",
    prereqs: ["T-01"],
    summary:
      "Knight on e7 plus a rook swinging to the h-file against a castled king.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },
  {
    id: "M-04",
    tier: 2,
    title: "Arabian mate",
    pfStep: "PF3",
    prereqs: ["T-01"],
    summary:
      "Knight and rook cooperate to mate a king in the corner — the oldest recorded pattern.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },
  {
    id: "M-05",
    tier: 2,
    title: "Boden's mate",
    pfStep: "PF3",
    prereqs: ["T-04"],
    summary:
      "Two bishops on crossing diagonals mate a king castled queenside, usually after a sacrifice opens lines.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },
  {
    id: "M-06",
    tier: 2,
    title: "Damiano's mate",
    pfStep: "PF3",
    prereqs: ["M-01"],
    summary:
      "Pawn supports the queen on the h-file after rook sacrifices strip the king's cover.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },
  {
    id: "M-07",
    tier: 2,
    title: "Epaulette mate",
    pfStep: "PF3",
    prereqs: ["M-01"],
    summary:
      "The king is mated because its own rooks stand on both sides, blocking every escape square.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },
  {
    id: "M-08",
    tier: 2,
    title: "Greco's mate",
    pfStep: "PF3",
    prereqs: ["T-04"],
    summary:
      "Bishop and queen trap the king on the h-file, with the king's own pawn sealing its escape.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },
  {
    id: "M-09",
    tier: 2,
    title: "Hook mate",
    pfStep: "PF3",
    prereqs: ["M-03"],
    summary: "Rook, knight, and pawn interlock to cover every flight square.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },
  {
    id: "M-10",
    tier: 2,
    title: "Ladder mate",
    pfStep: "PF3",
    prereqs: ["PF-PROTOCOL"],
    summary:
      "Two rooks (or queen and rook) walk the king to the edge rank by rank. The first mate to know cold.",
    mastery: "Deliver it from any position in under 10 moves, every time.",
    positions: [],
  },
  {
    id: "M-11",
    tier: 2,
    title: "Legal's mate",
    pfStep: "PF3",
    prereqs: ["T-06"],
    summary:
      "The queen sacrifice that works because the 'pin' against it was never really binding.",
    mastery:
      "Judge correctly in 4 positions whether the Legal sacrifice is sound.",
    positions: [],
  },
  {
    id: "M-12",
    tier: 2,
    title: "Lolli's mate",
    pfStep: "PF3",
    prereqs: ["M-08"],
    summary:
      "Queen and pawn break through on g7 against a fianchetto that has lost its bishop.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },
  {
    id: "M-13",
    tier: 2,
    title: "Morphy's mate",
    pfStep: "PF3",
    prereqs: ["M-08"],
    summary:
      "Bishop and rook mate a cornered king behind its own blocking pawn.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },
  {
    id: "M-14",
    tier: 2,
    title: "Opera mate",
    pfStep: "PF3",
    prereqs: ["M-01", "T-06"],
    summary:
      "Rook mates on the back rank supported by a bishop, against a king frozen by a pin.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },
  {
    id: "M-15",
    tier: 2,
    title: "Blackburne's mate",
    pfStep: "PF3",
    prereqs: ["M-13"],
    summary:
      "Two bishops and a knight mate a castled king, one bishop cutting off the escape diagonal.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },
  {
    id: "M-16",
    tier: 2,
    title: "Vukovic's mate",
    pfStep: "PF3",
    prereqs: ["M-09"],
    summary:
      "Rook and knight mate with a pawn or second piece guarding the rook.",
    mastery: "Find the mate in 4 positions.",
    positions: [],
  },

  // ═══ Tier 3 — Endgames ═════════════════════════════════════════════════════
  // ── Basic mates ──
  {
    id: "E-01",
    tier: 3,
    title: "K+Q vs K",
    pfStep: "PF6",
    prereqs: ["PF-PROTOCOL"],
    summary:
      "Box the king toward the edge with the queen, bring your own king, avoid stalemate.",
    mastery:
      "Mate from any starting position in under 10 moves, no stalemates.",
    positions: [],
  },
  {
    id: "E-02",
    tier: 3,
    title: "K+R vs K",
    pfStep: "PF6",
    prereqs: ["E-01"],
    summary:
      "Cut the king off, shrink the box, use opposition and a waiting move to finish.",
    mastery: "Mate from any starting position in under 16 moves.",
    positions: [],
  },
  {
    id: "E-03",
    tier: 3,
    title: "Two bishops vs K",
    pfStep: "PF6",
    prereqs: ["E-02"],
    summary:
      "Drive the king to a corner along a barrier of two diagonals, king assisting.",
    mastery: "Mate from any starting position within the 50-move limit.",
    positions: [],
  },

  // ── Pawn endings ──
  {
    id: "E-04",
    tier: 3,
    title: "Opposition",
    pfStep: "PF6",
    prereqs: ["PF-PROTOCOL"],
    summary:
      "Kings facing each other with one square between: whoever must move gives ground. The root of all pawn endings.",
    mastery: "Win or hold 5 K+P positions purely by taking the opposition.",
    positions: [],
  },
  {
    id: "E-05",
    tier: 3,
    title: "Key squares",
    pfStep: "PF6",
    prereqs: ["E-04"],
    summary:
      "The squares your king must reach to promote regardless of opposition. Turns K+P vs K into a lookup.",
    mastery: "Name the key squares and win 5 K+P vs K positions.",
    positions: [],
  },
  {
    id: "E-06",
    tier: 3,
    title: "Rule of the square",
    pfStep: "PF6",
    prereqs: ["PF-PROTOCOL"],
    summary:
      "Whether a lone king catches a passed pawn, answered instantly by drawing a square on the board.",
    mastery: "Judge 10 pawn races correctly at a glance.",
    positions: [],
  },
  {
    id: "E-07",
    tier: 3,
    title: "Distant and diagonal opposition",
    pfStep: "PF6",
    prereqs: ["E-04"],
    summary:
      "Opposition at longer range and on diagonals — the same idea, harder to see.",
    mastery: "Hold or win 5 positions using distant opposition.",
    positions: [],
  },
  {
    id: "E-08",
    tier: 3,
    title: "Trébuchet and mutual zugzwang",
    pfStep: "PF6",
    prereqs: ["E-04", "T-27"],
    summary:
      "Positions where whoever moves simply loses. The purest expression of the tempo.",
    mastery: "Identify who is lost in 5 mutual-zugzwang positions.",
    positions: [],
  },
  {
    id: "E-09",
    tier: 3,
    title: "Creating a passer from a majority",
    pfStep: "PF4",
    prereqs: ["E-06"],
    summary:
      "The correct pawn order to manufacture a passer — usually the unopposed pawn first.",
    mastery: "Create the passer correctly in 5 majority positions.",
    positions: [],
  },

  // ── Rook endings ──
  {
    id: "E-10",
    tier: 3,
    title: "Lucena position",
    pfStep: "PF6",
    prereqs: ["E-05"],
    summary:
      "The winning method with a rook and pawn on the seventh: building a bridge to shelter the king from checks.",
    mastery: "Convert from the Lucena position 5 times against the engine.",
    positions: [],
  },
  {
    id: "E-11",
    tier: 3,
    title: "Philidor position",
    pfStep: "PF6",
    prereqs: ["E-10"],
    summary:
      "The drawing method: hold the third rank until the pawn advances, then check from behind.",
    mastery: "Hold the draw 5 times against the engine.",
    positions: [],
  },
  {
    id: "E-12",
    tier: 3,
    title: "Short-side and long-side defense",
    pfStep: "PF6",
    prereqs: ["E-11"],
    summary:
      "Which side the defending king belongs on, and why the rook needs the long side for checking distance.",
    mastery: "Choose the correct side and hold in 5 positions.",
    positions: [],
  },
  {
    id: "E-13",
    tier: 3,
    title: "Rook behind the passed pawn",
    pfStep: "PF5",
    prereqs: ["E-10"],
    summary:
      "Tarrasch's rule: rooks belong behind passers, yours and theirs. One of the highest-value habits in chess.",
    mastery: "Place the rook correctly in 5 positions and explain why.",
    positions: [],
  },
  {
    id: "E-14",
    tier: 3,
    title: "Rook vs advanced passed pawn",
    pfStep: "PF6",
    prereqs: ["E-13"],
    summary:
      "When the rook stops the pawn alone and when it must sacrifice itself for it.",
    mastery: "Judge 5 positions correctly.",
    positions: [],
  },

  // ── Minor piece and queen ──
  {
    id: "E-15",
    tier: 3,
    title: "Wrong-colored bishop and rook pawn",
    pfStep: "PF6",
    prereqs: ["E-04"],
    summary:
      "A drawn ending despite a whole extra bishop, if the bishop does not control the promotion square.",
    mastery: "Recognize the draw instantly in 5 positions, both sides.",
    positions: [],
  },
  {
    id: "E-16",
    tier: 3,
    title: "Opposite-colored bishop drawing mechanism",
    pfStep: "PF6",
    prereqs: ["E-15"],
    summary:
      "Blockade on the color your bishop controls. Two extra pawns are often not enough to win.",
    mastery: "Hold or convert correctly in 5 positions.",
    positions: [],
  },
  {
    id: "E-17",
    tier: 3,
    title: "Bishop versus knight",
    pfStep: "PF5",
    prereqs: ["E-16"],
    summary:
      "Bishops prefer open positions and pawns on both wings; knights prefer closed positions with fixed targets.",
    mastery:
      "Choose the right piece to keep in 5 positions and justify the trade.",
    positions: [],
  },
  {
    id: "E-18",
    tier: 3,
    title: "Queen versus pawn on the seventh",
    pfStep: "PF6",
    prereqs: ["E-01", "E-09"],
    summary:
      "The queen wins by forcing the king in front of the pawn — except against rook and bishop pawns.",
    mastery:
      "Convert or draw correctly in 5 positions, including the exceptions.",
    positions: [],
  },

  // ═══ Tier 4 — Pawn structures ══════════════════════════════════════════════
  {
    id: "S-01",
    tier: 4,
    title: "French chain",
    pfStep: "PF4",
    prereqs: ["E-09", "T-20"],
    summary:
      "The e5/d4/c3 versus e6/d5/c5 chain. Learned from BOTH sides: White in the French and Caro Advance, Black in the Caro Advance.",
    mastery:
      "Play the structure out against the engine from both sides and name the break each time.",
    positions: [],
  },
  {
    id: "S-02",
    tier: 4,
    title: "Isolated queen's pawn",
    pfStep: "PF4",
    prereqs: ["S-01"],
    summary:
      "Activity and the d5/e5 outposts versus blockade and a long-term weakness. Learned from BOTH sides: White in the Alapin, Black against the Panov.",
    mastery:
      "Play out 3 games from each side, converting activity or blockade.",
    positions: [],
  },
  {
    id: "S-03",
    tier: 4,
    title: "Carlsbad and the minority attack",
    pfStep: "PF4",
    prereqs: ["S-02"],
    summary:
      "Two pawns advancing against three to manufacture a backward c-pawn, met by central or kingside counterplay.",
    mastery: "Execute the minority attack and defend against it, 3 games each.",
    positions: [],
  },
  {
    id: "S-04",
    tier: 4,
    title: "Caro/Slav formation",
    pfStep: "PF5",
    prereqs: ["S-03"],
    summary:
      "The solid c6/e6/d5 triangle. Extremely durable; the challenge is generating activity without loosening it.",
    mastery: "Play 3 games finding a constructive plan, not just solidity.",
    positions: [],
  },
  {
    id: "S-05",
    tier: 4,
    title: "Closed e4/d3 centre",
    pfStep: "PF5",
    prereqs: ["S-01"],
    summary:
      "The Giuoco Pianissimo structure: slow maneuvering, the Nb1–d2–f1–g3 route, and a prepared d4.",
    mastery: "Reroute the knight correctly and time d4 in 3 games.",
    positions: [],
  },
  {
    id: "S-06",
    tier: 4,
    title: "Hanging pawns",
    pfStep: "PF4",
    prereqs: ["S-02"],
    summary:
      "Connected c5+d5 pawns: dynamic strength while mobile, fixed targets once stopped.",
    mastery: "Play both sides, 3 games each.",
    positions: [],
  },
  {
    id: "S-07",
    tier: 4,
    title: "Half-open file play",
    pfStep: "PF5",
    prereqs: ["S-03"],
    summary:
      "After central exchanges, which file matters, which rook takes it, and what it is aimed at.",
    mastery: "Choose the correct rook and file in 5 positions.",
    positions: [],
  },
  {
    id: "S-08",
    tier: 4,
    title: "Backward pawn on a half-open file",
    pfStep: "PF4.5",
    prereqs: ["S-07"],
    summary:
      "Fixing the pawn, occupying the hole in front of it, and piling up. The defender's job is to free it or trade it.",
    mastery: "Attack and defend the backward pawn, 3 games each.",
    positions: [],
  },

  // ═══ Tier 5 — Opening tabiya ═══════════════════════════════════════════════
  {
    id: "O-01",
    tier: 5,
    title: "Italian / Giuoco Pianissimo",
    pfStep: "PF5",
    prereqs: ["S-05"],
    summary:
      "White: d3, O-O, Re1, c3, Nbd2, Bb3, Nf1–g3, then d4 when prepared. Pressure on f7, no premature attack.",
    mastery: "Reach the tabiya and state the plan and break without prompting.",
    positions: [],
  },
  {
    id: "O-02",
    tier: 5,
    title: "Alapin versus 2...d5",
    pfStep: "PF4",
    prereqs: ["S-02"],
    summary:
      "2.c3 d5 3.exd5 Qxd5 4.d4 — build the centre, develop with tempo, often into an IQP.",
    mastery: "Reach the tabiya and name the resulting structure.",
    positions: [],
  },
  {
    id: "O-03",
    tier: 5,
    title: "Alapin versus 2...Nf6",
    pfStep: "PF4",
    prereqs: ["O-02"],
    summary: "2.c3 Nf6 3.e5 Nd5 4.d4 — space and a durable centre.",
    mastery: "Reach the tabiya and state the plan.",
    positions: [],
  },
  {
    id: "O-04",
    tier: 5,
    title: "French Advance",
    pfStep: "PF4",
    prereqs: ["S-01"],
    summary:
      "3.e5 with c3, Nf3, Bd3/Be2, O-O. Meet ...c5 and ...f6 actively rather than defending e5 forever.",
    mastery: "Reach the tabiya and handle both Black breaks.",
    positions: [],
  },
  {
    id: "O-05",
    tier: 5,
    title: "Caro-Kann Advance (White)",
    pfStep: "PF4",
    prereqs: ["O-04"],
    summary:
      "3.e5 against the Caro. Similar chain to the French, but Black's bishop gets out to f5 first — the key difference.",
    mastery:
      "Reach the tabiya and explain how it differs from the French Advance.",
    positions: [],
  },
  {
    id: "O-06",
    tier: 5,
    title: "Scandinavian",
    pfStep: "PF5",
    prereqs: ["S-05"],
    summary:
      "2.exd5; after 2...Qxd5 3.Nc3 gains time. Develop, take the centre, punish the early queen sortie.",
    mastery: "Reach the tabiya and convert the development lead into a plan.",
    positions: [],
  },
  {
    id: "O-07",
    tier: 5,
    title: "Classical centre versus Pirc, Modern, and Alekhine",
    pfStep: "PF5",
    prereqs: ["S-05"],
    summary:
      "Build e4/d4/Nc3/Nf3/Be2/O-O and stabilize. Do not chase pawns or force an attack without targets.",
    mastery: "Reach a sound tabiya against each and state the plan.",
    positions: [],
  },
  {
    id: "O-08",
    tier: 5,
    title: "Caro-Kann Classical",
    pfStep: "PF5",
    prereqs: ["S-04"],
    summary:
      "3...dxe4 4.Nxe4 Bf5, then ...e6, ...Nd7, ...Ngf6, ...Be7, ...O-O. Remember the development order, not a move list.",
    mastery: "Reach the tabiya from memory and state the plan.",
    positions: [],
  },
  {
    id: "O-09",
    tier: 5,
    title: "Caro-Kann Advance (Black)",
    pfStep: "PF4",
    prereqs: ["S-01", "O-05"],
    summary:
      "3...Bf5 then ...e6, ...c5, ...Nc6, pressuring d4. The ...c5 break is the whole idea.",
    mastery: "Reach the tabiya and time the ...c5 break correctly.",
    positions: [],
  },
  {
    id: "O-10",
    tier: 5,
    title: "Caro-Kann Exchange",
    pfStep: "PF4",
    prereqs: ["S-03"],
    summary:
      "After exd5 cxd5 you have a Carlsbad structure a tempo down on the QGD version. Develop actively; symmetry is not equality.",
    mastery: "Reach the tabiya and identify the minority-attack plan.",
    positions: [],
  },
  {
    id: "O-11",
    tier: 5,
    title: "Panov Attack",
    pfStep: "PF4",
    prereqs: ["S-02"],
    summary:
      "White's c4 gives an IQP position. Blockade d5, pressure the pawn, respect White's activity.",
    mastery: "Reach the tabiya and set up the blockade.",
    positions: [],
  },
  {
    id: "O-12",
    tier: 5,
    title: "Queen's Gambit Declined",
    pfStep: "PF4",
    prereqs: ["S-03"],
    summary:
      "...d5, ...e6, ...Nf6, ...Be7, ...O-O, ...Nbd7, then strike with ...c5 or ...e5. Completion of development, not passivity.",
    mastery: "Reach the tabiya and prepare the correct freeing break.",
    positions: [],
  },
  {
    id: "O-13",
    tier: 5,
    title: "QGD Exchange (Carlsbad)",
    pfStep: "PF4.5",
    prereqs: ["O-12", "S-03"],
    summary:
      "The main Carlsbad tabiya. Know White's minority attack before you face it, and your central/kingside counter.",
    mastery: "Defend the minority attack successfully in 3 games.",
    positions: [],
  },
  {
    id: "O-14",
    tier: 5,
    title: "London, 1.Nf3, and 1.c4 transpositions",
    pfStep: "PF4",
    prereqs: ["O-12"],
    summary:
      "Answer with an active ...d5/...Nf6/...e6/...c5 setup and question the d4/e3 chain rather than mirroring passively.",
    mastery: "Reach a familiar structure against each move order.",
    positions: [],
  },
];

export default CURRICULUM;
