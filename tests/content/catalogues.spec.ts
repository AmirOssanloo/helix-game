import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  enemies,
  heroDef,
  longRoadDef,
  spells,
  tuningTable,
} from "@content/public";
import type { EnemyDef, EnemyTier, PackDef, SpellDef } from "@domain/public";
import { mitigate } from "@domain/public";
import { REPOSITORY_ROOT } from "../helpers";

/** The two content specifications whose tables restate what the definition files hold. */
const ENEMY_CATALOGUE = "docs/product/specs/enemy-catalogue.md";
const SPELL_CATALOGUE = "docs/product/specs/spell-catalogue.md";

/** The long road's spec, whose pack table and experience budget restate its map file. */
const LONG_ROAD_SPEC = "docs/product/specs/the-long-road.md";

const linesOf = (path: string): string[] =>
  readFileSync(join(REPOSITORY_ROOT, path), "utf8").split("\n");

/** The cells of a Markdown table row, trimmed, or `null` for a line that is not a row. */
const cellsOf = (line: string): string[] | null =>
  line.startsWith("|")
    ? line
        .slice(1, line.endsWith("|") ? -1 : undefined)
        .split("|")
        .map((cell) => cell.trim())
    : null;

/** Every number written in `cell`, in order, so `"400 · 1"` is 400 and 1. */
const numbersIn = (cell: string): number[] =>
  [...cell.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));

/** The id a cell names in backticks, or `null`. */
const idIn = (cell: string): string | null =>
  /`([a-z_]+)`/.exec(cell)?.[1] ?? null;

/** The headings an archetype's field table sits under: the four and the dummy and imp in section 3, the roster in section 7.3. */
const ENTRY_HEADING = /^#{3,4} (?:3|7\.3)\./;

/** How many cells a summary row holds: section 3's table, and the roster's with its three columns more. */
const SUMMARY_WIDTHS: readonly number[] = [11, 14];

/**
 * Each archetype's field table in the enemy catalogue, by the id its `Id` row names: the
 * field's name to the cell that holds its value.
 */
const enemyEntries = (): Map<string, Map<string, string>> => {
  const entries = new Map<string, Map<string, string>>();
  let fields: Map<string, string> | null = null;

  for (const line of linesOf(ENEMY_CATALOGUE)) {
    if (ENTRY_HEADING.test(line)) {
      fields = new Map();
      continue;
    }

    if (/^#{2,4} /.test(line)) {
      fields = null;
      continue;
    }

    const cells = cellsOf(line);

    if (fields === null || cells === null) {
      continue;
    }

    const [name = "", value = ""] = cells;

    fields.set(name, value);

    if (name === "Id") {
      const id = idIn(value);

      if (id !== null) {
        entries.set(id, fields);
      }
    }
  }

  return entries;
};

/** The enemy catalogue's summary table, by the id in its second column. */
const enemySummary = (): Map<string, string[]> => {
  const rows = new Map<string, string[]>();

  for (const line of linesOf(ENEMY_CATALOGUE)) {
    const cells = cellsOf(line);
    const id = cells === null ? null : idIn(cells[1] ?? "");

    if (
      cells !== null &&
      id !== null &&
      SUMMARY_WIDTHS.includes(cells.length)
    ) {
      rows.set(id, cells);
    }
  }

  return rows;
};

/** The spell catalogue's summary table, by the spell's name in its second column, lower-cased to its id. */
const spellSummary = (): Map<string, string[]> => {
  const rows = new Map<string, string[]>();

  for (const line of linesOf(SPELL_CATALOGUE)) {
    const cells = cellsOf(line);

    if (cells !== null && /^[QWE]{3}$/.test(cells[0] ?? "")) {
      rows.set((cells[1] ?? "").toLowerCase(), cells);
    }
  }

  return rows;
};

const firstAndLast = (table: readonly number[]): number[] => [
  table[0] ?? Number.NaN,
  table[table.length - 1] ?? Number.NaN,
];

