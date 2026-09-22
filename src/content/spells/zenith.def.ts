import type { SpellDef } from "@domain/public";

/**
 * Zenith: a ground strike at the click that, after a delay, deals pure damage in a small circle
 * split among everything inside. The zone is the marker: it claims the ground for the whole
 * delay, strikes once on the tick the delay ends, and is gone the same tick, so nothing lingers
 * to catch what walks in after. The recipe, the targeting kind, the timings, the tables, and the
 * preview are the spell catalogue's starting values, one entry per orb level from one to seven.
 * Every number is a starting value design retunes here.
 */
export const zenithDef = {
  id: "zenith",
  recipe: ["ember", "ember", "ember"],
  targeting: "point",
  castPointSeconds: 0.1, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [25, 24, 23, 22, 21, 20, 19], // tunable
  manaCost: [175, 180, 185, 190, 195, 200, 205], // tunable
  range: 1200, // tunable
  effects: [
    {
      kind: "spawn_zone",
      shape: { kind: "circle", radius: 175 }, // tunable
      anchor: "anchor",
      delaySeconds: 1.7, // tunable
      lifetime: { kind: "seconds", seconds: 0 },
      motion: { kind: "still" },
      onActivate: [
        {
          kind: "damage_area",
          target: { kind: "zone" },
          damageType: "pure",
          amount: {
            orb: "ember",
            byLevel: [100, 162, 225, 287, 350, 412, 475],
          }, // tunable
          rate: "once",
          split: true,
        },
      ],
      eachTick: [],
      atlasFrame: "ring_thick",
      tint: 0xffb347,
    },
  ],
  preview: { kind: "circle", radius: 175, atlasFrame: "ring_thin" },
  atlasFrame: "ring_thick",
  tint: 0xffb347,
} as const satisfies SpellDef;
