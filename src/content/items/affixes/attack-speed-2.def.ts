import type { AffixDef } from "@domain/public";

/**
 * Attack speed II: flat attack speed, in the points the hero's 100 starts at, from affix level
 * 7.
 */
export const attackSpeed2Def = {
  id: "attack_speed_2",
  name: "Attack speed II",
  stat: "attack_speed",
  kind: "flat",
  armorySlots: ["amulet", "main_hand", "gloves", "ring"],
  affixLevel: 7,
  requirement: 7,
  min: 11,
  max: 20,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
