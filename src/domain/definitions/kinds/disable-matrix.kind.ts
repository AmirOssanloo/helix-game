import type { SingleKind } from "../definition-kind";
import type {
  DisableCellsDef,
  DisableMatrixDef,
  DisableRowDef,
} from "../disable-matrix-def";
import {
  CAST_POINT_ANSWERS,
  COMMAND_ANSWERS,
  COMMAND_COLUMNS,
  CURSOR_ANSWERS,
  DISABLE_COLUMNS,
  DISABLE_REASONS,
} from "../disable-matrix-def";
import type { ValidationContext } from "../registry-checks";
import { statusesById } from "../registry-checks";
import type { Schema } from "../schema";
import { arrayOf, idSchema, nullable, objectOf, oneOf } from "../schema";
import { STATUS_FLAGS } from "../status-def";

const commandAnswerSchema = oneOf(COMMAND_ANSWERS);
const cursorAnswerSchema = oneOf(CURSOR_ANSWERS);

/** The disable matrix: one row per group of statuses, each with an answer of its column's kind in every column. Which status sits in which row is a check the registry makes against the statuses. */
const disableMatrixSchema: Schema<DisableMatrixDef> = arrayOf(
  objectOf<DisableRowDef>({
    id: idSchema,
    statuses: arrayOf(idSchema),
    flags: arrayOf(oneOf(STATUS_FLAGS)),
    wornBy: arrayOf(oneOf(STATUS_FLAGS)),
    reason: nullable(oneOf(DISABLE_REASONS)),
    cells: objectOf<DisableCellsDef>({
      q: commandAnswerSchema,
      w: commandAnswerSchema,
      e: commandAnswerSchema,
      r: commandAnswerSchema,
      d: commandAnswerSchema,
      f: commandAnswerSchema,
      move: commandAnswerSchema,
      attackTarget: commandAnswerSchema,
      attackMove: commandAnswerSchema,
      stop: commandAnswerSchema,
      items: commandAnswerSchema,
      pickUp: commandAnswerSchema,
      castPoint: oneOf(CAST_POINT_ANSWERS),
      targetingCursor: cursorAnswerSchema,
      attackMoveCursor: cursorAnswerSchema,
    }),
  }),
);

/**
 * The disable matrix against the statuses: every row id once, every status in exactly one row
 * and no row naming a status that does not exist, each row's flags exactly the flags its
 * statuses raise, the flags it is worn by among them, a reason exactly when a key or order
 * cell refuses, and a row worn by no flag blocking nothing.
 */
const checkDisableMatrix = (
  context: ValidationContext,
  file: string,
  rows: DisableMatrixDef,
): void => {
  const faults = context.faults;
  const statuses = statusesById(context);
  const rowOf = new Map<string, string>();
  const rowIds = new Set<string>();

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    if (row === undefined) {
      continue;
    }

    const path = `[${String(index)}]`;
    const raised = new Set<string>();

    if (rowIds.has(row.id)) {
      faults.push({
        file: file,
        path: `${path}.id`,
        message: `"${row.id}" is already the id of a row`,
      });
    }

    rowIds.add(row.id);

    for (let entry = 0; entry < row.statuses.length; entry += 1) {
      const id = row.statuses[entry];

      if (id === undefined) {
        continue;
      }

      const entryPath = `${path}.statuses[${String(entry)}]`;
      const status = statuses.get(id);
      const earlier = rowOf.get(id);

      if (status === undefined) {
        faults.push({
          file: file,
          path: entryPath,
          message: `"${id}" names no status`,
        });

        continue;
      }

      if (earlier !== undefined) {
        faults.push({
          file: file,
          path: entryPath,
          message: `"${id}" already sits in the row "${earlier}"`,
        });

        continue;
      }

      rowOf.set(id, row.id);

      for (const flag of status.flags) {
        raised.add(flag);
      }
    }

    const written = new Set<string>(row.flags);
    const matches =
      written.size === raised.size &&
      [...raised].every((flag) => written.has(flag));

    if (!matches) {
      faults.push({
        file: file,
        path: `${path}.flags`,
        message: `expected the flags its statuses raise, ${[...raised].sort().join(", ") || "none"}`,
      });
    }

    for (let entry = 0; entry < row.wornBy.length; entry += 1) {
      const flag = row.wornBy[entry];

      if (flag !== undefined && !written.has(flag)) {
        faults.push({
          file: file,
          path: `${path}.wornBy[${String(entry)}]`,
          message: `expected one of the row's flags, found "${flag}"`,
        });
      }
    }

    const refuses = COMMAND_COLUMNS.some(
      (column) => row.cells[column] !== "allowed",
    );

    if (refuses !== (row.reason !== null)) {
      faults.push({
        file: file,
        path: `${path}.reason`,
        message: refuses
          ? "expected a reason, since a key or order cell refuses"
          : "expected null, since no key or order cell refuses",
      });
    }

    if (row.wornBy.length === 0) {
      for (const column of DISABLE_COLUMNS) {
        const answer = row.cells[column];

        if (answer !== "allowed" && answer !== "continues") {
          faults.push({
            file: file,
            path: `${path}.cells.${column}`,
            message: `expected allowed or continues, since no flag wears the row; found ${answer}`,
          });
        }
      }
    }
  }

  for (const id of statuses.keys()) {
    if (!rowOf.has(id)) {
      faults.push({
        file: file,
        path: "",
        message: `the status "${id}" sits in no row`,
      });
    }
  }
};

/**
 * What every status refuses, ends, and closes, one row per group of statuses; every status
 * sits in exactly one row. Checked as a whole against the statuses whose shape passed.
 */
export const disableMatrixKind: SingleKind<
  "disableMatrix",
  DisableMatrixDef,
  null
> = {
  field: "disableMatrix",
  shape: "single",
  file: "statuses/disable-matrix.ts",
  stage: "levelled",
  schema: () => disableMatrixSchema,
  check: checkDisableMatrix,
  tuning: null,
};
