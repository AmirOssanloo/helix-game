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
} from "../helpers";

/** The slot key the newest prepared spell sits on. */
const D = 5;

/** The form's mana at level one with no modifier: the factory's base plus its intelligence. */
const FULL_MANA = 150;

const COST = 50;

/** Ten seconds at 30 Hz. */
const COOLDOWN_TICKS = 300;

/** The cast point and the backswing of the factory's spells: a tenth of a second at 30 Hz. */
const CAST_POINT_TICKS = 3;
const BACKSWING_TICKS = 3;

const RANGE = 600;

/** The ticks the hero stands and yaws before an aim behind it is inside the action cone. */
const TURN_TICKS = 5;

const pointSpell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "ember"],
  targeting: "point",
});
const instantSpell = makeSpellDef.build({
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
const zeroPointSpell = makeSpellDef.build({
  recipe: ["quartz", "quartz", "whorl"],
  castPointSeconds: 0,
  backswingSeconds: 0,
});
const leveledSpell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "whorl"],
  manaCost: [10, 20, 30, 40, 50, 60, 70],
});

const form = makeFormDef.build({
  abilities: [
    pointSpell.id,
    instantSpell.id,
    unitSpell.id,
    directionSpell.id,
    zeroPointSpell.id,
    leveledSpell.id,
  ],
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
      spells: [
        pointSpell,
        instantSpell,
        unitSpell,
        directionSpell,
        zeroPointSpell,
        leveledSpell,
      ],
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

const moveTo = (world: Simulation, x: number, y: number): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x, y },
  });
};

const stop = (world: Simulation): void => {
  submit(world, {
    kind: "stop",
    tick: world.view.tick,
    timestamp: world.view.tick,
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

describe("the stages of a point cast aimed ahead", () => {
  it("begins the cast point on the tick the command is consumed, the order gone and the aim kept", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
    expect(hero.order.kind).toBe("none");
    expect(hero.cast.abilityId).toBe(pointSpell.id);
    expect(hero.cast.position).toEqual({ x: 300, y: 0 });
    expect(hero.stageEndsAtTick).toBe(CAST_POINT_TICKS);
  });

  it("spends nothing, starts no clock, and announces nothing before the cast point ends", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);

    ticks(world, CAST_POINT_TICKS);

    expect(hero.state).toBe("ability_cast_point");
    expect(mana(world)).toBe(FULL_MANA);
    expect(hero.cooldowns.get(pointSpell.id)).toBeUndefined();
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
  });

  it("commits on the tick the cast point ends: mana spent, clock started, one event, the backswing begun", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);

    ticks(world, CAST_POINT_TICKS + 1);

    expect(mana(world)).toBe(FULL_MANA - COST);
    expect(hero.cooldowns.get(pointSpell.id)).toBe(
      CAST_POINT_TICKS + COOLDOWN_TICKS,
    );
    expect(eventsOfKind(world, reader, "cast_committed")).toMatchObject([
      {
        kind: "cast_committed",
        tick: CAST_POINT_TICKS,
        abilityId: pointSpell.id,
      },
    ]);
    expect(hero.state).toBe("ability_backswing");
    expect(hero.cast.abilityId).toBeNull();
    expect(hero.stageEndsAtTick).toBe(CAST_POINT_TICKS + BACKSWING_TICKS);
  });

  it("stays in the backswing until its tick, then is idle with no order", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);

    ticks(world, CAST_POINT_TICKS + BACKSWING_TICKS);

    expect(hero.state).toBe("ability_backswing");

    world.tick();

    expect(hero.state).toBe("idle");
    expect(hero.order.kind).toBe("none");
  });

  it("never moves the hero", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);

    ticks(world, CAST_POINT_TICKS + BACKSWING_TICKS + 1);

    expect(hero.curr).toEqual({ x: 0, y: 0 });
  });
});

describe("a cast point and a backswing of zero ticks", () => {
  it("commits on the tick the command is consumed and leaves the hero idle on it", () => {
    const { world, hero, reader } = worldHolding([zeroPointSpell.id, null]);
    castAt(world, zeroPointSpell.id, 300, 0);

    world.tick();

    expect(mana(world)).toBe(FULL_MANA - COST);
    expect(hero.cooldowns.get(zeroPointSpell.id)).toBe(COOLDOWN_TICKS);
    expect(eventsOfKind(world, reader, "cast_committed")).toMatchObject([
      { tick: 0, abilityId: zeroPointSpell.id },
    ]);
    expect(hero.state).toBe("idle");
  });
});

