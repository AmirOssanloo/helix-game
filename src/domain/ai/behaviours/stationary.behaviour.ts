import type { Vec2 } from "@shared/public";
import type { AttackRecord } from "../../definitions/attack-state";
import type { Unit } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import type { MachineBehaviour } from "../behaviour";

/** Stands where it is: a behaviour that never engages is never asked, and this is its answer if it were. */
const standStill = (
  _world: Readonly<World>,
  unit: Readonly<Unit>,
  _target: Readonly<Unit>,
  _record: AttackRecord,
  _margin: number,
  out: Vec2,
): void => {
  out.x = unit.curr.x;
  out.y = unit.curr.y;
};

/** Stands where it spawned and never leaves Idle, whatever sees or hits it: the training dummy's driver, and the neutral one for a unit that needs none. */
export const stationaryBehaviour: MachineBehaviour = {
  kind: "machine",
  engages: false,
  wanders: false,
  kites: false,
  standAt: standStill,
};
