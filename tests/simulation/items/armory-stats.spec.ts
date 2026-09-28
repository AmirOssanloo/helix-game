import { GCProfiler } from "node:v8";
import { describe, expect, it } from "vitest";
import { contentRegistry, heroDef } from "@content/public";
import type {
  FixedLineDef,
  Item,
  ItemBaseDef,
  ItemCommand,
  LegendaryDef,
  Stat,
  StatKey,
  Unit,
  World,
} from "@domain/public";
import {
  createDropRoll,
  flatTotalOf,
  percentTotalOf,
  readTunable,
  rollDrop,
} from "@domain/queries";
import {
  applyStatus,
  attackDamageOf,
  copyStatTotals,
  createCooldownSnapshot,
  createItem,
  movementSpeed,
  placeItem,
  rewriteArmoryTotals,
  snapshotCooldownSources,
  STAT_SOURCES,
} from "@domain/rules";
import type { Simulation } from "@simulation/testing";
import {
  makeFormDef,
  makeRegistry,
  makeStatusDef,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
} from "../../helpers";

/** The step rate the content runs at: a line per second is this many times a line per tick. */
const SIM_HZ = 30;

/** The armory's helm slot and its first ring slot. */
const HELM = 0;
const RING = 8;

/** Calls timed while the heap is watched: one object per call would be megabytes. */
const MEASURED_CALLS = 100_000;
const WARM_UP_CALLS = 50_000;
const HEAP_ALLOWANCE_BYTES = 256 * 1024;

/** Long enough that the status outlasts every case. */
const STATUS_TICKS = 600;

const baseOf = (id: string): ItemBaseDef => {
  const base = contentRegistry.itemBases.find((each) => each.id === id);

  if (base === undefined) {
    throw new Error(`The content holds the base ${id}`);
  }

  return base;
};

const cap = baseOf("cap");
const band = baseOf("band");

/** A helm piece carrying `lines`, which the hero may wear at level one. */
const helmPiece = (id: string, lines: FixedLineDef[]): LegendaryDef => ({
  id,
  name: id,
  baseId: cap.id,
  requirement: 1,
  lines,
});

/** A ring piece carrying `lines`. */
const ringPiece = (id: string, lines: FixedLineDef[]): LegendaryDef => ({
  id,
  name: id,
  baseId: band.id,
  requirement: 1,
  lines,
});

/** One flat line of each derived value's stat, in the designer's units, and what it moves the value by in the simulation's. */
const FLAT_LINES: readonly (readonly [StatKey, Stat, number, number])[] = [
  ["maxHealth", "max_health", 40, 40],
  ["healthRegen", "health_regen", 3, 3 / SIM_HZ],
  ["maxMana", "max_mana", 25, 25],
  ["manaRegen", "mana_regen", 1.5, 1.5 / SIM_HZ],
  ["armour", "armour", 4, 4],
  ["attackSpeed", "attack_speed", 20, 20],
  ["magicResistance", "magic_resistance", 0.05, 0.05],
];

const flatPieceId = (stat: Stat): string => `flat_${stat}`;

const PIECES: readonly LegendaryDef[] = [
  ...FLAT_LINES.map(([, stat, value]) =>
    helmPiece(flatPieceId(stat), [{ stat, kind: "flat", value }]),
  ),
  helmPiece("health_helm", [
    { stat: "max_health", kind: "flat", value: 40 },
    { stat: "max_health", kind: "percent", value: 0.1 },
  ]),
  ringPiece("health_ring", [
    { stat: "max_health", kind: "flat", value: 20 },
    { stat: "max_health", kind: "percent", value: 0.1 },
  ]),
  helmPiece("moment_helm", [
    { stat: "attack_damage", kind: "flat", value: 5 },
    { stat: "movement_speed", kind: "percent", value: 0.1 },
    { stat: "cooldown_reduction", kind: "flat", value: 1 },
    { stat: "cooldown_reduction", kind: "percent", value: 0.1 },
  ]),
];

/** A status adding a tenth to maximum health, to add beside an item. */
const vigour = makeStatusDef.build({
  id: "vigour",
  modifiers: [
    {
      stat: "max_health",
      kind: "percent",
      amount: { orb: "quartz", byLevel: [0.1] },
    },
  ],
});

type Arranged = Readonly<{ world: Simulation; hero: Unit }>;

