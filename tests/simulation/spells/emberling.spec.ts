import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
} from "../../helpers";

/** The spell under test, and the summon it spawns, both by the id content registers them under. */
const EMBERLING = "emberling";

/** The spirit's own numbers, from the summon definition: what it stands on before the orbs add to it. */
const BASE_HEALTH = 300;
const BASE_ATTACK_DAMAGE = 22;
const FOLLOW_DISTANCE = 250;

/** Where the spirit stands when it arrives: nothing in front of the hero and this far to its right. */
const OFFSET_RIGHT = 80;

/** The health the dummy stands on: far above what a spec's shots take off it, so nothing dies. */
const DUMMY_HEALTH = 10000;

/** Where the dummy stands: on the line the spirit faces, inside its attack range. */
const DUMMY_AT = { x: 200, y: -OFFSET_RIGHT };

/** Where the hero walks when a case asks to be left behind, far enough that the spirit must follow. */
const WALK_X = 1200;

/** Ticks enough for a cast point and the commit behind it. */
const COMMIT_TICKS = 4;

/** Long enough for the hero to walk its distance and the spirit to catch it up. */
const PATIENCE = 400;

/** Ticks a case runs to show that nothing moved. */
const SETTLE = 60;

/** The index of the prepared entry slot D throws. */
const FIRST_PREPARED = 0;

/** One orb level the spec runs at, with the catalogue's lifetime and bonuses at that level. */
type Case = Readonly<{
  level: number;
  lifetimeSeconds: number;
  bonusHealth: number;
  bonusAttackDamage: number;
}>;

/** The two levels every case below runs at: the first and the cap. */
const CASES: readonly Case[] = [
  { level: 1, lifetimeSeconds: 20, bonusHealth: 0, bonusAttackDamage: 0 },
  { level: 7, lifetimeSeconds: 80, bonusHealth: 600, bonusAttackDamage: 60 },
];

type Arranged = {
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  dummies: Unit[];
  reader: EventReader;
};

/**
 * The hero at the origin facing along +X with every orb at `level` and Emberling prepared on
 * D, and a dummy where `places` names one. The registry is the content layer's, so the spell,
 * the summon, and every table are the ones the game ships.
 */
const arrange = (
  level: number,
  places: readonly Readonly<{ x: number; y: number }>[] = [],
): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world, { orbLevels: [level, level, level] });
  const dummies = places.map((place) =>
    spawnUnit(world, { x: place.x, y: place.y, health: DUMMY_HEALTH }),
  );
  const form = world.state.run.forms[0];
  const heroId = world.state.run.heroId;

  if (form === undefined || heroId === null) {
    throw new Error("The hero has a form and run scope names it");
  }

  form.kit.prepared[FIRST_PREPARED] = EMBERLING;

  return { world, hero, heroId, dummies, reader: createEventReader() };
};

/** How many spirits stand in the pool right now. */
const summonCount = (world: Simulation): number => {
  const units = world.state.map.units;
  let found = 0;

  for (let index = 0; index < units.end; index += 1) {
    if (units.at(index)?.kind === "summon") {
      found += 1;
    }
  }

  return found;
};

/** The spirit in the pool, and the id it holds, or nothing while none stands. */
const findSummon = (
  world: Simulation,
): Readonly<{ unit: Unit; id: EntityId }> | null => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (unit !== null && id !== null && unit.kind === "summon") {
      return { unit, id };
    }
  }

  return null;
};

/** Presses D, which a spell with no target casts on. */
const cast = (world: Simulation): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId: EMBERLING,
    target: { kind: "none" },
  });
};

/** Casts Emberling and ticks until the spirit is standing, which is the commit. */
const castAndSpawn = (
  world: Simulation,
): Readonly<{ unit: Unit; id: EntityId }> => {
  cast(world);
  tickUntil(world, () => findSummon(world) !== null, COMMIT_TICKS);

  const found = findSummon(world);

  if (found === null) {
    throw new Error("The cast spawns a spirit");
  }

  return found;
};

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

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

/** The tick the cast committed on, which is the tick the spirit was spawned on. */
const committedAt = (world: Simulation, reader: EventReader): number =>
  eventsOfKind(world, reader, "cast_committed")[0]?.tick ?? Number.NaN;

