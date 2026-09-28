import type { DomainEvent, Item, Unit } from "@domain/public";
import {
  ARMORY_SLOT_COUNT,
  INVENTORY_CELL_COUNT,
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
import type { Label, Quad, QuadFactory } from "../views/quad";
import { InventoryFlashes } from "./inventory-flashes";
import {
  ARMORY_SLOT_RECTS,
  armorySlotAt,
  CELL_INSET,
  cellLeft,
  cellTop,
  GOLD_CENTRE_Y,
  GOLD_SIZE,
  GRID_CELL_SIZE,
  gridCellAt,
  INVENTORY_RECT,
  PANEL_CENTRE_X,
  PANEL_CENTRE_Y,
  PANEL_HEIGHT,
  PANEL_WIDTH,
  placeCell,
  TITLE_CENTRE_Y,
  TITLE_SIZE,
} from "./inventory-layout";
import { InventoryLift, NO_CELL } from "./inventory-lift";
import type { ItemBoxView } from "./item-box.view";
import { makeItemBoxes } from "./item-box.view";
import type { ScreenPorts } from "./screen-parts";
import { placeQuad, SCREEN_FRAME, setShown } from "./screen-parts";

export { INVENTORY_RECT } from "./inventory-layout";
export { BLOCKED_CELL_TINT, FREE_CELL_TINT } from "./inventory-lift";

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

export const INVENTORY_TITLE = "INVENTORY";

/** What gold is shown as: the word and the number the world view holds, upper-cased as the atlas font needs. */
export const goldText = (gold: number): string => `GOLD ${gold}`;

/**
 * Everything the inventory is built over: the HUD scene's factories, the world view it reads,
 * the door it sends commands through, and the factory of the band over the screens, which the
 * item on the pointer and the cells it would take draw in.
 */
export type InventoryPorts = ScreenPorts &
  Readonly<{
    world: WorldView;
    driver: CommandDriver;
    makeOverQuad: QuadFactory;
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
 * backing one it does not in red. A left click on an item in the grid, whose pointer does not
 * move the drag distance before the release, sends `equip_item`; a left click on a worn item
 * `unequip_item`, and a right click on an item in the grid `drop_item`; a click on nothing
 * sends nothing. A refused command flashes the item at the place the refusal names.
 *
 * A left press on an item in the grid that moves the drag distance lifts it onto the pointer,
 * which the lift draws with the cells it would take. The release sends `move_item` where the
 * lift says it can be set down, and nothing else; a release off the grid, a cancelled press,
 * or the screen closing puts it back with nothing sent. Every object it shows is made here or
 * in the lift, once.
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

  private readonly lift: InventoryLift;

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

      placeCell(socket, cell, size);
      socket.tint = SOCKET_TINT;
      socket.alpha = OPAQUE;
      quads.push(socket);
    }

    const boxes = makeItemBoxes(
      makeQuad,
      frameSizes,
      INVENTORY_CELL_COUNT + ARMORY_SLOT_COUNT,
    );

    this.slots = boxes.slice(0, ARMORY_SLOT_COUNT);
    this.items = boxes.slice(ARMORY_SLOT_COUNT);

    for (let slot = 0; slot < ARMORY_SLOT_COUNT; slot += 1) {
      const rect = ARMORY_SLOT_RECTS[slot];

      if (rect !== undefined) {
        this.slots[slot]?.place(rect);
      }
    }

    this.lift = new InventoryLift(
      ports.world,
      ports.makeOverQuad,
      frameSizes,
      (view, item): void => {
        this.showItem(view, item, heroOf(this.world), false);
      },
    );

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
   * A press inside the panel is the screen's. On an item in the grid, a left press is held
   * until it moves or comes up and a right press drops it; a left press on a worn item takes it
   * off. While a left press is held, other presses do nothing. It never asks to close.
   */
  pointerDown(button: number, x: number, y: number): boolean {
    if (this.lift.held) {
      return false;
    }

    const cell = gridCellAt(x, y);

    if (cell !== -1) {
      this.pressCell(button, cell, x, y);

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

  /** The pointer moved: a held press that moves the drag distance lifts its item, drawn at once. */
  pointerMove(x: number, y: number): void {
    if (this.lift.move(x, y)) {
      this.sync();
    }
  }

  /**
   * The held left press came up: a lifted item is set down where the lift says, and an item
   * never lifted is worn, as a click on it.
   */
  pointerUp(button: number, x: number, y: number): void {
    const lift = this.lift;
    const pressed = lift.pressedCell;

    if (button !== LEFT_BUTTON || pressed === NO_CELL) {
      return;
    }

    const driver = this.driver;
    const inventory = this.world.run.inventory;

    if (lift.liftedRecord !== NO_RECORD) {
      const to = lift.setDownCell(x, y);
      const placed = inventory.placed[lift.liftedRecord];

      if (to !== NO_CELL && placed !== undefined) {
        driver.submit({
          kind: "move_item",
          tick: driver.nextTick,
          timestamp: driver.now(),
          from: placed.corner,
          to,
        });
      }
    } else if (recordAt(inventory, pressed) !== NO_RECORD) {
      driver.submit({
        kind: "equip_item",
        tick: driver.nextTick,
        timestamp: driver.now(),
        cell: pressed,
        armorySlot: null,
      });
    }

    lift.cancel();
  }

  /** The held press is forgotten and a lifted item goes back where it lies, with nothing sent. */
  cancelPress(): void {
    this.lift.cancel();
  }

  /**
   * The item drawn at (`x`, `y`), in the grid or worn in the armory, for the tooltip: `null`
   * while closed, while a left press is held on an item, or over nothing.
   */
  itemAt(x: number, y: number): DeepReadonly<Item> | null {
    if (!this.open || this.lift.held) {
      return null;
    }

    const cell = gridCellAt(x, y);

    if (cell !== -1) {
      const record = recordAt(this.world.run.inventory, cell);
      const entry =
        record === NO_RECORD
          ? undefined
          : this.world.run.inventory.placed[record];

      return entry === undefined || !entry.live ? null : entry.item;
    }

    const slot = armorySlotAt(x, y);

    return slot === -1 ? null : this.wornAt(slot, heroOf(this.world));
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
    this.lift.cancel();
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

  /** One frame while open: every item in the grid and the armory, gold, and a lifted item, as the world view holds them now. */
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

    this.lift.sync();
    this.syncGrid(hero);
    this.syncArmory(hero);
  }

  private syncGrid(hero: DeepReadonly<Unit> | null): void {
    const world = this.world;
    const placed = world.run.inventory.placed;
    const lifted = this.lift.liftedRecord;
    const box = this.box;

    for (let record = 0; record < this.items.length; record += 1) {
      const view = this.items[record];
      const entry = placed[record];

      if (view === undefined) {
        continue;
      }

      if (entry === undefined || !entry.live || record === lifted) {
        view.hide();
        continue;
      }

      box.minX = cellLeft(entry.corner) + CELL_INSET;
      box.minY = cellTop(entry.corner) + CELL_INSET;
      box.maxX = box.minX + entry.width * GRID_CELL_SIZE - CELL_INSET * 2;
      box.maxY = box.minY + entry.height * GRID_CELL_SIZE - CELL_INSET * 2;
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

  /** A press at (`x`, `y`) on grid cell `cell`: nothing on an empty cell, a held press for the left button, a drop for the right. */
  private pressCell(button: number, cell: number, x: number, y: number): void {
    if (recordAt(this.world.run.inventory, cell) === NO_RECORD) {
      return;
    }

    if (button === LEFT_BUTTON) {
      this.lift.press(cell, x, y);
    } else if (button === RIGHT_BUTTON) {
      const driver = this.driver;

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
