/** One block: the presentation layer. eslint.config.js orders it against the rest. */

import { forbiddenFor } from "../matrix.js";
import { DOMAIN_FACADE, SIMULATION_FACADE } from "../rules/facades.js";

/**
 * Adapts. The one layer that imports Phaser, so the Phaser ban is absent. It enters the two
 * inner layers only through their public doors.
 *
 * The Shape, Graphics, and `Text` factory bans it lives under come from ../src-files.js; this
 * block does not set `no-restricted-syntax`, so that array stays in force. ./boot-scene.js
 * narrows it for the one file allowed a static `Text`.
 */
export const presentationLayer = {
  files: ["src/presentation/**/*.ts"],
  rules: {
    "@typescript-eslint/no-restricted-imports": [
      "error",
      {
        patterns: [
          forbiddenFor("presentation"),
          DOMAIN_FACADE,
          SIMULATION_FACADE,
        ],
      },
    ],
  },
};
