import type { AffixDef } from "@domain/public";

/** Attack damage I: flat attack damage, from affix level 1. */
export const attackDamage1Def = {
  id: "attack_damage_1",
  name: "Attack damage I",
  stat: "attack_damage",
  kind: "flat",
  armorySlots: ["main_hand", "gloves", "ring"],
  affixLevel: 1,
  requirement: 1,
  min: 2,
  max: 4,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
