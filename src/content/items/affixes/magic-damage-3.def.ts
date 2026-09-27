import type { AffixDef } from "@domain/public";

/**
 * Magic damage III: flat magic damage as a fraction of one, flat since it is read over a base
 * of zero, from affix level 10.
 */
export const magicDamage3Def = {
  id: "magic_damage_3",
  name: "Magic damage III",
  stat: "magic_damage",
  kind: "flat",
  armorySlots: ["amulet", "main_hand", "off_hand"],
  affixLevel: 10,
  requirement: 10,
  min: 0.09,
  max: 0.12,
  rarities: ["rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
