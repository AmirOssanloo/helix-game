import type { WorldView } from "@simulation/public";

export type { FrameDriver, Reporter, SceneContext } from "./scene-context";
export { BOOT_SCENE_KEY, BootScene } from "./scenes/boot.scene";
export { HUD_SCENE_KEY, HudScene } from "./scenes/hud.scene";
export { PLAY_SCENE_KEY, PlayScene } from "./scenes/play.scene";

/** Reads the world view and writes sprites, once per frame, with the interpolation alpha between ticks. */
export type ViewSync = (world: WorldView, alpha: number) => void;
