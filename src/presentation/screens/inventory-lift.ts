import type { Item } from "@domain/public";
import {
  activeItemById,
  BANK_SLOT_COUNT,
  bankPlace,
  bankSlotOfPlace,
  INVENTORY_CELL_COUNT,
  INVENTORY_COLUMNS,
  INVENTORY_ROWS,
  isBankPlace,
  MOVE_BLOCKED,
  moveOutcome,
  movesWithBank,
  NO_PLACE,
  NO_RECORD,
  recordAt,
} from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import { assert } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { ScratchRect } from "../camera/scratch";
import {
  BANK_SQUARE_SIZE,
  bankSquareAt,
  bankSquareCentreX,
  bankSquareCentreY,
} from "../hud/hud-layout";
import { hasDragged } from "../input/targeting-cursor";
import type { FrameSizes, Quad, QuadFactory } from "../views/quad";
import {
  CELL_INSET,
  cellLeft,
  cellTop,
  GRID_CELL_SIZE,
  gridCellAt,
  GRID_LEFT,
  GRID_TOP,
  placeCell,
} from "./inventory-layout";
import type { ItemBoxView } from "./item-box.view";
import { makeItemBoxes } from "./item-box.view";
import { placeQuad, SCREEN_FRAME } from "./screen-parts";

/** The cells a lifted item would take, over whatever is drawn in them: free where it can be set down, blocked where it cannot. A bank square is marked the same way. */
export const FREE_CELL_TINT = 0x2f8f3a;
export const BLOCKED_CELL_TINT = 0xb02a2a;
const CELL_MARK_ALPHA = 0.45;

/** No press held on the grid, or no cell to set a lifted item down on. */
export const NO_CELL = -1;

/** No bank place lifted. */
const NO_SLOT = -1;

const HALF = 0.5;

/** Draws `item` in `view`, as the screen dresses every item it shows. */
export type DressItem = (view: ItemBoxView, item: DeepReadonly<Item>) => void;

/**
 * A left press on an item in the inventory grid or on the bank's row, and the item it lifts
 * onto the pointer once the press moves the drag distance. It holds where the press went down
 * and where the pointer holds the item from the corner of its box, which is drawn at the
 * item's size in the grid wherever it came from, and draws, in the band over the screens, the
 * item where the pointer holds it and a mark on each cell it would take, or on the bank square
 * under the pointer: free where the domain's move rule says the move goes through, blocked
 * else. It reads the world view and sends nothing; the screen asks it where a release sets the
 * item down. Every object it shows is made here, once.
 */
export class InventoryLift {
  private readonly world: WorldView;

  private readonly dress: DressItem;

  /** One per grid cell, by the cell's index, then one per place of the bank. */
  private readonly marks: readonly Quad[];

  private readonly view: ItemBoxView;

  /** Scratch for the lifted item's box, rewritten per frame. */
  private readonly box = new ScratchRect();

  /** The place the held press went down on over an item, a grid cell or a place of the bank, and where on the canvas, or `NO_PLACE`. */
  private place = NO_PLACE;

  private pressX = 0;

  private pressY = 0;

  /** The placed record on the pointer, or `NO_RECORD`, and the bank's place on it, or `NO_SLOT`: one at most is lifted. */
  private record = NO_RECORD;

  private slot = NO_SLOT;

  /** Where the pointer holds the lifted item from its box's top-left corner. */
  private grabX = 0;

  private grabY = 0;

  /** The pointer, as the last press, move, or release left it. */
  private pointerX = 0;

  private pointerY = 0;

  constructor(
    world: WorldView,
    makeOverQuad: QuadFactory,
    frameSizes: FrameSizes,
    dress: DressItem,
  ) {
    const size = frameSizes(SCREEN_FRAME);
    const marks: Quad[] = [];
    // The box before the marks, so a mark shows through over the item held above its cell.
    const [view] = makeItemBoxes(makeOverQuad, frameSizes, 1);

    assert(view !== undefined, "The lift makes the lifted item's box");
    view.hide();

    for (let cell = 0; cell < INVENTORY_CELL_COUNT; cell += 1) {
      const mark = makeOverQuad(SCREEN_FRAME);

      placeCell(mark, cell, size);
      marks.push(mark);
    }

    for (let slot = 0; slot < BANK_SLOT_COUNT; slot += 1) {
      const mark = makeOverQuad(SCREEN_FRAME);

      placeQuad(
        mark,
        bankSquareCentreX(slot),
        bankSquareCentreY(slot),
        BANK_SQUARE_SIZE / size,
        BANK_SQUARE_SIZE / size,
      );
      marks.push(mark);
    }

    for (let index = 0; index < marks.length; index += 1) {
      const mark = marks[index];

      if (mark !== undefined) {
        mark.alpha = CELL_MARK_ALPHA;
        mark.visible = false;
      }
    }

    this.world = world;
    this.dress = dress;
    this.marks = marks;
    this.view = view;
  }

