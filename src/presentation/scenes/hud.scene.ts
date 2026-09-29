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
  HUD_DEPTH_OVER_SCREEN_TEXT,
  HUD_DEPTH_SCREEN,
  HUD_DEPTH_SCREEN_TEXT,
} from "../hud/hud-bands";
import { BAR_RECT, containsPoint } from "../hud/hud-layout";
import type { ClaimRegion } from "../input/input-claim";
import { INVENTORY_CODE } from "../input/key-bindings";
import type { SceneContext } from "../scene-context";
import { InventoryScreen } from "../screens/inventory.screen";
import { PauseScreen } from "../screens/pause-screen";
import { followStore, priceAt } from "../screens/store-follow";
import { StoreScreen } from "../screens/store.screen";
import type { TooltipSources } from "../screens/tooltip";
import { itemUnderPointer, Tooltip } from "../screens/tooltip";
import { orbSlotsOf } from "../views/orb.view";
import type { FrameSizes, LabelFactory, QuadFactory } from "../views/quad";

export const HUD_SCENE_KEY = "hud";

const SHUTDOWN_EVENT = "shutdown";

/** Labels are centred on their position. */
const LABEL_ORIGIN = 0.5;

/** A glyph frame of the atlas font, read once for a glyph's width over its height. */
const GLYPH_FRAME = "glyph_A";

/**
 * Runs in parallel with the play scene, with its own camera, so the play camera's zoom and
 * scroll never move the bar. `create` makes every quad and label the bar will ever hold;
 * `update` reads the world view once and drains the event ring with its own cursor. The bar
 * and each screen are registered on the input claim, which hands them the presses that are
 * theirs and keeps those from the world; the scene listens to no pointer itself. Screens draw
 * in a band above the bar, each its own module. The store screen follows the world's store: an
 * opening drained from the ring opens it and the inventory beside it, and a closing closes it.
 * The tooltip draws over them, for the item under where the claim last saw the pointer: on a
 * screen, else on a ground label the play scene drew, with the store's price while one is open.
 */
export class HudScene extends Phaser.Scene {
  private readonly context: SceneContext;

  private readonly reader: EventReader = createEventReader();

  private hud: Hud | null = null;

  private inventory: InventoryScreen | null = null;

  private store: StoreScreen | null = null;

  private tooltip: Tooltip | null = null;

  private tooltipSources: TooltipSources | null = null;

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
    const store = new StoreScreen({
      ...screenPorts,
      world: this.context.world,
      driver: this.context.driver,
    });
    const pause = new PauseScreen(screenPorts);
    // Made after the inventory, so it draws over the item on the pointer in the same band.
    const tooltip = new Tooltip({
      makeQuad: quadIn(HUD_DEPTH_OVER_SCREEN),
      makeLabel: labelIn(HUD_DEPTH_OVER_SCREEN_TEXT),
      frameSizes,
      world: this.context.world,
      glyphAspect:
        this.context.atlas.frameWidth(GLYPH_FRAME) /
        this.context.atlas.frameHeight(GLYPH_FRAME),
    });
    const bar: ClaimRegion = {
      contains: (x, y) => containsPoint(BAR_RECT, x, y),
      pointerDown: (button, x, y): void => {
        hud.click(x, y, button, this.context.world);
      },
    };
    const claim = this.context.claim;

    this.hud = hud;
    this.inventory = inventory;
    this.store = store;
    this.tooltip = tooltip;
    this.tooltipSources = {
      world: this.context.world,
      screenItemAt: (x, y) =>
        store.itemAt(x, y) ??
        inventory.itemAt(x, y) ??
        (inventory.held ? null : hud.bankItemAt(this.context.world, x, y)),
      covers: (x, y) => claim.covers(x, y),
      labels: this.context.picks.labels,
    };
    claim.addRegion(bar);
    claim.addToggle(INVENTORY_CODE, inventory);
    claim.setPauseScreen(pause);
    this.events.once(SHUTDOWN_EVENT, (): void => {
      claim.close(pause);
      store.forget();
      claim.close(store);
      claim.close(inventory);
      claim.removeToggle(INVENTORY_CODE);
      claim.setPauseScreen(null);
      claim.removeRegion(bar);
      this.hud = null;
      this.inventory = null;
      this.store = null;
      this.tooltip = null;
      this.tooltipSources = null;
    });
  }

  override update(): void {
    const hud = this.hud;
    const inventory = this.inventory;
    const store = this.store;

    if (hud === null || inventory === null || store === null) {
      return;
    }

    hud.sync(this.context.world);
    inventory.sync();
    store.sync();
    this.syncTooltip(inventory, store);

    let event = this.context.events.read(this.reader);

    while (event !== null) {
      hud.react(event, this.context.world);
      inventory.react(event);
      store.react(event);
      followStore(event, this.context.claim, inventory, store);
      event = this.context.events.read(this.reader);
    }
  }

  /** The tooltip of the item under the pointer, or none, with the price line the store asks for there. */
  private syncTooltip(inventory: InventoryScreen, store: StoreScreen): void {
    const tooltip = this.tooltip;
    const sources = this.tooltipSources;
    const claim = this.context.claim;

    if (tooltip === null || sources === null) {
      return;
    }

    const item = claim.pointerSeen
      ? itemUnderPointer(sources, claim.pointerX, claim.pointerY)
      : null;

    if (item === null) {
      tooltip.hide();
    } else {
      tooltip.show(
        item,
        priceAt(
          store,
          claim.isOpen(inventory),
          this.context.world,
          claim.pointerX,
          claim.pointerY,
        ),
        claim.pointerX,
        claim.pointerY,
      );
    }
  }
}
