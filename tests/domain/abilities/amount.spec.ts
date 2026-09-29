import { describe, expect, it } from "vitest";
import type { ContentTuningCommand, ContentTuningKey } from "@content/public";
import { tuningTable } from "@content/public";
import type { Amount, DamageAreaEffectDef, StatusDef } from "@domain/public";
import {
  amountAtLevels,
  createStatusTable,
  effectsPerTick,
  runPrimitive,
} from "@domain/rules";
import type { Vec2 } from "@shared/public";
import type { Simulation } from "@simulation/testing";
import {
  makeCast,
  makeStatusDef,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
} from "../../helpers";

/** An amount of 100 at the first Quartz level and 160 at the second, with 12 more per caster level. */
const AMOUNT: Amount = { orb: "quartz", byLevel: [100, 160], perLevel: 12 };

/** The step rate a per-second amount is divided by: the content table's. */
const SIM_HZ = tuningTable.sim_hz;

/** The health a dummy stands on: far above anything dealt below. */
const DUMMY_HEALTH = 10_000;

/** The spell the pipeline cases cast: a point strike whose zone lands its pure damage after a delay. */
const ZENITH = "zenith";

/** Zenith's strike at the first Ember level, which every orb holds in the pipeline cases. */
const ZENITH_BASE = 100;

/** The per-level term the pipeline cases give Zenith's strike, through the tuning command. */
const ZENITH_PER_LEVEL = 10;

/** The key of that term: the strike's amount inside the zone's activation list. */
const ZENITH_PER_LEVEL_KEY: ContentTuningKey =
  "def:spell:zenith:effects.0.onActivate.0.amount.perLevel";

/** Where the strike is aimed, with the dummy standing on it. */
const STRIKE: Readonly<Vec2> = { x: 600, y: 0 };

/** The index of the prepared entry slot D throws. */
const FIRST_PREPARED = 0;

/** Ticks enough for a cast point and the commit behind it. */
const COMMIT_TICKS = 6;

/** Ticks enough for the strike's delay to end after the commit. */
const LANDING_TICKS = 120;

/** A pure hit of `amount` on whatever the context targets. */
const hitOf = (amount: Amount): DamageAreaEffectDef => ({
  kind: "damage_area",
  target: { kind: "target" },
  damageType: "pure",
  amount,
  rate: "once",
  split: false,
});

type Arranged = { world: Simulation; dummyHealth: () => number };

/**
 * The hero at the origin at hero level `level`, every orb at the first level and Zenith on D,
 * its strike given a per-level term by the tuning command, and a dummy where it lands.
 */
const arrangeZenith = (level: number): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
  const dummy = spawnUnit(world, {
    x: STRIKE.x,
    y: STRIKE.y,
    health: DUMMY_HEALTH,
  });
  const form = world.state.run.forms[0];

  if (form === undefined) {
    throw new Error("The hero has a form");
  }

  form.kit.prepared[FIRST_PREPARED] = ZENITH;
  hero.progression.level = level;

  const retune: ContentTuningCommand = {
    kind: "set_tuning",
    tick: 0,
    timestamp: 0,
    key: ZENITH_PER_LEVEL_KEY,
    value: ZENITH_PER_LEVEL,
  };

  submit(world, retune);
  world.tick();

  return { world, dummyHealth: () => dummy.resources.health };
};

/** Presses D and clicks the strike's point. */
const castZenith = (world: Simulation): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: ZENITH,
    target: { kind: "point", position: STRIKE },
  });
};

/** Sets the hero's level, as a level gained mid-fight would. */
const setHeroLevel = (world: Simulation, level: number): void => {
  const heroId = world.state.run.heroId;
  const hero = heroId === null ? null : world.state.map.units.resolve(heroId);

  if (hero === null) {
    throw new Error("The hero is on the map");
  }

  hero.progression.level = level;
};

