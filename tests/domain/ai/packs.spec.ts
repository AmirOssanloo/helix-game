import { describe, expect, it } from "vitest";
import { meleeGruntDef, tankDef, tuningTable } from "@content/public";
import type { MapDef, PackDef, TuningKey } from "@domain/public";
import { ENEMY_LIVE_CAP } from "@domain/public";
import type { Rect, Vec2 } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import { makeMapDef, makeWorld, spawnHero, submit } from "../../helpers";

/** Half the side of the open pocket at the origin: a few grunts fit in it, a pack of thirty does not. */
const POCKET = 96;

/** How thick the walls around the pocket are: far past the default placement radius. */
const WALL = 1000;

/** The four walls that close the pocket at the origin in, each `WALL` thick. */
const BOX: readonly Rect[] = [
  {
    minX: -POCKET - WALL,
    minY: -POCKET - WALL,
    maxX: -POCKET,
    maxY: POCKET + WALL,
  },
  {
    minX: POCKET,
    minY: -POCKET - WALL,
    maxX: POCKET + WALL,
    maxY: POCKET + WALL,
  },
  { minX: -POCKET, minY: -POCKET - WALL, maxX: POCKET, maxY: -POCKET },
  { minX: -POCKET, minY: POCKET, maxX: POCKET, maxY: POCKET + WALL },
];

/** Where the walled-in pack is aimed: the middle of the pocket. */
const WALLED_IN: Readonly<Vec2> = { x: 0, y: 0 };

/** More grunts than the pocket holds. */
const WALLED_IN_COUNT = 30;

/** Where the hero stands: outside the box, and inside the activation radius of the pocket. */
const HERO_AT: Readonly<Vec2> = { x: 1500, y: 0 };

/** A placement radius that reaches past the walls: the grunt lattice's ring 25, at 1350. */
const WIDE_RADIUS = 1400;

/** Ticks a case runs with the hero beside the walled-in pack, to show it keeps waiting. */
const SETTLE = 60;

/** A long wall east of the origin, with its face at `x = 400`. */
const LONG_WALL: Readonly<Rect> = {
  minX: 400,
  minY: -2000,
  maxX: 800,
  maxY: 2000,
};

/** A point just short of the wall's face, closer to it than one grunt body. */
const NEAR_WALL: Readonly<Vec2> = { x: 380, y: 0 };

/** A dormant pack of grunts in the pocket. */
const walledInPack: PackDef = {
  archetypeId: meleeGruntDef.id,
  tier: "normal",
  count: WALLED_IN_COUNT,
  position: WALLED_IN,
  dormant: true,
};

type Arranged = Readonly<{ world: Simulation; reader: EventReader }>;

/** A world on `map` with the hero at `HERO_AT`. */
const arrange = (map: MapDef): Arranged => {
  const world = makeWorld({ seed: 1, map });

  spawnHero(world, HERO_AT);

  return { world, reader: createEventReader() };
};

/** A pack of `count` of `archetypeId` at `position`, spawned from the panel, consumed by one tick. */
const spawnPack = (
  world: Simulation,
  archetypeId: string,
  count: number,
  position: Readonly<Vec2>,
): void => {
  submit(world, {
    kind: "spawn_pack",
    tick: world.view.tick,
    timestamp: world.view.tick,
    archetypeId,
    tier: "normal",
    count,
    position,
  });
  world.tick();
};

/** Retunes `key` to `value` from the panel, consumed by one tick. */
const retune = (world: Simulation, key: TuningKey, value: number): void => {
  submit(world, {
    kind: "set_tuning",
    tick: world.view.tick,
    timestamp: world.view.tick,
    key,
    value,
  });
  world.tick();
};

/** Every live unit wearing `archetypeId`, as positions and radii. */
const unitsOf = (
  world: Simulation,
  archetypeId: string,
): { x: number; y: number; radius: number }[] => {
  const found: { x: number; y: number; radius: number }[] = [];
  const units = world.view.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.definitionId === archetypeId) {
      found.push({
        x: unit.curr.x,
        y: unit.curr.y,
        radius: unit.collisionRadius,
      });
    }
  }

  return found;
};

