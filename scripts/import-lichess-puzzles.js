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
 * 1. The archive begins with a zstd *skippable frame* (magic 0x184D2A50). Node's
 *    decompressor rejects it with "Unknown frame descriptor", so leading
 *    skippable frames are stripped before decompression.
 *
 * 2. A row's `FEN` is the position *before* the opponent's blunder, and
 *    `Moves[0]` is that blunder. The position the student actually sees is the
 *    one after `Moves[0]`, and the solution is `Moves[1..]`. Using the raw FEN
 *    would present every puzzle one ply too early.
 *
 * Environment overrides: PUZZLE_URL, PER_ITEM, MIN_RATING, MAX_RATING,
 * MIN_POPULARITY, MAX_ROWS.
 */

import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Readable, Transform } from "node:stream";
import { fileURLToPath } from "node:url";
import { createZstdDecompress } from "node:zlib";

import { Chess } from "chess.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_FILE = path.join(ROOT, "src/data/lichess-positions.js");

const URL_SOURCE =
  process.env.PUZZLE_URL ??
  "https://database.lichess.org/lichess_db_puzzle.csv.zst";
const PER_ITEM = Number(process.env.PER_ITEM ?? 8);
const MIN_RATING = Number(process.env.MIN_RATING ?? 800);
const MAX_RATING = Number(process.env.MAX_RATING ?? 1900);
const MIN_POPULARITY = Number(process.env.MIN_POPULARITY ?? 85);
const MAX_ROWS = Number(process.env.MAX_ROWS ?? 2_000_000);

/**
 * Lichess theme → curriculum item.
 *
 * Only mappings that are unambiguous appear here. Lichess themes such as
 * `dovetailMate` or `killBoxMate` have no counterpart in the curriculum, and
 * generic `mate` tells us nothing about *which* pattern — filing those under a
 * named item would drill a wrong association, which is worse than no content.
 *
 * `piece` narrows a generic theme to the curriculum item's actual subject: the
 * Lichess `fork` theme covers every piece, but item T-01 is specifically the
 * knight fork, so the student's first move must be a knight move.
 */
const THEME_MAP = [
  { theme: "fork", itemId: "T-01", piece: "n" },
  { theme: "fork", itemId: "T-02", piece: "p" },
  { theme: "fork", itemId: "T-03", piece: "q" },
  { theme: "fork", itemId: "T-04", piece: ["b", "r"] },
  { theme: "pin", itemId: "T-06" },
  { theme: "skewer", itemId: "T-08" },
  { theme: "xRayAttack", itemId: "T-09" },
  { theme: "discoveredAttack", itemId: "T-11" },
  { theme: "doubleCheck", itemId: "T-13" },
  { theme: "deflection", itemId: "T-15" },
  { theme: "attraction", itemId: "T-16" },
  { theme: "capturingDefender", itemId: "T-18" },
  { theme: "interference", itemId: "T-19" },
  { theme: "advancedPawn", itemId: "T-21" },
  { theme: "promotion", itemId: "T-22" },
  { theme: "intermezzo", itemId: "T-25" },
  { theme: "zugzwang", itemId: "T-27" },
  { theme: "clearance", itemId: "T-28" },
  { theme: "trappedPiece", itemId: "T-30" },
  { theme: "backRankMate", itemId: "M-01" },
  { theme: "smotheredMate", itemId: "M-02" },
  { theme: "anastasiaMate", itemId: "M-03" },
  { theme: "arabianMate", itemId: "M-04" },
  { theme: "bodenMate", itemId: "M-05" },
  { theme: "hookMate", itemId: "M-09" },
  { theme: "vukovicMate", itemId: "M-16" },
];

// ── zstd skippable-frame handling ────────────────────────────────────────────

const SKIPPABLE_MIN = 0x184d2a50;
const SKIPPABLE_MAX = 0x184d2a5f;

/**
 * Strip leading zstd skippable frames.
 *
 * The Lichess archive opens with one, and Node's decompressor treats it as a
 * corrupt header rather than skipping it.
 * @returns {Transform} a pass-through that removes leading skippable frames
 */
const stripSkippableFrames = () => {
  let head = Buffer.alloc(0);
  let done = false;

  return new Transform({
    transform(chunk, _encoding, callback) {
      if (done) return callback(null, chunk);

      head = Buffer.concat([head, chunk]);
      // Need at least a frame header before deciding.
      while (head.length >= 8) {
        const magic = head.readUInt32LE(0);
        if (magic < SKIPPABLE_MIN || magic > SKIPPABLE_MAX) break;
        const size = head.readUInt32LE(4);
        if (head.length < 8 + size) return callback();
        head = head.subarray(8 + size);
      }
      if (head.length < 8) return callback();

      done = true;
      const out = head;
      head = Buffer.alloc(0);
      return callback(null, out);
    },
    flush(callback) {
      if (head.length > 0) this.push(head);
      callback();
    },
  });
};

