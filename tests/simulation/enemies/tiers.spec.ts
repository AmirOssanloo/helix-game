import { describe, expect, it } from "vitest";
import { meleeGruntDef, tuningTable } from "@content/public";
import type { EnemyTier, TuningKey, Unit } from "@domain/public";
import { applyDamage, holdsAbility } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** Beside the hero: inside the slam's circle and the grunt's aggro radius. */
const BESIDE = { x: 150, y: 0 };

/** Inside the grunt's aggro radius and the charge's range, outside the slam's circle. */
const APART = { x: 500, y: 0 };

/** Outside the grunt's aggro radius, inside Hoarfrost's range, so it stands until it is hit. */
const AFAR = { x: 950, y: 0 };

/** Below the half of its maximum the boss's self-heal waits for. */
const WOUNDED = 0.4;

/** Long enough for a grunt to aggro, close, and choose whatever its tier lets it. */
const PATIENCE = 120;

/** Ticks enough for Hoarfrost's cast point and the commit behind it. */
const COMMIT_TICKS = 6;

/** The hit the spec lands by hand, pure so nothing mitigates it. */
const HIT = 10;

/** How long Hoarfrost's hook stuns whatever it hangs on, in ticks, at every Quartz level. */
const STUN_TICKS = 12;

/** The slot D throws, which the spec prepares Hoarfrost in. */
const FIRST_PREPARED = 0;

/** Every ability a grunt at each tier may cast, by id, and every one it may not. */
const TIER_ABILITIES: readonly (readonly [EnemyTier, readonly string[]])[] = [
  ["normal", []],
  ["elite", ["slam"]],
  ["boss", ["self_heal", "slam", "charge"]],
];

/** Every ability a grunt's tier could give it. */
const EVERY_TIER_ABILITY = ["slam", "self_heal", "charge"];

/** A world of the content's registry, with the hero at the origin and nothing wandering. */
const arrange = (): Simulation => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ tuning: { wander_radius: 0 } }),
  });

  spawnHero(world, { orbLevels: [1, 1, 1] });

  return world;
};

/** One grunt at `tier` at `position`, by the panel's door, consumed by one tick; returns it. */
const spawnGrunt = (
  world: Simulation,
  tier: EnemyTier,
  position: Readonly<{ x: number; y: number }>,
): Unit => {
  submit(world, {
    kind: "spawn_pack",
    tick: world.view.tick,
    timestamp: world.view.tick,
    archetypeId: meleeGruntDef.id,
    tier,
    count: 1,
    position,
  });
  world.tick();

  const units = world.state.map.units;

  for (let index = units.end - 1; index >= 0; index -= 1) {
    const unit = units.at(index);

    if (unit !== null && unit.definitionId === meleeGruntDef.id) {
      return unit;
    }
  }

  throw new Error("The pack spawned a grunt");
};

/** Retunes `key` to `value` by the panel's door, consumed by one tick. */
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

/** The first ability `unit` starts a cast of, ticking until it does, or `null` if it never does. */
const firstCast = (world: Simulation, unit: Readonly<Unit>): string | null => {
  for (let ticks = 0; ticks < PATIENCE; ticks += 1) {
    if (unit.cast.abilityId !== null) {
      return unit.cast.abilityId;
    }

    world.tick();
  }

  return null;
};

/** Every ability `unit` starts a cast of over the patience, in order, each once. */
const castsOver = (world: Simulation, unit: Readonly<Unit>): string[] => {
  const found: string[] = [];

  for (let ticks = 0; ticks < PATIENCE; ticks += 1) {
    const id = unit.cast.abilityId;

    if (id !== null && !found.includes(id)) {
      found.push(id);
    }

    world.tick();
  }

  return found;
};

