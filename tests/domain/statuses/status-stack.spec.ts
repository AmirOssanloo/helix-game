import { describe, expect, it } from "vitest";
import type { StackRule, StatusEntry } from "@domain/public";
import { createUnitPool, STATUS_TABLE_SIZE, writeStatus } from "@domain/public";

/** The tick every first application in this spec ends on, and the later one a second gives. */
const FIRST_END = 10;
const LATER_END = 40;

/** The three orb levels an applier carries, and a second applier's, so a refresh is seen to take the new ones. */
const FIRST_LEVELS: readonly number[] = [1, 2, 3];
const SECOND_LEVELS: readonly number[] = [4, 5, 6];

/** The units that applied each of the two applications. */
const FIRST_SOURCE = 11;
const SECOND_SOURCE = 22;

/** An empty status table of the fixed size, as a fresh unit wears it. */
const table = (): readonly StatusEntry[] => {
  const unit = createUnitPool().acquire();

  if (unit === null) {
    throw new Error("The first acquire succeeds on a fresh pool");
  }

  return unit.statuses;
};

/** The rows of `rows` that hold something. */
const live = (rows: readonly StatusEntry[]): readonly StatusEntry[] =>
  rows.filter((row) => row.definitionId !== null);

/** A first application of `id` under `rule`, and the table it wrote onto. */
const held = (
  id: string,
  rule: StackRule,
): { rows: readonly StatusEntry[]; rule: StackRule } => {
  const rows = table();

  writeStatus(rows, id, rule, FIRST_END, FIRST_SOURCE, FIRST_LEVELS);

  return { rows, rule };
};

describe("writeStatus onto a table that does not hold the status", () => {
  it.each(["refresh", "stack", "ignore"] as const)(
    "takes the first empty row under the %s rule",
    (rule) => {
      const rows = table();

      expect(
        writeStatus(rows, "burn", rule, FIRST_END, FIRST_SOURCE, FIRST_LEVELS),
      ).toBe("applied");
      expect(rows[0]).toEqual({
        definitionId: "burn",
        endsAtTick: FIRST_END,
        stacks: 1,
        sourceId: FIRST_SOURCE,
        orbLevels: [...FIRST_LEVELS],
      });
    },
  );

  it("takes one row per status, in table order", () => {
    const rows = table();

    writeStatus(rows, "burn", "refresh", FIRST_END, null, FIRST_LEVELS);
    writeStatus(rows, "slow", "refresh", FIRST_END, null, FIRST_LEVELS);

    expect(live(rows).map((row) => row.definitionId)).toEqual(["burn", "slow"]);
  });

  it("refuses with a reason when every row is taken", () => {
    const rows = table();

    for (let row = 0; row < STATUS_TABLE_SIZE; row += 1) {
      writeStatus(rows, `status_${row}`, "refresh", FIRST_END, null, []);
    }

    expect(
      writeStatus(rows, "burn", "refresh", FIRST_END, null, FIRST_LEVELS),
    ).toBe("status_table_full");
    expect(live(rows)).toHaveLength(STATUS_TABLE_SIZE);
  });
});

describe("writeStatus under the refresh rule", () => {
  it("keeps one row and takes the later end", () => {
    const { rows } = held("stun", "refresh");

    expect(
      writeStatus(
        rows,
        "stun",
        "refresh",
        LATER_END,
        SECOND_SOURCE,
        SECOND_LEVELS,
      ),
    ).toBe("refreshed");
    expect(live(rows)).toHaveLength(1);
    expect(rows[0]?.endsAtTick).toBe(LATER_END);
    expect(rows[0]?.stacks).toBe(1);
  });

  it("keeps the longer remaining duration when the second ends sooner", () => {
    const { rows } = held("stun", "refresh");

    writeStatus(rows, "stun", "refresh", FIRST_END - 1, null, FIRST_LEVELS);

    expect(rows[0]?.endsAtTick).toBe(FIRST_END);
  });

  it("takes the new applier's source and orb levels", () => {
    const { rows } = held("stun", "refresh");

    writeStatus(
      rows,
      "stun",
      "refresh",
      LATER_END,
      SECOND_SOURCE,
      SECOND_LEVELS,
    );

    expect(rows[0]?.sourceId).toBe(SECOND_SOURCE);
    expect(rows[0]?.orbLevels).toEqual([...SECOND_LEVELS]);
  });
});

describe("writeStatus under the stack rule", () => {
  it("adds a stack to the one row and takes the later end", () => {
    const { rows } = held("burn", "stack");

    expect(
      writeStatus(
        rows,
        "burn",
        "stack",
        LATER_END,
        SECOND_SOURCE,
        FIRST_LEVELS,
      ),
    ).toBe("stacked");
    expect(live(rows)).toHaveLength(1);
    expect(rows[0]?.stacks).toBe(2);
    expect(rows[0]?.endsAtTick).toBe(LATER_END);
  });

  it("counts every application", () => {
    const { rows } = held("burn", "stack");

    writeStatus(rows, "burn", "stack", LATER_END, null, FIRST_LEVELS);
    writeStatus(rows, "burn", "stack", LATER_END, null, FIRST_LEVELS);

    expect(rows[0]?.stacks).toBe(3);
  });
});

describe("writeStatus under the ignore rule", () => {
  it("drops the application and changes nothing", () => {
    const { rows } = held("lift", "ignore");

    expect(
      writeStatus(
        rows,
        "lift",
        "ignore",
        LATER_END,
        SECOND_SOURCE,
        SECOND_LEVELS,
      ),
    ).toBe("ignored");
    expect(rows[0]).toEqual({
      definitionId: "lift",
      endsAtTick: FIRST_END,
      stacks: 1,
      sourceId: FIRST_SOURCE,
      orbLevels: [...FIRST_LEVELS],
    });
  });
});
