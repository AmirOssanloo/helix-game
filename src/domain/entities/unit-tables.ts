import { ORB_IDS } from "../definitions/orb-id";
import type { Tick } from "../tick";
import type { UnitId } from "./unit";

/**
 * One row of a unit's status table. A `null` definition id is an empty row. `orbLevels` is the
 * applier's three orb levels as they stood when the status landed, in orb order, which is what
 * every table on the definition is read at for as long as the row lasts. The two ready ticks
 * are the internal cooldowns of the definition's damage hooks: the tick each side may fire on
 * again, kept on the row so the state replays and a refresh does not hand the hook back early.
 */
export type StatusEntry = {
  definitionId: string | null;
  endsAtTick: Tick;
  stacks: number;
  sourceId: UnitId | null;
  orbLevels: number[];
  damageTakenReadyAtTick: Tick;
  damageDealtReadyAtTick: Tick;
};

/**
 * A derived value a modifier source changes. Attack damage is no derived value the stats
 * system writes: the attack rule reads its rows over the attacker's definition at the moment
 * of a shot, so an Ember instance out now is in this shot. Cooldown reduction is none either:
 * the cooldown pipeline reads its rows when a clock starts, a flat amount in ticks and a
 * fraction of the clock, and never again for that clock. Magic damage is none: the damage
 * door reads its rows off the attacker at each magical hit, over a base of nothing, a flat
 * amount being a fraction of the hit added to it.
 */
export type Stat =
  | "movement_speed"
  | "attack_damage"
  | "cooldown_reduction"
  | "magic_damage"
  | "max_health"
  | "health_regen"
  | "max_mana"
  | "mana_regen"
  | "armour"
  | "attack_speed"
  | "magic_resistance";

/** Every stat a modifier row may name, for content validation to check a definition against. */
export const STATS: readonly Stat[] = [
  "movement_speed",
  "attack_damage",
  "cooldown_reduction",
  "magic_damage",
  "max_health",
  "health_regen",
  "max_mana",
  "mana_regen",
  "armour",
  "attack_speed",
  "magic_resistance",
];

/** What wrote a modifier row: a status, a held orb instance, or the ability that summoned the unit. A source removes every row of its kind. An item writes no row; it reaches a stat through the totals a table references. */
export type ModifierKind = "status" | "orb" | "summon";

/**
 * One row of a unit's modifier table: one source's contribution to one stat, a flat amount in
 * the stat's own unit and a fraction of one. A `null` stat is an empty row. The stat's stack
 * reads every row for it each tick; nothing caches the sum.
 */
export type ModifierEntry = {
  kind: ModifierKind | null;
  stat: Stat | null;
  flat: number;
  percent: number;
};

export const createStatusEntry = (): StatusEntry => ({
  definitionId: null,
  endsAtTick: 0,
  stacks: 0,
  sourceId: null,
  orbLevels: ORB_IDS.map(() => 0),
  damageTakenReadyAtTick: 0,
  damageDealtReadyAtTick: 0,
});

/** Puts the row back to empty. The level snapshot keeps its last values; the definition id says whether the row is live. */
export const clearStatusEntry = (entry: StatusEntry): void => {
  entry.definitionId = null;
  entry.endsAtTick = 0;
  entry.stacks = 0;
  entry.sourceId = null;
  entry.damageTakenReadyAtTick = 0;
  entry.damageDealtReadyAtTick = 0;
};

export const createModifierEntry = (): ModifierEntry => ({
  kind: null,
  stat: null,
  flat: 0,
  percent: 0,
});

export const clearModifierEntry = (entry: ModifierEntry): void => {
  entry.kind = null;
  entry.stat = null;
  entry.flat = 0;
  entry.percent = 0;
};
