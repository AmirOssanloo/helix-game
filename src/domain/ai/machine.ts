import type { EntityId, Vec2 } from "@shared/public";
import { assert, distanceSquared } from "@shared/public";
import { isReachable } from "../abilities/primitives/targets";
import { attackOf, isInAttackRange, isMelee } from "../attack/attack";
import { readTunable } from "../definitions/tuning-state";
import type { UnitRecord } from "../definitions/unit-state";
import type { Unit } from "../entities/unit";
import { UNIT_CAPACITY } from "../entities/unit";
import type { World } from "../entities/world-state";
import { createCandidateBuffer } from "../movement/spatial-hash";
import {
  clearOrder,
  issueAttackTarget,
  issueMove,
} from "../orders/state-machine";
import { resolveDestinationFor } from "../pathing/destination";
import { regenerate } from "../stats/regeneration";
import { isCasting, selectAbility } from "./ability-selection";
import type { MachineBehaviour } from "./behaviour";
import { resolveBehaviour } from "./behaviours/index";

/**
 * The turn between one wander and the next around the spawn point, and between neighbouring
 * units' first wanders: the golden angle, which never repeats a bearing and spreads any run
 * of them evenly round the circle. A property of the circle, not a number design tunes.
 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** What the machine reads from the tuning table, filled once per tick. */
type MachineTuning = {
  wanderRadius: number;
  wanderTicks: number;
  repathTicks: number;
  holdMargin: number;
  epsilon: number;
};

/** The machine's tunables, read once per tick. */
const tuning: MachineTuning = {
  wanderRadius: 0,
  wanderTicks: 0,
  repathTicks: 0,
  holdMargin: 0,
  epsilon: 0,
};

/** Scratch for the point a behaviour wants to stand at, reused for every unit. */
const standing: Vec2 = { x: 0, y: 0 };

/** Scratch for the legal point an order walks to, reused for every unit. */
const destination: Vec2 = { x: 0, y: 0 };

/** The ids the hash proposes around a spawn point. One unit asks at a time, so one buffer serves every tick. */
const candidates: EntityId[] = createCandidateBuffer(UNIT_CAPACITY);

/** Reads the machine's tunables for this tick. The AI pass calls it once, before the first unit. */
export const readMachineTuning = (world: World): void => {
  const table = world.run.tuning;

  tuning.wanderRadius = readTunable(table, "wander_radius");
  tuning.wanderTicks = readTunable(table, "wander_interval");
  tuning.repathTicks = readTunable(table, "chase_repath_interval");
  tuning.holdMargin = readTunable(table, "ranged_hold_margin");
  tuning.epsilon = readTunable(table, "arrival_epsilon");
};

/** The machine behaviour `unit`'s definition names, or `null` for a unit with no definition or a driver of its own. */
const machineOf = (
  world: World,
  unit: Readonly<Unit>,
): MachineBehaviour | null => {
  const definitionId = unit.definitionId;
  const record =
    definitionId === null ? undefined : world.run.units.get(definitionId);
  const behaviour =
    record === undefined ? null : resolveBehaviour(record.def.behaviour);

  return behaviour !== null && behaviour.kind === "machine" ? behaviour : null;
};

/** Whether the hero is there to be noticed: alive, something may land on it, and nothing hides it from enemy sight. */
const canSee = (hero: Readonly<Unit> | null): hero is Unit =>
  hero !== null && isReachable(hero) && !hero.disables.aggroHidden;

/**
 * Whether the hero is lost to a unit already fighting it: gone, or alive and untargetable. A
 * dead hero is not lost; what was chasing it walks on to where it will stand up again.
 */
const isLost = (hero: Readonly<Unit> | null): hero is null =>
  hero === null || (hero.state !== "dead" && hero.disables.untargetable);

/** Whether the unit stands further from its own spawn point than its leash reaches. */
const isPastLeash = (unit: Readonly<Unit>, record: UnitRecord): boolean => {
  const leash = record.def.leashRadius;

  return distanceSquared(unit.curr, unit.spawnPoint) > leash * leash;
};

