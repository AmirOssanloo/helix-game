import type { AbilityDef } from "@domain/public";

/**
 * A charge at one unit: the caster carries itself toward the target at speed, up to its distance
 * or until it meets the target's edge, whichever is nearer, and a wall on the way stops it. It
 * reaches as far as it can carry, so the entry that lists it may throw it from the whole of that
 * distance, and the short cast point is the tell. The charge only closes the gap; what the caster
 * does on arriving is its behaviour's, which goes back to the attack. An enemy casts at level
 * one, so every table repeats one value. Every number is a starting value design retunes here.
 */
export const chargeDef = {
  id: "charge",
  targeting: "unit",
  castPointSeconds: 0.3, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [12, 12, 12, 12, 12, 12, 12], // tunable
  manaCost: [0, 0, 0, 0, 0, 0, 0], // tunable
  range: 600, // tunable
  effects: [
    {
      kind: "named",
      key: "charge_to",
      fields: {
        distance: {
          orb: "quartz",
          byLevel: [600, 600, 600, 600, 600, 600, 600],
        }, // tunable
        speed: 1200, // tunable
        statusId: "charge",
      },
    },
  ],
  preview: { kind: "unit", atlasFrame: "ring_thick" },
  atlasFrame: "triangle",
  tint: 0xd9534f,
} as const satisfies AbilityDef;
