import type { AbilityDef } from "@domain/public";

/**
 * A net thrown at one unit: a homing projectile that roots what it lands on, so the hero stands
 * where it was caught but still attacks and casts at what is in range. The net flies at the
 * speed of an archer's arrow and can be outrun only by leaving its range before it is thrown.
 * An enemy casts at level one, so every table repeats one value. Every number is a starting
 * value design retunes here.
 */
export const rootNetDef = {
  id: "root_net",
  targeting: "unit",
  castPointSeconds: 0.4, // tunable
  backswingSeconds: 0.3, // tunable
  cooldownSeconds: [12, 12, 12, 12, 12, 12, 12], // tunable
  manaCost: [0, 0, 0, 0, 0, 0, 0], // tunable
  range: 700, // tunable
  effects: [
    {
      kind: "spawn_projectile",
      origin: "caster",
      speed: 900, // tunable
      radius: 24, // tunable
      homing: true,
      maxRange: 0,
      onHit: [
        {
          kind: "apply_status",
          target: { kind: "target" },
          statusId: "root",
          seconds: 1.5, // tunable
        },
      ],
      atlasFrame: "ring_thick",
      tint: 0xc9b27c,
    },
  ],
  preview: { kind: "unit", atlasFrame: "ring_thick" },
  atlasFrame: "ring_thick",
  tint: 0xc9b27c,
} as const satisfies AbilityDef;
