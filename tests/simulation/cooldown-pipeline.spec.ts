import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { Simulation } from "@simulation/public";
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

const INVOKE_MANA = 7;

/** The composer's clock at three orb levels, 183 ticks, less three Whorl instances at level one, 0.99 cubed, rounded to a tick. */
const CLOCK_WITH_THREE_WHORL = 178;

/** The same clock with no Whorl held. */
const CLOCK_WITH_NO_WHORL = 183;

const www = makeSpellDef.build({ recipe: ["whorl", "whorl", "whorl"] });
const qqq = makeSpellDef.build({ recipe: ["quartz", "quartz", "quartz"] });
const eee = makeSpellDef.build({ recipe: ["ember", "ember", "ember"] });

const form = makeFormDef.build({ abilities: [www.id, qqq.id, eee.id] });

const worldWithSpells = (): Simulation => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [www, qqq, eee],
      tuning: { invoke_mana: INVOKE_MANA },
    }),
  });

  spawnHero(world, { orbLevels: [1, 1, 1] });

  return world;
};

const pressSlot = (world: Simulation, slot: number): void => {
  submit(world, {
    kind: "slot",
    tick: world.view.tick,
    timestamp: world.view.tick,
    slot,
  });
};

/** Presses the keys in one tick, then ticks, so the buffer holds them oldest first and the passives are on. */
const fill = (world: Simulation, ...slots: number[]): void => {
  for (const slot of slots) {
    pressSlot(world, slot);
  }

  world.tick();
};

const invokeReadyAt = (world: Simulation): number => {
  const heroId = world.view.run.heroId;
  const hero = heroId === null ? null : world.view.map.units.resolve(heroId);

  return hero?.cooldowns.get("invoke") ?? 0;
};

const mana = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.mana ?? 0;

const prepared = (world: Simulation): (string | null)[] => [
  ...(world.view.run.forms[0]?.kit.prepared ?? []),
];

describe("the composer's clock through the world", () => {
  it("takes the Whorl percentage held on the tick R is pressed", () => {
    const world = worldWithSpells();
    fill(world, W, W, W);

    pressSlot(world, R);
    world.tick();

    expect(invokeReadyAt(world)).toBe(1 + CLOCK_WITH_THREE_WHORL);
  });

  it("keeps the percentage it started with after the Whorl instances are swapped out", () => {
    const world = worldWithSpells();
    fill(world, W, W, W);
    pressSlot(world, R);
    world.tick();
    const readyAt = invokeReadyAt(world);

    fill(world, Q, Q, Q);

    expect(invokeReadyAt(world)).toBe(readyAt);
  });

  it("takes no percentage when no Whorl is held", () => {
    const world = worldWithSpells();
    fill(world, Q, Q, Q);

    pressSlot(world, R);
    world.tick();

    expect(invokeReadyAt(world)).toBe(1 + CLOCK_WITH_NO_WHORL);
  });
});

describe("the no cooldowns flag", () => {
  it("lets a first invoke through while the composer's clock runs", () => {
    const world = worldWithSpells();
    fill(world, Q, Q, Q);
    pressSlot(world, R);
    world.tick();

    world.state.run.debug.noCooldowns = true;
    fill(world, E, E, E);
    pressSlot(world, R);
    world.tick();

    expect(prepared(world)).toEqual([eee.id, qqq.id]);
  });

  it("is off when a world is created", () => {
    const world = worldWithSpells();

    expect(world.view.run.debug).toEqual({
      noCooldowns: false,
      infiniteMana: false,
    });
  });
});

describe("the infinite mana flag", () => {
  it("lets a first invoke through with no mana, and spends nothing", () => {
    const world = worldWithSpells();
    const record = world.state.run.forms[0];
    fill(world, Q, Q, Q);

    if (record === undefined) {
      throw new Error("The hero has a form");
    }

    record.resources.mana = 0;
    world.state.run.debug.infiniteMana = true;
    pressSlot(world, R);
    world.tick();

    expect(prepared(world)).toEqual([qqq.id, null]);
    expect(mana(world)).toBe(0);
  });
});
