import type { DomainEvent, Item, Tick } from "@domain/public";
import {
  isStockPlace,
  meetsRequirement,
  NO_STORE,
  STOCK_SLOT_COUNT,
  stockSlotOfPlace,
  storeTabOf,
} from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { ScratchRect } from "../camera/scratch";
import { containsPoint } from "../hud/hud-layout";
import { refusalFlashTicks } from "../hud/slot-flashes";
import type { ClaimScreen } from "../input/input-claim";
import { LEFT_BUTTON } from "../input/key-bindings";
import type { CommandDriver } from "../scene-context";
import { GOLD_TINT, itemBaseOf, rarityOf } from "../views/ground-item.view";
import type { Label, Quad } from "../views/quad";
import { heroOf } from "./hero-of";
import { GRID_CELL_SIZE } from "./inventory-layout";
import {
  goldText,
  ITEM_BACKDROP_TINT,
  SOCKET_TINT,
  UNMET_BACKDROP_TINT,
} from "./inventory.screen";
import type { ItemBoxView } from "./item-box.view";
import { makeItemBoxes } from "./item-box.view";
import type { ScreenPorts } from "./screen-parts";
import { placeQuad, SCREEN_FRAME, setShown } from "./screen-parts";
import {
  layInLane,
  STOCK_COLUMNS,
  STOCK_LANE_COUNT,
  STOCK_LEFT,
  STOCK_ROWS,
  STOCK_TOP,
  STORE_CENTRE_X,
  STORE_CENTRE_Y,
  STORE_GOLD_CENTRE_Y,
  STORE_GOLD_SIZE,
  STORE_RECT,
  STORE_TAB_TITLES,
  STORE_TABS,
  STORE_TITLE_CENTRE_Y,
  STORE_TITLE_SIZE,
  TAB_CENTRE_Y,
  TAB_HEIGHT,
  TAB_TEXT_SIZE,
  TAB_WIDTH,
  tabAt,
  tabCentreX,
} from "./store-layout";

export { STORE_RECT } from "./store-layout";

const PANEL_TINT = 0x101010;
const PANEL_ALPHA = 0.9;
const TEXT_TINT = 0xffffff;
const OPAQUE = 1;
const HALF = 0.5;

/** The tab shown, and the others. */
export const TAB_SHOWN_TINT = 0x6a5a2a;
export const TAB_TINT = 0x2a2a2a;

export const STORE_TITLE = "STORE";

/** An item whose rarity run scope does not hold is drawn in white, so a content error still shows. */
const UNDRESSED_TINT = 0xffffff;

/** How far a socket sits inside its cell, so the grid's lines show. */
const SOCKET_INSET = 2;

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
 * It reads the open store's stock and gold from the world view each frame it is open, lays the
 * shown tab's items in the grid in stock order, sums nothing, and asks the domain whether the
 * hero's level meets an item's requirement, backing one it does not in red. Every object it
 * shows is made here, once.
 */
export class StoreScreen implements ClaimScreen {
  readonly modal = false;

  readonly pauses = false;

  readonly keys: readonly string[] = [];

  private readonly world: WorldView;

  private readonly driver: CommandDriver;

  /** The panel, the tabs' buttons, and the grid's sockets, shown and hidden with the screen. */
  private readonly quads: readonly Quad[];

  private readonly tabQuads: readonly Quad[];

  private readonly labels: readonly Label[];

  private readonly gold: Label;

  /** One per stock slot, and the box it was laid in this frame, or none. */
  private readonly items: readonly ItemBoxView[];

  private readonly boxes: readonly ScratchRect[];

  private readonly laid: boolean[] = [];

  /** Per lane of the grid, the rows the items laid this frame have taken. */
  private readonly laneRows: number[] = [];

  /** Per stock slot, the tick its refusal flash ends. */
  private readonly flashUntil: Tick[] = [];

  /** The checkpoint whose store the screen was opened for, or none once the world closed it. */
  private checkpoint = NO_STORE;

  private tab = 0;

  private shownGold = GOLD_UNSHOWN;

  private open = false;

