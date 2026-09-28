import Phaser from "phaser";
import { resolveKitSlots } from "@domain/queries";
import type { EventReader } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { ATLAS_FONT_KEY, ATLAS_TEXTURE_KEY } from "../atlas/shape-atlas";
import { Hud } from "../hud/hud";
import {
  HUD_DEPTH_BAR,
  HUD_DEPTH_BAR_TEXT,
  HUD_DEPTH_OVER_SCREEN,
  HUD_DEPTH_SCREEN,
  HUD_DEPTH_SCREEN_TEXT,
} from "../hud/hud-bands";
import { BAR_RECT, containsPoint } from "../hud/hud-layout";
import type { ClaimRegion } from "../input/input-claim";
import { INVENTORY_CODE } from "../input/key-bindings";
import type { SceneContext } from "../scene-context";
import { InventoryScreen } from "../screens/inventory.screen";
import { PauseScreen } from "../screens/pause-screen";
import { orbSlotsOf } from "../views/orb.view";
import type { FrameSizes, LabelFactory, QuadFactory } from "../views/quad";

export const HUD_SCENE_KEY = "hud";

const SHUTDOWN_EVENT = "shutdown";

/** Labels are centred on their position. */
const LABEL_ORIGIN = 0.5;

/**
 * Runs in parallel with the play scene, with its own camera, so the play camera's zoom and
 * scroll never move the bar. `create` makes every quad and label the bar will ever hold;
 * `update` reads the world view once and drains the event ring with its own cursor. The bar
 * and each screen are registered on the input claim, which hands them the presses that are
 * theirs and keeps those from the world; the scene listens to no pointer itself. Screens draw
 * in a band above the bar, each its own module.
 */
export class HudScene extends Phaser.Scene {
  private readonly context: SceneContext;

  private readonly reader: EventReader = createEventReader();

  private hud: Hud | null = null;

  private inventory: InventoryScreen | null = null;

  constructor(context: SceneContext) {
    super({ key: HUD_SCENE_KEY });
    this.context = context;
  }

  create(): void {
    const quadIn =
      (depth: number): QuadFactory =>
      (frame) =>
        this.add
          .image(0, 0, ATLAS_TEXTURE_KEY, frame)
          .setDepth(depth)
          .setVisible(false);
    const labelIn =
      (depth: number): LabelFactory =>
      (size) =>
        this.add
          .bitmapText(0, 0, ATLAS_FONT_KEY, "", size)
          .setOrigin(LABEL_ORIGIN)
          .setDepth(depth)
          .setVisible(false);
    const frameSizes: FrameSizes = (frame) =>
      this.context.atlas.frameWidth(frame);
    const hud = new Hud({
      makeQuad: quadIn(HUD_DEPTH_BAR),
      makeLabel: labelIn(HUD_DEPTH_BAR_TEXT),
      frameSizes,
      kits: resolveKitSlots,
      flashes: this.context.flashes,
      driver: this.context.driver,
      wedgeSteps: this.context.atlas.wedgeSteps,
      orbSlots: orbSlotsOf(this.context.world),
    });
    const screenPorts = {
      makeQuad: quadIn(HUD_DEPTH_SCREEN),
      makeLabel: labelIn(HUD_DEPTH_SCREEN_TEXT),
      frameSizes,
    };
    const inventory = new InventoryScreen({
      ...screenPorts,
      world: this.context.world,
      driver: this.context.driver,
      makeOverQuad: quadIn(HUD_DEPTH_OVER_SCREEN),
    });
    const pause = new PauseScreen(screenPorts);
    const bar: ClaimRegion = {
      contains: (x, y) => containsPoint(BAR_RECT, x, y),
      pointerDown: (button, x, y): void => {
        hud.click(x, y, button, this.context.world);
      },
    };
    const claim = this.context.claim;

    this.hud = hud;
    this.inventory = inventory;
    claim.addRegion(bar);
    claim.addToggle(INVENTORY_CODE, inventory);
    claim.setPauseScreen(pause);
    this.events.once(SHUTDOWN_EVENT, (): void => {
      claim.close(pause);
      claim.close(inventory);
      claim.removeToggle(INVENTORY_CODE);
      claim.setPauseScreen(null);
      claim.removeRegion(bar);
      this.hud = null;
      this.inventory = null;
    });
  }

  override update(): void {
    const hud = this.hud;
    const inventory = this.inventory;

    if (hud === null || inventory === null) {
      return;
    }

    hud.sync(this.context.world);
    inventory.sync();

    let event = this.context.events.read(this.reader);

    while (event !== null) {
      hud.react(event, this.context.world);
      inventory.react(event);
      event = this.context.events.read(this.reader);
    }
  }
}
