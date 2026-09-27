import { unpackIndex } from "@shared/public";
import { readTunable } from "../definitions/tuning-state";
import type { UnitId } from "../entities/unit";
import type { Unit } from "../entities/unit";
import { UNIT_CAPACITY } from "../entities/unit";
import type { World } from "../entities/world-state";
import {
  keepInsideRect,
  pushOutOfRect,
  separateDiscs,
  separateFromHeld,
} from "./collision";

/** The share of an overlap each unit of a pair takes when neither is the hero: the rule is an even split, not a tuning. */
const EVEN_SPLIT = 0.5;

/** The rank of a unit in no chain of contact to a hero. */
const UNRANKED = -1;

/**
 * How far past touching two discs may stand and still be in contact for the rank. A pass
 * leaves a pair it separated exactly touching, and the rounding of that push may leave the
 * centres a hair further apart than the sum of the radii; the pair is still in contact.
 */
const CONTACT_SLACK = 1;

/**
 * The collision pass's working memory: each unit's contact rank by pool slot, and the queue
 * the walk that sets the ranks runs through.
 */
export type CollisionScratch = {
  ranks: Int32Array;
  queue: Int32Array;
};

/** The collision pass's scratch, every unit unranked. Made once, with the world. */
export const createCollisionScratch = (): CollisionScratch => ({
  ranks: new Int32Array(UNIT_CAPACITY).fill(UNRANKED),
  queue: new Int32Array(UNIT_CAPACITY),
});

/**
 * The direction a pair on one point separates along, from the pair's slots: the same pair
 * gets the same direction every run, and neighbouring pairs get different ones.
 */
const tieSeedOf = (idA: UnitId, idB: UnitId): number =>
  unpackIndex(idA) + unpackIndex(idB);

/**
 * Separates one pair by the collision rule: nothing when both are in the air, the whole of
 * the overlap on the grounded one when the other is, and otherwise `heroShare` of it on the
 * hero when exactly one of the pair is the hero and the rest on the other; when neither is,
 * `heroShare` on the one of lower contact rank when both are ranked and the ranks differ, and
 * half each otherwise. The lift is decided first, so a lifted enemy holds its disc against
 * the hero too. Returns whether either moved.
 */
const separatePair = (
  a: Unit,
  b: Unit,
  tieSeed: number,
  heroShare: number,
  rankA: number,
  rankB: number,
): boolean => {
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

  let shareA = EVEN_SPLIT;

  if (a.kind === "hero" && b.kind !== "hero") {
    shareA = heroShare;
  } else if (b.kind === "hero" && a.kind !== "hero") {
    shareA = 1 - heroShare;
  } else if (a.kind !== "hero" && b.kind !== "hero") {
    if (rankA !== UNRANKED && rankB !== UNRANKED && rankA < rankB) {
      shareA = heroShare;
    } else if (rankA !== UNRANKED && rankB !== UNRANKED && rankB < rankA) {
      shareA = 1 - heroShare;
    }
  }

  return separateDiscs(
    a.curr,
    a.collisionRadius,
    b.curr,
    b.collisionRadius,
    tieSeed,
    shareA,
  );
};

/** Whether a unit can seed the contact walk: a hero on the ground and alive. */
const seedsRank = (unit: Unit): boolean =>
  unit.kind === "hero" && !unit.disables.lifted && unit.state !== "dead";

/**
 * Ranks every unit by contact with a hero, breadth first: every grounded, living hero is rank
 * zero, a grounded unit that is not a hero touching a unit of rank n is rank n + 1, and every
 * other unit is unranked. A breadth-first distance, so the rank does not depend on the order
 * the hash proposes neighbours in. A lifted unit takes no rank and passes none on.
 */
const rankByContact = (world: World, widest: number): void => {
  const { ranks, queue } = world.scratch.collision;
  const candidates = world.scratch.collisionCandidates;
  const units = world.map.units;
  const hash = world.map.spatialHash;
  let tail = 0;

  ranks.fill(UNRANKED);

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && seedsRank(unit)) {
      ranks[index] = 0;
      queue[tail] = index;
      tail += 1;
    }
  }

  for (let head = 0; head < tail; head += 1) {
    const index = queue[head] ?? 0;
    const unit = units.at(index);

    if (unit === null) {
      continue;
    }

    const rank = (ranks[index] ?? UNRANKED) + 1;
    const found = hash.queryCircle(
      unit.curr,
      unit.collisionRadius + widest + CONTACT_SLACK,
      candidates,
    );

    for (let slot = 0; slot < found; slot += 1) {
      const otherId = candidates[slot];

      if (otherId === undefined) {
        continue;
      }

      const other = units.resolve(otherId);
      const otherIndex = unpackIndex(otherId);

      if (
        other === null ||
        other.kind === "hero" ||
        other.disables.lifted ||
        ranks[otherIndex] !== UNRANKED
      ) {
        continue;
      }

      const reach =
        unit.collisionRadius + other.collisionRadius + CONTACT_SLACK;
      const dx = other.curr.x - unit.curr.x;
      const dy = other.curr.y - unit.curr.y;

      if (dx * dx + dy * dy < reach * reach) {
        ranks[otherIndex] = rank;
        queue[tail] = otherIndex;
        tail += 1;
      }
    }
  }
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
 * The hero takes the `hero_push_share` of a pair's overlap with any unit that is not the
 * hero, and the other unit the rest: at zero a crowd walking into the hero cannot carry it,
 * and the hero still pushes its way through. A push status moves the hero through its own
 * system, which the share does not touch. At the start of every pass the units are ranked by
 * contact with a hero, and of two units that are not the hero and are ranked differently the
 * one nearer the hero takes the same share: each rank of a crowd presses the rank ahead of it
 * as the front rank presses the hero, so a column behind cannot drive the rank pinned against
 * the hero through it. At one half the rule is the even split.
 *
 * A unit in the air is still a disc, but one nothing moves: a pair with one lifted unit in it
 * puts the whole overlap on the other, so a lifted unit comes down on the spot it was lifted
 * from, and two lifted units leave each other where they hang.
 *
 * Nothing here reads or writes a speed. A unit's collision radius is the disc; the query
 * radius adds the widest disc in the world, so a pair overlaps only if the hash proposed it.
 */
export const collisionSystem = (world: World): void => {
  const candidates = world.scratch.collisionCandidates;
  const passes = readTunable(world.run.tuning, "push_out_passes");
  const heroShare = readTunable(world.run.tuning, "hero_push_share");
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

  const ranks = world.scratch.collision.ranks;

  for (let pass = 0; pass < passes; pass += 1) {
    rankByContact(world, widest);

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

        const pushed = separatePair(
          unit,
          other,
          tieSeedOf(id, otherId),
          heroShare,
          ranks[index] ?? UNRANKED,
          ranks[unpackIndex(otherId)] ?? UNRANKED,
        );

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
