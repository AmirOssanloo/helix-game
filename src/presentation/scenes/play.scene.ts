import Phaser from "phaser";
import type { SceneContext } from "../scene-context";

export const PLAY_SCENE_KEY = "play";

/**
 * Owns the world camera, runs the sync each frame, and maps input to commands. Today it hands
 * each frame to the driver and nothing else: there is no atlas, no view, and no input yet.
 */
export class PlayScene extends Phaser.Scene {
  private readonly context: SceneContext;

  constructor(context: SceneContext) {
    super({ key: PLAY_SCENE_KEY });
    this.context = context;
  }

  override update(_time: number, delta: number): void {
    this.context.driver.onFrame(delta);
  }
}