describe("the face stage", () => {
  it("holds the cast point until the bearing to a point behind is inside the cone, standing still", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, -300, 0);

    for (let tick = 0; tick < TURN_TICKS; tick += 1) {
      world.tick();

      expect(hero.state).toBe("turning");
      expect(hero.order.kind).toBe("cast");
      expect(hero.curr).toEqual({ x: 0, y: 0 });
    }

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
    expect(hero.stageEndsAtTick).toBe(TURN_TICKS + CAST_POINT_TICKS);
  });

  it("turns toward a direction target and commits without walking toward it", () => {
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

describe("a no-target spell", () => {
  it("is cast from its slot key on the key-down, with no facing", () => {
    const { world, hero, reader } = worldHolding([instantSpell.id, null]);
    hero.facing = 2;
    submit(world, { kind: "slot", tick: 0, timestamp: 0, slot: D });

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
    expect(hero.facing).toBe(2);

    ticks(world, CAST_POINT_TICKS);

    expect(eventsOfKind(world, reader, "cast_committed")).toMatchObject([
      { abilityId: instantSpell.id },
    ]);
    expect(mana(world)).toBe(FULL_MANA - COST);
  });

  it("is cast from a cast command with no target all the same", () => {
    const { world, hero } = worldHolding([instantSpell.id, null]);
    castNone(world, instantSpell.id);

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
  });
});

describe("a cancel during the cast point spends nothing and starts no clock", () => {
  const assertNothingSpent = ({ world, hero, reader }: Arranged): void => {
    expect(mana(world)).toBe(FULL_MANA);
    expect(hero.cooldowns.get(pointSpell.id)).toBeUndefined();
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
  };

  it("on a stop", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    const { world, hero } = arranged;
    castAt(world, pointSpell.id, 300, 0);
    world.tick();

    stop(world);
    ticks(world, CAST_POINT_TICKS + 1);

    expect(hero.state).toBe("idle");
    expect(hero.cast.abilityId).toBeNull();
    assertNothingSpent(arranged);
  });

  it("on a stun", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    const { world, hero } = arranged;
    castAt(world, pointSpell.id, 300, 0);
    world.tick();

    hero.disables.stunned = true;
    ticks(world, CAST_POINT_TICKS + 1);

    expect(hero.state).toBe("idle");
    assertNothingSpent(arranged);
  });

  it("on death, the hero released from the world", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    const { world } = arranged;
    const heroId = world.state.run.heroId;
    castAt(world, pointSpell.id, 300, 0);
    world.tick();

    if (heroId === null) {
      throw new Error("The hero was spawned");
    }

    releaseUnit(world.state, heroId);
    ticks(world, CAST_POINT_TICKS + 1);

    expect(mana(world)).toBe(FULL_MANA);
    expect(eventsOfKind(world, arranged.reader, "cast_committed")).toEqual([]);
  });

  it("on a unit target that is gone", () => {
    const arranged = worldHolding([unitSpell.id, null]);
    const { world, hero, reader } = arranged;
    const targetId = spawnTarget(world, 200, 0);
    castUnit(world, unitSpell.id, targetId);
    world.tick();

    expect(hero.state).toBe("ability_cast_point");

    releaseUnit(world.state, targetId);
    ticks(world, CAST_POINT_TICKS + 1);

    expect(hero.state).toBe("idle");
    expect(mana(world)).toBe(FULL_MANA);
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
  });
});

describe("during the face stage", () => {
  it("a stop cancels the cast with nothing spent", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, -300, 0);
    world.tick();
    world.tick();

    stop(world);
    ticks(world, TURN_TICKS + CAST_POINT_TICKS + 1);

    expect(hero.state).toBe("idle");
    expect(hero.cast.abilityId).toBeNull();
    expect(mana(world)).toBe(FULL_MANA);
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
  });

  it("a move replaces the cast, and the hero walks with nothing spent", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, -300, 0);
    world.tick();

    moveTo(world, 300, 0);
    world.tick();

    expect(hero.order.kind).toBe("move");
    expect(hero.cast.abilityId).toBeNull();

    tickUntil(world, () => hero.state === "idle", 100);

    expect(hero.curr).toEqual({ x: 300, y: 0 });
    expect(mana(world)).toBe(FULL_MANA);
  });
});

