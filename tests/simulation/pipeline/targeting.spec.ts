import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import { acquireUnit, releaseUnit } from "@domain/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeFormDef,
  makeMapDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  spawnHero,
  submit,
  tickUntil,
} from "../../helpers";

/** The slot key the newest prepared spell sits on. */
const D = 5;

/** The cast point and the backswing of the factory's spells: a tenth of a second at 30 Hz. */
const CAST_POINT_TICKS = 3;

const RANGE = 600;

/** The ticks the hero stands and yaws before an aim behind it is inside the action cone. */
const TURN_TICKS = 5;

const pointSpell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "ember"],
  targeting: "point",
});
const noneSpell = makeSpellDef.build({
  recipe: ["quartz", "quartz", "quartz"],
  targeting: "none",
  range: 0,
});
const unitSpell = makeSpellDef.build({
  recipe: ["whorl", "whorl", "whorl"],
  targeting: "unit",
});
const directionSpell = makeSpellDef.build({
  recipe: ["ember", "ember", "ember"],
  targeting: "direction",
});

const form = makeFormDef.build({
  abilities: [pointSpell.id, noneSpell.id, unitSpell.id, directionSpell.id],
});

type Arranged = { world: Simulation; hero: Unit; reader: EventReader };

/** A world whose hero holds `prepared` in its two slots, standing at the origin facing +X with every orb at level one. */
const worldHolding = (
  prepared: readonly (string | null)[],
  bounds = { minX: -5000, minY: -5000, maxX: 5000, maxY: 5000 },
): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [pointSpell, noneSpell, unitSpell, directionSpell],
    }),
    map: makeMapDef.build({ bounds }),
  });
  const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
  const record = world.state.run.forms[0];

  if (record === undefined) {
    throw new Error("The hero has a form");
  }

  for (let index = 0; index < prepared.length; index += 1) {
    record.kit.prepared[index] = prepared[index] ?? null;
  }

  return { world, hero, reader: createEventReader() };
};

const mana = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.mana ?? Number.NaN;

const castAt = (
  world: Simulation,
  abilityId: string,
  x: number,
  y: number,
): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId,
    target: { kind: "point", position: { x, y } },
  });
};

const castNone = (world: Simulation, abilityId: string): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId,
    target: { kind: "none" },
  });
};

const castUnit = (
  world: Simulation,
  abilityId: string,
  unitId: number,
): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId,
    target: { kind: "unit", unitId },
  });
};

const ticks = (world: Simulation, count: number): void => {
  for (let index = 0; index < count; index += 1) {
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

/** Spawns a plain unit at (`x`, `y`) and returns its id. */
const spawnTarget = (world: Simulation, x: number, y: number): number => {
  const id = acquireUnit(world.state, "enemy", x, y);

  if (id === null) {
    throw new Error("The unit pool has room for a target");
  }

  return id;
};

describe("a no-target ability", () => {
  it("begins its cast point on the tick that sees the key-down", () => {
    const { world, hero } = worldHolding([noneSpell.id, null]);
    submit(world, { kind: "slot", tick: 0, timestamp: 0, slot: D });

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
    expect(hero.cast.abilityId).toBe(noneSpell.id);
  });

  it("commits without turning: the hero keeps the facing it had", () => {
    const { world, hero, reader } = worldHolding([noneSpell.id, null]);
    hero.facing = 2;
    submit(world, { kind: "slot", tick: 0, timestamp: 0, slot: D });

    ticks(world, CAST_POINT_TICKS + 1);

    expect(hero.facing).toBe(2);
    expect(eventsOfKind(world, reader, "cast_committed")).toMatchObject([
      { abilityId: noneSpell.id },
    ]);
  });

  it("is cast from a cast command carrying no target all the same", () => {
    const { world, hero } = worldHolding([noneSpell.id, null]);
    castNone(world, noneSpell.id);

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
  });
});

describe("a point ability", () => {
  it("begins its cast point on the tick that sees the click, keeping the aim", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
    expect(hero.order.kind).toBe("none");
    expect(hero.cast.position).toEqual({ x: 300, y: 0 });
  });

  it("holds the cast point until the bearing to a point behind is inside the cone, standing still", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, -300, 0);

    for (let tick = 0; tick < TURN_TICKS; tick += 1) {
      world.tick();

      expect(hero.state).toBe("turning");
      expect(hero.curr).toEqual({ x: 0, y: 0 });
    }

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
  });

  it("walks toward a point beyond range and casts once inside it, aimed at the point", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, RANGE + 300, 0);

    const walked = tickUntil(
      world,
      () => hero.state === "ability_cast_point",
      100,
    );

    expect(walked).toBeGreaterThan(1);
    expect(hero.cast.position).toEqual({ x: RANGE + 300, y: 0 });

    ticks(world, CAST_POINT_TICKS + 1);

    expect(eventsOfKind(world, reader, "cast_committed")).toHaveLength(1);
  });

  it("stops walking on the tick it comes into range: a cast never overshoots its range", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, RANGE + 300, 0);

    tickUntil(world, () => hero.state === "ability_cast_point", 100);

    const atCastPoint = hero.curr.x;

    ticks(world, CAST_POINT_TICKS + 1);

    expect(hero.curr.x).toBe(atCastPoint);
  });

  it("cancels with nothing spent when the walk ends at the map's edge still out of range", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null], {
      minX: -500,
      minY: -500,
      maxX: 500,
      maxY: 500,
    });
    const full = mana(world);
    castAt(world, pointSpell.id, 3000, 0);
    world.tick();

    expect(hero.state).toBe("moving");

    tickUntil(world, () => hero.state === "idle", 200);

    expect(hero.cast.abilityId).toBeNull();
    expect(mana(world)).toBe(full);
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
  });
});

