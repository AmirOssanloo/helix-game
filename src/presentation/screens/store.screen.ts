import type { DomainEvent, Item } from "@domain/public";
import { isStockPlace, NO_STORE, stockSlotOfPlace } from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { containsPoint } from "../hud/hud-layout";
import { refusalFlashTicks } from "../hud/slot-flashes";
import type { ClaimScreen } from "../input/input-claim";
import { LEFT_BUTTON } from "../input/key-bindings";
import type { CommandDriver } from "../scene-context";
import { GOLD_TINT } from "../views/ground-item.view";
import type { Label, Quad } from "../views/quad";
import { goldText } from "./inventory.screen";
import type { ScreenPorts } from "./screen-parts";
import { placeQuad, SCREEN_FRAME, setShown } from "./screen-parts";
import {
  STORE_CENTRE_X,
  STORE_CENTRE_Y,
  STORE_GOLD_CENTRE_Y,
  STORE_GOLD_SIZE,
  STORE_RECT,
  STORE_TITLE_CENTRE_Y,
  STORE_TITLE_SIZE,
} from "./store-layout";
import { StoreTabs } from "./store-tabs";

export { STORE_RECT } from "./store-layout";
export { TAB_SHOWN_TINT, TAB_TINT } from "./store-tabs";

const PANEL_TINT = 0x101010;
const PANEL_ALPHA = 0.9;
const TEXT_TINT = 0xffffff;
const OPAQUE = 1;

export const STORE_TITLE = "STORE";

/** The value `gold` shows before any sync, so the first sync writes the text. */
const GOLD_UNSHOWN = -1;

/** Everything the store is built over: the HUD scene's factories, the world view it reads, and the door it sends commands through. */
export type StorePorts = ScreenPorts &
  Readonly<{
    world: WorldView;
    driver: CommandDriver;
  }>;

/**
 * The store at a checkpoint, as Diablo II's is: a panel along the left of the canvas,
 * across from the inventory, with three tabs, **Armour**, **Weapons**, and **Misc**, each a
 * grid of the stocked items whose base's armory slot sits in it, and gold. It is neither modal
 * nor pausing and claims no key; the world goes on while it is open.
 *
 * It follows the world's store rather than a key: the HUD opens it when a store opens and
 * closes it when the store closes, sending nothing. Escape closes it through the claim, and
 * then it sends `close_store`. A left click on a tab shows that tab and sends nothing; a left
 * click on a stocked item sends `buy_item` naming its stock slot, and a refusal naming that
 * slot flashes it. Selling is the inventory's right click while the store is open.
 *
 * It reads gold from the world view each frame it is open, and its `StoreTabs` lays the shown
 * tab's items in the grid; it sums nothing. Every object it shows is made here, once.
 */
export class StoreScreen implements ClaimScreen {
  readonly modal = false;

  readonly pauses = false;

  readonly keys: readonly string[] = [];

  private readonly world: WorldView;

  private readonly driver: CommandDriver;

  /** The panel, the title, and gold, shown and hidden with the screen. */
  private readonly quads: readonly Quad[];

  private readonly labels: readonly Label[];

  private readonly gold: Label;

  /** The tabs' buttons, the grid, and the shown tab's items. */
  private readonly tabs: StoreTabs;

  /** The checkpoint whose store the screen was opened for, or none once the world closed it. */
  private checkpoint = NO_STORE;

  private shownGold = GOLD_UNSHOWN;

  private open = false;

