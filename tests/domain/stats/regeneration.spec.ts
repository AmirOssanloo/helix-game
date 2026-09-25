import { describe, expect, it } from "vitest";
import type { Resources, Stats } from "@domain/public";
import { regenerate, restoreHealth } from "@domain/public";

const stats = (overrides: Partial<Stats> = {}): Stats => ({
  maxHealth: 100,
  healthRegen: 1,
  maxMana: 50,
  manaRegen: 0.5,
  armour: 0,
  attackSpeed: 0,
  magicResistance: 0,
  ...overrides,
});

describe("regenerate", () => {
  it("raises health and mana by one tick of their rates", () => {
    const resources: Resources = { health: 40, mana: 10 };

    regenerate(resources, stats());

    expect(resources).toEqual({ health: 41, mana: 10.5 });
  });

  it("holds a value at its maximum", () => {
    const resources: Resources = { health: 99.5, mana: 50 };

    regenerate(resources, stats());

    expect(resources).toEqual({ health: 100, mana: 50 });
  });

  it("brings a value down to a maximum that fell below it", () => {
    const resources: Resources = { health: 100, mana: 50 };

    regenerate(resources, stats({ maxHealth: 80, maxMana: 20 }));

    expect(resources).toEqual({ health: 80, mana: 20 });
  });

  it("never takes a value below zero", () => {
    const resources: Resources = { health: 0.5, mana: 0 };

    regenerate(resources, stats({ healthRegen: -2, manaRegen: -1 }));

    expect(resources).toEqual({ health: 0, mana: 0 });
  });

  it("leaves health at zero, so a unit emptied this tick still dies at its end", () => {
    const resources: Resources = { health: 0, mana: 10 };

    regenerate(resources, stats());

    expect(resources).toEqual({ health: 0, mana: 10.5 });
  });
});

describe("restoreHealth", () => {
  it("raises health by the amount and leaves mana alone", () => {
    const resources: Resources = { health: 40, mana: 10 };

    restoreHealth(resources, stats(), 5);

    expect(resources).toEqual({ health: 45, mana: 10 });
  });

  it("holds health at its maximum", () => {
    const resources: Resources = { health: 98, mana: 10 };

    restoreHealth(resources, stats(), 5);

    expect(resources.health).toBe(100);
  });

  it("leaves health at zero, so a unit emptied this tick still dies at its end", () => {
    const resources: Resources = { health: 0, mana: 10 };

    restoreHealth(resources, stats(), 5);

    expect(resources.health).toBe(0);
  });
});
