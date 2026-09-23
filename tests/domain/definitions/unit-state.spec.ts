import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import { createTuningState, createUnitTable } from "@domain/public";
import { makeEnemyDef, makeSummonDef } from "../../helpers";

/** The tuning table at 30 Hz, in simulation units. */
const TUNING = createTuningState({ ...tuningTable, sim_hz: 30 });

const enemy = makeEnemyDef.build({
  movementSpeed: 240,
  turnRate: 0.5,
  healthRegen: 3,
});
const summon = makeSummonDef.build({ movementSpeed: 360, turnRate: 0.9 });

describe("createUnitTable", () => {
  const table = createUnitTable([enemy], [summon], TUNING);

  it("reads a definition's movement speed in units per tick", () => {
    expect(table.get(enemy.id)?.movementSpeedPerTick).toBeCloseTo(8);
    expect(table.get(summon.id)?.movementSpeedPerTick).toBeCloseTo(12);
  });

  it("reads a definition's turn rate in radians per tick, as the tuning table's is read", () => {
    expect(table.get(enemy.id)?.turnRatePerTick).toBeCloseTo(0.5 / 0.9);
    expect(table.get(summon.id)?.turnRatePerTick).toBeCloseTo(1);
    expect(
      createUnitTable(
        [makeEnemyDef.build({ turnRate: tuningTable.turn_rate_T })],
        [],
        TUNING,
      )
        .values()
        .next().value?.turnRatePerTick,
    ).toBeCloseTo(TUNING.get("turn_rate_T") ?? Number.NaN);
  });

  it("reads regeneration per tick beside them", () => {
    expect(table.get(enemy.id)?.healthRegenPerTick).toBeCloseTo(0.1);
  });
});
