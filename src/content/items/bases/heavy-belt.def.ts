import type { ItemBaseDef } from "@domain/public";

/**
 * The heavy belt: the heavy belt, two cells by one, dropping from item level 5 with flat
 * maximum health.
 */
export const heavyBeltDef = {
  id: "heavy_belt",
  name: "Heavy belt",
  armorySlot: "belt",
  width: 2,
  height: 1,
  qualityLevel: 5,
  requirement: 5,
  implicit: { stat: "max_health", kind: "flat", min: 30, max: 45 },
  atlasFrame: "item_belt",
  value: 85,
} as const satisfies ItemBaseDef;
