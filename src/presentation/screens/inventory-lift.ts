import type { Item } from "@domain/public";
import {
  INVENTORY_CELL_COUNT,
  INVENTORY_COLUMNS,
  INVENTORY_ROWS,
  MOVE_BLOCKED,
  moveOutcome,
  NO_RECORD,
  recordAt,
} from "@domain/queries";
import type { DeepReadonly } from "@shared/public";
import { assert } from "@shared/public";
import type { WorldView } from "@simulation/public";
import { ScratchRect } from "../camera/scratch";
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
import { SCREEN_FRAME } from "./screen-parts";

/** The cells a lifted item would take, over whatever is drawn in them: free where it can be set down, blocked where it cannot. */
export const FREE_CELL_TINT = 0x2f8f3a;
export const BLOCKED_CELL_TINT = 0xb02a2a;
const CELL_MARK_ALPHA = 0.45;

/** No press held on the grid, or no cell to set a lifted item down on. */
export const NO_CELL = -1;

/** Draws `item` in `view`, as the screen dresses every item it shows. */
export type DressItem = (view: ItemBoxView, item: DeepReadonly<Item>) => void;

/**
 * A left press on an item in the inventory grid, and the item it lifts onto the pointer once
 * the press moves the drag distance. It holds where the press went down and where the pointer
 * holds the item from the corner of its box, and draws, in the band over the screens, the item
 * where the pointer holds it and a mark on each cell it would take: free where the domain's
 * move query says it fits or swaps with the one item it covers, blocked else. It reads the
 * world view and sends nothing; the screen asks it where a release sets the item down. Every
 * object it shows is made here, once.
 */
export class InventoryLift {
  private readonly world: WorldView;

  private readonly dress: DressItem;

  /** One per grid cell, by the cell's index. */
  private readonly marks: readonly Quad[];

  private readonly view: ItemBoxView;

  /** Scratch for the lifted item's box, rewritten per frame. */
  private readonly box = new ScratchRect();

  /** The grid cell the held press went down on over an item, and where on the canvas, or `NO_CELL`. */
  private cell = NO_CELL;

  private pressX = 0;

  private pressY = 0;

  /** The placed record on the pointer, or `NO_RECORD`, and where the pointer holds it from its box's top-left corner. */
  private record = NO_RECORD;

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
      mark.alpha = CELL_MARK_ALPHA;
      mark.visible = false;
      marks.push(mark);
    }

    this.world = world;
    this.dress = dress;
    this.marks = marks;
    this.view = view;
  }

  /** Whether a left press is held on an item in the grid, lifted or not. */
  get held(): boolean {
    return this.cell !== NO_CELL;
  }

  /** The cell the held press went down on, or `NO_CELL`. */
  get pressedCell(): number {
    return this.cell;
  }

  /** The placed record on the pointer, or `NO_RECORD`: the screen draws it here and not in the grid. */
  get liftedRecord(): number {
    return this.record;
  }

  /** A left press went down at (`x`, `y`) on grid cell `cell`, which an item covers. */
  press(cell: number, x: number, y: number): void {
    this.cell = cell;
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
      this.cell === NO_CELL ||
      this.record !== NO_RECORD ||
      !hasDragged(this.pressX, this.pressY, x, y)
    ) {
      return false;
    }

    const inventory = this.world.run.inventory;
    const record = recordAt(inventory, this.cell);
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
   * The button came up at (`x`, `y`): the cell a lifted item is set down on with a
   * `move_item`, or `NO_CELL` when it goes back, since the release is off the grid, its cells
   * there are blocked, or it would lie where it lay. The press is not forgotten here.
   */
  setDownCell(x: number, y: number): number {
    this.pointerX = x;
    this.pointerY = y;

    const inventory = this.world.run.inventory;
    const entry = inventory.placed[this.record];
    const corner = this.targetCorner();

    if (
      entry === undefined ||
      !entry.live ||
      corner === NO_CELL ||
      corner === entry.corner ||
      moveOutcome(inventory, this.record, corner) === MOVE_BLOCKED
    ) {
      return NO_CELL;
    }

    return corner;
  }

  /** The held press is forgotten and a lifted item goes back where it lies, with nothing sent. */
  cancel(): void {
    this.cell = NO_CELL;
    this.record = NO_RECORD;
    this.view.hide();

    for (let cell = 0; cell < this.marks.length; cell += 1) {
      const mark = this.marks[cell];

      if (mark !== undefined) {
        mark.visible = false;
      }
    }
  }

  /**
   * One frame: the lifted item where the pointer holds it, and the cells it would take marked
   * free or blocked as the domain's move query says; off the grid nothing is marked. A lifted
   * item the inventory no longer holds is let go.
   */
  sync(): void {
    if (this.record === NO_RECORD) {
      return;
    }

    const inventory = this.world.run.inventory;
    const entry = inventory.placed[this.record];

    if (entry === undefined || !entry.live) {
      this.cancel();

      return;
    }

    const box = this.box;

    box.minX = this.pointerX - this.grabX + CELL_INSET;
    box.minY = this.pointerY - this.grabY + CELL_INSET;
    box.maxX = box.minX + entry.width * GRID_CELL_SIZE - CELL_INSET * 2;
    box.maxY = box.minY + entry.height * GRID_CELL_SIZE - CELL_INSET * 2;
    this.view.place(box);
    this.dress(this.view, entry.item);

    const corner = this.targetCorner();
    const free =
      corner !== NO_CELL &&
      moveOutcome(inventory, this.record, corner) !== MOVE_BLOCKED;

    for (let cell = 0; cell < this.marks.length; cell += 1) {
      const mark = this.marks[cell];

      if (mark !== undefined) {
        mark.visible =
          corner !== NO_CELL && covers(corner, entry.width, entry.height, cell);
        mark.tint = free ? FREE_CELL_TINT : BLOCKED_CELL_TINT;
      }
    }
  }

  /**
   * The cell the lifted item's corner would be set down on: the grid cell nearest its box's
   * top-left corner, held inside the grid so the whole item is, or `NO_CELL` while the pointer
   * is off the grid or nothing is lifted.
   */
  private targetCorner(): number {
    const entry = this.world.run.inventory.placed[this.record];

    if (
      entry === undefined ||
      gridCellAt(this.pointerX, this.pointerY) === -1
    ) {
      return NO_CELL;
    }

    const column = clampIndex(
      Math.round((this.pointerX - this.grabX - GRID_LEFT) / GRID_CELL_SIZE),
      INVENTORY_COLUMNS - entry.width,
    );
    const row = clampIndex(
      Math.round((this.pointerY - this.grabY - GRID_TOP) / GRID_CELL_SIZE),
      INVENTORY_ROWS - entry.height,
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
