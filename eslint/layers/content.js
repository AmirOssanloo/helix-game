/** One block: the content layer. eslint.config.js orders it against the rest. */

import { forbiddenFor } from "../matrix.js";
import { DOMAIN_FACADE, DOMAIN_TYPES_ONLY } from "../rules/facades.js";
import { NO_PHASER_IMPORT } from "../rules/no-phaser-import.js";

/**
 * Typed data. Its matrix row allows domain/, and the two facade entries narrow that to
 * `import type` from @domain/public: the facade blocks every other domain path, and the
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
          DOMAIN_FACADE,
          DOMAIN_TYPES_ONLY,
          NO_PHASER_IMPORT,
        ],
      },
    ],
  },
};
