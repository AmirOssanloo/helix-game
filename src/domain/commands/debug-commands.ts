import type { Vec2 } from "@shared/public";
import type { DamageType } from "../combat/damage";
import type { EnemyTier } from "../definitions/enemy-def";
import type { Tick } from "../tick";
import type { AnyCommand } from "./command";

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
  | SpawnPackCommand
  | KillAllCommand
  | ClearAllCommand
  | ResetMapCommand
  | LoadMapCommand
  | SetMapLevelCommand
  | JumpToCheckpointCommand
  | BeginChannelCommand
  | ApplyStatusCommand
  | SpawnZoneCommand
  | GrantItemCommand
  | GrantGoldCommand;

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
 * Puts a pack of `count` units of the archetype `archetypeId` names into the world around
 * `position`, at `tier`: each wears that definition's body, numbers, and behaviour, all share
 * one new pack id, and each stands on its own free cell, which is its spawn point. A position
 * on an obstacle or off the map resolves to the nearest legal point, and the pack fills the
 * free cells nearest it. Refused, with nothing spawned, when no archetype has the id, when the
 * pack would take the live enemies past the cap, when the pool has no room, and when the map
 * has too few free cells.
 */
export type SpawnPackCommand = Readonly<{
  kind: "spawn_pack";
  tick: Tick;
  timestamp: number;
  archetypeId: string;
  tier: EnemyTier;
  count: number;
  position: Readonly<Vec2>;
}>;

/** Empties the health of every enemy that can die, so the death system takes each at the end of the tick as it takes any other death, experience and all. The training dummy never dies and is left standing. */
export type KillAllCommand = Readonly<{
  kind: "kill_all";
  tick: Tick;
  timestamp: number;
}>;

/** Releases every unit but the hero, with no deaths and no experience. */
export type ClearAllCommand = Readonly<{
  kind: "clear_all";
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
 * Loads the map the content registers as `mapId` in place of the loaded one: map scope is
 * emptied and rebuilt on the new map, its live packs placed and its dormant ones asleep, and
 * the hero stands at its spawn point with its order cleared. Run scope is untouched, so the
 * hero keeps its level, experience, orbs, slots, cooldowns, and statuses. A dead hero is
 * carried dead and stands up at the new spawn point when its delay runs out. Refused when no
 * map has the id.
 */
export type LoadMapCommand = Readonly<{
  kind: "load_map";
  tick: Tick;
  timestamp: number;
  mapId: string;
}>;

/**
 * Sets the loaded map's level to `level`, a whole number of one or more, until the next map
 * load reads its definition's level again; a map reset keeps it. The level drives only loot,
 * so this changes nothing a unit does. Refused when the level is not a whole number of one or
 * more.
 */
export type SetMapLevelCommand = Readonly<{
  kind: "set_map_level";
  tick: Tick;
  timestamp: number;
  level: number;
}>;

/**
 * Stands the hero at checkpoint `checkpoint` of the loaded map, counted from zero in the order
 * the map lists them, with its order cleared and its previous position written so nothing
 * interpolates the carry. It reaches nothing itself: the checkpoint rule reads where it stands
 * later in the same tick, so a checkpoint further along than the furthest becomes the furthest
 * and an earlier one changes nothing. Refused when the map has no checkpoint at the index and
 * while the hero is dead.
 */
export type JumpToCheckpointCommand = Readonly<{
  kind: "jump_to_checkpoint";
  tick: Tick;
  timestamp: number;
  checkpoint: number;
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
 * Puts an item into the inventory at the first place it fits: `itemId` names a base or a
 * Legendary piece, `rarity` the rarity it comes as, Legendary for a piece and any other for a
 * base, and `itemLevel` its level, a whole number of one or more. A base's lines are rolled as
 * a drop's are, keyed on the command's position among the tick's consumed commands; a piece's
 * are its fixed values. It acts on run scope, so it acts whether the hero is alive, dead, or
 * absent. Refused when no base or piece has the id, the rarity does not suit it, or the item
 * fits nowhere.
 */
export type GrantItemCommand = Readonly<{
  kind: "grant_item";
  tick: Tick;
  timestamp: number;
  itemId: string;
  rarity: string;
  itemLevel: number;
}>;

/** Adds `amount` gold, a whole number of one or more, to the run's gold, whether the hero is alive, dead, or absent. */
export type GrantGoldCommand = Readonly<{
  kind: "grant_gold";
  tick: Tick;
  timestamp: number;
  amount: number;
}>;

/**
 * The kinds of the debug union, so the command system can tell a panel intent from a player's
 * without a field for it. A record over the union's kinds, not a set, so a debug command added
 * to the union and not here fails the typecheck.
 */
export const DEBUG_COMMAND_KINDS: Readonly<Record<DebugCommand["kind"], true>> =
  {
    debug_noop: true,
    apply_damage: true,
    drain_mana: true,
    heal: true,
    restore_mana: true,
    level_up: true,
    set_orb_levels: true,
    toggle_infinite_mana: true,
    toggle_no_cooldowns: true,
    kill_hero: true,
    spawn_units: true,
    spawn_pack: true,
    kill_all: true,
    clear_all: true,
    reset_map: true,
    load_map: true,
    set_map_level: true,
    jump_to_checkpoint: true,
    begin_channel: true,
    apply_status: true,
    spawn_zone: true,
    grant_item: true,
    grant_gold: true,
  };

/** Whether `command` is a developer-panel intent. */
export const isDebugCommand = (command: AnyCommand): command is DebugCommand =>
  Object.hasOwn(DEBUG_COMMAND_KINDS, command.kind);
