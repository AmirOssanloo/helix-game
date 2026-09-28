import type {
  Armory,
  Inventory,
  Item,
  ItemLine,
  PlacedItem,
  StatTotals,
} from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import { bytes, numbers, records } from "./field-collections";
import { fieldsOf, flag, itemAt, number, record, text } from "./field-list";

const ITEM_LINE_FIELDS = fieldsOf<DeepReadonly<ItemLine>>({
  sourceId: text("sourceId", (line) => line.sourceId),
  value: number("value", (line, into, at) => {
    into[at] = line.value;
  }),
});

export const ITEM_FIELDS = fieldsOf<DeepReadonly<Item>>({
  baseId: text("baseId", (item) => item.baseId),
  rarityId: text("rarityId", (item) => item.rarityId),
  legendaryId: text("legendaryId", (item) => item.legendaryId),
  itemLevel: number("itemLevel", (item, into, at) => {
    into[at] = item.itemLevel;
  }),
  lineCount: number("lineCount", (item, into, at) => {
    into[at] = item.lineCount;
  }),
  lines: records(
    "lines",
    (item) => item.lineCount,
    (item, index) => itemAt(item.lines, index),
    ITEM_LINE_FIELDS,
  ),
});

const PLACED_ITEM_FIELDS = fieldsOf<DeepReadonly<PlacedItem>>({
  item: record("item", (placed) => placed.item, ITEM_FIELDS),
  live: flag("live", (placed) => placed.live),
  corner: number("corner", (placed, into, at) => {
    into[at] = placed.corner;
  }),
  width: number("width", (placed, into, at) => {
    into[at] = placed.width;
  }),
  height: number("height", (placed, into, at) => {
    into[at] = placed.height;
  }),
});

export const INVENTORY_FIELDS = fieldsOf<DeepReadonly<Inventory>>({
  cells: bytes("cells", (inventory) => inventory.cells),
  placed: records(
    "placed",
    (inventory) => inventory.placed.length,
    (inventory, index) => itemAt(inventory.placed, index),
    PLACED_ITEM_FIELDS,
  ),
});

/** Totals, each list of sums in the stats' index order. */
export const STAT_TOTALS_FIELDS = fieldsOf<DeepReadonly<StatTotals>>({
  flat: numbers(
    "flat",
    (totals) => totals.flat.length,
    (totals, index, into, slot) => {
      into[slot] = totals.flat[index] ?? 0;
    },
  ),
  percent: numbers(
    "percent",
    (totals) => totals.percent.length,
    (totals, index, into, slot) => {
      into[slot] = totals.percent[index] ?? 0;
    },
  ),
  lines: number("lines", (totals, into, at) => {
    into[at] = totals.lines;
  }),
});

export const ARMORY_FIELDS = fieldsOf<DeepReadonly<Armory>>({
  slots: records(
    "slots",
    (armory) => armory.slots.length,
    (armory, index) => itemAt(armory.slots, index),
    ITEM_FIELDS,
  ),
  totals: record("totals", (armory) => armory.totals, STAT_TOTALS_FIELDS),
});
