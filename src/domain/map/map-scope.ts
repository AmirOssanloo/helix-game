import { placeMapPacks } from "../ai/packs";
import { readTunable } from "../definitions/tuning-state";
import { resolveHero } from "../entities/hero";
import { releaseUnit } from "../entities/unit";
import type { World } from "../entities/world-state";
import { clearOrder } from "../orders/state-machine";

/**
 * Empties map scope around the hero: every unit but the hero, every projectile, effect, and
 * zone is released, no checkpoint is reached any more, the hero is given the map's spawn point
 * back and carried to it with its order cleared and its
 * previous position written so nothing interpolates the carry, pack ids count from zero again, the spatial hash is
 * rebuilt at the tuned cell size over what is left, and the map's packs are set back to what
 * a load makes of them: the live ones placed, the dormant ones asleep as records, and every pack whole again. Run scope is untouched: the hero keeps
 * its level, its forms, its clocks, and its statuses. A map load writes the map's spawn point
 * and checkpoints into map scope first and calls this; the panel's reset calls it on the loaded map. A dead hero is carried
 * dead and respawns at the map's spawn point when its delay runs out.
 */
export const resetMapScope = (world: World): void => {
  const scope = world.map;
  const heroId = world.run.heroId;
  const hero = resolveHero(world);

  for (let index = 0; index < scope.units.end; index += 1) {
    const id = scope.units.idAt(index);

    if (id !== null && id !== heroId) {
      releaseUnit(world, id);
    }
  }

  scope.projectiles.releaseAll();
  scope.effects.releaseAll();
  scope.zones.releaseAll();
  scope.nextPackId = 0;
  scope.furthestCheckpoint = -1;

  if (hero !== null) {
    hero.spawnPoint.x = scope.spawnPoint.x;
    hero.spawnPoint.y = scope.spawnPoint.y;
    clearOrder(hero);
    hero.curr.x = hero.spawnPoint.x;
    hero.curr.y = hero.spawnPoint.y;
    hero.prev.x = hero.spawnPoint.x;
    hero.prev.y = hero.spawnPoint.y;
  }

  scope.spatialHash.rebuild(
    readTunable(world.run.tuning, "hash_cell_size"),
    scope.units,
  );
  placeMapPacks(world);
};
