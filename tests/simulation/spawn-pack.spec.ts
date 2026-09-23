import { describe, expect, it } from "vitest";
import {
  fastRunnerDef,
  meleeGruntDef,
  tankDef,
  trainingDummyDef,
} from "@content/public";
import type { DebugCommand, EnemyTier } from "@domain/public";
import { ENEMY_LIVE_CAP, UNIT_CAPACITY } from "@domain/public";
import type { Rect } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeMapDef,
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
} from "../helpers";

/** A block standing east of the hero, big enough that a point in its middle is several bodies from any edge. */
const BLOCK: Readonly<Rect> = { minX: 800, minY: -400, maxX: 1600, maxY: 400 };

/** The middle of the block: a point no body can stand on. */
const INSIDE_BLOCK = { x: 1200, y: 0 };

/** Open ground west of the hero, clear of the block. */
const OPEN_GROUND = { x: -1200, y: 0 };

/** A map too small to hold a large pack: a square a few bodies across. */
const CRAMPED_REACH = 96;

type Arranged = Readonly<{ world: Simulation; reader: EventReader }>;

/** A unit as the world view hands it out. */
type UnitView = NonNullable<
  ReturnType<Simulation["view"]["map"]["units"]["at"]>
>;

/** A world with the hero at the origin on a map with the block, or on the map it is given. */
const arrange = (map = makeMapDef.build({ obstacles: [BLOCK] })): Arranged => {
  const world = makeWorld({ seed: 1, registry: makeRegistry(), map });

  spawnHero(world);

  return { world, reader: createEventReader() };
};

/** A pack of `count` of `archetypeId` at `position`, stamped for the next tick, consumed by one tick. */
const spawnPack = (
  world: Simulation,
  archetypeId: string,
  count: number,
  position: Readonly<{ x: number; y: number }>,
  tier: EnemyTier = "normal",
): void => {
  submit(world, {
    kind: "spawn_pack",
    tick: world.view.tick,
    timestamp: world.view.tick,
    archetypeId,
    tier,
    count,
    position,
  });
  world.tick();
};

/** A payload-free debug command, consumed by one tick. */
const run = (
  world: Simulation,
  kind: "kill_all" | "clear_all" | "reset_map",
): void => {
  submit(world, {
    kind,
    tick: world.view.tick,
    timestamp: world.view.tick,
  } as DebugCommand);
  world.tick();
};

