import Phaser from "phaser";
import { gameConfig } from "@app/public";
import { atlasFrames } from "@content/public";
import { ShapeAtlas } from "@presentation/public";
import { BenchScene } from "./bench.scene";

/**
 * Boots the benchmark scene under the game's own config, so the canvas, the scale mode, and
 * the `render` block are the ones the game runs with. The benchmark runs twice: once as the
 * game is configured, with one texture per batch, and once with `?textures=default` in the
 * address, which drops the `render` block and lets Phaser pick its multi-texture batch.
 */

const TEXTURES_QUERY_KEY = "textures";
const DEFAULT_TEXTURES_VALUE = "default";

const usesDefaultTextures = (search: string): boolean =>
  new URLSearchParams(search).get(TEXTURES_QUERY_KEY) ===
  DEFAULT_TEXTURES_VALUE;

const config: Phaser.Types.Core.GameConfig = usesDefaultTextures(
  window.location.search,
)
  ? { ...gameConfig, render: {} }
  : gameConfig;

new Phaser.Game({
  ...config,
  scene: [new BenchScene(new ShapeAtlas(atlasFrames))],
});
