import { describe, expect, it } from "vitest";
import {
  contentRegistry,
  impDef,
  meleeGruntDef,
  summonerDef,
  tuningTable,
} from "@content/public";
import type { MapDef, PackDef, Unit } from "@domain/public";
import { applyDamage } from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  beginReplay,
  contentVersionOf,
  createSessionWorld,
  isReplayRefusal,
  parseInputLogFile,
  serializeInputLog,
} from "@simulation/public";
import {
  makeMapDef,
  makeWorld,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** Where the pack stands: straight out along +X, past the sleep radius from the origin. */
const PACK_AT = { x: 3000, y: 0 };

/** How many grunts the pack holds. */
const PACK_COUNT = 3;

/** Inside the activation radius of the pack's point, outside a grunt's aggro radius. */
const NEAR = { x: PACK_AT.x - 1200, y: 0 };

/** Inside a grunt's aggro radius, so the pack fights. */
const IN_AGGRO = { x: PACK_AT.x - 500, y: 0 };

/** Far past the sleep radius, and past a grunt's leash, so a chase gives up. */
const FAR = { x: PACK_AT.x - 6000, y: 0 };

/** Health a hurt grunt is short of its maximum: a minute of its regeneration, longer than any walk below. */
const HURT = 60 * meleeGruntDef.healthRegen;

/** Long enough for any walk or rest below. */
const PATIENCE = 20 * 60 * tuningTable.sim_hz;

const gruntPack = (count: number): PackDef => ({
  archetypeId: meleeGruntDef.id,
  tier: "normal",
  count,
  position: PACK_AT,
  dormant: true,
});

const mapWith = (pack: PackDef): MapDef => makeMapDef.build({ packs: [pack] });

/** Every live unit wearing the definition `definitionId`, corpses included. */
const unitsOf = (world: Simulation, definitionId: string): Unit[] => {
  const units = world.state.map.units;
  const found: Unit[] = [];

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.definitionId === definitionId) {
      found.push(unit);
    }
  }

  return found;
};

const gruntsOf = (world: Simulation): Unit[] =>
  unitsOf(world, meleeGruntDef.id);

const heroOf = (world: Simulation): Unit => {
  const hero = world.state.map.units.resolve(world.state.run.heroId ?? -1);

  if (hero === null) {
    throw new Error("The session has a hero");
  }

  return hero;
};

const moveTo = (world: Simulation, point: { x: number; y: number }): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: point,
  });
};

/** Walks the hero to `point` and ticks until it arrives. */
const walkTo = (world: Simulation, point: { x: number; y: number }): void => {
  const hero = heroOf(world);

  moveTo(world, point);
  tickUntil(
    world,
    () => hero.curr.x === point.x && hero.curr.y === point.y,
    PATIENCE,
  );
};

const packOf = (world: Simulation) => {
  const pack = world.state.map.packs[0];

  if (pack === undefined) {
    throw new Error("The map lists one pack");
  }

  return pack;
};

/** A world on a map with `pack`, the hero at the origin, woken beside the pack. */
const arrangeAwake = (pack: PackDef): Simulation => {
  const world = makeWorld({ seed: 1, map: mapWith(pack) });

  spawnHero(world);
  walkTo(world, NEAR);

  return world;
};

