import type { EntityId, Vec2 } from "@shared/public";
import { assert, bearing, distanceSquared } from "@shared/public";
import { isReachable } from "../abilities/primitives/targets";
import type { DamageType } from "../combat/damage";
import { applyDamage } from "../combat/damage";
import type { AttackRecord } from "../definitions/attack-state";
import { attackTicks } from "../definitions/attack-state";
import { readTunable } from "../definitions/tuning-state";
import { acquireProjectile } from "../entities/projectile";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { isInsideCone, turnToward } from "../movement/turn";
import { turnRateOf } from "../movement/unit-rates";
import {
  beginAttackBackswing,
  beginAttackWindup,
  beginFacing,
  cancelAttackWindup,
  clearOrder,
  disengageTarget,
  engageTarget,
  finishBackswing,
} from "../orders/state-machine";
import { resolveDestinationFor } from "../pathing/destination";
import { nearestEnemy } from "./acquire";
import {
  attackDamageOf,
  attackOf,
  isInAttackRange,
  isMelee,
  isReadyToSwing,
} from "./attack";

/** What every attack lands as, melee or ranged. */
const ATTACK_DAMAGE_TYPE: DamageType = "physical";

/** What the turn-and-face stage reads from the tuning table, filled once per tick. */
type FacingTuning = {
  /** The tuning table's turn rate, which the hero and a body wearing no definition turn at. */
  tunedTurnRate: number;
  rampTicks: number;
  cone: number;
};

/** The facing tunables, read once per tick. */
const facing: FacingTuning = { tunedTurnRate: 0, rampTicks: 0, cone: 0 };

/** Scratch for the legal point an approach walks to, reused for every unit. */
const approachPoint: Vec2 = { x: 0, y: 0 };

/** Whether the unit is carrying out an attack order of either kind. */
const isAttacking = (unit: Readonly<Unit>): boolean =>
  unit.state !== "dead" &&
  (unit.order.kind === "attack_target" || unit.order.kind === "attack_move");

/** Whether the unit is walking or turning under its order, which is where an approach and a face belong. */
const isUnderway = (unit: Readonly<Unit>): boolean =>
  unit.state === "turning" || unit.state === "moving";

/** The unit the order is on, when it still exists and anything may land on it. */
const targetOf = (world: World, unit: Readonly<Unit>): Unit | null => {
  const targetId = unit.order.targetId;
  const target = targetId === null ? null : world.map.units.resolve(targetId);

  return target === null || !isReachable(target) ? null : target;
};

/** The backswing stage: on its tick the swing is over and the unit is back to the order it holds, or idle. */
const endBackswingWhenDue = (world: World, unit: Unit): void => {
  if (unit.state !== "attack_backswing" || world.tick < unit.stageEndsAtTick) {
    return;
  }

  const result = finishBackswing(unit);

  assert(result === "ok", "A backswing that ran its course finishes");
};

/**
 * What an attack-move does about its target: one it had and has lost is let go, and the walk
 * is taken up from where the unit stands; with none, the nearest enemy inside the acquire
 * radius is taken. Returns the unit it is now engaging, or `null` to walk on.
 */
const acquire = (
  world: World,
  unit: Unit,
  record: AttackRecord,
): Unit | null => {
  if (unit.order.targetId !== null) {
    const result = disengageTarget(unit);

    assert(result === "ok", "An attack-move whose target is gone walks on");

    return null;
  }

  const foundId = nearestEnemy(world, unit, record.def.acquireRadius);

  if (foundId === null) {
    return null;
  }

  const result = engageTarget(unit, foundId);

  assert(result === "ok", "A walking attack-move takes what it acquired");

  return world.map.units.resolve(foundId);
};

/**
 * The approach stage, out of reach: the order's destination is the legal point nearest the
 * target, refreshed when the target has moved far enough to matter, and a path to it is
 * asked for. A unit standing at the end of its path and still out of reach holds its order
 * and waits; the target may come back into it, and nothing is spent meanwhile.
 */
const approach = (
  world: World,
  unit: Unit,
  target: Readonly<Unit>,
  epsilon: number,
): void => {
  resolveDestinationFor(
    world,
    unit,
    target.curr.x,
    target.curr.y,
    approachPoint,
  );

  const moved =
    distanceSquared(approachPoint, unit.order.destination) > epsilon * epsilon;

  if (!unit.needsPath && !moved) {
    return;
  }

  unit.order.destination.x = approachPoint.x;
  unit.order.destination.y = approachPoint.y;
  unit.needsPath = true;
};

/**
 * The face stage, in reach: the unit stands where it is and turns toward its target along
 * the shortest arc at its turn rate, with the same ramp a move uses. Returns whether the
 * bearing is inside the action cone after this tick's turn, which is when the attack point
 * may begin. A target standing on the unit's own centre has no bearing and counts as faced.
 */
const face = (world: World, unit: Unit, target: Readonly<Unit>): boolean => {
  if (unit.state === "moving" || unit.needsPath || unit.path.count > 0) {
    const result = beginFacing(unit);

    assert(result === "ok", "A unit in reach of its target stops to face it");
  }

  const toTarget =
    target.curr.x === unit.curr.x && target.curr.y === unit.curr.y
      ? unit.facing
      : bearing(unit.curr, target.curr);

  unit.facing = turnToward(
    unit.facing,
    toTarget,
    turnRateOf(world, unit, facing.tunedTurnRate),
    facing.rampTicks,
    unit.turnTicks,
  );
  unit.turnTicks = unit.facing === toTarget ? 0 : unit.turnTicks + 1;

  return isInsideCone(unit.facing, toTarget, facing.cone);
};

