import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { DomainEvent } from "@domain/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeFormDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  spawnHero,
  submit,
} from "../helpers";

/** The slot keys in order: Q, W, E, R. */
const Q = 1;
const W = 2;
const E = 3;
const R = 4;

/** The factory's cast point at 30 Hz: three ticks. */
const CAST_POINT_TICKS = 3;

/** The ticks the hero stands and yaws before an aim behind it is inside the action cone. */
const TURN_TICKS = 5;

/** The spec's numbers: 7 mana per first invoke, a 7.0 s base clock less 0.3 s per orb level, at 30 Hz. */
const INVOKE_MANA = 7;

/** 183 ticks at three orb levels, less the one held Whorl instance's percentage at level one, rounded to a tick. */
const INVOKE_CD_TICKS_AT_THREE_LEVELS = 181;

/** 21 ticks at twenty-one orb levels, less the one held Whorl instance's percentage at level seven, rounded to a tick. */
const INVOKE_CD_TICKS_AT_MAX_LEVELS = 20;

const qwe = makeSpellDef.build({ recipe: ["quartz", "whorl", "ember"] });
const qqq = makeSpellDef.build({ recipe: ["quartz", "quartz", "quartz"] });
const www = makeSpellDef.build({ recipe: ["whorl", "whorl", "whorl"] });

const form = makeFormDef.build({ abilities: [qwe.id, qqq.id, www.id] });

/** A world whose hero composes the three test spells, every orb at level one. */
const worldWithSpells = (): { world: Simulation; reader: EventReader } => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [qwe, qqq, www],
      tuning: { invoke_mana: INVOKE_MANA },
    }),
  });

  spawnHero(world, { orbLevels: [1, 1, 1] });

  return { world, reader: createEventReader() };
};

const pressSlot = (world: Simulation, slot: number): void => {
  submit(world, {
    kind: "slot",
    tick: world.view.tick,
    timestamp: world.view.tick,
    slot,
  });
};

/** Presses the three keys in one tick, then ticks, so the buffer holds them oldest first. */
const fill = (world: Simulation, ...slots: number[]): void => {
  for (const slot of slots) {
    pressSlot(world, slot);
  }

  world.tick();
};

/** Submits the click that throws `abilityId` at the point (`x`, `y`). */
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

const prepared = (world: Simulation): (string | null)[] => {
  const record = world.view.run.forms[0];

  if (record === undefined) {
    throw new Error("The hero has a form");
  }

  return [...record.kit.prepared];
};

const mana = (world: Simulation): number => {
  const record = world.view.run.forms[0];

  if (record === undefined) {
    throw new Error("The hero has a form");
  }

  return record.resources.mana;
};

