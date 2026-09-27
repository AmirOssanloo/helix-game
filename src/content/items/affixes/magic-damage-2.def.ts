import type { AffixDef } from "@domain/public";

/**
 * Magic damage II: flat magic damage as a fraction of one, flat since it is read over a base of
 * zero, from affix level 5.
 */
export const magicDamage2Def = {
  id: "magic_damage_2",
  name: "Magic damage II",
  stat: "magic_damage",
  kind: "flat",
  armorySlots: ["amulet", "main_hand", "off_hand"],
  affixLevel: 5,
  requirement: 5,
  min: 0.05,
  max: 0.08,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
