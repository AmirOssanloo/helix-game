import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type {
  DamageType,
  DomainEvent,
  LegendaryDef,
  Unit,
  UnitId,
} from "@domain/public";
import { applyDamage, applyStatus, createItem, placeItem } from "@domain/rules";
import type { EventReader } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import type { Simulation } from "@simulation/testing";
import {
  makeRegistry,
  makeStatusDef,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** What the worn helm adds to magic damage: a flat line of a tenth, as "+10% magic damage" reads. */
const MAGIC_DAMAGE = 0.1;

/** A hit of this, so every landed amount reads against one hundred. */
const HIT = 100;

/** The health every target stands on: far above what a case takes off it. */
const HEALTH = 10000;

/** A burn's damage per second, and the ticks a case lets it run. */
const BURN_PER_SECOND = 30;
const BURN_TICKS = 90;

/** Where the target stands: inside the hero's attack range and the spirit's. */
const TARGET_AT = { x: 200, y: -80 };

/** Long enough for a walk, a swing, and a flight. */
const PATIENCE = 400;

/** The spell that spawns the spirit, and the prepared slot it is thrown from. */
const EMBERLING = "emberling";
const FIRST_PREPARED = 0;

const cap = contentRegistry.itemBases.find((base) => base.id === "cap");

/** A helm the hero may wear at level one, adding magic damage and nothing else. */
const sorcerersCap: LegendaryDef = {
  id: "sorcerers_cap",
  name: "Sorcerer's cap",
  baseId: "cap",
  requirement: 1,
  lines: [{ stat: "magic_damage", kind: "flat", value: MAGIC_DAMAGE }],
};

const burn = makeStatusDef.build({
  id: "burn",
  damageOverTime: {
    damageType: "magical",
    perSecond: {
      orb: "ember",
      byLevel: [BURN_PER_SECOND, BURN_PER_SECOND, BURN_PER_SECOND],
    },
  },
});

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  heroId: UnitId;
  target: Unit;
  targetId: UnitId;
  enemyId: UnitId;
  reader: EventReader;
}>;

/**
 * The hero at the origin, with the content's spells and Emberling prepared, wearing the cap
 * when `worn` says so, a target out in front with no armour and no resistance, and an enemy
 * beside it to deal a hit of its own.
 */
const arrange = (worn: boolean): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      statuses: [...contentRegistry.statuses, burn],
      legendaries: [...contentRegistry.legendaries, sorcerersCap],
    }),
  });
  const hero = spawnHero(world);
  const target = spawnUnit(world, { ...TARGET_AT, health: HEALTH });
  const enemy = spawnUnit(world, { x: -400, y: 400, health: HEALTH });
  const heroId = world.state.run.heroId;
  const form = world.state.run.forms[0];

  if (heroId === null || form === undefined || cap === undefined) {
    throw new Error(
      "The hero has a form, run scope names it, and the content holds the cap",
    );
  }

  form.kit.prepared[FIRST_PREPARED] = EMBERLING;

  if (worn) {
    const item = createItem();
    const line = item.lines[0];

    if (line === undefined) {
      throw new Error("An item holds a line");
    }

    item.baseId = cap.id;
    item.rarityId = "legendary";
    item.legendaryId = sorcerersCap.id;
    item.itemLevel = 1;
    item.lineCount = 1;
    line.sourceId = sorcerersCap.id;
    line.value = MAGIC_DAMAGE;
    placeItem(world.state.run.inventory, item, cap.width, cap.height, 0);
    submit(world, {
      kind: "equip_item",
      tick: world.view.tick,
      timestamp: world.view.tick,
      cell: 0,
      armorySlot: null,
    });
  }

  world.tick();

  return {
    world,
    hero,
    heroId,
    target,
    targetId: unitIdOf(world, target),
    enemyId: unitIdOf(world, enemy),
    reader: createEventReader(),
  };
};

/** What lands on the target of one hit of `type` from `sourceId`. */
const hit = (arranged: Arranged, type: DamageType, sourceId: UnitId): number =>
  applyDamage(arranged.world.state, arranged.targetId, HIT, type, sourceId);

