import type { Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import { readTunable } from "../definitions/tuning-state";
import type { GroundItemId, GroundItemKind } from "../entities/ground-item";
import { acquireGroundItem, holdsGroundItem } from "../entities/ground-item";
import type { UnitId } from "../entities/unit";
import type { World } from "../entities/world-state";
import { resetDomainEvent } from "../events/domain-event";
import type { Item } from "../items/item";
import { copyItem } from "../items/item";
import {
  cellCentreX,
  cellCentreY,
  cellIndex,
  columnOf,
  columnOfIndex,
  HERO_RADIUS_CLASS,
  isCellBlocked,
  rowOf,
  rowOfIndex,
} from "../map/walkability";
import { rarityIndexOf } from "./item-roll";
import type { DropRoll } from "./roll";

/**
 * The first free cell near `origin`, ring by ring outward from the cell it lies in: a cell open
 * to the hero's radius class, since the hero must reach it, holding no ground item, whose
 * centre lies within `drop_placement_radius` of `origin`. Within a ring, cells are tried in
 * reading order. Returns the cell's within-layer index, or `-1` when none is free.
 */
export const findDropCell = (world: World, origin: Readonly<Vec2>): number => {
  const scope = world.map;
  const grid = scope.walkability;
  const radius = readTunable(world.run.tuning, "drop_placement_radius");
  const column = columnOf(grid, origin.x);
  const row = rowOf(grid, origin.y);
  const rings = Math.ceil(Math.max(0, radius) / grid.cellSize) + 1;
  const reach = radius * radius;

  for (let ring = 0; ring <= rings; ring += 1) {
    for (let down = -ring; down <= ring; down += 1) {
      for (let across = -ring; across <= ring; across += 1) {
        if (Math.max(Math.abs(down), Math.abs(across)) !== ring) {
          continue;
        }

        const cellColumn = column + across;
        const cellRow = row + down;

        if (isCellBlocked(grid, HERO_RADIUS_CLASS, cellColumn, cellRow)) {
          continue;
        }

        const cell = cellIndex(grid, cellColumn, cellRow);
        const dx = cellCentreX(grid, cellColumn) - origin.x;
        const dy = cellCentreY(grid, cellRow) - origin.y;

        if (
          !holdsGroundItem(scope.groundItemCells, cell) &&
          dx * dx + dy * dy <= reach
        ) {
          return cell;
        }
      }
    }
  }

  return -1;
};

const announceDropped = (
  world: World,
  groundItemId: GroundItemId,
  unitId: UnitId,
  amount: number,
): void => {
  const event = world.scratch.event;

  resetDomainEvent(event);
  event.kind = "item_dropped";
  event.tick = world.tick;
  event.groundItemId = groundItemId;
  event.unitId = unitId;
  event.amount = amount;
  world.events.write(event);
};

/**
 * Makes one ground item of `kind` on the first free cell near `origin`, a pile of `amount`
 * gold or a copy of `item`, and announces it. With no free cell, or no slot in the pool, the
 * drop is not made and is counted in map scope's drops not made.
 */
const placeOne = (
  world: World,
  origin: Readonly<Vec2>,
  unitId: UnitId,
  kind: GroundItemKind,
  amount: number,
  item: Readonly<Item> | null,
): void => {
  const scope = world.map;
  const cell = findDropCell(world, origin);

  if (cell === -1) {
    scope.dropsNotMade += 1;

    return;
  }

  const grid = scope.walkability;
  const id = acquireGroundItem(
    world,
    kind,
    cellCentreX(grid, columnOfIndex(grid, cell)),
    cellCentreY(grid, rowOfIndex(grid, cell)),
  );

  if (id === null) {
    return;
  }

  const groundItem = scope.groundItems.resolve(id);

  assert(groundItem !== null, "A ground item just acquired resolves");
  groundItem.amount = amount;

  if (item !== null) {
    copyItem(item, groundItem.item);
  }

  announceDropped(world, id, unitId, amount);
};

/** Places every rolled item of `rarity`, in the order they were rolled. */
const placeItemsOf = (
  world: World,
  drop: Readonly<DropRoll>,
  origin: Readonly<Vec2>,
  unitId: UnitId,
  rarity: number,
): void => {
  for (let index = 0; index < drop.itemCount; index += 1) {
    const item = drop.items[index];

    if (
      item !== undefined &&
      rarityIndexOf(world.run.rarities, item.rarityId) === rarity
    ) {
      placeOne(world, origin, unitId, "item", 0, item);
    }
  }
};

/**
 * Makes what `drop` holds on the ground around `origin`, where `unitId` died, best first, so
 * what the world has no room for is the least of it: the Legendary piece, the items by rarity
 * from the rarest, the gold, then the health globes and the mana globes. Each lies on a cell of
 * its own; each drop the world cannot take is not made and is counted, and nothing on the
 * ground is moved or released to make room.
 */
export const placeDrops = (
  world: World,
  drop: Readonly<DropRoll>,
  origin: Readonly<Vec2>,
  unitId: UnitId,
): void => {
  if (drop.hasLegendary) {
    placeOne(world, origin, unitId, "item", 0, drop.legendary);
  }

  for (let rarity = world.run.rarities.length - 1; rarity >= -1; rarity -= 1) {
    placeItemsOf(world, drop, origin, unitId, rarity);
  }

  if (drop.gold > 0) {
    placeOne(world, origin, unitId, "gold", drop.gold, null);
  }

  for (let globe = 0; globe < drop.healthGlobes; globe += 1) {
    placeOne(world, origin, unitId, "health_globe", 0, null);
  }

  for (let globe = 0; globe < drop.manaGlobes; globe += 1) {
    placeOne(world, origin, unitId, "mana_globe", 0, null);
  }
};
