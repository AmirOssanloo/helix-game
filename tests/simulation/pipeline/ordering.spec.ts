import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import { releaseUnit } from "@domain/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeFormDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  spawnHero,
  submit,
  tickUntil,
} from "../../helpers";

/** The two slot keys the prepared spells sit on, newest first. */
const D = 5;
const F = 6;

/** The form's mana at level one with no modifier: the factory's base plus its intelligence. */
const FULL_MANA = 150;

const COST = 50;

/** The cast point and the backswing of the factory's spells: a tenth of a second at 30 Hz. */
const CAST_POINT_TICKS = 3;

/** Long enough that a stun outlasts a cast point and its backswing. */
const STUN_TICKS = 30;

const pointSpell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "ember"],
  targeting: "point",
});
const noneSpell = makeSpellDef.build({
  recipe: ["quartz", "quartz", "quartz"],
  targeting: "none",
  range: 0,
});
const otherNoneSpell = makeSpellDef.build({
  recipe: ["ember", "ember", "ember"],
  targeting: "none",
  range: 0,
});

const form = makeFormDef.build({
  abilities: [pointSpell.id, noneSpell.id, otherNoneSpell.id],
});

type Arranged = { world: Simulation; hero: Unit; reader: EventReader };

/** A world whose hero holds `prepared` in its two slots, standing at the origin facing +X with every orb at level one. */
const worldHolding = (prepared: readonly (string | null)[]): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [pointSpell, noneSpell, otherNoneSpell],
    }),
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

const pressSlot = (world: Simulation, slot: number): void => {
  submit(world, {
    kind: "slot",
    tick: world.view.tick,
    timestamp: world.view.tick,
    slot,
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

const stun = (world: Simulation): void => {
  submit(world, {
    kind: "apply_status",
    tick: world.view.tick,
    timestamp: world.view.tick,
    statusId: "stun",
    ticks: STUN_TICKS,
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

describe("two casts in one tick", () => {
  it("leaves the second under way: one order at a time, never a queue", () => {
    const { world, hero } = worldHolding([noneSpell.id, otherNoneSpell.id]);
    castNone(world, noneSpell.id);
    castNone(world, otherNoneSpell.id);

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
    expect(hero.cast.abilityId).toBe(otherNoneSpell.id);
  });

  it("commits the second only, the first having spent nothing", () => {
    const { world, hero, reader } = worldHolding([
      noneSpell.id,
      otherNoneSpell.id,
    ]);
    castNone(world, noneSpell.id);
    castNone(world, otherNoneSpell.id);

    ticks(world, CAST_POINT_TICKS + 1);

    expect(eventsOfKind(world, reader, "cast_committed")).toMatchObject([
      { abilityId: otherNoneSpell.id },
    ]);
    expect(mana(world)).toBe(FULL_MANA - COST);
    expect(hero.cooldowns.get(noneSpell.id)).toBeUndefined();
  });

  it("refuses neither: the first is replaced, not rejected", () => {
    const arranged = worldHolding([noneSpell.id, otherNoneSpell.id]);
    castNone(arranged.world, noneSpell.id);
    castNone(arranged.world, otherNoneSpell.id);

    arranged.world.tick();

    expect(
      eventsOfKind(arranged.world, arranged.reader, "command_refused"),
    ).toEqual([]);
  });

  it("applies two slot keys in key order whatever order they were pressed in: F lands after D", () => {
    const { world, hero } = worldHolding([noneSpell.id, otherNoneSpell.id]);
    pressSlot(world, F);
    pressSlot(world, D);

    world.tick();

    expect(hero.cast.abilityId).toBe(otherNoneSpell.id);
  });
});

describe("a command during the face stage", () => {
  it("a stop cancels the cast with nothing spent", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, -300, 0);
    ticks(world, 2);

    stop(world);
    ticks(world, CAST_POINT_TICKS + 3);

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

describe("a command during the cast point", () => {
  it("a move cancels the cast with nothing spent, and the hero walks", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);
    world.tick();

    moveTo(world, 300, 300);
    ticks(world, CAST_POINT_TICKS);

    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
    expect(hero.cast.abilityId).toBeNull();
    expect(hero.order.kind).toBe("move");
    expect(mana(world)).toBe(FULL_MANA);
  });

  it("a stop cancels it with nothing spent", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);
    world.tick();

    stop(world);
    ticks(world, CAST_POINT_TICKS + 1);

    expect(hero.state).toBe("idle");
    expect(mana(world)).toBe(FULL_MANA);
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
  });

  it("a stun cancels it with nothing spent", () => {
    const { world, hero, reader } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);
    world.tick();

    stun(world);
    ticks(world, CAST_POINT_TICKS + 1);

    expect(hero.state).toBe("idle");
    expect(mana(world)).toBe(FULL_MANA);
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
  });

  it("death cancels it with nothing spent", () => {
    const { world, reader } = worldHolding([pointSpell.id, null]);
    const heroId = world.state.run.heroId;
    castAt(world, pointSpell.id, 300, 0);
    world.tick();

    if (heroId === null) {
      throw new Error("The hero was spawned");
    }

    releaseUnit(world.state, heroId);
    ticks(world, CAST_POINT_TICKS + 1);

    expect(mana(world)).toBe(FULL_MANA);
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
  });

  it("a second cast cancels the first, which spent nothing, and commits in its place", () => {
    const { world, reader } = worldHolding([pointSpell.id, noneSpell.id]);
    castAt(world, pointSpell.id, 300, 0);
    world.tick();

    castNone(world, noneSpell.id);
    ticks(world, CAST_POINT_TICKS + 1);

    expect(eventsOfKind(world, reader, "cast_committed")).toMatchObject([
      { abilityId: noneSpell.id },
    ]);
    expect(mana(world)).toBe(FULL_MANA - COST);
  });
});

describe("a command during the backswing", () => {
  it("a move cancels the backswing only: the hero walks, the cast already landed", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);
    ticks(world, CAST_POINT_TICKS + 1);

    expect(hero.state).toBe("ability_backswing");

    moveTo(world, 300, 0);
    world.tick();

    expect(hero.state).toBe("moving");
    expect(mana(world)).toBe(FULL_MANA - COST);
  });

  it("a stop takes nothing back", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);
    ticks(world, CAST_POINT_TICKS + 1);

    stop(world);
    world.tick();

    expect(hero.state).toBe("idle");
    expect(mana(world)).toBe(FULL_MANA - COST);
    expect(hero.cooldowns.get(pointSpell.id)).toBeDefined();
  });

  it("a cast begins its cast point at once", () => {
    const { world, hero } = worldHolding([pointSpell.id, noneSpell.id]);
    castAt(world, pointSpell.id, 300, 0);
    ticks(world, CAST_POINT_TICKS + 1);

    castNone(world, noneSpell.id);
    world.tick();

    expect(hero.state).toBe("ability_cast_point");
    expect(hero.cast.abilityId).toBe(noneSpell.id);
  });
});
