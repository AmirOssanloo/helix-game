import type { ItemBaseDef } from "@domain/public";

/**
 * The circlet: the second helm, two cells by two, dropping from item level 4 with flat maximum
 * mana.
 */
export const circletDef = {
  id: "circlet",
  name: "Circlet",
  armorySlot: "helm",
  width: 2,
  height: 2,
  qualityLevel: 4,
  requirement: 4,
  implicit: { stat: "max_mana", kind: "flat", min: 20, max: 35 },
  atlasFrame: "item_helm",
  value: 70,
} as const satisfies ItemBaseDef;
