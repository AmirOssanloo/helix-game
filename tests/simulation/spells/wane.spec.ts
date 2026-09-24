import { describe, expect, it } from "vitest";
import { meleeGruntDef, tuningTable } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import { issueMove, setStraightPath } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The spell under test, and the two statuses it puts on the ground, by the ids content registers them under. */
const WANE = "wane";
const WANE_CHILL = "wane_chill";

/** How long the chill lasts once applied, in ticks: the catalogue's half second at every level. */
const CHILL_TICKS = 0.5 * tuningTable.sim_hz;

/** The health an enemy stands on: nothing here damages it, and a full pool keeps it out of death's way. */
const ENEMY_HEALTH = 10000;

/** Where the enemy stands: inside the circle the hero carries, and clear of the hero's hull. */
const ENEMY_X = 200;

/** Where anything walking is sent, far enough that it never arrives inside a spec. */
const FAR_X = 5000;

/** A point outside the circle, where the chill no longer reaches. */
const OUTSIDE_X = 4000;

/** How many ticks a walk is measured over: short enough that nothing leaves the circle under way. */
const WALK_TICKS = 5;

/** What Wane costs at the first level, which a hero short of it may not pay. */
const FIRST_MANA_COST = 200;

/** Ticks enough for a cast point and the commit behind it. */
const COMMIT_TICKS = 6;

/** Long enough that a spec's own arrangement outlasts anything it does under it. */
const LONG_TICKS = 10000;

/** The index of the prepared entry slot D throws. */
const FIRST_PREPARED = 0;

/** One orb level the spec runs at, with the catalogue's entries at that level beside it. */
type Case = Readonly<{
  level: number;
  seconds: number;
  selfSlow: number;
  chill: number;
}>;

/** The two levels every case below runs at: the first and the cap, where the self slow is gone. */
const CASES: readonly Case[] = [
  { level: 1, seconds: 4, selfSlow: -0.3, chill: -0.2 },
  { level: 7, seconds: 10, selfSlow: 0, chill: -0.5 },
];

type Arranged = {
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  enemy: Unit;
  enemyId: EntityId;
  reader: EventReader;
};

/**
 * The hero at the origin with every orb at `level` and Wane prepared on D, and one enemy
 * standing inside the circle the hero would carry. The registry is the content layer's, so the
 * spell, both statuses, and every table are the ones the game ships.
 */
const arrange = (level: number): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, { orbLevels: [level, level, level] });
  const enemy = spawnUnit(world, { x: ENEMY_X, health: ENEMY_HEALTH });
  const form = world.state.run.forms[0];
  const heroId = world.state.run.heroId;
  const enemyId = world.state.map.units.idAt(1);

  if (form === undefined || heroId === null || enemyId === null) {
    throw new Error("The hero has a form and the enemy took a slot");
  }

  form.kit.prepared[FIRST_PREPARED] = WANE;

  return { world, hero, heroId, enemy, enemyId, reader: createEventReader() };
};

/** Presses D, which a spell with no target casts on. */
const cast = (world: Simulation): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: WANE,
    target: { kind: "none" },
  });
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** The row `unit` holds `statusId` on, or nothing when it holds none. */
const rowOf = (
  unit: Readonly<Unit>,
  statusId: string,
): Readonly<{ endsAtTick: number }> | undefined =>
  unit.statuses.find((row) => row.definitionId === statusId);

/** Casts Wane and ticks until the hero holds its status, which is the commit. */
const castAndLand = (world: Simulation, hero: Readonly<Unit>): void => {
  cast(world);
  tickUntil(world, () => rowOf(hero, WANE) !== undefined, COMMIT_TICKS);
};

/**
 * How far `unit` walks along +X over `WALK_TICKS`, sent straight so nothing is spent on a
 * path. Two worlds measured this way differ only by what is on the unit.
 */
const walkOf = (world: Simulation, unit: Unit): number => {
  const result = issueMove(unit, FAR_X, 0);

  if (result !== "ok") {
    throw new Error("A living unit takes a move order");
  }

  setStraightPath(unit.path, FAR_X, 0);
  unit.needsPath = false;

  const before = unit.curr.x;

  tickTimes(world, WALK_TICKS);

  return unit.curr.x - before;
};

/** The hero's mana, which a refusal leaves for the hero to spend on something else. */
const mana = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.mana ?? Number.NaN;

