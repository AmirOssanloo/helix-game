import { describe, expect, it } from "vitest";
import type {
  DamageAreaEffectDef,
  DisplaceEffectDef,
  EffectTargetDef,
  PushDirection,
  Unit,
} from "@domain/public";
import { runPrimitive, statusSystem } from "@domain/public";
import type { Simulation } from "@simulation/public";
import { makeCast, makeWorld, spawnHero, spawnUnit } from "../../../helpers";

/** The step rate the world runs at, which is what a duration in seconds becomes ticks under. */
const TICKS_PER_SECOND = 30;

/** The push every case below gives: a round distance at a speed that covers it in a third of a second, so ten ticks. */
const PUSH_SPEED = 900;
const PUSH_TICKS = 10;
const DISTANCE = 300;

/** The cone the two enemies stand in, wide and long enough to hold both. */
const CONE: EffectTargetDef = { kind: "cone", angleDegrees: 90, length: 600 };

type Arranged = { world: Simulation; ahead: Unit; aside: Unit };

/** The hero at the origin facing +X, one enemy straight ahead of it and one off to one side. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world);

  const ahead = spawnUnit(world, { x: 300, y: 0 });
  const aside = spawnUnit(world, { x: 300, y: 300 });

  return { world, ahead, aside };
};

/** A push of `distance` at `speed`, along the facing, applying `knockback` for its ticks. */
const travelEntry = (distance: number, speed: number): DisplaceEffectDef => ({
  kind: "displace",
  mode: "push",
  target: CONE,
  statusId: "knockback",
  direction: "facing",
  distance: { orb: "quartz", byLevel: [distance] },
  speed,
});

/** A push of `DISTANCE` at `PUSH_SPEED`, applying `knockback` for the same ticks. */
const pushEntry = (direction: PushDirection): DisplaceEffectDef => ({
  kind: "displace",
  mode: "push",
  target: CONE,
  statusId: "knockback",
  direction,
  distance: { orb: "quartz", byLevel: [DISTANCE] },
  speed: PUSH_SPEED,
});

/** A lift of one second, applying the generic `lift` status. */
const liftEntry: DisplaceEffectDef = {
  kind: "displace",
  mode: "lift",
  target: CONE,
  statusId: "lift",
  seconds: { orb: "quartz", byLevel: [1] },
};

/** The row `statusId` holds on the unit, or `null` when it holds none. */
const rowOf = (unit: Unit, statusId: string): Unit["statuses"][number] | null =>
  unit.statuses.find((row) => row.definitionId === statusId) ?? null;

