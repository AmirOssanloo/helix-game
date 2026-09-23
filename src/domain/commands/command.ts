import type { EntityId, Vec2 } from "@shared/public";
import type { DamageType } from "../combat/damage";
import type { TuningKey } from "../definitions/tuning-def";
import type { Tick } from "../tick";

/**
 * A player intent entering the simulation: one variant per intent, produced by the input
 * mapper. Every variant carries `tick`, the tick it applies to, and `timestamp`, the arrival
 * stamp the driver writes at submit time. The ordering rule sorts by `timestamp`; it is an
 * ordering key, never a duration, and nothing inside the simulation does arithmetic on it.
 *
 * No variant carries a modifier. The mapper never reads Shift, so a Shift-click is the same
 * click without it, and there is no queue variant and no waypoint list: one order at a time,
 * replaced whole.
 */
export type Command =
  | NoopCommand
  | MoveCommand
  | StopCommand
  | AttackMoveCommand
  | AttackTargetCommand
  | SlotCommand
  | CastCommand
  | SpendSkillPointCommand;

/** Proves the plumbing: ordered, consumed, and logged like any command, and changes nothing. */
export type NoopCommand = Readonly<{
  kind: "noop";
  tick: Tick;
  timestamp: number;
}>;

/** A right click on walkable ground: replace the current order with a move to `destination`. */
export type MoveCommand = Readonly<{
  kind: "move";
  tick: Tick;
  timestamp: number;
  /** The world position resolved at event time. The command system resolves it to a legal point: inside the map and off any obstacle. */
  destination: Readonly<Vec2>;
}>;

/** The S key: clear the current order, cancel a cast whose cast point has not finished, and freeze yaw. */
export type StopCommand = Readonly<{
  kind: "stop";
  tick: Tick;
  timestamp: number;
}>;

/** A then left click: move to `destination`, attacking any enemy acquired on the way. */
export type AttackMoveCommand = Readonly<{
  kind: "attack_move";
  tick: Tick;
  timestamp: number;
  destination: Readonly<Vec2>;
}>;

/** A right click on an enemy: replace the current order with an attack on `targetId`. */
export type AttackTargetCommand = Readonly<{
  kind: "attack_target";
  tick: Tick;
  timestamp: number;
  targetId: EntityId;
}>;

/** How many slot keys there are: Q, W, E, R, D, F, as slots 1 to 6. */
export const SLOT_COUNT = 6;

/**
 * One of the six slot keys on key-down. The mapper and this union never say what a slot
 * means; the active kit resolves the index. Key repeat never reaches the buffer.
 */
export type SlotCommand = Readonly<{
  kind: "slot";
  tick: Tick;
  timestamp: number;
  /** 1 to `SLOT_COUNT`, in the order Q, W, E, R, D, F. */
  slot: number;
}>;

/**
 * What a cast is aimed at, by the ability's targeting kind. A point and a direction both
 * carry a world position: the point is where the effect lands, the direction is what the
 * caster faces toward. A vector carries two: `position`, the point pressed and resolved as
 * the button went down, clamped to the map, which is where the effect lands; and `end`, the
 * point under the pointer as the button came up, unclamped, whose bearing from `position` is
 * the line the effect lies along. An `end` equal to `position` is a press with no drag.
 */
export type CastTarget =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "point"; position: Readonly<Vec2> }>
  | Readonly<{ kind: "unit"; unitId: EntityId }>
  | Readonly<{ kind: "direction"; position: Readonly<Vec2> }>
  | Readonly<{
      kind: "vector";
      position: Readonly<Vec2>;
      end: Readonly<Vec2>;
    }>;

/**
 * The confirming click for a targeted ability, or the key-down for one with no target: cast
 * `abilityId` at `target`. The targeting cursor is presentation state; this is the first the
 * simulation hears of the cast.
 */
export type CastCommand = Readonly<{
  kind: "cast";
  tick: Tick;
  timestamp: number;
  abilityId: string;
  target: CastTarget;
}>;

