/** One block: the simulation layer. eslint.config.js orders it against the rest. */

import { forbiddenFor } from "../matrix.js";
import { NO_AMBIENT_TIME_IN_SIMULATION } from "../rules/no-ambient-time-in-simulation.js";
import { NO_DOM_GLOBALS } from "../rules/no-dom-in-simulation.js";
import { NO_PHASER_IMPORT } from "../rules/no-phaser-import.js";
import { NO_WORLD_VIEW_CAST } from "../rules/no-world-view-cast.js";
import { SRC_SYNTAX } from "../src-files.js";

/** The world-view cast ban is dropped here: the simulation owns the live world the view is a type over. */
const SIMULATION_SYNTAX = SRC_SYNTAX.filter(
  (entry) => !NO_WORLD_VIEW_CAST.includes(entry),
);

/**
 * Orchestrates. Owns a world and steps it, in Node with no screen and no clock.
 *
 * Setting `no-restricted-syntax` here replaces the src-wide array for these files, which is
 * why the src list is spread back in before the determinism bans are added.
 */
export const simulationLayer = {
  files: ["src/simulation/**/*.ts"],
  rules: {
    "no-restricted-syntax": [
      "error",
      ...SIMULATION_SYNTAX,
      ...NO_AMBIENT_TIME_IN_SIMULATION,
    ],
    "no-restricted-globals": ["error", ...NO_DOM_GLOBALS],
    "@typescript-eslint/no-restricted-imports": [
      "error",
      { patterns: [forbiddenFor("simulation"), NO_PHASER_IMPORT] },
    ],
  },
};
