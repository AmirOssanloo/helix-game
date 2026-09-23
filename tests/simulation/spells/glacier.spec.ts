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

/** The wall the catalogue lays: this many segments, this far apart. */
const SEGMENTS = 7;
const SPACING = 160;

/** How far from the hero a press may be and still be cast where the hero stands. */
const RANGE = 1000;

/** A segment covers this much along the wall and this much across it. */
const SEGMENT_WIDTH = 160;
const SEGMENT_DEPTH = 80;

/** How long the chill lingers after an enemy leaves a segment, in seconds and in ticks. */
const LINGER_SECONDS = 1;
const LINGER_TICKS = LINGER_SECONDS * tuningTable.sim_hz;

/** The health a dummy stands on: far above what a burn is worth over the ticks a case runs. */
const DUMMY_HEALTH = 100000;

/** Ticks enough for a cast point and the commit behind it. */
const COMMIT_TICKS = 8;

/** Ticks enough for the hero to turn a quarter, or walk a press beyond the range into it, and commit. */
const WALK_TICKS = 600;

/**
 * A bearing the hero's turn from +X stops short of: the cast point begins once the bearing is
 * inside the action cone, which the ramped turn reaches a little before it arrives. A press
 * this way, this far off, is in range.
 */
const SLANT = 1.35;
const SLANT_REACH = 600;

/** A quarter turn: the angle between the line from the hero to a press with no drag and the wall. */
const ACROSS = Math.PI / 2;

/** How far the wall reaches either side of its centre, to its last segment's outer edge. */
const HALF_WALL = ((SEGMENTS - 1) / 2) * SPACING + SEGMENT_WIDTH / 2;

/** Where the hero presses: straight ahead, which is where it already faces, inside the range. */
const PRESS: Readonly<Vec2> = { x: 200, y: 0 };

/** A point inside the middle segment, and one clear of every segment of the wall. */
const IN_THE_WALL: Readonly<Vec2> = PRESS;
const CLEAR_OF_IT: Readonly<Vec2> = { x: 2000, y: 2000 };

/** A point on the wall's line, past the last segment. */
const PAST_THE_END: Readonly<Vec2> = {
  x: PRESS.x,
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

/** Presses D, presses the button at `position`, and releases it at `end`: the same point for a press with no drag. */
const castAt = (
  world: Simulation,
  position: Readonly<Vec2>,
  end: Readonly<Vec2>,
): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: GLACIER,
    target: { kind: "vector", position, end },
  });
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** Casts at `position` released at `end` and ticks until the wall is on the ground, which is the commit. */
const castAndPlace = (
  world: Simulation,
  position: Readonly<Vec2>,
  end: Readonly<Vec2>,
  maxTicks = COMMIT_TICKS,
): void => {
  castAt(world, position, end);
  tickUntil(world, (view) => view.map.zones.count === SEGMENTS, maxTicks);
};

/** The unit vector along `angle`, for reading a row off it. */
const along = (angle: number): Readonly<Vec2> => ({
  x: Math.cos(angle),
  y: Math.sin(angle),
});

