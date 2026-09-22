import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { Unit } from "@domain/public";
import { holdsStatus } from "@domain/public";
import type { Vec2 } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
} from "../../helpers";

/** The spell under test, by the id content registers it under. */
const BOLIDE = "bolide";

/** The status the meteor leaves on whatever it rolls over, by the id content registers it under. */
const BURN = "burn";

/** The fall before the meteor lands, in seconds and in ticks: the catalogue's delay at every level. */
const DELAY_SECONDS = 1.3;
const DELAY_TICKS = DELAY_SECONDS * tuningTable.sim_hz;

/** How fast the meteor rolls, and how far it reaches from its centre. */
const SPEED = 300;
const RADIUS = 200;

/** How long the burn it leaves lasts, in seconds and in ticks. */
const BURN_SECONDS = 3;
const BURN_TICKS = BURN_SECONDS * tuningTable.sim_hz;

/** The health a dummy stands on: far above what the meteor and its burn are worth over a case. */
const DUMMY_HEALTH = 100000;

/** Ticks enough for a cast point and the commit behind it. */
const COMMIT_TICKS = 8;

/** Long enough that a spec's own arrangement outlasts anything it does under it. */
const LONG_TICKS = 10000;

/** Where the hero clicks: straight ahead, where it already faces, and well inside the spell's range. */
const CLICK: Readonly<Vec2> = { x: 600, y: 0 };

/** A point the meteor rolls onto after it has landed, inside the shortest distance its table gives. */
const DOWN_THE_LINE: Readonly<Vec2> = { x: 1000, y: 0 };

/** A point between the hero and the landing, clear of the circle and behind the way the meteor rolls. */
const BEHIND_IT: Readonly<Vec2> = { x: 300, y: 0 };

/** A point beside the line the meteor rolls along, clear of its circle the whole way. */
const ASIDE: Readonly<Vec2> = { x: 600, y: 600 };

/** The index of the prepared entry slot D throws. */
const FIRST_PREPARED = 0;

/** One orb level the spec runs at, with the catalogue's roll, damage, and burn at that level. */
type Case = Readonly<{
  level: number;
  distance: number;
  perSecond: number;
  burnPerSecond: number;
}>;

/** The two levels every case below runs at: the first and the cap. */
const CASES: readonly Case[] = [
  { level: 1, distance: 500, perSecond: 50, burnPerSecond: 10 },
  { level: 7, distance: 1400, perSecond: 200, burnPerSecond: 40 },
];

type Arranged = {
  world: Simulation;
  hero: Unit;
  dummies: Unit[];
};

/**
 * The hero at the origin facing along +X with every orb at `level` and Bolide prepared on D,
 * and a dummy at each of `places`. The registry is the content layer's, so the spell, the
 * zone, the burn, and every table are the ones the game ships.
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

  form.kit.prepared[FIRST_PREPARED] = BOLIDE;

  return { world, hero, dummies };
};

/** Presses D and clicks `position`, as the confirming click does. */
const castAt = (world: Simulation, position: Readonly<Vec2>): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: BOLIDE,
    target: { kind: "point", position },
  });
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** Casts at `position` and ticks until the meteor is in the sky, which is the commit. */
const castAndThrow = (world: Simulation, position: Readonly<Vec2>): void => {
  castAt(world, position);
  tickUntil(world, (view) => view.map.zones.count === 1, COMMIT_TICKS);
};

/** Casts, then ticks the whole fall, leaving the world on the tick the meteor has landed. */
const castAndLand = (world: Simulation, position: Readonly<Vec2>): void => {
  castAndThrow(world, position);
  tickTimes(world, DELAY_TICKS);
};

/** Ticks until `predicate` holds, within a spec's patience, and returns the ticks it took. */
const tickUntilTrue = (world: Simulation, predicate: () => boolean): number =>
  tickUntil(world, predicate, LONG_TICKS);

/** Where the meteor stands along the line it rolls, and the origin once it is gone. */
const meteorX = ({ world }: Arranged): number =>
  world.state.map.zones.at(0)?.curr.x ?? 0;

/** Whether the meteor is still on the ground. */
const rolling = ({ world }: Arranged): boolean =>
  world.view.map.zones.count > 0;

/** Whether each dummy is burning right now, in the order they were placed. */
const burning = ({ world, dummies }: Arranged): boolean[] =>
  dummies.map((dummy) => holdsStatus(dummy.statuses, BURN, world.view.tick));

