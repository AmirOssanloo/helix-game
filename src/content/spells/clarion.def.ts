import type { SpellDef } from "@domain/public";

/**
 * Clarion: a cone from the hero that damages, pushes away, and disarms everything hit. The three
 * entries run in order on the commit tick and each collects the cone for itself, so a unit the
 * damage found is still standing there for the disarm: a push takes hold of a unit at once but
 * carries it over the ticks that follow. The push is away from the hero rather than along one
 * line, so a unit at the cone's edge is thrown outward, and it goes through the movement step, so
 * one pushed into a wall stops at its edge. The push names a speed, Bolide's roll speed, rather
 * than a time, so a longer push lasts longer. The cone is written out on each entry, since an entry
 * names its own target and a definition computes nothing. The recipe, the targeting kind, the
 * timings, the tables, and the preview are the spell catalogue's starting values, one entry per
 * orb level from one to seven. Every number is a starting value design retunes here.
 */
export const clarionDef = {
  id: "clarion",
  recipe: ["quartz", "whorl", "ember"],
  targeting: "direction",
  castPointSeconds: 0.1, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [40, 37, 34, 31, 28, 25, 22], // tunable
  manaCost: [300, 305, 310, 315, 320, 325, 330], // tunable
  range: 0, // tunable
  effects: [
    {
      kind: "damage_area",
      target: { kind: "cone", angleDegrees: 60, length: 900 }, // tunable
      damageType: "magical",
      amount: {
        orb: "quartz",
        byLevel: [40, 80, 120, 160, 200, 240, 280],
      }, // tunable
      rate: "once",
      split: false,
    },
    {
      kind: "displace",
      mode: "push",
      target: { kind: "cone", angleDegrees: 60, length: 900 }, // tunable
      statusId: "knockback",
      direction: "away",
      distance: {
        orb: "whorl",
        byLevel: [200, 300, 400, 500, 600, 700, 800],
      }, // tunable
      speed: 300, // tunable
    },
    {
      kind: "apply_status",
      target: { kind: "cone", angleDegrees: 60, length: 900 }, // tunable
      statusId: "disarm",
      seconds: {
        orb: "ember",
        byLevel: [1, 1.5, 2, 2.5, 3, 3.5, 4],
      }, // tunable
    },
  ],
  preview: {
    kind: "cone",
    angleDegrees: 60, // tunable
    length: 900, // tunable
    atlasFrame: "cone_60",
  },
  atlasFrame: "cone_60",
  tint: 0xffe066,
} as const satisfies SpellDef;
