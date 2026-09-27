import type { AffixDef } from "@domain/public";

/** Movement speed I: percent movement speed as a fraction of one, from affix level 1. */
export const movementSpeed1Def = {
  id: "movement_speed_1",
  name: "Movement speed I",
  stat: "movement_speed",
  kind: "percent",
  armorySlots: ["boots"],
  affixLevel: 1,
  requirement: 1,
  min: 0.01,
  max: 0.03,
  rarities: ["uncommon", "rare", "epic", "imperial", "mythical"],
} as const satisfies AffixDef;
