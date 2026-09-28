import type { ItemBaseDef } from "@domain/public";

/**
 * The leather boots: the first boots, two cells by two, dropping from item level 1 with percent
 * movement speed as a fraction of one.
 */
export const leatherBootsDef = {
  id: "leather_boots",
  name: "Leather boots",
  armorySlot: "boots",
  width: 2,
  height: 2,
  qualityLevel: 1,
  requirement: 1,
  implicit: { stat: "movement_speed", kind: "percent", min: 0.01, max: 0.02 },
  atlasFrame: "item_boots",
  value: 30,
} as const satisfies ItemBaseDef;
