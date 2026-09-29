import {
  INVENTORY_COLUMNS,
  INVENTORY_ROWS,
} from "../definitions/item-base-def";

/**
 * A place an item may be, as one small integer: a cell of the inventory, an armory slot, a
 * slot of a store's stock, a place of the bank, or an entry of the store's listing of active
 * items, each in a range of its own. A command names a place, and an event and a refusal carry
 * one, so the screen can find the item.
 */

/** No place: the neutral value of an event's place. */
export const NO_PLACE = -1;

/** The inventory's cells, counted from zero left to right, then top to bottom. */
export const INVENTORY_CELL_COUNT = INVENTORY_COLUMNS * INVENTORY_ROWS;

/** The armory's ten slots: a slot for each armory slot kind, and two for rings. */
export const ARMORY_SLOT_COUNT = 10;

/** Where each range of places begins. A cell's place is the cell itself. */
export const ARMORY_PLACE_BASE = 100;
export const STOCK_PLACE_BASE = 200;
export const BANK_PLACE_BASE = 300;
export const LISTING_PLACE_BASE = 400;

/** A store's stock slots, places 200 to 211. */
export const STOCK_SLOT_COUNT = 12;

/** The bank's places, 300 to 305, read top row first: T, X, V, then C, G, Space. */
export const BANK_SLOT_COUNT = 6;

/** The most entries the listing of active items has room for in the encoding, places 400 to 499. */
export const LISTING_ENTRY_CAPACITY = 100;

/** Whether `cell` is a cell of the inventory: a whole number from zero to one short of the cell count. */
export const isInventoryCell = (cell: number): boolean =>
  Number.isInteger(cell) && cell >= 0 && cell < INVENTORY_CELL_COUNT;

/** Whether `slot` is one of the armory's ten slots, counted from zero. */
export const isArmorySlotIndex = (slot: number): boolean =>
  Number.isInteger(slot) && slot >= 0 && slot < ARMORY_SLOT_COUNT;

/** The place of armory slot `slot`. */
export const armoryPlace = (slot: number): number => ARMORY_PLACE_BASE + slot;

/** Whether `place` is an armory slot's. */
export const isArmoryPlace = (place: number): boolean =>
  isArmorySlotIndex(place - ARMORY_PLACE_BASE);

/** The armory slot `place` names, for a place `isArmoryPlace` accepts. */
export const armorySlotOfPlace = (place: number): number =>
  place - ARMORY_PLACE_BASE;

/** The column of the inventory `cell` lies in. */
export const cellColumn = (cell: number): number => cell % INVENTORY_COLUMNS;

/** The row of the inventory `cell` lies in. */
export const cellRow = (cell: number): number =>
  Math.floor(cell / INVENTORY_COLUMNS);

/** Whether `slot` is one of a store's stock slots, counted from zero. */
export const isStockSlotIndex = (slot: number): boolean =>
  Number.isInteger(slot) && slot >= 0 && slot < STOCK_SLOT_COUNT;

/** The place of stock slot `slot`. */
export const stockPlace = (slot: number): number => STOCK_PLACE_BASE + slot;

/** Whether `place` is a stock slot's. */
export const isStockPlace = (place: number): boolean =>
  isStockSlotIndex(place - STOCK_PLACE_BASE);

/** The stock slot `place` names, for a place `isStockPlace` accepts. */
export const stockSlotOfPlace = (place: number): number =>
  place - STOCK_PLACE_BASE;

/** Whether `slot` is one of the bank's six places, counted from zero. */
export const isBankSlotIndex = (slot: number): boolean =>
  Number.isInteger(slot) && slot >= 0 && slot < BANK_SLOT_COUNT;

/** The place of the bank's place `slot`. */
export const bankPlace = (slot: number): number => BANK_PLACE_BASE + slot;

/** Whether `place` is one of the bank's. */
export const isBankPlace = (place: number): boolean =>
  isBankSlotIndex(place - BANK_PLACE_BASE);

/** The bank's place `place` names, counted from zero, for a place `isBankPlace` accepts. */
export const bankSlotOfPlace = (place: number): number =>
  place - BANK_PLACE_BASE;

/** Whether `entry` is an entry the listing's range has room for, counted from zero. Whether content defines that many active items is the store's to refuse. */
export const isListingEntryIndex = (entry: number): boolean =>
  Number.isInteger(entry) && entry >= 0 && entry < LISTING_ENTRY_CAPACITY;

/** The place of the listing's entry `entry`. */
export const listingPlace = (entry: number): number =>
  LISTING_PLACE_BASE + entry;

/** Whether `place` is in the listing's range. */
export const isListingPlace = (place: number): boolean =>
  isListingEntryIndex(place - LISTING_PLACE_BASE);

/** The listing's entry `place` names, for a place `isListingPlace` accepts. */
export const listingEntryOfPlace = (place: number): number =>
  place - LISTING_PLACE_BASE;
