import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { SpawnProjectileEffectDef, Unit } from "@domain/public";
import { runPrimitive } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeCast,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The spell under test, by the id content registers it under. */
const UPDRAFT = "updraft";

/** The status the carry puts on whoever it picks up, by the id content registers it under. */
const LIFT = "updraft_lift";

/** The status Hoarfrost puts on a unit, for reading that a lift does not pause what is already counting. */
const HOARFROST = "hoarfrost";

/** The speed the funnel travels, as the catalogue writes it. */
const SPEED = 1000;

/** The health a dummy stands on: far above the drop at any level. */
const DUMMY_HEALTH = 10000;

/** Ticks enough for a cast point and the commit behind it, and enough for a backswing to end. */
const COMMIT_TICKS = 8;
const BACKSWING_TICKS = 6;

/** Long enough that a spec's own arrangement outlasts anything it does under it. */
const LONG_TICKS = 10000;

/** Where the hero aims: straight ahead, which is where it already faces. */
const AIM: Readonly<Vec2> = { x: 4000, y: 0 };

/** Two dummies in the zone's path, the second well behind the first and inside the shortest reach. */
const NEAR: Readonly<Vec2> = { x: 400, y: 0 };
const FAR: Readonly<Vec2> = { x: 900, y: 0 };

/** A projectile the spec fires by hand at a dummy: a pure hit, so what it did reads straight off the health. */
const PROJECTILE_SPEED = 900;
const PROJECTILE_RANGE = 1200;
const PROJECTILE_HIT = 5;
const PROJECTILE_FROM = 300;
const FLIGHT_TICKS = 14;

const PROJECTILE: SpawnProjectileEffectDef = {
  kind: "spawn_projectile",
  speed: PROJECTILE_SPEED,
  radius: 0,
  homing: false,
  maxRange: PROJECTILE_RANGE,
  onHit: [
    {
      kind: "damage_area",
      target: { kind: "target" },
      damageType: "pure",
      amount: { orb: "quartz", byLevel: [PROJECTILE_HIT] },
      rate: "once",
      split: false,
    },
  ],
  atlasFrame: "disc",
  tint: 0xffffff,
};

/** A point well to the side of the line the zone travels. */
const ASIDE: Readonly<Vec2> = { x: 400, y: 2000 };

/** The indices of the two prepared entries, which slots D and F throw. */
const FIRST_PREPARED = 0;
const SECOND_PREPARED = 1;

/** One orb level the spec runs at, with the catalogue's lift, drop, and distance at that level. */
type Case = Readonly<{
  level: number;
  liftSeconds: number;
  drop: number;
  distance: number;
}>;

/** The two levels every case below runs at: the first and the cap. */
const CASES: readonly Case[] = [
  { level: 1, liftSeconds: 0.8, drop: 70, distance: 800 },
  { level: 7, liftSeconds: 2.6, drop: 250, distance: 2000 },
];

type Arranged = {
  world: Simulation;
  hero: Unit;
  dummies: Unit[];
};

/**
 * The hero at the origin facing along +X with every orb at `level` and Updraft prepared on D,
 * and a dummy at each of `places`. The registry is the content layer's, so the spell, the
 * zone, the carry, and the lift status are the ones the game ships.
 */
const arrange = (
  level: number,
  places: readonly Readonly<Vec2>[],
): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, { orbLevels: [level, level, level] });
  const dummies = places.map((place) =>
    spawnUnit(world, { x: place.x, y: place.y, health: DUMMY_HEALTH }),
  );
  const form = world.state.run.forms[0];

  if (form === undefined) {
    throw new Error("The hero has a form");
  }

  form.kit.prepared[FIRST_PREPARED] = UPDRAFT;

  return { world, hero, dummies };
};

/** Presses D and clicks `position`, which a direction spell reads only the bearing of. */
const castAt = (world: Simulation, position: Readonly<Vec2>): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: UPDRAFT,
    target: { kind: "direction", position },
  });
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** Casts along `position` and ticks until the funnel is on the ground, which is the commit. */
const castAndLaunch = (world: Simulation, position: Readonly<Vec2>): void => {
  castAt(world, position);
  tickUntil(world, (view) => view.map.zones.count === 1, COMMIT_TICKS);
};

/** Ticks until `predicate` holds, within a spec's patience, and returns the ticks it took. */
const tickWhile = (world: Simulation, predicate: () => boolean): number =>
  tickUntil(world, predicate, LONG_TICKS);

