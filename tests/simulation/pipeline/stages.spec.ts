import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeFormDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  spawnHero,
  submit,
} from "../../helpers";

/** The slot key the composer's own clock is read from. */
const W = 2;

/** The form's mana at level one with no modifier: the factory's base plus its intelligence. */
const FULL_MANA = 150;

const COST = 50;

/** Ten seconds at 30 Hz. */
const COOLDOWN_TICKS = 300;

/** The cast point and the backswing of the factory's spells: a tenth of a second at 30 Hz. */
const CAST_POINT_TICKS = 3;
const BACKSWING_TICKS = 3;

const pointSpell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "ember"],
  targeting: "point",
});
const instantSpell = makeSpellDef.build({
  recipe: ["quartz", "quartz", "whorl"],
  castPointSeconds: 0,
  backswingSeconds: 0,
});
const leveledSpell = makeSpellDef.build({
  recipe: ["quartz", "whorl", "whorl"],
  manaCost: [10, 20, 30, 40, 50, 60, 70],
});

const form = makeFormDef.build({
  abilities: [pointSpell.id, instantSpell.id, leveledSpell.id],
});

type Arranged = { world: Simulation; hero: Unit; reader: EventReader };

/** A world whose hero holds `prepared` in its two slots, standing at the origin facing +X with every orb at level one. */
const worldHolding = (prepared: readonly (string | null)[]): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [pointSpell, instantSpell, leveledSpell],
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

describe("the stages of a cast aimed ahead", () => {
  it("begins the cast point on the tick the command is consumed, the order gone", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    castAt(world, pointSpell.id, 300, 0);

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
    expect(hero.order.kind).toBe("none");
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
    const { world, hero, reader } = worldHolding([instantSpell.id, null]);
    castAt(world, instantSpell.id, 300, 0);

    world.tick();

    expect(mana(world)).toBe(FULL_MANA - COST);
    expect(hero.cooldowns.get(instantSpell.id)).toBe(COOLDOWN_TICKS);
    expect(eventsOfKind(world, reader, "cast_committed")).toMatchObject([
      { tick: 0, abilityId: instantSpell.id },
    ]);
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
});