  /** Whether a left press is held on an item, lifted or not. */
  get held(): boolean {
    return this.place !== NO_PLACE;
  }

  /** The place the held press went down on, a grid cell or a place of the bank, or `NO_PLACE`. */
  get pressedPlace(): number {
    return this.place;
  }

  /** Whether an item is on the pointer. */
  get lifted(): boolean {
    return this.record !== NO_RECORD || this.slot !== NO_SLOT;
  }

  /** The placed record on the pointer, or `NO_RECORD`: the screen draws it here and not in the grid. */
  get liftedRecord(): number {
    return this.record;
  }

  /** The place the lifted item is moved from: the cell its corner lies on, or its place of the bank; `NO_PLACE` when nothing is lifted. */
  get liftedPlace(): number {
    if (this.slot !== NO_SLOT) {
      return bankPlace(this.slot);
    }

    const placed = this.world.run.inventory.placed[this.record];

    return placed === undefined ? NO_PLACE : placed.corner;
  }

  /** A left press went down at (`x`, `y`) on `place`, a grid cell or a place of the bank, which an item covers. */
  press(place: number, x: number, y: number): void {
    this.place = place;
    this.pressX = x;
    this.pressY = y;
    this.pointerX = x;
    this.pointerY = y;
  }

  /** The pointer moved to (`x`, `y`): a held press that has moved the drag distance lifts its item. Returns whether it did. */
  move(x: number, y: number): boolean {
    this.pointerX = x;
    this.pointerY = y;

    if (
      this.place === NO_PLACE ||
      this.lifted ||
      !hasDragged(this.pressX, this.pressY, x, y)
    ) {
      return false;
    }

    return isBankPlace(this.place) ? this.liftFromBank() : this.liftFromGrid();
  }

  /**
   * The button came up at (`x`, `y`): the place a lifted item is set down on with a
   * `move_item`, a grid cell or a place of the bank, or `NO_PLACE` when it goes back, since the
   * release is on neither, the move there would be refused, or it would lie where it lay. The
   * press is not forgotten here.
   */
  setDownPlace(x: number, y: number): number {
    this.pointerX = x;
    this.pointerY = y;

    const from = this.liftedPlace;
    const to = this.targetPlace();

    return from === NO_PLACE || to === NO_PLACE || to === from || !this.free(to)
      ? NO_PLACE
      : to;
  }

  /** The held press is forgotten and a lifted item goes back where it lies, with nothing sent. */
  cancel(): void {
    this.place = NO_PLACE;
    this.record = NO_RECORD;
    this.slot = NO_SLOT;
    this.view.hide();

    for (let index = 0; index < this.marks.length; index += 1) {
      const mark = this.marks[index];

      if (mark !== undefined) {
        mark.visible = false;
      }
    }
  }

  /**
   * One frame: the lifted item where the pointer holds it, and the cells it would take or the
   * bank square under the pointer marked free or blocked as the domain's move rule says; on
   * neither nothing is marked. A lifted item its place no longer holds is let go.
   */
  sync(): void {
    if (!this.lifted) {
      return;
    }

    const item = this.liftedItem();
    const extent = item === null ? null : this.extentOf(item);

    if (item === null || extent === null) {
      this.cancel();

      return;
    }

    const box = this.box;

    box.minX = this.pointerX - this.grabX + CELL_INSET;
    box.minY = this.pointerY - this.grabY + CELL_INSET;
    box.maxX = box.minX + extent.width * GRID_CELL_SIZE - CELL_INSET * 2;
    box.maxY = box.minY + extent.height * GRID_CELL_SIZE - CELL_INSET * 2;
    this.view.place(box);
    this.dress(this.view, item);

    const to = this.targetPlace();
    const tint =
      to !== NO_PLACE && this.free(to) ? FREE_CELL_TINT : BLOCKED_CELL_TINT;

    for (let index = 0; index < this.marks.length; index += 1) {
      const mark = this.marks[index];

      if (mark !== undefined) {
        mark.visible =
          to !== NO_PLACE &&
          (index < INVENTORY_CELL_COUNT
            ? !isBankPlace(to) && covers(to, extent.width, extent.height, index)
            : bankPlace(index - INVENTORY_CELL_COUNT) === to);
        mark.tint = tint;
      }
    }
  }

