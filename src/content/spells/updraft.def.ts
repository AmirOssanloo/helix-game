import type { SpellDef } from "@domain/public";

/**
 * Updraft: a zone that travels in a line from the hero, lifting every enemy it touches, carrying
 * it along, then dropping it with damage. The preview rectangle starts at the hero, so its centre
 * sits half its length ahead. The recipe, the targeting kind, the timings, the tables, and the
 * preview are the spell catalogue's starting values, one entry per orb level from one to seven,
 * and the effect list is empty until its effects exist. Every number is a starting value design
 * retunes here.
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
  effects: [],
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
