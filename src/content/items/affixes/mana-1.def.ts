import type { AffixDef } from "@domain/public";

/** Mana I: flat maximum mana, from affix level 1. */
export const mana1Def = {
  id: "mana_1",
  name: "Mana I",
  stat: "max_mana",
  kind: "flat",
  armorySlots: [
    "helm",
    "amulet",
    "body",
    "main_hand",
    "off_hand",
    "gloves",
    "belt",
    "boots",
    "ring",
  ],
  affixLevel: 1,
  requirement: 1,
  min: 10,
  max: 20,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
