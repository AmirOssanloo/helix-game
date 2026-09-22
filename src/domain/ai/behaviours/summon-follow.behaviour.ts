import type { Vec2 } from "@shared/public";
import { assert, distanceSquared, length, sub } from "@shared/public";
import type { Unit } from "../../entities/unit";
import type { World } from "../../entities/world-state";
import { issueMove } from "../../orders/state-machine";
import { resolveDestinationFor } from "../../pathing/destination";
import type { Behaviour } from "../behaviour";

/** Scratch for the vector from the owner to the summon, reused for every summon every tick. */
const fromOwner: Vec2 = { x: 0, y: 0 };

/** Scratch for the point the summon walks to, reused the same way. */
const destination: Vec2 = { x: 0, y: 0 };

/**
 * How far from its owner the summon's definition lets it stand, or nothing for a unit whose
 * definition run scope no longer holds, which keeps it where it is.
 */
const followDistanceOf = (world: World, unit: Readonly<Unit>): number => {
  const definitionId = unit.definitionId;
  const record =
    definitionId === null ? undefined : world.run.units.get(definitionId);

  return record === undefined ? 0 : record.followDistance;
};

/**
 * Where the summon walks to: the point on the follow ring nearest to where it stands, so it
 * closes the gap and stops beside its owner rather than inside it, resolved to somewhere the
 * map lets a body of its size stand. A summon standing exactly on its owner has no direction
 * to take, and walks to the owner's own point.
 */
const writeFollowPoint = (
  world: World,
  unit: Readonly<Unit>,
  owner: Readonly<Unit>,
  followDistance: number,
): void => {
  sub(unit.curr, owner.curr, fromOwner);

  const gap = length(fromOwner);
  const reach = gap === 0 ? 0 : followDistance / gap;

  resolveDestinationFor(
    world,
    unit,
    owner.curr.x + fromOwner.x * reach,
    owner.curr.y + fromOwner.y * reach,
    destination,
  );
};

/**
 * The summon's driver: it keeps within its definition's follow distance of its owner and
 * does nothing else. Standing inside that distance it holds its ground, so a hero taking one
 * step does not drag it along; past it, and only once it is idle, it walks to the near side
 * of the ring, which is what makes the walk one order rather than a fresh one every tick.
 *
 * A root keeps it where it is, as a root keeps anyone. An owner that is gone leaves it
 * standing: the death pass takes it on the same tick, and nothing it did in between matters.
 */
export const summonFollowBehaviour: Behaviour = (
  world: World,
  unit: Unit,
): void => {
  const ownerId = unit.ownerId;
  const owner = ownerId === null ? null : world.map.units.resolve(ownerId);

  if (owner === null || unit.state !== "idle" || unit.disables.rooted) {
    return;
  }

  const followDistance = followDistanceOf(world, unit);

  if (
    distanceSquared(unit.curr, owner.curr) <=
    followDistance * followDistance
  ) {
    return;
  }

  writeFollowPoint(world, unit, owner, followDistance);

  const result = issueMove(unit, destination.x, destination.y);

  assert(result === "ok", "An idle summon takes the walk back to its owner");
};
