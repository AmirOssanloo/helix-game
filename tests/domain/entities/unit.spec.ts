import { describe, expect, it } from "vitest";
import { skeinDef, tuningTable } from "@content/public";
import type { ModifierTable, StatValues, UnitRecord } from "@domain/public";
import {
  addModifier,
  baseFromDefinitionOver,
  clearAiRecord,
  clearAttackState,
  clearCastState,
  clearPackMembership,
  clearStatValues,
  clearSummonState,
  createAiRecord,
  createAttackState,
  createCastState,
  createPackMembership,
  createStatValues,
  createSummonState,
  createTuningState,
  createUnitPool,
  createUnitTable,
  deriveFromBaseOver,
  deriveOver,
  MODIFIER_TABLE_SIZE,
  STAT_SOURCES,
  statSource,
} from "@domain/rules";
import { idOf, makeEnemyDef } from "../../helpers";

/** The tuning table at 30 Hz, in simulation units. */
const TUNING = createTuningState({ ...tuningTable, sim_hz: 30 });

const enemy = makeEnemyDef.build({ health: 80, armour: 3, healthRegen: 3 });

const recordOf = (): UnitRecord => {
  const record = createUnitTable([enemy], [], TUNING).get(enemy.id);

  if (record === undefined) {
    throw new Error("The table holds the definition it was built from");
  }

  return record;
};

/** A stat the rules do not have: added to the key list here and nowhere else. */
const TOY_MULTIPLE_OF_ARMOUR = 2;
const TOY_SOURCES = [
  ...STAT_SOURCES,
  statSource({
    key: "toughness",
    modifier: "movement_speed",
    worth: { attribute: "agility", conversion: "armourPerAgility" },
    fromDefinition: (record) => record.def.armour * TOY_MULTIPLE_OF_ARMOUR,
    copy: (from, into) => {
      into.toughness = from.toughness;
    },
  }),
] as const;

type ToyKey = (typeof TOY_SOURCES)[number]["key"];

/** A tier's health multiplier and a row the toy stat's modifier stat carries. */
const HEALTH_MULTIPLIER = 1.5;
const TOY_FLAT = 3;
const TOY_PERCENT = 0.5;

const emptyTable = (): ModifierTable => {
  const modifiers = [];

  for (let row = 0; row < MODIFIER_TABLE_SIZE; row += 1) {
    modifiers.push({ kind: null, stat: null, flat: 0, percent: 0 });
  }

  return { modifiers, liveModifierRows: 0, modifierMisses: 0 };
};

const everyValue = (values: StatValues<ToyKey>): number[] =>
  TOY_SOURCES.map((source) => values[source.key]);

describe("the unit's sub-records", () => {
  it("creates each one at the values a fresh slot holds, and clears each one back in place", () => {
    const attack = createAttackState();
    const cast = createCastState();
    const pack = createPackMembership();
    const summon = createSummonState();
    const ai = createAiRecord();
    const fresh = structuredClone({ attack, cast, pack, summon, ai });

    attack.readyAtTick = 40;
    attack.movePoint.x = 5;
    cast.abilityId = "fireball";
    cast.targetKind = "point";
    cast.position.y = 7;
    cast.targetId = idOf(3);
    cast.direction = 1;
    pack.id = 9;
    summon.ownerId = idOf(11);
    summon.expiresAtTick = 12;
    ai.state = "chase";
    ai.wanderAtTick = 30;
    ai.leashAnchor.x = 4;

    const movePoint = attack.movePoint;
    const position = cast.position;

    clearAttackState(attack);
    clearCastState(cast);
    clearPackMembership(pack);
    clearSummonState(summon);
    clearAiRecord(ai);

    expect({ attack, cast, pack, summon, ai }).toEqual(fresh);
    expect(attack.movePoint).toBe(movePoint);
    expect(cast.position).toBe(position);
  });

  it("keeps every sub-record of a slot across a release, emptied and never replaced", () => {
    const pool = createUnitPool();
    const unit = pool.acquire();
    const id = pool.idAt(0);

    if (id === null || unit === null) {
      throw new Error("An empty pool gives a slot");
    }

    const fresh = structuredClone(unit);
    const held = {
      attack: unit.attack,
      cast: unit.cast,
      pack: unit.pack,
      summon: unit.summon,
      ai: unit.ai,
      stats: unit.stats,
      baseStats: unit.baseStats,
    };

    unit.attack.readyAtTick = 40;
    unit.cast.abilityId = "fireball";
    unit.pack.id = 9;
    unit.summon.ownerId = idOf(11);
    unit.ai.state = "chase";
    unit.stats.armour = 4;
    unit.baseStats.maxHealth = 80;
    pool.release(id);

    expect(unit).toEqual(fresh);
    expect(unit.attack).toBe(held.attack);
    expect(unit.cast).toBe(held.cast);
    expect(unit.pack).toBe(held.pack);
    expect(unit.summon).toBe(held.summon);
    expect(unit.ai).toBe(held.ai);
    expect(unit.stats).toBe(held.stats);
    expect(unit.baseStats).toBe(held.baseStats);
  });

  it("carries one field per entry of the key list in its stats and its base", () => {
    const unit = createUnitPool().acquire();

    expect(unit === null ? [] : Object.keys(unit.stats)).toEqual(
      STAT_SOURCES.map((source) => source.key),
    );
    expect(unit === null ? [] : Object.keys(unit.baseStats)).toEqual(
      STAT_SOURCES.map((source) => source.key),
    );
  });
});

