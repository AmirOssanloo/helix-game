import type { ItemBaseDef } from "@domain/public";

/**
 * The greaves: the heavy boots, two cells by two, dropping from item level 6 with flat armour.
 */
export const greavesDef = {
  id: "greaves",
  name: "Greaves",
  armorySlot: "boots",
  width: 2,
  height: 2,
  qualityLevel: 6,
  requirement: 6,
  implicit: { stat: "armour", kind: "flat", min: 2, max: 4 },
  atlasFrame: "item_boots",
  value: 90,
} as const satisfies ItemBaseDef;
