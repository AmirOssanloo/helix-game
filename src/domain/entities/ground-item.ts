import type { Id, Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import type { Item } from "../items/item";
import { clearItem, createItem } from "../items/item";
import type { WalkabilityView } from "../map/walkability";
import { cellCount, cellIndex, columnOf, rowOf } from "../map/walkability";
import type { Tick } from "../tick";
import { Pool } from "./pool";
import type { World } from "./world-state";

/** A ground item's id: minted and resolved only by the ground-item pool. */
export type GroundItemId = Id<"ground_item">;

/**
 * Ground items one map holds at once. A full clear of the long road with nothing taken drops
 * about 175 things; this holds that about three times over. A drop past it is not made.
 */
export const GROUND_ITEM_CAPACITY = 512;

/** What lies on the ground: a pile of gold, a globe of either pool, or an item. */
export type GroundItemKind = "gold" | "health_globe" | "mana_globe" | "item";

/**
 * One thing lying on one walkability cell of the map from the tick it fell until it is taken
 * or the map is made again. It never moves, so it has no previous position, and it is not in
 * the spatial hash: every reader walks the pool by index. `amount` is a pile's gold and zero
 * otherwise; `item` is the item it holds inline when it is one and names no base otherwise.
 */
export type GroundItem = {
  kind: GroundItemKind;
  position: Vec2;
  amount: number;
  item: Item;
  droppedAtTick: Tick;
};

const createGroundItem = (): GroundItem => ({
  kind: "gold",
  position: { x: 0, y: 0 },
  amount: 0,
  item: createItem(),
  droppedAtTick: 0,
});

const clearGroundItem = (groundItem: GroundItem): void => {
  groundItem.kind = "gold";
  groundItem.position.x = 0;
  groundItem.position.y = 0;
  groundItem.amount = 0;
  clearItem(groundItem.item);
  groundItem.droppedAtTick = 0;
};

export const createGroundItemPool = (): Pool<GroundItem, GroundItemId> =>
  new Pool(GROUND_ITEM_CAPACITY, createGroundItem, clearGroundItem);

/** One byte per cell of one layer of `grid`, `1` where a ground item lies, all `0`: made with the grid. */
export const createGroundItemCells = (grid: WalkabilityView): Uint8Array =>
  new Uint8Array(cellCount(grid));

/** The within-layer index of the cell the point lies in, or `-1` for a point off the grid. */
const cellAt = (grid: WalkabilityView, x: number, y: number): number => {
  const column = columnOf(grid, x);
  const row = rowOf(grid, y);

  if (column < 0 || column >= grid.columns || row < 0 || row >= grid.rows) {
    return -1;
  }

  return cellIndex(grid, column, row);
};

/** Whether a ground item lies on the cell of one layer at `cell`. A cell off the grid holds none. */
export const holdsGroundItem = (
  cells: ArrayLike<number>,
  cell: number,
): boolean => cells[cell] === 1;

/**
 * The one way a ground item enters the world: a slot from the pool of `kind` lying at
 * (`x`, `y`), which must be on the grid, fallen on this tick, its cell marked as holding it.
 * The caller has found the cell free and writes a pile's amount or the item over the top.
 *
 * Returns the id, or `null` when the pool is full: then the drop is not made, nothing on the
 * ground is released to make room, and it is counted in map scope's drops not made beside the
 * pool's own miss.
 */
export const acquireGroundItem = (
  world: World,
  kind: GroundItemKind,
  x: number,
  y: number,
): GroundItemId | null => {
  const scope = world.map;
  const cell = cellAt(scope.walkability, x, y);

  assert(cell !== -1, "A ground item lies on the walkability grid");
  assert(
    !holdsGroundItem(scope.groundItemCells, cell),
    "A ground item lies on a cell no other holds",
  );

  const index = scope.groundItems.acquireIndex();

  if (index === -1) {
    scope.dropsNotMade += 1;

    return null;
  }

  const groundItem = scope.groundItems.at(index);
  const id = scope.groundItems.idAt(index);

  assert(groundItem !== null && id !== null, "A slot just acquired is live");

  groundItem.kind = kind;
  groundItem.position.x = x;
  groundItem.position.y = y;
  groundItem.droppedAtTick = world.tick;
  scope.groundItemCells[cell] = 1;

  return id;
};

/** Takes the ground item `id` names off the ground: its cell is free again and its slot released. A stale id changes nothing. */
export const releaseGroundItem = (world: World, id: GroundItemId): void => {
  const scope = world.map;
  const groundItem = scope.groundItems.resolve(id);

  if (groundItem === null) {
    return;
  }

  const cell = cellAt(
    scope.walkability,
    groundItem.position.x,
    groundItem.position.y,
  );

  if (cell !== -1) {
    scope.groundItemCells[cell] = 0;
  }

  scope.groundItems.release(id);
};

/** Every ground item released, every cell free, and no drop counted as not made: what a map load and a map reset leave. */
export const releaseAllGroundItems = (world: World): void => {
  const scope = world.map;

  scope.groundItems.releaseAll();
  scope.groundItemCells.fill(0);
  scope.dropsNotMade = 0;
};

/**
 * Makes the cell bytes again for a grid derived anew, marking the cell each live ground item
 * lies in. A tuning change to the cell size is the one thing that derives a grid mid-map; it
 * allocates, once, on that tick. Two ground items may share a cell of the new grid; the cell
 * reads as holding one.
 */
export const fitGroundItemCells = (world: World): void => {
  const scope = world.map;
  const grid = scope.walkability;

  if (scope.groundItemCells.length !== cellCount(grid)) {
    scope.groundItemCells = createGroundItemCells(grid);
  } else {
    scope.groundItemCells.fill(0);
  }

  for (let index = 0; index < scope.groundItems.end; index += 1) {
    const groundItem = scope.groundItems.at(index);

    if (groundItem === null) {
      continue;
    }

    const cell = cellAt(grid, groundItem.position.x, groundItem.position.y);

    if (cell !== -1) {
      scope.groundItemCells[cell] = 1;
    }
  }
};
