import type { ItemBaseDef } from "@domain/public";

/**
 * The leather gloves: the first gloves, two cells by two, dropping from item level 1 with flat
 * attack speed.
 */
export const leatherGlovesDef = {
  id: "leather_gloves",
  name: "Leather gloves",
  armorySlot: "gloves",
  width: 2,
  height: 2,
  qualityLevel: 1,
  requirement: 1,
  implicit: { stat: "attack_speed", kind: "flat", min: 3, max: 6 },
  atlasFrame: "item_gloves",
  value: 25,
} as const satisfies ItemBaseDef;
