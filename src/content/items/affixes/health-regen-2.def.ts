import type { AffixDef } from "@domain/public";

/** Health regeneration II: flat health regeneration per second, from affix level 6. */
export const healthRegen2Def = {
  id: "health_regen_2",
  name: "Health regeneration II",
  stat: "health_regen",
  kind: "flat",
  armorySlots: ["helm", "amulet", "body", "belt", "boots", "ring"],
  affixLevel: 6,
  requirement: 6,
  min: 0.7,
  max: 1.2,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