describe("a tier's health", () => {
  it.each([
    ["normal", 1],
    ["elite", tuningTable.elite_health_multiplier],
    ["boss", tuningTable.boss_health_multiplier],
  ] as const)(
    "a %s grunt spawns at %d times the definition's health, full",
    (tier, multiplier) => {
      const world = arrange();
      const grunt = spawnGrunt(world, tier, AFAR);

      expect(grunt.tier).toBe(tier);
      expect(grunt.stats.maxHealth).toBe(meleeGruntDef.health * multiplier);
      expect(grunt.resources.health).toBe(grunt.stats.maxHealth);
    },
  );

  it("puts an elite at triple and a boss at ten times, as the tunables stand by default", () => {
    expect(tuningTable.elite_health_multiplier).toBe(3);
    expect(tuningTable.boss_health_multiplier).toBe(10);
  });

  it("reads a retuned multiplier at the next spawn and leaves a unit already standing as it was", () => {
    const world = arrange();
    const before = spawnGrunt(world, "boss", AFAR);

    retune(world, "boss_health_multiplier", 4);

    const after = spawnGrunt(world, "boss", { x: -AFAR.x, y: 0 });

    expect(before.stats.maxHealth).toBe(meleeGruntDef.health * 10);
    expect(after.stats.maxHealth).toBe(meleeGruntDef.health * 4);
  });
});

describe("a tier's abilities", () => {
  it.each(TIER_ABILITIES)(
    "a %s grunt holds its own list and exactly %j after it",
    (tier, held) => {
      const world = arrange();
      const grunt = spawnGrunt(world, tier, AFAR);

      for (const id of EVERY_TIER_ABILITY) {
        expect(holdsAbility(world.state, grunt, id)).toBe(held.includes(id));
      }
    },
  );

  it("a normal grunt beside the hero never slams", () => {
    const world = arrange();
    const grunt = spawnGrunt(world, "normal", BESIDE);

    expect(castsOver(world, grunt)).toEqual([]);
  });

  it("an elite grunt beside the hero slams, its one extra ability", () => {
    const world = arrange();
    const grunt = spawnGrunt(world, "elite", BESIDE);

    expect(firstCast(world, grunt)).toBe("slam");
  });

  it("an elite grunt apart from the hero neither heals nor charges; those are the boss's", () => {
    const world = arrange();
    const grunt = spawnGrunt(world, "elite", APART);

    expect(castsOver(world, grunt)).toEqual(["slam"]);
  });

  it("a boss beside the hero at full health slams: the self-heal waits for its fraction", () => {
    const world = arrange();
    const boss = spawnGrunt(world, "boss", BESIDE);

    expect(firstCast(world, boss)).toBe("slam");
  });

  it("a wounded boss the hero walks up to heals itself first, the first of its list whose condition holds", () => {
    const world = arrange();
    const boss = spawnGrunt(world, "boss", AFAR);

    boss.resources.health = boss.stats.maxHealth * WOUNDED;
    submit(world, {
      kind: "move",
      tick: world.view.tick,
      timestamp: world.view.tick,
      destination: { x: AFAR.x - BESIDE.x, y: 0 },
    });

    expect(firstCast(world, boss)).toBe("self_heal");
  });

  it("a boss apart from the hero charges it", () => {
    const world = arrange();
    const boss = spawnGrunt(world, "boss", APART);

    expect(firstCast(world, boss)).toBe("charge");
  });
});

describe("a tier changes no rule", () => {
  /** Prepares Hoarfrost on D and casts it at `targetId`, ticking until the target holds it. */
  const castHoarfrost = (
    world: Simulation,
    target: Readonly<Unit>,
    targetId: EntityId,
  ): void => {
    const form = world.state.run.forms[0];

    if (form === undefined) {
      throw new Error("The hero has a form");
    }

    form.kit.prepared[FIRST_PREPARED] = "hoarfrost";
    submit(world, {
      kind: "cast",
      tick: world.view.tick,
      timestamp: world.view.tick,
      abilityId: "hoarfrost",
      target: { kind: "unit", unitId: targetId },
    });
    tickUntil(
      world,
      () => target.statuses.some((row) => row.definitionId === "hoarfrost"),
      COMMIT_TICKS,
    );
  };

  it.each(["normal", "boss"] as const)(
    "Hoarfrost stuns a %s grunt for the same ticks on the hero's next hit",
    (tier) => {
      const world = arrange();
      const grunt = spawnGrunt(world, tier, AFAR);
      const gruntId = unitIdOf(world, grunt);
      const heroId = world.state.run.heroId;

      castHoarfrost(world, grunt, gruntId);
      applyDamage(world.state, gruntId, HIT, "pure", heroId);

      const stun = grunt.statuses.find((row) => row.definitionId === "stun");

      expect(stun?.endsAtTick).toBe(world.view.tick + STUN_TICKS);

      world.tick();

      expect(grunt.disables.stunned).toBe(true);
    },
  );
});
