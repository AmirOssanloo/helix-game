import { assert } from "@shared/public";
import {
  INVENTORY_COLUMNS,
  INVENTORY_ROWS,
} from "../definitions/item-base-def";
import type { Item } from "./item";
import { clearItem, copyItem, createItem } from "./item";
import { cellColumn, cellRow, INVENTORY_CELL_COUNT } from "./item-place";

/** A cell no placed record covers. */
export const NO_RECORD = -1;

/**
 * One item in the inventory: the item, whether the record holds one, the cell of its top-left
 * corner, and the width and height in cells it covers, copied from its base when it was placed.
 */
export type PlacedItem = {
  item: Item;
  live: boolean;
  corner: number;
  width: number;
  height: number;
};

/**
 * The hero's inventory, made once with the world: one byte per cell, `0` where nothing covers
 * it and one more than the placed record's index where one does, and one placed record per
 * cell, since an item covers at least one. An item moves by copy into a record and a clear of
 * the one it left.
 */
export type Inventory = {
  cells: Uint8Array;
  placed: PlacedItem[];
};

const createPlacedItem = (): PlacedItem => ({
  item: createItem(),
  live: false,
  corner: 0,
  width: 0,
  height: 0,
});

/** An empty inventory: every cell covered by nothing, and every placed record made and empty. */
export const createInventory = (): Inventory => {
  const placed: PlacedItem[] = [];

  for (let index = 0; index < INVENTORY_CELL_COUNT; index += 1) {
    placed.push(createPlacedItem());
  }

  return {
    cells: new Uint8Array(INVENTORY_CELL_COUNT),
    placed,
  };
};

/** The placed record covering `cell`, or `NO_RECORD`. */
export const recordAt = (
  inventory: Readonly<Inventory>,
  cell: number,
): number => (inventory.cells[cell] ?? 0) - 1;

/**
 * Whether an item of `width` by `height` cells fits with its corner on `corner`: every cell it
 * would cover is inside the grid and covered by nothing, or by the placed record `ignoring`,
 * the item being moved, whose own cells count as free. Reads at most the cells it would cover.
 */
export const fitsAt = (
  inventory: Readonly<Inventory>,
  width: number,
  height: number,
  corner: number,
  ignoring: number,
): boolean => {
  const column = cellColumn(corner);
  const row = cellRow(corner);

  if (
    corner < 0 ||
    corner >= INVENTORY_CELL_COUNT ||
    column + width > INVENTORY_COLUMNS ||
    row + height > INVENTORY_ROWS
  ) {
    return false;
  }

  for (let down = 0; down < height; down += 1) {
    for (let across = 0; across < width; across += 1) {
      const covering = recordAt(
        inventory,
        corner + down * INVENTORY_COLUMNS + across,
      );

      if (covering !== NO_RECORD && covering !== ignoring) {
        return false;
      }
    }
  }

  return true;
};

/**
 * The first cell an item of `width` by `height` fits with its corner on, trying each cell in
 * reading order, left to right then top to bottom, with `ignoring`'s cells free; or `-1` when
 * it fits nowhere.
 */
export const firstFit = (
  inventory: Readonly<Inventory>,
  width: number,
  height: number,
  ignoring: number,
): number => {
  for (let corner = 0; corner < INVENTORY_CELL_COUNT; corner += 1) {
    if (fitsAt(inventory, width, height, corner, ignoring)) {
      return corner;
    }
  }

  return -1;
};

/**
 * The placed records other than `ignoring` covering the `width` by `height` cells from
 * `corner`: `NO_RECORD` when none does, the one record when exactly one does, and `-2` when
 * two or more do or the cells leave the grid.
 */
export const coveredBy = (
  inventory: Readonly<Inventory>,
  width: number,
  height: number,
  corner: number,
  ignoring: number,
): number => {
  if (
    corner < 0 ||
    corner >= INVENTORY_CELL_COUNT ||
    cellColumn(corner) + width > INVENTORY_COLUMNS ||
    cellRow(corner) + height > INVENTORY_ROWS
  ) {
    return -2;
  }

  let found = NO_RECORD;

  for (let down = 0; down < height; down += 1) {
    for (let across = 0; across < width; across += 1) {
      const covering = recordAt(
        inventory,
        corner + down * INVENTORY_COLUMNS + across,
      );

      if (
        covering === NO_RECORD ||
        covering === ignoring ||
        covering === found
      ) {
        continue;
      }

      if (found !== NO_RECORD) {
        return -2;
      }

      found = covering;
    }
  }

  return found;
};

/** Writes `record` into every cell its corner and size cover, or `NO_RECORD` to clear them. */
const markCells = (
  inventory: Inventory,
  placed: Readonly<PlacedItem>,
  record: number,
): void => {
  for (let down = 0; down < placed.height; down += 1) {
    for (let across = 0; across < placed.width; across += 1) {
      inventory.cells[placed.corner + down * INVENTORY_COLUMNS + across] =
        record + 1;
    }
  }
};

/** The first placed record holding no item, or `NO_RECORD`. */
const freeRecord = (inventory: Readonly<Inventory>): number => {
  for (let record = 0; record < inventory.placed.length; record += 1) {
    if (inventory.placed[record]?.live === false) {
      return record;
    }
  }

  return NO_RECORD;
};

/**
 * Places a copy of `item`, `width` by `height` cells, with its corner on `corner`, in the first
 * empty placed record, and returns that record. The caller has found that it fits there.
 */
export const placeItem = (
  inventory: Inventory,
  item: Readonly<Item>,
  width: number,
  height: number,
  corner: number,
): number => {
  assert(
    fitsAt(inventory, width, height, corner, NO_RECORD),
    "An item is placed only where it fits",
  );

  const record = freeRecord(inventory);
  const placed = inventory.placed[record];

  assert(
    placed !== undefined,
    "An inventory with a free cell has a free placed record",
  );
  copyItem(item, placed.item);
  placed.live = true;
  placed.corner = corner;
  placed.width = width;
  placed.height = height;
  markCells(inventory, placed, record);

  return record;
};

/** Takes the item of placed record `record` out of the inventory: its cells are free and the record empty. */
export const removeItem = (inventory: Inventory, record: number): void => {
  const placed = inventory.placed[record];

  assert(placed !== undefined && placed.live, "Only a live record is removed");
  markCells(inventory, placed, NO_RECORD);
  clearItem(placed.item);
  placed.live = false;
  placed.corner = 0;
  placed.width = 0;
  placed.height = 0;
};

/** Frees the cells of placed record `record` and leaves its item in the record, so it can be put down again elsewhere. */
export const liftItem = (inventory: Inventory, record: number): void => {
  const placed = inventory.placed[record];

  assert(placed !== undefined && placed.live, "Only a live record is lifted");
  markCells(inventory, placed, NO_RECORD);
};

/** Puts lifted record `record` down with its corner on `corner`. The caller has found that it fits there. */
export const setDownItem = (
  inventory: Inventory,
  record: number,
  corner: number,
): void => {
  const placed = inventory.placed[record];

  assert(placed !== undefined && placed.live, "Only a live record is set down");
  placed.corner = corner;
  markCells(inventory, placed, record);
};