describe("a unit ability", () => {
  it("follows the target's current position while it closes, not the position at the click", () => {
    const { world, hero } = worldHolding([unitSpell.id, null]);
    const targetId = spawnTarget(world, RANGE + 400, 0);
    const target = world.state.map.units.resolve(targetId);

    if (target === null) {
      throw new Error("The target was spawned");
    }

    castUnit(world, unitSpell.id, targetId);
    world.tick();
    target.curr.y = 900;
    world.tick();

    expect(hero.cast.position).toEqual({ x: RANGE + 400, y: 900 });
  });

  it("walks toward a target beyond range and casts once inside it", () => {
    const { world, hero, reader } = worldHolding([unitSpell.id, null]);
    const targetId = spawnTarget(world, RANGE + 400, 0);
    castUnit(world, unitSpell.id, targetId);

    tickUntil(world, () => hero.state === "ability_cast_point", 100);

    expect(hero.curr.x).toBeGreaterThan(0);

    ticks(world, CAST_POINT_TICKS + 1);

    expect(eventsOfKind(world, reader, "cast_committed")).toHaveLength(1);
  });

  it("cancels at no cost when the target leaves the world during the cast point", () => {
    const { world, hero, reader } = worldHolding([unitSpell.id, null]);
    const full = mana(world);
    const targetId = spawnTarget(world, 200, 0);
    castUnit(world, unitSpell.id, targetId);
    world.tick();

    expect(hero.state).toBe("ability_cast_point");

    releaseUnit(world.state, targetId);
    ticks(world, CAST_POINT_TICKS + 1);

    expect(hero.state).toBe("idle");
    expect(mana(world)).toBe(full);
    expect(hero.cooldowns.get(unitSpell.id)).toBeUndefined();
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
  });
});

describe("a direction ability", () => {
  it("turns toward the click and commits without walking toward it", () => {
    const { world, hero, reader } = worldHolding([directionSpell.id, null]);
    submit(world, {
      kind: "cast",
      tick: 0,
      timestamp: 0,
      abilityId: directionSpell.id,
      target: { kind: "direction", position: { x: 0, y: 4000 } },
    });

    tickUntil(world, (view) => view.tick > TURN_TICKS + CAST_POINT_TICKS, 50);

    expect(hero.facing).toBeCloseTo(Math.PI / 2);
    expect(hero.curr).toEqual({ x: 0, y: 0 });
    expect(eventsOfKind(world, reader, "cast_committed")).toHaveLength(1);
  });
});
