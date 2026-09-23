import type { UnitRecord } from "../definitions/unit-state";
import type { Unit } from "../entities/unit";
import type { World } from "../entities/world-state";

/** The record of the definition `unit` wears, or `undefined` for the hero and for a body wearing none. */
const recordOf = (
  world: World,
  unit: Readonly<Unit>,
): UnitRecord | undefined =>
  unit.definitionId === null
    ? undefined
    : world.run.units.get(unit.definitionId);

/**
 * The speed `unit` walks at before its modifiers, in units per tick: its definition's, or
 * `tuned`, the tuning table's base speed, for the hero, whose form carries none, and for a
 * body wearing no definition. The speed stack is applied over it the same either way.
 */
export const baseSpeedOf = (
  world: World,
  unit: Readonly<Unit>,
  tuned: number,
): number => {
  const record = recordOf(world, unit);

  return record === undefined ? tuned : record.movementSpeedPerTick;
};

/**
 * The rate `unit` turns at, in radians per tick: its definition's, or `tuned`, the tuning
 * table's turn rate, for the hero and for a body wearing no definition. The turn ramp and the
 * action cone are the tuning table's for every unit.
 */
export const turnRateOf = (
  world: World,
  unit: Readonly<Unit>,
  tuned: number,
): number => {
  const record = recordOf(world, unit);

  return record === undefined ? tuned : record.turnRatePerTick;
};
