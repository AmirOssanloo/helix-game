import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type {
  FormRecord,
  RefusalReason,
  SpellRecord,
  Unit,
} from "@domain/public";
import {
  createAbilityRequest,
  isInCastRange,
  slotReadiness,
} from "@domain/queries";
import {
  castReadiness,
  createStatTotals,
  createUnitPool,
  requestCast,
} from "@domain/rules";
import type { Simulation } from "@simulation/testing";
import {
  makeFormDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  spawnHero,
  submit,
} from "../../helpers";

const RANGE = 600;

const def = makeSpellDef.build({ range: RANGE });

const record: SpellRecord = {
  def,
  effects: def.effects,
  castPointTicks: 3,
  backswingTicks: 3,
  cooldownTicks: [300, 300, 300, 300, 300, 300, 300],
};

/** A live unit at the origin with a bound radius of 24. */
const casterAtOrigin = (): Unit => {
  const unit = createUnitPool(createStatTotals()).acquire();

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

  it("measures a vector from the caster's centre to the point pressed, as a point", () => {
    const unit = casterAtOrigin();
    unit.curr.x = -50;

    expect(isInCastRange(unit, record, "vector", RANGE - 50, 0, 0)).toBe(true);
    expect(isInCastRange(unit, record, "vector", RANGE - 49, 0, 0)).toBe(false);
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

describe("castReadiness", () => {
  /** The slot key the newest prepared spell sits on. */
  const D = 5;

  /** A clock that has not run out by the tick the case reads it. */
  const CLOCK_END_TICK = 300;

  const pointSpell = makeSpellDef.build({
    recipe: ["quartz", "whorl", "ember"],
    targeting: "point",
    range: RANGE,
  });
  const form = makeFormDef.build({ abilities: [pointSpell.id] });

  type Arranged = {
    world: Simulation;
    hero: Unit;
    formRecord: FormRecord;
    spell: SpellRecord;
  };

  /** A world whose hero holds `pointSpell` in D, with its clock run out and its mana full. */
  const arrangeHero = (): Arranged => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({
        hero: { ...heroDef, forms: [form.id] },
        forms: [form],
        spells: [pointSpell],
      }),
    });
    const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
    const formRecord = world.state.run.forms[0];
    const spell = world.state.run.spells.get(pointSpell.id);

    if (formRecord === undefined || spell === undefined) {
      throw new Error("The hero has a form and the world the spell");
    }

    formRecord.kit.prepared[0] = pointSpell.id;

    return { world, hero, formRecord, spell };
  };

  /** Everything a cast could write: the order, the clocks, the pool. */
  const snapshot = (arranged: Arranged): string =>
    JSON.stringify({
      order: arranged.hero.order,
      cast: arranged.hero.cast,
      cooldowns: [...arranged.hero.cooldowns],
      resources: arranged.formRecord.resources,
    });

  /** The readiness query's answer, checked to change nothing, beside the slot's and the request stage's. */
  const answers = (
    arranged: Arranged,
  ): {
    readiness: RefusalReason | null;
    slot: RefusalReason | null;
    request: RefusalReason | null;
  } => {
    const { world, hero, spell } = arranged;
    const before = snapshot(arranged);
    const readiness = castReadiness(
      world.view.run,
      world.view.tick,
      hero,
      pointSpell.id,
      spell,
    );
    const slot = slotReadiness(
      world.view.run,
      world.view.tick,
      hero,
      D,
      createAbilityRequest(),
    );

    expect(snapshot(arranged)).toBe(before);

    const request = requestCast(world.state, hero, pointSpell.id, {
      kind: "point",
      position: { x: hero.curr.x + 1, y: hero.curr.y },
    });

    return { readiness, slot, request };
  };

  it("refuses nothing a ready hero may cast, and the request stage takes the cast", () => {
    expect(answers(arrangeHero())).toEqual({
      readiness: null,
      slot: null,
      request: null,
    });
  });

  it("agrees with the request stage on a clock still running", () => {
    const arranged = arrangeHero();

    arranged.hero.cooldowns.set(pointSpell.id, CLOCK_END_TICK);

    expect(answers(arranged)).toEqual({
      readiness: "on_cooldown",
      slot: "on_cooldown",
      request: "on_cooldown",
    });
  });

  it("agrees with the request stage on mana short of the cost", () => {
    const arranged = arrangeHero();

    arranged.formRecord.resources.mana = 0;

    expect(answers(arranged)).toEqual({
      readiness: "not_enough_mana",
      slot: "not_enough_mana",
      request: "not_enough_mana",
    });
  });

  it("agrees with the request stage on a disable, named over the clock and the cost", () => {
    const arranged = arrangeHero();

    arranged.hero.cooldowns.set(pointSpell.id, CLOCK_END_TICK);
    arranged.formRecord.resources.mana = 0;
    arranged.hero.disables.silenced = true;

    expect(answers(arranged)).toEqual({
      readiness: "silenced",
      slot: "silenced",
      request: "silenced",
    });
  });

  it("agrees with the request stage on death, named over everything else", () => {
    const arranged = arrangeHero();

    arranged.hero.disables.stunned = true;
    submit(arranged.world, {
      kind: "kill_hero",
      tick: arranged.world.view.tick,
      timestamp: arranged.world.view.tick,
    });
    arranged.world.tick();

    expect(arranged.hero.state).toBe("dead");
    expect(answers(arranged)).toEqual({
      readiness: "dead",
      slot: "dead",
      request: "dead",
    });
  });
});
