/** One block: the instrumentation layer. eslint.config.js orders it against the rest. */

import { forbiddenFor } from "../matrix.js";
import { NO_PHASER_IMPORT } from "../rules/no-phaser-import.js";

/** Measures. Preallocated sample rings that know nothing about the world they measure. */
export const instrumentationLayer = {
  files: ["src/instrumentation/**/*.ts"],
  rules: {
    "@typescript-eslint/no-restricted-imports": [
      "error",
      { patterns: [forbiddenFor("instrumentation"), NO_PHASER_IMPORT] },
    ],
  },
};
