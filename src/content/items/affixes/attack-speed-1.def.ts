import type { AffixDef } from "@domain/public";

/**
 * Attack speed I: flat attack speed, in the points the hero's 100 starts at, from affix level
 * 1.
 */
export const attackSpeed1Def = {
  id: "attack_speed_1",
  name: "Attack speed I",
  stat: "attack_speed",
  kind: "flat",
  armorySlots: ["amulet", "main_hand", "gloves", "ring"],
  affixLevel: 1,
  requirement: 1,
  min: 5,
  max: 10,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
