import { describe, expect, it } from "vitest";
import {
  contentRegistry,
  fastRunnerDef,
  meleeGruntDef,
  rangedArcherDef,
  tankDef,
  tuningTable,
} from "@content/public";
import type { DamageType, DomainEvent, Unit } from "@domain/public";
import { applyDamage, holdsStatus, modifiedValue } from "@domain/public";
import type { EntityId, Vec2 } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The four archetypes content ships, by the ids it registers them under. */
const GRUNT = meleeGruntDef.id;
const RUNNER = fastRunnerDef.id;
const ARCHER = rangedArcherDef.id;
const TANK = tankDef.id;

type Archetype = typeof GRUNT | typeof RUNNER | typeof ARCHER | typeof TANK;

const ARCHETYPES: readonly Archetype[] = [GRUNT, RUNNER, ARCHER, TANK];

/** Ticks a second, which a rate is landed in pieces of. */
const SIM_HZ = tuningTable.sim_hz;

/** Where the target stands: in front of the hero, inside every spell's range and the spirit's acquire radius. */
const TARGET_AT: Readonly<Vec2> = { x: 500, y: 0 };

/** Straight ahead, which is where the hero already faces: the bearing a direction spell is aimed along. */
const AHEAD: Readonly<Vec2> = { x: 4000, y: 0 };

/** Where a pack is spawned: in front of the hero, inside the cone, the updraft's path, and the wall's reach. */
const PACK_AT: Readonly<Vec2> = { x: 600, y: 0 };
const PACK_COUNT = 3;

/** Where Glacier's wall is pressed, between the pack and the hero, and dragged across the pack's path. */
const WALL_AT: Readonly<Vec2> = { x: 300, y: 0 };
const WALL_DRAG = 400;

/** The index of the prepared entry slot D throws. */
const FIRST_PREPARED = 0;

/** The first orb level and the cap, which every case below is cast at. */
const FIRST_LEVEL = 1;
const CAP_LEVEL = 7;

/** A hit the spec lands only to wake Hoarfrost's hook, pure so no armour reads it. */
const NUDGE = 1;

/** Decimals a landed amount is compared to: far below what a health bar shows. */
const PLACES = 5;

/** Long enough for any walk, cast, delay, or flight below. */
const PATIENCE = 600;

/** Glacier's slow at Quartz level one, as the fraction it takes off. */
const GLACIER_SLOW_AT_FIRST = 0.2;

/** Clarion at the cap: the magical damage its Quartz table gives, and what lands of it through the tank's 0.25. */
const CLARION_AT_CAP = 280;
const CLARION_ON_TANK_AT_CAP = 210;

/** How many of the spirit's shots the fight with a grunt waits for. */
const SPIRIT_SHOTS = 3;

/**
 * The content registry with each archetype driven by the stationary behaviour, so it stands on
 * its mark and never engages while the matrix lands hits on it. Health, armour, and magic
 * resistance are the archetype's own: those are what the matrix reads.
 */
const heldStill = makeRegistry({
  enemies: contentRegistry.enemies.map((def) => ({
    ...def,
    behaviour: "stationary",
  })),
});

/** The content registry as it ships, with no wander, so an idle enemy stands on its mark. */
const live = makeRegistry({ tuning: { wander_radius: 0 } });

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  reader: EventReader;
}>;

/**
 * The hero at the origin facing +X with every orb at `level`, and the panel's infinite mana and
 * no cooldowns on, so any spell can be cast as often as a case asks.
 */
const arrange = (registry = heldStill, level = FIRST_LEVEL): Arranged => {
  const world = makeWorld({ seed: 1, registry });
  const hero = spawnHero(world, { orbLevels: [level, level, level] });

  submit(world, {
    kind: "toggle_infinite_mana",
    tick: world.view.tick,
    timestamp: world.view.tick,
  });
  submit(world, {
    kind: "toggle_no_cooldowns",
    tick: world.view.tick,
    timestamp: world.view.tick,
  });
  world.tick();

  return {
    world,
    hero,
    heroId: unitIdOf(world, hero),
    reader: createEventReader(),
  };
};

type CastTarget =
  | Readonly<{ kind: "none" }>
  | Readonly<{ kind: "point"; position: Readonly<Vec2> }>
  | Readonly<{ kind: "direction"; position: Readonly<Vec2> }>
  | Readonly<{ kind: "unit"; unitId: EntityId }>
  | Readonly<{
      kind: "vector";
      position: Readonly<Vec2>;
      end: Readonly<Vec2>;
    }>;

/** Prepares `abilityId` on D and casts it at `target`, as D and the confirming click do. */
const cast = (
  world: Simulation,
  abilityId: string,
  target: CastTarget,
): void => {
  const form = world.state.run.forms[0];

  if (form === undefined) {
    throw new Error("The hero has a form");
  }

  form.kit.prepared[FIRST_PREPARED] = abilityId;
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId,
    target,
  });
};

