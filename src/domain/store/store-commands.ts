import { assert, assertNever } from "@shared/public";
import type {
  BuyItemCommand,
  OpenStoreCommand,
  SellItemCommand,
  StoreCommand,
} from "../commands/item-commands";
import { readTunable } from "../definitions/tuning-state";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { resetDomainEvent } from "../events/domain-event";
import {
  bankItemAtPlace,
  holdsActiveItem,
  placeActiveItem,
} from "../items/bank";
import { NO_RECORD, recordAt, removeItem } from "../items/inventory";
import { clearItem } from "../items/item";
import { placeAtFirstFit } from "../items/item-commands";
import {
  isBankPlace,
  isListingPlace,
  isStockPlace,
  listingEntryOfPlace,
  NO_PLACE,
  stockSlotOfPlace,
} from "../items/item-place";
import { isCellOrBankPlace } from "../items/item-validation";
import { priceOf, sellPriceOf } from "../items/prices";
import { rollStock } from "./stock";
import type { StoreRecord } from "./store";
import { isWithinReach, NO_STORE } from "./store";

/** Why a store command that passed its shape check was refused when it applied. */
export type StoreRefusal =
  | "unknown_checkpoint"
  | "not_at_checkpoint"
  | "store_closed"
  | "no_item_at_place"
  | "not_enough_gold"
  | "no_room"
  | "already_held";

/** What a store command's shape check returns: it may apply, or it names a checkpoint or a place no map or store has. */
export type StoreShape = "ok" | "invalid_checkpoint" | "invalid_place";

/**
 * Whether `command` names only what a map or a store can have: a checkpoint index of none or
 * more, a stock slot of the twelve or an entry in the listing's range to buy from, a cell of
 * the inventory's grid or a place of the bank to sell from. Whether the map has that
 * checkpoint, and what lies at the place, is the application's to refuse.
 */
export const validateStoreCommand = (command: StoreCommand): StoreShape => {
  switch (command.kind) {
    case "open_store":
      return Number.isInteger(command.checkpoint) && command.checkpoint >= 0
        ? "ok"
        : "invalid_checkpoint";

    case "close_store":
      return "ok";

    case "buy_item":
      return isStockPlace(command.place) || isListingPlace(command.place)
        ? "ok"
        : "invalid_place";

    case "sell_item":
      return isCellOrBankPlace(command.place) ? "ok" : "invalid_place";

    default:
      return assertNever(command);
  }
};

/** The events a store announces. */
type StoreEventKind =
  "store_opened" | "store_closed" | "item_bought" | "item_sold";

/** Announces a store event of the hero's, at `checkpoint` or `place`, for `amount` gold. */
const announce = (
  world: World,
  kind: StoreEventKind,
  checkpoint: number,
  place: number,
  amount: number,
): void => {
  const event = world.scratch.event;

  resetDomainEvent(event);
  event.kind = kind;
  event.tick = world.tick;
  event.unitId = world.run.heroId;
  event.checkpoint = checkpoint;
  event.place = place;
  event.amount = amount;
  world.events.write(event);
};

/** Closes the open store and announces it; with none open, changes nothing. The store system and a map reset close one this way too. */
export const closeStore = (world: World): void => {
  const open = world.map.openStore;

  if (open === NO_STORE) {
    return;
  }

  world.map.openStore = NO_STORE;
  announce(world, "store_closed", open, NO_PLACE, 0);
};

/**
 * Opens the store at the checkpoint named, refused when the map has none there or the hero
 * stands outside its reach. Any other open store closes first. The first opening at a
 * checkpoint on this map stocks it at the hero's level on this tick; a later one shows what
 * the first left. Opening the store already open changes nothing.
 */
const open = (
  world: World,
  hero: Unit,
  command: OpenStoreCommand,
): StoreRefusal | null => {
  const store = world.map.stores[command.checkpoint];

  if (store === undefined) {
    return "unknown_checkpoint";
  }

  if (!isWithinReach(world, command.checkpoint, hero.curr)) {
    return "not_at_checkpoint";
  }

  if (world.map.openStore === command.checkpoint) {
    return null;
  }

  closeStore(world);

  if (!store.stocked) {
    rollStock(world, command.checkpoint, hero.progression.level, store);
  }

  world.map.openStore = command.checkpoint;
  announce(world, "store_opened", command.checkpoint, NO_PLACE, 0);

  return null;
};

/**
 * Buys the item in the stock slot for its price: refused with nothing in the slot, too little
 * gold, or no place in the inventory it fits. The item goes to its first fit, the slot is
 * emptied, and the gold is spent.
 */
