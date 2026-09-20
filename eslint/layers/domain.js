/** One block: the domain layer. eslint.config.js orders it against the rest. */

import { forbiddenFor } from "../matrix.js";
import { NO_AMBIENT_TIME_IN_SIMULATION } from "../rules/no-ambient-time-in-simulation.js";
import { NO_DOM_GLOBALS } from "../rules/no-dom-in-simulation.js";
import { NO_PHASER_IMPORT } from "../rules/no-phaser-import.js";
import { SRC_SYNTAX } from "../src-files.js";

/**
 * Decides. Pure rules over plain state, run in Node with no screen and no clock.
 *
 * Setting `no-restricted-syntax` here replaces the src-wide array for these files, which is
 * why `SRC_SYNTAX` is spread back in before the determinism bans are added.
 */
export const domainLayer = {
  files: ["src/domain/**/*.ts"],
  rules: {
    "no-restricted-syntax": [
      "error",
      ...SRC_SYNTAX,
      ...NO_AMBIENT_TIME_IN_SIMULATION,
    ],
    "no-restricted-globals": ["error", ...NO_DOM_GLOBALS],
    "@typescript-eslint/no-restricted-imports": [
      "error",
      { patterns: [forbiddenFor("domain"), NO_PHASER_IMPORT] },
    ],
  },
};