/**
 * Walks to (`x`, `y`) resolved to somewhere the unit may stand. A unit already walking a move
 * there keeps its order and its turn and asks for its path again from where it stands, which
 * is how one a pack has pushed off its waypoints in a corridor finds its way on.
 */
const walkTo = (world: World, unit: Unit, x: number, y: number): void => {
  resolveDestinationFor(world, unit, x, y, destination);

  const isSameWalk =
    unit.order.kind === "move" &&
    distanceSquared(destination, unit.order.destination) <=
      tuning.epsilon * tuning.epsilon;

  if (isSameWalk) {
    unit.needsPath = true;

    return;
  }

  const result = issueMove(unit, destination.x, destination.y);

  assert(result === "ok", "A living unit takes the walk its machine asks for");
};

/** Into Return: the fight is dropped, whatever point was under way is cancelled, and the unit walks home. A projectile already fired flies on. */
const enterReturn = (world: World, unit: Unit): void => {
  unit.ai.state = "return";
  unit.ai.provoked = false;
  unit.ai.repathAtTick = world.tick + tuning.repathTicks;
  walkTo(world, unit, unit.spawnPoint.x, unit.spawnPoint.y);
};

/** Into Idle at home: the wander is scheduled afresh from here, and anything that hit it on the way home is forgotten. */
const enterIdle = (unit: Unit): void => {
  unit.ai.state = "idle";
  unit.ai.provoked = false;
  unit.ai.wanderAtTick = null;
};

/** Into Attack: the unit takes the hero as its attack target, and the attack rule faces, swings, and fires exactly as it does for the hero's own attack. */
const enterAttack = (unit: Unit, heroId: EntityId): void => {
  unit.ai.state = "attack";

  if (unit.order.kind === "attack_target" && unit.order.targetId === heroId) {
    return;
  }

  const result = issueAttackTarget(unit, heroId);

  assert(result === "ok", "A living unit takes the hero as its target");
};

/**
 * One tick of Chase: a lost hero, a hidden one, or a leash passed sends the unit home; a cast
 * of its own under way is left to run; an ability the selection rule takes is cast; a hero in
 * reach turns it to Attack; otherwise, at most once a re-path interval, it walks to where its
 * behaviour wants to stand. A dead hero is chased to the point it will stand up at.
 */
const chase = (
  world: World,
  unit: Unit,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  if (isLost(hero) || heroId === null || isPastLeash(unit, record)) {
    enterReturn(world, unit);

    return;
  }

  const isDead = hero.state === "dead";

  if (!isDead && hero.disables.aggroHidden) {
    enterReturn(world, unit);

    return;
  }

  if (isCasting(unit)) {
    return;
  }

  if (!isDead && selectAbility(world, unit, record, hero, heroId)) {
    return;
  }

  const swing = attackOf(world, unit);

  if (!isDead && swing !== null && isInAttackRange(unit, hero, swing)) {
    enterAttack(unit, heroId);

    return;
  }

  if (world.tick < unit.ai.repathAtTick) {
    return;
  }

  unit.ai.repathAtTick = world.tick + tuning.repathTicks;

  if (isDead || swing === null) {
    walkTo(world, unit, hero.spawnPoint.x, hero.spawnPoint.y);

    return;
  }

  behaviour.standAt(unit, hero, swing, tuning.holdMargin, standing);
  walkTo(world, unit, standing.x, standing.y);
};

/** Into Chase, with a path asked for on this tick rather than at the next re-path. */
const enterChase = (
  world: World,
  unit: Unit,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  unit.ai.state = "chase";
  unit.ai.repathAtTick = world.tick;
  chase(world, unit, record, behaviour, hero, heroId);
};

