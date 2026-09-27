import type { AffixDef } from "@domain/public";

/** Armour III: flat armour, from affix level 9. */
export const armour3Def = {
  id: "armour_3",
  name: "Armour III",
  stat: "armour",
  kind: "flat",
  armorySlots: ["helm", "body", "off_hand", "gloves", "belt", "boots"],
  affixLevel: 9,
  requirement: 9,
  min: 5,
  max: 7,
  rarities: ["rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
