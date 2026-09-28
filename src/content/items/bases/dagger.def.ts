import type { ItemBaseDef } from "@domain/public";

/**
 * The dagger: a main hand one cell by two, dropping from item level 2 with flat attack damage.
 */
export const daggerDef = {
  id: "dagger",
  name: "Dagger",
  armorySlot: "main_hand",
  width: 1,
  height: 2,
  qualityLevel: 2,
  requirement: 2,
  implicit: { stat: "attack_damage", kind: "flat", min: 3, max: 6 },
  atlasFrame: "item_main_hand",
  value: 40,
} as const satisfies ItemBaseDef;
