import { checkpointInReach, isWithinReach } from "@domain/queries";
import type { Vec2 } from "@shared/public";
import type { WorldView } from "@simulation/public";

/**
 * The checkpoint whose store a left click at world point `point` opens: the one whose ring the
 * hero stands in, as the domain's reach query says, when the click lands on that ring too, its
 * edge included. `-1` when there is no hero, the hero is dead, the hero stands on no ring, or
 * the click lands outside the hero's: the click then keeps its meaning. Reads only.
 */
export const ringClicked = (
  world: WorldView,
  point: Readonly<Vec2>,
): number => {
  const heroId = world.run.heroId;
  const hero = heroId === null ? null : world.map.units.resolve(heroId);

  if (hero === null || hero.state === "dead") {
    return -1;
  }

  const checkpoint = checkpointInReach(world, hero.curr);

  return checkpoint !== -1 && isWithinReach(world, checkpoint, point)
    ? checkpoint
    : -1;
};
