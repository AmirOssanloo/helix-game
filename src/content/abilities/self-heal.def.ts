import type { AbilityDef } from "@domain/public";

/**
 * A caster mending itself: aimed at nothing, it puts the self-heal status on the caster once the
 * cast point ends, and the status restores health for its duration. The entry that lists it
 * holds it until the caster's health falls below a fraction of its maximum, so a healthy enemy
 * never spends it. A stun in the cast point cancels it, which is the counterplay. An enemy casts
 * at level one, so every table repeats one value. Every number is a starting value design
 * retunes here.
 */
export const selfHealDef = {
  id: "self_heal",
  targeting: "none",
  castPointSeconds: 0.5, // tunable
  backswingSeconds: 0.3, // tunable
  cooldownSeconds: [20, 20, 20, 20, 20, 20, 20], // tunable
  manaCost: [0, 0, 0, 0, 0, 0, 0], // tunable
  range: 0,
  effects: [
    {
      kind: "apply_status",
      target: { kind: "target" },
      statusId: "self_heal",
      seconds: 5, // tunable
    },
  ],
  preview: { kind: "none" },
  atlasFrame: "disc",
  tint: 0x7cffa0,
} as const satisfies AbilityDef;