  constructor(ports: StorePorts) {
    const { makeQuad, makeLabel, frameSizes } = ports;
    const size = frameSizes(SCREEN_FRAME);
    const panel = makeQuad(SCREEN_FRAME);

    this.world = ports.world;
    this.driver = ports.driver;
    placeQuad(
      panel,
      STORE_CENTRE_X,
      STORE_CENTRE_Y,
      (STORE_RECT.maxX - STORE_RECT.minX) / size,
      (STORE_RECT.maxY - STORE_RECT.minY) / size,
    );
    panel.tint = PANEL_TINT;
    panel.alpha = PANEL_ALPHA;
    this.tabs = new StoreTabs(ports, ports.world);

    const title = makeLabel(STORE_TITLE_SIZE);
    const gold = makeLabel(STORE_GOLD_SIZE);

    title.x = STORE_CENTRE_X;
    title.y = STORE_TITLE_CENTRE_Y;
    title.tint = TEXT_TINT;
    title.alpha = OPAQUE;
    title.setText(STORE_TITLE);
    gold.x = STORE_CENTRE_X;
    gold.y = STORE_GOLD_CENTRE_Y;
    gold.tint = GOLD_TINT;
    gold.alpha = OPAQUE;

    this.quads = [panel];
    this.labels = [title, gold];
    this.gold = gold;
    this.conceal();
  }

  /** The tab shown, counted from zero from the left. */
  get shownTab(): number {
    return this.tabs.shownTab;
  }

  /** The world opened the store at `checkpoint`: the screen will show it once the claim opens it, on its first tab. */
  openAt(checkpoint: number): void {
    this.checkpoint = checkpoint;
    this.tabs.reset();
  }

  /** The world closed the store: closing the screen now sends nothing. */
  forget(): void {
    this.checkpoint = NO_STORE;
  }

  contains(x: number, y: number): boolean {
    return containsPoint(STORE_RECT, x, y);
  }

  /** A press inside the panel is the screen's: a left press on a tab shows it, and on a stocked item buys it. It never asks to close. */
  pointerDown(button: number, x: number, y: number): boolean {
    if (button !== LEFT_BUTTON) {
      return false;
    }

    if (this.tabs.pick(x, y)) {
      this.sync();

      return false;
    }

    const stockSlot = this.stockSlotAt(x, y);

    if (stockSlot !== -1) {
      const driver = this.driver;

      driver.submit({
        kind: "buy_item",
        tick: driver.nextTick,
        timestamp: driver.now(),
        stockSlot,
      });
    }

    return false;
  }

  pointerUp(): void {}

  pointerMove(): void {}

  cancelPress(): void {}

  keyDown(): boolean {
    return false;
  }

  /** The stocked item drawn at (`x`, `y`), for the tooltip, or `null` while closed or over nothing. */
  itemAt(x: number, y: number): DeepReadonly<Item> | null {
    return this.open ? this.tabs.itemAt(x, y) : null;
  }

  show(): void {
    this.open = true;
    setShown(this.quads, this.labels, true);
    this.tabs.setShown(true);
    this.sync();
  }

  /** Hidden by the claim: closed by Escape, it asks the world to close the store too; closed by the world, it sends nothing. */
  hide(): void {
    this.open = false;
    this.conceal();

    if (this.checkpoint === NO_STORE) {
      return;
    }

    const driver = this.driver;

    this.checkpoint = NO_STORE;
    driver.submit({
      kind: "close_store",
      tick: driver.nextTick,
      timestamp: driver.now(),
    });
  }

  /** One drained event: a refused command naming a stock slot flashes the item there. */
  react(event: Readonly<DomainEvent>): void {
    if (event.kind === "command_refused" && isStockPlace(event.place)) {
      this.tabs.flash(
        stockSlotOfPlace(event.place),
        event.tick + refusalFlashTicks(this.world),
      );
    }
  }

  /** One frame while open: the tabs, gold, and the shown tab's items, as the world view holds them now. */
  sync(): void {
    if (!this.open) {
      return;
    }

    const gold = this.world.run.gold;

    if (gold !== this.shownGold) {
      this.shownGold = gold;
      this.gold.setText(goldText(gold));
    }

    this.tabs.sync();
  }

  /** The stock slot whose item is laid at (`x`, `y`) this frame, or `-1` while closed. */
  private stockSlotAt(x: number, y: number): number {
    return this.open ? this.tabs.stockSlotAt(x, y) : -1;
  }

  /** Every object hidden, the items included. */
  private conceal(): void {
    setShown(this.quads, this.labels, false);
    this.tabs.setShown(false);
  }
}
