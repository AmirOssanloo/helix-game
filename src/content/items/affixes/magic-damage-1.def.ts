import type { AffixDef } from "@domain/public";

/**
 * Magic damage I: flat magic damage as a fraction of one, flat since it is read over a base of
 * zero, from affix level 1.
 */
export const magicDamage1Def = {
  id: "magic_damage_1",
  name: "Magic damage I",
  stat: "magic_damage",
  kind: "flat",
  armorySlots: ["amulet", "main_hand", "off_hand"],
  affixLevel: 1,
  requirement: 1,
  min: 0.02,
  max: 0.04,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