describe("during the cast point", () => {
  it("a move cancels the cast with nothing spent, and the hero walks", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);
    world.tick();

    expect(hero.state).toBe("ability_cast_point");

    moveTo(world, 300, 300);
    ticks(world, CAST_POINT_TICKS);

    expect(eventsOfKind(world, reader, "command_refused")).toEqual([]);
    expect(eventsOfKind(world, createEventReader(), "cast_committed")).toEqual(
      [],
    );
    expect(hero.cast.abilityId).toBeNull();
    expect(hero.order.kind).toBe("move");
    expect(hero.curr).not.toEqual({ x: 0, y: 0 });
    expect(mana(world)).toBe(FULL_MANA);
  });

  it("a second cast cancels the first, which spent nothing, and commits in its place", () => {
    const { world, reader } = worldHolding([pointSpell.id, instantSpell.id]);
    castAt(world, pointSpell.id, 300, 0);
    world.tick();

    castNone(world, instantSpell.id);
    ticks(world, CAST_POINT_TICKS + 1);

    expect(eventsOfKind(world, reader, "command_refused")).toEqual([]);
    expect(
      eventsOfKind(world, createEventReader(), "cast_committed"),
    ).toMatchObject([{ abilityId: instantSpell.id }]);
    expect(mana(world)).toBe(FULL_MANA - COST);
  });

  it("a stop after the cast point ended takes nothing back", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);
    ticks(world, CAST_POINT_TICKS + 1);

    stop(world);
    world.tick();

    expect(hero.state).toBe("idle");
    expect(mana(world)).toBe(FULL_MANA - COST);
    expect(hero.cooldowns.get(pointSpell.id)).toBe(
      CAST_POINT_TICKS + COOLDOWN_TICKS,
    );
  });
});

describe("during the backswing", () => {
  it("a move cancels the backswing only: the hero walks, the cast already landed", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);
    ticks(world, CAST_POINT_TICKS + 1);

    expect(hero.state).toBe("ability_backswing");

    moveTo(world, 300, 0);
    world.tick();

    expect(hero.state).toBe("moving");
    expect(hero.order.kind).toBe("move");
    expect(hero.curr.x).toBeGreaterThan(0);
    expect(mana(world)).toBe(FULL_MANA - COST);
    expect(hero.cooldowns.get(pointSpell.id)).toBe(
      CAST_POINT_TICKS + COOLDOWN_TICKS,
    );
  });

  it("a cast begins its cast point at once", () => {
    const { world, hero } = worldHolding([pointSpell.id, instantSpell.id]);
    castAt(world, pointSpell.id, 300, 0);
    ticks(world, CAST_POINT_TICKS + 1);

    castNone(world, instantSpell.id);
    world.tick();

    expect(hero.state).toBe("ability_cast_point");
    expect(hero.cast.abilityId).toBe(instantSpell.id);
  });
});

describe("the request stage refuses, announcing the spell and the reason", () => {
  const refusals = (arranged: Arranged): DomainEvent[] =>
    eventsOfKind(arranged.world, arranged.reader, "command_refused");

  it("a spell no table holds", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    castAt(arranged.world, "no_such_spell", 300, 0);

    arranged.world.tick();

    expect(refusals(arranged)).toMatchObject([
      { reason: "unknown_ability", abilityId: "no_such_spell", slot: 0 },
    ]);
    expect(arranged.hero.state).toBe("idle");
  });

  it("a spell no slot of the kit holds", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    castNone(arranged.world, instantSpell.id);

    arranged.world.tick();

    expect(refusals(arranged)).toMatchObject([
      { reason: "ability_not_held", abilityId: instantSpell.id },
    ]);
  });

  it("a target of the wrong kind, a slot key on a targeted spell included, naming the key or the spell", () => {
    const arranged = worldHolding([pointSpell.id, instantSpell.id]);
    castNone(arranged.world, pointSpell.id);
    castAt(arranged.world, instantSpell.id, 300, 0);
    submit(arranged.world, { kind: "slot", tick: 0, timestamp: 0, slot: D });

    arranged.world.tick();

    expect(refusals(arranged)).toMatchObject([
      { reason: "invalid_target", abilityId: null, slot: D },
      { reason: "invalid_target", abilityId: pointSpell.id, slot: 0 },
      { reason: "invalid_target", abilityId: instantSpell.id, slot: 0 },
    ]);
  });

  it("a unit target that does not exist", () => {
    const arranged = worldHolding([unitSpell.id, null]);
    const targetId = spawnTarget(arranged.world, 200, 0);
    releaseUnit(arranged.world.state, targetId);
    castUnit(arranged.world, unitSpell.id, targetId);

    arranged.world.tick();

    expect(refusals(arranged)).toMatchObject([
      { reason: "target_not_found", abilityId: unitSpell.id },
    ]);
  });

  it("a spell whose clock is running", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    arranged.hero.cooldowns.set(pointSpell.id, 500);
    castAt(arranged.world, pointSpell.id, 300, 0);

    arranged.world.tick();

    expect(refusals(arranged)).toMatchObject([
      { reason: "on_cooldown", abilityId: pointSpell.id },
    ]);
    expect(mana(arranged.world)).toBe(FULL_MANA);
  });

  it("a spell the form lacks the mana for", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    const record = arranged.world.state.run.forms[0];

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    record.resources.mana = COST - 1;
    castAt(arranged.world, pointSpell.id, 300, 0);

    arranged.world.tick();

    expect(refusals(arranged)).toMatchObject([
      { reason: "not_enough_mana", abilityId: pointSpell.id },
    ]);
    expect(arranged.hero.state).toBe("idle");
  });

  it("a target out of range while rooted, and takes one in range", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    arranged.hero.disables.rooted = true;
    castAt(arranged.world, pointSpell.id, RANGE + 1, 0);
    arranged.world.tick();

    expect(refusals(arranged)).toMatchObject([
      { reason: "out_of_range", abilityId: pointSpell.id },
    ]);

    castAt(arranged.world, pointSpell.id, RANGE, 0);
    arranged.world.tick();

    expect(refusals(arranged)).toEqual([]);
    expect(arranged.hero.state).toBe("ability_cast_point");
  });
});

