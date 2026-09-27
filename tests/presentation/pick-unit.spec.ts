import { describe, expect, it } from "vitest";
import type { Unit } from "@domain/public";
import { createCandidateBuffer, UNIT_CAPACITY } from "@domain/queries";
import { pickUnit } from "@presentation/public";
import type { Simulation } from "@simulation/testing";
import { makeWorld, spawnUnit, unitIdOf } from "../helpers";

/** Where the unit stood last tick and where it stands this one: a stride along x. */
const FROM_X = 1000;
const TO_X = 1040;
const Y = 800;

/** How wide the unit's selection disc is: narrower than half its stride, so the two ends of the stride do not overlap. */
const SELECTION_RADIUS = 16;

/** Halfway between the two ticks. */
const HALF_WAY = 0.5;

type Arranged = {
  world: Simulation;
  unit: Unit;
};

/** A world with one unit caught mid-stride: in the hash at where it stands this tick, drawn anywhere between there and last tick's. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });
  const unit = spawnUnit(world, { x: TO_X, y: Y });

  unit.prev.x = FROM_X;
  unit.prev.y = Y;
  unit.selectionRadius = SELECTION_RADIUS;

  return { world, unit };
};

const candidates = createCandidateBuffer(UNIT_CAPACITY);

describe("picking a unit under the pointer", () => {
  it("picks a moving unit where it is drawn between ticks, not where the tick left it", () => {
    const { world, unit } = arrange();
    const drawnX = FROM_X + (TO_X - FROM_X) * HALF_WAY;

    expect(pickUnit(world.view, drawnX, Y, HALF_WAY, candidates)).toBe(
      unitIdOf(world, unit),
    );
    expect(pickUnit(world.view, TO_X, Y, HALF_WAY, candidates)).toBeNull();
  });

  it("follows the drawn position through the frame: last tick's place at the start, this tick's at the end", () => {
    const { world, unit } = arrange();
    const id = unitIdOf(world, unit);

    expect(pickUnit(world.view, FROM_X, Y, 0, candidates)).toBe(id);
    expect(pickUnit(world.view, TO_X, Y, 0, candidates)).toBeNull();
    expect(pickUnit(world.view, TO_X, Y, 1, candidates)).toBe(id);
    expect(pickUnit(world.view, FROM_X, Y, 1, candidates)).toBeNull();
  });

  it("picks nothing past the drawn selection disc", () => {
    const { world } = arrange();

    expect(
      pickUnit(world.view, FROM_X, Y + SELECTION_RADIUS + 1, 0, candidates),
    ).toBeNull();
  });
});
