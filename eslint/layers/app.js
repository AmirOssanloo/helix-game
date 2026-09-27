/** One block: the app layer. eslint.config.js orders it against the rest. */

import { doorsFor, NO_TESTING_DOOR } from "../rules/facades.js";

/**
 * The composition root. Its matrix row allows every layer, so `forbiddenFor('app')` is null;
 * it is the one place that knows concrete wiring, the Phaser game config included, and it
 * still enters each layer only through the doors open to it. It is the one layer that writes
 * to the console: a boot failure has nowhere else to go, and the scenes hand it the lines a
 * person reads until the panel shows them.
 */
export const appLayer = {
  files: ["src/app/**/*.ts"],
  rules: {
    "no-console": ["error", { allow: ["log", "warn", "error"] }],
    "@typescript-eslint/no-restricted-imports": [
      "error",
      { patterns: [...doorsFor("app"), NO_TESTING_DOOR] },
    ],
  },
};
