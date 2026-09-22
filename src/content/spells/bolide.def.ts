import type { SpellDef } from "@domain/public";

/**
 * Bolide: a meteor that lands at the click after a delay and rolls in a line away from the hero,
 * damaging what it passes and leaving a burn on it. The zone is the meteor: it claims the ground
 * for the whole fall, and from the tick it lands it travels along the facing, which runs from the
 * hero through the click, until its distance is spent. Its lifetime is that motion, so it is gone
 * the moment the roll ends. The damage is a rate, so a unit the meteor rolls over pays for the
 * ticks it was under it; the burn is reapplied every one of them, so it lasts its own seconds
 * after the meteor has passed. The recipe, the targeting kind, the timings, the tables, and the
 * preview are the spell catalogue's starting values, one entry per orb level from one to seven.
 * Every number is a starting value design retunes here.
 */
export const bolideDef = {
  id: "bolide",
  recipe: ["ember", "ember", "whorl"],
  targeting: "point",
  castPointSeconds: 0.1, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [55, 51, 47, 43, 39, 35, 31], // tunable
  manaCost: [200, 205, 210, 215, 220, 225, 230], // tunable
  range: 700, // tunable
  effects: [
    {
      kind: "spawn_zone",
      shape: { kind: "circle", radius: 200 }, // tunable
      anchor: "anchor",
      delaySeconds: 1.3, // tunable
      lifetime: { kind: "motion" },
      motion: {
        kind: "line",
        speed: 300, // tunable
        distance: {
          orb: "whorl",
          byLevel: [500, 650, 800, 950, 1100, 1250, 1400],
        }, // tunable
      },
      onActivate: [],
      eachTick: [
        {
          kind: "damage_area",
          target: { kind: "zone" },
          damageType: "magical",
          amount: {
            orb: "ember",
            byLevel: [50, 75, 100, 125, 150, 175, 200],
          }, // tunable
          rate: "per_second",
          split: false,
        },
        {
          kind: "apply_status",
          target: { kind: "zone" },
          statusId: "burn",
          seconds: 3, // tunable
        },
      ],
      atlasFrame: "disc",
      tint: 0xff5533,
    },
  ],
  preview: { kind: "circle", radius: 200, atlasFrame: "ring_thin" },
  atlasFrame: "disc",
  tint: 0xff5533,
} as const satisfies SpellDef;
