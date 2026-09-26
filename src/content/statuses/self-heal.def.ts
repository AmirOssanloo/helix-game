import type { StatusDef } from "@domain/public";

/**
 * The self-heal on the enemy that cast it: health restored every tick while it lasts, never past
 * the maximum. A second cast refreshes the duration and never stacks. The applier gives the
 * duration; an enemy casts at level one, so the table repeats one value. Every number is a
 * starting value design retunes here.
 */
export const selfHealDef = {
  id: "self_heal",
  flags: [],
  modifiers: [],
  damageOverTime: null,
  healOverTime: {
    perSecond: { orb: "quartz", byLevel: [10, 10, 10, 10, 10, 10, 10] }, // tunable
  },
  onDamageTaken: null,
  onDamageDealt: null,
  onExpiry: [],
  stack: "refresh",
  atlasFrame: "icon_self_heal",
} as const satisfies StatusDef;
