import { describe, expect, it } from "vitest";
import type { ApplyStatusEffectDef, Unit } from "@domain/public";
import { runPrimitive } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeCast, makeWorld, spawnHero, spawnUnit } from "../../../helpers";

/** The step rate the world runs at, which is what a duration in seconds becomes ticks under. */
const TICKS_PER_SECOND = 30;

/** The duration every entry below gives, and the ticks it comes to. */
const SECONDS = 2;

type Arranged = { world: Simulation; hero: Unit; near: Unit; far: Unit };

/** The hero at the origin facing +X, one enemy close in front of it and one well beyond any shape. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });
  const hero = spawnHero(world);
  const near = spawnUnit(world, { x: 100, y: 0 });
  const far = spawnUnit(world, { x: 2000, y: 0 });

  return { world, hero, near, far };
};

/** An apply-status entry putting `slow` on whatever `target` collects. */
const entry = (
  target: ApplyStatusEffectDef["target"],
  seconds: ApplyStatusEffectDef["seconds"] = SECONDS,
): ApplyStatusEffectDef => ({
  kind: "apply_status",
  target,
  statusId: "slow",
  seconds,
});

/** The row `statusId` holds on the unit, or `null` when it holds none. */
const rowOf = (unit: Unit, statusId: string): Unit["statuses"][number] | null =>
  unit.statuses.find((row) => row.definitionId === statusId) ?? null;

/** The id of the unit at `index` in the pool. */
const idAt = (world: Simulation, index: number): EntityId => {
  const id = world.state.map.units.idAt(index);

  if (id === null) {
    throw new Error("The fixture fills the first slots of the pool");
  }

  return id;
};

describe("the apply-status primitive", () => {
  it("puts the status on every unit the shape covers, and on nobody else", () => {
    const { world, near, far } = arrange();

    runPrimitive(
      world.state,
      makeCast(world),
      entry({ kind: "circle", radius: 250 }),
    );

    expect(rowOf(near, "slow")).not.toBeNull();
    expect(rowOf(far, "slow")).toBeNull();
  });

  it("gives the duration the entry names, in ticks", () => {
    const { world, near } = arrange();

    runPrimitive(
      world.state,
      makeCast(world),
      entry({ kind: "circle", radius: 250 }),
    );

    expect(rowOf(near, "slow")?.endsAtTick).toBe(SECONDS * TICKS_PER_SECOND);
  });

  it("reads a duration table at the levels the cast snapshotted", () => {
    const { world, near } = arrange();

    runPrimitive(
      world.state,
      makeCast(world, { orbLevels: [1, 1, 3] }),
      entry(
        { kind: "circle", radius: 250 },
        {
          orb: "ember",
          byLevel: [1, 2, 4],
        },
      ),
    );

    expect(rowOf(near, "slow")?.endsAtTick).toBe(4 * TICKS_PER_SECOND);
  });

  it("credits the caster and writes its orb levels onto the row", () => {
    const { world, near } = arrange();

    runPrimitive(
      world.state,
      makeCast(world, { orbLevels: [2, 3, 4] }),
      entry({ kind: "circle", radius: 250 }),
    );

    expect(rowOf(near, "slow")?.sourceId).toBe(idAt(world, 0));
    expect(rowOf(near, "slow")?.orbLevels).toEqual([2, 3, 4]);
  });

  it("puts the status on the cast's own target, whichever side it is on", () => {
    const { world, hero } = arrange();

    runPrimitive(
      world.state,
      makeCast(world, { targetId: idAt(world, 0) }),
      entry({ kind: "target" }),
    );

    expect(rowOf(hero, "slow")).not.toBeNull();
  });

  it("leaves a unit on the caster's own side out of a shape", () => {
    const { world } = arrange();
    const summon = spawnUnit(world, { kind: "summon", x: 100, y: 50 });

    runPrimitive(
      world.state,
      makeCast(world),
      entry({ kind: "circle", radius: 250 }),
    );

    expect(rowOf(summon, "slow")).toBeNull();
  });
});
