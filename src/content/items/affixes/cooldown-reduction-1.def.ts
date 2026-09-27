import type { AffixDef } from "@domain/public";

/** Cooldown reduction I: percent cooldown reduction as a fraction of one, from affix level 4. */
export const cooldownReduction1Def = {
  id: "cooldown_reduction_1",
  name: "Cooldown reduction I",
  stat: "cooldown_reduction",
  kind: "percent",
  armorySlots: ["helm", "amulet", "main_hand", "off_hand"],
  affixLevel: 4,
  requirement: 4,
  min: 0.02,
  max: 0.04,
  rarities: ["rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
