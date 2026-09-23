import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { MapDef, Unit } from "@domain/public";
import { holdsStatus } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeMapDef,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
} from "../../helpers";

/** The spell under test, by the id content registers it under. */
const CLARION = "clarion";

/** The two statuses the cone leaves, by the ids content registers them under. */
const DISARM = "disarm";
const KNOCKBACK = "knockback";

/** The cone the catalogue aims: its full angle in degrees, and how far it reaches from the hero. */
const ANGLE_DEGREES = 60;
const LENGTH = 900;

/** How fast the push carries a unit, in world units a second, and so how far it carries it a tick. */
const PUSH_SPEED = 300;
const PUSH_STEP = PUSH_SPEED / tuningTable.sim_hz;

/** The health a dummy stands on: far above what the cone deals it at any level. */
const DUMMY_HEALTH = 10000;

/** Ticks enough for a cast point and the commit behind it. */
const COMMIT_TICKS = 8;

/** Long enough that a spec's own arrangement outlasts anything it does under it. */
const LONG_TICKS = 10000;

/** How many levels the fixture is willing to grant the hero before it gives up on paying for the spell. */
const LEVELS_ALLOWED = 30;

/** Where the hero aims: straight ahead, which is where it already faces. */
const AIM: Readonly<Vec2> = { x: 4000, y: 0 };

/** How far along the cone's axis every dummy below stands. */
const REACH = 500;

/** A point on the cone's axis, one wide of its angle, and one past its length. */
const IN_THE_CONE: Readonly<Vec2> = { x: REACH, y: 0 };
const WIDE_OF_IT: Readonly<Vec2> = { x: REACH, y: REACH };
const PAST_ITS_LENGTH: Readonly<Vec2> = { x: LENGTH + REACH, y: 0 };

/** A bearing inside the cone's half angle but well off its axis, and the point at `REACH` along it. */
const EDGE_BEARING = (25 * Math.PI) / 180;
const AT_THE_EDGE: Readonly<Vec2> = {
  x: REACH * Math.cos(EDGE_BEARING),
  y: REACH * Math.sin(EDGE_BEARING),
};

/** The index of the prepared entry slot D throws. */
const FIRST_PREPARED = 0;

/**
 * One orb level the spec runs at, with the catalogue's cost, damage, push, and disarm at that
 * level, and the ticks the push lasts: its distance at its speed.
 */
type Case = Readonly<{
  level: number;
  manaCost: number;
  damage: number;
  distance: number;
  pushTicks: number;
  disarmSeconds: number;
}>;

/** The two levels every case below runs at: the first and the cap. */
const AT_FIRST: Case = {
  level: 1,
  manaCost: 300,
  damage: 40,
  distance: 200,
  pushTicks: 20,
  disarmSeconds: 1,
};

const AT_THE_CAP: Case = {
  level: 7,
  manaCost: 330,
  damage: 280,
  distance: 800,
  pushTicks: 80,
  disarmSeconds: 4,
};

const CASES: readonly Case[] = [AT_FIRST, AT_THE_CAP];

