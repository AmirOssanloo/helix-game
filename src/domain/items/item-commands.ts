import { assert, assertNever } from "@shared/public";
import type {
  DropItemCommand,
  EquipItemCommand,
  ItemCommand,
  MoveItemCommand,
  UnequipItemCommand,
} from "../commands/item-commands";
import type { ItemBaseDef } from "../definitions/item-base-def";
import { readTunable } from "../definitions/tuning-state";
import { activeFormOf } from "../entities/hero";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { dropHeldItem } from "../loot/place-drop";
import type { Armory } from "./armory";
import { isWorn, slotFor, slotTakes } from "./armory";
import { rewriteArmoryTotals } from "./armory-totals";
import type { BankRefusal } from "./bank";
import { moveWithBank } from "./bank";
import type { Inventory, PlacedItem } from "./inventory";
import {
  coveredBy,
  firstFit,
  liftItem,
  MOVE_BLOCKED,
  MOVE_FITS,
  moveOutcome,
  NO_RECORD,
  placeItem,
  recordAt,
  removeItem,
  setDownItem,
} from "./inventory";
import type { Item } from "./item";
import { clearItem, copyItem } from "./item";
import { baseById, extentOf } from "./item-defs";
import { announceItem } from "./item-events";
import { armoryPlace, isBankPlace } from "./item-place";
import { meetsRequirement } from "./requirement";

/** Why an item command that passed its shape check was refused when it applied. */
export type ItemRefusal =
  | "no_item_at_place"
  | "wrong_armory_slot"
  | "requirement_not_met"
  | "no_room"
  | BankRefusal;

/** The base of `item`, which every item held but an active item names, since the content resolves each item's base. */
const baseOf = (world: World, item: Readonly<Item>): ItemBaseDef => {
  const base = baseById(world.run.itemBases, item.baseId);

  assert(base !== null, "An item names a base the content holds");

  return base;
};

const placedAt = (inventory: Inventory, record: number): PlacedItem => {
  const placed = inventory.placed[record];

  assert(
    placed !== undefined && placed.live,
    "A covered cell names a live record",
  );

  return placed;
};

/** Rewrites what `armory` adds to the hero's stats from what it now wears, on the tick the change lands. */
const retotal = (world: World, armory: Armory): void => {
  rewriteArmoryTotals(
    world.run,
    readTunable(world.run.tuning, "sim_hz"),
    armory,
  );
};

const armoryOf = (world: World, hero: Readonly<Unit>): Armory => {
  const form = activeFormOf(world, hero);

  assert(form !== null, "The hero wears a form");

  return form.armory;
};

/**
 * Wears the item covering the cell. An active item is worn nowhere, and is refused as the
 * wrong slot. The slot is the one named or the one the base takes; the
 * hero's level must meet the item's requirement; an item already worn there goes to its first
 * fit once the new item has left its cells, and with none the command is refused and nothing
 * moves. The armory's totals are rewritten, so the stats system derives from them this tick.
 */
const equip = (
  world: World,
  hero: Unit,
  command: EquipItemCommand,
): ItemRefusal | null => {
  const inventory = world.run.inventory;
  const record = recordAt(inventory, command.cell);

  if (record === NO_RECORD) {
    return "no_item_at_place";
  }

  const placed = placedAt(inventory, record);

  if (placed.item.activeId !== null) {
    return "wrong_armory_slot";
  }

  const base = baseOf(world, placed.item);
  const armory = armoryOf(world, hero);
  const slot = command.armorySlot ?? slotFor(armory, base.armorySlot);

  if (!slotTakes(slot, base.armorySlot)) {
    return "wrong_armory_slot";
  }

  if (!meetsRequirement(world.run, placed.item, hero.progression.level)) {
    return "requirement_not_met";
  }

  const worn = armory.slots[slot];

  assert(worn !== undefined, "An armory slot the check accepted exists");

  const wornBase = isWorn(armory, slot) ? baseOf(world, worn) : null;
  const fit =
    wornBase === null
      ? -1
      : firstFit(inventory, wornBase.width, wornBase.height, record);

  if (wornBase !== null && fit === -1) {
    return "no_room";
  }

  const held = world.scratch.heldItem;

  copyItem(placed.item, held);
  removeItem(inventory, record);

  if (wornBase !== null) {
    placeItem(inventory, worn, wornBase.width, wornBase.height, fit);
  }

  copyItem(held, worn);
  clearItem(held);
  retotal(world, armory);
  announceItem(world, "item_equipped", armoryPlace(slot));

  if (wornBase !== null) {
    announceItem(world, "item_unequipped", fit);
  }

  return null;
};

