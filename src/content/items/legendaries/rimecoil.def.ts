import type { LegendaryDef } from "@domain/public";

/**
 * Rimecoil: a band with fixed health regeneration per second, magic damage, and maximum mana,
 * dropped by the boss pack that names it.
 */
export const rimecoilDef = {
  id: "rimecoil",
  name: "Rimecoil",
  baseId: "band",
  requirement: 4,
  lines: [
    { stat: "health_regen", kind: "flat", value: 0.5 },
    { stat: "magic_damage", kind: "flat", value: 0.1 },
    { stat: "max_mana", kind: "flat", value: 30 },
  ],
} as const satisfies LegendaryDef;
