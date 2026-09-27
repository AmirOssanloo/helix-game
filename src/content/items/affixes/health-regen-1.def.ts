import type { AffixDef } from "@domain/public";

/** Health regeneration I: flat health regeneration per second, from affix level 1. */
export const healthRegen1Def = {
  id: "health_regen_1",
  name: "Health regeneration I",
  stat: "health_regen",
  kind: "flat",
  armorySlots: ["helm", "amulet", "body", "belt", "boots", "ring"],
  affixLevel: 1,
  requirement: 1,
  min: 0.3,
  max: 0.6,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
