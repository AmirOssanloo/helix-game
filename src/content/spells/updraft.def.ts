import type { SpellDef } from "@domain/public";

/**
 * Updraft: a zone that travels in a line from the hero, lifting every enemy it touches, carrying
 * it along, then dropping it with damage. The zone's lifetime is its motion, so it is gone the
 * moment the distance is covered; the drop and its damage are the lift status's expiry, so they
 * land on their own tick whether or not the zone is still there. The preview rectangle starts at
 * the hero, so its centre sits half its length ahead. The recipe, the targeting kind, the
 * timings, the tables, and the preview are the spell catalogue's starting values, one entry per
 * orb level from one to seven. Every number is a starting value design retunes here.
 */
export const updraftDef = {
  id: "updraft",
  recipe: ["whorl", "whorl", "quartz"],
  targeting: "direction",
  castPointSeconds: 0.1, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [30, 28, 26, 24, 22, 20, 18], // tunable
  manaCost: [150, 155, 160, 165, 170, 175, 180], // tunable
  range: 0, // tunable
  effects: [
    {
      kind: "spawn_zone",
      shape: { kind: "circle", radius: 200 }, // tunable
      anchor: "anchor",
      delaySeconds: 0, // tunable
      lifetime: { kind: "motion" },
      motion: {
        kind: "line",
        speed: 1000, // tunable
        distance: {
          orb: "whorl",
          byLevel: [800, 1000, 1200, 1400, 1600, 1800, 2000],
        }, // tunable
      },
      onActivate: [],
      eachTick: [
        {
          kind: "named",
          key: "updraft_carry",
          fields: {
            liftSeconds: {
              orb: "quartz",
              byLevel: [0.8, 1.1, 1.4, 1.7, 2, 2.3, 2.6],
            }, // tunable
            statusId: "updraft_lift",
          },
        },
      ],
      atlasFrame: "disc",
      tint: 0xd7b3ff,
    },
  ],
  preview: {
    kind: "rectangle",
    length: {
      orb: "whorl",
      byLevel: [800, 1000, 1200, 1400, 1600, 1800, 2000],
    }, // tunable
    width: 400, // tunable
    offset: { orb: "whorl", byLevel: [400, 500, 600, 700, 800, 900, 1000] }, // tunable
    atlasFrame: "square_outline",
  },
  atlasFrame: "disc",
  tint: 0xd7b3ff,
} as const satisfies SpellDef;
