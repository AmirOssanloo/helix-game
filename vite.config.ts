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

/** The pane the developer panel is built from, which belongs to the panel and never ships with the game. */
const PANE_MODULE = /[\\/]tweakpane[\\/]/;

/**
 * Fails the build when developer-panel code reaches the bundle. The panel mount writes the sentinel
 * into its host, so the string is in the output exactly when the panel is; the pane the panel builds
 * itself from is checked separately, because a bundler that keeps a module for its side effects
 * keeps it whole and silent, and the panel's own code is gone by then for the sentinel to catch.
 */
const devtoolsStripCheck = (): Plugin => ({
  name: "helix:devtools-strip-check",
  apply: "build",
  generateBundle(_options, bundle): void {
    for (const output of Object.values(bundle)) {
      if (output.type !== "chunk") {
        continue;
      }

      if (output.code.includes(DEVTOOLS_SENTINEL)) {
        this.error(
          `Developer-panel code reached the production bundle in ${output.fileName}. ` +
            "Mount the panel only inside the __DEV__ branch of src/app/main.ts.",
        );
      }

      const pane = Object.keys(output.modules).find((id) =>
        PANE_MODULE.test(id),
      );

      if (pane !== undefined) {
        this.error(
          `The developer panel's pane reached the production bundle in ${output.fileName}, from ${pane}. ` +
            "It is kept out by build.rollupOptions.treeshake.moduleSideEffects in this file.",
        );
      }
    }
  },
});

export default defineConfig(({ mode }) => {
  const development = mode === "development";

  return {
    // A built page asks for its bundle beside itself, so the build runs from any path a static
    // host serves it under — a project page under the repository name as readily as a domain root.
    // The dev server serves from the root, where the bench entry is an absolute path away.
    base: development ? "/" : "./",
    define: {
      __DEV__: JSON.stringify(development),
    },
    resolve: {
      alias: layerAliases(),
    },
    build: {
      rollupOptions: {
        treeshake: {
          // The pane declares no side effects of its own, so a bundler assumes the worst and keeps
          // it whole even once the only code that builds one is gone. Saying so here is what lets
          // the production build drop it with the panel, and the strip check above holds us to it.
          moduleSideEffects: [{ test: PANE_MODULE, sideEffects: false }],
        },
      },
    },
    plugins: development ? [] : [devtoolsStripCheck()],
  };
});
