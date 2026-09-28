import type { LegendaryDef } from "@domain/public";

/**
 * Hallcrown: a cap with fixed armour, magic damage, percent cooldown reduction, and maximum
 * mana, dropped by the boss pack that names it.
 */
export const hallcrownDef = {
  id: "hallcrown",
  name: "Hallcrown",
  baseId: "cap",
  requirement: 11,
  lines: [
    { stat: "armour", kind: "flat", value: 2 },
    { stat: "magic_damage", kind: "flat", value: 0.12 },
    { stat: "cooldown_reduction", kind: "percent", value: 0.06 },
    { stat: "max_mana", kind: "flat", value: 40 },
  ],
} as const satisfies LegendaryDef;
