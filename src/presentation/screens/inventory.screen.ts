import type { DomainEvent, Item, Unit } from "@domain/public";
import {
  ARMORY_SLOT_COUNT,
  INVENTORY_CELL_COUNT,
  INVENTORY_COLUMNS,
  meetsRequirement,
  NO_RECORD,
  recordAt,
} from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { ScratchRect } from "../camera/scratch";
import { containsPoint } from "../hud/hud-layout";
import type { ClaimScreen } from "../input/input-claim";
import {
  INVENTORY_CODE,
  LEFT_BUTTON,
  RIGHT_BUTTON,
} from "../input/key-bindings";
import type { CommandDriver } from "../scene-context";
import { GOLD_TINT, itemBaseOf, rarityOf } from "../views/ground-item.view";
import type { Label, Quad } from "../views/quad";
import { InventoryFlashes } from "./inventory-flashes";
import {
  ARMORY_SLOT_RECTS,
  armorySlotAt,
  GOLD_CENTRE_Y,
  GOLD_SIZE,
  GRID_CELL_SIZE,
  gridCellAt,
  gridColumnCentreX,
  gridRowCentreY,
  GRID_LEFT,
  GRID_TOP,
  INVENTORY_RECT,
  PANEL_CENTRE_X,
  PANEL_CENTRE_Y,
  PANEL_HEIGHT,
  PANEL_WIDTH,
  TITLE_CENTRE_Y,
  TITLE_SIZE,
} from "./inventory-layout";
import { ItemBoxView } from "./item-box.view";
import type { ScreenPorts } from "./screen-parts";
import { placeQuad, SCREEN_FRAME, setShown } from "./screen-parts";

export { INVENTORY_RECT } from "./inventory-layout";

const PANEL_TINT = 0x101010;
const PANEL_ALPHA = 0.9;
const TEXT_TINT = 0xffffff;
const OPAQUE = 1;

/** An empty cell or armory slot, the backdrop of an item the hero may wear, and of one it may not yet. */
export const SOCKET_TINT = 0x262626;
export const ITEM_BACKDROP_TINT = 0x3c3c3c;
export const UNMET_BACKDROP_TINT = 0x7a1f1f;

/** An item whose base or rarity run scope does not hold is drawn as a plain disc, in white, so a content error still shows. */
const FALLBACK_FRAME = "disc";
const UNDRESSED_TINT = 0xffffff;

/** How far a socket or an item's backdrop sits inside the cells it covers, so the grid's lines show. */
const CELL_INSET = 2;

export const INVENTORY_TITLE = "INVENTORY";

/** What gold is shown as: the word and the number the world view holds, upper-cased as the atlas font needs. */
export const goldText = (gold: number): string => `GOLD ${gold}`;

/** Everything the inventory is built over: the HUD scene's factories, the world view it reads, and the door it sends commands through. */
export type InventoryPorts = ScreenPorts &
  Readonly<{
    world: WorldView;
    driver: CommandDriver;
  }>;

/** The value `gold` shows before any sync, so the first sync writes the text. */
const GOLD_UNSHOWN = -1;

/**
 * The inventory and armory: a panel along the right of the canvas, opened and closed by its
 * key. It is neither modal nor pausing: the world goes on, a press inside its rectangle is its
 * and never the world's, and every key but its own reaches the mapper. It names its key alone,
 * which closes it; Escape closes it through the claim. Opening it sends nothing.
 *
 * Inside it are the armory's ten slots laid out as a figure, the 10 by 4 grid with each item
 * drawn across the cells it covers, and gold. It reads the inventory and gold from run scope
 * and the worn items from the active form's armory on the world view each frame it is open,
 * sums nothing, and asks the domain whether the hero's level meets an item's requirement,
 * backing one it does not in red. A left click on an item in the grid sends `equip_item`, a
 * left click on a worn item `unequip_item`, and a right click on an item in the grid
 * `drop_item`; a click on nothing sends nothing. A refused command flashes the item at the
 * place the refusal names. Every object it shows is made here, once.
 */
export class InventoryScreen implements ClaimScreen {
  readonly modal = false;

  readonly pauses = false;

  readonly keys: readonly string[] = [INVENTORY_CODE];

  private readonly world: WorldView;

  private readonly driver: CommandDriver;

  /** The panel and the grid's sockets, shown and hidden with the screen. */
  private readonly quads: readonly Quad[];

  private readonly labels: readonly Label[];

  private readonly gold: Label;

  /** One per placed record of the inventory, by the record's index. */
  private readonly items: readonly ItemBoxView[];

  /** One per armory slot, in the armory's order. */
  private readonly slots: readonly ItemBoxView[];

