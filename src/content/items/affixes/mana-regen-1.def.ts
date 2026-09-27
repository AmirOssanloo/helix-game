import type { AffixDef } from "@domain/public";

/** Mana regeneration I: flat mana regeneration per second, from affix level 1. */
export const manaRegen1Def = {
  id: "mana_regen_1",
  name: "Mana regeneration I",
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
  affixLevel: 1,
  requirement: 1,
  min: 0.2,
  max: 0.4,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
