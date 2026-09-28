import type { Tick } from "../tick";

/**
 * The hero's commands on the items it holds. An item is a value with no id, so each names a
 * place: a cell of the inventory, counted from zero in reading order, or an armory slot,
 * counted from zero in the armory's order. The domain checks the shape, and refuses what the
 * inventory or the armory cannot take when it applies.
 */
export type ItemCommand =
  EquipItemCommand | UnequipItemCommand | MoveItemCommand | DropItemCommand;

/**
 * Wears the item covering `cell`. `armorySlot` names the slot, or is `null` for the one its
 * base takes, the empty ring slot first for a ring. An item already worn there goes back to
 * the inventory, at the first place it fits once the new one has left its cells.
 */
export type EquipItemCommand = Readonly<{
  kind: "equip_item";
  tick: Tick;
  timestamp: number;
  cell: number;
  armorySlot: number | null;
}>;

/** Takes off the item worn in `armorySlot`, to the first place in the inventory it fits. */
export type UnequipItemCommand = Readonly<{
  kind: "unequip_item";
  tick: Tick;
  timestamp: number;
  armorySlot: number;
}>;

/**
 * Moves the item covering `from` so its top-left corner lies on `to`. Onto cells holding
 * exactly one other item, the two swap: the other goes to the first place it fits.
 */
export type MoveItemCommand = Readonly<{
  kind: "move_item";
  tick: Tick;
  timestamp: number;
  from: number;
  to: number;
}>;

/** Puts the item covering `cell` on the ground, on the free cell nearest the hero's feet. */
export type DropItemCommand = Readonly<{
  kind: "drop_item";
  tick: Tick;
  timestamp: number;
  cell: number;
}>;

/** The kinds of the item union, as a record over them so a variant added to the union and not here fails the typecheck. */
const ITEM_COMMAND_KINDS: Readonly<Record<ItemCommand["kind"], true>> = {
  equip_item: true,
  unequip_item: true,
  move_item: true,
  drop_item: true,
};

/** Whether `command` is one of the hero's item commands. */
export const isItemCommand = (
  command: Readonly<{ kind: string }>,
): command is ItemCommand => Object.hasOwn(ITEM_COMMAND_KINDS, command.kind);
