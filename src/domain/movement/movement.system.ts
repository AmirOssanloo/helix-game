import type { Vec2 } from "@shared/public";
import { assert, bearing, distanceSquared, length, sub } from "@shared/public";
import { readTunable } from "../definitions/tuning-state";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { arrive, beginMoving } from "../orders/state-machine";
import { isPathComplete, nextWaypoint, passWaypoint } from "./path";
import { movementSpeed } from "./speed-stack";
import { isInsideCone, turnToward } from "./turn";

/** Scratch for the vector from a unit to its waypoint, reused for every unit every tick. */
const toWaypoint: Vec2 = { x: 0, y: 0 };

/** Whether the unit is turning toward or walking along a path. */
const isUnderway = (unit: Readonly<Unit>): boolean =>
  unit.state === "turning" || unit.state === "moving";

/** Whether the unit's order names a point to walk to. An attack on a target is the attack rule's to move, and it does not exist yet. */
const hasDestination = (unit: Readonly<Unit>): boolean =>
  unit.order.kind === "move" || unit.order.kind === "attack_move";

/**
 * Lands the unit on the waypoint it reached and steps past it. Passing the last one ends the
 * order when it is the destination; when the path was cut short of the destination, the unit
 * asks for the rest of it from where it stands.
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

  if (distanceSquared(unit.curr, unit.order.destination) <= epsilon * epsilon) {
    const result = arrive(unit);

    assert(result === "ok", "A unit underway on a path arrives at its end");

    return;
  }

  unit.needsPath = true;
};

/**
 * Turns and moves every unit that is underway along the path the pathing system wrote. Each
 * tick, for each such unit: stand still while the path is empty, which is a unit waiting its
 * turn for a path; turn toward the next waypoint along the shortest arc, ramping up over the
 * first ticks of a turn and landing exactly; and only when the bearing is inside the action
 * cone, translate by the lesser of this tick's speed and the distance left, so a unit never
 * overshoots. Speed is the stack over the unit's modifiers, recomputed every tick. The
 * tunables are read in units per tick and radians per tick, converted once when they entered
 * the world.
 *
 * The system also keeps the spatial hash true to where units stand: it rebuilds the hash when
 * the cell size tunable has changed, and after translating it moves every live unit to the
 * cell its position is in, which is a no-op for a unit that stayed in its cell.
 */
export const movementSystem = (world: World): void => {
  const tuning = world.run.tuning;
  const turnStep = readTunable(tuning, "turn_rate_T");
  const rampTicks = readTunable(tuning, "turn_ramp_ticks");
  const cone = readTunable(tuning, "action_cone_deg");
  const baseSpeed = readTunable(tuning, "base_ms");
  const minSpeed = readTunable(tuning, "ms_min");
  const maxSpeed = readTunable(tuning, "ms_max");
  const epsilon = readTunable(tuning, "arrival_epsilon");
  const cellSize = readTunable(tuning, "hash_cell_size");
  const units = world.map.units;
  const hash = world.map.spatialHash;

  if (hash.cellSize !== cellSize) {
    hash.rebuild(cellSize, units);
  }

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit === null || !isUnderway(unit) || !hasDestination(unit)) {
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
      turnStep,
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

    const speed = movementSpeed(baseSpeed, unit.modifiers, minSpeed, maxSpeed);
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
      hash.move(id, unit.curr.x, unit.curr.y);
    }
  }
};
