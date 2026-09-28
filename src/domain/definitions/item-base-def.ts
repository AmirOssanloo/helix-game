import type { Stat } from "../entities/unit-tables";
import type { StatusModifierKind } from "./status-def";

/**
 * What an armory slot takes, as a base names it. The armory has ten slots and two of them take
 * a ring, so there are nine. The Armour slot is `body`, so the word stays free for the stat.
 */
export type ArmorySlot =
  | "helm"
  | "amulet"
  | "body"
  | "main_hand"
  | "off_hand"
  | "gloves"
  | "belt"
  | "boots"
  | "ring";

/** Every armory slot a base or an affix may name, in the order the armory lays them out. */
export const ARMORY_SLOTS: readonly ArmorySlot[] = [
  "helm",
  "amulet",
  "body",
  "main_hand",
  "off_hand",
  "gloves",
  "belt",
  "boots",
  "ring",
];

/** The inventory's width and height in cells. Every base's size fits inside them. */
export const INVENTORY_COLUMNS = 10;
export const INVENTORY_ROWS = 4;

/** The most stat lines an item holds: its implicit and the most affixes any rarity rolls. */
export const ITEM_LINE_CAPACITY = 6;

/**
 * One stat an item may carry and the range it rolls in, in the designer's units: a
 * regeneration per second, a percentage as a fraction of one. Flat adds to the stat in its own
 * unit and percent adds to its percentage; magic damage is read over a base of zero, so its
 * lines are flat.
 */
export type StatRangeDef = Readonly<{
  stat: Stat;
  kind: StatusModifierKind;
  min: number;
  max: number;
}>;

/**
 * What an item is before its rarity: its name, the armory slot it is worn in, its width and
 * height in inventory cells, the lowest item level it drops or is stocked at, the hero level
 * it needs to be worn, the implicit stat every item of it carries, the atlas frame its icon is
 * drawn with in its rarity's tint, and its value in gold.
 */
export type ItemBaseDef = Readonly<{
  id: string;
  name: string;
  armorySlot: ArmorySlot;
  width: number;
  height: number;
  qualityLevel: number;
  requirement: number;
  implicit: StatRangeDef;
  atlasFrame: string;
  value: number;
}>;
