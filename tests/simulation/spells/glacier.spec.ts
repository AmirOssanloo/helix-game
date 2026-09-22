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
const GLACIER = "glacier";

/** The chill a segment puts on whoever stands in it, by the id content registers it under. */
const GLACIER_CHILL = "glacier_chill";

/** The wall the catalogue lays: this many segments, this far apart, this far in front of the hero. */
const SEGMENTS = 7;
const SPACING = 160;
const DISTANCE = 200;

/** A segment covers this much across the cast direction and this much along it. */
const SEGMENT_WIDTH = 160;
const SEGMENT_DEPTH = 80;

/** How long the chill lingers after an enemy leaves a segment, in seconds and in ticks. */
const LINGER_SECONDS = 1;
const LINGER_TICKS = LINGER_SECONDS * tuningTable.sim_hz;

/** The health a dummy stands on: far above what a burn is worth over the ticks a case runs. */
const DUMMY_HEALTH = 100000;

/** Ticks enough for a cast point and the commit behind it. */
const COMMIT_TICKS = 8;

/** Where the hero aims: straight ahead, which is where it already faces. */
const AIM: Readonly<Vec2> = { x: 1000, y: 0 };

/** A point inside the middle segment, and one clear of every segment of the wall. */
const IN_THE_WALL: Readonly<Vec2> = { x: DISTANCE, y: 0 };
const CLEAR_OF_IT: Readonly<Vec2> = { x: 2000, y: 2000 };

/** A point behind the wall, past the last segment across the cast direction. */
const PAST_THE_END: Readonly<Vec2> = {
  x: DISTANCE,
  y: ((SEGMENTS - 1) / 2) * SPACING + SEGMENT_WIDTH,
};

/** The index of the prepared entry slot D throws. */
const FIRST_PREPARED = 0;

/** One orb level the spec runs at, with the catalogue's slow, burn, and lifetime at that level. */
type Case = Readonly<{
  level: number;
  slow: number;
  perSecond: number;
  lifetimeSeconds: number;
}>;

/** The two levels every case below runs at: the first and the cap. */
const CASES: readonly Case[] = [
  { level: 1, slow: 0.2, perSecond: 6, lifetimeSeconds: 3 },
  { level: 7, slow: 0.8, perSecond: 42, lifetimeSeconds: 12 },
];

type Arranged = {
  world: Simulation;
  hero: Unit;
  dummies: Unit[];
};

/**
 * The hero at the origin facing along +X with every orb at `level` and Glacier prepared on D,
 * and a dummy at each of `places`. The registry is the content layer's, so the spell, the
 * segments, the chill, and every table are the ones the game ships.
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

  form.kit.prepared[FIRST_PREPARED] = GLACIER;

  return { world, hero, dummies };
};

/** Presses D and clicks `position`, which a direction spell reads only the bearing of. */
const castAt = (world: Simulation, position: Readonly<Vec2>): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: GLACIER,
    target: { kind: "direction", position },
  });
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** Casts along `position` and ticks until the wall is on the ground, which is the commit. */
const castAndPlace = (world: Simulation, position: Readonly<Vec2>): void => {
  castAt(world, position);
  tickUntil(world, (view) => view.map.zones.count === SEGMENTS, COMMIT_TICKS);
};

/** Where every segment stands, in pool order. */
const segmentsOf = (world: Simulation): Readonly<Vec2>[] => {
  const found: Readonly<Vec2>[] = [];

  for (let index = 0; index < world.state.map.zones.end; index += 1) {
    const zone = world.state.map.zones.at(index);

    if (zone !== null) {
      found.push({ x: zone.curr.x, y: zone.curr.y });
    }
  }

  return found;
};

/** Whether each dummy is chilled right now, in the order they were placed. */
const chilled = ({ world, dummies }: Arranged): boolean[] =>
  dummies.map((dummy) =>
    holdsStatus(dummy.statuses, GLACIER_CHILL, world.view.tick),
  );

