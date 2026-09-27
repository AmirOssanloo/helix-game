import type { AffixDef } from "@domain/public";

/** Armour II: flat armour, from affix level 5. */
export const armour2Def = {
  id: "armour_2",
  name: "Armour II",
  stat: "armour",
  kind: "flat",
  armorySlots: ["helm", "body", "off_hand", "gloves", "belt", "boots"],
  affixLevel: 5,
  requirement: 5,
  min: 3,
  max: 4,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
