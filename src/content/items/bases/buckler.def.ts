import type { ItemBaseDef } from "@domain/public";

/**
 * The buckler: an off-hand two cells by two, dropping from item level 2 with flat armour.
 */
export const bucklerDef = {
  id: "buckler",
  name: "Buckler",
  armorySlot: "off_hand",
  width: 2,
  height: 2,
  qualityLevel: 2,
  requirement: 2,
  implicit: { stat: "armour", kind: "flat", min: 1, max: 3 },
  atlasFrame: "item_off_hand",
  value: 40,
} as const satisfies ItemBaseDef;
