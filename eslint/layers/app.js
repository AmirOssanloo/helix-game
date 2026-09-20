/** One block: the app layer. eslint.config.js orders it against the rest. */

/**
 * The composition root. Its matrix row allows every layer, so `forbiddenFor('app')` is null
 * and no import rule is written; it is the one place that knows concrete wiring, the Phaser
 * game config included. It may warn and error to the console because a boot failure has
 * nowhere else to go.
 */
export const appLayer = {
  files: ["src/app/**/*.ts"],
  rules: {
    "no-console": ["error", { allow: ["warn", "error"] }],
  },
};