/**
 * One tick of Attack: a lost hero or a leash passed sends the unit home, cancelling the point
 * under way; a dead hero turns it back to Chase. A hidden hero sends it home too, unless it is
 * adjacent, a melee attacker in reach, which swings on; an archer firing from range drops the
 * hero with the rest, and an arrow already in the air lands. A cast of its own under way is
 * left to run, and an ability the selection rule takes on a hero it can see is cast. In reach
 * it keeps the hero as its attack target; out of reach it keeps an attack point it has begun,
 * and chases otherwise.
 */
const fight = (
  world: World,
  unit: Unit,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  if (isLost(hero) || heroId === null || isPastLeash(unit, record)) {
    enterReturn(world, unit);

    return;
  }

  if (hero.state === "dead") {
    enterChase(world, unit, record, behaviour, hero, heroId);

    return;
  }

  const swing = attackOf(world, unit);
  const isInReach = swing !== null && isInAttackRange(unit, hero, swing);
  const isAdjacent = isInReach && swing !== null && isMelee(swing);

  if (hero.disables.aggroHidden && !isAdjacent) {
    enterReturn(world, unit);

    return;
  }

  if (isCasting(unit)) {
    return;
  }

  if (
    !hero.disables.aggroHidden &&
    selectAbility(world, unit, record, hero, heroId)
  ) {
    return;
  }

  if (isInReach) {
    enterAttack(unit, heroId);

    return;
  }

  if (unit.state === "attack_windup") {
    return;
  }

  enterChase(world, unit, record, behaviour, hero, heroId);
};

/**
 * Every idle member of the unit's pack that fights goes through Aggro into Chase on this
 * tick, whichever slot each holds, so a pack partly inside the aggro radius comes whole.
 */
const alertPack = (
  world: World,
  unit: Readonly<Unit>,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  const packId = unit.packId;
  const units = world.map.units;

  if (packId === null) {
    return;
  }

  for (let index = 0; index < units.end; index += 1) {
    const member = units.at(index);

    if (
      member === null ||
      member === unit ||
      member.packId !== packId ||
      member.ai.state !== "idle" ||
      member.state === "dead"
    ) {
      continue;
    }

    const definitionId = member.definitionId;
    const record =
      definitionId === null ? undefined : world.run.units.get(definitionId);
    const behaviour = machineOf(world, member);

    if (record === undefined || behaviour === null || !behaviour.engages) {
      continue;
    }

    member.ai.state = "aggro";
    member.ai.provoked = false;
    enterChase(world, member, record, behaviour, hero, heroId);
  }
};

/**
 * The next wander: the first after an arrival home is only scheduled, a slot's index later
 * than the interval so a pack does not step off together; each after it walks the wander
 * radius from the spawn point at a bearing a golden angle on from the last.
 */
const wander = (world: World, unit: Unit, index: number): void => {
  const ai = unit.ai;

  if (ai.wanderAtTick === null) {
    const stagger = tuning.wanderTicks > 0 ? index % tuning.wanderTicks : 0;

    ai.wanderAtTick = world.tick + tuning.wanderTicks + stagger;

    return;
  }

  if (world.tick < ai.wanderAtTick) {
    return;
  }

  ai.wanderAtTick = world.tick + tuning.wanderTicks;

  if (tuning.wanderRadius <= 0 || unit.disables.rooted) {
    return;
  }

  const bearing = (index + ai.wanders) * GOLDEN_ANGLE;

  ai.wanders += 1;
  walkTo(
    world,
    unit,
    unit.spawnPoint.x + Math.cos(bearing) * tuning.wanderRadius,
    unit.spawnPoint.y + Math.sin(bearing) * tuning.wanderRadius,
  );
};

/**
 * One tick of Idle: a hero the unit can see, inside its aggro radius or having hit it, sends
 * it and its pack through Aggro into Chase; otherwise it wanders. A behaviour that never
 * engages stands, and forgets what hit it.
 */
