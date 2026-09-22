import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { DEVTOOLS_SENTINEL } from "./src/devtools/devtools-sentinel.ts";

const LAYERS = [
  "shared",
  "domain",
  "simulation",
  "content",
  "instrumentation",
  "presentation",
  "devtools",
  "app",
] as const;

/** One alias per layer, `@<layer>` to `src/<layer>`, matching the paths in tsconfig.json. The Vitest config reuses it. */
export const layerAliases = (): Record<string, string> =>
  Object.fromEntries(
    LAYERS.map((layer) => [
      `@${layer}`,
      fileURLToPath(new URL(`./src/${layer}`, import.meta.url)),
    ]),
  );

/** The pane the developer panel is built from, which ships only where the panel does. */
const PANE_MODULE = /[\\/]tweakpane[\\/]/;

/** The build that is the production game with the developer panel left in, for people to play with. */
const PLAYTEST_MODE = "playtest";

/**
 * Holds a build to what it says it is, in both directions.
 *
 * The panel mount writes the sentinel into its host, so the string is in the output exactly when
 * the panel is: a production build carrying it has leaked the panel, and a playtest build without
 * it has lost the thing it exists to carry. The pane is checked beside the sentinel because a
 * bundler that keeps a module for its side effects keeps it whole and silent, and by then the
 * panel's own code is gone for the sentinel to catch it by.
 */
const devtoolsBuildCheck = (panel: boolean): Plugin => ({
  name: "helix:devtools-build-check",
  apply: "build",
  generateBundle(_options, bundle): void {
    let sentinel: string | null = null;
    let pane: string | null = null;

    for (const output of Object.values(bundle)) {
      if (output.type !== "chunk") {
        continue;
      }

      if (output.code.includes(DEVTOOLS_SENTINEL)) {
        sentinel = output.fileName;
      }

      const found = Object.keys(output.modules).find((id) =>
        PANE_MODULE.test(id),
      );

      if (found !== undefined) {
        pane = found;
      }
    }

    if (!panel && sentinel !== null) {
      this.error(
        `Developer-panel code reached the production bundle in ${sentinel}. ` +
          "Mount the panel only inside the __PANEL__ branch of src/app/main.ts.",
      );
    }

    if (!panel && pane !== null) {
      this.error(
        `The developer panel's pane reached the production bundle, from ${pane}. ` +
          "It is kept out by build.rollupOptions.treeshake.moduleSideEffects in this file.",
      );
    }

    if (panel && (sentinel === null || pane === null)) {
      this.error(
        `The ${PLAYTEST_MODE} build has no developer panel in it: the game is published with the panel ` +
          "beside it, and without one there is nothing to play with. Check the __PANEL__ define.",
      );
    }
  },
});

export default defineConfig(({ mode }) => {
  const development = mode === "development";
  // Where the panel is part of the build. The playtest build is the production game — no
  // development path, no assert that throws — published with the panel beside it.
  const panel = development || mode === PLAYTEST_MODE;

  return {
    // A built page asks for its bundle beside itself, so the build runs from any path a static
    // host serves it under — a project page under the repository name as readily as a domain root.
    // The dev server serves from the root, where the bench entry is an absolute path away.
    base: development ? "/" : "./",
    define: {
      __DEV__: JSON.stringify(development),
      __PANEL__: JSON.stringify(panel),
    },
    resolve: {
      alias: layerAliases(),
    },
    build: {
      rollupOptions: {
        treeshake: {
          // The pane declares no side effects of its own, so a bundler assumes the worst and keeps
          // it whole even once the only code that builds one is gone. Saying so here is what lets
          // the production build drop it with the panel, and the check above holds us to it.
          moduleSideEffects: [{ test: PANE_MODULE, sideEffects: false }],
        },
      },
    },
    plugins: [devtoolsBuildCheck(panel)],
  };
});
