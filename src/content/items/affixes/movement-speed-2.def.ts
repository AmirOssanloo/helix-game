import type { AffixDef } from "@domain/public";

/** Movement speed II: percent movement speed as a fraction of one, from affix level 6. */
export const movementSpeed2Def = {
  id: "movement_speed_2",
  name: "Movement speed II",
  stat: "movement_speed",
  kind: "percent",
  armorySlots: ["boots"],
  affixLevel: 6,
  requirement: 6,
  min: 0.04,
  max: 0.06,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
