import type { DamageType } from "../combat/damage";
import type { Stat } from "../entities/unit";
import type { EffectDef } from "./effect-def";
import type { LevelTable } from "./level-table";

/**
 * What a status sets on its holder while it lasts. The first four are the disables the
 * validator reads; lifted also makes the unit untargetable and suspends its order, aggro
 * hidden drops it out of enemy sight, and displaced blocks its own movement while a push
 * carries it.
 */
export type StatusFlag =
  | "stunned"
  | "silenced"
  | "rooted"
  | "disarmed"
  | "lifted"
  | "untargetable"
  | "aggro_hidden"
  | "displaced";

/** Every status flag, for content validation to check a definition against. */
export const STATUS_FLAGS: readonly StatusFlag[] = [
  "stunned",
  "silenced",
  "rooted",
  "disarmed",
  "lifted",
  "untargetable",
  "aggro_hidden",
  "displaced",
];

/** What a second application does: refresh restarts the duration, stack adds an instance, ignore keeps the first. */
export type StackRule = "refresh" | "stack" | "ignore";

/** Every stack rule, for content validation to check a definition against. */
export const STACK_RULES: readonly StackRule[] = ["refresh", "stack", "ignore"];

/** How a modifier changes its stat: a flat amount in the stat's own unit, or a fraction of one of the stat. */
export type StatusModifierKind = "flat" | "percent";

/** Every modifier kind, for content validation to check a definition against. */
export const STATUS_MODIFIER_KINDS: readonly StatusModifierKind[] = [
  "flat",
  "percent",
];

/** One stat the status changes on its holder, by a table the status's orb levels index. A slow is a negative fraction. */
export type StatusModifierDef = Readonly<{
  stat: Stat;
  kind: StatusModifierKind;
  amount: LevelTable;
}>;

/** Damage the status takes from its holder's health every tick, credited to the unit that applied it. */
export type DamageOverTimeDef = Readonly<{
  damageType: DamageType;
  perSecond: LevelTable;
}>;

/**
 * An effect list the status runs when its holder takes or deals damage, at most once per
 * cooldown, with the unit on the other side of the damage as the target. Damage a hook
 * deals runs no hooks, so a hook can neither trigger itself nor ping-pong with another.
 */
export type StatusHookDef = Readonly<{
  cooldownSeconds: LevelTable;
  effects: readonly EffectDef[];
}>;

/**
 * One lasting condition as content writes it: what it sets, changes, and takes on its
 * holder, what it runs on damage and on expiry, how a second application stacks, and the
 * icon it is drawn with. A status carries no duration; the applier gives one, so one
 * definition serves a short stun and a long one. Every table on it names its orb, and the
 * entry on the holder snapshots the three orb levels at application.
 */
export type StatusDef = Readonly<{
  id: string;
  flags: readonly StatusFlag[];
  modifiers: readonly StatusModifierDef[];
  damageOverTime: DamageOverTimeDef | null;
  onDamageTaken: StatusHookDef | null;
  onDamageDealt: StatusHookDef | null;
  onExpiry: readonly EffectDef[];
  stack: StackRule;
  atlasFrame: string;
}>;
