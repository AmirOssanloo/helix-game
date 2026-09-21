import { acquireHero } from "@domain/public";
import type { CreateWorldOptions, Simulation } from "./world";
import { createWorld } from "./world";

/** Puts the hero into `world` at the spawn point of the map it was created on. A world that has just been created or restarted always has room for it. */
const enterHero = (world: Simulation): void => {
  const spawn = world.mapDef.spawnPoint;

  if (acquireHero(world.state, spawn.x, spawn.y) === null) {
    throw new Error("The unit pool of a fresh world has room for the hero");
  }
};

/**
 * A session's world: a world at tick zero under `options` with the hero standing at the
 * map's spawn point. The composition root boots one, and a replay recreates one from the
 * seed a log carries, so the hero enters the same way in both. The hero enters once per
 * session, here; a map load carries it.
 */
export const createSessionWorld = (options: CreateWorldOptions): Simulation => {
  const world = createWorld(options);

  enterHero(world);

  return world;
};

/** `world` restarted under `seed` with the hero entered again: in place, the world `createSessionWorld` makes under that seed. */
export const restartSessionWorld = (world: Simulation, seed: number): void => {
  world.restart(seed);
  enterHero(world);
};
