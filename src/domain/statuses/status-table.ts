import type { EntityId } from "@shared/public";
import type { StackRule } from "../definitions/status-def";
import type { StatusEntry } from "../entities/unit";

/**
 * What writing a status onto a table did: it took an empty row, it refreshed or stacked the
 * row the status already held, the definition's rule dropped it, or every row is taken. The
 * first three all leave the status on the table; the caller announces what changed.
 */
export type StatusWrite =
  "applied" | "refreshed" | "stacked" | "ignored" | "status_table_full";

/**
 * The end tick of a status that lasts as long as its holder: a whole number no tick reaches,
 * so every comparison against the tick stays plain arithmetic and the row goes with the
 * unit's death rather than an expiry.
 */
export const STATUS_NEVER_ENDS = Number.MAX_SAFE_INTEGER;

/** The stacks a row that has just landed carries. */
const FIRST_STACK = 1;

/** Writes the applier's numbers onto the row: how long it lasts, who applied it, and the levels every table on it is read at. */
const take = (
  entry: StatusEntry,
  endsAtTick: number,
  sourceId: EntityId | null,
  orbLevels: readonly number[],
): void => {
  entry.endsAtTick = Math.max(entry.endsAtTick, endsAtTick);
  entry.sourceId = sourceId;

  for (let orb = 0; orb < entry.orbLevels.length; orb += 1) {
    entry.orbLevels[orb] = orbLevels[orb] ?? 0;
  }
};

/**
 * Puts `statusId` onto `table` until `endsAtTick`, under the definition's `stack` rule. A
 * table that does not hold the status takes it on its first empty row. One that does is
 * answered by the rule: refresh keeps the one row, stack adds a stack to it, and ignore
 * changes nothing at all. Refresh and stack both take the later of the two end ticks, so the
 * longer remaining duration wins, and both take the new applier's source and orb levels,
 * since the new application's numbers are the ones it was made with.
 *
 * A hook's internal cooldown is the row's, not the application's: a row that takes the status
 * for the first time is ready to fire both hooks at once, and a refresh leaves the ready ticks
 * where they stand, so recasting a status never hands its hook back early.
 *
 * A pure function over the rows: it reads no world and announces nothing.
 */
export const writeStatus = (
  table: readonly StatusEntry[],
  statusId: string,
  stack: StackRule,
  endsAtTick: number,
  sourceId: EntityId | null,
  orbLevels: readonly number[],
): StatusWrite => {
  let empty: StatusEntry | null = null;

  for (let row = 0; row < table.length; row += 1) {
    const entry = table[row];

    if (entry === undefined) {
      continue;
    }

    if (entry.definitionId === statusId) {
      if (stack === "ignore") {
        return "ignored";
      }

      if (stack === "stack") {
        entry.stacks += FIRST_STACK;
        take(entry, endsAtTick, sourceId, orbLevels);

        return "stacked";
      }

      take(entry, endsAtTick, sourceId, orbLevels);

      return "refreshed";
    }

    if (empty === null && entry.definitionId === null) {
      empty = entry;
    }
  }

  if (empty === null) {
    return "status_table_full";
  }

  empty.definitionId = statusId;
  empty.endsAtTick = 0;
  empty.stacks = FIRST_STACK;
  empty.damageTakenReadyAtTick = 0;
  empty.damageDealtReadyAtTick = 0;
  take(empty, endsAtTick, sourceId, orbLevels);

  return "applied";
};

/**
 * Whether `table` holds `statusId` with ticks still to run at `tick`. A row whose end tick has
 * come reads as gone, whether or not the status pass has swept it yet, so a rule that asks
 * mid-tick gets the same answer the sweep will give.
 *
 * A pure function over the rows, as the write beside it is.
 */
export const holdsStatus = (
  table: readonly StatusEntry[],
  statusId: string,
  tick: number,
): boolean => {
  for (let row = 0; row < table.length; row += 1) {
    const entry = table[row];

    if (
      entry !== undefined &&
      entry.definitionId === statusId &&
      tick < entry.endsAtTick
    ) {
      return true;
    }
  }

  return false;
};
