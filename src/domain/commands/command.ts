import type { EntityId, Vec2 } from "@shared/public";
import type { TuningKey } from "../definitions/tuning-def";
import type { Tick } from "../tick";

/**
 * A player intent entering the simulation: one variant per intent, produced by the input
 * mapper. Every variant carries `tick`, the tick it applies to, and `timestamp`, the arrival
 * stamp the driver writes at submit time. The ordering rule sorts by `timestamp`; it is an
 * ordering key, never a duration, and nothing inside the simulation does arithmetic on it.
 *
 * No variant carries a modifier. A shift-modified click produces nothing at the mapper, so
 * there is no queue variant and no waypoint list: one order at a time, replaced whole.
 */
export type Command =
  | NoopCommand
  | MoveCommand
  | StopCommand
  | AttackMoveCommand
  | AttackTargetCommand
  | SlotCommand
  | CastCommand;

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
 * caster faces toward.
 */
export type CastTarget =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "point"; position: Readonly<Vec2> }>
  | Readonly<{ kind: "unit"; unitId: EntityId }>
  | Readonly<{ kind: "direction"; position: Readonly<Vec2> }>;

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
 * A developer-panel intent. It lands in the same buffer and the same input log as a player
 * command, so a session with the panel open replays exactly.
 */
export type DebugCommand = DebugNoopCommand;

/** The debug twin of `noop`: proves the panel's path through the buffer and the log. */
export type DebugNoopCommand = Readonly<{
  kind: "debug_noop";
  tick: Tick;
  timestamp: number;
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
