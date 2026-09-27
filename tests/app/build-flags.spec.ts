import { fileURLToPath } from "node:url";
import { build, type Rollup } from "vite";
import { describe, expect, it } from "vitest";
import { panelViewSyncers } from "@app/public";
import {
  DEBUG_OVERLAYS_SENTINEL,
  DEBUG_OVERLAYS_SYNCER,
  DEPTH_DEBUG,
  PLAY_VIEW_SYNCERS,
} from "@presentation/public";

const VITE_CONFIG = fileURLToPath(
  new URL("../../vite.config.ts", import.meta.url),
);

/** A whole build takes a second or two; the default five would be close under a busy machine. */
const BUILD_TIMEOUT_MS = 60_000;

/** The code of every chunk a build in `mode` writes, built in memory, so nothing lands in dist/. */
const bundleOf = async (mode: string): Promise<string> => {
  const output = await build({
    configFile: VITE_CONFIG,
    mode,
    logLevel: "silent",
    build: { write: false },
  });
  const outputs = (Array.isArray(output) ? output : [output]) as readonly (
    Rollup.RollupOutput | Rollup.RollupWatcher
  )[];

  return outputs
    .flatMap((each) => ("output" in each ? each.output : []))
    .map((file) => (file.type === "chunk" ? file.code : ""))
    .join("\n");
};

describe("the debug overlays and the panel flag", () => {
  it("are not among the play scene's own steps, and nothing of theirs draws at the debug band", () => {
    expect(PLAY_VIEW_SYNCERS).not.toContain(DEBUG_OVERLAYS_SYNCER);
    expect(PLAY_VIEW_SYNCERS.some((entry) => entry.band === DEPTH_DEBUG)).toBe(
      false,
    );
  });

  it("are added after the play scene's own steps where the panel is", () => {
    expect(panelViewSyncers()).toEqual([
      ...PLAY_VIEW_SYNCERS,
      DEBUG_OVERLAYS_SYNCER,
    ]);
  });

  it(
    "are absent from the production bundle and present in the playtest one",
    async () => {
      const production = await bundleOf("production");
      const playtest = await bundleOf("playtest");

      expect(production).not.toContain(DEBUG_OVERLAYS_SENTINEL);
      expect(playtest).toContain(DEBUG_OVERLAYS_SENTINEL);
    },
    BUILD_TIMEOUT_MS,
  );
});