const invokeReadyAt = (world: Simulation): number => {
  const hero = world.state.map.units.at(0);

  return hero?.cooldowns.get("invoke") ?? 0;
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

describe("AT-I1", () => {
  it("writes the QWE spell into D and leaves F empty on the first invoke", () => {
    const { world, reader } = worldWithSpells();
    const manaBefore = mana(world);
    fill(world, Q, W, E);

    pressSlot(world, R);
    world.tick();

    expect(prepared(world)).toEqual([qwe.id, null]);
    expect(mana(world)).toBeCloseTo(manaBefore - INVOKE_MANA);
    expect(invokeReadyAt(world)).toBe(1 + INVOKE_CD_TICKS_AT_THREE_LEVELS);
    expect(eventsOfKind(world, reader, "spell_invoked")).toMatchObject([
      { kind: "spell_invoked", tick: 1, abilityId: qwe.id, slot: 5 },
    ]);
    expect(
      eventsOfKind(world, createEventReader(), "slots_changed"),
    ).toHaveLength(1);
  });
});

describe("AT-I2", () => {
  it("moves the QWE spell to F and writes the QQQ spell into D", () => {
    const { world } = worldWithSpells();
    fill(world, Q, W, E);
    pressSlot(world, R);
    world.tick();
    const hero = world.state.map.units.at(0);
    hero?.cooldowns.set("invoke", 0);

    fill(world, Q, Q, Q);
    pressSlot(world, R);
    world.tick();

    expect(prepared(world)).toEqual([qqq.id, qwe.id]);
  });
});

describe("AT-I3", () => {
  it("evicts the QWE spell, moves QQQ to F, and writes WWW into D", () => {
    const { world } = worldWithSpells();
    const hero = world.state.map.units.at(0);
    fill(world, Q, W, E);
    pressSlot(world, R);
    world.tick();
    hero?.cooldowns.set("invoke", 0);
    fill(world, Q, Q, Q);
    pressSlot(world, R);
    world.tick();
    hero?.cooldowns.set("invoke", 0);

    fill(world, W, W, W);
    pressSlot(world, R);
    world.tick();

    expect(prepared(world)).toEqual([www.id, qqq.id]);
  });
});

describe("AT-I4", () => {
  it("spends nothing, starts no clock, and changes no slot when the spell is already in D", () => {
    const { world, reader } = worldWithSpells();
    const hero = world.state.map.units.at(0);
    fill(world, Q, Q, Q);
    pressSlot(world, R);
    world.tick();
    hero?.cooldowns.set("invoke", 0);
    const manaBefore = mana(world);
    eventsOfKind(world, reader, "slots_changed");

    pressSlot(world, R);
    world.tick();

    expect(prepared(world)).toEqual([qqq.id, null]);
    expect(mana(world)).toBe(manaBefore);
    expect(invokeReadyAt(world)).toBe(0);
    expect(eventsOfKind(world, reader, "slots_changed")).toEqual([]);
    expect(eventsOfKind(world, createEventReader(), "command_refused")).toEqual(
      [],
    );
  });
});

describe("AT-I5", () => {
  it("swaps D and F, spending nothing and starting no clock, when the spell is in F", () => {
    const { world, reader } = worldWithSpells();
    const hero = world.state.map.units.at(0);
    fill(world, Q, Q, Q);
    pressSlot(world, R);
    world.tick();
    hero?.cooldowns.set("invoke", 0);
    fill(world, W, W, W);
    pressSlot(world, R);
    world.tick();
    hero?.cooldowns.set("invoke", 0);
    const manaBefore = mana(world);
    eventsOfKind(world, reader, "slots_changed");

    fill(world, Q, Q, Q);
    pressSlot(world, R);
    world.tick();

    expect(prepared(world)).toEqual([qqq.id, www.id]);
    expect(mana(world)).toBe(manaBefore);
    expect(invokeReadyAt(world)).toBe(0);
    expect(eventsOfKind(world, reader, "slots_changed")).toHaveLength(1);
    expect(
      eventsOfKind(world, createEventReader(), "spell_invoked"),
    ).toHaveLength(2);
  });

  it("swaps even while the composer's clock is running", () => {
    const { world } = worldWithSpells();
    fill(world, Q, Q, Q);
    pressSlot(world, R);
    world.tick();
    const hero = world.state.map.units.at(0);
    hero?.cooldowns.set("invoke", 0);
    fill(world, W, W, W);
    pressSlot(world, R);
    world.tick();

    fill(world, Q, Q, Q);
    pressSlot(world, R);
    world.tick();

    expect(invokeReadyAt(world)).toBeGreaterThan(world.view.tick);
    expect(prepared(world)).toEqual([qqq.id, www.id]);
  });
});

describe("AT-I6", () => {
  it("brings an evicted spell back with its clock still running where it was", () => {
    const { world } = worldWithSpells();
    const hero = world.state.map.units.at(0);
    fill(world, Q, W, E);
    pressSlot(world, R);
    world.tick();
    hero?.cooldowns.set("invoke", 0);
    hero?.cooldowns.set(qwe.id, 500);
    fill(world, Q, Q, Q);
    pressSlot(world, R);
    world.tick();
    hero?.cooldowns.set("invoke", 0);
    fill(world, W, W, W);
    pressSlot(world, R);
    world.tick();
    hero?.cooldowns.set("invoke", 0);

    expect(prepared(world)).toEqual([www.id, qqq.id]);

    fill(world, Q, W, E);
    pressSlot(world, R);
    world.tick();

    expect(prepared(world)).toEqual([qwe.id, www.id]);
    expect(hero?.cooldowns.get(qwe.id)).toBe(500);
  });
});

describe("an invoke", () => {
  it("is refused while fewer than three instances are held", () => {
    const { world, reader } = worldWithSpells();
    fill(world, Q, W);

    pressSlot(world, R);
    world.tick();

    expect(prepared(world)).toEqual([null, null]);
    expect(eventsOfKind(world, reader, "command_refused")).toMatchObject([
      { kind: "command_refused", slot: R, reason: "buffer_not_full" },
    ]);
  });

  it("is refused with a flash when the form lacks the mana, and the buffer is untouched", () => {
    const { world, reader } = worldWithSpells();
    const record = world.state.run.forms[0];
    fill(world, Q, W, E);

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    record.resources.mana = INVOKE_MANA - 1;
    pressSlot(world, R);
    world.tick();

    expect(prepared(world)).toEqual([null, null]);
    expect(record.resources.mana).toBeCloseTo(INVOKE_MANA - 1, 0);
    expect(record.kit.orbCount).toBe(3);
    expect(eventsOfKind(world, reader, "command_refused")).toMatchObject([
      { kind: "command_refused", slot: R, reason: "not_enough_mana" },
    ]);
  });

  it("is refused while the composer's clock runs, unless it would be a swap", () => {
    const { world, reader } = worldWithSpells();
    fill(world, Q, W, E);
    pressSlot(world, R);
    world.tick();
    eventsOfKind(world, reader, "command_refused");

    fill(world, Q, Q, Q);
    pressSlot(world, R);
    world.tick();

    expect(prepared(world)).toEqual([qwe.id, null]);
    expect(eventsOfKind(world, reader, "command_refused")).toMatchObject([
      { kind: "command_refused", slot: R, reason: "on_cooldown" },
    ]);
  });

  it("is refused when no spell on the form answers to the buffer", () => {
    const { world, reader } = worldWithSpells();
    fill(world, E, E, E);

    pressSlot(world, R);
    world.tick();

    expect(eventsOfKind(world, reader, "command_refused")).toMatchObject([
      { kind: "command_refused", slot: R, reason: "no_spell_for_recipe" },
    ]);
  });

  it("keeps the move running", () => {
    const { world } = worldWithSpells();
    const hero = world.state.map.units.at(0);
    fill(world, Q, W, E);
    submit(world, {
      kind: "move",
      tick: world.view.tick,
      timestamp: world.view.tick,
      destination: { x: 1000, y: 0 },
    });
    world.tick();

    pressSlot(world, R);
    world.tick();

    expect(hero?.state).toBe("moving");
    expect(prepared(world)).toEqual([qwe.id, null]);
  });

  it("shortens the composer's clock by the per-level reduction for every orb level", () => {
    const { world } = worldWithSpells();
    const record = world.state.run.forms[0];

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    record.kit.orbLevels[0] = 7;
    record.kit.orbLevels[1] = 7;
    record.kit.orbLevels[2] = 7;
    fill(world, Q, W, E);

    pressSlot(world, R);
    world.tick();

    expect(invokeReadyAt(world)).toBe(1 + INVOKE_CD_TICKS_AT_MAX_LEVELS);
  });
});

describe("a throw key", () => {
  it("does nothing on an empty slot but announce the refusal", () => {
    const { world, reader } = worldWithSpells();

    pressSlot(world, 6);
    world.tick();

    expect(eventsOfKind(world, reader, "command_refused")).toMatchObject([
      { kind: "command_refused", slot: 6, reason: "empty_slot" },
    ]);
  });
});

describe("AT-I7", () => {
  it("throwing D starts D's clock alone; F's spell keeps no clock and the mana is spent once", () => {
    const { world, reader } = worldWithSpells();
    const hero = world.state.map.units.at(0);
    fill(world, Q, W, E);
    pressSlot(world, R);
    world.tick();
    hero?.cooldowns.set("invoke", 0);
    fill(world, Q, Q, Q);
    pressSlot(world, R);
    world.tick();
    const manaBefore = mana(world);

    expect(prepared(world)).toEqual([qqq.id, qwe.id]);

    castAt(world, qqq.id, 300, 0);

    for (let tick = 0; tick <= CAST_POINT_TICKS; tick += 1) {
      world.tick();
    }

    expect(hero?.cooldowns.get(qqq.id)).toBeGreaterThan(world.view.tick);
    expect(hero?.cooldowns.get(qwe.id)).toBeUndefined();
    expect(mana(world)).toBeCloseTo(manaBefore - 50);
    expect(eventsOfKind(world, reader, "cast_committed")).toMatchObject([
      { abilityId: qqq.id },
    ]);
  });
});

describe("AT-I8", () => {
  it("a cursor opened and closed sends nothing: no mana, no clock, no order, no event but the ticks", () => {
    const { world, reader } = worldWithSpells();
    const hero = world.state.map.units.at(0);
    fill(world, Q, W, E);
    pressSlot(world, R);
    world.tick();
    const manaBefore = mana(world);
    const facingBefore = hero?.facing;
    eventsOfKind(world, reader, "tick_completed");

    for (let tick = 0; tick < 10; tick += 1) {
      world.tick();
    }

    expect(mana(world)).toBe(manaBefore);
    expect(hero?.cooldowns.get(qwe.id)).toBeUndefined();
    expect(hero?.state).toBe("idle");
    expect(hero?.facing).toBe(facingBefore);
    expect(world.view.map.projectiles.count).toBe(0);

    let event = world.events.read(reader);

    while (event !== null) {
      expect(event.kind).toBe("tick_completed");
      event = world.events.read(reader);
    }
  });
});

describe("AT-I9", () => {
  it("the click on a point behind the hero starts the cast point only once the hero faces it", () => {
    const { world, reader } = worldWithSpells();
    const hero = world.state.map.units.at(0);
    fill(world, Q, W, E);
    pressSlot(world, R);
    world.tick();
    const manaBefore = mana(world);

    castAt(world, qwe.id, -300, 0);

    for (let tick = 0; tick < TURN_TICKS; tick += 1) {
      world.tick();

      expect(hero?.state).toBe("turning");
      expect(hero?.curr).toEqual({ x: 0, y: 0 });
      expect(mana(world)).toBe(manaBefore);
    }

    world.tick();

    expect(hero?.state).toBe("ability_cast_point");
    expect(Math.abs(hero?.facing ?? 0)).toBeCloseTo(Math.PI);

    for (let tick = 0; tick < CAST_POINT_TICKS; tick += 1) {
      world.tick();
    }

    expect(eventsOfKind(world, reader, "cast_committed")).toMatchObject([
      { abilityId: qwe.id },
    ]);
    expect(mana(world)).toBeCloseTo(manaBefore - 50);
  });
});
