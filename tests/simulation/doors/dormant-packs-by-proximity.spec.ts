import { describe, expect, it } from "vitest";
import { meleeGruntDef, tuningTable } from "@content/public";
import type { MapDef, PackDef, PackState } from "@domain/public";
import { countLiveEnemies, ENEMY_LIVE_CAP } from "@domain/public";
import type { Simulation } from "@simulation/public";
import { makeMapDef, makeWorld, spawnHero, submit } from "../../helpers";

/** How many packs the long map holds, how far apart they stand, and how many each holds. */
const PACK_COUNT = 16;
const PACK_SPACING = 4000;
const PACK_SIZE = 20;

/** The map's length along X, room for every pack and a margin at each end. */
const MAP_LENGTH = PACK_COUNT * PACK_SPACING + PACK_SPACING;

/** How tall the strip is, and the line the packs stand on. */
const MAP_HEIGHT = 4096;
const PACK_LINE_Y = MAP_HEIGHT / 2;

/** The pack the hero stands beside, somewhere in the middle of the map. */
const NEAR_PACK = 9;

/** How far short of the near pack the hero stands: inside the activation radius, and far outside every other pack's. */
const HERO_OFFSET = tuningTable.pack_activation_radius / 2;

/** How far off the pack line the hero walks the strip: outside a grunt's aggro radius, inside the activation radius. */
const WALK_OFFSET = 1000;

/** Where the walk starts and ends, a margin in from each end of the strip. */
const WALK_MARGIN = 500;

/** How far the hero is sent at a time, so no one path spans the strip. */
const LEG = 2000;

/** More ticks than the walk takes at the hero's speed. */
const PATIENCE = 60_000;

const packXOf = (index: number): number => PACK_SPACING * (index + 1);

/** A long strip with a dormant pack of grunts every `PACK_SPACING`, more between them than the live cap allows. */
const longMap = (): MapDef => {
  const packs: PackDef[] = [];

  for (let index = 0; index < PACK_COUNT; index += 1) {
    packs.push({
      archetypeId: meleeGruntDef.id,
      tier: "normal",
      count: PACK_SIZE,
      position: { x: packXOf(index), y: PACK_LINE_Y },
      dormant: true,
    });
  }

  return makeMapDef.build({
    id: "long_strip",
    bounds: { minX: 0, minY: 0, maxX: MAP_LENGTH, maxY: MAP_HEIGHT },
    spawnPoint: { x: packXOf(NEAR_PACK) - HERO_OFFSET, y: PACK_LINE_Y },
    packs,
  });
};

const statesOf = (world: Simulation): PackState[] =>
  world.state.map.packs.map((pack) => pack.state);

describe("the door: simulation cost is bounded by a live cap, and dormant packs activate by proximity", () => {
  it("wakes only the pack beside the hero on a map holding more dormant enemies than the live cap", () => {
    const map = longMap();
    const world = makeWorld({ seed: 1, map });

    spawnHero(world, { x: map.spawnPoint.x, y: map.spawnPoint.y });

    expect(PACK_COUNT * PACK_SIZE).toBeGreaterThan(ENEMY_LIVE_CAP);
    expect(countLiveEnemies(world.state)).toBe(0);

    world.tick();

    expect(countLiveEnemies(world.state)).toBe(PACK_SIZE);
    expect(statesOf(world)).toEqual(
      map.packs.map((_, index) => (index === NEAR_PACK ? "awake" : "asleep")),
    );
  });

  it("never holds more than two packs live on a walk of the whole strip, and wakes the pack at the far end", () => {
    const map = longMap();
    const world = makeWorld({ seed: 1, map });
    const walkY = PACK_LINE_Y + WALK_OFFSET;
    const hero = spawnHero(world, { x: WALK_MARGIN, y: walkY });
    const woken = new Set<number>();
    let mostAwake = 0;
    let mostLive = 0;
    let everWaiting = false;
    let legEnd = WALK_MARGIN;
    let ticks = 0;

    while (hero.curr.x < MAP_LENGTH - WALK_MARGIN - 1 && ticks < PATIENCE) {
      if (hero.order.kind === "none") {
        legEnd = Math.min(legEnd + LEG, MAP_LENGTH - WALK_MARGIN);
        submit(world, {
          kind: "move",
          tick: world.view.tick,
          timestamp: world.view.tick,
          destination: { x: legEnd, y: walkY },
        });
      }

      world.tick();
      ticks += 1;

      const states = statesOf(world);
      let awake = 0;

      for (let index = 0; index < states.length; index += 1) {
        if (states[index] === "awake") {
          awake += 1;
          woken.add(index);
        }

        if (states[index] === "waiting") {
          everWaiting = true;
        }
      }

      mostAwake = Math.max(mostAwake, awake);
      mostLive = Math.max(mostLive, countLiveEnemies(world.state));
    }

    expect(ticks).toBeLessThan(PATIENCE);
    expect(mostAwake).toBeLessThanOrEqual(2);
    expect(mostLive).toBeLessThanOrEqual(2 * PACK_SIZE);
    expect(everWaiting).toBe(false);
    expect(woken.has(PACK_COUNT - 1)).toBe(true);
    expect(woken.size).toBe(PACK_COUNT);
    expect(statesOf(world).slice(0, PACK_COUNT - 1)).toEqual(
      map.packs.slice(0, PACK_COUNT - 1).map(() => "asleep"),
    );
  });
});
