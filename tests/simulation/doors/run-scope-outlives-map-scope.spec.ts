import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { FormRecord, Unit } from "@domain/public";
import { INVOKE_ID } from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  makeFormDef,
  makeMapDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  spawnHero,
  submit,
} from "../../helpers";

/** The slot keys Q, W, E, and R, the composer. */
const Q = 1;
const W = 2;
const E = 3;
const R = 4;

/** The level the hero has reached when the map changes, and what it has earned toward the next. */
const LEVEL = 4;
const EXPERIENCE = 37;
const SKILL_POINTS = 2;

/** The orb levels the hero has learned, Quartz, Whorl, Ember. */
const ORB_LEVELS = [2, 1, 3];

/** The held instances after Q, W, E: Quartz, Whorl, Ember, oldest first. */
const HELD_ORBS = [0, 1, 2];

const qwe = makeSpellDef.build({ recipe: ["quartz", "whorl", "ember"] });

const form = makeFormDef.build({ abilities: [qwe.id] });

/** The second map: somewhere else entirely, with a wall and a spawn point of its own. */
const secondMap = makeMapDef.build({
  id: "second_map",
  bounds: { minX: 0, minY: 0, maxX: 2048, maxY: 1024 },
  obstacles: [{ minX: 512, minY: 256, maxX: 640, maxY: 384 }],
  spawnPoint: { x: 1600, y: 800 },
});

type Arranged = {
  world: Simulation;
  hero: Unit;
  record: FormRecord;
};

const pressSlot = (world: Simulation, slot: number): void => {
  submit(world, {
    kind: "slot",
    tick: world.view.tick,
    timestamp: world.view.tick,
    slot,
  });
};

/**
 * A hero partway through a run: levelled, three orbs learned, Q W E held, and the composer
 * pressed, so a spell sits in a prepared slot and the composer's clock is running.
 */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [qwe],
    }),
  });
  const hero = spawnHero(world, { orbLevels: ORB_LEVELS });
  const record = world.state.run.forms[0];

  if (record === undefined) {
    throw new Error("The hero has a form");
  }

  hero.progression.level = LEVEL;
  hero.progression.experience = EXPERIENCE;
  hero.progression.skillPoints = SKILL_POINTS;
  pressSlot(world, Q);
  pressSlot(world, W);
  pressSlot(world, E);
  world.tick();
  pressSlot(world, R);
  world.tick();

  return { world, hero, record };
};

describe("the door: run scope and map scope are separate lifetimes", () => {
  it("carries the hero through a map load with its id, level, orbs, slots, and clocks unchanged", () => {
    const { world, hero, record } = arrange();
    const heroId = world.view.run.heroId;
    const invokeReadyAt = hero.cooldowns.get(INVOKE_ID);

    expect(record.kit.prepared[0]).toBe(qwe.id);
    expect(invokeReadyAt).toBeGreaterThan(world.view.tick);

    world.loadMap(secondMap);
    world.tick();

    expect(world.view.map.mapId).toBe("second_map");
    expect(world.view.run.heroId).toBe(heroId);
    expect(world.view.map.units.resolve(heroId ?? -1)).toBe(hero);
    expect(hero.curr).toEqual({ x: 1600, y: 800 });
    expect(hero.progression).toEqual({
      level: LEVEL,
      experience: EXPERIENCE,
      skillPoints: SKILL_POINTS,
    });
    expect(record.kit.orbLevels).toEqual(ORB_LEVELS);
    expect(record.kit.orbCount).toBe(HELD_ORBS.length);
    expect(record.kit.orbs.slice(0, record.kit.orbCount)).toEqual(HELD_ORBS);
    expect(record.kit.prepared[0]).toBe(qwe.id);
    expect(hero.cooldowns.get(INVOKE_ID)).toBe(invokeReadyAt);
  });
});
