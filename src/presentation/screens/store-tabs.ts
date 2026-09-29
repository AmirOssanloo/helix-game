import type { Item, Tick } from "@domain/public";
import {
  meetsRequirement,
  STOCK_SLOT_COUNT,
  storeTabOf,
} from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { ScratchRect } from "../camera/scratch";
import { containsPoint } from "../hud/hud-layout";
import { itemBaseOf, rarityOf } from "../views/ground-item.view";
import type { Label, Quad } from "../views/quad";
import { heroOf } from "./hero-of";
import { GRID_CELL_SIZE } from "./inventory-layout";
import {
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
  STORE_TAB_TITLES,
  STORE_TABS,
  TAB_CENTRE_Y,
  TAB_HEIGHT,
  TAB_TEXT_SIZE,
  TAB_WIDTH,
  tabAt,
  tabCentreX,
} from "./store-layout";

const TEXT_TINT = 0xffffff;
const OPAQUE = 1;
const HALF = 0.5;

/** The tab shown, and the others. */
export const TAB_SHOWN_TINT = 0x6a5a2a;
export const TAB_TINT = 0x2a2a2a;

/** An item whose rarity run scope does not hold is drawn in white, so a content error still shows. */
const UNDRESSED_TINT = 0xffffff;

/** How far a socket sits inside its cell, so the grid's lines show. */
const SOCKET_INSET = 2;

/**
 * The store's tabs and what the shown one lists: a button per tab, the grid's sockets, and
 * the stocked items whose base's armory slot sits in the shown tab, laid in stock order in the
 * grid's lanes. It reads the open store's stock from the world view, sums nothing, sends
 * nothing, and asks the domain whether the hero's level meets an item's requirement, backing
 * one it does not in red. Every object it shows is made here, once.
 */
export class StoreTabs {
  private readonly world: WorldView;

  /** The tabs' buttons and the grid's sockets, shown and hidden with the screen. */
  readonly quads: readonly Quad[];

  readonly labels: readonly Label[];

  private readonly buttons: readonly Quad[];

  /** One per stock slot, and the box it was laid in this frame, or none. */
  private readonly items: readonly ItemBoxView[];

  private readonly boxes: readonly ScratchRect[];

  private readonly laid: boolean[] = [];

  /** Per lane of the grid, the rows the items laid this frame have taken. */
  private readonly laneRows: number[] = [];

  /** Per stock slot, the tick its refusal flash ends. */
  private readonly flashUntil: Tick[] = [];

  private tab = 0;

  constructor(ports: ScreenPorts, world: WorldView) {
    const { makeQuad, makeLabel, frameSizes } = ports;
    const size = frameSizes(SCREEN_FRAME);
    const quads: Quad[] = [];
    const buttons: Quad[] = [];
    const labels: Label[] = [];

    this.world = world;

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
      buttons.push(button);
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
    this.quads = quads;
    this.buttons = buttons;
    this.labels = labels;
  }

  /** The tab shown, counted from zero from the left. */
  get shownTab(): number {
    return this.tab;
  }

  /** Shows the first tab, as a store opens on. */
  reset(): void {
    this.tab = 0;
  }

  /** Shows the tab whose button holds (`x`, `y`), and says whether one does. */
  pick(x: number, y: number): boolean {
    const tab = tabAt(x, y);

    if (tab === -1) {
      return false;
    }

    this.tab = tab;

    return true;
  }

  /** Flashes the item in stock slot `stockSlot` until `until`. */
  flash(stockSlot: number, until: Tick): void {
    this.flashUntil[stockSlot] = until;
  }

  /** The stocked item laid at (`x`, `y`) this frame, or `null` over nothing. */
  itemAt(x: number, y: number): DeepReadonly<Item> | null {
    const stockSlot = this.stockSlotAt(x, y);
    const stock = this.stock();

    return stockSlot === -1 || stock === null
      ? null
      : (stock[stockSlot] ?? null);
  }

  /** The stock slot whose item is laid at (`x`, `y`) this frame, or `-1`. */
  stockSlotAt(x: number, y: number): number {
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

  /** One frame while open: the buttons' tints and the shown tab's items, as the world view holds them now. */
  sync(): void {
    for (let tab = 0; tab < this.buttons.length; tab += 1) {
      const button = this.buttons[tab];

      if (button !== undefined) {
        button.tint = tab === this.tab ? TAB_SHOWN_TINT : TAB_TINT;
      }
    }

    this.syncStock();
  }

  /** Every object shown, or every object hidden, the items included. */
  setShown(shown: boolean): void {
    setShown(this.quads, this.labels, shown);

    if (shown) {
      return;
    }

    for (let slot = 0; slot < this.items.length; slot += 1) {
      this.items[slot]?.hide();
      this.laid[slot] = false;
    }
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
}