const rest = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  const provoked = unit.ai.provoked;

  unit.ai.provoked = false;

  if (!behaviour.engages) {
    return;
  }

  const aggro = record.def.aggroRadius;
  const notices =
    canSee(hero) &&
    (provoked || distanceSquared(unit.curr, hero.curr) <= aggro * aggro);

  if (!notices) {
    if (behaviour.wanders) {
      wander(world, unit, index);
    }

    return;
  }

  unit.ai.state = "aggro";
  alertPack(world, unit, hero, heroId);
  enterChase(world, unit, record, behaviour, hero, heroId);
};

/**
 * Whether the unit has come as close to its spawn point as another unit standing on it lets
 * it: some other unit's disc covers the point, and the returning unit is touching that unit.
 */
const isBlockedAtHome = (world: World, unit: Readonly<Unit>): boolean => {
  const radii = world.map.walkability.classRadii;
  const largest = radii[radii.length - 1] ?? unit.collisionRadius;
  const reach = unit.collisionRadius + largest + tuning.epsilon;

  const near = reach + reach;

  if (distanceSquared(unit.curr, unit.spawnPoint) > near * near) {
    return false;
  }

  const found = world.map.spatialHash.queryCircle(
    unit.spawnPoint,
    reach,
    candidates,
  );

  for (let slot = 0; slot < found; slot += 1) {
    const id = candidates[slot];
    const other = id === undefined ? null : world.map.units.resolve(id);

    if (other === null || other === unit || other.state === "dead") {
      continue;
    }

    const covering = other.collisionRadius + unit.collisionRadius;
    const touching = covering + tuning.epsilon;

    if (
      distanceSquared(other.curr, unit.spawnPoint) < covering * covering &&
      distanceSquared(other.curr, unit.curr) <= touching * touching
    ) {
      return true;
    }
  }

  return false;
};

/**
 * One tick of Return: the unit regenerates at its definition's rates and walks home ignoring
 * the hero and whatever hits it. It idles on arriving, or where it stands when another unit
 * holds its spawn point and it has reached that unit. Every re-path interval it asks for its
 * path home again from where it stands, as a chase does, so a pack pushed off its waypoints at
 * a corridor's mouth finds its way in, and a walk a stun or a root took away is given back.
 */
const goHome = (world: World, unit: Unit): void => {
  unit.ai.provoked = false;
  regenerate(unit.resources, unit.stats);

  if (unit.order.kind === "move" && isBlockedAtHome(world, unit)) {
    const result = clearOrder(unit);

    assert(result === "ok", "A living unit stops beside its spawn point");
    enterIdle(unit);

    return;
  }

  const home = unit.collisionRadius;

  if (
    unit.order.kind !== "move" &&
    distanceSquared(unit.curr, unit.spawnPoint) <= home * home
  ) {
    enterIdle(unit);

    return;
  }

  if (world.tick >= unit.ai.repathAtTick) {
    unit.ai.repathAtTick = world.tick + tuning.repathTicks;
    walkTo(world, unit, unit.spawnPoint.x, unit.spawnPoint.y);
  }
};

/**
 * One tick of the shared state machine for one unit its behaviour drives, `index` being its
 * slot. Aggro is passed through on the tick it is entered, and Dead is the death system's to
 * enter, so a tick finds the unit in one of the other four. The orders it issues are carried
 * out by the systems after it exactly as the player's are.
 */
export const runMachine = (
  world: World,
  unit: Unit,
  index: number,
  record: UnitRecord,
  behaviour: MachineBehaviour,
  hero: Unit | null,
  heroId: EntityId | null,
): void => {
  switch (unit.ai.state) {
    case "idle":
      rest(world, unit, index, record, behaviour, hero, heroId);

      return;

    case "aggro":
    case "chase":
      unit.ai.provoked = false;
      chase(world, unit, record, behaviour, hero, heroId);

      return;

    case "attack":
      unit.ai.provoked = false;
      fight(world, unit, record, behaviour, hero, heroId);

      return;

    case "return":
      goHome(world, unit);

      return;

    case "dead":
      return;
  }
};