/** A hero of the factory form at level one, standing alone, ticked once so its values are derived. */
const arrange = (): Arranged => {
  const form = makeFormDef.build({ abilities: [] });
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      statuses: [vigour],
      legendaries: [...contentRegistry.legendaries, ...PIECES],
    }),
  });
  const hero = spawnHero(world);

  world.tick();

  return { world, hero };
};

/** Writes the piece `id` into a fresh item, as a boss's drop would. */
const pieceItem = (id: string): Item => {
  const piece = PIECES.find((each) => each.id === id);

  if (piece === undefined) {
    throw new Error(`The spec defines the piece ${id}`);
  }

  const item = createItem();

  item.baseId = piece.baseId;
  item.rarityId = "legendary";
  item.legendaryId = piece.id;
  item.itemLevel = 1;
  item.lineCount = piece.lines.length;
  piece.lines.forEach((line, index) => {
    const slot = item.lines[index];

    if (slot !== undefined) {
      slot.sourceId = piece.id;
      slot.value = line.value;
    }
  });

  return item;
};

/** Places `item` with its corner on `corner`. */
const put = (world: World, item: Item, corner: number): void => {
  const base = item.baseId === band.id ? band : cap;

  placeItem(world.run.inventory, item, base.width, base.height, corner);
};

const stamp = (world: Simulation) => ({
  tick: world.view.tick,
  timestamp: world.view.tick,
});

/** Sends `command` on this tick and ticks once. */
const send = (world: Simulation, command: ItemCommand): void => {
  submit(world, command);
  world.tick();
};

const equip = (world: Simulation, cell: number): void => {
  send(world, { kind: "equip_item", ...stamp(world), cell, armorySlot: null });
};

const unequip = (world: Simulation, armorySlot: number): void => {
  send(world, { kind: "unequip_item", ...stamp(world), armorySlot });
};

describe("an item worn and taken off, against each derived value", () => {
  it.each(FLAT_LINES)(
    "moves %s by its line on the tick the equip lands, and back on the tick the unequip does",
    (key, stat, _value, inSimulation) => {
      const { world, hero } = arrange();
      const before = hero.stats[key];

      put(world.state, pieceItem(flatPieceId(stat)), 0);
      equip(world, 0);

      expect(hero.stats[key]).toBeCloseTo(before + inSimulation, 9);

      unequip(world, HELM);

      expect(hero.stats[key]).toBe(before);
    },
  );

  it("moves nothing it does not name", () => {
    const { world, hero } = arrange();
    const before = { ...hero.stats };

    put(world.state, pieceItem(flatPieceId("armour")), 0);
    equip(world, 0);

    for (const source of STAT_SOURCES) {
      if (source.key !== "armour") {
        expect(hero.stats[source.key]).toBe(before[source.key]);
      }
    }
  });

  it("reads a real cap's implicit armour and a real affix's regeneration per second", () => {
    const { world, hero } = arrange();
    const before = { ...hero.stats };
    const item = createItem();
    const implicit = item.lines[0];
    const affix = item.lines[1];

    if (implicit === undefined || affix === undefined) {
      throw new Error("An item holds two lines");
    }

    item.baseId = cap.id;
    item.rarityId = "uncommon";
    item.itemLevel = 1;
    item.lineCount = 2;
    implicit.sourceId = cap.id;
    implicit.value = 2;
    affix.sourceId = "health_regen_1";
    affix.value = 0.6;
    put(world.state, item, 0);
    equip(world, 0);

    expect(hero.stats.armour).toBeCloseTo(before.armour + 2, 9);
    expect(hero.stats.healthRegen).toBeCloseTo(
      before.healthRegen + 0.6 / SIM_HZ,
      9,
    );
  });
});

