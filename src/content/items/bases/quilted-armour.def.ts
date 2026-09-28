import type { ItemBaseDef } from "@domain/public";

/**
 * The quilted armour: the first armour, two cells by three, dropping from item level 1 with
 * flat armour.
 */
export const quiltedArmourDef = {
  id: "quilted_armour",
  name: "Quilted armour",
  armorySlot: "body",
  width: 2,
  height: 3,
  qualityLevel: 1,
  requirement: 1,
  implicit: { stat: "armour", kind: "flat", min: 2, max: 3 },
  atlasFrame: "item_body",
  value: 35,
} as const satisfies ItemBaseDef;
