import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { enemies, spells } from "@content/public";
import type { EnemyDef, SpellDef } from "@domain/public";
import { REPOSITORY_ROOT } from "../helpers";

/** The two content specifications whose tables restate what the definition files hold. */
const ENEMY_CATALOGUE = "docs/product/specs/enemy-catalogue.md";
const SPELL_CATALOGUE = "docs/product/specs/spell-catalogue.md";

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

/**
 * Each archetype's field table in the enemy catalogue, by the id its `Id` row names: the
 * field's name to the cell that holds its value.
 */
const enemyEntries = (): Map<string, Map<string, string>> => {
  const entries = new Map<string, Map<string, string>>();
  let fields: Map<string, string> | null = null;

  for (const line of linesOf(ENEMY_CATALOGUE)) {
    if (line.startsWith("### 3.")) {
      fields = new Map();
      continue;
    }

    if (line.startsWith("## ") || line.startsWith("### ")) {
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

    if (cells !== null && id !== null && cells.length === 11) {
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

describe("the enemy catalogue", () => {
  const entries = enemyEntries();
  const summary = enemySummary();

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
