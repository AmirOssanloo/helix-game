import type { ItemBaseDef } from "@domain/public";

/**
 * The staff: the first main hand, one cell by three, dropping from item level 1 with flat
 * maximum mana.
 */
export const staffDef = {
  id: "staff",
  name: "Staff",
  armorySlot: "main_hand",
  width: 1,
  height: 3,
  qualityLevel: 1,
  requirement: 1,
  implicit: { stat: "max_mana", kind: "flat", min: 15, max: 25 },
  atlasFrame: "item_main_hand",
  value: 30,
} as const satisfies ItemBaseDef;
