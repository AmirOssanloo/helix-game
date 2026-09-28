import { resolveHero } from "../entities/hero";
import type { World } from "../entities/world-state";
import { isWithinReach, NO_STORE } from "./store";
import { closeStore } from "./store-commands";

/**
 * Closes the open store when the hero is gone, dead, or farther than the reach radius from its
 * checkpoint, and announces it. Runs after death, last, so it reads where the tick's walk and
 * pushes left the hero and the death the tick resolved: a hero that walks off the ring or dies
 * closes the store on that tick. The world keeps running while a store is open; this is the
 * one rule that reads it.
 */
export const storeSystem = (world: World): void => {
  const open = world.map.openStore;

  if (open === NO_STORE) {
    return;
  }

  const hero = resolveHero(world);

  if (
    hero === null ||
    hero.state === "dead" ||
    !isWithinReach(world, open, hero.curr)
  ) {
    closeStore(world);
  }
};
