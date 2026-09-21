import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import {
  acquireUnit,
  activeForm,
  addModifier,
  grantExperience,
  removeModifiers,
} from "@domain/public";
import type { Simulation } from "@simulation/public";
import { makeFormDef, makeRegistry, makeWorld, spawnHero } from "../helpers";

/** A form regenerating 30 health and 15 mana a second: one and a half per tick at 30 Hz. */
const regenerating = makeFormDef.build({
  baseStats: {
    maxHealth: 100,
    healthRegen: 30,
    maxMana: 50,
    manaRegen: 15,
    armour: 0,
    attackSpeed: 100,
    magicResistance: 0.25,
  },
});

const worldWith = (form = makeFormDef.build()): Simulation =>
  makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
    }),
  });

describe("statsSystem", () => {
  it("derives the hero's values from its active form on the first tick", () => {
    const world = worldWith();
    const hero = spawnHero(world);

    world.tick();

    expect(hero.attributes).toEqual({
      strength: 10,
      agility: 10,
      intelligence: 10,
    });
    expect(hero.stats.maxHealth).toBe(300);
    expect(hero.stats.maxMana).toBe(150);
    expect(hero.stats.armour).toBeCloseTo(2);
  });

  it("sees a modifier added to the table on the same tick, and its removal too", () => {
    const world = worldWith();
    const hero = spawnHero(world);
    world.tick();

    addModifier(hero.modifiers, "status", "max_health", 0, 0.1);
    world.tick();
    const raised = hero.stats.maxHealth;

    removeModifiers(hero.modifiers, "status");
    world.tick();

    expect(raised).toBeCloseTo(330);
    expect(hero.stats.maxHealth).toBe(300);
  });

  it("reads the attributes at the hero's current level", () => {
    const world = worldWith();
    const hero = spawnHero(world);

    grantExperience(hero.progression, 230, heroDef);
    world.tick();

    expect(hero.progression.level).toBe(2);
    expect(hero.attributes.strength).toBe(11);
    expect(hero.stats.maxHealth).toBe(320);
  });

  it("regenerates the active form's health and mana by a tick's worth", () => {
    const world = worldWith(regenerating);
    spawnHero(world);
    const form = activeForm(world.state);

    if (form === null) {
      throw new Error("The hero has an active form");
    }

    form.resources.health = 10;
    form.resources.mana = 10;
    world.tick();

    expect(form.resources.health).toBeCloseTo(11);
    expect(form.resources.mana).toBeCloseTo(10.5);
  });

  it("holds full resources at the maximum", () => {
    const world = worldWith(regenerating);
    spawnHero(world);
    const form = activeForm(world.state);

    world.tick();
    world.tick();

    expect(form?.resources).toEqual({ health: 300, mana: 150 });
  });

  it("starts the hero full, at level one, with the definition's starting skill points", () => {
    const world = worldWith();
    const hero = spawnHero(world);

    expect(activeForm(world.state)?.resources).toEqual({
      health: 300,
      mana: 150,
    });
    expect(hero.progression).toEqual({
      level: 1,
      experience: 0,
      skillPoints: heroDef.startingSkillPoints,
    });
  });

  it("leaves a unit that is not the hero alone", () => {
    const world = worldWith();
    spawnHero(world);
    const id = acquireUnit(world.state, "enemy", 500, 0);
    const enemy = id === null ? null : world.state.map.units.resolve(id);

    world.tick();

    expect(enemy?.stats.maxHealth).toBe(0);
    expect(enemy?.attributes.strength).toBe(0);
  });

  it("ticks a world with no hero", () => {
    const world = worldWith();

    expect(() => {
      world.tick();
    }).not.toThrow();
  });
});