/** The tick the burn on the first dummy ends, and nothing when it wears none. */
const burnEndsAt = ({ dummies }: Arranged): number =>
  dummies[0]?.statuses.find((row) => row.definitionId === BURN)?.endsAtTick ??
  0;

/** What each dummy has lost in health, in the order they were placed. */
const lost = ({ dummies }: Arranged): number[] =>
  dummies.map((dummy) => DUMMY_HEALTH - dummy.resources.health);

/** What the first dummy has lost, for a case that places one. */
const lostByFirst = (fixture: Arranged): number =>
  lost(fixture)[0] ?? Number.NaN;

describe.each(CASES)(
  "Bolide at orb level $level",
  ({ level, distance, perSecond, burnPerSecond }) => {
    const perTick = perSecond / tuningTable.sim_hz;
    const burnPerTick = burnPerSecond / tuningTable.sim_hz;
    const rollTicks = (distance / SPEED) * tuningTable.sim_hz;

    it("claims the ground for the whole fall and touches nothing until it lands", () => {
      const fixture = arrange(level, [CLICK]);

      castAndThrow(fixture.world, CLICK);
      tickTimes(fixture.world, DELAY_TICKS - 1);

      expect(fixture.world.view.map.zones.count).toBe(1);
      expect(lost(fixture)).toEqual([0]);
      expect(burning(fixture)).toEqual([false]);

      fixture.world.tick();

      expect(lostByFirst(fixture)).toBeCloseTo(perTick);
      expect(burning(fixture)).toEqual([true]);
    });

    it("takes its share and the burn's every tick a dummy stays under it", () => {
      const fixture = arrange(level, [CLICK]);

      castAndLand(fixture.world, CLICK);

      const landed = lostByFirst(fixture);

      fixture.world.tick();

      expect(lostByFirst(fixture) - landed).toBeCloseTo(perTick + burnPerTick);
    });

    it("rolls away from the hero, reaching a dummy down the line and leaving one behind it alone", () => {
      const fixture = arrange(level, [DOWN_THE_LINE, BEHIND_IT]);

      castAndLand(fixture.world, CLICK);

      expect(lost(fixture)).toEqual([0, 0]);

      tickUntilTrue(fixture.world, () => lostByFirst(fixture) > 0);

      expect(meteorX(fixture)).toBeGreaterThan(CLICK.x);
      expect(burning(fixture)).toEqual([true, false]);
      expect(lost(fixture)[1]).toBe(0);
    });

    it("covers the distance its table gives, then is gone", () => {
      const fixture = arrange(level, []);

      castAndThrow(fixture.world, CLICK);
      tickTimes(fixture.world, DELAY_TICKS + rollTicks - 1);

      expect(meteorX(fixture)).toBeCloseTo(CLICK.x + distance);

      fixture.world.tick();

      expect(rolling(fixture)).toBe(false);
    });

    it("keeps burning a dummy after it has rolled past it, then lets it go", () => {
      const fixture = arrange(level, [CLICK]);

      castAndLand(fixture.world, CLICK);
      tickUntilTrue(fixture.world, () => meteorX(fixture) > CLICK.x + RADIUS);

      const passed = lostByFirst(fixture);

      fixture.world.tick();

      expect(burning(fixture)).toEqual([true]);
      expect(lostByFirst(fixture) - passed).toBeCloseTo(burnPerTick);

      tickUntilTrue(fixture.world, () => burning(fixture)[0] === false);

      const cooled = lostByFirst(fixture);

      tickTimes(fixture.world, 2);

      expect(lostByFirst(fixture)).toBeCloseTo(cooled);
    });

    it("leaves a burn of its seconds and refreshes it every tick of contact", () => {
      const fixture = arrange(level, [CLICK]);

      castAndLand(fixture.world, CLICK);

      const ends = burnEndsAt(fixture);

      expect(ends - fixture.world.view.tick).toBe(BURN_TICKS - 1);

      fixture.world.tick();

      expect(burnEndsAt(fixture) - ends).toBe(1);
    });

    it("passes a dummy standing aside from its line by", () => {
      const fixture = arrange(level, [ASIDE]);

      castAndThrow(fixture.world, CLICK);
      tickUntilTrue(fixture.world, () => !rolling(fixture));

      expect(ASIDE.y).toBeGreaterThan(RADIUS);
      expect(lost(fixture)).toEqual([0]);
      expect(burning(fixture)).toEqual([false]);
    });
  },
);
