import { assert, assertNever } from "@shared/public";
import type {
  DropItemCommand,
  EquipItemCommand,
  ItemCommand,
  MoveItemCommand,
  UnequipItemCommand,
} from "../commands/item-commands";
import type { ItemBaseDef } from "../definitions/item-base-def";
import { activeFormOf } from "../entities/hero";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { resetDomainEvent } from "../events/domain-event";
import { dropHeldItem } from "../loot/place-drop";
import type { Armory } from "./armory";
import { isWorn, slotFor, slotTakes } from "./armory";
import type { Inventory, PlacedItem } from "./inventory";
import {
  coveredBy,
  firstFit,
  fitsAt,
  liftItem,
  NO_RECORD,
  placeItem,
  recordAt,
  removeItem,
  setDownItem,
} from "./inventory";
import type { Item } from "./item";
import { clearItem, copyItem } from "./item";
import { armoryPlace } from "./item-place";
import { meetsRequirement } from "./requirement";

/** The events an item command announces with the place its item went to. */
type ItemEventKind = "item_equipped" | "item_unequipped" | "item_moved";

/** Why an item command that passed its shape check was refused when it applied. */
export type ItemRefusal =
  "no_item_at_place" | "wrong_armory_slot" | "requirement_not_met" | "no_room";

/** The base run scope holds under `id`, or `null` when none has it. */
const findBase = (world: World, id: string | null): ItemBaseDef | null => {
  const bases = world.run.itemBases;

  for (let index = 0; index < bases.length; index += 1) {
    const base = bases[index];

    if (base !== undefined && base.id === id) {
      return base;
    }
  }

  return null;
};

/** The base of `item`, which every item held names, since the content resolves each item's base. */
const baseOf = (world: World, item: Readonly<Item>): ItemBaseDef => {
  const base = findBase(world, item.baseId);

  assert(base !== null, "An item names a base the content holds");

  return base;
};

/** Announces that the hero's item went to or left `place`. */
const announce = (world: World, kind: ItemEventKind, place: number): void => {
  const event = world.scratch.event;

  resetDomainEvent(event);
  event.kind = kind;
  event.tick = world.tick;
  event.unitId = world.run.heroId;
  event.place = place;
  world.events.write(event);
};

const placedAt = (inventory: Inventory, record: number): PlacedItem => {
  const placed = inventory.placed[record];

  assert(
    placed !== undefined && placed.live,
    "A covered cell names a live record",
  );

  return placed;
};

const armoryOf = (world: World, hero: Readonly<Unit>): Armory => {
  const form = activeFormOf(world, hero);

  assert(form !== null, "The hero wears a form");

  return form.armory;
};

/**
 * Wears the item covering the cell. The slot is the one named or the one the base takes; the
 * hero's level must meet the item's requirement; an item already worn there goes to its first
 * fit once the new item has left its cells, and with none the command is refused and nothing
 * moves.
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
  announce(world, "item_equipped", armoryPlace(slot));

  if (wornBase !== null) {
    announce(world, "item_unequipped", fit);
  }

  return null;
};

/** Takes the worn item off to its first fit in the inventory, refused when it fits nowhere. */
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
  announce(world, "item_unequipped", fit);

  return null;
};

/**
 * Moves the item covering `from` so its corner lies on `to`, its own cells counting as free.
 * Onto cells covering exactly one other item, the two swap: the moved item goes to `to` and
 * the other to its first fit, and with none nothing moves. Onto two or more, refused.
 */
const move = (world: World, command: MoveItemCommand): ItemRefusal | null => {
  const inventory = world.run.inventory;
  const record = recordAt(inventory, command.from);

  if (record === NO_RECORD) {
    return "no_item_at_place";
  }

  const placed = placedAt(inventory, record);

  if (fitsAt(inventory, placed.width, placed.height, command.to, record)) {
    liftItem(inventory, record);
    setDownItem(inventory, record, command.to);
    announce(world, "item_moved", command.to);

    return null;
  }

  const other = coveredBy(
    inventory,
    placed.width,
    placed.height,
    command.to,
    record,
  );

  if (other < 0) {
    return "no_room";
  }

  const covered = placedAt(inventory, other);
  const from = placed.corner;
  const otherFrom = covered.corner;

  liftItem(inventory, record);
  liftItem(inventory, other);
  setDownItem(inventory, record, command.to);

  const fit = firstFit(inventory, covered.width, covered.height, NO_RECORD);

  if (fit === -1) {
    liftItem(inventory, record);
    setDownItem(inventory, record, from);
    setDownItem(inventory, other, otherFrom);

    return "no_room";
  }

  setDownItem(inventory, other, fit);
  announce(world, "item_moved", command.to);
  announce(world, "item_moved", fit);

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
  const base = baseOf(world, item);
  const fit = firstFit(inventory, base.width, base.height, NO_RECORD);

  if (fit !== -1) {
    placeItem(inventory, item, base.width, base.height, fit);
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
