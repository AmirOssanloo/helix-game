import type { ItemBaseDef } from "@domain/public";

/**
 * The pendant: the one amulet, a single cell, dropping from item level 1 with flat maximum
 * mana.
 */
export const pendantDef = {
  id: "pendant",
  name: "Pendant",
  armorySlot: "amulet",
  width: 1,
  height: 1,
  qualityLevel: 1,
  requirement: 1,
  implicit: { stat: "max_mana", kind: "flat", min: 10, max: 20 },
  atlasFrame: "item_amulet",
  value: 40,
} as const satisfies ItemBaseDef;
