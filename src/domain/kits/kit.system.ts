import { assert } from "@shared/public";
import { activeFormOf, resolveHero } from "../entities/hero";
import type { World } from "../entities/world-state";
import { resolveKit } from "./kit-registry";

/**
 * Keeps the hero's modifier table true to its active form's kit every tick, right after the
 * commands are applied and before the stats are derived, so an orb pressed or a level raised
 * this tick is in this tick's derived values and a swapped-out instance is gone from them.
 * Nothing is cached across ticks: a swap of the active form brings that form's kit and its
 * held instances on the next tick.
 */
export const kitSystem = (world: World): void => {
  const hero = resolveHero(world);

  if (hero === null) {
    return;
  }

  const form = activeFormOf(world, hero);

  if (form === null) {
    return;
  }

  const kit = resolveKit(form.def.kit);

  assert(kit !== null, "The content tier resolves every form's kit key");
  kit.refreshPassives(hero, form.kit, world.run.tuning);
};