/** What each dummy has lost in health, in the order they were placed. */
const lost = (dummies: readonly Unit[]): number[] =>
  dummies.map((dummy) => DUMMY_HEALTH - dummy.resources.health);

describe.each(CASES)(
  "Glacier at orb level $level",
  ({ level, slow, perSecond, lifetimeSeconds }) => {
    it("lays its segments across the facing, centred a distance in front of the hero", () => {
      const { world } = arrange(level, []);

      castAndPlace(world, AIM);

      const placed = segmentsOf(world);

      expect(placed).toHaveLength(SEGMENTS);

      for (let index = 0; index < SEGMENTS; index += 1) {
        expect(placed[index]?.x ?? Number.NaN).toBeCloseTo(DISTANCE);
        expect(placed[index]?.y ?? Number.NaN).toBeCloseTo(
          (index - (SEGMENTS - 1) / 2) * SPACING,
        );
      }
    });

    it("chills a dummy inside a segment and leaves one clear of the wall alone", () => {
      const fixture = arrange(level, [IN_THE_WALL, CLEAR_OF_IT, PAST_THE_END]);

      castAndPlace(fixture.world, AIM);
      tickTimes(fixture.world, 2);

      expect(chilled(fixture)).toEqual([true, false, false]);
    });

    it("slows what it chills, by the fraction its table gives", () => {
      const fixture = arrange(level, [IN_THE_WALL]);

      castAndPlace(fixture.world, AIM);
      tickTimes(fixture.world, 2);

      expect(
        fixture.dummies[0]?.modifiers.filter(
          (row) => row.kind === "status" && row.stat === "movement_speed",
        ),
      ).toEqual([
        { kind: "status", stat: "movement_speed", flat: 0, percent: -slow },
      ]);
    });

    it("burns what it chills, by the damage per second its table gives", () => {
      const fixture = arrange(level, [IN_THE_WALL]);
      const seconds = 1;

      castAndPlace(fixture.world, AIM);
      tickTimes(fixture.world, seconds * tuningTable.sim_hz);

      expect(lost(fixture.dummies)[0] ?? 0).toBeCloseTo(perSecond * seconds, 1);
    });

    it("keeps chilling for the linger after the dummy leaves, then lets it go", () => {
      const fixture = arrange(level, [IN_THE_WALL]);

      castAndPlace(fixture.world, AIM);
      tickTimes(fixture.world, 2);

      const dummy = fixture.dummies[0];

      if (dummy === undefined) {
        throw new Error("The fixture placed a dummy");
      }

      dummy.curr.x = CLEAR_OF_IT.x;
      dummy.curr.y = CLEAR_OF_IT.y;
      tickTimes(fixture.world, LINGER_TICKS - 2);

      expect(chilled(fixture)).toEqual([true]);

      tickTimes(fixture.world, 2);

      expect(chilled(fixture)).toEqual([false]);
    });

    it("stands for the lifetime its table gives, then is gone", () => {
      const { world } = arrange(level, []);

      castAndPlace(world, AIM);
      tickTimes(world, lifetimeSeconds * tuningTable.sim_hz - 2);

      expect(world.view.map.zones.count).toBe(SEGMENTS);

      tickTimes(world, 2);

      expect(world.view.map.zones.count).toBe(0);
    });

    it("lays its segments turned across the cast direction, so the wall is wide and shallow", () => {
      const deepInside: Readonly<Vec2> = {
        x: DISTANCE + SEGMENT_DEPTH / 2 - 1,
        y: 0,
      };
      const justBeyond: Readonly<Vec2> = {
        x: DISTANCE + SEGMENT_WIDTH / 2 + 1,
        y: 0,
      };
      const fixture = arrange(level, [deepInside, justBeyond]);

      castAndPlace(fixture.world, AIM);
      tickTimes(fixture.world, 2);

      expect(chilled(fixture)).toEqual([true, false]);
    });
  },
);
