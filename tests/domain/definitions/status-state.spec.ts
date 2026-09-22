import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import { amountAtOrbLevel, createStatusTable } from "@domain/public";
import { makeStatusDef } from "../../helpers";

/** The orb level cap every table in this spec is written to. */
const LEVEL_CAP = 7;

/** A table that reads as its own level, so an entry names the level it was read at. */
const BY_LEVEL: readonly number[] = [1, 2, 3, 4, 5, 6, 7];

/** The rate a burn takes, in health per second. */
const PER_SECOND = 30;

/** The tuning the table is built under: the content table's, whose step rate divides a per-second rate. */
const tuning = new Map(Object.entries(tuningTable));

const slow = makeStatusDef.build({
  modifiers: [
    {
      stat: "movement_speed",
      kind: "percent",
      amount: { orb: "whorl", byLevel: BY_LEVEL },
    },
  ],
});

const burn = makeStatusDef.build({
  damageOverTime: {
    damageType: "magical",
    perSecond: { orb: "ember", byLevel: BY_LEVEL.map(() => PER_SECOND) },
  },
});

const table = createStatusTable([slow, burn], tuning);

describe("createStatusTable", () => {
  it("holds every status by id", () => {
    expect([...table.keys()]).toEqual([slow.id, burn.id]);
  });

  it("resolves the orb each table names to its index in orb order", () => {
    expect(table.get(slow.id)?.modifiers[0]?.orbIndex).toBe(1);
    expect(table.get(burn.id)?.damageOverTime?.orbIndex).toBe(2);
  });

  it("reads a per-second rate as health per tick", () => {
    expect(table.get(burn.id)?.damageOverTime?.byLevel[0]).toBeCloseTo(
      PER_SECOND / tuningTable.sim_hz,
    );
  });

  it("holds no damage record for a status that takes none", () => {
    expect(table.get(slow.id)?.damageOverTime).toBeNull();
  });
});

describe("amountAtOrbLevel", () => {
  const record = { orbIndex: 1, byLevel: BY_LEVEL };

  it.each([1, LEVEL_CAP])("reads the entry for level %i", (level) => {
    expect(amountAtOrbLevel(record, [0, level, 0])).toBe(level);
  });

  it("reads the first entry for an orb with no level", () => {
    expect(amountAtOrbLevel(record, [0, 0, 0])).toBe(1);
  });

  it("reads the first entry for a snapshot with no entry for the orb", () => {
    expect(amountAtOrbLevel(record, [])).toBe(1);
  });

  it("reads zero past the end of the table", () => {
    expect(amountAtOrbLevel(record, [0, LEVEL_CAP + 1, 0])).toBe(0);
  });
});
