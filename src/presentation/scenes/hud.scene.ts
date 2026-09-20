import Phaser from "phaser";
import type { SceneContext } from "../scene-context";

export const HUD_SCENE_KEY = "hud";

/** How often the tick count is reported while nothing draws it. */
const REPORT_INTERVAL_MS = 1000;

/**
 * Runs in parallel with the play scene and reads the world view. Today it reports the tick
 * count once a second, which is the whole of what there is to show.
 */
export class HudScene extends Phaser.Scene {
  private readonly context: SceneContext;

  private elapsedMs = 0;

  constructor(context: SceneContext) {
    super({ key: HUD_SCENE_KEY });
    this.context = context;
  }

  override update(_time: number, delta: number): void {
    this.elapsedMs += delta;

    if (this.elapsedMs < REPORT_INTERVAL_MS) {
      return;
    }

    this.elapsedMs -= REPORT_INTERVAL_MS;
    this.context.report(`tick ${this.context.world.tick}`);
  }
}
