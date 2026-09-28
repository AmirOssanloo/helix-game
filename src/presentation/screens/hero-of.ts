import type { Unit } from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";

/** The hero the world view holds, or `null`. */
export const heroOf = (world: WorldView): DeepReadonly<Unit> | null => {
  const heroId = world.run.heroId;

  return heroId === null ? null : world.map.units.resolve(heroId);
};
