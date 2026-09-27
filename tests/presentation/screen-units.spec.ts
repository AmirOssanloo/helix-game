import { describe, expect, it } from "vitest";
import { ScreenUnits } from "@presentation/public";
import type { Rect } from "@shared/public";
import {
  FixedHash,
  makeWorld,
  makeWorldView,
  spawnHero,
  spawnUnit,
  unitIdOf,
} from "../helpers";

const BOX: Rect = { minX: -100, minY: -100, maxX: 100, maxY: 100 };

describe("the units on screen", () => {
  it("asks the hash once for the box and holds what it answered, in its order", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    const other = spawnUnit(world, { x: 40, y: 0 });
    const hash = new FixedHash();
    const view = makeWorldView(world, hash);
    const units = new ScreenUnits();

    hash.ids = [unitIdOf(world, other), unitIdOf(world, hero)];
    units.gather(view, BOX);

    expect(hash.rectangleQueries).toBe(1);
    expect(hash.lastRectangle).toEqual(BOX);
    expect(units.count).toBe(2);
    expect(units.ids.slice(0, units.count)).toEqual(hash.ids);
  });

  it("replaces the last gather, so a frame with fewer units reads no stale one", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);
    const other = spawnUnit(world, { x: 40, y: 0 });
    const hash = new FixedHash();
    const view = makeWorldView(world, hash);
    const units = new ScreenUnits();

    hash.ids = [unitIdOf(world, hero), unitIdOf(world, other)];
    units.gather(view, BOX);
    hash.ids = [unitIdOf(world, other)];
    units.gather(view, BOX);

    expect(units.count).toBe(1);
    expect(units.ids[0]).toBe(unitIdOf(world, other));
  });
});
