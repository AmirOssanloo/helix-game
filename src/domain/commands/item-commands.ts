import type { GroundItemId } from "../entities/ground-item";
import type { Tick } from "../tick";
import type { CastTarget } from "./command";

/**
 * The hero's commands on the items it holds. An item is a value with no id, so each names a
 * place: a cell of the inventory, counted from zero in reading order, an armory slot, counted
 * from zero in the armory's order, or, for a move, a place of the bank. The domain checks the shape, and refuses what the
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
 * exactly one other item, the two swap: the other goes to the first place it fits. Either end
 * may be a place of the bank instead of a cell, which takes an active item and nothing else.
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

/**
 * A right click on an item's icon or its label: replace the current order with a pick up of
 * the ground item `groundItemId` names. The hero walks to it as a move walks, and takes it into
 * the inventory at its first fit on coming within reach. It names the ground item by its id,
 * the one command about items that names no place, and it is an order, not an item command:
 * it reads its own column of the disable matrix. A stale id resolves to nothing when the tick
 * reads it.
 */
export type PickUpCommand = Readonly<{
  kind: "pick_up";
  tick: Tick;
  timestamp: number;
  groundItemId: GroundItemId;
}>;

/**
 * The hero's commands at a checkpoint's store. The store is the one at the checkpoint the hero
 * opened, so buying names the place of a slot of its stock or of an entry of its listing of
 * active items, and selling a cell of the inventory or a place of the bank; the domain checks
 * the shape, and refuses what the store, the gold, the inventory, or the bank cannot take when
 * it applies.
 */
export type StoreCommand =
  OpenStoreCommand | CloseStoreCommand | BuyItemCommand | SellItemCommand;

/**
 * Opens the store at `checkpoint`, an index into the loaded map's checkpoints, while the hero
 * stands within its reach, closing any other open store. The first opening at a checkpoint
 * stocks it.
 */
export type OpenStoreCommand = Readonly<{
  kind: "open_store";
  tick: Tick;
  timestamp: number;
  checkpoint: number;
}>;

/** Closes the open store; with none open it changes nothing. */
export type CloseStoreCommand = Readonly<{
  kind: "close_store";
  tick: Tick;
  timestamp: number;
}>;

/**
 * Buys the item at `place` of the open store for its price: a stock slot's item, into the
 * inventory at the first place it fits, emptying the slot; or an entry of the listing's active
 * item, made then, into the bank's first free place, else the inventory's first fit.
 */
export type BuyItemCommand = Readonly<{
  kind: "buy_item";
  tick: Tick;
  timestamp: number;
  place: number;
}>;

/** Sells the item at `place`, covering a cell of the inventory or in a place of the bank, to the open store for its sell price. The item is gone. */
export type SellItemCommand = Readonly<{
  kind: "sell_item";
  tick: Tick;
  timestamp: number;
  place: number;
}>;

/**
 * An active-item key, or the click that commits its cursor: activate the active item in the
 * bank's place `place`, casting the ability its active block names at `target` as the hero's
 * cast. It reads its own column of the disable matrix, not the items one, so it is neither an
 * item command nor a store command.
 */
export type ActivateItemCommand = Readonly<{
  kind: "activate_item";
  tick: Tick;
  timestamp: number;
  place: number;
  target: CastTarget;
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

/** The kinds of the store union, as a record over them so a variant added to the union and not here fails the typecheck. */
const STORE_COMMAND_KINDS: Readonly<Record<StoreCommand["kind"], true>> = {
  open_store: true,
  close_store: true,
  buy_item: true,
  sell_item: true,
};

/** Whether `command` is one of the hero's store commands. */
export const isStoreCommand = (
  command: Readonly<{ kind: string }>,
): command is StoreCommand => Object.hasOwn(STORE_COMMAND_KINDS, command.kind);