/** Every live unit wearing `archetypeId`. */
const unitsOf = (world: Simulation, archetypeId: string): UnitView[] => {
  const found: UnitView[] = [];
  const units = world.view.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.definitionId === archetypeId) {
      found.push(unit);
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

/** Whether the unit's disc reaches into `rect`. */
const overlapsRect = (unit: UnitView, rect: Readonly<Rect>): boolean => {
  const nearestX = Math.min(Math.max(unit.curr.x, rect.minX), rect.maxX);
  const nearestY = Math.min(Math.max(unit.curr.y, rect.minY), rect.maxY);
  const dx = unit.curr.x - nearestX;
  const dy = unit.curr.y - nearestY;

  return dx * dx + dy * dy < unit.collisionRadius * unit.collisionRadius;
};

/** Whether any two of `units` overlap, by a hair past touching. */
const anyOverlap = (units: readonly UnitView[]): boolean => {
  for (let first = 0; first < units.length; first += 1) {
    for (let second = first + 1; second < units.length; second += 1) {
      const a = units[first];
      const b = units[second];

      if (a === undefined || b === undefined) {
        continue;
      }

      const reach = a.collisionRadius + b.collisionRadius - 1e-6;
      const dx = a.curr.x - b.curr.x;
      const dy = a.curr.y - b.curr.y;

      if (dx * dx + dy * dy < reach * reach) {
        return true;
      }
    }
  }

  return false;
};

describe("spawn_pack placement", () => {
  it("puts every member on its own free cell, wearing the archetype, standing on its spawn point", () => {
    const { world } = arrange();

    spawnPack(world, meleeGruntDef.id, 5, OPEN_GROUND);

    const pack = unitsOf(world, meleeGruntDef.id);

    expect(pack).toHaveLength(5);
    expect(anyOverlap(pack)).toBe(false);

    for (const unit of pack) {
      expect(unit.kind).toBe("enemy");
      expect(unit.collisionRadius).toBe(meleeGruntDef.body.collisionRadius);
      expect(unit.resources.health).toBe(meleeGruntDef.health);
      expect(unit.spawnPoint).toEqual(unit.curr);
    }
  });

  it("lands a pack of twenty aimed inside an obstacle on free cells, none of them in it", () => {
    const { world } = arrange();

    spawnPack(world, meleeGruntDef.id, 20, INSIDE_BLOCK);

    const pack = unitsOf(world, meleeGruntDef.id);

    expect(pack).toHaveLength(20);
    expect(anyOverlap(pack)).toBe(false);

    for (const unit of pack) {
      expect(overlapsRect(unit, BLOCK)).toBe(false);
    }
  });

  it("keeps clear of a unit already standing where it is aimed", () => {
    const { world } = arrange();
    const heroId = world.view.run.heroId;
    const hero = heroId === null ? null : world.view.map.units.resolve(heroId);

    spawnPack(world, tankDef.id, 9, { x: 0, y: 0 });

    const pack = unitsOf(world, tankDef.id);

    expect(hero).not.toBeNull();
    expect(pack).toHaveLength(9);
    expect(anyOverlap(hero === null ? pack : [hero, ...pack])).toBe(false);
  });

  it("refuses a pack the map has too few free cells for, and spawns none of it", () => {
    const { world, reader } = arrange(
      makeMapDef.build({
        bounds: {
          minX: -CRAMPED_REACH,
          minY: -CRAMPED_REACH,
          maxX: CRAMPED_REACH,
          maxY: CRAMPED_REACH,
        },
      }),
    );

    spawnPack(world, meleeGruntDef.id, 50, { x: 0, y: 0 });

    expect(unitsOf(world, meleeGruntDef.id)).toHaveLength(0);
    expect(reasons(world, reader)).toContain("no_free_cells");
  });
});

describe("spawn_pack ids and tiers", () => {
  it("gives one pack one id and the next pack another", () => {
    const { world } = arrange();

    spawnPack(world, meleeGruntDef.id, 3, OPEN_GROUND);
    spawnPack(world, fastRunnerDef.id, 3, { x: 0, y: 1200 });

    const grunts = new Set(
      unitsOf(world, meleeGruntDef.id).map((u) => u.packId),
    );
    const runners = new Set(
      unitsOf(world, fastRunnerDef.id).map((u) => u.packId),
    );

    expect(grunts.size).toBe(1);
    expect(runners.size).toBe(1);
    expect([...grunts][0]).not.toBeNull();
    expect([...grunts][0]).not.toBe([...runners][0]);
  });

  it("counts pack ids from zero again after the map is reset", () => {
    const { world } = arrange();

    spawnPack(world, meleeGruntDef.id, 2, OPEN_GROUND);
    spawnPack(world, meleeGruntDef.id, 2, { x: 0, y: 1200 });
    run(world, "reset_map");
    spawnPack(world, meleeGruntDef.id, 2, OPEN_GROUND);

    expect(unitsOf(world, meleeGruntDef.id).map((u) => u.packId)).toEqual([
      0, 0,
    ]);
  });

  it("writes the tier the command names on every member", () => {
    const { world } = arrange();

    spawnPack(world, meleeGruntDef.id, 3, OPEN_GROUND, "elite");

    expect(unitsOf(world, meleeGruntDef.id).map((u) => u.tier)).toEqual([
      "elite",
      "elite",
      "elite",
    ]);
  });

  it("refuses an archetype the registry does not hold", () => {
    const { world, reader } = arrange();
    const before = world.view.map.units.count;

    spawnPack(world, "no_such_archetype", 3, OPEN_GROUND);

    expect(world.view.map.units.count).toBe(before);
    expect(reasons(world, reader)).toContain("unknown_archetype");
  });
});

describe("the live enemy cap", () => {
  it("takes packs up to the cap and refuses the one enemy past it, naming the cap as the reason", () => {
    const { world, reader } = arrange();

    spawnPack(world, fastRunnerDef.id, ENEMY_LIVE_CAP, OPEN_GROUND);

    expect(unitsOf(world, fastRunnerDef.id)).toHaveLength(ENEMY_LIVE_CAP);
    expect(reasons(world, reader)).toEqual([]);

    spawnPack(world, fastRunnerDef.id, 1, { x: 0, y: 2000 });

    expect(unitsOf(world, fastRunnerDef.id)).toHaveLength(ENEMY_LIVE_CAP);
    expect(reasons(world, reader)).toEqual(["enemy_cap_reached"]);
  });

  it("refuses a pack that would pass the cap whole, spawning none of it", () => {
    const { world, reader } = arrange();

    spawnPack(world, fastRunnerDef.id, ENEMY_LIVE_CAP - 2, OPEN_GROUND);
    spawnPack(world, meleeGruntDef.id, 3, { x: 0, y: 2000 });

    expect(unitsOf(world, meleeGruntDef.id)).toHaveLength(0);
    expect(reasons(world, reader)).toEqual(["enemy_cap_reached"]);
  });

  it("does not count the plain bodies the stress test spawns", () => {
    const { world, reader } = arrange();

    submit(world, {
      kind: "spawn_units",
      tick: world.view.tick,
      timestamp: world.view.tick,
      count: 300,
      position: { x: 0, y: -3000 },
    });
    world.tick();
    spawnPack(world, fastRunnerDef.id, ENEMY_LIVE_CAP, OPEN_GROUND);

    expect(unitsOf(world, fastRunnerDef.id)).toHaveLength(ENEMY_LIVE_CAP);
    expect(reasons(world, reader)).toEqual([]);
  });

  it("still refuses a pack the pool has no room for", () => {
    const { world, reader } = arrange();

    submit(world, {
      kind: "spawn_units",
      tick: world.view.tick,
      timestamp: world.view.tick,
      count: UNIT_CAPACITY - 1 - 2,
      position: { x: 0, y: -3000 },
    });
    world.tick();
    spawnPack(world, meleeGruntDef.id, 3, OPEN_GROUND);

    expect(unitsOf(world, meleeGruntDef.id)).toHaveLength(0);
    expect(reasons(world, reader)).toEqual(["pool_full"]);
  });
});

describe("kill_all and clear_all", () => {
  it("kills every enemy that can die, leaves the dummy and the hero standing", () => {
    const { world } = arrange();

    spawnPack(world, meleeGruntDef.id, 4, OPEN_GROUND);
    spawnPack(world, trainingDummyDef.id, 1, { x: 0, y: 1200 });
    run(world, "kill_all");

    const heroId = world.view.run.heroId;
    const hero = heroId === null ? null : world.view.map.units.resolve(heroId);

    expect(unitsOf(world, meleeGruntDef.id).map((u) => u.state)).toEqual([
      "dead",
      "dead",
      "dead",
      "dead",
    ]);
    expect(
      unitsOf(world, trainingDummyDef.id).map((u) => u.state),
    ).not.toContain("dead");
    expect(hero?.state).not.toBe("dead");
  });

  it("clears every enemy without a death", () => {
    const { world } = arrange();

    spawnPack(world, meleeGruntDef.id, 4, OPEN_GROUND);
    run(world, "clear_all");

    expect(unitsOf(world, meleeGruntDef.id)).toHaveLength(0);
    expect(world.view.map.units.count).toBe(1);
  });
});