/** Takes the worn item off to its first fit in the inventory, refused when it fits nowhere, and rewrites the armory's totals without it. */
const unequip = (
  world: World,
  hero: Unit,
  command: UnequipItemCommand,
): ItemRefusal | null => {
  const armory = armoryOf(world, hero);
  const worn = armory.slots[command.armorySlot];

  if (worn === undefined || !isWorn(armory, command.armorySlot)) {
    return "no_item_at_place";
  }

  const inventory = world.run.inventory;
  const base = baseOf(world, worn);
  const fit = firstFit(inventory, base.width, base.height, NO_RECORD);

  if (fit === -1) {
    return "no_room";
  }

  placeItem(inventory, worn, base.width, base.height, fit);
  clearItem(worn);
  retotal(world, armory);
  announceItem(world, "item_unequipped", fit);

  return null;
};

/**
 * Moves the item covering `from` so its corner lies on `to`, its own cells counting as free.
 * Onto cells covering exactly one other item, the two swap: the moved item goes to `to` and
 * the other to its first fit, and with none nothing moves. Onto two or more, refused. What
 * happens is `moveOutcome`'s answer, the one the inventory screen draws a lifted item from.
 * A move with a place of the bank at either end is the bank's.
 */
const move = (world: World, command: MoveItemCommand): ItemRefusal | null => {
  if (isBankPlace(command.from) || isBankPlace(command.to)) {
    return moveWithBank(world, command.from, command.to);
  }

  const inventory = world.run.inventory;
  const record = recordAt(inventory, command.from);

  if (record === NO_RECORD) {
    return "no_item_at_place";
  }

  const outcome = moveOutcome(inventory, record, command.to);

  if (outcome === MOVE_BLOCKED) {
    return "no_room";
  }

  if (outcome === MOVE_FITS) {
    liftItem(inventory, record);
    setDownItem(inventory, record, command.to);
    announceItem(world, "item_moved", command.to);

    return null;
  }

  const placed = placedAt(inventory, record);
  const other = coveredBy(
    inventory,
    placed.width,
    placed.height,
    command.to,
    record,
  );

  liftItem(inventory, record);
  liftItem(inventory, other);
  setDownItem(inventory, record, command.to);
  setDownItem(inventory, other, outcome);
  announceItem(world, "item_moved", command.to);
  announceItem(world, "item_moved", outcome);

  return null;
};

/** Puts the item covering the cell on the ground at the hero's feet, refused when the ground can take no more there. */
const drop = (
  world: World,
  hero: Unit,
  command: DropItemCommand,
): ItemRefusal | null => {
  const inventory = world.run.inventory;
  const record = recordAt(inventory, command.cell);

  if (record === NO_RECORD) {
    return "no_item_at_place";
  }

  const heroId = world.run.heroId;

  assert(heroId !== null, "A hero acting has an id");

  if (
    !dropHeldItem(world, hero.curr, heroId, placedAt(inventory, record).item)
  ) {
    return "no_room";
  }

  removeItem(inventory, record);

  return null;
};

/**
 * Puts a copy of `item` into the inventory at the first place it fits, reading the grid left
 * to right and top to bottom, and returns the cell its corner went to, or `-1` with nothing
 * changed when it fits nowhere: an item that comes in from outside the inventory.
 */
export const placeAtFirstFit = (world: World, item: Readonly<Item>): number => {
  const inventory = world.run.inventory;
  const { width, height } = extentOf(world.run, item);
  const fit = firstFit(inventory, width, height, NO_RECORD);

  if (fit !== -1) {
    placeItem(inventory, item, width, height, fit);
  }

  return fit;
};

/**
 * Applies one item command the validator passed to the hero's inventory and its active form's
 * armory, announcing what moved and where. Returns the reason it was refused, having changed
 * nothing, or `null`.
 */
export const applyItemCommand = (
  world: World,
  hero: Unit,
  command: ItemCommand,
): ItemRefusal | null => {
  switch (command.kind) {
    case "equip_item":
      return equip(world, hero, command);

    case "unequip_item":
      return unequip(world, hero, command);

    case "move_item":
      return move(world, command);

    case "drop_item":
      return drop(world, hero, command);

    default:
      return assertNever(command);
  }
};

/** The place `command` names, which its refusal carries: the cell an item is taken from, or the armory slot one is taken off. */
export const placeOfItemCommand = (command: ItemCommand): number => {
  switch (command.kind) {
    case "equip_item":
    case "drop_item":
      return command.cell;

    case "unequip_item":
      return armoryPlace(command.armorySlot);

    case "move_item":
      return command.from;

    default:
      return assertNever(command);
  }
};
