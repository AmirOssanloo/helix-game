/**
 * True under the Vite dev server and in every test, false in a production build. Set by the
 * `define` in vite.config.ts and vitest.config.ts, so a branch on it is dropped from the
 * bundle when false.
 */
declare const __DEV__: boolean;