type Arranged = {
  world: Simulation;
  hero: Unit;
  dummies: Unit[];
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/**
 * Levels the hero until its pool holds `cost`, then fills it. Clarion is the dearest of the
 * ten and a hero at its first level cannot hold the mana for one, so every case here buys
 * the levels the pool needs and pays the cost rather than turning the switch that skips it.
 */
const affordIt = (
  world: Simulation,
  hero: Readonly<Unit>,
  cost: number,
): void => {
  for (
    let granted = 0;
    granted < LEVELS_ALLOWED && hero.stats.maxMana < cost;
    granted += 1
  ) {
    submit(world, {
      kind: "level_up",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    world.tick();
  }

  submit(world, {
    kind: "restore_mana",
    tick: world.view.tick,
    timestamp: world.view.tick,
  });
  world.tick();
};

/**
 * The hero at the origin facing along +X with every orb at `level` and Clarion prepared on D,
 * rich enough to cast it, and a dummy at each of `places`. The registry is the content
 * layer's, so the spell, the cone, the push, the disarm, and every table are the ones the
 * game ships.
 */
const arrange = (
  { level, manaCost }: Case,
  places: readonly Readonly<Vec2>[],
  map: MapDef = makeMapDef.build(),
): Arranged => {
  const world = makeWorld({ seed: 1, map });
  const hero = spawnHero(world, { orbLevels: [level, level, level] });
  const dummies = places.map((place) =>
    spawnUnit(world, { x: place.x, y: place.y, health: DUMMY_HEALTH }),
  );
  const form = world.state.run.forms[0];

  if (form === undefined) {
    throw new Error("The hero has a form");
  }

  form.kit.prepared[FIRST_PREPARED] = CLARION;
  affordIt(world, hero, manaCost);

  return { world, hero, dummies };
};

/** The dummy at `index`, which every case below places before it reads one. */
const dummyAt = ({ dummies }: Arranged, index: number): Unit => {
  const dummy = dummies[index];

  if (dummy === undefined) {
    throw new Error("The fixture placed the dummy");
  }

  return dummy;
};

/** Presses D and clicks `position`, which a direction spell reads only the bearing of. */
const castAt = (world: Simulation, position: Readonly<Vec2>): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: CLARION,
    target: { kind: "direction", position },
  });
};

/** Ticks until `predicate` holds, within a spec's patience, and returns the ticks it took. */
const tickUntilTrue = (world: Simulation, predicate: () => boolean): number =>
  tickUntil(world, predicate, LONG_TICKS);

/** What each dummy has lost in health, in the order they were placed. */
const lost = ({ dummies }: Arranged): number[] =>
  dummies.map((dummy) => DUMMY_HEALTH - dummy.resources.health);

/**
 * Casts along `AIM` and ticks until the cone has landed, which the damage on the first dummy
 * says: the whole spell runs on the commit tick, so the world stands on the tick after it.
 */
const castAndBlow = (fixture: Arranged): void => {
  castAt(fixture.world, AIM);
  tickUntil(fixture.world, () => (lost(fixture)[0] ?? 0) > 0, COMMIT_TICKS);
};

/** Whether each dummy wears the disarm right now, in the order they were placed. */
const disarmed = ({ world, dummies }: Arranged): boolean[] =>
  dummies.map((dummy) => holdsStatus(dummy.statuses, DISARM, world.view.tick));

/** Whether a push has hold of each dummy right now, in the order they were placed. */
const pushed = ({ dummies }: Arranged): boolean[] =>
  dummies.map((dummy) => dummy.push.ticksLeft > 0);

/** The tick the disarm on the dummy at `index` ends, and nothing when it wears none. */
const disarmEndsAt = (fixture: Arranged, index: number): number =>
  dummyAt(fixture, index).statuses.find((row) => row.definitionId === DISARM)
    ?.endsAtTick ?? 0;

/** How far each dummy stands from the hero at the origin, in the order they were placed. */
const fromHero = ({ dummies }: Arranged): number[] =>
  dummies.map((dummy) => Math.hypot(dummy.curr.x, dummy.curr.y));

/** How far the first dummy stands from the hero, for a case that places one. */
const firstFromHero = (fixture: Arranged): number =>
  fromHero(fixture)[0] ?? Number.NaN;