/** Where the archetype definitions live, one file per archetype, the file name the id. */
const ENEMY_DIR = "src/content/enemies";

/** The id each definition file under the enemies folder is named for. */
const enemyFileIds = (): string[] =>
  readdirSync(join(REPOSITORY_ROOT, ENEMY_DIR))
    .filter((name) => name.endsWith(".def.ts"))
    .map((name) => name.replace(/\.def\.ts$/, "").replace(/-/g, "_"))
    .sort();

describe("the enemy catalogue", () => {
  const entries = enemyEntries();
  const summary = enemySummary();

  it("holds an entry and a summary row for every definition file in the enemies folder, and for no other", () => {
    expect([...entries.keys()].sort()).toEqual(enemyFileIds());
    expect([...summary.keys()].sort()).toEqual(enemyFileIds());
  });

  it.each(enemies.map((def): [string, EnemyDef] => [def.id, def]))(
    "writes %s's numbers as its definition holds them",
    (id, def) => {
      const fields = entries.get(id);
      const row = summary.get(id);

      if (fields === undefined || row === undefined) {
        throw new Error(
          `The catalogue has an entry and a summary row for ${id}`,
        );
      }

      expect(numbersIn(fields.get("Health · regeneration") ?? "")).toEqual([
        def.health,
        def.healthRegen,
      ]);
      expect(numbersIn(fields.get("Mana · regeneration") ?? "")).toEqual([
        def.mana,
        def.manaRegen,
      ]);
      expect(numbersIn(fields.get("Armour · magic resistance") ?? "")).toEqual([
        def.armour,
        def.magicResistance,
      ]);
      expect(numbersIn(fields.get("Movement speed · turn rate") ?? "")).toEqual(
        [def.movementSpeed, def.turnRate],
      );
      expect(numbersIn(fields.get("Aggro · leash radius") ?? "")).toEqual([
        def.aggroRadius,
        def.leashRadius,
      ]);
      expect(numbersIn(fields.get("Experience") ?? "")).toEqual([
        def.experience,
      ]);

      const [, , health, armour, speed, radius, , , experience, behaviour] =
        row;

      expect(numbersIn(health ?? "")).toEqual([def.health]);
      expect(numbersIn(armour ?? "")).toEqual([def.armour]);
      expect(numbersIn(speed ?? "")).toEqual([def.movementSpeed]);
      expect(numbersIn(radius ?? "")).toEqual([def.body.collisionRadius]);
      expect(numbersIn(experience ?? "")).toEqual([def.experience]);
      expect(idIn(behaviour ?? "")).toBe(def.behaviour);
    },
  );
});

/** The fewest and the most of the hero's basic attacks a normal fighting archetype dies to, as a Diablo II first-act monster does. */
const FEWEST_HITS = 1;
const MOST_HITS = 4;

/** What the hero's basic attack lands on `def` after its armour. */
const heroHitOn = (def: EnemyDef): number =>
  mitigate(
    heroDef.attack.damage,
    "physical",
    {
      maxHealth: def.health,
      healthRegen: def.healthRegen,
      maxMana: def.mana,
      manaRegen: def.manaRegen,
      armour: def.armour,
      attackSpeed: 0,
      magicResistance: def.magicResistance,
    },
    tuningTable.armour_constant,
  );

/** Every archetype that fights: all but the indestructible dummy. */
const FIGHTING = enemies.filter((def) => !def.indestructible);

