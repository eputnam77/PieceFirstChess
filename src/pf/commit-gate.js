/**
 * The Commit Gate — ask before you answer.
 *
 * Today "Best Move" hands over the answer to a question the learner never
 * produced an answer to, which forfeits the generation effect, the
 * prediction-error signal, and any chance of attributing the miss to a step of
 * the protocol. The gate inserts exactly one step: *what do you think it is?*
 *
 * It costs no latency. Stockfish starts searching the moment the button is
 * pressed; the gate spends the wait that was already there.
 *
 * ## Two rules it must never break (D12)
 *
 * 1. **Predicting must never move a piece.** A candidate is parsed against a
 *    frozen FEN snapshot and never touches the live game, so it cannot commit
 *    the game move or let the engine reply first. That is why this module takes
 *    a FEN string and returns a UCI string, and owns no board.
 * 2. **Skip is always one click**, and the whole feature is off by default
 *    behind a flag, for one instrumented pilot. Whether it becomes default-on
 *    is a question for the measured skip rate, completion rate and added
 *    seconds — {@link summarizePilot} — not for anyone's taste.
 *
 * Pure module: no React, no I/O, no engine. `localStorage` access is confined
 * to the two flag helpers, which no-throw.
 */

import { Chess } from "chess.js";

import { candidateSpread, practicalLoss, verdictFor } from "@pf/verdict.js";

/** Marks every event this feature writes, so the readout can find them. */
export const GATE_SOURCE = "commit-gate";

/** The flag. Off by default — see rule 2 above. */
export const COMMIT_GATE_KEY = "pf-commit-gate";

/**
 * Whether the gate is switched on.
 * @returns {boolean} true only when the learner opted in
 */
export const isCommitGateEnabled = () => {
  try {
    return localStorage.getItem(COMMIT_GATE_KEY) === "on";
  } catch {
    // Private browsing and blocked storage both mean "not opted in".
    return false;
  }
};

/**
 * Turn the gate on or off.
 * @param {boolean} on the new setting
 * @returns {boolean} what was actually stored
 */
export const setCommitGateEnabled = (on) => {
  try {
    localStorage.setItem(COMMIT_GATE_KEY, on ? "on" : "off");
  } catch {
    /* nothing to do; the getter will keep reporting off */
  }
  return on;
};

/**
 * The reason chips.
 *
 * Optional, single-select, and **they do not affect the move grade** (D5).
 * Move accuracy and explanation accuracy are two different traces; a learner
 * who finds the right move for a defensible-but-different reason has not played
 * a worse move. A wrong chip schedules the concept sooner, and that is all.
 */
export const REASON_CHIPS = Object.freeze([
  { step: "PF2", label: "safe?" },
  { step: "PF3", label: "force" },
  { step: "PF4", label: "break" },
  { step: "PF5", label: "worst piece" },
  { step: "PF6", label: "calc" },
  { step: "PF7", label: "verify" },
]);

const REASON_STEPS = new Set(REASON_CHIPS.map((chip) => chip.step));

/** Whether a string is one of the reason chips. */
export const isReasonStep = (step) => REASON_STEPS.has(step);

/**
 * Parse a learner's typed candidate against a frozen position.
 *
 * Accepts SAN as written ("Bxf7+", "O-O", "exd5") or raw UCI ("f1b5",
 * "e7e8q"), because a learner mid-game types whichever is faster and being
 * strict about it would tax the prediction rather than the chess.
 *
 * The position is loaded fresh from the FEN every time, so nothing this
 * function is given can be mutated by it.
 * @param {string} fen the frozen position
 * @param {string} text what the learner typed
 * @returns {{uci: string, san: string}|null} the legal move, or null
 */
export const parseCandidate = (fen, text) => {
  const trimmed = (text ?? "").trim();
  if (!trimmed || !fen) return null;

  const asMove = (game, input) => {
    try {
      const move = game.move(input);
      return move
        ? {
            uci: `${move.from}${move.to}${move.promotion ?? ""}`,
            san: move.san,
          }
        : null;
    } catch {
      return null;
    }
  };

  // SAN first: "b4" is a legal pawn push, not a square name, and the learner
  // who typed it meant the move.
  const sanTry = asMove(new Chess(fen), trimmed);
  if (sanTry) return sanTry;

  if (/^[a-h][1-8][a-h][1-8][qrbn]?$/i.test(trimmed)) {
    const uci = trimmed.toLowerCase();
    return asMove(new Chess(fen), {
      from: uci.slice(0, 2),
      to: uci.slice(2, 4),
      promotion: uci[4],
    });
  }

  return null;
};

/** SAN for a UCI move in a position, or null when it is not legal there. */
export const uciToSan = (fen, uci) =>
  parseCandidate(fen, uci ?? "")?.san ?? null;

/**
 * Score a learner's prediction against the engine's candidates.
 *
 * Two cases, and the difference matters for honesty:
 *
 * - The predicted move **is** one of the MultiPV lines, so its rank and its
 *   loss are read straight off the same search that produced the answer. This
 *   is the exact case and needs no second opinion.
 * - It is **not**, which is the common case for a real mistake — the engine
 *   returned three lines and the learner played a fourth move. Then rank is
 *   only known to be worse than the last line returned, and the loss has to
 *   come from a separate evaluation of the position after the move. The caller
 *   supplies that as `afterCp`; without it the loss is honestly `null` rather
 *   than guessed.
 * @param {object} options inputs
 * @param {string} options.fen the frozen position
 * @param {string} options.playedUci the learner's predicted move, in UCI
 * @param {Array<object>} options.lines `analyze()` result lines
 * @param {number|null} [options.afterCp] evaluation after the played move, in
 *   the *mover's* perspective, for a move outside the returned lines
 * @returns {object} `{ rank, of, cpLoss, verdict, inSpread, bestUci, bestSan, playedSan, bestCp }`
 */
