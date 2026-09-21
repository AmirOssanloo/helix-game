import type { SpellDef } from "@domain/public";

/**
 * Siphon: a zone at the click that charges, then burns mana from every enemy inside and deals
 * damage for the mana burned. The recipe, the targeting kind, the timings, the tables, and the
 * preview are the spell catalogue's starting values, one entry per orb level from one to seven,
 * and the effect list is empty until its effects exist. Every number is a starting value design
 * retunes here.
 */
export const siphonDef = {
  id: "siphon",
  recipe: ["whorl", "whorl", "whorl"],
  targeting: "point",
  castPointSeconds: 0.1, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [30, 28, 26, 24, 22, 20, 18], // tunable
  manaCost: [125, 130, 135, 140, 145, 150, 155], // tunable
  range: 950, // tunable
  effects: [],
  preview: { kind: "circle", radius: 500, atlasFrame: "ring_thin" },
  atlasFrame: "ring_thin",
  tint: 0xb388ff,
} as const satisfies SpellDef;