describe.each(CASES)("Clarion at orb level $level", (spell: Case) => {
  const { damage, distance, pushTicks, disarmSeconds } = spell;

  it("runs all three entries on a dummy inside the cone, and leaves ones wide of it and past its length alone", () => {
    const fixture = arrange(spell, [IN_THE_CONE, WIDE_OF_IT, PAST_ITS_LENGTH]);

    castAndBlow(fixture);

    expect(lost(fixture)).toEqual([damage, 0, 0]);
    expect(disarmed(fixture)).toEqual([true, false, false]);
    expect(pushed(fixture)).toEqual([true, false, false]);
    expect(WIDE_OF_IT.y / WIDE_OF_IT.x).toBeGreaterThan(
      Math.tan((ANGLE_DEGREES / 2) * (Math.PI / 180)),
    );
  });

  it("deals the damage its table gives once, and no more while the push carries the dummy", () => {
    const fixture = arrange(spell, [IN_THE_CONE]);

    castAndBlow(fixture);
    tickTimes(fixture.world, pushTicks + 2);

    expect(lost(fixture)).toEqual([damage]);
  });

  it("pushes what it hits away from the hero, the distance its table gives, and stops there", () => {
    const fixture = arrange(spell, [IN_THE_CONE]);

    castAndBlow(fixture);
    tickTimes(fixture.world, pushTicks);

    expect(firstFromHero(fixture)).toBeCloseTo(REACH + distance);
    expect(dummyAt(fixture, 0).curr.y).toBeCloseTo(0);

    tickTimes(fixture.world, 2);

    expect(firstFromHero(fixture)).toBeCloseTo(REACH + distance);
  });

  it("carries what it hits a fixed step a tick, for as many ticks as its distance takes at its speed", () => {
    const fixture = arrange(spell, [IN_THE_CONE]);
    const dummy = dummyAt(fixture, 0);

    castAndBlow(fixture);

    const held = dummy.push.ticksLeft;
    const alreadyMoved = firstFromHero(fixture) - REACH;
    const steps: number[] = [];

    while (pushed(fixture)[0] === true) {
      const before = firstFromHero(fixture);

      fixture.world.tick();
      steps.push(firstFromHero(fixture) - before);
    }

    expect(distance / pushTicks).toBeCloseTo(PUSH_STEP);
    expect(held + alreadyMoved / PUSH_STEP).toBeCloseTo(pushTicks);
    expect(steps).toHaveLength(held);

    for (const step of steps) {
      expect(step).toBeCloseTo(PUSH_STEP);
    }

    expect(firstFromHero(fixture)).toBeCloseTo(REACH + distance);
  });

  it("throws a dummy off the cone's axis outward along its own line from the hero", () => {
    const fixture = arrange(spell, [AT_THE_EDGE]);

    castAndBlow(fixture);
    tickTimes(fixture.world, pushTicks);

    const thrown = dummyAt(fixture, 0);

    expect(firstFromHero(fixture)).toBeCloseTo(REACH + distance);
    expect(thrown.curr.y).toBeGreaterThan(AT_THE_EDGE.y);
    expect(Math.atan2(thrown.curr.y, thrown.curr.x)).toBeCloseTo(EDGE_BEARING);
  });

  it("disarms what it hits for the seconds its table gives, then lets it attack again", () => {
    const fixture = arrange(spell, [IN_THE_CONE]);
    const held = disarmSeconds * tuningTable.sim_hz;

    castAndBlow(fixture);

    expect(disarmEndsAt(fixture, 0) - fixture.world.view.tick).toBe(held - 1);

    tickTimes(fixture.world, held - 2);

    expect(disarmed(fixture)).toEqual([true]);
    expect(dummyAt(fixture, 0).disables.disarmed).toBe(true);

    tickTimes(fixture.world, 2);

    expect(disarmed(fixture)).toEqual([false]);
    expect(dummyAt(fixture, 0).disables.disarmed).toBe(false);
  });
});

/** Where the wall stands: a slab across the cone's axis, short of where the push at the cap would end. */
const WALL_X = 700;

describe("a dummy Clarion pushes into a wall", () => {
  it("stops at the wall's edge, stays there, and is let go on time", () => {
    const fixture = arrange(
      AT_THE_CAP,
      [IN_THE_CONE],
      makeMapDef.build({
        obstacles: [
          { minX: WALL_X, minY: -2000, maxX: WALL_X + 200, maxY: 2000 },
        ],
      }),
    );

    castAndBlow(fixture);

    const stopped = dummyAt(fixture, 0);

    tickUntilTrue(fixture.world, () => !pushed(fixture)[0]);

    const rest = stopped.curr.x;

    expect(rest).toBeCloseTo(WALL_X - stopped.collisionRadius);
    expect(rest).toBeLessThan(REACH + AT_THE_CAP.distance);

    tickTimes(fixture.world, 2);

    expect(stopped.curr.x).toBeCloseTo(rest);
    expect(
      holdsStatus(stopped.statuses, KNOCKBACK, fixture.world.view.tick),
    ).toBe(false);
  });
});
