import type { Vec2 } from "@shared/public";
import type { AttackRecord } from "../../definitions/attack-state";
import type { Unit } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import type { MachineBehaviour } from "../behaviour";
import { reachLessMargin, writeReachPoint } from "../standing";

/**
 * The point on the line from the target to the unit that is the attack's reach less the
 * margin from the target, from either side: a unit further out walks in to it, and one the
 * hero has closed on walks back out to it. One on the target's own centre has no line and
 * stands where it is.
 */
const keepAtRange = (
  _world: Readonly<World>,
  unit: Readonly<Unit>,
  target: Readonly<Unit>,
  record: AttackRecord,
  margin: number,
  out: Vec2,
): void => {
  writeReachPoint(
    unit,
    target,
    reachLessMargin(unit, target, record.def.range, margin),
    true,
    out,
  );
};

/**
 * The kiting archetypes' driver: it holds at its attack range less a margin and fires, as the
 * holder does, and when the hero closes on it, it backs away along a path while its attack is
 * on its clock and turns to fire each time the clock allows.
 */
export const rangedKiterBehaviour: MachineBehaviour = {
  kind: "machine",
  engages: true,
  wanders: true,
  kites: true,
  standAt: keepAtRange,
};
