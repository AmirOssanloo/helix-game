import type { AffixDef } from "@domain/public";

/** Mana III: flat maximum mana, from affix level 9. */
export const mana3Def = {
  id: "mana_3",
  name: "Mana III",
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
  affixLevel: 9,
  requirement: 9,
  min: 36,
  max: 55,
  rarities: ["rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
