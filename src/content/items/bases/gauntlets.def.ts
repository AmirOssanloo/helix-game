import type { ItemBaseDef } from "@domain/public";

/**
 * The gauntlets: the heavy gloves, two cells by two, dropping from item level 6 with flat
 * armour.
 */
export const gauntletsDef = {
  id: "gauntlets",
  name: "Gauntlets",
  armorySlot: "gloves",
  width: 2,
  height: 2,
  qualityLevel: 6,
  requirement: 6,
  implicit: { stat: "armour", kind: "flat", min: 2, max: 4 },
  atlasFrame: "item_gloves",
  value: 90,
} as const satisfies ItemBaseDef;
