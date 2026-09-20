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

/**
 * Fails the build when developer-panel code reaches the bundle. The panel mount writes the sentinel
 * into its host, so the string is in the output exactly when the panel is.
 */
const devtoolsStripCheck = (): Plugin => ({
  name: "helix:devtools-strip-check",
  apply: "build",
  generateBundle(_options, bundle): void {
    for (const output of Object.values(bundle)) {
      if (output.type === "chunk" && output.code.includes(DEVTOOLS_SENTINEL)) {
        this.error(
          `Developer-panel code reached the production bundle in ${output.fileName}. ` +
            "Mount the panel only inside the __DEV__ branch of src/app/main.ts.",
        );
      }
    }
  },
});

export default defineConfig(({ mode }) => {
  const development = mode === "development";

  return {
    define: {
      __DEV__: JSON.stringify(development),
    },
    resolve: {
      alias: layerAliases(),
    },
    plugins: development ? [] : [devtoolsStripCheck()],
  };
});
