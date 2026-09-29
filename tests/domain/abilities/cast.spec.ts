import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type {
  FormRecord,
  RefusalReason,
  SpellRecord,
  Unit,
  UnitId,
} from "@domain/public";
import {
  createAbilityRequest,
  isInCastRange,
  slotReadiness,
} from "@domain/queries";
import {
  acquireUnit,
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

  it("adds both bound radii for a unit or self, as for a unit", () => {
    const unit = casterAtOrigin();
    const reach = RANGE + 24 + 30;

    expect(isInCastRange(unit, record, "unit_or_self", reach, 0, 30)).toBe(
      true,
    );
    expect(isInCastRange(unit, record, "unit_or_self", reach + 1, 0, 30)).toBe(
      false,
    );
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

describe("the request stage over a unit-or-self ability", () => {
  const selfSpell = makeSpellDef.build({
    recipe: ["quartz", "whorl", "ember"],
    targeting: "unit_or_self",
    range: RANGE,
  });
  const unitSpell = makeSpellDef.build({
    recipe: ["whorl", "whorl", "whorl"],
    targeting: "unit",
    range: RANGE,
  });
  const form = makeFormDef.build({
    abilities: [selfSpell.id, unitSpell.id],
  });

  type Arranged = Readonly<{ world: Simulation; hero: Unit; heroId: UnitId }>;

  /** A hero holding the unit-or-self spell in D and the unit spell in F, ready to cast either. */
  const arrangeHero = (): Arranged => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({
        hero: { ...heroDef, forms: [form.id] },
        forms: [form],
        spells: [selfSpell, unitSpell],
      }),
    });
    const hero = spawnHero(world, { orbLevels: [1, 1, 1] });
    const formRecord = world.state.run.forms[0];
    const heroId = world.state.run.heroId;

    if (formRecord === undefined || heroId === null) {
      throw new Error("The hero has a form and an id");
    }

    formRecord.kit.prepared[0] = selfSpell.id;
    formRecord.kit.prepared[1] = unitSpell.id;

    return { world, hero, heroId };
  };

  /** A unit of `kind` standing within range of the hero, by id. */
  const stand = (world: Simulation, kind: "enemy" | "summon"): UnitId => {
    const id = acquireUnit(world.state, kind, 100, 0);

    if (id === null) {
      throw new Error("The unit pool has room");
    }

    return id;
  };

  it("takes the caster itself, aimed where it stands", () => {
    const { world, hero, heroId } = arrangeHero();

    expect(
      requestCast(world.state, hero, selfSpell.id, {
        kind: "unit_or_self",
        unitId: heroId,
      }),
    ).toBeNull();
    expect(hero.cast.abilityId).toBe(selfSpell.id);
    expect(hero.cast.targetKind).toBe("unit_or_self");
    expect(hero.cast.targetId).toBe(heroId);
  });

  it("takes a unit hostile to the caster", () => {
    const { world, hero } = arrangeHero();
    const enemyId = stand(world, "enemy");

    expect(
      requestCast(world.state, hero, selfSpell.id, {
        kind: "unit_or_self",
        unitId: enemyId,
      }),
    ).toBeNull();
    expect(hero.cast.targetId).toBe(enemyId);
  });

  it("refuses a unit on the caster's side that is not the caster, and changes nothing", () => {
    const { world, hero } = arrangeHero();
    const summonId = stand(world, "summon");

    expect(
      requestCast(world.state, hero, selfSpell.id, {
        kind: "unit_or_self",
        unitId: summonId,
      }),
    ).toBe("invalid_target");
    expect(hero.cast.abilityId).toBeNull();
  });

  it("refuses a target of the other kind either way: a unit target for it, and a unit-or-self target for a unit spell", () => {
    const { world, hero, heroId } = arrangeHero();

    expect(
      requestCast(world.state, hero, selfSpell.id, {
        kind: "unit",
        unitId: heroId,
      }),
    ).toBe("invalid_target");
    expect(
      requestCast(world.state, hero, unitSpell.id, {
        kind: "unit_or_self",
        unitId: heroId,
      }),
    ).toBe("invalid_target");
  });

  it("commits on the caster the tick its cast point ends, with the caster as the cast's unit", () => {
    const { world, hero, heroId } = arrangeHero();

    submit(world, {
      kind: "cast",
      tick: world.view.tick,
      timestamp: world.view.tick,
      abilityId: selfSpell.id,
      target: { kind: "unit_or_self", unitId: heroId },
    });

    for (
      let tick = 0;
      tick < 30 && !hero.cooldowns.has(selfSpell.id);
      tick += 1
    ) {
      world.tick();
    }

    expect(hero.cooldowns.has(selfSpell.id)).toBe(true);
    expect(hero.cast.abilityId).toBeNull();
  });
});