/** Every event of `kind` the reader has not seen, advancing it past everything. */
const eventsOfKind = (
  world: Simulation,
  reader: EventReader,
  kind: DomainEvent["kind"],
): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === kind) {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

/** Every refusal reason the reader has seen since it last looked. */
const refusals = (world: Simulation, reader: EventReader): (string | null)[] =>
  eventsOfKind(world, reader, "command_refused").map((event) => event.reason);

/** Carries `unit` out of the circle, hash and all, as a walk of its own would leave it. */
const carryAway = (world: Simulation, unit: Unit, id: EntityId): void => {
  unit.curr.x = OUTSIDE_X;
  unit.prev.x = OUTSIDE_X;
  world.state.map.spatialHash.move(id, unit.curr);
};

describe.each(CASES)(
  "Wane at orb level $level",
  ({ level, seconds, selfSlow, chill }) => {
    const durationTicks = seconds * tuningTable.sim_hz;

    it("puts its status on the hero that cast it, for the catalogue's duration", () => {
      const { world, hero, heroId, reader } = arrange(level);

      castAndLand(world, hero);

      const applied = eventsOfKind(world, reader, "status_applied").find(
        (event) => event.statusId === WANE,
      );

      expect(applied?.unitId).toBe(heroId);
      expect(rowOf(hero, WANE)?.endsAtTick).toBe(
        (applied?.tick ?? 0) + durationTicks,
      );
    });

    it("hides the hero from aggro while it lasts, and shows it again when it ends", () => {
      const { world, hero } = arrange(level);

      castAndLand(world, hero);
      world.tick();

      expect(hero.disables.aggroHidden).toBe(true);

      const endsAtTick = rowOf(hero, WANE)?.endsAtTick ?? 0;

      tickUntil(world, (view) => view.tick > endsAtTick, durationTicks + 2);
      world.tick();

      expect(rowOf(hero, WANE)).toBeUndefined();
      expect(hero.disables.aggroHidden).toBe(false);
    });

    it("takes the Whorl table off the hero's own walk", () => {
      const bare = arrange(level);
      const waned = arrange(level);

      castAndLand(waned.world, waned.hero);
      waned.world.tick();

      const walked = walkOf(waned.world, waned.hero);

      expect(walked).toBeCloseTo(
        walkOf(bare.world, bare.hero) * (1 + selfSlow),
      );
    });

    it("carries a circle on the hero that chills every enemy inside it", () => {
      const { world, hero, enemy } = arrange(level);

      castAndLand(world, hero);
      tickUntil(
        world,
        () => rowOf(enemy, WANE_CHILL) !== undefined,
        COMMIT_TICKS,
      );

      expect(world.view.map.zones.count).toBe(1);
      expect(rowOf(enemy, WANE_CHILL)).toBeDefined();
    });

    it("takes the Quartz table off a chilled enemy's walk", () => {
      const bare = arrange(level);
      const chilled = arrange(level);

      castAndLand(chilled.world, chilled.hero);
      tickUntil(
        chilled.world,
        () => rowOf(chilled.enemy, WANE_CHILL) !== undefined,
        COMMIT_TICKS,
      );
      chilled.world.tick();

      const walked = walkOf(chilled.world, chilled.enemy);

      expect(walked).toBeCloseTo(walkOf(bare.world, bare.enemy) * (1 + chill));
    });

    it("lets the chill run out its half second after the enemy leaves the circle", () => {
      const { world, hero, enemy, enemyId } = arrange(level);

      castAndLand(world, hero);
      tickUntil(
        world,
        () => rowOf(enemy, WANE_CHILL) !== undefined,
        COMMIT_TICKS,
      );
      carryAway(world, enemy, enemyId);

      // The last application was the tick before the walk, so the row has its whole duration left.
      tickTimes(world, CHILL_TICKS - 1);

      expect(rowOf(enemy, WANE_CHILL)).toBeDefined();

      world.tick();

      expect(rowOf(enemy, WANE_CHILL)).toBeUndefined();
    });

    it("takes the circle off the ground when its lifetime is up", () => {
      const { world, hero } = arrange(level);

      castAndLand(world, hero);

      expect(world.view.map.zones.count).toBe(1);

      tickTimes(world, durationTicks + 1);

      expect(world.view.map.zones.count).toBe(0);
    });
  },
);

describe("a Wane the hero may not cast", () => {
  it("is refused for want of mana, and nothing lands and nothing is spent", () => {
    const { world, hero, reader } = arrange(1);

    submit(world, {
      kind: "drain_mana",
      tick: world.view.tick,
      timestamp: world.view.tick,
      amount: mana(world),
    });
    world.tick();
    cast(world);
    tickTimes(world, COMMIT_TICKS);

    expect(refusals(world, reader)).toEqual(["not_enough_mana"]);
    expect(rowOf(hero, WANE)).toBeUndefined();
    expect(world.view.map.zones.count).toBe(0);
    expect(mana(world)).toBeLessThan(FIRST_MANA_COST);
  });

  it("is refused while the hero is silenced, and nothing lands and nothing is spent", () => {
    const { world, hero, reader } = arrange(1);

    submit(world, {
      kind: "apply_status",
      tick: world.view.tick,
      timestamp: world.view.tick,
      statusId: "silence",
      ticks: LONG_TICKS,
    });
    world.tick();

    const before = mana(world);

    cast(world);
    tickTimes(world, COMMIT_TICKS);

    expect(refusals(world, reader)).toEqual(["silenced"]);
    expect(rowOf(hero, WANE)).toBeUndefined();
    expect(world.view.map.zones.count).toBe(0);
    expect(mana(world)).toBeGreaterThanOrEqual(before);
  });
});

describe("Wane against a pack that has the hero's scent", () => {
  /** The pack every grunt below belongs to. */
  const PACK = 1;

  /** Where the grunts at distance stand: inside the grunt's aggro radius and far outside its reach. */
  const DISTANT_X = [
    meleeGruntDef.aggroRadius - 50,
    meleeGruntDef.aggroRadius - 100,
  ];

  /** Where the adjacent grunt stands: behind the hero, inside its reach where it stands. */
  const ADJACENT_X = -140;

  /** How far the grunts at distance have come toward the hero when it casts: well on the way, and still far out of reach. */
  const CLOSED = 200;

  /** Ticks the case runs after the cast: long enough for the grunts at distance to walk home and the adjacent one to swing again. */
  const SETTLE = 90;

  /** Long enough for the adjacent grunt to face the hero and begin its first swing. */
  const PATIENCE = 300;

  /**
   * The hero at the origin with Wane prepared at the first level, two grunts chasing from
   * across the room and one already swinging from behind, all in one pack, on the content
   * registry with no wander.
   */
  const arrangePack = () => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({ tuning: { wander_radius: 0 } }),
    });
    const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
    const form = world.state.run.forms[0];

    if (form === undefined) {
      throw new Error("The hero has a form");
    }

    form.kit.prepared[FIRST_PREPARED] = WANE;

    const spawnGrunt = (x: number): Unit =>
      spawnEnemy(world, {
        definitionId: meleeGruntDef.id,
        x,
        y: 0,
        packId: PACK,
      });
    const distant = DISTANT_X.map(spawnGrunt);
    const adjacent = spawnGrunt(ADJACENT_X);

    return { world, hero, heroId: unitIdOf(world, hero), distant, adjacent };
  };

  it("sends the grunts chasing at distance home to rest, and the adjacent one keeps attacking", () => {
    const { world, hero, heroId, distant, adjacent } = arrangePack();

    tickUntil(
      world,
      () =>
        adjacent.state === "attack_windup" &&
        distant.every((unit) => unit.spawnPoint.x - unit.curr.x >= CLOSED),
      PATIENCE,
    );

    expect(distant.map((unit) => unit.ai.state)).toEqual(["chase", "chase"]);

    castAndLand(world, hero);
    world.tick();

    expect(hero.disables.aggroHidden).toBe(true);

    world.tick();

    expect(distant.map((unit) => unit.ai.state)).toEqual(["return", "return"]);

    const reader = createEventReader();

    tickTimes(world, SETTLE);

    const landed = eventsOfKind(world, reader, "unit_damaged").filter(
      (event) => event.unitId === heroId,
    );

    // Home, and at rest there with the hero still hidden, rather than turned back.
    expect(distant.map((unit) => unit.ai.state)).toEqual(["idle", "idle"]);
    expect([adjacent.ai.state, adjacent.order.targetId]).toEqual([
      "attack",
      heroId,
    ]);
    expect(landed.length).toBeGreaterThan(0);
  });
});
