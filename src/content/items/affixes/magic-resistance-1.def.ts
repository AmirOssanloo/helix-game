import type { AffixDef } from "@domain/public";

/** Magic resistance I: flat magic resistance as a fraction of one, from affix level 1. */
export const magicResistance1Def = {
  id: "magic_resistance_1",
  name: "Magic resistance I",
  stat: "magic_resistance",
  kind: "flat",
  armorySlots: ["helm", "amulet", "body", "off_hand", "ring"],
  affixLevel: 1,
  requirement: 1,
  min: 0.02,
  max: 0.03,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
