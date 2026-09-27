import type { AffixDef } from "@domain/public";

/** Armour I: flat armour, from affix level 1. */
export const armour1Def = {
  id: "armour_1",
  name: "Armour I",
  stat: "armour",
  kind: "flat",
  armorySlots: ["helm", "body", "off_hand", "gloves", "belt", "boots"],
  affixLevel: 1,
  requirement: 1,
  min: 1,
  max: 2,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