describe("the enemy catalogue's ratios", () => {
  it.each(FIGHTING.map((def): [string, EnemyDef] => [def.id, def]))(
    "%s dies to one to four of the hero's basic attacks after its armour",
    (_id, def) => {
      const hits = Math.ceil(def.health / heroHitOn(def));

      expect(hits).toBeGreaterThanOrEqual(FEWEST_HITS);
      expect(hits).toBeLessThanOrEqual(MOST_HITS);
    },
  );

  it("puts an elite at three times a normal's health and a boss at four, both landing half again its hit", () => {
    expect(tuningTable.elite_health_multiplier).toBe(3);
    expect(tuningTable.boss_health_multiplier).toBe(4);
    expect(tuningTable.elite_damage_multiplier).toBe(1.5);
    expect(tuningTable.boss_damage_multiplier).toBe(1.5);
  });

  it("pays an elite three times a normal's experience and a boss ten, as the level budget is set against", () => {
    expect(tuningTable.elite_experience_multiplier).toBe(3);
    expect(tuningTable.boss_experience_multiplier).toBe(10);
  });
});

describe("the spell catalogue", () => {
  const summary = spellSummary();

  it.each(spells.map((def): [string, SpellDef] => [def.id, def]))(
    "writes %s's cast point, range, cooldown, and mana as its definition holds them",
    (id, def) => {
      const row = summary.get(id);

      if (row === undefined) {
        throw new Error(`The catalogue has a summary row for ${id}`);
      }

      const [, , , castPoint, range, cooldown, mana] = row;

      expect(numbersIn(castPoint ?? "")).toEqual([def.castPointSeconds]);
      expect(numbersIn(range ?? "")).toEqual([def.range]);
      expect(numbersIn(cooldown ?? "")).toEqual(
        firstAndLast(def.cooldownSeconds),
      );
      expect(numbersIn(mana ?? "")).toEqual(firstAndLast(def.manaCost));
    },
  );
});

/** One row of the long road's pack table: the pack's number, region, and role beside the fields. */
type PackRow = Readonly<{
  region: number;
  archetypeId: string;
  tier: string;
  count: number;
  x: number;
  y: number;
  role: string;
  experience: number;
}>;

/** How many cells the pack table's rows hold. */
const PACK_ROW_WIDTH = 9;

/** The long road's pack table, in its order: every row of nine cells whose first is a number. */
const packRows = (): PackRow[] =>
  linesOf(LONG_ROAD_SPEC).flatMap((line) => {
    const cells = cellsOf(line);

    if (
      cells === null ||
      cells.length !== PACK_ROW_WIDTH ||
      !/^\d+$/.test(cells[0] ?? "")
    ) {
      return [];
    }

    const [, region, archetype, tier, count, x, y, role, experience] = cells;

    return [
      {
        region: Number(region),
        archetypeId: idIn(archetype ?? "") ?? "",
        tier: tier ?? "",
        count: Number(count),
        x: Number(x),
        y: Number(y),
        role: role ?? "",
        experience: Number(experience),
      },
    ];
  });

/** The per-region budget table's rows, by the name in their first cell, as their numbers. */
const budgetRows = (): Map<string, number[]> => {
  const rows = new Map<string, number[]>();

  for (const line of linesOf(LONG_ROAD_SPEC)) {
    const cells = cellsOf(line);

    if (
      cells !== null &&
      cells.length === 8 &&
      /^(?:\*\*)?(?:\d ·|The last boss|Full clear)/.test(cells[0] ?? "")
    ) {
      rows.set(
        (cells[0] ?? "").replace(/\*\*/g, ""),
        cells.slice(1).map((cell) => numbersIn(cell)[0] ?? Number.NaN),
      );
    }
  }

  return rows;
};

const TIER_MULTIPLIERS: Readonly<Record<EnemyTier, number>> = {
  normal: 1,
  elite: tuningTable.elite_experience_multiplier,
  boss: tuningTable.boss_experience_multiplier,
};

/** The experience a full kill of `pack` pays: the archetype's, times its tier's multiplier, times the count. */
const experienceOf = (pack: PackDef): number => {
  const def = enemies.find((enemy) => enemy.id === pack.archetypeId);

  if (def === undefined) {
    throw new Error(`The roster holds ${pack.archetypeId}`);
  }

  return def.experience * TIER_MULTIPLIERS[pack.tier] * pack.count;
};