describe("two items naming one stat", () => {
  it("add their flat lines before the percentages and their percentages inside one multiplier", () => {
    const { world, hero } = arrange();
    const base = hero.stats.maxHealth;

    put(world.state, pieceItem("health_helm"), 0);
    put(world.state, pieceItem("health_ring"), 2);
    equip(world, 0);
    equip(world, 2);

    expect(hero.stats.maxHealth).toBeCloseTo((base + 40 + 20) * 1.2, 9);

    unequip(world, RING);

    expect(hero.stats.maxHealth).toBeCloseTo((base + 40) * 1.1, 9);
  });

  it("sum with a status's percentage as one, and leave the status's rows when they go", () => {
    const { world, hero } = arrange();
    const heroId = world.view.run.heroId;
    const base = hero.stats.maxHealth;

    if (heroId === null) {
      throw new Error("The world names its hero");
    }

    applyStatus(world.state, heroId, vigour.id, STATUS_TICKS, null, [1, 1, 1]);
    put(world.state, pieceItem("health_helm"), 0);
    equip(world, 0);

    expect(hero.stats.maxHealth).toBeCloseTo((base + 40) * 1.2, 9);

    unequip(world, HELM);

    expect(hero.stats.maxHealth).toBeCloseTo(base * 1.1, 9);
    expect(hero.liveModifierRows).toBe(1);
  });
});

describe("the stats read at the moment", () => {
  it("take the worn item's attack damage, movement speed, and cooldown reduction, and let go of them", () => {
    const { world, hero } = arrange();
    const attack = world.state.run.heroAttack;
    const damage = attackDamageOf(hero, attack);
    const speed = movementSpeed(100, hero, 0, Infinity);

    put(world.state, pieceItem("moment_helm"), 0);
    equip(world, 0);

    expect(attackDamageOf(hero, attack)).toBe(damage + 5);
    expect(movementSpeed(100, hero, 0, Infinity)).toBeCloseTo(speed * 1.1, 9);
    expect(snapshotCooldownSources(hero, createCooldownSnapshot())).toEqual({
      flat: SIM_HZ,
      multiplier: 0.9,
      currentFlat: 0,
    });

    unequip(world, HELM);

    expect(attackDamageOf(hero, attack)).toBe(damage);
    expect(movementSpeed(100, hero, 0, Infinity)).toBe(speed);
    expect(snapshotCooldownSources(hero, createCooldownSnapshot())).toEqual({
      flat: 0,
      multiplier: 1,
      currentFlat: 0,
    });
  });

  it("reach no unit but the hero: every other table references the world's zeros", () => {
    const { world, hero } = arrange();
    const other = spawnUnit(world, { x: 400, y: 0 });

    put(world.state, pieceItem("moment_helm"), 0);
    equip(world, 0);

    expect(hero.totals).toBe(world.state.run.heroTotals);
    expect(other.totals).toBe(world.state.run.zeroTotals);
    expect(world.state.run.zeroTotals.lines).toBe(0);
    expect(flatTotalOf(world.state.run.heroTotals, "attack_damage")).toBe(5);
  });
});

describe("the armory's totals", () => {
  it("are rewritten on an equip and an unequip alone, and copied to the hero each tick", () => {
    const { world } = arrange();
    const armory = world.state.run.forms[0]?.armory;

    if (armory === undefined) {
      throw new Error("The hero has a form");
    }

    put(world.state, pieceItem("health_helm"), 0);
    equip(world, 0);

    expect(flatTotalOf(armory.totals, "max_health")).toBe(40);
    expect(percentTotalOf(armory.totals, "max_health")).toBe(0.1);
    expect(armory.totals.lines).toBe(2);
    expect(world.state.run.heroTotals).toEqual(armory.totals);

    unequip(world, HELM);

    expect(armory.totals.lines).toBe(0);
    expect(flatTotalOf(armory.totals, "max_health")).toBe(0);
    expect(world.state.run.heroTotals).toEqual(armory.totals);
  });
});