  /** Lifts the item covering the pressed cell, its grab measured from its corner, or lets the press go when none does. */
  private liftFromGrid(): boolean {
    const inventory = this.world.run.inventory;
    const record = recordAt(inventory, this.place);
    const placed = inventory.placed[record];

    if (record === NO_RECORD || placed === undefined) {
      this.cancel();

      return false;
    }

    this.record = record;
    this.grabX = this.pressX - cellLeft(placed.corner);
    this.grabY = this.pressY - cellTop(placed.corner);

    return true;
  }

  /**
   * Lifts the active item in the pressed place of the bank, or lets the press go when it holds
   * none. The box is drawn at the item's size in the grid, so the grab is the press's place in
   * its square scaled to that box, and the pointer stays over the same part of the item.
   */
  private liftFromBank(): boolean {
    const slot = bankSlotOfPlace(this.place);
    const item = this.world.run.bank[slot];
    const extent = item === undefined ? null : this.extentOf(item);

    if (extent === null) {
      this.cancel();

      return false;
    }

    const left = bankSquareCentreX(slot) - BANK_SQUARE_SIZE * HALF;
    const top = bankSquareCentreY(slot) - BANK_SQUARE_SIZE * HALF;

    this.slot = slot;
    this.grabX =
      ((this.pressX - left) * extent.width * GRID_CELL_SIZE) / BANK_SQUARE_SIZE;
    this.grabY =
      ((this.pressY - top) * extent.height * GRID_CELL_SIZE) / BANK_SQUARE_SIZE;

    return true;
  }

  /** The item on the pointer, or `null` when nothing is lifted or its place no longer holds it. */
  private liftedItem(): DeepReadonly<Item> | null {
    const run = this.world.run;

    if (this.slot !== NO_SLOT) {
      const item = run.bank[this.slot];

      return item === undefined || item.activeId === null ? null : item;
    }

    const entry = run.inventory.placed[this.record];

    return entry === undefined || !entry.live ? null : entry.item;
  }

  /** The cells an item covers in the grid: a placed record's, or an active item's from its definition; `null` for an item neither names. */
  private extentOf(
    item: DeepReadonly<Item>,
  ): Readonly<{ width: number; height: number }> | null {
    if (this.record !== NO_RECORD) {
      return this.world.run.inventory.placed[this.record] ?? null;
    }

    return activeItemById(this.world.run.activeItems, item.activeId);
  }

  /**
   * Whether the move of the lifted item to `to` goes through, as the domain says: within the
   * grid by its move query, and with a place of the bank at either end by the bank's.
   */
  private free(to: number): boolean {
    const run = this.world.run;

    if (this.slot === NO_SLOT && !isBankPlace(to)) {
      return moveOutcome(run.inventory, this.record, to) !== MOVE_BLOCKED;
    }

    const from = this.liftedPlace;

    return from !== NO_PLACE && movesWithBank(run, from, to);
  }

  /** The place under the pointer a lifted item would go to: the bank square under it, else the grid cell `targetCorner` names, else `NO_PLACE`. */
  private targetPlace(): number {
    const slot = bankSquareAt(this.pointerX, this.pointerY);

    return slot === -1 ? this.targetCorner() : bankPlace(slot);
  }

  /**
   * The cell the lifted item's corner would be set down on: the grid cell nearest its box's
   * top-left corner, held inside the grid so the whole item is, or `NO_CELL` while the pointer
   * is off the grid or nothing is lifted.
   */
  private targetCorner(): number {
    const item = this.liftedItem();
    const extent = item === null ? null : this.extentOf(item);

    if (extent === null || gridCellAt(this.pointerX, this.pointerY) === -1) {
      return NO_CELL;
    }

    const column = clampIndex(
      Math.round((this.pointerX - this.grabX - GRID_LEFT) / GRID_CELL_SIZE),
      INVENTORY_COLUMNS - extent.width,
    );
    const row = clampIndex(
      Math.round((this.pointerY - this.grabY - GRID_TOP) / GRID_CELL_SIZE),
      INVENTORY_ROWS - extent.height,
    );

    return row * INVENTORY_COLUMNS + column;
  }
}

/** `index` held between zero and `last`. */
const clampIndex = (index: number, last: number): number =>
  Math.min(Math.max(index, 0), last);

/** Whether the `width` by `height` cells from `corner` include `cell`. */
const covers = (
  corner: number,
  width: number,
  height: number,
  cell: number,
): boolean => {
  const across = (cell % INVENTORY_COLUMNS) - (corner % INVENTORY_COLUMNS);
  const down =
    Math.floor(cell / INVENTORY_COLUMNS) -
    Math.floor(corner / INVENTORY_COLUMNS);

  return across >= 0 && across < width && down >= 0 && down < height;
};