describe("the approach stage", () => {
  it("walks toward a point beyond range and casts once inside it, aimed at the point", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, RANGE + 300, 0);

    const walked = tickUntil(
      world,
      () => hero.state === "ability_cast_point",
      100,
    );

    expect(walked).toBeGreaterThan(1);
    expect(hero.curr.x).toBeGreaterThanOrEqual(300);
    expect(hero.curr.x).toBeLessThan(300 + 10);
    expect(hero.cast.position).toEqual({ x: RANGE + 300, y: 0 });

    ticks(world, CAST_POINT_TICKS + 1);

    expect(eventsOfKind(world, reader, "cast_committed")).toHaveLength(1);
  });

  it("walks toward a unit beyond range and casts once inside it", () => {
    const { world, hero, reader } = worldHolding([unitSpell.id, null]);
    const targetId = spawnTarget(world, RANGE + 400, 0);
    castUnit(world, unitSpell.id, targetId);

    tickUntil(world, () => hero.state === "ability_cast_point", 100);

    expect(hero.curr.x).toBeGreaterThan(0);
    expect(hero.order.kind).toBe("none");

    ticks(world, CAST_POINT_TICKS + 1);

    expect(eventsOfKind(world, reader, "cast_committed")).toHaveLength(1);
  });

  it("cancels with nothing spent when the walk ends at the map's edge still out of range", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null], {
      minX: -500,
      minY: -500,
      maxX: 500,
      maxY: 500,
    });
    castAt(world, pointSpell.id, 3000, 0);
    world.tick();

    expect(hero.state).toBe("moving");

    tickUntil(world, () => hero.state === "idle", 200);

    expect(hero.curr.x).toBeGreaterThan(400);
    expect(hero.cast.abilityId).toBeNull();
    expect(mana(world)).toBe(FULL_MANA);
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
  });

  it("stops walking on the tick it comes into range: a cast never overshoots its range", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, RANGE + 300, 0);

    tickUntil(world, () => hero.state === "ability_cast_point", 100);

    const atCastPoint = hero.curr.x;

    ticks(world, CAST_POINT_TICKS + BACKSWING_TICKS + 1);

    expect(hero.curr.x).toBe(atCastPoint);
    expect(hero.state).toBe("idle");
  });
});

describe("what the commit reads", () => {
  it("the mana at the lowest level among the recipe's orbs", () => {
    const { world } = worldHolding([leveledSpell.id, null]);
    const record = world.state.run.forms[0];

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    record.kit.orbLevels[0] = 5;
    record.kit.orbLevels[1] = 3;
    record.kit.orbLevels[2] = 7;
    castAt(world, leveledSpell.id, 300, 0);

    ticks(world, CAST_POINT_TICKS + 1);

    expect(mana(world)).toBe(FULL_MANA - 30);
  });

  it("the Whorl percentage held at commit, baked into the clock", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    const W = 2;

    for (let press = 0; press < 3; press += 1) {
      submit(world, { kind: "slot", tick: 0, timestamp: 0, slot: W });
    }

    world.tick();
    castAt(world, pointSpell.id, 300, 0);

    ticks(world, CAST_POINT_TICKS + 1);

    expect(hero.cooldowns.get(pointSpell.id)).toBe(
      1 + CAST_POINT_TICKS + Math.round(COOLDOWN_TICKS * 0.99 * 0.99 * 0.99),
    );
  });

  it("the no cooldowns flag, which lets a cast through while its clock runs", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    hero.cooldowns.set(pointSpell.id, 500);
    world.state.run.debug.noCooldowns = true;
    castAt(world, pointSpell.id, 300, 0);

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
  });

  it("the infinite mana flag, which lets a cast through with no mana and spends nothing", () => {
    const { world, reader } = worldHolding([pointSpell.id, null]);
    const record = world.state.run.forms[0];

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    record.resources.mana = 0;
    world.state.run.debug.infiniteMana = true;
    castAt(world, pointSpell.id, 300, 0);

    ticks(world, CAST_POINT_TICKS + 1);

    expect(eventsOfKind(world, reader, "cast_committed")).toHaveLength(1);
    expect(mana(world)).toBe(0);
  });
});