/**
 * A click on one of the HUD's orb squares while a skill point is unspent: spend one on the
 * orb skill the square's slot holds. It carries the slot, not the orb, so the HUD names no
 * orb; the active form's kit resolves the slot, and a slot that holds no orb skill is refused.
 * No disable refuses it: a level is not an action of the unit.
 */
export type SpendSkillPointCommand = Readonly<{
  kind: "spend_skill_point";
  tick: Tick;
  timestamp: number;
  /** 1 to `SLOT_COUNT`, in the order Q, W, E, R, D, F. */
  slot: number;
}>;

/**
 * A developer-panel intent. It lands in the same buffer and the same input log as a player
 * command, so a session with the panel open replays exactly. The panel has exactly the power
 * this union gives it: a new control is a new variant here and its handling in the domain,
 * never a method on the world. A duration a variant carries is in ticks, converted by the
 * panel from what a person typed, so the log holds what the tick read. Every variant is
 * validated for its shape before it applies, and refused with a reason when the world cannot
 * take it: no hero to act on, no room in the pool, a level at its cap.
 */
export type DebugCommand =
  | DebugNoopCommand
  | ApplyDamageCommand
  | DrainManaCommand
  | HealCommand
  | RestoreManaCommand
  | LevelUpCommand
  | SetOrbLevelsCommand
  | ToggleInfiniteManaCommand
  | ToggleNoCooldownsCommand
  | KillHeroCommand
  | SpawnUnitsCommand
  | SpawnEnemiesCommand
  | ClearUnitsCommand
  | ResetMapCommand
  | BeginChannelCommand
  | ApplyStatusCommand
  | SpawnZoneCommand;

/** The debug twin of `noop`: proves the panel's path through the buffer and the log. */
export type DebugNoopCommand = Readonly<{
  kind: "debug_noop";
  tick: Tick;
  timestamp: number;
}>;

/** Takes `amount` health from the hero as `damageType`, through the combat rules. A zero is read by the death system at the end of the tick. */
export type ApplyDamageCommand = Readonly<{
  kind: "apply_damage";
  tick: Tick;
  timestamp: number;
  amount: number;
  damageType: DamageType;
}>;

/** Takes `amount` mana from the hero's active form, never below zero. */
export type DrainManaCommand = Readonly<{
  kind: "drain_mana";
  tick: Tick;
  timestamp: number;
  amount: number;
}>;

/** Sets the hero's health to its maximum. */
export type HealCommand = Readonly<{
  kind: "heal";
  tick: Tick;
  timestamp: number;
}>;

/** Sets the hero's mana to its maximum. */
export type RestoreManaCommand = Readonly<{
  kind: "restore_mana";
  tick: Tick;
  timestamp: number;
}>;

/** Grants the hero one level, with the skill points a level brings. Refused at the level cap. */
export type LevelUpCommand = Readonly<{
  kind: "level_up";
  tick: Tick;
  timestamp: number;
}>;

/** Sets the level of every orb skill on the hero's active form: one entry per orb in slot-key order, each from zero to the cap. */
export type SetOrbLevelsCommand = Readonly<{
  kind: "set_orb_levels";
  tick: Tick;
  timestamp: number;
  levels: readonly number[];
}>;

/** Flips the switch under which a cast never spends mana and never wants for it. */
export type ToggleInfiniteManaCommand = Readonly<{
  kind: "toggle_infinite_mana";
  tick: Tick;
  timestamp: number;
}>;

/** Flips the switch under which every clock reads as ready. */
export type ToggleNoCooldownsCommand = Readonly<{
  kind: "toggle_no_cooldowns";
  tick: Tick;
  timestamp: number;
}>;

/** Sets the hero's health to zero, so the death system takes it at the end of the tick. */
export type KillHeroCommand = Readonly<{
  kind: "kill_hero";
  tick: Tick;
  timestamp: number;
}>;

/**
 * Puts `count` generic units into the world around `position`, for a stress test: enemy-kind
 * units with no definition, wearing the tuned hull, in a grid the collision rule settles. A
 * position on an obstacle or off the map resolves to the nearest legal point. Refused when
 * the pool has no room for all of them.
 */