/** Every hit on `unitId` the reader has not seen, advancing it past everything. */
const hitsOn = (
  world: Simulation,
  reader: EventReader,
  unitId: EntityId,
): DomainEvent[] => {
  const found: DomainEvent[] = [];

  for (
    let event = world.events.read(reader);
    event !== null;
    event = world.events.read(reader)
  ) {
    if (event.kind === "unit_damaged" && event.unitId === unitId) {
      found.push({ ...event });
    }
  }

  return found;
};

/**
 * Ticks until a hit on `unitId` of `type`, and from `sourceId` when one is named, lands, and
 * returns what it landed. Throws past the spec's patience, so a source that never lands fails
 * with a count.
 */
const firstHit = (
  world: Simulation,
  reader: EventReader,
  unitId: EntityId,
  type: DamageType,
  sourceId: EntityId | null = null,
): number => {
  let landed: number | null = null;

  tickUntil(
    world,
    () => {
      for (const hit of hitsOn(world, reader, unitId)) {
        if (
          landed === null &&
          hit.damageType === type &&
          (sourceId === null || hit.sourceId === sourceId)
        ) {
          landed = hit.amount;
        }
      }

      return landed !== null;
    },
    PATIENCE,
  );

  return landed ?? Number.NaN;
};

/** The one spirit Emberling stood, once it stands. */
const spiritOf = (world: Simulation): EntityId => {
  tickUntil(world, () => findSpirit(world) !== null, PATIENCE);

  const id = findSpirit(world);

  if (id === null) {
    throw new Error("The cast spawns a spirit");
  }

  return id;
};

const findSpirit = (world: Simulation): EntityId | null => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    if (units.at(index)?.definitionId === "emberling") {
      return units.idAt(index);
    }
  }

  return null;
};

/**
 * One source of damage the matrix lands on a target standing at `TARGET_AT`: how it is
 * delivered, and what it lands. A rate is landed in per-tick pieces, so it is read back as
 * the amount a second, which is what the catalogue writes.
 */
type Source = Readonly<{
  name: string;
  measure: (arranged: Arranged, targetId: EntityId) => number;
}>;

/** A hit landed a tick at a time, read as what it lands in a second. */
const perSecond = (amount: number): number => amount * SIM_HZ;

const SOURCES = {
  autoAttack: {
    name: "the hero's auto-attack, physical",
    measure: ({ world, reader, heroId }, targetId) => {
      submit(world, {
        kind: "attack_target",
        tick: world.view.tick,
        timestamp: world.view.tick,
        targetId,
      });

      return firstHit(world, reader, targetId, "physical", heroId);
    },
  },
  emberling: {
    name: "the spirit Emberling stands, physical",
    measure: ({ world, reader }, targetId) => {
      cast(world, "emberling", { kind: "none" });

      return firstHit(world, reader, targetId, "physical", spiritOf(world));
    },
  },
  bolideRoll: {
    name: "Bolide's roll, magical, a second",
    measure: ({ world, reader }, targetId) => {
      cast(world, "bolide", { kind: "point", position: TARGET_AT });

      return perSecond(firstHit(world, reader, targetId, "magical"));
    },
  },
  bolideBurn: {
    name: "Bolide's burn once the meteor has passed, magical, a second",
    measure: ({ world, reader }, targetId) => {
      cast(world, "bolide", { kind: "point", position: TARGET_AT });
      tickUntil(world, (view) => view.map.zones.count === 1, PATIENCE);
      tickUntil(world, (view) => view.map.zones.count === 0, PATIENCE);
      hitsOn(world, reader, targetId);

      return perSecond(firstHit(world, reader, targetId, "magical"));
    },
  },
  clarion: {
    name: "Clarion's cone, magical",
    measure: ({ world, reader }, targetId) => {
      cast(world, "clarion", { kind: "direction", position: AHEAD });

      return firstHit(world, reader, targetId, "magical");
    },
  },
  hoarfrost: {
    name: "Hoarfrost's hook on the next hit, magical",
    measure: ({ world, reader, heroId }, targetId) => {
      const target = world.state.map.units.resolve(targetId);

      cast(world, "hoarfrost", { kind: "unit", unitId: targetId });
      tickUntil(
        world,
        (view) =>
          target !== null &&
          holdsStatus(target.statuses, "hoarfrost", view.tick),
        PATIENCE,
      );
      applyDamage(world.state, targetId, NUDGE, "pure", heroId);

      return firstHit(world, reader, targetId, "magical");
    },
  },
  updraft: {
    name: "Updraft's drop, magical",
    measure: ({ world, reader }, targetId) => {
      cast(world, "updraft", { kind: "direction", position: AHEAD });

      return firstHit(world, reader, targetId, "magical");
    },
  },
  glacier: {
    name: "Glacier's chill, magical, a second",
    measure: ({ world, reader }, targetId) => {
      cast(world, "glacier", {
        kind: "vector",
        position: TARGET_AT,
        end: TARGET_AT,
      });

      return perSecond(firstHit(world, reader, targetId, "magical"));
    },
  },
  siphon: {
    name: "Siphon's burn, magical, for the mana it finds",
    measure: ({ world, reader }, targetId) => {
      cast(world, "siphon", { kind: "point", position: TARGET_AT });
      tickUntil(world, (view) => view.map.zones.count === 1, PATIENCE);
      tickUntil(world, (view) => view.map.zones.count === 0, PATIENCE);

      return hitsOn(world, reader, targetId)
        .filter((hit) => hit.damageType === "magical")
        .reduce((total, hit) => total + hit.amount, 0);
    },
  },
  zenith: {
    name: "Zenith's strike on one unit, pure",
    measure: ({ world, reader }, targetId) => {
      cast(world, "zenith", { kind: "point", position: TARGET_AT });

      return firstHit(world, reader, targetId, "pure");
    },
  },
} as const satisfies Record<string, Source>;

