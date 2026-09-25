import { describe, expect, it } from "vitest";
import type { DisplaceEffectDef, MapDef, Unit } from "@domain/public";
import { issueMove, runPrimitive } from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  makeCast,
  makeMapDef,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
} from "../../helpers";

/** The push every case below gives: a long distance at a speed that covers it in a third of a second, so ten ticks. */
const PUSH_SPEED = 1800;
const PUSH_TICKS = 10;
const DISTANCE = 600;

/** The lift every case below gives, long enough to tick through it and see the drop. */
const LIFT_SECONDS = 1;
const LIFT_TICKS = 30;

/** Where the wall stands: a slab across +X, well short of where the push would otherwise end. */
const WALL_X = 500;

/** The area both displacements below cover, around the hero and ahead of it. */
const AREA = { kind: "circle", radius: 400 } as const;

/** A push away from the hero, applying `knockback` for its ticks. */
const pushEntry: DisplaceEffectDef = {
  kind: "displace",
  mode: "push",
  target: AREA,
  statusId: "knockback",
  direction: "facing",
  distance: { orb: "quartz", byLevel: [DISTANCE] },
  speed: PUSH_SPEED,
};

/** A lift, applying the generic `lift` status. */
const liftEntry: DisplaceEffectDef = {
  kind: "displace",
  mode: "lift",
  target: AREA,
  statusId: "lift",
  seconds: { orb: "quartz", byLevel: [LIFT_SECONDS] },
};

/** The same lift, aimed at the cast's own target, which is how the hero is lifted. */
const liftAtTarget: DisplaceEffectDef = {
  kind: "displace",
  mode: "lift",
  target: { kind: "target" },
  statusId: "lift",
  seconds: { orb: "quartz", byLevel: [LIFT_SECONDS] },
};

/** A map with a wall standing across the push's way. */
const walled = (): MapDef =>
  makeMapDef.build({
    obstacles: [{ minX: WALL_X, minY: -2000, maxX: WALL_X + 200, maxY: 2000 }],
  });

type Arranged = { world: Simulation; enemy: Unit };

/** The hero at the origin facing +X, with one enemy just in front of it. */
const arrange = (map: MapDef = makeMapDef.build()): Arranged => {
  const world = makeWorld({ seed: 1, map });

  spawnHero(world);

  const enemy = spawnUnit(world, { x: 100, y: 0 });

  return { world, enemy };
};

/** The live hero of the world, which is the caster every case here casts as. */
const heroOf = (world: Simulation): Unit => {
  const hero = world.state.map.units.resolve(world.state.run.heroId ?? 0);

  if (hero === null) {
    throw new Error("The fixture spawns the hero");
  }

  return hero;
};

/** Sends `unit` walking along +X, far past anything in this spec. */
const walk = (unit: Unit): void => {
  const result = issueMove(unit, 4000, 0);

  if (result !== "ok") {
    throw new Error(`A live unit takes a move order: ${result}`);
  }
};

describe("a push through the movement step", () => {
  it("carries the unit its whole distance over its ticks", () => {
    const { world, enemy } = arrange();

    runPrimitive(world.state, makeCast(world), pushEntry);

    for (let tick = 0; tick < PUSH_TICKS; tick += 1) {
      world.tick();
    }

    expect(enemy.curr.x).toBeCloseTo(100 + DISTANCE);
    expect(enemy.push.ticksLeft).toBe(0);
  });

  it("stops at the edge of a wall it is pushed into and stays there", () => {
    const { world, enemy } = arrange(walled());

    runPrimitive(world.state, makeCast(world), pushEntry);
    tickUntil(world, () => enemy.push.ticksLeft === 0, PUSH_TICKS + 1);

    const rest = enemy.curr.x;

    expect(rest).toBeCloseTo(WALL_X - enemy.collisionRadius);

    world.tick();

    expect(enemy.curr.x).toBeCloseTo(rest);
  });

  it("keeps the order it was walking and walks it again once it is let go", () => {
    const { world, enemy } = arrange();
    walk(enemy);
    world.tick();

    runPrimitive(world.state, makeCast(world), pushEntry);
    world.tick();

    expect(enemy.disables.displaced).toBe(true);
    expect(enemy.order.kind).toBe("move");

    tickUntil(world, () => !enemy.disables.displaced, PUSH_TICKS + 2);

    const carried = enemy.curr.x;

    world.tick();

    expect(enemy.order.kind).toBe("move");
    expect(enemy.curr.x).toBeGreaterThan(carried);
  });
  it("does not walk the unit on the tick a push lands, before its status has raised the flag", () => {
    const { world, enemy } = arrange();
    walk(enemy);
    tickUntil(world, () => enemy.state === "moving", PUSH_TICKS);

    const before = enemy.curr.x;

    enemy.push.step.x = -5;
    enemy.push.step.y = 0;
    enemy.push.ticksLeft = 2;
    world.tick();

    expect(enemy.disables.displaced).toBe(false);
    expect(enemy.curr.x).toBeCloseTo(before - 5, 6);
    expect(enemy.order.kind).toBe("move");

    world.tick();
    world.tick();

    expect(enemy.curr.x).toBeGreaterThan(before - 10);
  });
});

describe("a lift through the status pass", () => {
  it("takes the order off the unit while it holds it", () => {
    const { world, enemy } = arrange();
    walk(enemy);
    world.tick();

    runPrimitive(world.state, makeCast(world), liftEntry);
    world.tick();

    expect(enemy.disables.lifted).toBe(true);
    expect(enemy.order.kind).toBe("none");
    expect(enemy.suspended.kind).toBe("move");
  });

  it("holds the unit where it was raised", () => {
    const { world, enemy } = arrange();
    walk(enemy);
    world.tick();

    runPrimitive(world.state, makeCast(world), liftEntry);
    world.tick();

    const raised = enemy.curr.x;

    world.tick();

    expect(enemy.curr.x).toBe(raised);
  });

  it("gives the order back on the tick it ends, from where the unit was dropped", () => {
    const { world, enemy } = arrange();
    walk(enemy);
    world.tick();

    runPrimitive(world.state, makeCast(world), liftEntry);
    world.tick();

    const raised = enemy.curr.x;

    tickUntil(world, () => !enemy.disables.lifted, LIFT_TICKS + 2);

    expect(enemy.order.kind).toBe("move");
    expect(enemy.suspended.kind).toBe("none");
    expect(enemy.curr.x).toBeGreaterThan(raised);
  });

  it("leaves nothing to give back when the unit dies in the air", () => {
    const { world } = arrange();
    const hero = heroOf(world);
    walk(hero);
    world.tick();

    runPrimitive(
      world.state,
      makeCast(world, { targetId: world.state.run.heroId ?? 0 }),
      liftAtTarget,
    );
    world.tick();

    expect(hero.suspended.kind).toBe("move");

    submit(world, {
      kind: "apply_damage",
      tick: world.view.tick,
      timestamp: world.view.tick,
      amount: hero.stats.maxHealth,
      damageType: "pure",
    });
    world.tick();

    expect(hero.state).toBe("dead");
    expect(hero.suspended.kind).toBe("none");
  });
});