const distance = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
  Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y);

/** Sends the hero off to the far side of the arena, as a click out there does. */
const walkHeroAway = (world: Simulation): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x: WALK_X, y: 0 },
  });
};

describe.each(CASES)(
  "Emberling at orb level $level",
  ({ level, lifetimeSeconds, bonusHealth, bonusAttackDamage }) => {
    const lifetimeTicks = lifetimeSeconds * tuningTable.sim_hz;

    it("stands one spirit beside the hero, owned by it and wearing what the orbs add", () => {
      const { world, hero, heroId } = arrange(level);
      const { unit } = castAndSpawn(world);

      expect(unit.definitionId).toBe(EMBERLING);
      expect(unit.ownerId).toBe(heroId);
      expect(unit.curr).toEqual({
        x: hero.curr.x,
        y: hero.curr.y - OFFSET_RIGHT,
      });
      expect(unit.stats.maxHealth).toBe(BASE_HEALTH + bonusHealth);
      expect(unit.resources.health).toBe(BASE_HEALTH + bonusHealth);
      expect(summonCount(world)).toBe(1);
    });

    it("lives the lifetime its Quartz table gives, then gives its slot back", () => {
      const { world, reader } = arrange(level);
      const { unit, id } = castAndSpawn(world);
      const expiresAtTick = unit.expiresAtTick;

      expect(expiresAtTick).toBe(committedAt(world, reader) + lifetimeTicks);
      tickUntil(
        world,
        (view) => view.tick === expiresAtTick,
        lifetimeTicks + PATIENCE,
      );

      expect(world.state.map.units.resolve(id)).not.toBeNull();

      world.tick();

      expect(world.state.map.units.resolve(id)).toBeNull();
    });

    it("shoots a dummy inside its range for its attack damage and the Ember table, as physical", () => {
      const { world, dummies, reader } = arrange(level, [DUMMY_AT]);
      const { id } = castAndSpawn(world);
      const dummy = dummies[0];

      if (dummy === undefined) {
        throw new Error("The case places a dummy");
      }

      tickUntil(world, () => dummy.resources.health < DUMMY_HEALTH, PATIENCE);

      const [hit] = eventsOfKind(world, reader, "unit_damaged");

      expect(hit?.sourceId).toBe(id);
      expect(hit?.damageType).toBe("physical");
      expect(hit?.amount).toBe(BASE_ATTACK_DAMAGE + bonusAttackDamage);
    });
  },
);

describe("the spirit Emberling leaves behind", () => {
  /** The level every case below runs at: what it shows does not change with the orbs. */
  const LEVEL = 1;

  it("holds its ground while the hero stays inside its follow distance", () => {
    const { world } = arrange(LEVEL);
    const { unit } = castAndSpawn(world);
    const stood = { x: unit.curr.x, y: unit.curr.y };

    tickTimes(world, SETTLE);

    expect(unit.order.kind).toBe("none");
    expect(unit.curr).toEqual(stood);
  });

  it("takes none of the orders the player gives, and follows the hero on its own", () => {
    const { world, hero } = arrange(LEVEL);
    const { unit } = castAndSpawn(world);

    walkHeroAway(world);
    world.tick();

    expect(hero.order.kind).toBe("move");
    expect(unit.order.kind).toBe("none");

    tickTimes(world, PATIENCE);

    expect(hero.curr.x).toBe(WALK_X);
    expect(distance(hero, unit)).toBeCloseTo(FOLLOW_DISTANCE);
  });

  it("goes on the tick the hero dies, without a death of its own", () => {
    const { world, reader } = arrange(LEVEL);
    const { id } = castAndSpawn(world);

    eventsOfKind(world, reader, "unit_died");
    submit(world, {
      kind: "kill_hero",
      tick: world.view.tick,
      timestamp: world.view.tick,
    });
    world.tick();

    expect(world.state.map.units.resolve(id)).toBeNull();
    expect(
      eventsOfKind(world, reader, "unit_died").map((event) => event.unitId),
    ).toEqual([world.state.run.heroId]);
  });
});
