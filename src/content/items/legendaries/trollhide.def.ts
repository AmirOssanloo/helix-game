import type { LegendaryDef } from "@domain/public";

/**
 * Trollhide: a sash with fixed maximum health, health regeneration per second, and armour,
 * dropped by the boss pack that names it.
 */
export const trollhideDef = {
  id: "trollhide",
  name: "Trollhide",
  baseId: "sash",
  requirement: 8,
  lines: [
    { stat: "max_health", kind: "flat", value: 80 },
    { stat: "health_regen", kind: "flat", value: 1.5 },
    { stat: "armour", kind: "flat", value: 3 },
  ],
} as const satisfies LegendaryDef;