/**
 * A ranged shot: a homing projectile from where the unit stands, carrying the attack damage
 * read at this moment. A projectile pool with no room fires nothing: a shot that did not
 * spawn is a miss the pool counts, not a refusal the attacker hears about.
 */
const loose = (
  world: World,
  unit: Readonly<Unit>,
  attackerId: EntityId,
  targetId: EntityId,
  record: AttackRecord,
): void => {
  const id = acquireProjectile(world, unit.curr.x, unit.curr.y, unit.facing);
  const shot = id === null ? null : world.map.projectiles.resolve(id);

  if (shot === null) {
    return;
  }

  shot.casterId = attackerId;
  shot.targetId = targetId;
  shot.speed = record.projectileSpeed;
  shot.radius = record.def.projectileRadius;
  shot.attackDamage = attackDamageOf(unit, record);
  shot.frame = record.def.atlasFrame;
  shot.tint = record.def.tint;
};

/**
 * The shot, on the tick the attack point ends, and then the backswing and the clock for the
 * next shot, whether or not anything landed. A melee attack lands its damage on the target
 * there and then, through the damage door as physical, and spawns nothing; any other looses a
 * projectile that lands it later.
 */
const fire = (
  world: World,
  unit: Unit,
  attackerId: EntityId,
  record: AttackRecord,
): void => {
  const targetId = unit.order.targetId;

  assert(targetId !== null, "A unit that swung has something to swing at");

  if (isMelee(record)) {
    applyDamage(
      world,
      targetId,
      attackDamageOf(unit, record),
      ATTACK_DAMAGE_TYPE,
      attackerId,
    );
  } else {
    loose(world, unit, attackerId, targetId, record);
  }

  const result = beginAttackBackswing(unit);

  assert(result === "ok", "An attack point that ended begins its backswing");
  unit.stageEndsAtTick = world.tick + record.backswingTicks;
  unit.attackReadyAtTick =
    world.tick + attackTicks(record, unit.stats.attackSpeed);
};

/** A disarm ends the attack point it landed in with nothing fired and no clock started; the order is kept, so the unit swings again the moment it may. */
const holdFire = (unit: Unit): void => {
  if (unit.state !== "attack_windup") {
    return;
  }

  const result = cancelAttackWindup(unit);

  assert(result === "ok", "A disarm ends the attack point it landed in");
};

/** Ends the order where it stands: what an attack on a target that is gone comes to. */
const cancel = (unit: Unit): void => {
  const result = clearOrder(unit);

  assert(result === "ok", "An attack on nothing leaves the unit idle");
};

/** One unit's attack order, one tick of it. */
const runOrder = (
  world: World,
  unit: Unit,
  attackerId: EntityId,
  record: AttackRecord,
  epsilon: number,
): void => {
  const isMove = unit.order.kind === "attack_move";
  const held = targetOf(world, unit);
  const target = held === null && isMove ? acquire(world, unit, record) : held;

  if (target === null) {
    if (!isMove) {
      cancel(unit);
    }

    return;
  }

  if (unit.disables.disarmed) {
    holdFire(unit);

    return;
  }

  if (unit.state === "attack_windup") {
    if (world.tick >= unit.stageEndsAtTick) {
      fire(world, unit, attackerId, record);
    }

    return;
  }

  if (!isUnderway(unit)) {
    return;
  }

  if (!isInAttackRange(unit, target, record)) {
    approach(world, unit, target, epsilon);

    return;
  }

  if (!face(world, unit, target) || !isReadyToSwing(world, unit, record)) {
    return;
  }

  const result = beginAttackWindup(unit);

  assert(result === "ok", "A unit facing its target begins its attack point");
  unit.stageEndsAtTick = world.tick + record.pointTicks;

  if (world.tick >= unit.stageEndsAtTick) {
    fire(world, unit, attackerId, record);
  }
};

/**
 * Runs the stages of every attack under way, one unit at a time: the walk while the target
 * is out of reach, the turn to face once it is in reach, the attack point once the bearing
 * is inside the action cone and the clock allows it, the shot on the tick the point ends,
 * and the backswing until its tick. An attack-move with nothing acquired walks on and looks
 * again each tick; one whose target is gone takes its walk up from where it stands, which is
 * what keeps it from backtracking. An attack on a target that dies or becomes untargetable
 * drops to idle. A disarm fires nothing and ends a point in progress; a stop, a new order, or
 * a cast cancels the point and the backswing through the state machine before this runs, with
 * nothing fired and no clock started.
 *
 * It runs after the behaviours, so an attack a behaviour issued is walked and faced on the
 * tick it was issued, and before pathing, so an approach asked for here is planned this tick.
 */
export const attackSystem = (world: World): void => {
  const tuning = world.run.tuning;
  const epsilon = readTunable(tuning, "arrival_epsilon");
  const units = world.map.units;

  facing.tunedTurnRate = readTunable(tuning, "turn_rate_T");
  facing.rampTicks = readTunable(tuning, "turn_ramp_ticks");
  facing.cone = readTunable(tuning, "action_cone_deg");

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const attackerId = units.idAt(index);

    if (unit === null || attackerId === null) {
      continue;
    }

    endBackswingWhenDue(world, unit);

    if (!isAttacking(unit)) {
      continue;
    }

    const record = attackOf(world, unit);

    if (record === null) {
      cancel(unit);

      continue;
    }

    runOrder(world, unit, attackerId, record, epsilon);
  }
};