describe("a pack placed from a map's record", () => {
  it("sleeps once the hero is past the sleep radius and its members rest, giving back every slot", () => {
    const world = arrangeAwake(gruntPack(PACK_COUNT));

    expect(packOf(world).state).toBe("awake");
    expect(gruntsOf(world)).toHaveLength(PACK_COUNT);

    walkTo(world, FAR);

    expect(packOf(world).state).toBe("asleep");
    expect(packOf(world).survivors).toBe(PACK_COUNT);
    expect(gruntsOf(world)).toHaveLength(0);
    expect(world.view.map.units.count).toBe(1);
  });

  it("stays awake while the hero is between the activation and the sleep radius", () => {
    const world = arrangeAwake(gruntPack(PACK_COUNT));
    const between = {
      x:
        PACK_AT.x -
        (tuningTable.pack_activation_radius + tuningTable.pack_sleep_radius) /
          2,
      y: 0,
    };

    walkTo(world, between);

    for (let tick = 0; tick < 120; tick += 1) {
      world.tick();
    }

    expect(packOf(world).state).toBe("awake");
  });

  it("wakes again with the survivors it slept with", () => {
    const world = arrangeAwake(gruntPack(PACK_COUNT));
    const fallen = gruntsOf(world)[0];

    if (fallen === undefined) {
      throw new Error("The pack stands");
    }

    fallen.resources.health = 0;
    walkTo(world, FAR);

    expect(packOf(world).state).toBe("asleep");
    expect(packOf(world).survivors).toBe(PACK_COUNT - 1);

    walkTo(world, NEAR);

    const grunts = gruntsOf(world);

    expect(packOf(world).state).toBe("awake");
    expect(grunts).toHaveLength(PACK_COUNT - 1);
    expect(grunts.map((grunt) => grunt.ai.state)).toEqual(["idle", "idle"]);
    expect(new Set(grunts.map((grunt) => grunt.packId)).size).toBe(1);
    expect(grunts[0]?.packId).toBe(packOf(world).packId);
  });

  it("fought and left, goes home and stays awake until it is home and whole, then sleeps", () => {
    const world = arrangeAwake(gruntPack(PACK_COUNT));
    const hero = heroOf(world);

    walkTo(world, IN_AGGRO);
    tickUntil(
      world,
      () => gruntsOf(world).every((grunt) => grunt.ai.state !== "idle"),
      PATIENCE,
    );

    for (const grunt of gruntsOf(world)) {
      grunt.resources.health = grunt.stats.maxHealth - HURT;
    }

    moveTo(world, FAR);

    const sleepReach = tuningTable.pack_sleep_radius;
    let sawAwayAndFar = false;
    let sawHurtAtHomeAndFar = false;

    tickUntil(
      world,
      () => {
        const pack = packOf(world);

        if (pack.state !== "awake") {
          return true;
        }

        const far =
          Math.hypot(hero.curr.x - PACK_AT.x, hero.curr.y - PACK_AT.y) >
          sleepReach;
        const grunts = gruntsOf(world);

        if (far && grunts.some((grunt) => grunt.ai.state !== "idle")) {
          sawAwayAndFar = true;
        }

        if (
          far &&
          grunts.every((grunt) => grunt.ai.state === "idle") &&
          grunts.some((grunt) => grunt.resources.health < grunt.stats.maxHealth)
        ) {
          sawHurtAtHomeAndFar = true;
        }

        return false;
      },
      PATIENCE,
    );

    expect(sawAwayAndFar).toBe(true);
    expect(sawHurtAtHomeAndFar).toBe(true);
    expect(packOf(world).state).toBe("asleep");
    expect(packOf(world).survivors).toBe(PACK_COUNT);
  });

  it("woken by a hit on its way home, fights again, then sleeps whole with no leash heal", () => {
    const world = arrangeAwake(gruntPack(PACK_COUNT));
    const heroId = world.state.run.heroId;

    if (heroId === null) {
      throw new Error("The session has a hero");
    }

    walkTo(world, IN_AGGRO);
    tickUntil(
      world,
      () => gruntsOf(world).every((grunt) => grunt.ai.state !== "idle"),
      PATIENCE,
    );

    const grunts = gruntsOf(world);

    for (const grunt of grunts) {
      grunt.resources.health = grunt.stats.maxHealth - HURT;
    }

    moveTo(world, FAR);
    tickUntil(
      world,
      () => grunts.every((grunt) => grunt.ai.state === "return"),
      PATIENCE,
    );

    const [struck] = grunts;

    if (struck === undefined) {
      throw new Error("The pack stands");
    }

    applyDamage(world.state, unitIdOf(world, struck), 1, "pure", heroId);
    world.tick();

    expect(grunts.map((grunt) => grunt.ai.state)).toEqual(
      grunts.map(() => "chase"),
    );
    expect(
      grunts.every((grunt) => grunt.resources.health < grunt.stats.maxHealth),
    ).toBe(true);

    const perTick = meleeGruntDef.healthRegen / tuningTable.sim_hz;
    let before = grunts.map((grunt) => grunt.resources.health);
    let largestGain = 0;

    tickUntil(
      world,
      () => {
        if (packOf(world).state !== "awake") {
          return true;
        }

        grunts.forEach((grunt, member) => {
          largestGain = Math.max(
            largestGain,
            grunt.resources.health - (before[member] ?? 0),
          );
        });
        before = grunts.map((grunt) => grunt.resources.health);

        return false;
      },
      PATIENCE,
    );

    expect(largestGain).toBeLessThanOrEqual(perTick + 1e-9);
    expect(packOf(world).state).toBe("asleep");
    expect(packOf(world).survivors).toBe(PACK_COUNT);
  });

  it("does not sleep while a member resting at home is hurt", () => {
    const world = arrangeAwake(gruntPack(PACK_COUNT));
    const hurt = gruntsOf(world)[1];

    if (hurt === undefined) {
      throw new Error("The pack stands");
    }

    hurt.resources.health = hurt.stats.maxHealth - HURT;
    walkTo(world, FAR);

    expect(hurt.ai.state).toBe("idle");
    expect(hurt.resources.health).toBeLessThan(hurt.stats.maxHealth);
    expect(packOf(world).state).toBe("awake");

    tickUntil(world, () => packOf(world).state === "asleep", PATIENCE);

    expect(packOf(world).survivors).toBe(PACK_COUNT);
  });

  it("with no member left is dead for the map, and never comes back", () => {
    const world = arrangeAwake(gruntPack(PACK_COUNT));

    for (const grunt of gruntsOf(world)) {
      grunt.resources.health = 0;
    }

    walkTo(world, FAR);

    expect(packOf(world).state).toBe("dead");

    walkTo(world, NEAR);
    world.tick();

    expect(packOf(world).state).toBe("dead");
    expect(gruntsOf(world)).toHaveLength(0);
  });

  it("does not keep a summoner's adds: they go with it, and a waking brings the summoner alone", () => {
    const world = makeWorld({
      seed: 1,
      map: mapWith({ ...gruntPack(1), archetypeId: summonerDef.id }),
    });

    spawnHero(world);
    walkTo(world, IN_AGGRO);
    tickUntil(world, () => unitsOf(world, impDef.id).length > 0, PATIENCE);

    expect(unitsOf(world, impDef.id).length).toBeGreaterThan(0);

    moveTo(world, FAR);
    tickUntil(world, () => packOf(world).state === "asleep", PATIENCE);

    expect(packOf(world).survivors).toBe(1);
    expect(unitsOf(world, summonerDef.id)).toHaveLength(0);
    expect(unitsOf(world, impDef.id)).toHaveLength(0);

    walkTo(world, NEAR);

    expect(unitsOf(world, summonerDef.id)).toHaveLength(1);
    expect(unitsOf(world, impDef.id)).toHaveLength(0);
  });

  it("sleeps and wakes on the records and slots the map load made, allocating nothing", () => {
    const world = arrangeAwake(gruntPack(PACK_COUNT));
    const records = world.state.map.packs;
    const record = packOf(world);
    const capacity = world.state.map.units.capacity;

    walkTo(world, FAR);
    walkTo(world, NEAR);
    walkTo(world, FAR);

    expect(world.state.map.packs).toBe(records);
    expect(packOf(world)).toBe(record);
    expect(world.state.map.units.capacity).toBe(capacity);
    expect(record.state).toBe("asleep");
  });
});

