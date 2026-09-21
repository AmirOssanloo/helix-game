import type { EntityId, Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import type { Attributes, Stats } from "../definitions/form-def";
import type { TargetingKind } from "../definitions/spell-def";
import { readTunable } from "../definitions/tuning-state";
import type { DisableFlags } from "../orders/disable-flags";
import type { Order, OrderState } from "../orders/order";
import type { Progression } from "../stats/levels";
import type { Tick } from "../tick";
import { Pool } from "./pool";
import type { World } from "./world-state";

/** Hero, enemies, and summons together. */
export const UNIT_CAPACITY = 512;

/** Statuses one unit can hold at once. An application past the table is refused by the status rule. */
export const STATUS_TABLE_SIZE = 8;

/** Modifier sources one unit can hold at once: every status, orb instance, and later item that changes a stat. */
export const MODIFIER_TABLE_SIZE = 16;

/** Waypoints one unit's path can hold. Line-of-sight smoothing makes most paths one or two segments. */
export const PATH_CAPACITY = 32;

/** Who drives the unit. Movement, collision, statuses, and death treat every kind alike. */
export type UnitKind = "hero" | "enemy" | "summon";

export type Resources = {
  health: number;
  mana: number;
};

/** One row of a unit's status table. A `null` definition id is an empty row. */
export type StatusEntry = {
  definitionId: string | null;
  endsAtTick: Tick;
  stacks: number;
  sourceId: EntityId | null;
};

/**
 * A derived value a modifier source changes. Attack damage has no attribute behind it yet; the
 * attack rule reads its rows when it arrives. Cooldown reduction is no derived value either:
 * the cooldown pipeline reads its rows when a clock starts, a flat amount in ticks and a
 * fraction of the clock, and never again for that clock.
 */
export type Stat =
  | "movement_speed"
  | "attack_damage"
  | "cooldown_reduction"
  | "max_health"
  | "health_regen"
  | "max_mana"
  | "mana_regen"
  | "armour"
  | "attack_speed"
  | "magic_resistance";

/** What wrote a modifier row: a status, a held orb instance, or later an item. A source removes every row of its kind. */
export type ModifierKind = "status" | "orb" | "item";

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

/**
 * The cast a unit has requested and not yet committed: the ability, what it is aimed at by
 * the ability's targeting kind, and the point or the unit it is aimed at. A `null` ability
 * is no cast. The order carries the approach toward the target; this record carries the
 * aim, so it survives the order being cleared when the cast point begins, and it is gone
 * at commit.
 */
export type CastState = {
  abilityId: string | null;
  targetKind: TargetingKind;
  position: Vec2;
  targetId: EntityId | null;
};

/**
 * The waypoints a unit is walking, a fixed-capacity buffer the pathing fills and the movement
 * system follows. `next` is the index of the waypoint the unit is heading for; the path is
 * complete when it reaches `count`.
 */
export type Path = {
  points: Vec2[];
  count: number;
  next: number;
};

/**
 * One unit: the hero, an enemy, or a summon. The hero's definition id is `null`; its body and
 * abilities are read through the active form record on run scope every tick.
 */
export type Unit = {
  kind: UnitKind;
  definitionId: string | null;
  prev: Vec2;
  curr: Vec2;
  facing: number;
  /** The solid disc: pathing and unit-to-unit blocking. Two units never rest closer than the sum of theirs. */
  collisionRadius: number;
  /** The range buffer: attack reach and cast range add the attacker's and the target's. */
  boundRadius: number;
  /** The click test's disc. The presentation reads it; no system does. */
  selectionRadius: number;
  /** Ticks spent in the turn under way, which the turn ramp reads. Zero once facing has reached its target. */
  turnTicks: number;
  order: Order;
  /** Which step of the order the unit is on. Written only by the order state machine. */
  state: OrderState;
  path: Path;
  /** Whether the unit is waiting for the pathing system to plan its path. It keeps following `path` while it waits. */
  needsPath: boolean;
  /** The cast under way, from its request to its commit. */
  cast: CastState;
  /** The tick the cast point or the backswing under way ends. Read in those states only. */
  stageEndsAtTick: Tick;
  modifiers: readonly ModifierEntry[];
  /** Level, experience, and unspent skill points. Continuous across a form swap. */
  progression: Progression;
  /** The attributes at the current level, written by the stats system every tick. */
  attributes: Attributes;
  /** The derived values the stats system writes every tick from the attributes and the modifier table. */
  stats: Stats;
  /** What the unit is blocked from this tick. Written by the status system, read by the validator. */
  disables: DisableFlags;
  resources: Resources;
  /** Ability id to the tick the ability is ready again. Allocated once per slot and emptied on release. */
  cooldowns: Map<string, Tick>;
  statuses: readonly StatusEntry[];
  activeFormIndex: number;
  packId: number | null;
  spawnPoint: Vec2;
  ownerId: EntityId | null;
  /** The tick a summon expires on; `null` for a unit that lives until it dies. */
  expiresAtTick: Tick | null;
};

const createStatusEntry = (): StatusEntry => ({
  definitionId: null,
  endsAtTick: 0,
  stacks: 0,
  sourceId: null,
});

const clearStatusEntry = (entry: StatusEntry): void => {
  entry.definitionId = null;
  entry.endsAtTick = 0;
  entry.stacks = 0;
  entry.sourceId = null;
};

const createModifierEntry = (): ModifierEntry => ({
  kind: null,
  stat: null,
  flat: 0,
  percent: 0,
});

const clearModifierEntry = (entry: ModifierEntry): void => {
  entry.kind = null;
  entry.stat = null;
  entry.flat = 0;
  entry.percent = 0;
};

const clearStats = (stats: Stats): void => {
  stats.maxHealth = 0;
  stats.healthRegen = 0;
  stats.maxMana = 0;
  stats.manaRegen = 0;
  stats.armour = 0;
  stats.attackSpeed = 0;
  stats.magicResistance = 0;
};

const createPath = (): Path => {
  const points: Vec2[] = [];

  for (let index = 0; index < PATH_CAPACITY; index += 1) {
    points.push({ x: 0, y: 0 });
  }

  return { points, count: 0, next: 0 };
};

/** Forgets the waypoints. The points keep their last values; `count` says which ones are live. */
export const clearPath = (path: Path): void => {
  path.count = 0;
  path.next = 0;
};

const createUnit = (): Unit => {
  const statuses: StatusEntry[] = [];
  const modifiers: ModifierEntry[] = [];

  for (let row = 0; row < STATUS_TABLE_SIZE; row += 1) {
    statuses.push(createStatusEntry());
  }

  for (let row = 0; row < MODIFIER_TABLE_SIZE; row += 1) {
    modifiers.push(createModifierEntry());
  }

  return {
    kind: "enemy",
    definitionId: null,
    prev: { x: 0, y: 0 },
    curr: { x: 0, y: 0 },
    facing: 0,
    collisionRadius: 0,
    boundRadius: 0,
    selectionRadius: 0,
    turnTicks: 0,
    order: { kind: "none", destination: { x: 0, y: 0 }, targetId: null },
    state: "idle",
    path: createPath(),
    needsPath: false,
    cast: {
      abilityId: null,
      targetKind: "none",
      position: { x: 0, y: 0 },
      targetId: null,
    },
    stageEndsAtTick: 0,
    modifiers,
    progression: { level: 1, experience: 0, skillPoints: 0 },
    attributes: { strength: 0, agility: 0, intelligence: 0 },
    stats: {
      maxHealth: 0,
      healthRegen: 0,
      maxMana: 0,
      manaRegen: 0,
      armour: 0,
      attackSpeed: 0,
      magicResistance: 0,
    },
    disables: {
      stunned: false,
      silenced: false,
      rooted: false,
      disarmed: false,
    },
    resources: { health: 0, mana: 0 },
    cooldowns: new Map(),
    statuses,
    activeFormIndex: 0,
    packId: null,
    spawnPoint: { x: 0, y: 0 },
    ownerId: null,
    expiresAtTick: null,
  };
};

/** Every field back to the value a fresh slot has. `kind` has no neutral member; the acquirer sets it. */
const clearUnit = (unit: Unit): void => {
  unit.kind = "enemy";
  unit.definitionId = null;
  unit.prev.x = 0;
  unit.prev.y = 0;
  unit.curr.x = 0;
  unit.curr.y = 0;
  unit.facing = 0;
  unit.collisionRadius = 0;
  unit.boundRadius = 0;
  unit.selectionRadius = 0;
  unit.turnTicks = 0;
  unit.order.kind = "none";
  unit.order.destination.x = 0;
  unit.order.destination.y = 0;
  unit.order.targetId = null;
  unit.state = "idle";
  clearPath(unit.path);
  unit.needsPath = false;
  unit.cast.abilityId = null;
  unit.cast.targetKind = "none";
  unit.cast.position.x = 0;
  unit.cast.position.y = 0;
  unit.cast.targetId = null;
  unit.stageEndsAtTick = 0;

  for (let row = 0; row < unit.modifiers.length; row += 1) {
    const entry = unit.modifiers[row];

    if (entry !== undefined) {
      clearModifierEntry(entry);
    }
  }

  unit.progression.level = 1;
  unit.progression.experience = 0;
  unit.progression.skillPoints = 0;
  unit.attributes.strength = 0;
  unit.attributes.agility = 0;
  unit.attributes.intelligence = 0;
  clearStats(unit.stats);
  unit.disables.stunned = false;
  unit.disables.silenced = false;
  unit.disables.rooted = false;
  unit.disables.disarmed = false;
  unit.resources.health = 0;
  unit.resources.mana = 0;
  unit.cooldowns.clear();

  for (let row = 0; row < unit.statuses.length; row += 1) {
    const entry = unit.statuses[row];

    if (entry !== undefined) {
      clearStatusEntry(entry);
    }
  }

  unit.activeFormIndex = 0;
  unit.packId = null;
  unit.spawnPoint.x = 0;
  unit.spawnPoint.y = 0;
  unit.ownerId = null;
  unit.expiresAtTick = null;
};

export const createUnitPool = (): Pool<Unit> =>
  new Pool(UNIT_CAPACITY, createUnit, clearUnit);

/**
 * The one way a unit enters the world: a slot from the pool, standing at the position with its
 * previous position and spawn point there too, wearing the hull the tuning table gives a unit
 * with no definition, indexed in the spatial hash. A spawn from a definition writes that
 * definition's radii over the hull; the hero wears its active form's body. Returns the id, or
 * `null` when the pool is full; the caller decides what a spawn that does not happen means.
 */
export const acquireUnit = (
  world: World,
  kind: UnitKind,
  x: number,
  y: number,
): EntityId | null => {
  const units = world.map.units;
  const index = units.acquireIndex();

  if (index === -1) {
    return null;
  }

  const unit = units.at(index);
  const id = units.idAt(index);

  assert(unit !== null && id !== null, "A slot just acquired is live");

  unit.kind = kind;
  unit.curr.x = x;
  unit.curr.y = y;
  unit.prev.x = x;
  unit.prev.y = y;
  unit.spawnPoint.x = x;
  unit.spawnPoint.y = y;
  unit.collisionRadius = readTunable(world.run.tuning, "collision_radius");
  unit.boundRadius = readTunable(world.run.tuning, "bound_radius");
  unit.selectionRadius = readTunable(world.run.tuning, "selection_radius");
  world.map.spatialHash.insert(id, x, y);

  return id;
};

/** The one way a unit leaves the world: out of the spatial hash, then back to the pool. A stale id changes nothing. */
export const releaseUnit = (world: World, id: EntityId): void => {
  world.map.spatialHash.remove(id);
  world.map.units.release(id);
};
