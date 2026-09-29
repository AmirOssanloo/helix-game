import type { DeepReadonly } from "@shared/public";
import { assert } from "@shared/public";
import type { ActiveItemDef } from "../definitions/active-item-def";
import type { World } from "../entities/world-state";
import type { Inventory } from "./inventory";
import {
  coveredBy,
  firstFit,
  incomingOutcome,
  liftItem,
  MOVE_BLOCKED,
  MOVE_FITS,
  NO_RECORD,
  placeItem,
  recordAt,
  removeItem,
  setDownItem,
} from "./inventory";
import type { Item } from "./item";
import { clearItem, copyItem, createItem } from "./item";
import { activeItemById, activeItemOf, extentOf } from "./item-defs";
import { announceItem } from "./item-events";
import {
  BANK_SLOT_COUNT,
  bankPlace,
  bankSlotOfPlace,
  isBankPlace,
} from "./item-place";

/**
 * The bank: six places beside the inventory, each an active item or empty, read top row
 * first: T, X, V, then C, G, Space. It holds active items only, one copy of each, and an item
 * moves in and out by copy, as it does between the grid and the armory.
 */

/** Why a move into, out of, or within the bank was refused when it applied. */
export type BankRefusal = "no_item_at_place" | "not_active_item" | "no_room";

/** Six empty places. Called once, with the world. */
export const createBank = (): Item[] => {
  const bank: Item[] = [];

  for (let slot = 0; slot < BANK_SLOT_COUNT; slot += 1) {
    bank.push(createItem());
  }

  return bank;
};

/** The item record at the bank's place `slot`, for a slot the shape check accepted. */
const bankItemAt = (bank: readonly Item[], slot: number): Item => {
  const item = bank[slot];

  assert(item !== undefined, "A bank place the check accepted exists");

  return item;
};

/** The first of the bank's places holding nothing, in its order, or `-1` when all six are full. */
export const firstFreeBankSlot = (bank: readonly Readonly<Item>[]): number => {
  for (let slot = 0; slot < bank.length; slot += 1) {
    if (bank[slot]?.activeId === null) {
      return slot;
    }
  }

  return -1;
};

/** What a hold reads of run scope: the bank and the inventory. */
type Holdings = DeepReadonly<{
  bank: Item[];
  inventory: Inventory;
}>;

/** Whether the hero holds the active item `activeId`, in the bank or in the inventory: one it may not buy again. */
export const holdsActiveItem = (run: Holdings, activeId: string): boolean => {
  for (let slot = 0; slot < run.bank.length; slot += 1) {
    if (run.bank[slot]?.activeId === activeId) {
      return true;
    }
  }

  const placed = run.inventory.placed;

  for (let record = 0; record < placed.length; record += 1) {
    const entry = placed[record];

    if (entry !== undefined && entry.live && entry.item.activeId === activeId) {
      return true;
    }
  }

  return false;
};

/** What the commit of an activation reads of run scope: the bank and the active items. */
type BankContent = DeepReadonly<{
  bank: Item[];
  activeItems: ActiveItemDef[];
}>;

/**
 * Whether an item in the bank names `abilityId` in its active block: what the commit of a cast
 * whose source is the bank checks, so one sold or moved to the inventory during its cast point
 * is cancelled.
 */
export const bankHoldsAbility = (
  run: BankContent,
  abilityId: string,
): boolean => {
  for (let slot = 0; slot < run.bank.length; slot += 1) {
    const active = activeItemById(
      run.activeItems,
      run.bank[slot]?.activeId ?? null,
    );

    if (active !== null && active.active.abilityId === abilityId) {
      return true;
    }
  }

  return false;
};

/**
 * Puts a copy of the active item `item` in the bank's first free place, else in the
 * inventory's first fit, and returns the place it went to, or `-1` with nothing changed when
 * both are full: where a bought active item goes.
 */
export const placeActiveItem = (world: World, item: Readonly<Item>): number => {
  const run = world.run;
  const slot = firstFreeBankSlot(run.bank);

  if (slot !== -1) {
    copyItem(item, bankItemAt(run.bank, slot));

    return bankPlace(slot);
  }

  const { width, height } = activeItemOf(run, item);
  const fit = firstFit(run.inventory, width, height, NO_RECORD);

  if (fit !== -1) {
    placeItem(run.inventory, item, width, height, fit);
  }

  return fit;
};

