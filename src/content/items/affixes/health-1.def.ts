import type { AffixDef } from "@domain/public";

/** Health I: flat maximum health, from affix level 1. */
export const health1Def = {
  id: "health_1",
  name: "Health I",
  stat: "max_health",
  kind: "flat",
  armorySlots: [
    "helm",
    "amulet",
    "body",
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
