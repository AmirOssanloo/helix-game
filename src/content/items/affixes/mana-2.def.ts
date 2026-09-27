import type { AffixDef } from "@domain/public";

/** Mana II: flat maximum mana, from affix level 5. */
export const mana2Def = {
  id: "mana_2",
  name: "Mana II",
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
  affixLevel: 5,
  requirement: 5,
  min: 21,
  max: 35,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
