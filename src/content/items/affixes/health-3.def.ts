import type { AffixDef } from "@domain/public";

/** Health III: flat maximum health, from affix level 9. */
export const health3Def = {
  id: "health_3",
  name: "Health III",
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
  affixLevel: 9,
  requirement: 9,
  min: 36,
  max: 55,
  rarities: ["rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
