import type { StatusFlag } from "./status-def";

/** What a key or an order column answers: the command is refused, applies as it would with no status, or is refused and any running order of its kind ends. */
export type CommandAnswer = "refused" | "allowed" | "cancelled";

/** Every command answer, for content validation to check a cell against. */
export const COMMAND_ANSWERS: readonly CommandAnswer[] = [
  "refused",
  "allowed",
  "cancelled",
];

/** What the cast point column answers: a cast under way ends at no cost, or carries on. */
export type CastPointAnswer = "cancelled" | "continues";

/** Every cast point answer, for content validation to check a cell against. */
export const CAST_POINT_ANSWERS: readonly CastPointAnswer[] = [
  "cancelled",
  "continues",
];

/** What a cursor column answers: the open cursor closes at no cost, or carries on. */
export type CursorAnswer = "closed" | "continues";

/** Every cursor answer, for content validation to check a cell against. */
export const CURSOR_ANSWERS: readonly CursorAnswer[] = ["closed", "continues"];

/** Any cell's answer. */
export type DisableAnswer = CommandAnswer | CastPointAnswer | CursorAnswer;

/** The disables a refusal names: the flag the validator reports in the refused-command event. */
export type DisableReason = "stunned" | "silenced" | "rooted" | "disarmed";

/** Every disable reason, for content validation to check a row against. */
export const DISABLE_REASONS: readonly DisableReason[] = [
  "stunned",
  "silenced",
  "rooted",
  "disarmed",
];

/**
 * One row's answer in every column: the six slot keys, the four orders, a cast already under
 * way, and the hero's two cursors.
 */
export type DisableCellsDef = Readonly<{
  q: CommandAnswer;
  w: CommandAnswer;
  e: CommandAnswer;
  r: CommandAnswer;
  d: CommandAnswer;
  f: CommandAnswer;
  move: CommandAnswer;
  attackTarget: CommandAnswer;
  attackMove: CommandAnswer;
  stop: CommandAnswer;
  castPoint: CastPointAnswer;
  targetingCursor: CursorAnswer;
  attackMoveCursor: CursorAnswer;
}>;

/** Every column of the matrix. */
export type DisableColumn = keyof DisableCellsDef;

/** The columns a command is validated against, the six keys and the four orders. */
export type CommandColumn = Exclude<
  DisableColumn,
  "castPoint" | "targetingCursor" | "attackMoveCursor"
>;

/** The two cursor columns. */
export type CursorColumn = "targetingCursor" | "attackMoveCursor";

/** The slot keys' columns, in slot order: slot 1 is `q`, slot 6 is `f`. */
export const SLOT_COLUMNS: readonly CommandColumn[] = [
  "q",
  "w",
  "e",
  "r",
  "d",
  "f",
];

/** The ten columns a command reads, the slot keys and then the orders. */
export const COMMAND_COLUMNS: readonly CommandColumn[] = [
  ...SLOT_COLUMNS,
  "move",
  "attackTarget",
  "attackMove",
  "stop",
];

/** Every column, in the order the matrix page writes them. */
export const DISABLE_COLUMNS: readonly DisableColumn[] = [
  ...COMMAND_COLUMNS,
  "castPoint",
  "targetingCursor",
  "attackMoveCursor",
];

/**
 * One row of the disable matrix: a group of statuses that answer alike. `statuses` names every
 * definition in the row, and every status sits in exactly one row. `flags` is every flag those
 * definitions raise. A unit wears the row while every flag in `wornBy` is raised on it, unless
 * it also wears a row worn by those flags and more, which covers it; a row whose `wornBy` is
 * empty blocks nothing and is never worn. `reason` is what a refusal by this row names, and is
 * `null` exactly when no key or order cell refuses.
 */
export type DisableRowDef = Readonly<{
  id: string;
  statuses: readonly string[];
  flags: readonly StatusFlag[];
  wornBy: readonly StatusFlag[];
  reason: DisableReason | null;
  cells: DisableCellsDef;
}>;

/**
 * Every status against every key, order, and cast state, one row per group of statuses. A unit
 * wearing two rows answers each cell with the stricter of the two, and a refusal names the
 * reason of the first row, in this order, that refuses.
 */
export type DisableMatrixDef = readonly DisableRowDef[];
