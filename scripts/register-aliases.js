/**
 * Install the path-alias resolver for a Node script run.
 *
 *   node --import ./scripts/register-aliases.js scripts/verify-drills.js
 *
 * Separate from `alias-hooks.js` because `module.register()` loads the hooks on
 * their own thread, so the two cannot be the same file.
 */

import { register } from "node:module";

register(new URL("./alias-hooks.js", import.meta.url));
