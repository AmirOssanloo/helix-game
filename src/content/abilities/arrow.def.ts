import type { AbilityDef } from "@domain/public";

/**
 * An aimed arrow at one unit: a homing shot from the caster that deals physical damage where it
 * lands, so armour takes its share. It is a heavier blow than an archer's plain shot, on a clock,
 * flying at the same speed, and it can be outrun only by leaving its range before it is loosed.
 * An enemy casts at level one, so every table repeats one value. Every number is a starting value
 * design retunes here.
 */
export const arrowDef = {
  id: "arrow",
  targeting: "unit",
  castPointSeconds: 0.4, // tunable
  backswingSeconds: 0.3, // tunable
  cooldownSeconds: [8, 8, 8, 8, 8, 8, 8], // tunable
  manaCost: [0, 0, 0, 0, 0, 0, 0], // tunable
  range: 700, // tunable
  effects: [
    {
      kind: "spawn_projectile",
      origin: "caster",
      speed: 900, // tunable
      radius: 12, // tunable
      homing: true,
      maxRange: 0,
      onHit: [
        {
          kind: "damage_area",
          target: { kind: "target" },
          damageType: "physical",
          amount: { orb: "quartz", byLevel: [60, 60, 60, 60, 60, 60, 60] }, // tunable
          rate: "once",
          split: false,
        },
      ],
      atlasFrame: "disc",
      tint: 0x8fd18f,
    },
  ],
  preview: { kind: "unit", atlasFrame: "ring_thick" },
  atlasFrame: "disc",
  tint: 0x8fd18f,
} as const satisfies AbilityDef;
