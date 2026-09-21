import Phaser from "phaser";
import { resolveKit } from "@domain/public";
import type { EventReader } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { ATLAS_FONT_KEY, ATLAS_TEXTURE_KEY } from "../atlas/shape-atlas";
import { Hud } from "../hud/hud";
import type { SceneContext } from "../scene-context";
import { orbSlotsOf } from "../views/orb.view";
import type { LabelFactory, QuadFactory } from "../views/quad";

export const HUD_SCENE_KEY = "hud";

const POINTER_DOWN_EVENT = "pointerdown";
const SHUTDOWN_EVENT = "shutdown";

/** Labels are centred on their position. */
const LABEL_ORIGIN = 0.5;

/** Every label draws over every quad, whatever order they were made in. The HUD has no bands of its own. */
const LABEL_DEPTH = 1;

/**
 * Runs in parallel with the play scene, with its own camera, so the play camera's zoom and
 * scroll never move the bar. `create` makes every quad and label the bar will ever hold;
 * `update` reads the world view once and drains the event ring with its own cursor. A
 * pointer that goes down on the bar is the HUD's and is kept from the scenes below.
 */
export class HudScene extends Phaser.Scene {
  private readonly context: SceneContext;

  private readonly reader: EventReader = createEventReader();

  private hud: Hud | null = null;

  constructor(context: SceneContext) {
    super({ key: HUD_SCENE_KEY });
    this.context = context;
  }

  create(): void {
    const makeQuad: QuadFactory = (frame) =>
      this.add.image(0, 0, ATLAS_TEXTURE_KEY, frame).setVisible(false);
    const makeLabel: LabelFactory = (size) =>
      this.add
        .bitmapText(0, 0, ATLAS_FONT_KEY, "", size)
        .setOrigin(LABEL_ORIGIN)
        .setDepth(LABEL_DEPTH)
        .setVisible(false);
    const hud = new Hud({
      makeQuad,
      makeLabel,
      frameSizes: (frame) => this.context.atlas.frameWidth(frame),
      kits: resolveKit,
      flashes: this.context.flashes,
      driver: this.context.driver,
      wedgeSteps: this.context.atlas.wedgeSteps,
      orbSlots: orbSlotsOf(this.context.world),
    });
    const onPointerDown = (pointer: Phaser.Input.Pointer): void => {
      if (hud.click(pointer.x, pointer.y, pointer.button, this.context.world)) {
        this.input.stopPropagation();
      }
    };

    this.hud = hud;
    this.input.on(POINTER_DOWN_EVENT, onPointerDown);
    this.events.once(SHUTDOWN_EVENT, (): void => {
      this.input.off(POINTER_DOWN_EVENT, onPointerDown);
      this.hud = null;
    });
  }

  override update(): void {
    const hud = this.hud;

    if (hud === null) {
      return;
    }

    hud.sync(this.context.world);

    let event = this.context.events.read(this.reader);

    while (event !== null) {
      hud.react(event);
      event = this.context.events.read(this.reader);
    }
  }
}
