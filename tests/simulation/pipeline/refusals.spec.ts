import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { DomainEvent, Unit } from "@domain/public";
import { acquireUnit, releaseUnit } from "@domain/public";
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

/** The slot key the newest prepared spell sits on. */
const D = 5;

/** The form's mana at level one with no modifier: the factory's base plus its intelligence. */
const FULL_MANA = 150;

const COST = 50;

const RANGE = 600;

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

const form = makeFormDef.build({
  abilities: [pointSpell.id, noneSpell.id, unitSpell.id],
});

type Arranged = { world: Simulation; hero: Unit; reader: EventReader };

/** A world whose hero holds `prepared` in its two slots, standing at the origin facing +X with every orb at level one. */
const worldHolding = (prepared: readonly (string | null)[]): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [pointSpell, noneSpell, unitSpell],
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

const refusals = ({ world, reader }: Arranged): DomainEvent[] =>
  eventsOfKind(world, reader, "command_refused");

describe("the request stage refuses, announcing the spell and the reason", () => {
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
    castNone(arranged.world, noneSpell.id);

    arranged.world.tick();

    expect(refusals(arranged)).toMatchObject([
      { reason: "ability_not_held", abilityId: noneSpell.id },
    ]);
  });

  it("a target of the wrong kind, a slot key on a targeted spell included, naming the key or the spell", () => {
    const arranged = worldHolding([pointSpell.id, noneSpell.id]);
    castNone(arranged.world, pointSpell.id);
    castAt(arranged.world, noneSpell.id, 300, 0);
    submit(arranged.world, { kind: "slot", tick: 0, timestamp: 0, slot: D });

    arranged.world.tick();

    expect(refusals(arranged)).toMatchObject([
      { reason: "invalid_target", abilityId: null, slot: D },
      { reason: "invalid_target", abilityId: pointSpell.id, slot: 0 },
      { reason: "invalid_target", abilityId: noneSpell.id, slot: 0 },
    ]);
  });

  it("a unit target that is already dead and gone", () => {
    const arranged = worldHolding([unitSpell.id, null]);
    const targetId = acquireUnit(arranged.world.state, "enemy", 200, 0);

    if (targetId === null) {
      throw new Error("The unit pool has room for a target");
    }

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

  it("a spell the form lacks the mana for, before the cast point begins", () => {
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

describe("a disable refuses the cast before the request stage sees it", () => {
  it("stun", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    arranged.hero.disables.stunned = true;
    castAt(arranged.world, pointSpell.id, 300, 0);

    arranged.world.tick();

    expect(refusals(arranged)).toMatchObject([
      { reason: "stunned", abilityId: pointSpell.id },
    ]);
    expect(arranged.hero.state).toBe("idle");
    expect(mana(arranged.world)).toBe(FULL_MANA);
  });

  it("silence", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    arranged.hero.disables.silenced = true;
    castAt(arranged.world, pointSpell.id, 300, 0);

    arranged.world.tick();

    expect(refusals(arranged)).toMatchObject([
      { reason: "silenced", abilityId: pointSpell.id },
    ]);
  });

  it("root, only while the target is out of range", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    arranged.hero.disables.rooted = true;
    castAt(arranged.world, pointSpell.id, 300, 0);

    arranged.world.tick();

    expect(refusals(arranged)).toEqual([]);
    expect(arranged.hero.state).toBe("ability_cast_point");
  });

  it("disarm, which refuses no cast at all", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    arranged.hero.disables.disarmed = true;
    castAt(arranged.world, pointSpell.id, 300, 0);

    arranged.world.tick();

    expect(refusals(arranged)).toEqual([]);
    expect(arranged.hero.state).toBe("ability_cast_point");
  });
});

describe("the panel's flags let a refused cast through", () => {
  it("no cooldowns, with the clock still running", () => {
    const { world, hero } = worldHolding([pointSpell.id, null]);
    hero.cooldowns.set(pointSpell.id, 500);
    world.state.run.debug.noCooldowns = true;
    castAt(world, pointSpell.id, 300, 0);

    world.tick();

    expect(hero.state).toBe("ability_cast_point");
  });

  it("infinite mana, with no mana, and spends nothing", () => {
    const arranged = worldHolding([pointSpell.id, null]);
    const { world, reader } = arranged;
    const record = world.state.run.forms[0];

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    record.resources.mana = 0;
    world.state.run.debug.infiniteMana = true;
    castAt(world, pointSpell.id, 300, 0);

    for (let tick = 0; tick < 4; tick += 1) {
      world.tick();
    }

    expect(eventsOfKind(world, reader, "cast_committed")).toHaveLength(1);
    expect(mana(world)).toBe(0);
  });
});
