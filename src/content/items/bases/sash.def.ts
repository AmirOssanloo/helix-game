import type { ItemBaseDef } from "@domain/public";

/**
 * The sash: the first belt, two cells by one, dropping from item level 1 with flat maximum
 * health.
 */
export const sashDef = {
  id: "sash",
  name: "Sash",
  armorySlot: "belt",
  width: 2,
  height: 1,
  qualityLevel: 1,
  requirement: 1,
  implicit: { stat: "max_health", kind: "flat", min: 10, max: 20 },
  atlasFrame: "item_belt",
  value: 25,
} as const satisfies ItemBaseDef;
