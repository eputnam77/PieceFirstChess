/**
 * A minimal UCI client over the Node build of the already-installed
 * `stockfish` package — no extra dependency, no browser.
 *
 * Extracted from `verify-endgames.js` so the drill verifier can use the same
 * harness rather than growing a second one that drifts. The synchronisation on
 * `readyok` between searches is the load-bearing part: skipping it is what made
 * an earlier throwaway harness report one position's score for the next one.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/**
 * The binary every certificate is issued by. Part of the analysis contract:
 * the same position at the same budget on a different build is a different
 * verdict, and a certificate you cannot reproduce is not a certificate (D14).
 */
export const ENGINE_BUILD = "stockfish-18-lite-single";
export const ENGINE_PATH = path.join(
  ROOT,
  `node_modules/stockfish/bin/${ENGINE_BUILD}.js`,
);

/**
 * Start an engine.
 * @param {object} [options] engine options
 * @param {number} [options.multiPV] number of lines to report
 * @returns {object} `{ init, search, score, quit }`
 */
export const createEngine = ({ multiPV = 1 } = {}) => {
  const proc = spawn(process.execPath, [ENGINE_PATH], {
    stdio: ["pipe", "pipe", "ignore"],
  });

  let buffer = "";
  proc.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
  });

  const send = (line) => proc.stdin.write(`${line}\n`);

  const waitFor = (pattern, timeoutMs = 120_000) =>
    new Promise((resolve, reject) => {
      const started = Date.now();
      const poll = setInterval(() => {
        const match = buffer.match(pattern);
        if (match) {
          clearInterval(poll);
          resolve(match);
        } else if (Date.now() - started > timeoutMs) {
          clearInterval(poll);
          reject(new Error(`engine timeout waiting for ${pattern}`));
        }
      }, 20);
    });

  let currentMultiPV = null;

  /**
   * Run one search and hand back every info line it produced.
   *
   * MultiPV is set per search rather than once at construction, because it is
   * part of the analysis contract and different position types are certified
   * under different ones — endgames at MultiPV 1 to match `verify:endgames`,
   * puzzles at 3 so a solution can be ranked against alternatives. Searching at
   * 3 and reading line 1 is **not** the same verdict as searching at 1: the
   * effort is split, and an endgame that reads +2.4 at MultiPV 1 can read +1.8
   * at MultiPV 3 — enough to fail a WIN threshold that was calibrated at 1.
   */
  const search = async (fen, movetimeMs, lines = multiPV) => {
    buffer = "";
    if (lines !== currentMultiPV) {
      send(`setoption name MultiPV value ${lines}`);
      currentMultiPV = lines;
    }
    send("ucinewgame");
    send("isready");
    await waitFor(/readyok/);

    buffer = "";
    send(`position fen ${fen}`);
    send(`go movetime ${movetimeMs}`);
    await waitFor(/^bestmove/m, movetimeMs + 120_000);
    return buffer;
  };

  /** The best line's score, from the side to move. */
  const parseScore = (output, lines = multiPV) => {
    let best = null;
    for (const line of output.split("\n")) {
      if (lines > 1 && !/multipv 1\b/.test(line)) continue;
      const match = line.match(/score (cp|mate) (-?\d+)/);
      if (match) best = match;
    }
    if (!best) return null;
    return best[1] === "mate"
      ? { mate: Number(best[2]) }
      : { cp: Number(best[2]) };
  };

  /** Every MultiPV line's first move and score, best first. */
  const parseLines = (output) => {
    const byIndex = new Map();
    for (const line of output.split("\n")) {
      if (!line.startsWith("info") || !line.includes(" pv ")) continue;
      const index = Number(line.match(/multipv (\d+)/)?.[1] ?? 1);
      const cp = line.match(/score cp (-?\d+)/);
      const mate = line.match(/score mate (-?\d+)/);
      const pv = line.match(/ pv (.+)$/);
      if (!pv || (!cp && !mate)) continue;
      byIndex.set(index, {
        index,
        uci: pv[1].trim().split(" ")[0],
        cp: cp ? Number(cp[1]) : null,
        mate: mate ? Number(mate[1]) : null,
      });
    }
    return [...byIndex.values()].sort((a, b) => a.index - b.index);
  };

  return {
    init: async () => {
      send("uci");
      await waitFor(/uciok/);
      send(`setoption name MultiPV value ${multiPV}`);
      currentMultiPV = multiPV;
      send("isready");
      await waitFor(/readyok/);
    },

    /** Search one position and return its score from the side to move. */
    score: async (fen, movetimeMs, pv = multiPV) =>
      parseScore(await search(fen, movetimeMs, pv), pv),

    /** Search one position and return its ranked candidate moves. */
    lines: async (fen, movetimeMs, pv = multiPV) =>
      parseLines(await search(fen, movetimeMs, pv)),

    quit: () => {
      send("quit");
      proc.kill();
    },
  };
};

/** A score rendered for a log line. */
export const describeScore = (score) => {
  if (!score) return "?";
  if (score.mate !== undefined && score.mate !== null) {
    return `mate ${score.mate}`;
  }
  return (score.cp / 100).toFixed(2);
};
