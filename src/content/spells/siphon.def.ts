import type { SpellDef } from "@domain/public";

/**
 * Siphon: a zone at the click that charges, then burns mana from every enemy inside and deals
 * damage for the mana burned. The zone is the marker: it claims the ground for the whole
 * delay, burns once on the tick the delay ends, and is gone the same tick. The recipe, the
 * targeting kind, the timings, the tables, and the preview are the spell catalogue's starting
 * values, one entry per orb level from one to seven. Every number is a starting value design
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
  effects: [
    {
      kind: "spawn_zone",
      shape: { kind: "circle", radius: 500 }, // tunable
      anchor: "anchor",
      delaySeconds: 2.9, // tunable
      lifetime: { kind: "seconds", seconds: 0 },
      motion: { kind: "still" },
      onActivate: [
        {
          kind: "named",
          key: "siphon_burn",
          fields: {
            burn: {
              orb: "whorl",
              byLevel: [100, 175, 250, 325, 400, 475, 550],
            }, // tunable
            damagePerMana: 0.5, // tunable
          },
        },
      ],
      eachTick: [],
      atlasFrame: "ring_thin",
      tint: 0xb388ff,
    },
  ],
  preview: { kind: "circle", radius: 500, atlasFrame: "ring_thin" },
  atlasFrame: "ring_thin",
  tint: 0xb388ff,
} as const satisfies SpellDef;