describe("a pack spawned from the panel", () => {
  it("has no record, and never sleeps", () => {
    const world = makeWorld({ seed: 1 });
    const hero = spawnHero(world);

    submit(world, {
      kind: "spawn_pack",
      tick: world.view.tick,
      timestamp: world.view.tick,
      archetypeId: meleeGruntDef.id,
      tier: "normal",
      count: PACK_COUNT,
      position: PACK_AT,
    });
    world.tick();
    walkTo(world, FAR);

    for (let tick = 0; tick < 120; tick += 1) {
      world.tick();
    }

    expect(world.state.map.packs).toHaveLength(0);
    expect(hero.curr).toEqual(FAR);
    expect(gruntsOf(world)).toHaveLength(PACK_COUNT);
  });
});

describe("a session where a pack sleeps and wakes", () => {
  it("replays to the state the recording ended in", () => {
    const map = mapWith(gruntPack(PACK_COUNT));
    const recorder = createSessionWorld({
      seed: 9,
      registry: contentRegistry,
      map,
    });

    walkTo(recorder, NEAR);
    walkTo(recorder, FAR);
    walkTo(recorder, NEAR);

    for (let tick = 0; tick < 60; tick += 1) {
      recorder.tick();
    }

    const file = parseInputLogFile(
      serializeInputLog(
        recorder.view,
        recorder.log,
        contentVersionOf(contentRegistry),
        [],
      ),
    );

    if (isReplayRefusal(file)) {
      throw new Error(file.message);
    }

    const replay = beginReplay(file, { registry: contentRegistry, map });

    if (isReplayRefusal(replay)) {
      throw new Error(replay.message);
    }

    while (!replay.done) {
      replay.tick();
    }

    const positionsOf = (units: Simulation["view"]["map"]["units"]) => {
      const found: { x: number; y: number; packId: number | null }[] = [];

      for (let index = 0; index < units.end; index += 1) {
        const unit = units.at(index);

        if (unit !== null) {
          found.push({ x: unit.curr.x, y: unit.curr.y, packId: unit.packId });
        }
      }

      return found;
    };

    expect(replay.view.tick).toBe(recorder.view.tick);
    expect(replay.view.map.packs).toEqual(recorder.view.map.packs);
    expect(positionsOf(replay.view.map.units)).toEqual(
      positionsOf(recorder.view.map.units),
    );
    expect(recorder.view.map.packs[0]?.state).toBe("awake");
  });
});
