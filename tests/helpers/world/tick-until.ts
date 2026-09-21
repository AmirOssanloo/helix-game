import type { Steppable, WorldView } from "@simulation/public";

/**
 * Ticks `world`, a world or a replay feeding one, until `predicate` holds over its view, and
 * returns the ticks it took. Throws at `maxTicks`, so a scenario that never arrives fails
 * with a count instead of hanging.
 */
export const tickUntil = (
  world: Steppable,
  predicate: (view: WorldView) => boolean,
  maxTicks: number,
): number => {
  for (let ticks = 0; ticks < maxTicks; ticks += 1) {
    if (predicate(world.view)) {
      return ticks;
    }

    world.tick();
  }

  if (predicate(world.view)) {
    return maxTicks;
  }

  throw new Error(
    `tickUntil ran ${maxTicks} ticks and the predicate never held`,
  );
};
