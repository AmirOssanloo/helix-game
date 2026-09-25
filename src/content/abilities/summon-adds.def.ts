import type { AbilityDef } from "@domain/public";

/**
 * Adds brought to the caster's side: two imps beside it, owned by it, in its pack, gone when
 * their lifetime runs out or on the tick it dies. Imps are enemies and count against the live
 * cap, so a cast that would take the cap past its limit is refused whole, with nothing spent and
 * no clock started. The ability aims at nothing, and the long cast point is the tell. An enemy
 * casts at level one, so every table repeats one value. Every number is a starting value design
 * retunes here.
 */
export const summonAddsDef = {
  id: "summon_adds",
  targeting: "none",
  castPointSeconds: 0.8, // tunable
  backswingSeconds: 0.4, // tunable
  cooldownSeconds: [20, 20, 20, 20, 20, 20, 20], // tunable
  manaCost: [0, 0, 0, 0, 0, 0, 0], // tunable
  range: 0,
  effects: [
    {
      kind: "spawn_unit",
      unitId: "imp",
      count: 2, // tunable
      offset: { forward: 60, right: 0 }, // tunable
      lifetimeSeconds: { orb: "quartz", byLevel: [30, 30, 30, 30, 30, 30, 30] }, // tunable
      bonuses: [],
    },
  ],
  preview: { kind: "none" },
  atlasFrame: "disc",
  tint: 0x9b6fd1,
} as const satisfies AbilityDef;
