import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { EffectDef, Unit } from "@domain/public";
import { holdsStatus, releaseUnit, runEffects } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeCast, makeWorld, spawnUnit, unitIdOf } from "../../../helpers";

/** The effect under test, by the key the registry holds it under, and the status content registers for it. */
const CHARGE_TO = "charge_to";
const CHARGE = "charge";

/** How far the fixture's entry carries the caster at most, and how fast, in units a second. */
const DISTANCE = 600;
const SPEED = 1200;

/** The ticks a charge of `distance` at the fixture's speed takes under the content's tick rate. */
const ticksFor = (distance: number): number =>
  Math.round((distance / SPEED) * tuningTable.sim_hz);

/** One entry naming the effect, carrying `byLevel` at the entry's speed. */
const entry = (
  byLevel: readonly number[] = [DISTANCE],
  speed: number = SPEED,
): EffectDef => ({
  kind: "named",
  key: CHARGE_TO,
  fields: {
    distance: { orb: "quartz", byLevel },
    speed,
    statusId: CHARGE,
  },
});

type Arranged = Readonly<{
  world: Simulation;
  caster: Unit;
  casterId: EntityId;
  target: Unit;
  targetId: EntityId;
}>;

/** A caster at the origin and a target on the positive x axis `gap` from edge to edge, bound radius to bound radius. */
const arrange = (gap: number): Arranged => {
  const world = makeWorld({ seed: 1 });
  const caster = spawnUnit(world, { x: 0, y: 0 });
  const target = spawnUnit(world, { kind: "hero", x: 0, y: 0 });

  target.curr.x = gap + caster.boundRadius + target.boundRadius;

  return {
    world,
    caster,
    casterId: unitIdOf(world, caster),
    target,
    targetId: unitIdOf(world, target),
  };
};

/** Runs `effects` as `casterId`'s cast at `targetId`, anchored where that target stands, at `orbLevels`. */
const charge = (
  { world, casterId, target, targetId }: Arranged,
  effects: readonly EffectDef[] = [entry()],
  orbLevels: readonly number[] = [],
): void => {
  runEffects(
    world.state,
    makeCast(world, {
      casterId,
      targetId,
      x: target.curr.x,
      y: target.curr.y,
      orbLevels,
    }),
    effects,
  );
};

const holdsCharge = (world: Simulation, unit: Readonly<Unit>): boolean =>
  holdsStatus(unit.statuses, CHARGE, world.state.tick);

describe("charge_to", () => {
  it("carries the caster its whole distance toward a target further than that, in even steps over the ticks the travel takes", () => {
    const arranged = arrange(DISTANCE + 400);
    const { caster } = arranged;
    const ticks = ticksFor(DISTANCE);

    charge(arranged);

    expect(caster.push.ticksLeft).toBe(ticks);
    expect(caster.push.step.x * ticks).toBeCloseTo(DISTANCE, 6);
    expect(caster.push.step.y).toBeCloseTo(0, 6);
  });

  it("stops at the target's edge when the target is nearer than the distance", () => {
    const gap = 250;
    const arranged = arrange(gap);
    const { caster } = arranged;
    const ticks = ticksFor(gap);

    charge(arranged);

    expect(caster.push.ticksLeft).toBe(ticks);
    expect(caster.push.step.x * ticks).toBeCloseTo(gap, 6);
  });

  it("puts its status on the caster, from the caster, for the ticks the travel takes", () => {
    const arranged = arrange(DISTANCE);
    const { world, caster, casterId } = arranged;

    charge(arranged);

    const row = caster.statuses.find((entry) => entry.definitionId === CHARGE);

    expect(row?.sourceId).toBe(casterId);
    expect(row?.endsAtTick).toBe(world.state.tick + ticksFor(DISTANCE));
  });

  it("leaves the target where it stands", () => {
    const arranged = arrange(DISTANCE);
    const { world, target } = arranged;
    const x = target.curr.x;

    charge(arranged);

    expect(target.push.ticksLeft).toBe(0);
    expect(target.curr.x).toBe(x);
    expect(holdsCharge(world, target)).toBe(false);
  });

  it("reads its distance at the levels the cast committed with", () => {
    const arranged = arrange(DISTANCE + 400);
    const { caster } = arranged;

    charge(arranged, [entry([100, 200, 300, 400])], [3, 1, 1]);

    expect(caster.push.step.x * caster.push.ticksLeft).toBeCloseTo(300, 6);
  });

  it("charges at the anchor when the cast is aimed at no unit", () => {
    const arranged = arrange(DISTANCE);
    const { world, caster, casterId } = arranged;

    runEffects(
      world.state,
      makeCast(world, { casterId, targetId: null, x: 0, y: -200 }),
      [entry()],
    );

    expect(caster.push.step.x).toBeCloseTo(0, 6);
    expect(caster.push.step.y * caster.push.ticksLeft).toBeCloseTo(-200, 6);
  });

  it("moves nobody when the gap is already closed, the target is gone, the speed is none, or a push already has hold of the caster", () => {
    const closed = arrange(0);

    charge(closed);

    expect(closed.caster.push.ticksLeft).toBe(0);
    expect(holdsCharge(closed.world, closed.caster)).toBe(false);

    const gone = arrange(DISTANCE);

    releaseUnit(gone.world.state, gone.targetId);
    charge(gone);

    expect(gone.caster.push.ticksLeft).toBe(0);

    const still = arrange(DISTANCE);

    charge(still, [entry([DISTANCE], 0)]);

    expect(still.caster.push.ticksLeft).toBe(0);

    const pushed = arrange(DISTANCE);

    pushed.caster.push.ticksLeft = 3;
    pushed.caster.push.step.x = -1;
    charge(pushed);

    expect(pushed.caster.push.ticksLeft).toBe(3);
    expect(pushed.caster.push.step.x).toBe(-1);
    expect(holdsCharge(pushed.world, pushed.caster)).toBe(false);
  });
});
