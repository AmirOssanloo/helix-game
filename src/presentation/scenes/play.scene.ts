import Phaser from "phaser";
import { bindSceneInput, cameraLens } from "../input/bind-scene-input";
import { InputMapper } from "../input/input-mapper";
import type { InputIntents } from "../input/input-ports";
import type { SceneContext } from "../scene-context";

export const PLAY_SCENE_KEY = "play";

const SHUTDOWN_EVENT = "shutdown";

/**
 * Where an intent goes until something consumes it: the camera takes zoom once it follows the
 * hero, and the HUD takes a refused slot once it draws the squares. Both replace this object.
 */
const UNCONSUMED_INTENTS: InputIntents = {
  zoom: (): void => {},
  slotRefused: (): void => {},
};

/** The unbind of a scene that has not bound its input yet. */
const NOT_BOUND = (): void => {};

/**
 * Owns the world camera, runs the sync each frame, and maps input to commands. Today it binds
 * the input mapper over its camera and hands each frame to the driver: there is no view yet.
 */
export class PlayScene extends Phaser.Scene {
  private readonly context: SceneContext;

  private unbindInput: () => void = NOT_BOUND;

  constructor(context: SceneContext) {
    super({ key: PLAY_SCENE_KEY });
    this.context = context;
  }

  create(): void {
    const mapper = new InputMapper({
      driver: this.context.driver,
      lens: cameraLens(this.cameras.main),
      world: this.context.world,
      intents: UNCONSUMED_INTENTS,
    });

    this.unbindInput = bindSceneInput(this, mapper);
    this.events.once(SHUTDOWN_EVENT, (): void => {
      this.unbindInput();
      this.unbindInput = NOT_BOUND;
    });
  }

  override update(_time: number, delta: number): void {
    this.context.driver.onFrame(delta);
  }
}