export type SpawnUnitsCommand = Readonly<{
  kind: "spawn_units";
  tick: Tick;
  timestamp: number;
  count: number;
  position: Readonly<Vec2>;
}>;

/**
 * Puts `count` units of the archetype `archetypeId` names into the world around `position`,
 * each wearing that definition's body, numbers, and behaviour. A position on an obstacle or
 * off the map resolves to the nearest legal point, and the group fills the free cells around
 * it. Refused when no archetype has the id and when the pool has no room for all of them.
 */
export type SpawnEnemiesCommand = Readonly<{
  kind: "spawn_enemies";
  tick: Tick;
  timestamp: number;
  archetypeId: string;
  count: number;
  position: Readonly<Vec2>;
}>;

/** Releases every unit but the hero, with no deaths and no experience. */
export type ClearUnitsCommand = Readonly<{
  kind: "clear_units";
  tick: Tick;
  timestamp: number;
}>;

/** Reloads the current map: every map-scoped pool is emptied and the hero stands at the spawn point again with its order cleared. Run scope is untouched. */
export type ResetMapCommand = Readonly<{
  kind: "reset_map";
  tick: Tick;
  timestamp: number;
}>;

/**
 * Enters `channeling` for `ticks` through the order state machine, so the abort path an orb
 * press takes is the real one. The only way to channel until an ability does, and the
 * cheapest way to reach the state in a test afterwards. Refused while already channeling.
 */
export type BeginChannelCommand = Readonly<{
  kind: "begin_channel";
  tick: Tick;
  timestamp: number;
  ticks: number;
}>;

/**
 * Puts the status `statusId` names on the hero for `ticks`, as a row of its status table, at
 * the hero's current orb levels and from nobody. Refused when no status has the id, and by
 * everything the status rule refuses an application for. Whatever the status blocks is blocked
 * from the tick after the one that consumed the command until the row expires.
 */
export type ApplyStatusCommand = Readonly<{
  kind: "apply_status";
  tick: Tick;
  timestamp: number;
  statusId: string;
  ticks: number;
}>;

/**
 * Puts a bare circular zone on the ground at `position`: one that stands still, draws for
 * `delayTicks` without touching anything, and is released `lifetimeTicks` after that. It has
 * no ability and no caster behind it, so it runs no rules; it exists so the zone pool, the
 * zone view, and the spell-areas overlay can be driven before a spell casts one.
 */
export type SpawnZoneCommand = Readonly<{
  kind: "spawn_zone";
  tick: Tick;
  timestamp: number;
  position: Readonly<Vec2>;
  radius: number;
  delayTicks: number;
  lifetimeTicks: number;
}>;

/**
 * A developer-panel slider: set the tunable `key` to `value`, in the designer's units the
 * tuning table writes. The tuning state converts it once when the command is applied, and it
 * lands in the input log like every command, so a session with a retune replays. It is neither
 * a player command nor a debug command: it changes run scope, not the hero, and needs no hero
 * to apply.
 */
export type SetTuningCommand = Readonly<{
  kind: "set_tuning";
  tick: Tick;
  timestamp: number;
  key: TuningKey;
  value: number;
}>;

/** Anything the buffer accepts: a player command, a debug command, or a tuning change. */
export type AnyCommand = Command | DebugCommand | SetTuningCommand;

/** The kinds of the debug union, so the command system can tell a panel intent from a player's without a field for it. */
const DEBUG_COMMAND_KINDS: ReadonlySet<string> = new Set<DebugCommand["kind"]>([
  "debug_noop",
  "apply_damage",
  "drain_mana",
  "heal",
  "restore_mana",
  "level_up",
  "set_orb_levels",
  "toggle_infinite_mana",
  "toggle_no_cooldowns",
  "kill_hero",
  "spawn_units",
  "spawn_enemies",
  "clear_units",
  "reset_map",
  "begin_channel",
  "apply_status",
  "spawn_zone",
]);

/** Whether `command` is a developer-panel intent. */
export const isDebugCommand = (command: AnyCommand): command is DebugCommand =>
  DEBUG_COMMAND_KINDS.has(command.kind);