// ── Conversion ───────────────────────────────────────────────────────────────

/**
 * Turn a Lichess CSV row into a drill position, or null if unusable.
 *
 * Applies the opponent's setup move so the student sees the real puzzle.
 * @param {object} row parsed CSV row
 * @returns {object|null} position, or null when the row cannot be converted
 */
const toPosition = (row) => {
  const moves = row.moves.split(" ").filter(Boolean);
  if (moves.length < 2) return null;

  const game = new Chess();
  try {
    game.load(row.fen);
    // Moves[0] is the opponent's blunder that creates the puzzle.
    const setup = game.move({
      from: moves[0].slice(0, 2),
      to: moves[0].slice(2, 4),
      promotion: moves[0][4],
    });
    if (!setup) return null;
  } catch {
    return null;
  }

  const solution = moves.slice(1);
  const fen = game.fen();

  // Verify the whole solution is legal from the presented position, so a bad
  // row can never reach the app as an unsolvable drill.
  const check = new Chess(fen);
  let firstPiece = null;
  for (const [index, uci] of solution.entries()) {
    try {
      const played = check.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci[4],
      });
      if (!played) return null;
      if (index === 0) firstPiece = played.piece;
    } catch {
      return null;
    }
  }

  return { id: row.id, fen, solution, firstPiece, rating: row.rating };
};

const matchesPiece = (mapping, firstPiece) => {
  if (!mapping.piece) return true;
  return Array.isArray(mapping.piece)
    ? mapping.piece.includes(firstPiece)
    : mapping.piece === firstPiece;
};

// ── Main ─────────────────────────────────────────────────────────────────────

const main = async () => {
  const wanted = new Map();
  for (const mapping of THEME_MAP) {
    if (!wanted.has(mapping.itemId)) wanted.set(mapping.itemId, []);
  }
  const byTheme = new Map();
  for (const mapping of THEME_MAP) {
    if (!byTheme.has(mapping.theme)) byTheme.set(mapping.theme, []);
    byTheme.get(mapping.theme).push(mapping);
  }

  console.log(`Streaming ${URL_SOURCE}`);
  console.log(
    `rating ${MIN_RATING}-${MAX_RATING}, popularity >= ${MIN_POPULARITY}, ${PER_ITEM} per item\n`,
  );

  const response = await fetch(URL_SOURCE);
  if (!response.ok) throw new Error(`download failed: ${response.status}`);

  const decompressed = Readable.fromWeb(response.body)
    .pipe(stripSkippableFrames())
    .pipe(createZstdDecompress());
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

    const cols = line.split(",");
    const rating = Number(cols[3]);
    const popularity = Number(cols[5]);
    if (rating < MIN_RATING || rating > MAX_RATING) continue;
    if (popularity < MIN_POPULARITY) continue;

    const themes = cols[7] ? cols[7].split(" ") : [];
    const candidates = themes.flatMap((theme) => byTheme.get(theme) ?? []);
    if (candidates.length === 0) continue;

    const open = candidates.filter(
      (mapping) => wanted.get(mapping.itemId).length < PER_ITEM,
    );
    if (open.length === 0) continue;

    const position = toPosition({
      id: cols[0],
      fen: cols[1],
      moves: cols[2],
      rating,
    });
    if (!position) continue;

    for (const mapping of open) {
      if (!matchesPiece(mapping, position.firstPiece)) continue;
      const bucket = wanted.get(mapping.itemId);
      if (bucket.length >= PER_ITEM) continue;
      bucket.push(position);
      if (bucket.length === PER_ITEM) {
        filled++;
        console.log(
          `  filled ${mapping.itemId} (${filled}/${wanted.size}) after ${scanned.toLocaleString()} rows`,
        );
      }
      break;
    }

    if (filled === wanted.size) break;
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

  writeOutput(wanted);
  process.exit(0);
};

/** Emit the generated data module. */
const writeOutput = (wanted) => {
  const entries = [...wanted.entries()]
    .filter(([, list]) => list.length > 0)
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
 * Generated ${new Date().toISOString().slice(0, 10)} from puzzles rated
 * ${MIN_RATING}-${MAX_RATING} with popularity >= ${MIN_POPULARITY}.
 */

export const LICHESS_POSITIONS = {
${entries}
};

export default LICHESS_POSITIONS;
`;

  fs.writeFileSync(OUT_FILE, banner, "utf8");
  console.log(`\nWrote ${path.relative(ROOT, OUT_FILE)}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
