import { describe, expect, it } from "vitest";
import type { SpellRecord, Unit } from "@domain/public";
import { createUnitPool, isInCastRange } from "@domain/public";
import { makeSpellDef } from "../../helpers";

const RANGE = 600;

const record: SpellRecord = {
  def: makeSpellDef.build({ range: RANGE }),
  castPointTicks: 3,
  backswingTicks: 3,
  cooldownTicks: [300, 300, 300, 300, 300, 300, 300],
};

/** A live unit at the origin with a bound radius of 24. */
const casterAtOrigin = (): Unit => {
  const unit = createUnitPool().acquire();

  if (unit === null) {
    throw new Error("The first acquire succeeds on a fresh pool");
  }

  unit.boundRadius = 24;

  return unit;
};

describe("isInCastRange", () => {
  it("holds for a point at the range and fails just past it", () => {
    const unit = casterAtOrigin();

    expect(isInCastRange(unit, record, "point", RANGE, 0, 0)).toBe(true);
    expect(isInCastRange(unit, record, "point", RANGE + 1, 0, 0)).toBe(false);
  });

  it("measures a point from the caster's centre, in any direction", () => {
    const unit = casterAtOrigin();
    unit.curr.x = 100;
    unit.curr.y = 100;

    expect(isInCastRange(unit, record, "point", 100, 100 + RANGE, 0)).toBe(
      true,
    );
    expect(isInCastRange(unit, record, "point", 100, 100 - RANGE - 1, 0)).toBe(
      false,
    );
  });

  it("adds the caster's bound radius and the target's for a unit", () => {
    const unit = casterAtOrigin();
    const reach = RANGE + 24 + 30;

    expect(isInCastRange(unit, record, "unit", reach, 0, 30)).toBe(true);
    expect(isInCastRange(unit, record, "unit", reach + 1, 0, 30)).toBe(false);
  });

  it("always holds for a direction and for no target", () => {
    const unit = casterAtOrigin();

    expect(isInCastRange(unit, record, "direction", 5000, 5000, 0)).toBe(true);
    expect(isInCastRange(unit, record, "none", 5000, 5000, 0)).toBe(true);
  });
});
