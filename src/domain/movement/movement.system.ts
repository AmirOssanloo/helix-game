import type { Vec2 } from "@shared/public";
import { assert, bearing, distanceSquared, length, sub } from "@shared/public";
import { readTunable } from "../definitions/tuning-state";
import type { PoolView } from "../entities/pool";
import type { Unit } from "../entities/unit";
import { clearPush } from "../entities/unit";
import type { World } from "../entities/world-state";
import { arrive, beginMoving } from "../orders/state-machine";
import { isPathComplete, nextWaypoint, passWaypoint } from "./path";
import { movementSpeed } from "./speed-stack";
import { isInsideCone, turnToward } from "./turn";
import { baseSpeedOf, turnRateOf } from "./unit-rates";

/** Scratch for the vector from a unit to its waypoint, reused for every unit every tick. */
const toWaypoint: Vec2 = { x: 0, y: 0 };

/** Whether the unit is turning toward or walking along a path. */
const isUnderway = (unit: Readonly<Unit>): boolean =>
  unit.state === "turning" || unit.state === "moving";

/** Whether the unit's order names a point to walk to: a move, an attack-move, or the approach of a cast or an attack on a target. */
const hasDestination = (unit: Readonly<Unit>): boolean =>
  unit.order.kind === "move" ||
  unit.order.kind === "attack_move" ||
  unit.order.kind === "attack_target" ||
  unit.order.kind === "cast";

/**
 * Whether reaching the destination is the end of the order. A move and an attack-move that
 * has acquired nothing arrive there; a cast's approach and an attack's do not, since the
 * point they walk to is a place to act from and the rule that wrote it decides what standing
 * there means.
 */
const endsAtDestination = (unit: Readonly<Unit>): boolean =>
  unit.order.kind === "move" ||
  (unit.order.kind === "attack_move" && unit.order.targetId === null);

/**
 * Lands the unit on the waypoint it reached and steps past it. Passing the last one ends a
 * move when it is the destination; when the path was cut short of the destination, the unit
 * asks for the rest of it from where it stands. An approach ends nothing here: the rule that
 * asked for it decides what standing at the end of it means.
 */
const reachWaypoint = (
  unit: Unit,
  waypoint: Readonly<Vec2>,
  epsilon: number,
): void => {
  unit.curr.x = waypoint.x;
  unit.curr.y = waypoint.y;
  passWaypoint(unit.path);

  if (!isPathComplete(unit.path)) {
    return;
  }

  if (distanceSquared(unit.curr, unit.order.destination) > epsilon * epsilon) {
    unit.needsPath = true;

    return;
  }

  if (!endsAtDestination(unit)) {
    return;
  }

  const result = arrive(unit);

  assert(result === "ok", "A unit underway on a path arrives at its end");
};

/**
 * Moves every unit a push has hold of by this tick's step of it and counts the tick off. A
 * unit whose ticks run out is let go where the step and the collision pass after it left it.
 * A push does not survive death: a corpse is not carried. A unit in the air is not carried
 * either, since a lift moves nothing: its ticks count off where it hangs, so a push it took in
 * the tick it was lifted is spent in the air and it comes down where it was lifted from.
 */
const carryPushed = (units: PoolView<Unit>): void => {
  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit === null || unit.push.ticksLeft === 0) {
      continue;
    }

    if (unit.state === "dead") {
      clearPush(unit.push);

      continue;
    }

    if (!unit.disables.lifted) {
      unit.curr.x += unit.push.step.x;
      unit.curr.y += unit.push.step.y;
    }

    unit.push.ticksLeft -= 1;

    if (unit.push.ticksLeft === 0) {
      clearPush(unit.push);
    }
  }
};

/**
 * Turns and moves every unit that is underway along the path the pathing system wrote. Each
 * tick, for each such unit: stand still while the path is empty, which is a unit waiting its
 * turn for a path; turn toward the next waypoint along the shortest arc, ramping up over the
 * first ticks of a turn and landing exactly; and only when the bearing is inside the action
 * cone, translate by the lesser of this tick's speed and the distance left, so a unit never
 * overshoots. Speed is the stack over the unit's modifiers, recomputed every tick. The base
 * speed and the turn rate are the unit's definition's, and the tuning table's for the hero and
 * for a body wearing none. Both are read in units per tick and radians per tick, converted
 * once when they entered the world.
 *
 * A unit a push is carrying neither turns nor translates itself: it keeps its order and
 * resumes walking it when the push ends. The displaced flag says so, and so does the push
 * itself, since a push that lands during a tick, from a commit, has its status's flag raised
 * only by the next tick's status pass. The push itself is the first step of the system, so
 * a displaced unit moves by the same arithmetic as a walking one and is left to the collision
 * pass the same way, which is what stops a knockback inside a wall.
 *
 * The system also keeps the spatial hash true to where units stand: it rebuilds the hash when
 * the cell size tunable has changed, and after translating it moves every live unit to the
 * cell its position is in, which is a no-op for a unit that stayed in its cell.
 */
export const movementSystem = (world: World): void => {
  const tuning = world.run.tuning;
  const tunedTurnRate = readTunable(tuning, "turn_rate_T");
  const rampTicks = readTunable(tuning, "turn_ramp_ticks");
  const cone = readTunable(tuning, "action_cone_deg");
  const tunedSpeed = readTunable(tuning, "base_ms");
  const minSpeed = readTunable(tuning, "ms_min");
  const maxSpeed = readTunable(tuning, "ms_max");
  const epsilon = readTunable(tuning, "arrival_epsilon");
  const cellSize = readTunable(tuning, "hash_cell_size");
  const units = world.map.units;
  const hash = world.map.spatialHash;

  if (hash.cellSize !== cellSize) {
    hash.rebuild(cellSize, units);
  }

  carryPushed(units);

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit === null || !isUnderway(unit) || !hasDestination(unit)) {
      continue;
    }

    if (unit.disables.displaced || unit.push.ticksLeft > 0) {
      continue;
    }

    const waypoint = nextWaypoint(unit.path);

    if (waypoint === null) {
      continue;
    }

    sub(waypoint, unit.curr, toWaypoint);

    const remaining = length(toWaypoint);

    if (remaining <= epsilon) {
      reachWaypoint(unit, waypoint, epsilon);

      continue;
    }

    const toTarget = bearing(unit.curr, waypoint);

    unit.facing = turnToward(
      unit.facing,
      toTarget,
      turnRateOf(world, unit, tunedTurnRate),
      rampTicks,
      unit.turnTicks,
    );
    unit.turnTicks = unit.facing === toTarget ? 0 : unit.turnTicks + 1;

    if (!isInsideCone(unit.facing, toTarget, cone)) {
      continue;
    }

    if (unit.state === "turning") {
      const result = beginMoving(unit);

      assert(result === "ok", "A turning unit inside the cone begins moving");
    }

    const speed = movementSpeed(
      baseSpeedOf(world, unit, tunedSpeed),
      unit.modifiers,
      minSpeed,
      maxSpeed,
    );
    const step = Math.min(speed, remaining);

    if (remaining - step <= epsilon) {
      reachWaypoint(unit, waypoint, epsilon);

      continue;
    }

    unit.curr.x += (toWaypoint.x / remaining) * step;
    unit.curr.y += (toWaypoint.y / remaining) * step;
  }

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (unit !== null && id !== null) {
      hash.move(id, unit.curr);
    }
  }
};
