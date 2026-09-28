import type { ItemBaseDef } from "@domain/public";

/**
 * The sceptre: the strongest main hand, one cell by three, dropping from item level 5 with
 * magic damage as a fraction of one, flat since it is read over a base of zero.
 */
export const sceptreDef = {
  id: "sceptre",
  name: "Sceptre",
  armorySlot: "main_hand",
  width: 1,
  height: 3,
  qualityLevel: 5,
  requirement: 5,
  implicit: { stat: "magic_damage", kind: "flat", min: 0.05, max: 0.08 },
  atlasFrame: "item_main_hand",
  value: 95,
} as const satisfies ItemBaseDef;
