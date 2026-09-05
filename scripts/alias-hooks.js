/**
 * Path-alias resolution for plain Node, so build-time scripts can import app
 * modules that use `@/…`.
 *
 * `verify-drills.js` needs `curriculum-positions.js`, which imports through the
 * aliases. Vite, Vitest, jsconfig and ESLint each know about them; `node` does
 * not, and the alternative to teaching it was pulling in a runner as a
 * dependency for one script.
 *
 * **The alias list is read from `jsconfig.json` rather than restated here.**
 * CLAUDE.md already warns that aliases live in four places that must stay in
 * sync; a fifth hand-written copy is exactly the bug that warning is about.
 *
 * Registered by `scripts/register-aliases.js`:
 *   node --import ./scripts/register-aliases.js scripts/verify-drills.js
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** `{ "@/": "<root>/src/", … }`, straight out of jsconfig's `paths`. */
const ALIASES = (() => {
  const config = JSON.parse(
    readFileSync(path.join(ROOT, "jsconfig.json"), "utf8"),
  );
  const paths = config.compilerOptions?.paths ?? {};
  const map = [];
  for (const [pattern, [target]] of Object.entries(paths)) {
    if (!pattern.endsWith("/*") || !target?.endsWith("/*")) continue;
    map.push([
      pattern.slice(0, -1),
      path.resolve(ROOT, target.slice(0, -1)) + path.sep,
    ]);
  }
  // Longest prefix first, so "@lib/" is not swallowed by a shorter "@/".
  return map.sort(([a], [b]) => b.length - a.length);
})();

/** Node needs a real file; the app writes extensionless imports. */
const withExtension = (filePath) => {
  if (existsSync(filePath) && !filePath.endsWith(path.sep)) return filePath;
  for (const candidate of [
    `${filePath}.js`,
    `${filePath}.jsx`,
    path.join(filePath, "index.js"),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return filePath;
};

/**
 * Resolve hook.
 * @param {string} specifier the import specifier
 * @param {object} context resolution context
 * @param {Function} next the next hook in the chain
 * @returns {object} the resolution
 */
export const resolve = (specifier, context, next) => {
  for (const [prefix, target] of ALIASES) {
    if (!specifier.startsWith(prefix)) continue;
    const resolved = withExtension(
      path.join(target, specifier.slice(prefix.length)),
    );
    return next(pathToFileURL(resolved).href, context);
  }
  return next(specifier, context);
};