const buyFromStock = (
  world: World,
  store: StoreRecord,
  place: number,
): StoreRefusal | null => {
  const item = store.stock[stockSlotOfPlace(place)];

  assert(item !== undefined, "A stock slot the check accepted exists");

  if (item.baseId === null) {
    return "no_item_at_place";
  }

  const price = priceOf(world.run, item);

  if (world.run.gold < price) {
    return "not_enough_gold";
  }

  const cell = placeAtFirstFit(world, item);

  if (cell === -1) {
    return "no_room";
  }

  world.run.gold -= price;
  clearItem(item);
  announce(world, "item_bought", world.map.openStore, cell, price);

  return null;
};

/**
 * Buys the active item at the listing's entry for its price, making it then from its
 * definition: refused with no active item at the entry, one the hero already holds in the bank
 * or the inventory, too little gold, or neither a free place in the bank nor a fit in the
 * inventory. It goes to the bank's first free place, else the inventory's first fit. The
 * listing is read from the definitions and never emptied.
 */
const buyFromListing = (world: World, place: number): StoreRefusal | null => {
  const run = world.run;
  const active = run.activeItems[listingEntryOfPlace(place)];

  if (active === undefined) {
    return "no_item_at_place";
  }

  if (holdsActiveItem(run, active.id)) {
    return "already_held";
  }

  if (run.gold < active.price) {
    return "not_enough_gold";
  }

  const made = world.scratch.heldItem;

  clearItem(made);
  made.activeId = active.id;

  const went = placeActiveItem(world, made);

  clearItem(made);

  if (went === -1) {
    return "no_room";
  }

  run.gold -= active.price;
  announce(world, "item_bought", world.map.openStore, went, active.price);

  return null;
};

/** Buys the item at the place named, from the open store's stock or its listing, refused with no store open. */
const buy = (world: World, command: BuyItemCommand): StoreRefusal | null => {
  const store = world.map.stores[world.map.openStore];

  if (store === undefined) {
    return "store_closed";
  }

  return isStockPlace(command.place)
    ? buyFromStock(world, store, command.place)
    : buyFromListing(world, command.place);
};

/** Sells the item in the bank's place for its sell price, refused with nothing there. The item is gone. */
const sellFromBank = (world: World, place: number): StoreRefusal | null => {
  const item = bankItemAtPlace(world, place);

  if (item.activeId === null) {
    return "no_item_at_place";
  }

  const gold = sellPriceOf(
    world.run,
    item,
    readTunable(world.run.tuning, "store_sell_fraction"),
  );

  clearItem(item);
  world.run.gold += gold;
  announce(world, "item_sold", world.map.openStore, place, gold);

  return null;
};

/**
 * Sells the item covering the cell, or in the bank's place, for its sell price, refused with no
 * store open or nothing at the place. The item is gone.
 */
const sell = (world: World, command: SellItemCommand): StoreRefusal | null => {
  if (world.map.openStore === NO_STORE) {
    return "store_closed";
  }

  if (isBankPlace(command.place)) {
    return sellFromBank(world, command.place);
  }

  const inventory = world.run.inventory;
  const record = recordAt(inventory, command.place);

  if (record === NO_RECORD) {
    return "no_item_at_place";
  }

  const placed = inventory.placed[record];

  assert(
    placed !== undefined && placed.live,
    "A covered cell names a live record",
  );

  const corner = placed.corner;
  const gold = sellPriceOf(
    world.run,
    placed.item,
    readTunable(world.run.tuning, "store_sell_fraction"),
  );

  removeItem(inventory, record);
  world.run.gold += gold;
  announce(world, "item_sold", world.map.openStore, corner, gold);

  return null;
};

/**
 * Applies one store command the validator passed, announcing what opened, closed, or changed
 * hands. Returns the reason it was refused, having changed nothing, or `null`.
 */
export const applyStoreCommand = (
  world: World,
  hero: Unit,
  command: StoreCommand,
): StoreRefusal | null => {
  switch (command.kind) {
    case "open_store":
      return open(world, hero, command);

    case "close_store":
      closeStore(world);

      return null;

    case "buy_item":
      return buy(world, command);

    case "sell_item":
      return sell(world, command);

    default:
      return assertNever(command);
  }
};

/** The place `command` names, which its refusal carries: the stock slot or listing entry bought from, the cell or bank place sold from, or none. */
export const placeOfStoreCommand = (command: StoreCommand): number => {
  switch (command.kind) {
    case "buy_item":
    case "sell_item":
      return command.place;

    case "open_store":
    case "close_store":
      return NO_PLACE;

    default:
      return assertNever(command);
  }
};