describe("an amount's per-level term", () => {
  it("adds perLevel times the caster's level to the table, at two levels", () => {
    expect(amountAtLevels(AMOUNT, [1, 0, 0], 1)).toBe(112);
    expect(amountAtLevels(AMOUNT, [1, 0, 0], 12)).toBe(244);
    expect(amountAtLevels(AMOUNT, [2, 0, 0], 12)).toBe(304);
  });

  it("reads the table alone at any level when the term is zero", () => {
    const flat: Amount = { ...AMOUNT, perLevel: 0 };

    expect(amountAtLevels(flat, [2, 0, 0], 1)).toBe(160);
    expect(amountAtLevels(flat, [2, 0, 0], 30)).toBe(160);
  });

  it("is dealt by the damage-area primitive at the level the context carries", () => {
    const dealt = (level: number): number => {
      const world = makeWorld({ seed: 1 });

      spawnHero(world);

      const dummy = spawnUnit(world, { x: 100, health: DUMMY_HEALTH });
      const cast = makeCast(world, {
        orbLevels: [1, 0, 0],
        level,
        targetId: world.state.map.units.idAt(1),
      });

      runPrimitive(world.state, cast, hitOf(AMOUNT));

      return DUMMY_HEALTH - dummy.resources.health;
    };

    expect(dealt(1)).toBe(112);
    expect(dealt(12)).toBe(244);
  });

  it("is divided into a rate per tick with its table when content writes a rate per second", () => {
    const [converted] = effectsPerTick(
      [{ ...hitOf(AMOUNT), rate: "per_second" }],
      SIM_HZ,
    );

    expect(converted).toMatchObject({
      amount: {
        byLevel: [100 / SIM_HZ, 160 / SIM_HZ],
        perLevel: 12 / SIM_HZ,
      },
      rate: "per_tick",
    });
  });

  it("is divided into a rate per tick on a status's damage and heal over time", () => {
    const status: StatusDef = makeStatusDef.build({
      damageOverTime: { damageType: "magical", perSecond: AMOUNT },
      healOverTime: { perSecond: AMOUNT },
    });
    const record = createStatusTable(
      [status],
      new Map(Object.entries(tuningTable)),
    ).get(status.id);

    expect(record?.damageOverTime?.perLevel).toBe(12 / SIM_HZ);
    expect(record?.healOverTime?.perLevel).toBe(12 / SIM_HZ);
  });

  it("is a tunable in the amount's own unit, keyed by its field path", () => {
    const { world } = arrangeZenith(1);

    expect(world.view.run.tuning.get(ZENITH_PER_LEVEL_KEY)).toBe(
      ZENITH_PER_LEVEL,
    );
  });
});

describe("the caster's level a cast's amounts read", () => {
  it("is the level on commit: a hero at level 1 and one at level 12 strike for the term at each", () => {
    for (const level of [1, 12]) {
      const { world, dummyHealth } = arrangeZenith(level);

      castZenith(world);
      tickUntil(world, () => DUMMY_HEALTH - dummyHealth() > 0, LANDING_TICKS);

      expect(DUMMY_HEALTH - dummyHealth()).toBe(
        ZENITH_BASE + ZENITH_PER_LEVEL * level,
      );
    }
  });

  it("does not change with a level gained between the commit and the landing", () => {
    const { world, dummyHealth } = arrangeZenith(1);

    castZenith(world);
    tickUntil(world, (view) => view.map.zones.count === 1, COMMIT_TICKS);
    setHeroLevel(world, 12);
    tickUntil(world, () => DUMMY_HEALTH - dummyHealth() > 0, LANDING_TICKS);

    expect(DUMMY_HEALTH - dummyHealth()).toBe(ZENITH_BASE + ZENITH_PER_LEVEL);
  });

  it("is the one held on commit, not on the request: a level gained in the cast point counts", () => {
    const { world, dummyHealth } = arrangeZenith(1);

    castZenith(world);
    world.tick();

    expect(world.view.map.zones.count).toBe(0);

    setHeroLevel(world, 12);
    tickUntil(world, () => DUMMY_HEALTH - dummyHealth() > 0, LANDING_TICKS);

    expect(DUMMY_HEALTH - dummyHealth()).toBe(
      ZENITH_BASE + ZENITH_PER_LEVEL * 12,
    );
  });
});
