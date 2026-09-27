import { describe, expect, it } from "vitest";
import type { GroundItem, GroundItemId } from "@domain/public";
import { GROUND_ITEM_CAPACITY, holdsGroundItem } from "@domain/queries";
import {
  acquireGroundItem,
  cellIndex,
  createGroundItemPool,
  releaseGroundItem,
} from "@domain/rules";
import type { Simulation } from "@simulation/testing";
import { makeMapDef, makeWorld, submit } from "../../helpers";

/** A map wide enough to hold a ground item on more cells than the pool has slots. */
const WIDE_MAP = makeMapDef.build({
  bounds: { minX: 0, minY: 0, maxX: 32 * 40, maxY: 32 * 20 },
  spawnPoint: { x: 16, y: 16 },
});

/** Every field a fresh slot holds. */
const CLEARED: GroundItem = {
  kind: "gold",
  position: { x: 0, y: 0 },
  amount: 0,
  item: {
    baseId: null,
    rarityId: null,
    legendaryId: null,
    itemLevel: 0,
    lines: [
      { sourceId: null, value: 0 },
      { sourceId: null, value: 0 },
      { sourceId: null, value: 0 },
      { sourceId: null, value: 0 },
      { sourceId: null, value: 0 },
      { sourceId: null, value: 0 },
    ],
    lineCount: 0,
  },
  droppedAtTick: 0,
};

/** The centre of the `slot`-th cell of the wide map, in reading order. */
const pointOf = (world: Simulation, slot: number): { x: number; y: number } => {
  const grid = world.view.map.walkability;
  const column = slot % grid.columns;
  const row = (slot - column) / grid.columns;

  return {
    x: grid.originX + (column + 1 / 2) * grid.cellSize,
    y: grid.originY + (row + 1 / 2) * grid.cellSize,
  };
};

/** Drops a pile of gold on each of the first `count` cells, returning the ids in order. */
const dropGold = (
  world: Simulation,
  count: number,
): (GroundItemId | null)[] => {
  const ids: (GroundItemId | null)[] = [];

  for (let slot = 0; slot < count; slot += 1) {
    const point = pointOf(world, slot);

    ids.push(acquireGroundItem(world.state, "gold", point.x, point.y));
  }

  return ids;
};

/** Whether the cell the point lies in is marked as holding a ground item. */
const cellHolds = (world: Simulation, x: number, y: number): boolean => {
  const grid = world.view.map.walkability;
  const column = Math.floor((x - grid.originX) / grid.cellSize);
  const row = Math.floor((y - grid.originY) / grid.cellSize);

  return holdsGroundItem(
    world.view.map.groundItemCells,
    cellIndex(grid, column, row),
  );
};

