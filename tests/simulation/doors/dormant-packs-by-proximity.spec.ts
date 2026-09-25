import { describe, expect, it } from "vitest";
import { meleeGruntDef, tuningTable } from "@content/public";
import type { MapDef, PackDef } from "@domain/public";
import { countLiveEnemies, ENEMY_LIVE_CAP } from "@domain/public";
import { makeMapDef, makeWorld, spawnHero } from "../../helpers";

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

describe("the door: simulation cost is bounded by a live cap, and dormant packs activate by proximity", () => {
  it("wakes only the pack beside the hero on a map holding more dormant enemies than the live cap", () => {
    const map = longMap();
    const world = makeWorld({ seed: 1, map });

    spawnHero(world, { x: map.spawnPoint.x, y: map.spawnPoint.y });

    expect(PACK_COUNT * PACK_SIZE).toBeGreaterThan(ENEMY_LIVE_CAP);
    expect(countLiveEnemies(world.state)).toBe(0);

    world.tick();

    expect(countLiveEnemies(world.state)).toBe(PACK_SIZE);
    expect(world.state.map.packs.map((pack) => pack.waiting)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      true,
      true,
      true,
      true,
      true,
      true,
    ]);
  });
});
