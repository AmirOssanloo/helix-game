import { distanceSquared } from "@shared/public";
import { readTunable } from "../definitions/tuning-state";
import { resolveHero } from "../entities/hero";
import type { World } from "../entities/world-state";
import { createDomainEvent, resetDomainEvent } from "../events/domain-event";

/** Scratch for the event a checkpoint announces, reused for every one. */
const event = createDomainEvent();

/**
 * A living hero within the reach radius of a checkpoint further along the map than the
 * furthest it has reached makes that one the furthest, takes it as its spawn point, where the
 * death system brings it back, and announces it. Within reach of several, the furthest of them
 * wins. Walking back to an earlier checkpoint changes nothing, and a hero's death does not
 * clear the furthest; only a map reset does. Runs after collision, so it reads where the
 * tick's pushes left the hero.
 */
export const checkpointSystem = (world: World): void => {
  const scope = world.map;
  const checkpoints = scope.checkpoints;

  if (scope.furthestCheckpoint >= checkpoints.length - 1) {
    return;
  }

  const hero = resolveHero(world);

  if (hero === null || hero.state === "dead") {
    return;
  }

  const reach = readTunable(world.run.tuning, "checkpoint_reach_radius");
  const reachSquared = reach * reach;

  for (
    let index = checkpoints.length - 1;
    index > scope.furthestCheckpoint;
    index -= 1
  ) {
    const checkpoint = checkpoints[index];

    if (
      checkpoint !== undefined &&
      distanceSquared(hero.curr, checkpoint) <= reachSquared
    ) {
      scope.furthestCheckpoint = index;
      hero.spawnPoint.x = checkpoint.x;
      hero.spawnPoint.y = checkpoint.y;
      resetDomainEvent(event);
      event.kind = "checkpoint_reached";
      event.tick = world.tick;
      event.unitId = world.run.heroId;
      event.checkpoint = index;
      world.events.write(event);

      return;
    }
  }
};
