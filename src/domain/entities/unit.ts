import type { EntityId, Vec2 } from "@shared/public";
import { assert } from "@shared/public";
import type { AiRecord } from "../ai/ai-state";
import { clearAiRecord, createAiRecord } from "../ai/ai-state";
import type { TargetingKind } from "../definitions/ability-def";
import type { EnemyTier } from "../definitions/enemy-def";
import type { Attributes, Stats } from "../definitions/form-def";
import { ORB_IDS } from "../definitions/orb-id";
import { readTunable } from "../definitions/tuning-state";
import type { DisableFlags } from "../orders/disable-flags";
import { clearDisableFlags, createDisableFlags } from "../orders/disable-flags";
import type { Order, OrderState } from "../orders/order";
import type { Progression } from "../stats/levels";
import type { Tick } from "../tick";
import { Pool } from "./pool";
import type { World } from "./world-state";

/** Hero, enemies, and summons together. */
export const UNIT_CAPACITY = 512;

/**
 * The most enemies spawned from an archetype that may be live at once: the budget every
 * performance number is measured at, not a designer number, so it is no tuning key. A spawn
 * that would pass it is refused, and every spawn of an archetype goes through the one door
 * that counts. The plain bodies the stress test spawns wear no definition, run no rule, and
 * are bounded by the pool alone.
 */
export const ENEMY_LIVE_CAP = 200;

/** The slots kept free beside the enemy cap for what the hero summons. */
export const SUMMON_ALLOWANCE = 32;

assert(
  ENEMY_LIVE_CAP + 1 + SUMMON_ALLOWANCE <= UNIT_CAPACITY,
  "The enemy cap, the hero, and the summon allowance fit inside the unit pool",
);

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
  sourceId: EntityId | null;
  orbLevels: number[];
  damageTakenReadyAtTick: Tick;
  damageDealtReadyAtTick: Tick;
};

/**
 * A derived value a modifier source changes. Attack damage is no derived value the stats
 * system writes: the attack rule reads its rows over the attacker's definition at the moment
 * of a shot, so an Ember instance out now is in this shot. Cooldown reduction is none either:
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

/** Every stat a modifier row may name, for content validation to check a definition against. */
export const STATS: readonly Stat[] = [
  "movement_speed",
  "attack_damage",
  "cooldown_reduction",
  "max_health",
  "health_regen",
  "max_mana",
  "mana_regen",
  "armour",
  "attack_speed",
  "magic_resistance",
];

/** What wrote a modifier row: a status, a held orb instance, the ability that summoned the unit, or later an item. A source removes every row of its kind. */
export type ModifierKind = "status" | "orb" | "summon" | "item";

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
 * the ability's targeting kind, the point or the unit it is aimed at, and, for a vector, the
 * line the ability lies along. A `null` ability is no cast. The order carries the approach
 * toward the target; this record carries the aim, so it survives the order being cleared
 * when the cast point begins, and it is gone at commit.
 */
export type CastState = {
  abilityId: string | null;
  targetKind: TargetingKind;
  position: Vec2;
  targetId: EntityId | null;
  /** The bearing of a vector's drag, in radians; `null` for a vector with no drag and for every other kind. */
  direction: number | null;
};

/**
 * The push a displacement has a unit in: how far it moves each tick, and how many ticks of it
 * are left. No ticks left is no push. The movement step translates by `step` while ticks
 * remain and collision decides where that leaves the unit, which is why a push into a wall
 * stops at the wall; the `knockback` status the displacement applies beside it raises the
 * displaced flag, which is what stops the unit walking itself meanwhile.
 */
