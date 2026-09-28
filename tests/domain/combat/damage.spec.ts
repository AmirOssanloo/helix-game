import { describe, expect, it } from "vitest";
import type { UnitId } from "@domain/public";
import type { DamageType, Unit } from "@domain/public";
import { addModifier, applyDamage, releaseUnit } from "@domain/rules";
import type { Simulation } from "@simulation/testing";
import { makeRegistry, makeWorld, spawnUnit } from "../../helpers";

/** The health the target starts with, well above anything the spec deals. */
const HEALTH = 10000;

/** A hit of this, so every landed amount reads against one hundred. */
const HIT = 100;

/** The target's resistance and armour, so mitigation shows in every figure. */
const RESISTANCE = 0.25;
const ARMOUR = 5;

/** The attacker's magic damage: a flat row of a fraction of the hit, as an item's +50% would be. */
const AMPLIFICATION = 0.5;

type Arranged = {
  world: Simulation;
  attacker: Unit;
  attackerId: UnitId;
  targetId: UnitId;
};

/** A world with an attacker and a target wearing armour and resistance, far enough apart to stand alone. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1, registry: makeRegistry() });
  const attacker = spawnUnit(world, { x: 0, y: 0 });

  spawnUnit(world, {
    x: 400,
    y: 0,
    health: HEALTH,
    armour: ARMOUR,
    magicResistance: RESISTANCE,
  });

  const attackerId = world.state.map.units.idAt(0);
  const targetId = world.state.map.units.idAt(1);

  if (attackerId === null || targetId === null) {
    throw new Error("The two spawns each took a slot");
  }

  return { world, attacker, attackerId, targetId };
};

/** What lands of one hit of `type` from `sourceId`. */
const landed = (
  arranged: Arranged,
  type: DamageType,
  sourceId: UnitId | null,
): number =>
  applyDamage(arranged.world.state, arranged.targetId, HIT, type, sourceId);

describe("the attacker's magic damage", () => {
  it("at nothing leaves every type's figure as the target's mitigation alone gives it", () => {
    const plain = arrange();
    const amplifying = arrange();

    addModifier(amplifying.attacker, "status", "magic_damage", 0, 0.3);

    for (const type of ["physical", "magical", "pure"] as const) {
      expect(landed(amplifying, type, amplifying.attackerId)).toBe(
        landed(plain, type, null),
      );
      expect(landed(plain, type, plain.attackerId)).toBe(
        landed(plain, type, null),
      );
    }
  });

  it("raises a magical hit before the target's resistance takes its share", () => {
    const arranged = arrange();

    addModifier(arranged.attacker, "summon", "magic_damage", AMPLIFICATION, 0);

    expect(landed(arranged, "magical", arranged.attackerId)).toBe(
      HIT * (1 + AMPLIFICATION) * (1 - RESISTANCE),
    );
  });

  it("scales by its fractions like every other stat: a flat amount times one plus the fractions", () => {
    const arranged = arrange();

    addModifier(arranged.attacker, "summon", "magic_damage", AMPLIFICATION, 0);
    addModifier(arranged.attacker, "status", "magic_damage", 0, 0.2);

    expect(landed(arranged, "magical", arranged.attackerId)).toBeCloseTo(
      HIT * (1 + AMPLIFICATION * 1.2) * (1 - RESISTANCE),
      9,
    );
  });

  it("never touches a physical or a pure hit", () => {
    const arranged = arrange();
    const physical = landed(arranged, "physical", arranged.attackerId);
    const pure = landed(arranged, "pure", arranged.attackerId);

    addModifier(arranged.attacker, "summon", "magic_damage", AMPLIFICATION, 0);

    expect(landed(arranged, "physical", arranged.attackerId)).toBe(physical);
    expect(landed(arranged, "pure", arranged.attackerId)).toBe(pure);
  });

  it("is nothing from a source that no longer resolves", () => {
    const arranged = arrange();

    addModifier(arranged.attacker, "summon", "magic_damage", AMPLIFICATION, 0);
    releaseUnit(arranged.world.state, arranged.attackerId);

    expect(landed(arranged, "magical", arranged.attackerId)).toBe(
      HIT * (1 - RESISTANCE),
    );
  });
});
