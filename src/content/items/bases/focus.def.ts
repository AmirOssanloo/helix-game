import type { ItemBaseDef } from "@domain/public";

/**
 * The focus: an off-hand one cell by two, dropping from item level 3 with mana regeneration per
 * second.
 */
export const focusDef = {
  id: "focus",
  name: "Focus",
  armorySlot: "off_hand",
  width: 1,
  height: 2,
  qualityLevel: 3,
  requirement: 3,
  implicit: { stat: "mana_regen", kind: "flat", min: 0.3, max: 0.6 },
  atlasFrame: "item_off_hand",
  value: 55,
} as const satisfies ItemBaseDef;
