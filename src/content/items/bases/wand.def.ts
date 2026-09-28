import type { ItemBaseDef } from "@domain/public";

/**
 * The wand: a main hand one cell by two, dropping from item level 1 with magic damage as a
 * fraction of one, flat since it is read over a base of zero.
 */
export const wandDef = {
  id: "wand",
  name: "Wand",
  armorySlot: "main_hand",
  width: 1,
  height: 2,
  qualityLevel: 1,
  requirement: 1,
  implicit: { stat: "magic_damage", kind: "flat", min: 0.02, max: 0.04 },
  atlasFrame: "item_main_hand",
  value: 35,
} as const satisfies ItemBaseDef;