  private readonly flashes = new InventoryFlashes();

  /** Scratch for the box an item in the grid covers, rewritten per item per frame. */
  private readonly box = new ScratchRect();

  private shownGold = GOLD_UNSHOWN;

  private open = false;

  constructor(ports: InventoryPorts) {
    const { makeQuad, makeLabel, frameSizes } = ports;
    const size = frameSizes(SCREEN_FRAME);
    const panel = makeQuad(SCREEN_FRAME);
    const quads: Quad[] = [panel];

    this.world = ports.world;
    this.driver = ports.driver;
    placeQuad(
      panel,
      PANEL_CENTRE_X,
      PANEL_CENTRE_Y,
      PANEL_WIDTH / size,
      PANEL_HEIGHT / size,
    );
    panel.tint = PANEL_TINT;
    panel.alpha = PANEL_ALPHA;

    for (let cell = 0; cell < INVENTORY_CELL_COUNT; cell += 1) {
      const socket = makeQuad(SCREEN_FRAME);
      const side = (GRID_CELL_SIZE - CELL_INSET * 2) / size;

      placeQuad(
        socket,
        gridColumnCentreX(cell % INVENTORY_COLUMNS),
        gridRowCentreY(Math.floor(cell / INVENTORY_COLUMNS)),
        side,
        side,
      );
      socket.tint = SOCKET_TINT;
      socket.alpha = OPAQUE;
      quads.push(socket);
    }

    const boxes = makeBoxes(ports, INVENTORY_CELL_COUNT + ARMORY_SLOT_COUNT);

    this.slots = boxes.slice(0, ARMORY_SLOT_COUNT);
    this.items = boxes.slice(ARMORY_SLOT_COUNT);

    for (let slot = 0; slot < ARMORY_SLOT_COUNT; slot += 1) {
      const rect = ARMORY_SLOT_RECTS[slot];

      if (rect !== undefined) {
        this.slots[slot]?.place(rect);
      }
    }

    const title = makeLabel(TITLE_SIZE);
    const gold = makeLabel(GOLD_SIZE);

    title.x = PANEL_CENTRE_X;
    title.y = TITLE_CENTRE_Y;
    title.tint = TEXT_TINT;
    title.alpha = OPAQUE;
    title.setText(INVENTORY_TITLE);
    gold.x = PANEL_CENTRE_X;
    gold.y = GOLD_CENTRE_Y;
    gold.tint = GOLD_TINT;
    gold.alpha = OPAQUE;

    this.quads = quads;
    this.labels = [title, gold];
    this.gold = gold;
    this.hide();
  }

  contains(x: number, y: number): boolean {
    return containsPoint(INVENTORY_RECT, x, y);
  }

  /**
   * A press inside the panel is the screen's. On an item in the grid, a left press wears it and
   * a right press drops it; a left press on a worn item takes it off. It never asks to close.
   */
  pointerDown(button: number, x: number, y: number): boolean {
    const cell = gridCellAt(x, y);

    if (cell !== -1) {
      this.pressCell(button, cell);

      return false;
    }

    const slot = armorySlotAt(x, y);

    if (
      slot !== -1 &&
      button === LEFT_BUTTON &&
      this.wornAt(slot, heroOf(this.world)) !== null
    ) {
      this.driver.submit({
        kind: "unequip_item",
        tick: this.driver.nextTick,
        timestamp: this.driver.now(),
        armorySlot: slot,
      });
    }

    return false;
  }

  /** Its key closes it. */
  keyDown(code: string): boolean {
    return code === INVENTORY_CODE;
  }

  show(): void {
    this.open = true;
    setShown(this.quads, this.labels, true);
    this.sync();
  }

  hide(): void {
    this.open = false;
    setShown(this.quads, this.labels, false);

    for (let index = 0; index < this.items.length; index += 1) {
      this.items[index]?.hide();
    }

    for (let index = 0; index < this.slots.length; index += 1) {
      this.slots[index]?.hide();
    }
  }

  /** One drained event: a refused command naming a place flashes the item there, open or not. */
  react(event: Readonly<DomainEvent>): void {
    this.flashes.react(event, this.world);
  }

  /** One frame while open: every item in the grid and the armory, and gold, as the world view holds them now. */
  sync(): void {
    if (!this.open) {
      return;
    }

    const world = this.world;
    const hero = heroOf(world);
    const gold = world.run.gold;

    if (gold !== this.shownGold) {
      this.shownGold = gold;
      this.gold.setText(goldText(gold));
    }

    this.syncGrid(hero);
    this.syncArmory(hero);
  }

