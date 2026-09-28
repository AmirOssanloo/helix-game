import type { ItemBaseDef } from "@domain/public";

/**
 * The robe: the caster's armour, two cells by three, dropping from item level 3 with flat
 * maximum mana.
 */
export const robeDef = {
  id: "robe",
  name: "Robe",
  armorySlot: "body",
  width: 2,
  height: 3,
  qualityLevel: 3,
  requirement: 3,
  implicit: { stat: "max_mana", kind: "flat", min: 25, max: 40 },
  atlasFrame: "item_body",
  value: 55,
} as const satisfies ItemBaseDef;
