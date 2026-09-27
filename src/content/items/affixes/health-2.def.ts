import type { AffixDef } from "@domain/public";

/** Health II: flat maximum health, from affix level 5. */
export const health2Def = {
  id: "health_2",
  name: "Health II",
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
  affixLevel: 5,
  requirement: 5,
  min: 21,
  max: 35,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