/** Expects the segments on the ground to be the catalogue's row centred on `centre` along `angle`. */
const expectWall = (
  world: Simulation,
  centre: Readonly<Vec2>,
  angle: number,
): void => {
  const placed = segmentsOf(world);
  const unit = along(angle);

  expect(placed).toHaveLength(SEGMENTS);

  for (let index = 0; index < SEGMENTS; index += 1) {
    const offset = (index - (SEGMENTS - 1) / 2) * SPACING;

    expect(placed[index]?.x ?? Number.NaN).toBeCloseTo(
      centre.x + unit.x * offset,
    );
    expect(placed[index]?.y ?? Number.NaN).toBeCloseTo(
      centre.y + unit.y * offset,
    );
  }
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
    it("lays its segments centred on the press, along the drag", () => {
      const { world } = arrange(level, []);
      const press = { x: 300, y: 100 };

      castAndPlace(world, press, { x: 300, y: 900 });

      expectWall(world, press, ACROSS);
    });

    it("lays them along a slanted drag, whichever way the hero faced", () => {
      const { world, hero } = arrange(level, []);
      const press = { x: 400, y: -200 };
      const end = { x: 100, y: 100 };

      hero.facing = 1;
      castAndPlace(world, press, end, WALK_TICKS);

      expectWall(world, press, Math.atan2(end.y - press.y, end.x - press.x));
    });

    it("turns every segment along the drag, so the wall is long and shallow", () => {
      const { world } = arrange(level, []);

      castAndPlace(world, PRESS, { x: PRESS.x + 500, y: 0 });

      for (let index = 0; index < world.state.map.zones.end; index += 1) {
        const zone = world.state.map.zones.at(index);

        if (zone !== null) {
          expect(zone.facing).toBeCloseTo(0);
        }
      }
    });

    it("lays its segments across the line from the hero to the press when the press has no drag", () => {
      const { world } = arrange(level, []);

      castAndPlace(world, PRESS, PRESS);

      expectWall(world, PRESS, ACROSS);
    });

    it("lays a wall with no drag across the exact line to the press, not the facing the turn stopped at", () => {
      const { world, hero } = arrange(level, []);
      const press = {
        x: Math.cos(SLANT) * SLANT_REACH,
        y: Math.sin(SLANT) * SLANT_REACH,
      };

      castAndPlace(world, press, press, WALK_TICKS);

      expect(hero.facing).not.toBeCloseTo(SLANT);
      expectWall(world, press, SLANT + ACROSS);
    });

    it("walks a press beyond the range into it and casts on arrival, centred on the press", () => {
      const { world, hero } = arrange(level, []);
      const press = { x: 2000, y: 1500 };
      const end = { x: 2000, y: 2500 };

      castAndPlace(world, press, end, WALK_TICKS);

      expect(
        Math.hypot(press.x - hero.curr.x, press.y - hero.curr.y),
      ).toBeLessThanOrEqual(RANGE);
      expect(Math.hypot(hero.curr.x, hero.curr.y)).toBeGreaterThan(0);
      expectWall(world, press, ACROSS);
    });

    it("lays a wall with no drag after a walk-in across the line from where the hero stands at commit", () => {
      const { world, hero } = arrange(level, []);
      const press = { x: -1500, y: 1800 };

      castAndPlace(world, press, press, WALK_TICKS);

      expectWall(
        world,
        press,
        Math.atan2(press.y - hero.curr.y, press.x - hero.curr.x) + ACROSS,
      );
    });

    it("spends nothing when S stops the walk into range", () => {
      const { world, hero } = arrange(level, []);
      const mana = world.view.run.forms[0]?.resources.mana;

      castAt(world, { x: 3000, y: 0 }, { x: 3000, y: 500 });
      tickTimes(world, 10);

      expect(hero.state).toBe("moving");

      submit(world, {
        kind: "stop",
        tick: world.view.tick,
        timestamp: world.view.tick,
      });
      tickTimes(world, WALK_TICKS);

      expect(world.view.map.zones.count).toBe(0);
      expect(hero.state).toBe("idle");
      expect(world.view.run.forms[0]?.resources.mana).toBe(mana);
      expect(hero.cooldowns.get(GLACIER)).toBeUndefined();
    });

    it("is refused a press beyond the range while the hero is rooted", () => {
      const { world, hero } = arrange(level, []);

      hero.disables.rooted = true;
      castAt(world, { x: RANGE + 1, y: 0 }, { x: RANGE + 1, y: 0 });
      world.tick();

      expect(hero.cast.abilityId).toBeNull();
      expect(hero.state).toBe("idle");
    });

    it("chills a dummy inside a segment and leaves one clear of the wall alone", () => {
      const fixture = arrange(level, [IN_THE_WALL, CLEAR_OF_IT, PAST_THE_END]);

      castAndPlace(fixture.world, PRESS, PRESS);
      tickTimes(fixture.world, 2);

      expect(chilled(fixture)).toEqual([true, false, false]);
    });

    it("slows what it chills, by the fraction its table gives", () => {
      const fixture = arrange(level, [IN_THE_WALL]);

      castAndPlace(fixture.world, PRESS, PRESS);
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

      castAndPlace(fixture.world, PRESS, PRESS);
      tickTimes(fixture.world, seconds * tuningTable.sim_hz);

      expect(lost(fixture.dummies)[0] ?? 0).toBeCloseTo(perSecond * seconds, 1);
    });

    it("keeps chilling for the linger after the dummy leaves, then lets it go", () => {
      const fixture = arrange(level, [IN_THE_WALL]);

      castAndPlace(fixture.world, PRESS, PRESS);
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

      castAndPlace(world, PRESS, PRESS);
      tickTimes(world, lifetimeSeconds * tuningTable.sim_hz - 2);

      expect(world.view.map.zones.count).toBe(SEGMENTS);

      tickTimes(world, 2);

      expect(world.view.map.zones.count).toBe(0);
    });

    it("covers a segment's width along the wall and its depth across it", () => {
      const deepInside: Readonly<Vec2> = {
        x: PRESS.x + SEGMENT_DEPTH / 2 - 1,
        y: 0,
      };
      const justBeyond: Readonly<Vec2> = {
        x: PRESS.x + SEGMENT_DEPTH / 2 + 1,
        y: 0,
      };
      const atTheEnd: Readonly<Vec2> = { x: PRESS.x, y: HALF_WALL - 1 };
      const fixture = arrange(level, [deepInside, justBeyond, atTheEnd]);

      castAndPlace(fixture.world, PRESS, PRESS);
      tickTimes(fixture.world, 2);

      expect(chilled(fixture)).toEqual([true, false, true]);
    });
  },
);
