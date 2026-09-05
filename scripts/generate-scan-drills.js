#!/usr/bin/env node
/**
 * Generate the `scan` and `sweep` drill corpus.
 *
 *   npm run generate:scan
 *
 * Writes `src/data/scan-drills.js`. Run it, commit the result, and the app
 * imports a plain data file — the same shape as every other generated source.
 *
 * Why build-time: enumerating knight-fork landing squares means replaying every
 * knight move and re-attacking the board for each, which costs seconds over a
 * few hundred positions. Paying that at app start to recompute a constant would
 * be the same mistake §83.2 already calls out for MultiPV. The answer keys are
 * proved* rather than searched, so they are stable — and `verify:drills`
 * re-proves them from the same function on every push, which is what stops the
 * committed file from drifting away from the generator.
 *
 * The corpus is every position already in the repo. That is the whole point of
 * this format: content authoring is the dominant cost in the curriculum, and
 * these escape it entirely (PRD §79.2).
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import { LICHESS_POSITIONS } from "../src/data/lichess-positions.js";
import { PUZZLES } from "../src/data/puzzles.js";
import { SCAN_RULES, generateScanSet } from "../src/pf/scan-drills.js";

import { ROOT } from "./uci-engine.js";

const OUTPUT = path.join(ROOT, "src/data/scan-drills.js");

/**
 * How many drills each curriculum item gets, and which rule feeds it.
 *
 * Caps rather than "everything available", for two reasons: the session builder
 * shows a rotating window of three positions per item, so a few dozen is
 * already months of non-repeating reps; and the file is committed, so its size
 * is a real cost paid by every page load.
 */
const PLAN = [
  {
    itemId: "PF-PROTOCOL",
    rules: [SCAN_RULES.LOOSE_MATERIAL],
    limit: 120,
    why: "PF2 SAFETY — the board sweep the protocol's second step is",
  },
  {
    itemId: "PF-PROTOCOL",
    rules: [SCAN_RULES.CHECK_SQUARES],
    limit: 40,
    why: "PF3 FORCE — every square you can give check from",
  },
  {
    itemId: "T-01",
    rules: [SCAN_RULES.KNIGHT_FORK],
    limit: 60,
    why: "the knight fork, as recognition rather than calculation",
  },
];

/** Every FEN in the repo, deduplicated, in a stable order. */
const corpus = () => {
  const rows = [];
  const seen = new Set();

  const add = (id, fen) => {
    if (!fen || seen.has(fen)) return;
    seen.add(fen);
    rows.push({ id, fen });
  };

  for (const puzzle of PUZZLES) add(`p-${puzzle.id}`, puzzle.fen);
  for (const [itemId, positions] of Object.entries(LICHESS_POSITIONS)) {
    for (const position of positions) {
      add(`l-${itemId}-${position.id}`, position.fen);
    }
  }
  return rows;
};

const main = () => {
  const source = corpus();
  const byItem = {};
  const counts = [];

  for (const { itemId, rules, limit, why } of PLAN) {
    const drills = generateScanSet({
      corpus: source,
      rules,
      limit,
      source: "generated",
    });
    byItem[itemId] = [...(byItem[itemId] ?? []), ...drills];
    counts.push({
      itemId,
      rule: rules.join("+"),
      got: drills.length,
      limit,
      why,
    });
  }

  const body = Object.entries(byItem)
    .map(([itemId, drills]) => {
      const entries = drills
        .map((drill) => `    ${JSON.stringify(drill)},`)
        .join("\n");
      return `  ${JSON.stringify(itemId)}: [\n${entries}\n  ],`;
    })
    .join("\n");

  const header = `/**
 * Generated \`scan\` and \`sweep\` drills. **Do not edit by hand.**
 *
 *   npm run generate:scan
 *
 * Every \`targets\` array here is a proved answer key, not a searched one: it
 * comes from \`chess.js\`'s own move generator and \`looseMaterial()\`, so it is
 * reproducible from the FEN beside it. \`npm run verify:drills\` re-proves all of
 * them with the same functions the generator used, so this file cannot drift
 * away from its own rules without CI saying so.
 *
 * Rules and their prompts live in \`src/pf/scan-drills.js\`.
 *
${counts.map((c) => ` * ${c.itemId} · ${c.rule} · ${c.got} drills — ${c.why}`).join("\n")}
 */

/* eslint-disable */

export const SCAN_POSITIONS = Object.freeze({
${body}
});
`;

  writeFileSync(OUTPUT, header);

  console.log(`Corpus: ${source.length} distinct positions.`);
  for (const c of counts) {
    console.log(
      `  ${c.itemId.padEnd(12)} ${c.rule.padEnd(16)} ${String(c.got).padStart(4)} / ${c.limit}`,
    );
  }
  const total = Object.values(byItem).flat().length;
  console.log(`\nWrote ${total} drills to ${path.relative(ROOT, OUTPUT)}`);
};

main();
