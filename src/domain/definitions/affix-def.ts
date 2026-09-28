import type { Stat } from "../entities/unit-tables";
import type { ArmorySlot } from "./item-base-def";
import type { StatusModifierKind } from "./status-def";

/**
 * One tier of one stat an item may roll beyond its implicit: its name, the stat and how it
 * adds, the armory slots it rolls on, the lowest item level it rolls at, the hero level it
 * asks of the item, its range in the designer's units, and the rarities it rolls at by id.
 * Every tier of one stat rolls on the same armory slots, since a roll draws the stat by the
 * slot and then a tier of it.
 */
export type AffixDef = Readonly<{
  id: string;
  name: string;
  stat: Stat;
  kind: StatusModifierKind;
  armorySlots: readonly ArmorySlot[];
  affixLevel: number;
  requirement: number;
  min: number;
  max: number;
  rarities: readonly string[];
}>;
