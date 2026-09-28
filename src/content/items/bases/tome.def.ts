import type { ItemBaseDef } from "@domain/public";

/**
 * The tome: the first off-hand, two cells by two, dropping from item level 1 with flat maximum
 * mana.
 */
export const tomeDef = {
  id: "tome",
  name: "Tome",
  armorySlot: "off_hand",
  width: 2,
  height: 2,
  qualityLevel: 1,
  requirement: 1,
  implicit: { stat: "max_mana", kind: "flat", min: 10, max: 20 },
  atlasFrame: "item_off_hand",
  value: 30,
} as const satisfies ItemBaseDef;
