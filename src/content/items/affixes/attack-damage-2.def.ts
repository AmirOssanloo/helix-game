import type { AffixDef } from "@domain/public";

/** Attack damage II: flat attack damage, from affix level 6. */
export const attackDamage2Def = {
  id: "attack_damage_2",
  name: "Attack damage II",
  stat: "attack_damage",
  kind: "flat",
  armorySlots: ["main_hand", "gloves", "ring"],
  affixLevel: 6,
  requirement: 6,
  min: 5,
  max: 9,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
