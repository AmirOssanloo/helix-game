import type { AffixDef } from "@domain/public";

/** Cooldown reduction II: percent cooldown reduction as a fraction of one, from affix level 9. */
export const cooldownReduction2Def = {
  id: "cooldown_reduction_2",
  name: "Cooldown reduction II",
  stat: "cooldown_reduction",
  kind: "percent",
  armorySlots: ["helm", "amulet", "main_hand", "off_hand"],
  affixLevel: 9,
  requirement: 9,
  min: 0.05,
  max: 0.07,
  rarities: ["rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
