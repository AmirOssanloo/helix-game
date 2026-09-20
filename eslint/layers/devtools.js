/** One block: the devtools layer. eslint.config.js orders it against the rest. */

import { forbiddenFor } from "../matrix.js";
import { DOMAIN_FACADE, SIMULATION_FACADE } from "../rules/facades.js";
import { NO_PHASER_IMPORT } from "../rules/no-phaser-import.js";

/**
 * The developer panel: plain DOM outside the canvas that submits commands and reads the view
 * and the rings. It enters the two inner layers only through their public doors, and it may
 * warn and error to the console because a panel failure has nowhere else to go.
 */
export const devtoolsLayer = {
  files: ["src/devtools/**/*.ts"],
  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
    "@typescript-eslint/no-restricted-imports": [
      "error",
      {
        patterns: [
          forbiddenFor("devtools"),
          DOMAIN_FACADE,
          SIMULATION_FACADE,
          NO_PHASER_IMPORT,
        ],
      },
    ],
  },
};