type SourceKey = keyof typeof SOURCES;

/**
 * What each source lands on each archetype at orb level one, from the catalogues: the hero's
 * attack 42 and the spirit's 22 through armour 2, 0, 1, and 8 on a curve of 0.06; Bolide's
 * roll 50 a second, its burn 10, Clarion 40, the hook 8, the drop 70, and the chill 6 through
 * magic resistance 0, 0, 0, and 0.25; Siphon half of the 100 mana it burns, on the archer alone,
 * since no other archetype carries mana; and Zenith 100, which nothing reduces.
 */
const MATRIX: Readonly<Record<SourceKey, Readonly<Record<Archetype, number>>>> =
  {
    autoAttack: {
      [GRUNT]: 37.5,
      [RUNNER]: 42,
      [ARCHER]: 39.622642,
      [TANK]: 28.378378,
    },
    emberling: {
      [GRUNT]: 19.642857,
      [RUNNER]: 22,
      [ARCHER]: 20.754717,
      [TANK]: 14.864865,
    },
    bolideRoll: { [GRUNT]: 50, [RUNNER]: 50, [ARCHER]: 50, [TANK]: 37.5 },
    bolideBurn: { [GRUNT]: 10, [RUNNER]: 10, [ARCHER]: 10, [TANK]: 7.5 },
    clarion: { [GRUNT]: 40, [RUNNER]: 40, [ARCHER]: 40, [TANK]: 30 },
    hoarfrost: { [GRUNT]: 8, [RUNNER]: 8, [ARCHER]: 8, [TANK]: 6 },
    updraft: { [GRUNT]: 70, [RUNNER]: 70, [ARCHER]: 70, [TANK]: 52.5 },
    glacier: { [GRUNT]: 6, [RUNNER]: 6, [ARCHER]: 6, [TANK]: 4.5 },
    siphon: { [GRUNT]: 0, [RUNNER]: 0, [ARCHER]: 50, [TANK]: 0 },
    zenith: { [GRUNT]: 100, [RUNNER]: 100, [ARCHER]: 100, [TANK]: 100 },
  };

const CELLS = (Object.keys(SOURCES) as SourceKey[]).flatMap((source) =>
  ARCHETYPES.map((archetype) => ({
    source,
    archetype,
    name: SOURCES[source].name,
    landed: MATRIX[source][archetype],
  })),
);

describe("the damage-type matrix", () => {
  it.each(CELLS)(
    "$name lands $landed on the $archetype",
    ({ source, archetype, landed }) => {
      const arranged = arrange();
      const target = spawnEnemy(arranged.world, {
        definitionId: archetype,
        x: TARGET_AT.x,
        y: TARGET_AT.y,
      });

      expect(
        SOURCES[source].measure(arranged, unitIdOf(arranged.world, target)),
      ).toBeCloseTo(landed, PLACES);
    },
  );
});

/** A pack of `count` of `archetypeId` around `position`, from the panel's door, and its members in pool order. */
const spawnPack = (
  world: Simulation,
  archetypeId: string,
  count: number,
  position: Readonly<Vec2>,
): Unit[] => {
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

  const units = world.state.map.units;
  const found: Unit[] = [];

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.definitionId === archetypeId) {
      found.push(unit);
    }
  }

  return found;
};

const gap = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
  Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y);

