/** One block: the shared layer. eslint.config.js orders it against the rest. */

import { forbiddenFor } from "../matrix.js";
import { NO_PHASER_IMPORT } from "../rules/no-phaser-import.js";

/** Pure helpers with no game knowledge. Its matrix row is empty, so every layer folder is forbidden. */
export const sharedLayer = {
  files: ["src/shared/**/*.ts"],
  rules: {
    "@typescript-eslint/no-restricted-imports": [
      "error",
      { patterns: [forbiddenFor("shared"), NO_PHASER_IMPORT] },
    ],
  },
};
