import { describe, expect, it } from "vitest";
import { contentRegistry, disableMatrix } from "@content/public";
import type { DisableMatrixDef, DisableRowDef } from "@domain/public";
import {
  CAST_POINT_ANSWERS,
  COMMAND_ANSWERS,
  COMMAND_COLUMNS,
  CURSOR_ANSWERS,
  DISABLE_COLUMNS,
  validateRegistry,
} from "@domain/public";
import { makeRegistry } from "../helpers";

const FILE = "statuses/disable-matrix.ts";

/** The matrix as the registry holds it, typed as any matrix rather than as the literal the file writes. */
const matrix: DisableMatrixDef = disableMatrix;

/** The faults the registry reports against the matrix file when it holds `rows`. */
const faultsWith = (rows: unknown) =>
  validateRegistry(
    makeRegistry({ disableMatrix: rows as DisableMatrixDef }),
  ).filter((fault) => fault.file === FILE);

/** `matrix` with the row `id` replaced by what `change` makes of it. */
const withRow = (
  id: string,
  change: (row: DisableRowDef) => unknown,
): unknown[] => matrix.map((row) => (row.id === id ? change(row) : row));

/** The answers a column of `column`'s kind may hold. */
const answersFor = (column: string): readonly string[] => {
  if (column === "castPoint") {
    return CAST_POINT_ANSWERS;
  }

  if (column === "targetingCursor" || column === "attackMoveCursor") {
    return CURSOR_ANSWERS;
  }

  return COMMAND_ANSWERS;
};

describe("the disable matrix", () => {
  it("validates in the registry", () => {
    expect(
      validateRegistry(contentRegistry).filter((fault) => fault.file === FILE),
    ).toEqual([]);
  });

  it("has the page's nine rows and thirteen columns", () => {
    expect(matrix.map((row) => row.id).sort()).toEqual([
      "damage_over_time",
      "disarm",
      "knockback",
      "lift",
      "no_disable",
      "root",
      "silence",
      "slow",
      "stun",
    ]);
    expect(DISABLE_COLUMNS).toHaveLength(13);
  });

  it.each(contentRegistry.statuses.map((status) => [status.id]))(
    "puts %s in exactly one row, with an answer of its column's kind in every column",
    (id) => {
      const rows = matrix.filter((row) => row.statuses.includes(id));

      expect(rows).toHaveLength(1);

      const row = rows[0];

      if (row === undefined) {
        throw new Error("The status sits in a row");
      }

      for (const column of DISABLE_COLUMNS) {
        expect(answersFor(column)).toContain(row.cells[column]);
      }
    },
  );

  it("refuses every key and order under at least one row", () => {
    for (const column of COMMAND_COLUMNS) {
      expect(matrix.some((row) => row.cells[column] !== "allowed")).toBe(true);
    }
  });

  it("names no status that does not exist", () => {
    const ids = new Set(contentRegistry.statuses.map((status) => status.id));

    for (const row of matrix) {
      for (const id of row.statuses) {
        expect(ids.has(id)).toBe(true);
      }
    }
  });
});

describe("the registry refuses a matrix", () => {
  it("that leaves a status out of every row", () => {
    const faults = faultsWith(
      withRow("no_disable", (row) => ({
        ...row,
        statuses: row.statuses.filter((id) => id !== "quicken"),
      })),
    );

    expect(faults).toEqual([
      {
        file: FILE,
        path: "",
        message: 'the status "quicken" sits in no row',
      },
    ]);
  });

  it("that puts a status in two rows", () => {
    const faults = faultsWith(
      withRow("slow", (row) => ({
        ...row,
        statuses: [...row.statuses, "burn"],
      })),
    );

    expect(faults.map((fault) => fault.message)).toContain(
      '"burn" already sits in the row "slow"',
    );
  });

  it("that names a status that does not exist", () => {
    const faults = faultsWith(
      withRow("slow", (row) => ({
        ...row,
        statuses: [...row.statuses, "frostbite"],
      })),
    );

    expect(faults.map((fault) => fault.message)).toContain(
      '"frostbite" names no status',
    );
  });

  it.each(DISABLE_COLUMNS.map((column) => [column]))(
    "whose row leaves the %s column empty",
    (column) => {
      const faults = faultsWith(
        withRow("stun", (row) => {
          const cells: Record<string, unknown> = { ...row.cells };

          delete cells[column];

          return { ...row, cells };
        }),
      );

      expect(faults).toContainEqual({
        file: FILE,
        path: `[0].cells.${column}`,
        message: "missing field",
      });
    },
  );

  it("with an answer of the wrong kind for its column", () => {
    const faults = faultsWith(
      withRow("stun", (row) => ({
        ...row,
        cells: { ...row.cells, castPoint: "refused" },
      })),
    );

    expect(faults.map((fault) => fault.path)).toEqual(["[0].cells.castPoint"]);
  });

  it("whose row's flags are not the flags its statuses raise", () => {
    const faults = faultsWith(
      withRow("lift", (row) => ({ ...row, flags: ["lifted", "stunned"] })),
    );

    expect(faults.map((fault) => fault.path)).toEqual(["[1].flags"]);
  });

  it("whose row is worn by a flag its statuses do not raise", () => {
    const faults = faultsWith(
      withRow("root", (row) => ({ ...row, wornBy: ["silenced"] })),
    );

    expect(faults.map((fault) => fault.path)).toEqual(["[3].wornBy[0]"]);
  });

  it("whose row refuses with no reason, or names a reason and refuses nothing", () => {
    expect(
      faultsWith(withRow("disarm", (row) => ({ ...row, reason: null }))).map(
        (fault) => fault.path,
      ),
    ).toEqual(["[4].reason"]);
    expect(
      faultsWith(withRow("slow", (row) => ({ ...row, reason: "rooted" }))).map(
        (fault) => fault.path,
      ),
    ).toEqual(["[5].reason"]);
  });

  it("whose row is worn by no flag and yet blocks", () => {
    const faults = faultsWith(
      withRow("damage_over_time", (row) => ({
        ...row,
        cells: { ...row.cells, targetingCursor: "closed" },
      })),
    );

    expect(faults.map((fault) => fault.path)).toEqual([
      "[6].cells.targetingCursor",
    ]);
  });

  it("with two rows of one id", () => {
    const faults = faultsWith(
      withRow("no_disable", (row) => ({ ...row, id: "slow" })),
    );

    expect(faults.map((fault) => fault.message)).toContain(
      '"slow" is already the id of a row',
    );
  });
});
