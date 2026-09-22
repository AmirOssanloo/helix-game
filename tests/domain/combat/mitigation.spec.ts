import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { DamageType, Stats } from "@domain/public";
import { mitigate } from "@domain/public";

/** The armour curve's constant as content tunes it, which is what the game mitigates under. */
const CONSTANT = tuningTable.armour_constant;

/** A hit of this, so every row reads as a percentage of one hit. */
const HIT = 100;

/** Stats wearing `armour` and `magicResistance`, with nothing else a damage rule reads. */
const wearing = (armour: number, magicResistance: number): Stats => ({
  maxHealth: 0,
  healthRegen: 0,
  maxMana: 0,
  manaRegen: 0,
  armour,
  attackSpeed: 0,
  magicResistance,
});

/** Decimals a mitigated amount is compared to: far below what a health bar shows. */
const PLACES = 6;

describe("physical damage", () => {
  it.each([
    [0, 100],
    [5, 76.923077],
    [20, 45.454545],
  ])("armour %d leaves %d of a hundred", (armour, landed) => {
    expect(mitigate(HIT, "physical", wearing(armour, 0), CONSTANT)).toBeCloseTo(
      landed,
      PLACES,
    );
  });

  it("adds as much as it would take when armour is negative", () => {
    expect(mitigate(HIT, "physical", wearing(-5, 0), CONSTANT)).toBeCloseTo(
      123.076923,
      PLACES,
    );
  });

  it("never reaches immunity: ten times the armour is not ten times the reduction", () => {
    const five = mitigate(HIT, "physical", wearing(5, 0), CONSTANT);
    const fifty = mitigate(HIT, "physical", wearing(50, 0), CONSTANT);

    expect(HIT - fifty).toBeLessThan((HIT - five) * 10);
    expect(fifty).toBeGreaterThan(0);
  });

  it("reads the curve from the constant it is given, so a retune changes it", () => {
    expect(mitigate(HIT, "physical", wearing(5, 0), 0.12)).toBeCloseTo(
      62.5,
      PLACES,
    );
  });

  it("ignores magic resistance", () => {
    expect(mitigate(HIT, "physical", wearing(0, 0.75), CONSTANT)).toBeCloseTo(
      HIT,
      PLACES,
    );
  });
});

describe("magical damage", () => {
  it.each([
    [0, 100],
    [0.25, 75],
    [0.75, 25],
  ])("resistance %d leaves %d of a hundred", (resistance, landed) => {
    expect(
      mitigate(HIT, "magical", wearing(0, resistance), CONSTANT),
    ).toBeCloseTo(landed, PLACES);
  });

  it("ignores armour", () => {
    expect(mitigate(HIT, "magical", wearing(20, 0), CONSTANT)).toBeCloseTo(
      HIT,
      PLACES,
    );
  });

  it("lands nothing, and never heals, past full resistance", () => {
    expect(mitigate(HIT, "magical", wearing(0, 1.5), CONSTANT)).toBe(0);
  });
});

describe("pure damage", () => {
  it("passes whole through armour and resistance together", () => {
    expect(mitigate(HIT, "pure", wearing(20, 0.75), CONSTANT)).toBe(HIT);
  });
});

describe("every damage type", () => {
  it.each(["physical", "magical", "pure"] as const)(
    "leaves nothing of a hit of nothing as %s",
    (type: DamageType) => {
      expect(mitigate(0, type, wearing(20, 0.25), CONSTANT)).toBe(0);
    },
  );
});
