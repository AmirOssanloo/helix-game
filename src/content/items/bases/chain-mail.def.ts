import type { ItemBaseDef } from "@domain/public";

/**
 * The chain mail: the heaviest armour, two cells by three, dropping from item level 7 with flat
 * armour.
 */
export const chainMailDef = {
  id: "chain_mail",
  name: "Chain mail",
  armorySlot: "body",
  width: 2,
  height: 3,
  qualityLevel: 7,
  requirement: 7,
  implicit: { stat: "armour", kind: "flat", min: 5, max: 7 },
  atlasFrame: "item_body",
  value: 120,
} as const satisfies ItemBaseDef;
