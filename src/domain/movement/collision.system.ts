import type { EntityId } from "@shared/public";
import { unpackIndex } from "@shared/public";
import { readTunable } from "../definitions/tuning-state";
import type { Unit } from "../entities/unit";
import { UNIT_CAPACITY } from "../entities/unit";
import type { World } from "../entities/world-state";
import {
  keepInsideRect,
  pushOutOfRect,
  separateDiscs,
  separateFromHeld,
} from "./collision";
import { createCandidateBuffer } from "./spatial-hash";

/** Scratch for the ids a circle query returns, reused for every unit every pass. */
const candidates: EntityId[] = createCandidateBuffer(UNIT_CAPACITY);

/**
 * The direction a pair on one point separates along, from the pair's slots: the same pair
 * gets the same direction every run, and neighbouring pairs get different ones.
 */
const tieSeedOf = (idA: EntityId, idB: EntityId): number =>
  unpackIndex(idA) + unpackIndex(idB);

/**
 * Separates one pair by the collision rule: half the overlap each when both stand on the
 * ground, the whole of it on the grounded one when the other is in the air, and nothing when
 * both are. Returns whether either moved.
 */
const separatePair = (a: Unit, b: Unit, tieSeed: number): boolean => {
  if (a.disables.lifted && b.disables.lifted) {
    return false;
  }

  if (b.disables.lifted) {
    return separateFromHeld(
      a.curr,
      a.collisionRadius,
      b.curr,
      b.collisionRadius,
      tieSeed,
    );
  }

  if (a.disables.lifted) {
    return separateFromHeld(
      b.curr,
      b.collisionRadius,
      a.curr,
      a.collisionRadius,
      tieSeed,
    );
  }

  return separateDiscs(
    a.curr,
    a.collisionRadius,
    b.curr,
    b.collisionRadius,
    tieSeed,
  );
};

/**
 * Keeps units out of each other and out of obstacles after they have moved. Each pass, in pool
 * order, every unit asks the hash for its neighbours and separates from each one with a
 * greater id, so every pair is handled once in a fixed order; then every unit is pushed out
 * of every obstacle rectangle it overlaps and back inside the map's bounds, which are walls.
 * Every push is followed by a move in the hash, so a unit pushed across a cell boundary is
 * found in its new cell by the next query of the same pass; a pile dropped on a boundary
 * would otherwise stall for ticks on pairs the hash no longer proposes. The passes are a
 * capped count from the tuning table, not a loop to convergence: a pile settles over ticks.
 *
 * A unit in the air is still a disc, but one nothing moves: a pair with one lifted unit in it
 * puts the whole overlap on the other, so a lifted unit comes down on the spot it was lifted
 * from, and two lifted units leave each other where they hang.
 *
 * Nothing here reads or writes a speed. A unit's collision radius is the disc; the query
 * radius adds the widest disc in the world, so a pair overlaps only if the hash proposed it.
 */
export const collisionSystem = (world: World): void => {
  const passes = readTunable(world.run.tuning, "push_out_passes");
  const units = world.map.units;
  const hash = world.map.spatialHash;
  const obstacles = world.map.obstacles;
  const bounds = world.map.bounds;
  let widest = 0;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.collisionRadius > widest) {
      widest = unit.collisionRadius;
    }
  }

  for (let pass = 0; pass < passes; pass += 1) {
    for (let index = 0; index < units.end; index += 1) {
      const unit = units.at(index);
      const id = units.idAt(index);

      if (unit === null || id === null) {
        continue;
      }

      const found = hash.queryCircle(
        unit.curr,
        unit.collisionRadius + widest,
        candidates,
      );

      for (let slot = 0; slot < found; slot += 1) {
        const otherId = candidates[slot];

        if (otherId === undefined || otherId <= id) {
          continue;
        }

        const other = units.resolve(otherId);

        if (other === null) {
          continue;
        }

        const pushed = separatePair(unit, other, tieSeedOf(id, otherId));

        if (pushed) {
          hash.move(id, unit.curr);
          hash.move(otherId, other.curr);
        }
      }
    }

    for (let index = 0; index < units.end; index += 1) {
      const unit = units.at(index);
      const id = units.idAt(index);

      if (unit === null || id === null) {
        continue;
      }

      let pushed = false;

      for (let rect = 0; rect < obstacles.length; rect += 1) {
        const obstacle = obstacles[rect];

        if (
          obstacle !== undefined &&
          pushOutOfRect(unit.curr, unit.collisionRadius, obstacle)
        ) {
          pushed = true;
        }
      }

      if (keepInsideRect(unit.curr, unit.collisionRadius, bounds)) {
        pushed = true;
      }

      if (pushed) {
        hash.move(id, unit.curr);
      }
    }
  }
};