/**
 * Swaps what two of the bank's places hold, the first holding an item and the second holding
 * one or none, so the player chooses the item's key.
 */
const moveWithinBank = (
  world: World,
  from: number,
  to: number,
): BankRefusal | null => {
  const bank = world.run.bank;
  const moved = bankItemAt(bank, bankSlotOfPlace(from));

  if (moved.activeId === null) {
    return "no_item_at_place";
  }

  const target = bankItemAt(bank, bankSlotOfPlace(to));
  const held = world.scratch.heldItem;

  copyItem(target, held);
  copyItem(moved, target);
  copyItem(held, moved);
  clearItem(held);
  announceItem(world, "item_moved", to);

  if (moved.activeId !== null && from !== to) {
    announceItem(world, "item_moved", from);
  }

  return null;
};

/**
 * Moves the active item covering the cell `from` into the bank's place `to`. Anything but an
 * active item is refused the place; an active item already there goes to the inventory's first
 * fit once the moved one has left its cells, and with none nothing moves.
 */
const moveIntoBank = (
  world: World,
  from: number,
  to: number,
): BankRefusal | null => {
  const run = world.run;
  const inventory = run.inventory;
  const record = recordAt(inventory, from);
  const placed = record === NO_RECORD ? undefined : inventory.placed[record];

  if (placed === undefined || !placed.live) {
    return "no_item_at_place";
  }

  if (placed.item.activeId === null) {
    return "not_active_item";
  }

  const target = bankItemAt(run.bank, bankSlotOfPlace(to));

  if (target.activeId === null) {
    copyItem(placed.item, target);
    removeItem(inventory, record);
    announceItem(world, "item_moved", to);

    return null;
  }

  const { width, height } = activeItemOf(run, target);
  const fit = firstFit(inventory, width, height, record);

  if (fit === -1) {
    return "no_room";
  }

  const held = world.scratch.heldItem;

  copyItem(placed.item, held);
  removeItem(inventory, record);
  placeItem(inventory, target, width, height, fit);
  copyItem(held, target);
  clearItem(held);
  announceItem(world, "item_moved", to);
  announceItem(world, "item_moved", fit);

  return null;
};

/**
 * Moves the active item in the bank's place `from` so its corner lies on the cell `to`, as an
 * item from outside the grid is set down: where it fits, or over exactly one item that then
 * goes to its first fit; else refused and nothing moves.
 */
const moveOutOfBank = (
  world: World,
  from: number,
  to: number,
): BankRefusal | null => {
  const run = world.run;
  const inventory = run.inventory;
  const moved = bankItemAt(run.bank, bankSlotOfPlace(from));

  if (moved.activeId === null) {
    return "no_item_at_place";
  }

  const { width, height } = extentOf(run, moved);
  const outcome = incomingOutcome(inventory, width, height, to);

  if (outcome === MOVE_BLOCKED) {
    return "no_room";
  }

  if (outcome === MOVE_FITS) {
    placeItem(inventory, moved, width, height, to);
    clearItem(moved);
    announceItem(world, "item_moved", to);

    return null;
  }

  const other = coveredBy(inventory, width, height, to, NO_RECORD);

  liftItem(inventory, other);
  placeItem(inventory, moved, width, height, to);
  setDownItem(inventory, other, outcome);
  clearItem(moved);
  announceItem(world, "item_moved", to);
  announceItem(world, "item_moved", outcome);

  return null;
};

/**
 * Applies a move with a place of the bank at either end, `from` and `to` each a cell or a
 * place of the bank that the shape check accepted: within the bank, into it, or out of it.
 * Returns the reason it was refused, having changed nothing, or `null`.
 */
export const moveWithBank = (
  world: World,
  from: number,
  to: number,
): BankRefusal | null => {
  if (isBankPlace(from)) {
    return isBankPlace(to)
      ? moveWithinBank(world, from, to)
      : moveOutOfBank(world, from, to);
  }

  return moveIntoBank(world, from, to);
};

/** The item in the bank's place `place`, for a place `isBankPlace` accepts: what an activation and a sale from the bank read. */
export const bankItemAtPlace = (world: World, place: number): Item =>
  bankItemAt(world.run.bank, bankSlotOfPlace(place));