  private syncGrid(hero: DeepReadonly<Unit> | null): void {
    const world = this.world;
    const placed = world.run.inventory.placed;
    const box = this.box;

    for (let record = 0; record < this.items.length; record += 1) {
      const view = this.items[record];
      const entry = placed[record];

      if (view === undefined) {
        continue;
      }

      if (entry === undefined || !entry.live) {
        view.hide();
        continue;
      }

      const column = entry.corner % INVENTORY_COLUMNS;
      const row = Math.floor(entry.corner / INVENTORY_COLUMNS);

      box.minX = GRID_LEFT + column * GRID_CELL_SIZE + CELL_INSET;
      box.minY = GRID_TOP + row * GRID_CELL_SIZE + CELL_INSET;
      box.maxX =
        GRID_LEFT + (column + entry.width) * GRID_CELL_SIZE - CELL_INSET;
      box.maxY = GRID_TOP + (row + entry.height) * GRID_CELL_SIZE - CELL_INSET;
      view.place(box);
      this.showItem(
        view,
        entry.item,
        hero,
        this.flashes.cellFlashing(entry.corner, world.tick),
      );
    }
  }

  private syncArmory(hero: DeepReadonly<Unit> | null): void {
    for (let slot = 0; slot < this.slots.length; slot += 1) {
      const view = this.slots[slot];

      if (view === undefined) {
        continue;
      }

      const worn = this.wornAt(slot, hero);

      if (worn === null) {
        view.showEmpty(SOCKET_TINT);
      } else {
        this.showItem(
          view,
          worn,
          hero,
          this.flashes.slotFlashing(slot, this.world.tick),
        );
      }
    }
  }

  private showItem(
    view: ItemBoxView,
    item: DeepReadonly<Item>,
    hero: DeepReadonly<Unit> | null,
    flashing: boolean,
  ): void {
    const world = this.world;
    const base = itemBaseOf(world, item.baseId);
    const rarity = rarityOf(world, item.rarityId);
    const met =
      hero === null ||
      meetsRequirement(world.run, item, hero.progression.level);

    view.showItem(
      base === null ? FALLBACK_FRAME : base.atlasFrame,
      rarity === null ? UNDRESSED_TINT : rarity.tint,
      met ? ITEM_BACKDROP_TINT : UNMET_BACKDROP_TINT,
      flashing,
    );
  }

  /** The item worn in armory slot `slot` by the hero's active form, or `null` for none or no hero. */
  private wornAt(
    slot: number,
    hero: DeepReadonly<Unit> | null,
  ): DeepReadonly<Item> | null {
    const form =
      hero === null ? undefined : this.world.run.forms[hero.activeFormIndex];
    const worn = form === undefined ? undefined : form.armory.slots[slot];

    return worn === undefined || worn.baseId === null ? null : worn;
  }

  /** A press on grid cell `cell`: nothing on an empty cell, else the command its button sends. */
  private pressCell(button: number, cell: number): void {
    if (recordAt(this.world.run.inventory, cell) === NO_RECORD) {
      return;
    }

    const driver = this.driver;

    if (button === LEFT_BUTTON) {
      driver.submit({
        kind: "equip_item",
        tick: driver.nextTick,
        timestamp: driver.now(),
        cell,
        armorySlot: null,
      });
    } else if (button === RIGHT_BUTTON) {
      driver.submit({
        kind: "drop_item",
        tick: driver.nextTick,
        timestamp: driver.now(),
        cell,
      });
    }
  }
}

/** The hero the world view holds, or `null`. */
const heroOf = (world: WorldView): DeepReadonly<Unit> | null => {
  const heroId = world.run.heroId;

  return heroId === null ? null : world.map.units.resolve(heroId);
};

/** `count` item views, every backdrop made before any icon and every icon before any flash, so each draws over the last. */
const makeBoxes = (ports: InventoryPorts, count: number): ItemBoxView[] => {
  const backdrops: Quad[] = [];
  const icons: Quad[] = [];
  const boxes: ItemBoxView[] = [];

  for (let index = 0; index < count; index += 1) {
    backdrops.push(ports.makeQuad(SCREEN_FRAME));
  }

  for (let index = 0; index < count; index += 1) {
    icons.push(ports.makeQuad(SCREEN_FRAME));
  }

  for (let index = 0; index < count; index += 1) {
    const backdrop = backdrops[index];
    const icon = icons[index];

    if (backdrop !== undefined && icon !== undefined) {
      boxes.push(
        new ItemBoxView(
          backdrop,
          icon,
          ports.makeQuad(SCREEN_FRAME),
          ports.frameSizes,
        ),
      );
    }
  }

  return boxes;
};
