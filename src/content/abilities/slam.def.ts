import type { AbilityDef } from "@domain/public";

/**
 * A slam of the ground around the caster: a circle centred on it that deals physical damage to
 * every unit hostile to it inside, then pushes each one straight away from it. The push goes
 * through the movement step, so a unit slammed into a wall stops at its edge. The two entries
 * each collect the circle for themselves, so a unit the damage found is still standing there
 * for the push. The ability aims at nothing, so the entry that lists it holds it until the
 * target is inside the circle; the long cast point is the tell. An enemy casts at level one, so
 * every table repeats one value. Every number is a starting value design retunes here.
 */
export const slamDef = {
  id: "slam",
  targeting: "none",
  castPointSeconds: 0.6, // tunable
  backswingSeconds: 0.4, // tunable
  cooldownSeconds: [10, 10, 10, 10, 10, 10, 10], // tunable
  manaCost: [0, 0, 0, 0, 0, 0, 0], // tunable
  range: 0,
  effects: [
    {
      kind: "damage_area",
      target: { kind: "circle", radius: 250 }, // tunable
      damageType: "physical",
      amount: { orb: "quartz", byLevel: [50, 50, 50, 50, 50, 50, 50] }, // tunable
      rate: "once",
      split: false,
    },
    {
      kind: "displace",
      mode: "push",
      target: { kind: "circle", radius: 250 }, // tunable
      statusId: "knockback",
      direction: "away",
      distance: { orb: "quartz", byLevel: [300, 300, 300, 300, 300, 300, 300] }, // tunable
      speed: 900, // tunable
    },
  ],
  preview: { kind: "circle", radius: 250, atlasFrame: "ring_thin" }, // tunable
  atlasFrame: "ring_thick",
  tint: 0xc08a4a,
} as const satisfies AbilityDef;
