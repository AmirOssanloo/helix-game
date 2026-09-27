/**
 * `pnpm restamp`: rewrites the content version stamp of every stored log under
 * `tests/simulation/replays/` to the current content's, and nothing else. It is the only way a
 * stamp is rewritten. Every log is replayed under the new stamp first, and if one fails for any
 * reason the script writes nothing and exits non-zero.
 *
 * Node runs this file as it is, types stripped. The work is in `restamp-logs.ts`, which imports
 * the game's layers by their aliases, so it is loaded through Vite with the project's layer aliases.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { runnerImport } from "vite";
import type * as ContentModule from "../src/content/public.ts";
import { layerAliases } from "../vite.config.ts";
import type * as RestampModule from "./restamp-logs.ts";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const REPLAYS_DIR = fileURLToPath(
  new URL("../tests/simulation/replays/", import.meta.url),
);

const load = async <T>(path: string): Promise<T> => {
  const { module } = await runnerImport<T>(
    fileURLToPath(new URL(path, import.meta.url)),
    {
      root: ROOT,
      configFile: false,
      logLevel: "error",
      // As a test runs: `assert` throws, so a broken invariant fails the replay that broke it.
      define: { __DEV__: "true" },
      resolve: { alias: layerAliases() },
    },
  );

  return module;
};

const { restampLogs } = await load<typeof RestampModule>("./restamp-logs.ts");
const { contentRegistry } = await load<typeof ContentModule>(
  "../src/content/public.ts",
);

const names = readdirSync(REPLAYS_DIR)
  .filter((name) => name.endsWith(".json"))
  .sort();
const logs = names.map((name) => ({
  name,
  text: readFileSync(`${REPLAYS_DIR}${name}`, "utf8"),
}));
const outcome = restampLogs(logs, contentRegistry);

if (outcome.refusals.length > 0) {
  for (const refusal of outcome.refusals) {
    console.error(`${refusal.name}: ${refusal.message}`);
  }

  console.error("Nothing was written.");
  process.exit(1);
}

let written = 0;

for (const log of outcome.restamped) {
  if (log.from === log.to) {
    console.log(`${log.name}: ${log.from}, current`);
    continue;
  }

  writeFileSync(`${REPLAYS_DIR}${log.name}`, log.text);
  written += 1;
  console.log(`${log.name}: ${log.from} -> ${log.to}`);
}

console.log(`${String(written)} of ${String(logs.length)} stamps rewritten.`);