export type Push = {
  step: Vec2;
  ticksLeft: number;
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
  /** The push carrying the unit, if one is; no ticks left is none. */
  push: Push;
  /**
   * The order a lift took away, given back on the tick the lift ends. `none` is nothing
   * suspended, which is what a unit that was never lifted holds.
   */
  suspended: Order;
  /** The cast under way, from its request to its commit. */
  cast: CastState;
  /** The tick the stage under way ends: a cast point, a backswing, a channel, or the death before a respawn. Read in those states only. */
  stageEndsAtTick: Tick;
  /**
   * The point an attack-move was walking to before it acquired something, given back when
   * the target is gone so the walk carries on from where the unit then stands rather than
   * from where it left the line. Read only while an attack-move holds a target.
   */
  attackMovePoint: Vec2;
  /**
   * The earliest tick a shot of this unit's may land. An attack point begins early enough to
   * land on it, so two shots are one attack time apart however long the point is; a tick in
   * the past is a unit that may shoot as soon as it faces something.
   */
  attackReadyAtTick: Tick;
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
  /** Whether damage leaves the unit at one health instead of zero: the training dummy's rule, written from its definition at spawn. */
  indestructible: boolean;
  /** Ability id to the tick the ability is ready again, evicted spells included. Allocated once per slot, emptied on release and on respawn. */
  cooldowns: Map<string, Tick>;
  /** The status table: every lasting condition on the unit, an empty row being a `null` definition id. Cleared by death. */
  statuses: readonly StatusEntry[];
  activeFormIndex: number;
  /** The pack it was spawned in, whose members aggro together; `null` for a unit spawned alone. */
  packId: number | null;
  /** Where it was spawned: what it leashes from and walks back to. */
  spawnPoint: Vec2;
  /** Where the shared enemy state machine has it. Read only for a unit whose behaviour runs the machine. */
  ai: AiRecord;
  /** The tier it was spawned at. The view draws an elite's and a boss's outline from it; nothing multiplies by it yet. */
  tier: EnemyTier;
  ownerId: EntityId | null;
  /** The tick a summon expires on; `null` for a unit that lives until it dies. */
  expiresAtTick: Tick | null;
};

const createStatusEntry = (): StatusEntry => ({
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

/** Forgets the push. The step keeps its last values; the ticks left say whether one is carrying the unit. */
export const clearPush = (push: Push): void => {
  push.step.x = 0;
  push.step.y = 0;
  push.ticksLeft = 0;
};

/** Forgets the order a lift took away, so nothing is given back when the lift ends. */
export const clearSuspendedOrder = (order: Order): void => {
  order.kind = "none";
  order.destination.x = 0;
  order.destination.y = 0;
  order.targetId = null;
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
    push: { step: { x: 0, y: 0 }, ticksLeft: 0 },
    suspended: { kind: "none", destination: { x: 0, y: 0 }, targetId: null },
    cast: {
      abilityId: null,
      targetKind: "none",
      position: { x: 0, y: 0 },
      targetId: null,
      direction: null,
    },
    stageEndsAtTick: 0,
    attackMovePoint: { x: 0, y: 0 },
    attackReadyAtTick: 0,
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
    disables: createDisableFlags(),
    resources: { health: 0, mana: 0 },
    indestructible: false,
    cooldowns: new Map(),
    statuses,
    activeFormIndex: 0,
    packId: null,
    spawnPoint: { x: 0, y: 0 },
    ai: createAiRecord(),
    tier: "normal",
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
  clearPush(unit.push);
  clearSuspendedOrder(unit.suspended);
  unit.cast.abilityId = null;
  unit.cast.targetKind = "none";
  unit.cast.position.x = 0;
  unit.cast.position.y = 0;
  unit.cast.targetId = null;
  unit.cast.direction = null;
  unit.stageEndsAtTick = 0;
  unit.attackMovePoint.x = 0;
  unit.attackMovePoint.y = 0;
  unit.attackReadyAtTick = 0;

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
  clearDisableFlags(unit.disables);
  unit.resources.health = 0;
  unit.resources.mana = 0;
  unit.indestructible = false;
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
  clearAiRecord(unit.ai);
  unit.tier = "normal";
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

/**
 * Enemies spawned from an archetype that hold a slot, corpses included, since a corpse holds
 * its slot until it is released: what the live cap is counted against, by a pack and by a
 * cast that spawns enemies alike.
 */
export const countLiveEnemies = (world: World): number => {
  const units = world.map.units;
  let count = 0;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.kind === "enemy" && unit.definitionId !== null) {
      count += 1;
    }
  }

  return count;
};

/** The one way a unit leaves the world: out of the spatial hash, then back to the pool. A stale id changes nothing. */
export const releaseUnit = (world: World, id: EntityId): void => {
  world.map.spatialHash.remove(id);
  world.map.units.release(id);
};