  constructor(ports: StorePorts) {
    const { makeQuad, makeLabel, frameSizes } = ports;
    const size = frameSizes(SCREEN_FRAME);
    const panel = makeQuad(SCREEN_FRAME);
    const quads: Quad[] = [panel];
    const tabQuads: Quad[] = [];
    const labels: Label[] = [];

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

    for (let tab = 0; tab < STORE_TABS.length; tab += 1) {
      const button = makeQuad(SCREEN_FRAME);
      const word = makeLabel(TAB_TEXT_SIZE);
      const id = STORE_TABS[tab];

      placeQuad(
        button,
        tabCentreX(tab),
        TAB_CENTRE_Y,
        TAB_WIDTH / size,
        TAB_HEIGHT / size,
      );
      button.alpha = OPAQUE;
      word.x = tabCentreX(tab);
      word.y = TAB_CENTRE_Y;
      word.tint = TEXT_TINT;
      word.alpha = OPAQUE;
      word.setText(id === undefined ? "" : STORE_TAB_TITLES[id]);
      quads.push(button);
      tabQuads.push(button);
      labels.push(word);
    }

    const side = (GRID_CELL_SIZE - SOCKET_INSET * 2) / size;

    for (let cell = 0; cell < STOCK_COLUMNS * STOCK_ROWS; cell += 1) {
      const socket = makeQuad(SCREEN_FRAME);

      placeQuad(
        socket,
        STOCK_LEFT + ((cell % STOCK_COLUMNS) + HALF) * GRID_CELL_SIZE,
        STOCK_TOP + (Math.floor(cell / STOCK_COLUMNS) + HALF) * GRID_CELL_SIZE,
        side,
        side,
      );
      socket.tint = SOCKET_TINT;
      socket.alpha = OPAQUE;
      quads.push(socket);
    }

    const boxes: ScratchRect[] = [];

    for (let slot = 0; slot < STOCK_SLOT_COUNT; slot += 1) {
      boxes.push(new ScratchRect());
      this.laid.push(false);
      this.flashUntil.push(0);
    }

    for (let lane = 0; lane < STOCK_LANE_COUNT; lane += 1) {
      this.laneRows.push(0);
    }

    this.items = makeItemBoxes(makeQuad, frameSizes, STOCK_SLOT_COUNT);
    this.boxes = boxes;

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
    labels.push(title, gold);

    this.quads = quads;
    this.tabQuads = tabQuads;
    this.labels = labels;
    this.gold = gold;
    this.conceal();
  }

  /** The tab shown, counted from zero from the left. */
  get shownTab(): number {
    return this.tab;
  }

  /** The world opened the store at `checkpoint`: the screen will show it once the claim opens it, on its first tab. */
  openAt(checkpoint: number): void {
    this.checkpoint = checkpoint;
    this.tab = 0;
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

    const tab = tabAt(x, y);

    if (tab !== -1) {
      this.tab = tab;
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
    const stockSlot = this.stockSlotAt(x, y);
    const stock = this.stock();

    return stockSlot === -1 || stock === null
      ? null
      : (stock[stockSlot] ?? null);
  }

  show(): void {
    this.open = true;
    setShown(this.quads, this.labels, true);
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
      this.flashUntil[stockSlotOfPlace(event.place)] =
        event.tick + refusalFlashTicks(this.world);
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

    for (let tab = 0; tab < this.tabQuads.length; tab += 1) {
      const button = this.tabQuads[tab];

      if (button !== undefined) {
        button.tint = tab === this.tab ? TAB_SHOWN_TINT : TAB_TINT;
      }
    }

    this.syncStock();
  }

  private syncStock(): void {
    const world = this.world;
    const stock = this.stock();
    const hero = heroOf(world);
    const shown = STORE_TABS[this.tab];

    this.laneRows.fill(0);

    for (let slot = 0; slot < STOCK_SLOT_COUNT; slot += 1) {
      const view = this.items[slot];
      const box = this.boxes[slot];
      const item = stock === null ? undefined : stock[slot];
      const base = item === undefined ? null : itemBaseOf(world, item.baseId);

      this.laid[slot] = false;

      if (view === undefined || box === undefined || item === undefined) {
        continue;
      }

      if (
        item.baseId === null ||
        base === null ||
        storeTabOf(base.armorySlot) !== shown ||
        !layInLane(this.laneRows, base.width, base.height, box)
      ) {
        view.hide();
        continue;
      }

      const rarity = rarityOf(world, item.rarityId);
      const met =
        hero === null ||
        meetsRequirement(world.run, item, hero.progression.level);

      this.laid[slot] = true;
      view.place(box);
      view.showItem(
        base.atlasFrame,
        rarity === null ? UNDRESSED_TINT : rarity.tint,
        met ? ITEM_BACKDROP_TINT : UNMET_BACKDROP_TINT,
        world.tick < (this.flashUntil[slot] ?? 0),
      );
    }
  }

  /** The open store's stock slots, or `null` with none open. */
  private stock(): readonly DeepReadonly<Item>[] | null {
    const store = this.world.map.stores[this.world.map.openStore];

    return store === undefined ? null : store.stock;
  }

  /** The stock slot whose item is laid at (`x`, `y`) this frame, or `-1`. */
  private stockSlotAt(x: number, y: number): number {
    if (!this.open) {
      return -1;
    }

    for (let slot = 0; slot < STOCK_SLOT_COUNT; slot += 1) {
      const box = this.boxes[slot];

      if (this.laid[slot] === true && box !== undefined) {
        if (containsPoint(box, x, y)) {
          return slot;
        }
      }
    }

    return -1;
  }

  /** Every object hidden, the items included. */
  private conceal(): void {
    setShown(this.quads, this.labels, false);

    for (let slot = 0; slot < this.items.length; slot += 1) {
      this.items[slot]?.hide();
      this.laid[slot] = false;
    }
  }
}
