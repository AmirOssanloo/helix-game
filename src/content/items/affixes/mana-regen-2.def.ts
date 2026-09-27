import type { AffixDef } from "@domain/public";

/** Mana regeneration II: flat mana regeneration per second, from affix level 6. */
export const manaRegen2Def = {
  id: "mana_regen_2",
  name: "Mana regeneration II",
  stat: "mana_regen",
  kind: "flat",
  armorySlots: [
    "helm",
    "amulet",
    "body",
    "main_hand",
    "off_hand",
    "belt",
    "ring",
  ],
  affixLevel: 6,
  requirement: 6,
  min: 0.5,
  max: 0.9,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
