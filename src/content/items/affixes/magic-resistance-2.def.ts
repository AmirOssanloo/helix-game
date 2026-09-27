import type { AffixDef } from "@domain/public";

/** Magic resistance II: flat magic resistance as a fraction of one, from affix level 7. */
export const magicResistance2Def = {
  id: "magic_resistance_2",
  name: "Magic resistance II",
  stat: "magic_resistance",
  kind: "flat",
  armorySlots: ["helm", "amulet", "body", "off_hand", "ring"],
  affixLevel: 7,
  requirement: 7,
  min: 0.04,
  max: 0.06,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
