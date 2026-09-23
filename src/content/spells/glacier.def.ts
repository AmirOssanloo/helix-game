import type { SpellDef } from "@domain/public";

/**
 * Glacier: a line of wall segments centred on the point pressed and lying along the drag, or
 * across the line from the hero to the point when the press has no drag, each a zone that
 * heavily slows and burns the enemies inside it. A press beyond the range walks the hero in. The segment zone is written here in
 * full and the named effect only decides where each copy of it stands, so the shape, the clock,
 * and the colour of a segment stay content's. A segment blocks nothing, since the walkability
 * grid is static. The recipe, the targeting kind, the timings, the tables, and the preview are
 * the spell catalogue's starting values, one entry per orb level from one to seven. Every number
 * is a starting value design retunes here.
 */
export const glacierDef = {
  id: "glacier",
  recipe: ["quartz", "quartz", "ember"],
  targeting: "vector",
  castPointSeconds: 0.1, // tunable
  backswingSeconds: 0.1, // tunable
  cooldownSeconds: [25, 24, 23, 22, 21, 20, 19], // tunable
  manaCost: [175, 180, 185, 190, 195, 200, 205], // tunable
  range: 1000, // tunable
  effects: [
    {
      kind: "named",
      key: "glacier_place",
      fields: {
        segments: 7, // tunable
        spacing: 160, // tunable
        zone: {
          kind: "spawn_zone",
          shape: { kind: "rectangle", length: 160, width: 80 }, // tunable
          anchor: "anchor",
          delaySeconds: 0, // tunable
          lifetime: {
            kind: "seconds",
            seconds: {
              orb: "quartz",
              byLevel: [3, 4.5, 6, 7.5, 9, 10.5, 12],
            }, // tunable
          },
          motion: { kind: "still" },
          onActivate: [],
          eachTick: [
            {
              kind: "apply_status",
              target: { kind: "zone" },
              statusId: "glacier_chill",
              seconds: 1, // tunable
            },
          ],
          atlasFrame: "square",
          tint: 0x6fb7ff,
        },
      },
    },
  ],
  preview: { kind: "line" },
  atlasFrame: "square",
  tint: 0x6fb7ff,
} as const satisfies SpellDef;