export const describePrediction = ({
  fen,
  playedUci,
  lines,
  afterCp = null,
}) => {
  const spread = candidateSpread(lines);
  const [best = null] = spread;
  const normalized = (playedUci ?? "").toLowerCase();
  const found = spread.find((c) => c.uci?.toLowerCase() === normalized) ?? null;

  const cpLoss = found
    ? found.cpLoss
    : best
      ? practicalLoss(best.cp, afterCp)
      : null;

  return {
    playedUci,
    playedSan: uciToSan(fen, playedUci),
    bestUci: best?.uci ?? null,
    bestSan: best?.uci ? uciToSan(fen, best.uci) : null,
    bestCp: best?.cp ?? null,
    inSpread: found !== null,
    rank: found?.rank ?? null,
    of: spread.length,
    cpLoss,
    verdict: verdictFor(cpLoss).label,
    matchedBest: Boolean(best?.uci && best.uci.toLowerCase() === normalized),
  };
};

/** Centipawns rendered the way the rest of the app renders them. */
const fmtCp = (cp) => {
  if (cp === null || cp === undefined) return "?";
  const pawns = cp / 100;
  return `${pawns >= 0 ? "+" : ""}${pawns.toFixed(1)}`;
};

/**
 * The one line the gate adds to the reveal.
 *
 * Rendered as markdown so it rides the existing engine-message path and the
 * best-move card renderer stays untouched — which is the difference between one
 * merge conflict and none (PRD §85.3).
 * @param {object} prediction output of {@link describePrediction}
 * @returns {string} markdown
 */
export const renderComparison = (prediction) => {
  if (!prediction?.playedSan) return "";

  if (prediction.matchedBest) {
    return [
      `**You played ${prediction.playedSan}** · ${fmtCp(prediction.bestCp)} — and so did Stockfish.`,
      "",
      "That is the whole point of the exercise: you found it before you were told it.",
    ].join("\n");
  }

  const rank = prediction.inSpread
    ? `${prediction.rank} of ${prediction.of}`
    : `outside the top ${prediction.of}`;
  const loss =
    prediction.cpLoss === null
      ? "cost unknown"
      : `−${(prediction.cpLoss / 100).toFixed(1)} against the best move`;

  return [
    `**You played ${prediction.playedSan}** · ${rank} · ${loss} · ${prediction.verdict}`,
    "",
    prediction.bestSan
      ? `**Best is ${prediction.bestSan}** · ${fmtCp(prediction.bestCp)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
};

/**
 * Build the row the event store keeps.
 *
 * Everything in it is engine- or detector-derived; nothing here is an opinion.
 * A skipped query is recorded too, with `skipped: true` and no move — a store
 * that only recorded answers could not measure the skip rate, which is the
 * number the pilot exists to find out.
 * @param {object} options event inputs
 * @returns {object} the event row
 */
export const toGateEvent = ({
  fen,
  prediction = null,
  reasonChip = null,
  pfStep = null,
  msToCommit = null,
  sessionId = null,
  trigger = "bestMove",
  skipped = false,
  ts = Date.now(),
}) => ({
  ts,
  source: GATE_SOURCE,
  sessionId,
  trigger,
  fen,
  skipped,
  playedUci: prediction?.playedUci ?? null,
  playedSan: prediction?.playedSan ?? null,
  bestUci: prediction?.bestUci ?? null,
  bestSan: prediction?.bestSan ?? null,
  cpLoss: prediction?.cpLoss ?? null,
  rank: prediction?.rank ?? null,
  matchedBest: prediction?.matchedBest ?? null,
  reasonChip,
  pfStep,
  msToCommit,
});

/** Median of a numeric list, or null when there is nothing to take one of. */
const median = (values) => {
  const sorted = values
    .filter((v) => typeof v === "number")
    .sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
};

/**
 * The pilot readout — the four numbers the default-on decision turns on.
 *
 * Reported as a **median** rather than a mean for the time cost, because one
 * learner walking away mid-prediction would otherwise decide the question.
 * There is no target here on purpose: this reports, it does not judge.
 * @param {object[]} events rows written by {@link toGateEvent}
 * @returns {object} `{ queries, committed, skipped, skipRate, completionRate, medianSecondsToCommit, addedSecondsTotal, sessions, eventsPerSession, accuracy }`
 */
export const summarizePilot = (events = []) => {
  const gate = events.filter((event) => event.source === GATE_SOURCE);
  const queries = gate.length;
  const committed = gate.filter((event) => !event.skipped);
  const skipped = queries - committed.length;

  const sessions = new Set(gate.map((event) => event.sessionId).filter(Boolean))
    .size;

  const medianMs = median(committed.map((event) => event.msToCommit));
  const addedMs = committed.reduce(
    (total, event) => total + (event.msToCommit ?? 0),
    0,
  );
  const matched = committed.filter((event) => event.matchedBest).length;

  return {
    queries,
    committed: committed.length,
    skipped,
    skipRate: queries === 0 ? null : skipped / queries,
    completionRate: queries === 0 ? null : committed.length / queries,
    medianSecondsToCommit: medianMs === null ? null : medianMs / 1000,
    addedSecondsTotal: addedMs / 1000,
    sessions,
    eventsPerSession: sessions === 0 ? null : queries / sessions,
    // Not a decision input — a sanity check that the gate is being answered
    // rather than dismissed with the first legal move that comes to hand.
    accuracy: committed.length === 0 ? null : matched / committed.length,
  };
};
