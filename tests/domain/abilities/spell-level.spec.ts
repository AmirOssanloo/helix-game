import { describe, expect, it } from "vitest";
import { spellLevelOf } from "@domain/public";

describe("spellLevelOf", () => {
  it("reads one orb's level when the recipe is that orb three times", () => {
    expect(spellLevelOf([4, 1, 7], ["quartz", "quartz", "quartz"])).toBe(4);
  });

  it("takes the lowest level among the orbs a recipe names", () => {
    expect(spellLevelOf([4, 2, 7], ["quartz", "whorl", "ember"])).toBe(2);
    expect(spellLevelOf([4, 2, 7], ["ember", "ember", "quartz"])).toBe(4);
  });

  it("ignores the level of an orb the recipe does not name", () => {
    expect(spellLevelOf([7, 1, 7], ["quartz", "ember", "ember"])).toBe(7);
  });

  it("never falls below the first level", () => {
    expect(spellLevelOf([0, 0, 0], ["quartz", "whorl", "ember"])).toBe(1);
    expect(spellLevelOf([], ["quartz", "quartz", "quartz"])).toBe(1);
    expect(spellLevelOf([5, 5, 5], [])).toBe(1);
  });
});
