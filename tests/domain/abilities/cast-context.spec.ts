import { describe, expect, it } from "vitest";
import type { AbilityDef } from "@domain/public";
import { createCastRecord, fillCast } from "@domain/public";
import { makeSpellDef } from "../../helpers";

const ability: AbilityDef = makeSpellDef.build({});

describe("the context an effect runs with", () => {
  it("carries the caster, the ability, the anchor, the facing, and the target", () => {
    const context = fillCast(
      createCastRecord(),
      7,
      ability,
      [1, 2, 3],
      300,
      -40,
      1.5,
      9,
    );

    expect(context.casterId).toBe(7);
    expect(context.ability).toBe(ability);
    expect(context.anchor).toEqual({ x: 300, y: -40 });
    expect(context.facing).toBe(1.5);
    expect(context.targetId).toBe(9);
  });

  it("snapshots the orb levels, so one raised after the commit changes nothing", () => {
    const levels = [1, 2, 3];
    const context = fillCast(
      createCastRecord(),
      1,
      ability,
      levels,
      0,
      0,
      0,
      null,
    );

    levels[0] = 7;

    expect(context.orbLevels).toEqual([1, 2, 3]);
  });

  it("reads a level of zero for an orb the caster does not level", () => {
    const context = fillCast(createCastRecord(), 1, ability, [], 0, 0, 0, null);

    expect(context.orbLevels).toEqual([0, 0, 0]);
  });

  it("runs from no zone, whatever the record held before", () => {
    const record = createCastRecord();
    record.zoneId = 4;

    expect(fillCast(record, 1, ability, [], 0, 0, 0, null).zoneId).toBeNull();
  });

  it("is reused: a second fill overwrites the first", () => {
    const record = createCastRecord();
    const first = fillCast(record, 1, ability, [1, 1, 1], 10, 10, 0, 2);
    const second = fillCast(record, 3, ability, [4, 4, 4], 20, 20, 1, null);

    expect(first).toBe(second);
    expect(second.casterId).toBe(3);
    expect(second.anchor).toEqual({ x: 20, y: 20 });
    expect(second.targetId).toBeNull();
  });
});
