import type { Unit, UnitKind } from "@domain/public";
import { acquireUnit } from "@domain/public";
import type { Simulation } from "@simulation/public";

/**
 * Where a unit stands, what it is, and what a hit finds on it. Everything defaults to an
 * enemy at the origin with a hundred health, no armour, no resistance, and a body that
 * damage leaves at zero.
 */
export type SpawnUnitOptions = Readonly<{
  kind?: UnitKind;
  x?: number;
  y?: number;
  health?: number;
  armour?: number;
  magicResistance?: number;
  indestructible?: boolean;
}>;

/** The health a spawned unit has, and the maximum it wears, unless the spec says another. */
const DEFAULT_HEALTH = 100;

/**
 * Arranges a unit that is not the hero: a slot through the unit door, so it is in the
 * spatial hash, wearing the health, armour, and resistance the options name. The hero is the
 * only unit with a form to derive stats from, so they are written on the unit here, which is
 * what a spawn from an enemy definition does. Returns the live unit.
 */
export const spawnUnit = (
  world: Simulation,
  options: SpawnUnitOptions = {},
): Unit => {
  const id = acquireUnit(
    world.state,
    options.kind ?? "enemy",
    options.x ?? 0,
    options.y ?? 0,
  );
  const unit = id === null ? null : world.state.map.units.resolve(id);

  if (unit === null) {
    throw new Error("The unit pool has room for the unit");
  }

  unit.stats.maxHealth = options.health ?? DEFAULT_HEALTH;
  unit.stats.armour = options.armour ?? 0;
  unit.stats.magicResistance = options.magicResistance ?? 0;
  unit.resources.health = unit.stats.maxHealth;
  unit.indestructible = options.indestructible ?? false;

  return unit;
};
