import type { Vec2 } from "@shared/public";
import { assert, bearing, length, sub } from "@shared/public";
import { readTunable } from "../definitions/tuning-state";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { arrive, beginMoving } from "../orders/state-machine";
import {
  isPathComplete,
  nextWaypoint,
  passWaypoint,
  setStraightPath,
} from "./path";
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

/** Lands the unit on the waypoint it reached and steps past it; the last one ends the order. */
const reachWaypoint = (unit: Unit, waypoint: Readonly<Vec2>): void => {
  unit.curr.x = waypoint.x;
  unit.curr.y = waypoint.y;
  passWaypoint(unit.path);

  if (isPathComplete(unit.path)) {
    const result = arrive(unit);

    assert(result === "ok", "A unit underway on a path arrives at its end");
  }
};

/**
 * Turns and moves every unit that is underway. Each tick, for each such unit: fill the path
 * if it is empty, with one segment to the destination until the pathing exists to fill it;
 * turn toward the next waypoint along the shortest arc, ramping up over the first ticks of a
 * turn and landing exactly; and only when the bearing is inside the action cone, translate by
 * the lesser of this tick's speed and the distance left, so a unit never overshoots. Speed is
 * the stack over the unit's modifiers, recomputed every tick. The tunables are read in units
 * per tick and radians per tick, converted once when they entered the world.
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
  const units = world.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit === null || !isUnderway(unit) || !hasDestination(unit)) {
      continue;
    }

    if (isPathComplete(unit.path)) {
      setStraightPath(
        unit.path,
        unit.order.destination.x,
        unit.order.destination.y,
      );
    }

    const waypoint = nextWaypoint(unit.path);

    assert(waypoint !== null, "A path just filled has a waypoint");

    sub(waypoint, unit.curr, toWaypoint);

    const remaining = length(toWaypoint);

    if (remaining <= epsilon) {
      reachWaypoint(unit, waypoint);

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
      reachWaypoint(unit, waypoint);

      continue;
    }

    unit.curr.x += (toWaypoint.x / remaining) * step;
    unit.curr.y += (toWaypoint.y / remaining) * step;
  }
};
