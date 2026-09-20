import { describe, expect, it } from "vitest";
import { acquireUnit } from "@domain/public";
import type { Simulation, WorldView } from "@simulation/public";
import { makeWorld, tickUntil } from "../helpers";

/** A unit as the view shows it: read-only at every depth. */
type ViewedUnit = NonNullable<ReturnType<WorldView["map"]["units"]["at"]>>;

const PILE_SIZE = 20;
const DROP_X = 500;
const DROP_Y = 500;

/**
 * Each pass takes half of every remaining overlap, so a pile converges on touching without
 * reaching it: the largest overlap roughly halves a tick. Two bars follow from that. Within a
 * third of a second no overlap is a world unit wide, which is what a player could see; within
 * a second none is a thousandth wide, which is settled for every purpose the simulation has.
 */
const VISIBLE_TICKS = 10;
const VISIBLE_OVERLAP = 1;
const SETTLE_TICKS = 30;
const SETTLED_OVERLAP = 1e-3;

const liveUnits = (view: WorldView): ViewedUnit[] => {
  const units: ViewedUnit[] = [];

  for (let index = 0; index < view.map.units.end; index += 1) {
    const unit = view.map.units.at(index);

    if (unit !== null) {
      units.push(unit);
    }
  }

  return units;
};

/** How far the most overlapping pair is inside the sum of its collision radii; zero when none overlaps. */
const largestOverlap = (view: WorldView): number => {
  const units = liveUnits(view);
  let largest = 0;

  for (let first = 0; first < units.length; first += 1) {
    for (let second = first + 1; second < units.length; second += 1) {
      const a = units[first];
      const b = units[second];

      if (a === undefined || b === undefined) {
        continue;
      }

      const overlap =
        a.collisionRadius +
        b.collisionRadius -
        Math.hypot(b.curr.x - a.curr.x, b.curr.y - a.curr.y);

      if (overlap > largest) {
        largest = overlap;
      }
    }
  }

  return largest;
};

const positions = (view: WorldView): number[] =>
  liveUnits(view).flatMap((unit) => [unit.curr.x, unit.curr.y]);

const dropPile = (seed: number): Simulation => {
  const world = makeWorld({ seed });

  for (let count = 0; count < PILE_SIZE; count += 1) {
    acquireUnit(world.state, "enemy", DROP_X, DROP_Y);
  }

  return world;
};

describe("twenty discs dropped on one point", () => {
  it("overlap by a whole hull before the first tick and by less than a world unit within a third of a second", () => {
    const world = dropPile(1);

    expect(largestOverlap(world.view)).toBe(2 * 27);

    const ticks = tickUntil(
      world,
      (view) => largestOverlap(view) < VISIBLE_OVERLAP,
      VISIBLE_TICKS,
    );

    expect(ticks).toBeLessThanOrEqual(VISIBLE_TICKS);
  });

  it("settle to touching within a second of the capped passes", () => {
    const world = dropPile(1);

    tickUntil(
      world,
      (view) => largestOverlap(view) < SETTLED_OVERLAP,
      SETTLE_TICKS,
    );

    expect(largestOverlap(world.view)).toBeLessThan(SETTLED_OVERLAP);
  });

  it("stay a pile around the drop point rather than flying apart", () => {
    const world = dropPile(1);

    tickUntil(
      world,
      (view) => largestOverlap(view) < SETTLED_OVERLAP,
      SETTLE_TICKS,
    );

    for (const unit of liveUnits(world.view)) {
      expect(
        Math.hypot(unit.curr.x - DROP_X, unit.curr.y - DROP_Y),
      ).toBeLessThan(PILE_SIZE * unit.collisionRadius);
    }
  });

  it("settle into the same positions on two runs", () => {
    const first = dropPile(1);
    const second = dropPile(1);

    for (let tick = 0; tick < SETTLE_TICKS; tick += 1) {
      first.tick();
      second.tick();
    }

    expect(positions(first.view)).toEqual(positions(second.view));
  });
});
