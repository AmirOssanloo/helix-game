import { describe, expect, it } from "vitest";
import { meleeGruntDef, tuningTable } from "@content/public";
import type { MapDef, PackDef, Unit } from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  makeMapDef,
  makeWorld,
  spawnHero,
  submit,
  tickUntil,
} from "../helpers";

/** Where the pack stands: straight out along +X, well past the activation radius from the origin. */
const PACK_AT = { x: 3000, y: 0 };

/** How many the pack holds. */
const PACK_COUNT = 3;

/** The activation radius under the content table. */
const RADIUS = tuningTable.pack_activation_radius;

/** Ticks a case runs to show that nothing changed. */
const SETTLE = 120;

/** Long enough for the hero to walk into the radius from the origin. */
const PATIENCE = 600;

/** A pack of grunts at the pack's point. */
const gruntPack = (dormant: boolean): PackDef => ({
  archetypeId: meleeGruntDef.id,
  tier: "normal",
  count: PACK_COUNT,
  position: PACK_AT,
  dormant,
});

/** A bare rectangle with `packs` and nothing else. */
const mapWith = (packs: readonly PackDef[]): MapDef =>
  makeMapDef.build({ packs });

/** Every live unit wearing the grunt's definition. */
const gruntsOf = (world: Simulation): Unit[] => {
  const units = world.state.map.units;
  const found: Unit[] = [];

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.definitionId === meleeGruntDef.id) {
      found.push(unit);
    }
  }

  return found;
};

/** How far `hero` stood from the pack's point when the tick began, which is where the behaviours read it. */
const startGap = (hero: Readonly<Unit>): number =>
  Math.hypot(PACK_AT.x - hero.prev.x, PACK_AT.y - hero.prev.y);

/** Orders the hero to walk to (`x`, `y`). */
const walkHero = (world: Simulation, x: number, y: number): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x, y },
  });
};

describe("a dormant pack", () => {
  it("costs no unit while the hero is outside the activation radius", () => {
    const world = makeWorld({ seed: 1, map: mapWith([gruntPack(true)]) });

    spawnHero(world);

    for (let tick = 0; tick < SETTLE; tick += 1) {
      world.tick();
    }

    expect(world.view.map.units.count).toBe(1);
    expect(world.state.map.packs[0]?.state).toBe("asleep");
  });

  it("spawns in Idle on the first tick that begins with the hero inside the radius", () => {
    const world = makeWorld({ seed: 1, map: mapWith([gruntPack(true)]) });
    const hero = spawnHero(world);

    walkHero(world, PACK_AT.x, PACK_AT.y);
    tickUntil(world, () => gruntsOf(world).length > 0, PATIENCE);

    const grunts = gruntsOf(world);

    expect(startGap(hero)).toBeLessThanOrEqual(RADIUS);
    expect(grunts).toHaveLength(PACK_COUNT);
    expect(grunts.map((grunt) => grunt.ai.state)).toEqual([
      "idle",
      "idle",
      "idle",
    ]);
    expect(new Set(grunts.map((grunt) => grunt.packId)).size).toBe(1);
    expect(world.state.map.packs[0]?.state).toBe("awake");
  });

  it("was not spawned on the tick before, which began with the hero outside the radius", () => {
    const world = makeWorld({ seed: 1, map: mapWith([gruntPack(true)]) });
    const hero = spawnHero(world);
    let gap = Number.POSITIVE_INFINITY;
    let gapBefore = Number.POSITIVE_INFINITY;

    walkHero(world, PACK_AT.x, PACK_AT.y);
    tickUntil(
      world,
      () => {
        if (gruntsOf(world).length > 0) {
          return true;
        }

        gapBefore = gap;
        gap = Math.hypot(PACK_AT.x - hero.curr.x, PACK_AT.y - hero.curr.y);

        return false;
      },
      PATIENCE,
    );

    expect(gapBefore).toBeGreaterThan(RADIUS);
    expect(gap).toBeLessThanOrEqual(RADIUS);
  });

  it("spawns once: a pack killed stays dead when the hero comes back", () => {
    const world = makeWorld({ seed: 1, map: mapWith([gruntPack(true)]) });
    const hero = spawnHero(world, { x: PACK_AT.x - RADIUS, y: PACK_AT.y });

    world.tick();
    submit(world, {
      kind: "clear_all",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    world.tick();
    walkHero(world, 0, 0);
    tickUntil(world, () => hero.order.kind === "none", PATIENCE);
    walkHero(world, PACK_AT.x - RADIUS, PACK_AT.y);
    tickUntil(world, () => hero.order.kind === "none", PATIENCE);

    expect(gruntsOf(world)).toHaveLength(0);
  });

  it("waits again as a record when the map is reset and the hero is carried home, outside the radius", () => {
    const world = makeWorld({ seed: 1, map: mapWith([gruntPack(true)]) });

    spawnHero(world);
    walkHero(world, PACK_AT.x, PACK_AT.y);
    tickUntil(world, () => gruntsOf(world).length > 0, PATIENCE);
    submit(world, {
      kind: "reset_map",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    world.tick();

    expect(gruntsOf(world)).toHaveLength(0);
    expect(world.state.map.packs[0]?.state).toBe("asleep");
  });

  it("is kept as a record by a map load", () => {
    const world = makeWorld({ seed: 1 });

    spawnHero(world);
    world.loadMap(mapWith([gruntPack(true)]));

    expect(world.view.map.units.count).toBe(1);
    expect(world.state.map.packs[0]?.state).toBe("asleep");
  });
});

describe("a live pack", () => {
  it("stands in Idle when the world is created, before any tick", () => {
    const world = makeWorld({ seed: 1, map: mapWith([gruntPack(false)]) });

    expect(gruntsOf(world).map((grunt) => grunt.ai.state)).toEqual([
      "idle",
      "idle",
      "idle",
    ]);
    expect(world.state.map.packs[0]?.state).toBe("awake");
  });

  it("stands when a map load brings it, however far the hero is", () => {
    const world = makeWorld({ seed: 1 });

    spawnHero(world);
    world.loadMap(mapWith([gruntPack(false)]));

    expect(gruntsOf(world)).toHaveLength(PACK_COUNT);
  });

  it("the world cannot take waits, and is placed on the tick the hero is near and there is room", () => {
    const crowd = {
      ...gruntPack(false),
      count: 200,
      position: { x: -3000, y: 0 },
    };
    const world = makeWorld({
      seed: 1,
      map: mapWith([crowd, gruntPack(false)]),
    });

    expect(gruntsOf(world)).toHaveLength(200);
    expect(world.state.map.packs[1]?.state).toBe("waiting");

    spawnHero(world, { x: PACK_AT.x, y: PACK_AT.y });
    submit(world, {
      kind: "clear_all",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    world.tick();

    expect(gruntsOf(world)).toHaveLength(PACK_COUNT);
    expect(world.state.map.packs[1]?.state).toBe("awake");
  });
});