/** The lift row on `dummy`, which stands until the tick the status pass sweeps it and drops the unit. */
const liftRow = (dummy: Readonly<Unit>) =>
  dummy.statuses.find((row) => row.definitionId === LIFT) ?? null;

/** Whether each dummy is in the air, in the order they were placed. */
const inAir = ({ dummies }: Arranged): boolean[] =>
  dummies.map((dummy) => liftRow(dummy) !== null);

/** Fires a projectile at the first dummy from a fixed distance behind it, along the line it stands on. */
const fireAtFirst = ({ world, dummies }: Arranged): void => {
  const dummy = dummies[0];

  if (dummy === undefined) {
    throw new Error("The fixture placed a dummy");
  }

  runPrimitive(
    world.state,
    makeCast(world, {
      x: dummy.curr.x - PROJECTILE_FROM,
      y: dummy.curr.y,
      facing: 0,
    }),
    PROJECTILE,
  );
};

/** The tick the Hoarfrost on `dummy` ends, and nothing when it wears none. */
const frostEndsAt = (dummy: Readonly<Unit>): number =>
  dummy.statuses.find((row) => row.definitionId === HOARFROST)?.endsAtTick ?? 0;

/** Puts Hoarfrost on `dummy` the way the player does: prepared on the second square and cast at it. */
const castHoarfrostAt = (fixture: Arranged, dummy: Readonly<Unit>): void => {
  const form = fixture.world.state.run.forms[0];

  if (form === undefined) {
    throw new Error("The hero has a form");
  }

  form.kit.prepared[SECOND_PREPARED] = HOARFROST;
  submit(fixture.world, {
    kind: "cast",
    tick: fixture.world.view.tick,
    timestamp: fixture.world.view.tick,
    abilityId: HOARFROST,
    target: { kind: "unit", unitId: unitIdOf(fixture.world, dummy) },
  });
  tickWhile(fixture.world, () => frostEndsAt(dummy) > 0);
  submit(fixture.world, {
    kind: "restore_mana",
    tick: fixture.world.view.tick,
    timestamp: fixture.world.view.tick,
  });
  tickTimes(fixture.world, BACKSWING_TICKS);
};

/** Where each dummy stands along the line the zone travels, in the order they were placed. */
const alongX = ({ dummies }: Arranged): number[] =>
  dummies.map((dummy) => dummy.curr.x);

/** What each dummy has lost in health, in the order they were placed. */
const lost = ({ dummies }: Arranged): number[] =>
  dummies.map((dummy) => DUMMY_HEALTH - dummy.resources.health);