/** Every refusal reason the reader has not seen, advancing it past everything. */
const reasons = (world: Simulation, reader: EventReader): string[] => {
  const found: string[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "command_refused") {
      found.push(String(event.reason));
    }

    event = world.events.read(reader);
  }

  return found;
};

/** Whether a disc of `radius` at (`x`, `y`) reaches into `rect`. */
const overlapsRect = (
  x: number,
  y: number,
  radius: number,
  rect: Readonly<Rect>,
): boolean => {
  const dx = x - Math.min(Math.max(x, rect.minX), rect.maxX);
  const dy = y - Math.min(Math.max(y, rect.minY), rect.maxY);

  return dx * dx + dy * dy < radius * radius;
};

describe("a pack's placement search", () => {
  it("defaults to a radius that holds a pack of the cap's largest bodies on open ground", () => {
    const rings = Math.floor(
      tuningTable.pack_placement_radius /
        (tankDef.body.collisionRadius + tankDef.body.collisionRadius),
    );
    const side = rings + rings + 1;

    expect(side * side).toBeGreaterThanOrEqual(ENEMY_LIVE_CAP);
  });

  it("stops at the placement radius: a pack whose room lies past it is refused, and none of it spawns", () => {
    const { world, reader } = arrange(makeMapDef.build({ obstacles: BOX }));

    spawnPack(world, meleeGruntDef.id, WALLED_IN_COUNT, WALLED_IN);

    expect(unitsOf(world, meleeGruntDef.id)).toHaveLength(0);
    expect(reasons(world, reader)).toEqual(["no_free_cells"]);
  });

  it("finds that room once the radius is retuned past the walls, and takes no cell beyond the radius", () => {
    const { world, reader } = arrange(makeMapDef.build({ obstacles: BOX }));

    retune(world, "pack_placement_radius", WIDE_RADIUS);
    spawnPack(world, meleeGruntDef.id, WALLED_IN_COUNT, WALLED_IN);

    const pack = unitsOf(world, meleeGruntDef.id);

    expect(reasons(world, reader)).toEqual([]);
    expect(pack).toHaveLength(WALLED_IN_COUNT);

    for (const unit of pack) {
      expect(Math.abs(unit.x - WALLED_IN.x)).toBeLessThanOrEqual(WIDE_RADIUS);
      expect(Math.abs(unit.y - WALLED_IN.y)).toBeLessThanOrEqual(WIDE_RADIUS);
    }
  });
});

describe("a walled-in dormant pack", () => {
  it("keeps waiting on every tick the hero is near, spawning nothing", () => {
    const { world } = arrange(
      makeMapDef.build({ obstacles: BOX, packs: [walledInPack] }),
    );

    for (let tick = 0; tick < SETTLE; tick += 1) {
      world.tick();
    }

    expect(unitsOf(world, meleeGruntDef.id)).toHaveLength(0);
    expect(world.state.map.packs.map((pack) => pack.waiting)).toEqual([true]);
  });

  it("is placed on the tick after the radius is retuned past its walls", () => {
    const { world } = arrange(
      makeMapDef.build({ obstacles: BOX, packs: [walledInPack] }),
    );

    world.tick();
    retune(world, "pack_placement_radius", WIDE_RADIUS);

    expect(unitsOf(world, meleeGruntDef.id)).toHaveLength(WALLED_IN_COUNT);
    expect(world.state.map.packs.map((pack) => pack.waiting)).toEqual([false]);
  });
});

describe("a pack spawned from the panel near a wall", () => {
  it.each([
    [meleeGruntDef.id, 20],
    [tankDef.id, 20],
  ])(
    "places %s whole, every member clear of the wall",
    (archetypeId, count) => {
      const { world, reader } = arrange(
        makeMapDef.build({ obstacles: [LONG_WALL] }),
      );

      spawnPack(world, archetypeId, count, NEAR_WALL);

      const pack = unitsOf(world, archetypeId);

      expect(reasons(world, reader)).toEqual([]);
      expect(pack).toHaveLength(count);

      for (const unit of pack) {
        expect(overlapsRect(unit.x, unit.y, unit.radius, LONG_WALL)).toBe(
          false,
        );
      }
    },
  );
});