describe("in steady state", () => {
  it("allocates nothing in the totals' rewrite, their copy to the hero, or a read of a stat through them", () => {
    const { world, hero } = arrange();
    const state = world.state;
    const armory = state.run.forms[0]?.armory;

    if (armory === undefined) {
      throw new Error("The hero has a form");
    }

    put(state, pieceItem("moment_helm"), 0);
    put(state, pieceItem("health_ring"), 2);
    equip(world, 0);
    equip(world, 2);

    const simHz = readTunable(state.run.tuning, "sim_hz");
    const attack = state.run.heroAttack;
    const snapshot = createCooldownSnapshot();
    /** What an equip or an unequip adds: the rewrite and the copy to the hero. */
    const rewrite = (): number => {
      rewriteArmoryTotals(state.run, simHz, armory);
      copyStatTotals(armory.totals, state.run.heroTotals);

      return 1;
    };
    /** What a tick adds: the three reads at the moment, counted rather than summed so the count stays a small integer. */
    const read = (): number =>
      (attackDamageOf(hero, attack) > 0 ? 1 : 0) +
      (movementSpeed(100, hero, 0, Infinity) > 0 ? 1 : 0) +
      (snapshotCooldownSources(hero, snapshot).flat > 0 ? 1 : 0);

    /**
     * Warms `calls` up, then counts the collections and the heap's growth over a window of
     * them, with the sum of their counts. Each caller is warmed and measured on its own, so
     * the engine inlines the rewrite into one and the reads into the other rather than
     * running out of room for the reads behind the rewrite.
     */
    const steadyState = (
      calls: () => number,
    ): readonly [number, number, number] => {
      let sink = 0;

      for (let call = 0; call < WARM_UP_CALLS; call += 1) {
        sink += calls();
      }

      const profiler = new GCProfiler();

      profiler.start();

      const before = process.memoryUsage().heapUsed;

      for (let call = 0; call < MEASURED_CALLS; call += 1) {
        sink += calls();
      }

      const after = process.memoryUsage().heapUsed;

      return [profiler.stop().statistics.length, after - before, sink];
    };

    const [rewriteCollections, rewriteGrown, rewrites] = steadyState(rewrite);
    const [readCollections, readGrown, reads] = steadyState(read);

    expect(armory.totals.lines).toBe(6);
    expect([rewrites, reads]).toEqual([
      WARM_UP_CALLS + MEASURED_CALLS,
      (WARM_UP_CALLS + MEASURED_CALLS) * 3,
    ]);
    expect([rewriteCollections, readCollections]).toEqual([0, 0]);
    expect(rewriteGrown).toBeLessThan(HEAP_ALLOWANCE_BYTES);
    expect(readGrown).toBeLessThan(HEAP_ALLOWANCE_BYTES);
  });
});

/** The derived value each stat a helm's affix may name moves, and how many of the simulation's units one of the designer's is. */
const HELM_AFFIX_STATS: Readonly<
  Partial<Record<Stat, readonly [StatKey, number]>>
> = {
  max_health: ["maxHealth", 1],
  health_regen: ["healthRegen", 1 / SIM_HZ],
  max_mana: ["maxMana", 1],
  mana_regen: ["manaRegen", 1 / SIM_HZ],
  armour: ["armour", 1],
  magic_resistance: ["magicResistance", 1],
};

/** A copy of the first Mythical cap a boss's drop rolls on the world's tick, its affixes all at affix level 1. */
const rolledMythicalCap = (world: Simulation): Item => {
  const out = createDropRoll();

  for (let key = 0; key < 10_000; key += 1) {
    rollDrop(world.view, "boss", key, null, out);

    for (let index = 0; index < out.itemCount; index += 1) {
      const item = out.items[index];

      if (item?.baseId === cap.id && item.rarityId === "mythical") {
        return structuredClone(item);
      }
    }
  }

  throw new Error("A boss drops a Mythical cap within the keys rolled");
};

describe("a rolled item's affixes, worn", () => {
  it("move each derived value they name by their line, the implicit's beside them, and back when it comes off", () => {
    const { world, hero } = arrange();
    const before = { ...hero.stats };
    const item = rolledMythicalCap(world);
    const expected = new Map<StatKey, number>();

    expect(item.lineCount).toBe(6);

    for (const [line, rolled] of item.lines.entries()) {
      const stat =
        line === 0
          ? cap.implicit.stat
          : contentRegistry.affixes.find(
              (affix) => affix.id === rolled.sourceId,
            )?.stat;
      const moved = stat === undefined ? undefined : HELM_AFFIX_STATS[stat];

      if (moved === undefined) {
        throw new Error(`A helm's line ${String(line)} names a derived value`);
      }

      const [key, unit] = moved;

      expected.set(key, (expected.get(key) ?? 0) + rolled.value * unit);
    }

    put(world.state, item, 0);
    equip(world, 0);

    for (const [key, delta] of expected) {
      expect(hero.stats[key], key).toBeCloseTo(before[key] + delta, 9);
    }

    unequip(world, HELM);

    for (const key of expected.keys()) {
      expect(hero.stats[key], key).toBe(before[key]);
    }
  });
});
