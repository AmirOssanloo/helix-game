import { assert } from "@shared/public";
import type {
  CommandColumn,
  CursorColumn,
  DisableAnswer,
  DisableColumn,
  DisableMatrixDef,
  DisableReason,
  DisableRowDef,
} from "../definitions/disable-matrix-def";
import { SLOT_COLUMNS } from "../definitions/disable-matrix-def";
import type { DisableFlags } from "./disable-flags";
import { isRaised } from "./disable-flags";

/**
 * How strict each answer is, for two rows worn at once: cancelled over refused, refused over
 * allowed, closed over continues, cancelled over continues.
 */
const STRICTNESS: Readonly<Record<DisableAnswer, number>> = {
  allowed: 0,
  continues: 0,
  refused: 1,
  closed: 1,
  cancelled: 2,
};

/** Whether every flag `row` is worn by is raised on `disables`, and it is worn by at least one. */
const hasFlagsOf = (
  disables: Readonly<DisableFlags>,
  row: DisableRowDef,
): boolean => {
  const flags = row.wornBy;

  if (flags.length === 0) {
    return false;
  }

  for (let index = 0; index < flags.length; index += 1) {
    const flag = flags[index];

    if (flag === undefined || !isRaised(disables, flag)) {
      return false;
    }
  }

  return true;
};

/** Whether `wider` is worn by every flag `narrower` is worn by, and by more. */
const covers = (wider: DisableRowDef, narrower: DisableRowDef): boolean => {
  if (wider.wornBy.length <= narrower.wornBy.length) {
    return false;
  }

  for (let index = 0; index < narrower.wornBy.length; index += 1) {
    const flag = narrower.wornBy[index];

    if (flag === undefined || !wider.wornBy.includes(flag)) {
      return false;
    }
  }

  return true;
};

/**
 * Whether a unit with `disables` wears `row`: every flag the row is worn by is raised, and no
 * other row it has the flags of is worn by those flags and more. A lift raises the stunned
 * flag, so a lifted unit has the flags of stun as well; the lift row covers the stun row, and
 * the unit answers as lift.
 */
export const isWearing = (
  matrix: DisableMatrixDef,
  disables: Readonly<DisableFlags>,
  row: DisableRowDef,
): boolean => {
  if (!hasFlagsOf(disables, row)) {
    return false;
  }

  for (let index = 0; index < matrix.length; index += 1) {
    const other = matrix[index];

    if (
      other !== undefined &&
      covers(other, row) &&
      hasFlagsOf(disables, other)
    ) {
      return false;
    }
  }

  return true;
};

/** The answer a unit with `disables` gives `column`: the strictest of the rows it wears, or the answer of wearing none. */
export const answerOf = (
  matrix: DisableMatrixDef,
  disables: Readonly<DisableFlags>,
  column: DisableColumn,
): DisableAnswer => {
  let answer: DisableAnswer =
    column === "castPoint" ||
    column === "targetingCursor" ||
    column === "attackMoveCursor"
      ? "continues"
      : "allowed";

  for (let index = 0; index < matrix.length; index += 1) {
    const row = matrix[index];

    if (row === undefined || !isWearing(matrix, disables, row)) {
      continue;
    }

    const cell = row.cells[column];

    if (STRICTNESS[cell] > STRICTNESS[answer]) {
      answer = cell;
    }
  }

  return answer;
};

/**
 * The reason a command of `column` is refused for a unit with `disables`, or `null` when the
 * matrix lets it through: the reason of the first row, in the matrix's order, that the unit
 * wears and that refuses or cancels the command.
 */
export const refusalOf = (
  matrix: DisableMatrixDef,
  disables: Readonly<DisableFlags>,
  column: CommandColumn,
): DisableReason | null => {
  for (let index = 0; index < matrix.length; index += 1) {
    const row = matrix[index];

    if (
      row === undefined ||
      row.cells[column] === "allowed" ||
      !isWearing(matrix, disables, row)
    ) {
      continue;
    }

    assert(
      row.reason !== null,
      "The content tier gives a reason to every row that refuses a command",
    );

    return row.reason;
  }

  return null;
};

/** The reason slot key `slot`, 1 to 6, is refused for a unit with `disables`, or `null` when it is not. */
export const slotRefusal = (
  matrix: DisableMatrixDef,
  disables: Readonly<DisableFlags>,
  slot: number,
): DisableReason | null => {
  const column = SLOT_COLUMNS[slot - 1];

  assert(column !== undefined, "A slot key is one of the six");

  return refusalOf(matrix, disables, column);
};

/**
 * The reason a cast is refused for a unit with `disables`, or `null` when it is not. A cast
 * names the spell and not the slot it sits in, so it reads both spell keys' cells: D's
 * refusal, or F's when D lets it through. An enemy's cast of any ability reads the same two.
 */
export const castRefusal = (
  matrix: DisableMatrixDef,
  disables: Readonly<DisableFlags>,
): DisableReason | null =>
  refusalOf(matrix, disables, "d") ?? refusalOf(matrix, disables, "f");

/** Whether a unit with `disables` has what it is doing in `column` ended: a running order, or a cast under way. */
export const isCancelled = (
  matrix: DisableMatrixDef,
  disables: Readonly<DisableFlags>,
  column: DisableColumn,
): boolean => answerOf(matrix, disables, column) === "cancelled";

/** Whether the hero's open cursor of `column` closes while it has `disables`. */
export const isClosed = (
  matrix: DisableMatrixDef,
  disables: Readonly<DisableFlags>,
  column: CursorColumn,
): boolean => answerOf(matrix, disables, column) === "closed";