describe("the displace primitive pushing", () => {
  it("takes hold of every unit the shape covers for the ticks its distance takes at its speed", () => {
    const { world, ahead, aside } = arrange();

    runPrimitive(world.state, makeCast(world), pushEntry("away"));

    expect(ahead.push.ticksLeft).toBe(PUSH_TICKS);
    expect(aside.push.ticksLeft).toBe(PUSH_TICKS);
  });

  it("applies the status it names for the same ticks", () => {
    const { world, ahead } = arrange();

    runPrimitive(world.state, makeCast(world), pushEntry("away"));
    statusSystem(world.state);

    expect(rowOf(ahead, "knockback")?.endsAtTick).toBe(PUSH_TICKS);
    expect(ahead.disables.displaced).toBe(true);
  });

  it("divides its distance evenly over the ticks, away from the anchor", () => {
    const { world, aside } = arrange();

    runPrimitive(world.state, makeCast(world), pushEntry("away"));

    const step = Math.hypot(aside.push.step.x, aside.push.step.y);

    expect(step).toBeCloseTo(DISTANCE / PUSH_TICKS);
    expect(aside.push.step.x).toBeCloseTo(aside.push.step.y);
  });

  it("sends every unit along the cast's facing instead when the entry says so", () => {
    const { world, aside } = arrange();

    runPrimitive(world.state, makeCast(world), pushEntry("facing"));

    expect(aside.push.step.x).toBeCloseTo(DISTANCE / PUSH_TICKS);
    expect(aside.push.step.y).toBeCloseTo(0);
  });

  it("reads its distance table at the levels the cast snapshotted, and lasts as long as that distance takes", () => {
    const { world, ahead } = arrange();
    const scaling: DisplaceEffectDef = {
      kind: "displace",
      mode: "push",
      target: CONE,
      statusId: "knockback",
      direction: "facing",
      distance: { orb: "whorl", byLevel: [100, 200, 900] },
      speed: PUSH_SPEED,
    };

    runPrimitive(
      world.state,
      makeCast(world, { orbLevels: [1, 3, 1] }),
      scaling,
    );

    expect(ahead.push.ticksLeft).toBe(TICKS_PER_SECOND);
    expect(ahead.push.step.x).toBeCloseTo(PUSH_SPEED / TICKS_PER_SECOND);
  });

  it("moves at its speed a tick whatever the distance, the ticks following from the distance", () => {
    const short = arrange();
    const long = arrange();

    runPrimitive(
      short.world.state,
      makeCast(short.world),
      travelEntry(100, 300),
    );
    runPrimitive(long.world.state, makeCast(long.world), travelEntry(400, 300));

    expect(short.ahead.push.ticksLeft).toBe(10);
    expect(long.ahead.push.ticksLeft).toBe(40);
    expect(short.ahead.push.step.x).toBeCloseTo(10);
    expect(long.ahead.push.step.x).toBeCloseTo(10);
  });

  it("rounds a travel to whole ticks and covers the distance exactly over them", () => {
    const { world, ahead } = arrange();

    runPrimitive(world.state, makeCast(world), travelEntry(110, 300));

    expect(ahead.push.ticksLeft).toBe(11);
    expect(ahead.push.step.x * ahead.push.ticksLeft).toBeCloseTo(110);
  });

  it("takes at least one tick over a distance shorter than a tick's travel", () => {
    const { world, ahead } = arrange();

    runPrimitive(world.state, makeCast(world), travelEntry(2, 300));

    expect(ahead.push.ticksLeft).toBe(1);
    expect(ahead.push.step.x).toBeCloseTo(2);
  });

  it("moves nobody and applies nothing with no speed or no distance", () => {
    const stalled = arrange();
    const nowhere = arrange();

    runPrimitive(
      stalled.world.state,
      makeCast(stalled.world),
      travelEntry(300, 0),
    );
    runPrimitive(
      nowhere.world.state,
      makeCast(nowhere.world),
      travelEntry(0, 300),
    );
    statusSystem(stalled.world.state);
    statusSystem(nowhere.world.state);

    expect(stalled.ahead.push.ticksLeft).toBe(0);
    expect(nowhere.ahead.push.ticksLeft).toBe(0);
    expect(rowOf(stalled.ahead, "knockback")).toBeNull();
    expect(rowOf(nowhere.ahead, "knockback")).toBeNull();
  });

  it("is ignored by a unit a push already has hold of", () => {
    const { world, ahead } = arrange();

    runPrimitive(world.state, makeCast(world), pushEntry("facing"));

    const step = ahead.push.step.x;

    ahead.push.ticksLeft = 1;
    runPrimitive(world.state, makeCast(world), pushEntry("away"));

    expect(ahead.push.ticksLeft).toBe(1);
    expect(ahead.push.step.x).toBe(step);
  });
});

describe("the displace primitive lifting", () => {
  it("puts its status on every unit the shape covers for the ticks its table gives", () => {
    const { world, ahead, aside } = arrange();

    runPrimitive(world.state, makeCast(world), liftEntry);

    expect(rowOf(ahead, "lift")?.endsAtTick).toBe(TICKS_PER_SECOND);
    expect(rowOf(aside, "lift")).not.toBeNull();
  });

  it("moves nobody itself: a lift is the status and nothing else", () => {
    const { world, ahead } = arrange();

    runPrimitive(world.state, makeCast(world), liftEntry);

    expect(ahead.push.ticksLeft).toBe(0);
    expect(ahead.curr.x).toBe(300);
  });

  it("puts a lifted unit out of reach of an area", () => {
    const { world, ahead } = arrange();
    const damage: DamageAreaEffectDef = {
      kind: "damage_area",
      target: CONE,
      damageType: "pure",
      amount: { orb: "quartz", byLevel: [50] },
      rate: "once",
      split: false,
    };

    runPrimitive(world.state, makeCast(world), liftEntry);
    statusSystem(world.state);

    const health = ahead.resources.health;

    runPrimitive(world.state, makeCast(world), damage);

    expect(ahead.disables.untargetable).toBe(true);
    expect(ahead.resources.health).toBe(health);
  });
});
