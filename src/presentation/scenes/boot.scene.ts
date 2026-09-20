import Phaser from "phaser";
import type { SceneContext } from "../scene-context";
import { HUD_SCENE_KEY } from "./hud.scene";
import { PLAY_SCENE_KEY } from "./play.scene";

export const BOOT_SCENE_KEY = "boot";

const CANVAS_BANNER =
  "Canvas renderer: WebGL is unavailable here. Helix is unsupported on this machine.";

const BANNER_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: "sans-serif",
  fontSize: "32px",
  color: "#ffd166",
  backgroundColor: "#000000",
  padding: { x: 24, y: 12 },
};

/** Distance from the top of the canvas to the banner. */
const BANNER_TOP = 24;

/**
 * Bakes the atlas, checks the renderer, and starts the other two scenes. The banner it shows
 * under Canvas is the one static `Text` in the game, so this scene stays alive on top of the
 * others to keep it on screen.
 */
export class BootScene extends Phaser.Scene {
  private readonly context: SceneContext;

  constructor(context: SceneContext) {
    super({ key: BOOT_SCENE_KEY });
    this.context = context;
  }

  create(): void {
    this.context.atlas.bake(this);

    const isWebgl = this.sys.game.renderer.type === Phaser.WEBGL;

    this.context.report(isWebgl ? "renderer WebGL" : "renderer Canvas");

    if (!isWebgl) {
      this.add
        .text(this.scale.width / 2, BANNER_TOP, CANVAS_BANNER, BANNER_STYLE)
        .setOrigin(0.5, 0);
    }

    this.scene.launch(PLAY_SCENE_KEY);
    this.scene.launch(HUD_SCENE_KEY);
    this.scene.bringToTop();
  }
}