describe("the key list", () => {
  it("copies each value into its own field and no other", () => {
    for (const [index, source] of STAT_SOURCES.entries()) {
      const from = createStatValues(STAT_SOURCES);
      const into = createStatValues(STAT_SOURCES);

      from[source.key] = index + 1;
      source.copy(from, into);

      expect(into).toEqual(from);
    }
  });
});

describe("a stat added to the key list", () => {
  it("is created and cleared with the rest", () => {
    const values = createStatValues(TOY_SOURCES);

    expect(Object.keys(values)).toEqual(
      TOY_SOURCES.map((source) => source.key),
    );
    expect(everyValue(values).every((value) => value === 0)).toBe(true);

    values.toughness = 6;
    values.armour = 2;
    clearStatValues(TOY_SOURCES, values);

    expect(everyValue(values).every((value) => value === 0)).toBe(true);
  });

  it("stores its base from the definition at spawn", () => {
    const record = recordOf();
    const base = createStatValues(TOY_SOURCES);

    baseFromDefinitionOver(TOY_SOURCES, record, HEALTH_MULTIPLIER, base);

    expect(base.toughness).toBe(enemy.armour * TOY_MULTIPLE_OF_ARMOUR);
    expect(base.maxHealth).toBe(enemy.health * HEALTH_MULTIPLIER);
    expect(base.healthRegen).toBe(record.healthRegenPerTick);
    expect(base.armour).toBe(enemy.armour);
  });

  it("is derived from the base through the rows for its modifier stat, and only those", () => {
    const record = recordOf();
    const base = createStatValues(TOY_SOURCES);
    const out = createStatValues(TOY_SOURCES);
    const table = emptyTable();

    baseFromDefinitionOver(TOY_SOURCES, record, 1, base);
    deriveFromBaseOver(TOY_SOURCES, base, table, out);

    expect(out).toEqual(base);

    addModifier(table, "item", "movement_speed", TOY_FLAT, TOY_PERCENT);
    deriveFromBaseOver(TOY_SOURCES, base, table, out);

    expect(out.toughness).toBe((base.toughness + TOY_FLAT) * (1 + TOY_PERCENT));
    expect({ ...out, toughness: base.toughness }).toEqual(base);
  });

  it("is derived on a form from its attribute's worth and its rows", () => {
    const base = createStatValues(TOY_SOURCES);
    const out = createStatValues(TOY_SOURCES);
    const table = emptyTable();
    const attributes = { strength: 0, agility: 10, intelligence: 0 };

    base.toughness = 1;
    addModifier(table, "orb", "movement_speed", TOY_FLAT, 0);
    deriveOver(TOY_SOURCES, base, skeinDef.conversions, attributes, table, out);

    expect(out.toughness).toBe(
      1 + attributes.agility * skeinDef.conversions.armourPerAgility + TOY_FLAT,
    );
    expect(out.armour).toBe(
      attributes.agility * skeinDef.conversions.armourPerAgility,
    );
  });
});