describe.each(CASES)(
  "Updraft at orb level $level",
  ({ level, liftSeconds, drop, distance }) => {
    it("lifts a dummy it reaches and carries it along with the funnel", () => {
      const fixture = arrange(level, [NEAR]);

      castAndLaunch(fixture.world, AIM);
      tickWhile(fixture.world, () => inAir(fixture)[0] === true);

      const picked = alongX(fixture)[0] ?? 0;

      tickTimes(fixture.world, 2);

      expect(alongX(fixture)[0] ?? 0).toBeGreaterThan(picked);
      expect(inAir(fixture)).toEqual([true]);
    });

    it("carries it at the speed the funnel travels", () => {
      const fixture = arrange(level, [NEAR]);
      const perTick = SPEED / tuningTable.sim_hz;

      castAndLaunch(fixture.world, AIM);
      tickWhile(fixture.world, () => inAir(fixture)[0] === true);

      const picked = alongX(fixture)[0] ?? 0;

      tickTimes(fixture.world, 1);

      expect((alongX(fixture)[0] ?? 0) - picked).toBeCloseTo(perTick);
    });

    it("drops it after its lift with the damage its table gives", () => {
      const fixture = arrange(level, [NEAR]);

      castAndLaunch(fixture.world, AIM);
      tickWhile(fixture.world, () => inAir(fixture)[0] === true);

      expect(lost(fixture)).toEqual([0]);

      tickWhile(fixture.world, () => inAir(fixture)[0] === false);

      const dropped = alongX(fixture)[0] ?? 0;

      expect(lost(fixture)).toEqual([drop]);

      tickTimes(fixture.world, 2);

      expect(alongX(fixture)[0] ?? 0).toBe(dropped);
    });

    it("holds the dummy for the seconds its table gives", () => {
      const fixture = arrange(level, [NEAR]);

      castAndLaunch(fixture.world, AIM);

      const reached = tickWhile(
        fixture.world,
        () => inAir(fixture)[0] === true,
      );
      const picked = fixture.world.view.tick;

      tickWhile(fixture.world, () => inAir(fixture)[0] === false);

      expect(reached).toBeGreaterThan(0);
      expect(fixture.world.view.tick - picked).toBe(
        Math.round(liftSeconds * tuningTable.sim_hz),
      );
    });

    it("lifts the second dummy when it reaches it, not when it lifted the first", () => {
      const fixture = arrange(level, [NEAR, FAR]);

      castAndLaunch(fixture.world, AIM);
      tickWhile(fixture.world, () => inAir(fixture)[0] === true);

      expect(inAir(fixture)).toEqual([true, false]);

      tickWhile(fixture.world, () => inAir(fixture)[1] === true);

      expect(inAir(fixture)[1]).toBe(true);
    });

    it("passes a dummy standing aside from its line by", () => {
      const fixture = arrange(level, [ASIDE]);

      castAndLaunch(fixture.world, AIM);
      tickWhile(fixture.world, () => fixture.world.view.map.zones.count === 0);

      expect(inAir(fixture)).toEqual([false]);
      expect(lost(fixture)).toEqual([0]);
      expect(alongX(fixture)).toEqual([ASIDE.x]);
    });

    it("covers the distance its table gives, then is gone", () => {
      const fixture = arrange(level, []);
      const start = fixture.world.state.map.zones.at(0)?.curr.x ?? 0;

      castAndLaunch(fixture.world, AIM);
      tickWhile(fixture.world, () => fixture.world.view.map.zones.count === 0);

      expect(start).toBe(0);
      expect(fixture.world.view.tick).toBeGreaterThan(
        (distance / SPEED) * tuningTable.sim_hz,
      );
    });

    it("leaves the units it carried in the air where it left them, and they drop on their own", () => {
      const fixture = arrange(level, [NEAR]);

      castAndLaunch(fixture.world, AIM);
      tickWhile(fixture.world, () => fixture.world.view.map.zones.count === 0);

      const left = alongX(fixture)[0] ?? 0;

      expect(inAir(fixture)).toEqual([true]);

      tickTimes(fixture.world, 2);

      expect(alongX(fixture)[0] ?? 0).toBe(left);

      tickWhile(fixture.world, () => inAir(fixture)[0] === false);

      expect(lost(fixture)).toEqual([drop]);
      expect(alongX(fixture)[0] ?? 0).toBe(left);
    });
  },
);

/** The orb level the two cases below run at: the cap, whose lift is long enough to fly a projectile into. */
const CAPPED = 7;

describe("a dummy Updraft has lifted", () => {
  it("cannot be hit by a projectile flying into it, and can be once it is down", () => {
    const fixture = arrange(CAPPED, [NEAR]);

    castAndLaunch(fixture.world, AIM);
    tickWhile(fixture.world, () => fixture.world.view.map.zones.count === 0);

    const whileUp = lost(fixture)[0] ?? 0;

    fireAtFirst(fixture);
    tickTimes(fixture.world, FLIGHT_TICKS);

    expect(inAir(fixture)).toEqual([true]);
    expect(lost(fixture)[0] ?? 0).toBe(whileUp);

    tickWhile(fixture.world, () => inAir(fixture)[0] === false);

    const dropped = lost(fixture)[0] ?? 0;

    fireAtFirst(fixture);
    tickTimes(fixture.world, FLIGHT_TICKS);

    expect(lost(fixture)[0] ?? 0).toBe(dropped + PROJECTILE_HIT);
  });

  it("keeps counting down every other status it wears, and sheds it on its own tick", () => {
    const fixture = arrange(CAPPED, [NEAR]);
    const dummy = fixture.dummies[0];

    if (dummy === undefined) {
      throw new Error("The fixture placed a dummy");
    }

    castHoarfrostAt(fixture, dummy);

    const ends = frostEndsAt(dummy);

    castAndLaunch(fixture.world, AIM);
    tickWhile(fixture.world, () => inAir(fixture)[0] === true);

    expect(ends).toBeGreaterThan(fixture.world.view.tick);
    expect(frostEndsAt(dummy)).toBe(ends);

    tickWhile(fixture.world, () => fixture.world.view.tick > ends);

    expect(frostEndsAt(dummy)).toBe(0);
  });
});