describe("the damage types against live archetypes", () => {
  it("leaves the tank standing under the Clarion that kills the runner beside it", () => {
    const { world, reader } = arrange(live, CAP_LEVEL);
    const runner = spawnEnemy(world, {
      definitionId: RUNNER,
      x: TARGET_AT.x,
      y: -60,
    });
    const tank = spawnEnemy(world, {
      definitionId: TANK,
      x: TARGET_AT.x,
      y: 60,
    });
    const tankId = unitIdOf(world, tank);

    cast(world, "clarion", { kind: "direction", position: AHEAD });

    const onTank = firstHit(world, reader, tankId, "magical");

    world.tick();

    expect(onTank).toBeCloseTo(CLARION_ON_TANK_AT_CAP, PLACES);
    expect(fastRunnerDef.health).toBeLessThan(CLARION_AT_CAP);
    expect(runner.state).toBe("dead");
    expect(tank.state).not.toBe("dead");
    expect(tank.resources.health).toBeGreaterThan(0);
  });

  it("lifts every member of a grunt pack Updraft passes through", () => {
    const { world } = arrange(live);
    const pack = spawnPack(world, GRUNT, PACK_COUNT, PACK_AT);
    const lifted = new Set<Unit>();

    cast(world, "updraft", { kind: "direction", position: AHEAD });
    tickUntil(
      world,
      () => {
        for (const grunt of pack) {
          if (grunt.disables.lifted) {
            lifted.add(grunt);
          }
        }

        return lifted.size === pack.length;
      },
      PATIENCE,
    );

    expect(pack).toHaveLength(PACK_COUNT);
    expect(lifted.size).toBe(PACK_COUNT);
  });

  it("pushes every member of a grunt pack in Clarion's cone away from the hero", () => {
    const { world, hero } = arrange(live);
    const pack = spawnPack(world, GRUNT, PACK_COUNT, PACK_AT);

    cast(world, "clarion", { kind: "direction", position: AHEAD });
    tickUntil(
      world,
      (view) =>
        pack.every((grunt) =>
          holdsStatus(grunt.statuses, "knockback", view.tick),
        ),
      PATIENCE,
    );

    const before = pack.map((grunt) => gap(grunt, hero));

    tickUntil(
      world,
      (view) =>
        pack.every(
          (grunt) => !holdsStatus(grunt.statuses, "knockback", view.tick),
        ),
      PATIENCE,
    );

    const after = pack.map((grunt) => gap(grunt, hero));

    expect(pack).toHaveLength(PACK_COUNT);
    after.forEach((distance, index) => {
      expect(distance).toBeGreaterThan(before[index] ?? Number.NaN);
    });
  });

  it("slows every member of a grunt pack that chases the hero through Glacier's wall", () => {
    const { world } = arrange(live);
    const pack = spawnPack(world, GRUNT, PACK_COUNT, PACK_AT);

    cast(world, "glacier", {
      kind: "vector",
      position: WALL_AT,
      end: { x: WALL_AT.x, y: WALL_AT.y + WALL_DRAG },
    });
    const chilled = new Set<Unit>();

    tickUntil(
      world,
      (view) => {
        for (const grunt of pack) {
          if (holdsStatus(grunt.statuses, "glacier_chill", view.tick)) {
            chilled.add(grunt);
          }
        }

        return chilled.size === pack.length;
      },
      PATIENCE,
    );
    world.tick();

    expect(pack).toHaveLength(PACK_COUNT);
    expect(
      pack.map((grunt) =>
        modifiedValue(
          meleeGruntDef.movementSpeed,
          grunt.modifiers,
          "movement_speed",
        ),
      ),
    ).toEqual(
      pack.map(() => meleeGruntDef.movementSpeed * (1 - GLACIER_SLOW_AT_FIRST)),
    );
  });

  it("has the spirit fight a grunt that aggroes, landing its attack through the grunt's armour", () => {
    const { world, reader } = arrange(live);
    const grunt = spawnEnemy(world, {
      definitionId: GRUNT,
      x: TARGET_AT.x,
      y: TARGET_AT.y,
    });
    const gruntId = unitIdOf(world, grunt);

    cast(world, "emberling", { kind: "none" });

    const spiritId = spiritOf(world);
    const landed: number[] = [];

    tickUntil(
      world,
      () => {
        for (const hit of hitsOn(world, reader, gruntId)) {
          if (hit.sourceId === spiritId) {
            landed.push(hit.amount);
          }
        }

        return landed.length === SPIRIT_SHOTS;
      },
      PATIENCE,
    );

    expect(grunt.ai.state).not.toBe("idle");
    expect(landed).toHaveLength(SPIRIT_SHOTS);
    landed.forEach((amount) => {
      expect(amount).toBeCloseTo(MATRIX.emberling[GRUNT], PLACES);
    });
  });
});
