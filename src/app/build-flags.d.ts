/**
 * True under the Vite dev server and in every test, false in a build. Set by the `define` in
 * vite.config.ts and vitest.config.ts, so a branch on it is dropped from the bundle when false.
 * It says how the code behaves — an `assert` throws under it — and nothing about who is watching.
 */
declare const __DEV__: boolean;

/**
 * True where the developer panel is part of the build: under the dev server, in every test, and
 * in the playtest build that is published for people to play with. False in the production build,
 * which has no trace of the panel, of `DevApi`, or of the pane either is built from.
 *
 * It is separate from `__DEV__` because the two questions are different. The playtest build is the
 * game as it ships — an `assert` does not throw in it and nothing runs a development path — with
 * the panel left in beside it.
 */
declare const __PANEL__: boolean;
