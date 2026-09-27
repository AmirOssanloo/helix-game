/** One block: the content layer. eslint.config.js orders it against the rest. */

import { forbiddenFor } from "../matrix.js";
import {
  doorsFor,
  DOMAIN_TYPES_ONLY,
  NO_TESTING_DOOR,
} from "../rules/facades.js";
import { NO_PHASER_IMPORT } from "../rules/no-phaser-import.js";

/**
 * Typed data. Its matrix row allows domain/, and the door entries narrow that to
 * `import type` from @domain/public: the domain's door entry blocks every other domain path, and the
 * types-only entry blocks a value import of the door.
 */
export const contentLayer = {
  files: ["src/content/**/*.ts"],
  rules: {
    "@typescript-eslint/no-restricted-imports": [
      "error",
      {
        patterns: [
          forbiddenFor("content"),
          ...doorsFor("content"),
          DOMAIN_TYPES_ONLY,
          NO_TESTING_DOOR,
          NO_PHASER_IMPORT,
        ],
      },
    ],
  },
};