/** The level the hero stands at with `experience`: every threshold it has reached. */
const levelAt = (experience: number): number =>
  heroDef.experienceThresholds.filter((threshold) => threshold <= experience)
    .length;

/** The experience the long road pays before the last boss and with it: the spec's budget, which no enemy retune moves. */
const LEVEL_BUDGET = [5408, 6308];

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

describe("the long road's spec", () => {
  const rows = packRows();
  const packs = longRoadDef.packs;
  const lastBoss = packs.length - 1;

  it("lists every pack the map holds, in its order, as the file writes it", () => {
    expect(
      rows.map(({ archetypeId, tier, count, x, y }) => ({
        archetypeId,
        tier,
        count,
        position: { x, y },
      })),
    ).toEqual(
      packs.map(({ archetypeId, tier, count, position }) => ({
        archetypeId,
        tier,
        count,
        position,
      })),
    );
    expect(rows[lastBoss]?.role).toBe("last boss");
  });

  it("writes each pack's experience as its archetype, tier, and count pay it", () => {
    expect(rows.map((row) => row.experience)).toEqual(packs.map(experienceOf));
  });

  it("writes each region's budget, the running total, and the level at its end as the packs add up", () => {
    const budget = budgetRows();
    const regionOf = (index: number): string =>
      index === lastBoss ? "The last boss" : String(rows[index]?.region);
    let running = 0;

    expect(budget.size).toBe(7);

    for (const [
      name,
      [packCount, normal, elite, boss, total, runningTotal, level],
    ] of [...budget].filter(([name]) => name !== "Full clear")) {
      const key = name === "The last boss" ? name : name.slice(0, 1);
      const inRegion = packs.filter((_pack, index) => regionOf(index) === key);
      const byTier = (tier: EnemyTier): number =>
        sum(inRegion.filter((pack) => pack.tier === tier).map(experienceOf));

      running += sum(inRegion.map(experienceOf));

      expect([
        packCount,
        normal,
        elite,
        boss,
        total,
        runningTotal,
        level,
      ]).toEqual([
        inRegion.length,
        byTier("normal"),
        byTier("elite"),
        byTier("boss"),
        sum(inRegion.map(experienceOf)),
        running,
        levelAt(running),
      ]);
    }

    expect(budget.get("Full clear")?.slice(0, 5)).toEqual([
      packs.length,
      sum(packs.filter((pack) => pack.tier === "normal").map(experienceOf)),
      sum(packs.filter((pack) => pack.tier === "elite").map(experienceOf)),
      sum(packs.filter((pack) => pack.tier === "boss").map(experienceOf)),
      sum(packs.map(experienceOf)),
    ]);
    expect(budget.get("Full clear")?.[6]).toBe(levelAt(running));
  });

  it("reaches level 10 with the last boss's kill, not before, and stays under level 11", () => {
    const beforeLastBoss = sum(packs.slice(0, lastBoss).map(experienceOf));
    const fullClear = sum(packs.map(experienceOf));

    expect([beforeLastBoss, fullClear]).toEqual(LEVEL_BUDGET);
    expect(levelAt(beforeLastBoss)).toBeLessThan(10);
    expect(levelAt(fullClear)).toBe(10);
    expect(fullClear).toBeLessThan(heroDef.experienceThresholds[10] ?? 0);
  });

  it("reaches level 9 before the last boss with the five costliest normal packs skipped", () => {
    const beforeLastBoss = packs.slice(0, lastBoss);
    const normals = beforeLastBoss
      .filter((pack) => pack.tier === "normal")
      .map(experienceOf)
      .sort((a, b) => b - a);
    const skipped = sum(normals.slice(0, Math.ceil(normals.length / 5)));

    expect(levelAt(sum(beforeLastBoss.map(experienceOf)) - skipped)).toBe(9);
  });
});