/** Every hit the target took that the reader has not seen, advancing it past everything. */
const hitsOnTarget = (arranged: Arranged): DomainEvent[] => {
  const found: DomainEvent[] = [];

  for (
    let event = arranged.world.events.read(arranged.reader);
    event !== null;
    event = arranged.world.events.read(arranged.reader)
  ) {
    if (event.kind === "unit_damaged" && event.unitId === arranged.targetId) {
      found.push({ ...event });
    }
  }

  return found;
};

describe("magic damage % worn by the hero", () => {
  it("raises a magical hit the hero deals by its value, over a base of nothing", () => {
    const plain = arrange(false);
    const worn = arrange(true);

    expect(hit(plain, "magical", plain.heroId)).toBe(HIT);
    expect(hit(worn, "magical", worn.heroId)).toBeCloseTo(
      HIT * (1 + MAGIC_DAMAGE),
      9,
    );
  });

  it("raises every tick of a magical burn the hero applied", () => {
    const plain = arrange(false);
    const worn = arrange(true);

    for (const arranged of [plain, worn]) {
      applyStatus(
        arranged.world.state,
        arranged.targetId,
        burn.id,
        BURN_TICKS,
        arranged.heroId,
        [1, 1, 1],
      );
      hitsOnTarget(arranged);
      arranged.world.tick();
    }

    const [plainTick] = hitsOnTarget(plain);
    const [wornTick] = hitsOnTarget(worn);

    expect(plainTick?.amount).toBeGreaterThan(0);
    expect(plainTick?.damageType).toBe("magical");
    expect(wornTick?.sourceId).toBe(worn.heroId);
    expect(wornTick?.amount).toBeCloseTo(
      (plainTick?.amount ?? Number.NaN) * (1 + MAGIC_DAMAGE),
      9,
    );
  });

  it("leaves a physical and a pure hit the hero deals alone", () => {
    const plain = arrange(false);
    const worn = arrange(true);

    for (const type of ["physical", "pure"] as const) {
      expect(hit(worn, type, worn.heroId)).toBe(hit(plain, type, plain.heroId));
    }
  });

  it("leaves the hero's attack alone, which is physical", () => {
    const landed = (arranged: Arranged): DomainEvent | undefined => {
      submit(arranged.world, {
        kind: "attack_target",
        tick: arranged.world.view.tick,
        timestamp: arranged.world.view.tick,
        targetId: arranged.targetId,
      });
      tickUntil(
        arranged.world,
        () => arranged.target.resources.health < HEALTH,
        PATIENCE,
      );

      return hitsOnTarget(arranged)[0];
    };
    const plain = landed(arrange(false));
    const worn = landed(arrange(true));

    expect(plain?.amount).toBeGreaterThan(0);
    expect(worn?.damageType).toBe("physical");
    expect(worn?.amount).toBe(plain?.amount);
  });

  it("leaves Emberling's attack alone: the spirit's table references the world's zeros", () => {
    const shot = (arranged: Arranged): DomainEvent | undefined => {
      submit(arranged.world, {
        kind: "cast",
        tick: arranged.world.view.tick,
        timestamp: arranged.world.view.tick,
        abilityId: EMBERLING,
        target: { kind: "none" },
      });
      tickUntil(
        arranged.world,
        () => arranged.target.resources.health < HEALTH,
        PATIENCE,
      );

      return hitsOnTarget(arranged).find(
        (event) => event.sourceId !== arranged.heroId,
      );
    };
    const plain = shot(arrange(false));
    const wornArranged = arrange(true);
    const worn = shot(wornArranged);
    const spirit = wornArranged.world.state.map.units.resolve(
      worn?.sourceId ?? wornArranged.heroId,
    );

    expect(plain?.amount).toBeGreaterThan(0);
    expect(worn?.damageType).toBe("physical");
    expect(worn?.amount).toBe(plain?.amount);
    expect(spirit?.kind).toBe("summon");
    expect(spirit?.totals).toBe(wornArranged.world.state.run.zeroTotals);
  });

  it("leaves a magical hit an enemy deals alone", () => {
    const plain = arrange(false);
    const worn = arrange(true);

    expect(hit(worn, "magical", worn.enemyId)).toBe(
      hit(plain, "magical", plain.enemyId),
    );
  });
});
