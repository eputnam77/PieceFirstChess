#!/usr/bin/env node
/**
 * Import drill positions for the tactical and mating tiers from the Lichess
 * puzzle database (CC0).
 *
 *   npm run import:puzzles
 *
 * Streams https://database.lichess.org/lichess_db_puzzle.csv.zst, keeps only
 * puzzles that match a curriculum item, and writes `src/data/lichess-positions.js`.
 * Nothing is written to disk except the output file — the archive is filtered
 * on the fly and the scan stops as soon as every item has filled its quota.
 *
 * Two details of the source format matter and are easy to get wrong:
 *
 * 1. The archive is a *concatenation* of zstd frames, opening with a skippable
 *    one. Node's decompressor stops after the first frame, which silently
 *    yields only the opening 3% of the database, so decompression goes through
 *    `zstd-frames.js` instead.
 *
 * 2. A row's `FEN` is the position *before* the opponent's blunder, and
 *    `Moves[0]` is that blunder. The position the student actually sees is the
 *    one after `Moves[0]`, and the solution is `Moves[1..]`. Using the raw FEN
 *    would present every puzzle one ply too early.
 *
 * That second detail is also free content for the PF7 VERIFY drill: the raw FEN
 * plus `Moves[0]` is a real "is this move safe?" position whose refutation is
 * already known. Those pairs are emitted as `LICHESS_BLUNDER_CHECKS`.
 *
 * Which puzzle teaches which curriculum item is decided by `puzzle-matchers.js`.
 *
 * Environment overrides: PUZZLE_URL, PER_ITEM, MIN_RATING, MAX_RATING,
 * MIN_POPULARITY, MAX_ROWS, PER_BLUNDER_CHECK.
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";

import {
  makeContext,
  MATCHERS,
  matchesPiece,
  toPosition,
} from "./puzzle-matchers.js";
import { createMultiFrameZstdDecompress } from "./zstd-frames.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = path.join(ROOT, "src/data/lichess-positions.js");

const URL_SOURCE =
  process.env.PUZZLE_URL ??
  "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const PER_ITEM = Number(process.env.PER_ITEM ?? 8);
const MIN_RATING = Number(process.env.MIN_RATING ?? 800);
const MAX_RATING = Number(process.env.MAX_RATING ?? 1900);
const MIN_POPULARITY = Number(process.env.MIN_POPULARITY ?? 85);
const MAX_ROWS = Number(process.env.MAX_ROWS ?? 6_000_000);
const PER_BLUNDER_CHECK = Number(process.env.PER_BLUNDER_CHECK ?? 18);

// ── PF7 VERIFY drills ────────────────────────────────────────────────────────

/**
 * Harvest a "is this move safe?" drill from a row.
 *
 * The row's raw FEN is a position where the mover is about to allow a decisive
 * tactic, and `Moves[0]` is that move — a genuine "no, that is not safe" case
 * whose refutation is the puzzle's own first solution move. The presented
 * position paired with its best move gives the "yes, that is safe" case, so the
 * drill cannot be answered by pattern-matching the question.
 * @param {object} store accumulator with `unsafe` and `safe` arrays
 * @param {object} position a converted position
 */
const collectBlunderCheck = (store, position) => {
  if (store.unsafe.length < PER_BLUNDER_CHECK) {
    store.unsafe.push({
      id: position.id,
      fen: position.beforeFen,
      candidate: position.blunder,
      safe: false,
      refutation: position.solution[0],
      rating: position.rating,
    });
    return;
  }
  if (store.safe.length < PER_BLUNDER_CHECK) {
    store.safe.push({
      id: position.id,
      fen: position.fen,
      candidate: position.solution[0],
      safe: true,
      rating: position.rating,
    });
  }
};

// ── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  const wanted = new Map();
  for (const matcher of MATCHERS) {
    if (!wanted.has(matcher.itemId)) wanted.set(matcher.itemId, []);
  }
  const byTheme = new Map();
  for (const matcher of MATCHERS) {
    for (const theme of matcher.themes) {
      if (!byTheme.has(theme)) byTheme.set(theme, []);
      byTheme.get(theme).push(matcher);
    }
  }

  const blunderChecks = { unsafe: [], safe: [] };
  const blunderChecksFull = () =>
    blunderChecks.unsafe.length >= PER_BLUNDER_CHECK &&
    blunderChecks.safe.length >= PER_BLUNDER_CHECK;

  console.log(`Streaming ${URL_SOURCE}`);
  console.log(
    `rating ${MIN_RATING}-${MAX_RATING}, popularity >= ${MIN_POPULARITY}, ${PER_ITEM} per item`,
  );
  console.log(`${wanted.size} curriculum items wanted\n`);

  const response = await fetch(URL_SOURCE);
  if (!response.ok) throw new Error(`download failed: ${response.status}`);

  const decompressed = Readable.fromWeb(response.body).pipe(
    createMultiFrameZstdDecompress(),
  );
  decompressed.on("error", (error) => {
    console.error("decompression error:", error.message);
    process.exit(1);
  });

  const lines = readline.createInterface({
    input: decompressed,
    crlfDelay: Infinity,
  });

  let scanned = 0;
  let header = false;
  let filled = 0;

  for await (const line of lines) {
    if (!header) {
      header = true;
      continue;
    }
    if (!line) continue;
    if (++scanned > MAX_ROWS) break;
    if (scanned % 500_000 === 0) {
      console.log(
        `  ... ${scanned.toLocaleString()} rows, ${filled}/${wanted.size} items filled`,
      );
    }

    const cols = line.split(",");
    const rating = Number(cols[3]);
    const popularity = Number(cols[5]);
    if (rating < MIN_RATING || rating > MAX_RATING) continue;
    if (popularity < MIN_POPULARITY) continue;

    const themes = cols[7] ? cols[7].split(" ") : [];
    const candidates = [
      ...new Set(themes.flatMap((theme) => byTheme.get(theme) ?? [])),
    ];
    const open = candidates
      .filter((matcher) => wanted.get(matcher.itemId).length < PER_ITEM)
      .sort((a, b) => a.priority - b.priority);
    if (open.length === 0 && blunderChecksFull()) continue;

    const position = toPosition({
      id: cols[0],
      fen: cols[1],
      moves: cols[2],
      rating,
    });
    if (!position) continue;

    // Verify drills come from any sound row, not only ones that matched an item.
    if (!blunderChecksFull()) collectBlunderCheck(blunderChecks, position);
    if (open.length === 0) continue;

    const context = makeContext(position);
    for (const matcher of open) {
      if (!matchesPiece(matcher, position.firstPiece)) continue;
      if (matcher.match && !matcher.match(context)) continue;

      const bucket = wanted.get(matcher.itemId);
      bucket.push(position);
      if (bucket.length === PER_ITEM) {
        filled++;
        console.log(
          `  filled ${matcher.itemId} (${filled}/${wanted.size}) after ${scanned.toLocaleString()} rows`,
        );
      }
      break;
    }

    if (filled === wanted.size && blunderChecksFull()) break;
  }

  lines.close();
  decompressed.destroy();

  const withContent = [...wanted.entries()].filter(
    ([, list]) => list.length > 0,
  );
  console.log(
    `\nScanned ${scanned.toLocaleString()} rows. ${withContent.length}/${wanted.size} items have positions.`,
  );
  for (const [itemId, list] of wanted) {
    const flag = list.length === 0 ? "  EMPTY" : "";
    console.log(`  ${itemId}  ${String(list.length).padStart(2)}${flag}`);
  }
  console.log(
    `  verify drills: ${blunderChecks.unsafe.length} unsafe, ${blunderChecks.safe.length} safe`,
  );

  await writeFormatted(writeOutput(wanted, blunderChecks));
  process.exit(0);
};

/**
 * Build the generated data module's source text.
 * @param {Map} wanted item id to collected positions
 * @param {object} blunderChecks accumulated verify drills
 * @returns {string} the module source, before formatting
 */
const writeOutput = (wanted, blunderChecks) => {
  const entries = [...wanted.entries()]
    .filter(([, list]) => list.length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([itemId, list]) => {
      const positions = list
        .map(
          (p) =>
            `    {\n      id: "lichess-${p.id}",\n      fen: "${p.fen}",\n      solution: [${p.solution
              .map((m) => `"${m}"`)
              .join(", ")}],\n      rating: ${p.rating},\n    },`,
        )
        .join("\n");
      return `  "${itemId}": [\n${positions}\n  ],`;
    })
    .join("\n");

  const verify = [...blunderChecks.unsafe, ...blunderChecks.safe]
    .map((check) => {
      const refutation = check.refutation
        ? `    refutation: "${check.refutation}",\n`
        : "";
      return `  {
    id: "verify-${check.id}${check.safe ? "-safe" : ""}",
    fen: "${check.fen}",
    candidate: "${check.candidate}",
    safe: ${check.safe},
${refutation}    rating: ${check.rating},
  },`;
    })
    .join("\n");

  const banner = `/**
 * Drill positions imported from the Lichess puzzle database (CC0).
 *
 * GENERATED FILE — do not edit by hand. Regenerate with:
 *   npm run import:puzzles
 *
 * Each FEN is the position the student is shown, already advanced past the
 * opponent's setup move, and every solution line has been replayed with
 * chess.js so it is known legal. Source: https://database.lichess.org/
 *
 * LICHESS_BLUNDER_CHECKS backs the PF7 VERIFY drill: each entry is a position
 * plus one candidate move, and whether that move survives a blunder scan. The
 * unsafe ones are real moves that allowed a decisive tactic, with the
 * refutation attached.
 *
 * Generated ${new Date().toISOString().slice(0, 10)} from puzzles rated
 * ${MIN_RATING}-${MAX_RATING} with popularity >= ${MIN_POPULARITY}.
 */

export const LICHESS_POSITIONS = {
${entries}
};

export const LICHESS_BLUNDER_CHECKS = [
${verify}
];
`;

  return banner;
};

/**
 * Write the generated module, formatted the way the rest of the repo is.
 *
 * Running the output through Prettier rather than trying to emit
 * Prettier-compatible text by hand: a long solution line needs wrapping and a
 * short one does not, and guessing which is which is how a generated file ends
 * up permanently failing `npm run lint`.
 * @param {string} source the module text
 */
const writeFormatted = async (source) => {
  let output = source;
  try {
    const prettier = await import("prettier");
    const options = (await prettier.resolveConfig(OUT_FILE)) ?? {};
    output = await prettier.format(source, { ...options, filepath: OUT_FILE });
  } catch (error) {
    console.warn(
      `Could not format the output (${error.message}); writing it unformatted.`,
    );
  }
  fs.writeFileSync(OUT_FILE, output);
  console.log(`\nWrote ${path.relative(ROOT, OUT_FILE)}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
