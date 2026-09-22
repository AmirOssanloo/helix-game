import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { resolveBehaviour } from "./behaviours/index";

/**
 * Whether the unit is in control of itself this tick. A corpse, a stunned unit, one in the
 * air, and one a push is carrying all hold what they hold; what each of them may not do
 * afterwards is the behaviour's to ask, flag by flag.
 */
const isDriving = (unit: Readonly<Unit>): boolean =>
  unit.state !== "dead" &&
  !unit.disables.stunned &&
  !unit.disables.lifted &&
  !unit.disables.displaced;

/**
 * Runs the behaviour every unit's definition names, once per tick, in pool order. The hero
 * carries no definition and is driven by commands, so the pass passes over it.
 *
 * It runs after the cast stages and before pathing, so an order a behaviour issues has its
 * path and its first step on the tick that issued it, and after the status pass, so a
 * behaviour reads the flags this tick's statuses raised rather than the last tick's.
 *
 * A behaviour decides and issues orders; it moves nothing itself. The systems after it carry
 * out what it asked for, exactly as they carry out what the player asked for.
 */
export const aiSystem = (world: World): void => {
  const units = world.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const definitionId = unit === null ? null : unit.definitionId;

    if (unit === null || definitionId === null || !isDriving(unit)) {
      continue;
    }

    const record = world.run.units.get(definitionId);
    const behaviour =
      record === undefined ? null : resolveBehaviour(record.def.behaviour);

    if (behaviour !== null) {
      behaviour(world, unit);
    }
  }
};
