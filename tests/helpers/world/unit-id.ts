import type { Unit } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";

/**
 * The id `unit` holds in `world`'s pool, for a spec that arranged a unit and now has to name
 * it in a command or an order. Fails loudly for a unit the pool does not hold, since a spec
 * asserting on the wrong id means nothing.
 */
export const unitIdOf = (world: Simulation, unit: Readonly<Unit>): EntityId => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const id = units.idAt(index);

    if (units.at(index) === unit && id !== null) {
      return id;
    }
  }

  throw new Error("The unit pool holds the unit the spec is asking about");
};