describe("ground-item pool", () => {
  it("takes a slot of the kind asked at the point, fallen on this tick, its cell marked", () => {
    const world = makeWorld({ seed: 1, map: WIDE_MAP });
    world.tick();
    world.tick();
    const point = pointOf(world, 3);

    const id = acquireGroundItem(world.state, "health_globe", point.x, point.y);
    const groundItem =
      id === null ? null : world.view.map.groundItems.resolve(id);

    expect(groundItem).toMatchObject({
      kind: "health_globe",
      position: point,
      amount: 0,
      droppedAtTick: 2,
    });
    expect(groundItem?.item.baseId).toBeNull();
    expect(cellHolds(world, point.x, point.y)).toBe(true);
    expect(world.view.map.groundItems.count).toBe(1);
  });

  it("releases a ground item with its cell freed and every field cleared, the item inline among them", () => {
    const world = makeWorld({ seed: 1, map: WIDE_MAP });
    const point = pointOf(world, 5);
    const id = acquireGroundItem(world.state, "item", point.x, point.y);
    const groundItem =
      id === null ? null : world.state.map.groundItems.resolve(id);

    if (id === null || groundItem === null) {
      throw new Error("The first acquire succeeds on a fresh pool");
    }

    groundItem.amount = 4;
    groundItem.item.baseId = "cap";
    groundItem.item.rarityId = "rare";
    groundItem.item.legendaryId = "rimecoil";
    groundItem.item.itemLevel = 3;
    const line = groundItem.item.lines[0];

    if (line !== undefined) {
      line.sourceId = "health_1";
      line.value = 12;
    }

    groundItem.item.lineCount = 1;

    releaseGroundItem(world.state, id);

    expect(groundItem).toEqual(CLEARED);
    expect(cellHolds(world, point.x, point.y)).toBe(false);
    expect(world.view.map.groundItems.count).toBe(0);
  });

  it("resolves a stale id to nothing, even once its slot is taken again", () => {
    const world = makeWorld({ seed: 1, map: WIDE_MAP });
    const [stale] = dropGold(world, 1);

    if (stale === undefined || stale === null) {
      throw new Error("The first acquire succeeds on a fresh pool");
    }

    releaseGroundItem(world.state, stale);
    const [fresh] = dropGold(world, 1);

    expect(world.view.map.groundItems.resolve(stale)).toBeNull();
    expect(fresh).not.toBe(stale);
    expect(
      fresh === undefined || fresh === null
        ? null
        : world.view.map.groundItems.resolve(fresh),
    ).not.toBeNull();

    releaseGroundItem(world.state, stale);

    expect(world.view.map.groundItems.count).toBe(1);
  });

  it("holds exactly its capacity", () => {
    const world = makeWorld({ seed: 1, map: WIDE_MAP });

    const ids = dropGold(world, GROUND_ITEM_CAPACITY);

    expect(ids.every((id) => id !== null)).toBe(true);
    expect(world.view.map.groundItems.count).toBe(GROUND_ITEM_CAPACITY);
    expect(world.view.map.groundItems.capacity).toBe(GROUND_ITEM_CAPACITY);
    expect(world.view.map.dropsNotMade).toBe(0);
  });

  it("refuses a drop past its capacity with null, releases nothing on the ground, and counts the drop not made", () => {
    const world = makeWorld({ seed: 1, map: WIDE_MAP });
    const ids = dropGold(world, GROUND_ITEM_CAPACITY);
    const past = pointOf(world, GROUND_ITEM_CAPACITY);

    const refused = acquireGroundItem(world.state, "item", past.x, past.y);

    expect(refused).toBeNull();
    expect(world.view.map.groundItems.count).toBe(GROUND_ITEM_CAPACITY);
    expect(
      ids.every(
        (id) => id !== null && world.view.map.groundItems.resolve(id) !== null,
      ),
    ).toBe(true);
    expect(cellHolds(world, past.x, past.y)).toBe(false);
    expect(world.view.map.dropsNotMade).toBe(1);
    expect(world.view.map.groundItems.misses).toBe(1);
  });

  it("takes and releases without allocating after warm-up: the same slots and the same item records come back", () => {
    const world = makeWorld({ seed: 1, map: WIDE_MAP });
    const pool = world.view.map.groundItems;
    const cells = world.view.map.groundItemCells;
    const warm = dropGold(world, 8);
    const slots = warm.map((id) => (id === null ? null : pool.resolve(id)));
    const items = slots.map((slot) => slot?.item ?? null);

    for (let round = 0; round < 50; round += 1) {
      for (let index = 0; index < pool.end; index += 1) {
        const id = pool.idAt(index);

        if (id !== null) {
          releaseGroundItem(world.state, id);
        }
      }

      dropGold(world, 8);
    }

    const slotsNow = new Set<unknown>();
    const itemsNow = new Set<unknown>();

    for (let index = 0; index < pool.end; index += 1) {
      slotsNow.add(pool.at(index));
      itemsNow.add(pool.at(index)?.item);
    }

    expect(pool.count).toBe(8);
    expect(slotsNow.size).toBe(8);
    expect(
      [...slotsNow].every((slot) => slots.includes(slot as GroundItem)),
    ).toBe(true);
    expect(
      [...itemsNow].every((item) => items.includes(item as GroundItem["item"])),
    ).toBe(true);
    expect(world.view.map.groundItemCells).toBe(cells);
  });

  it("makes each slot with its own item record", () => {
    const pool = createGroundItemPool();
    const first = pool.acquire();
    const second = pool.acquire();

    expect(first?.item).not.toBe(second?.item);
    expect(first?.item.lines).not.toBe(second?.item.lines);
  });

  it("marks again the cell each ground item lies in when a tuned cell size derives the grid anew", () => {
    const world = makeWorld({ seed: 1, map: WIDE_MAP });
    const point = { x: 100, y: 60 };
    acquireGroundItem(world.state, "gold", point.x, point.y);
    submit(world, {
      kind: "set_tuning",
      tick: 0,
      timestamp: 0,
      key: "walkability_cell_size",
      value: 16,
    });

    world.tick();

    const map = world.view.map;

    expect(map.walkability.cellSize).toBe(16);
    expect(map.groundItemCells.length).toBe(
      map.walkability.columns * map.walkability.rows,
    );
    expect(cellHolds(world, point.x, point.y)).toBe(true);
    expect(
      Array.from(map.groundItemCells).filter((byte) => byte === 1).length,
    ).toBe(1);
  });
});
