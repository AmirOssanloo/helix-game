import { describe, expect, it } from "vitest";
import type {
  DamageAreaEffectDef,
  DisplaceEffectDef,
  MapDef,
  Unit,
} from "@domain/public";
import {
  applyStatus,
  issueMove,
  nearestEnemy,
  runPrimitive,
} from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeCast,
  makeMapDef,
  makeWorld,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** A push of a long distance at a speed that covers it in a third of a second, so ten ticks. */
const PUSH_SPEED = 1800;
const PUSH_TICKS = 10;
const DISTANCE = 600;

/** A shorter push, for the case that gives two in one tick and has to tell them apart. */
const SHORT_DISTANCE = 120;

/** A lift of a second, long enough to tick through and watch the drop. */
const LIFT_SECONDS = 1;
const LIFT_TICKS = 30;

/** A root that outlasts the lift, so it is still counting when the unit comes down. */
const ROOT_TICKS = LIFT_TICKS + 20;

/** Every orb at one, so every table and every expiry list reads its first entry. */
const LEVELS = [1, 1, 1];

/** Where the wall stands: a slab across +X, well short of where a push would otherwise end. */
const WALL_X = 500;

/** Where the unit every case displaces stands: just in front of the hero, which faces +X. */
const FRONT = { x: 100, y: 0 };

/** The area the displacements below cover, around the hero and the unit in front of it. */
const AREA = { kind: "circle", radius: 400 } as const;

/** A move far along +X, past anything in this spec. */
const FAR_X = 4000;

/** Long enough for any wait below. */
const PATIENCE = 120;

/** Hoarfrost, the one spell aimed at a unit, and the index of the kit's first prepared slot. */
const HOARFROST = "hoarfrost";
const FIRST_PREPARED = 0;

/** A push along the caster's facing, the distance `distance`, putting `knockback` on for its ticks. */
const pushOf = (distance: number): DisplaceEffectDef => ({
  kind: "displace",
  mode: "push",
  target: AREA,
  statusId: "knockback",
  direction: "facing",
  distance: { orb: "quartz", byLevel: [distance] },
  speed: PUSH_SPEED,
});

const push = pushOf(DISTANCE);

/** The same push aimed at the cast's own target, which is how a push reaches the hero. */
const pushTarget: DisplaceEffectDef = { ...push, target: { kind: "target" } };

/** A lift of every unit in the area, with `statusId` as its status. */
const liftOf = (statusId: string): DisplaceEffectDef => ({
  kind: "displace",
  mode: "lift",
  target: AREA,
  statusId,
  seconds: { orb: "quartz", byLevel: [LIFT_SECONDS] },
});

const lift = liftOf("lift");

/** A hit on everything in the area, big enough to see. */
const blast: DamageAreaEffectDef = {
  kind: "damage_area",
  target: AREA,
  damageType: "pure",
  amount: { orb: "quartz", byLevel: [10] },
  rate: "once",
  split: false,
};

/** A map with a wall standing across the pushes' way. */
const walled = (): MapDef =>
  makeMapDef.build({
    obstacles: [{ minX: WALL_X, minY: -2000, maxX: WALL_X + 200, maxY: 2000 }],
  });

type Arranged = { world: Simulation; hero: Unit; enemy: Unit };

/** The hero at the origin facing +X, with one enemy just in front of it. */
const arrange = (map: MapDef = makeMapDef.build()): Arranged => {
  const world = makeWorld({ seed: 1, map });
  const hero = spawnHero(world, { orbLevels: LEVELS });
  const enemy = spawnUnit(world, FRONT);

  return { world, hero, enemy };
};

/** Runs `entry` as the hero, from where it stands, facing where it faces. */
const cast = (
  world: Simulation,
  entry: DisplaceEffectDef | DamageAreaEffectDef,
  targetId: EntityId | null = null,
): void => {
  runPrimitive(
    world.state,
    makeCast(world, { orbLevels: LEVELS, targetId }),
    entry,
  );
};

/** Sends `unit` walking along +X. */
const walk = (unit: Unit): void => {
  const result = issueMove(unit, FAR_X, 0);

  if (result !== "ok") {
    throw new Error(`A live unit takes a move order: ${result}`);
  }
};

/** Puts `statusId` on `unit` for `ticks`, from nobody. */
const put = (
  world: Simulation,
  unit: Unit,
  statusId: string,
  ticks: number,
): void => {
  const result = applyStatus(
    world.state,
    unitIdOf(world, unit),
    statusId,
    ticks,
    null,
    LEVELS,
  );

  if (result !== "ok") {
    throw new Error(`The status lands: ${result}`);
  }
};

/** The tick `statusId` ends on for `unit`, or zero when it wears none. */
const endsAt = (unit: Readonly<Unit>, statusId: string): number =>
  unit.statuses.find((row) => row.definitionId === statusId)?.endsAtTick ?? 0;

/** Ticks `world` `count` times. */
const tickTimes = (world: Simulation, count: number): void => {
  for (let tick = 0; tick < count; tick += 1) {
    world.tick();
  }
};

/** Whether `unit`'s disc overlaps any obstacle of the map. */
const isInsideAnObstacle = (world: Simulation, unit: Readonly<Unit>): boolean =>
  world.state.map.obstacles.some(
    (rect) =>
      unit.curr.x + unit.collisionRadius > rect.minX + 1e-6 &&
      unit.curr.x - unit.collisionRadius < rect.maxX - 1e-6 &&
      unit.curr.y + unit.collisionRadius > rect.minY + 1e-6 &&
      unit.curr.y - unit.collisionRadius < rect.maxY - 1e-6,
  );

/** Every refusal reason the reader has not seen, advancing it past everything. */
const refusals = (world: Simulation, reader: EventReader): string[] => {
  const found: string[] = [];

  for (
    let event = world.events.read(reader);
    event !== null;
    event = world.events.read(reader)
  ) {
    if (event.kind === "command_refused" && event.reason !== null) {
      found.push(event.reason);
    }
  }

  return found;
};

describe("status effects: knockback and lift", () => {
  it("Knocked back into an obstacle: the displacement stops at the obstacle edge", () => {
    const { world, enemy } = arrange(walled());

    cast(world, push);

    for (let tick = 0; tick <= PUSH_TICKS; tick += 1) {
      world.tick();

      expect(isInsideAnObstacle(world, enemy)).toBe(false);
    }

    expect(enemy.push.ticksLeft).toBe(0);
    expect(enemy.curr.x).toBeCloseTo(WALL_X - enemy.collisionRadius);
  });

  it("Knockback: movement while displaced; the order is kept and walked again once let go", () => {
    const { world, enemy } = arrange();
    walk(enemy);
    world.tick();

    cast(world, push);
    world.tick();

    expect(enemy.disables.displaced).toBe(true);
    expect(enemy.order.kind).toBe("move");

    tickUntil(world, () => !enemy.disables.displaced, PATIENCE);

    const letGo = enemy.curr.x;

    world.tick();

    expect(enemy.order.kind).toBe("move");
    expect(enemy.curr.x).toBeGreaterThan(letGo);
  });

  it("Lifted with a move running: the move is put aside and taken up again where the unit lands", () => {
    const { world, enemy } = arrange();
    walk(enemy);
    world.tick();

    cast(world, lift);
    world.tick();

    const raised = enemy.curr.x;

    expect(enemy.order.kind).toBe("none");
    expect(enemy.suspended.kind).toBe("move");

    tickUntil(world, () => !enemy.disables.lifted, PATIENCE);

    expect(enemy.order.kind).toBe("move");
    expect(enemy.suspended.kind).toBe("none");

    world.tick();

    expect(enemy.curr.x).toBeGreaterThan(raised);
  });

  it("Rooted while lifted by Updraft: lift wins, the unit comes down where it was lifted from, and root keeps counting", () => {
    const { world, enemy } = arrange();
    put(world, enemy, "root", ROOT_TICKS);
    walk(enemy);
    world.tick();

    const rootEnds = endsAt(enemy, "root");
    const from = { x: enemy.curr.x, y: enemy.curr.y };

    cast(world, liftOf("updraft_lift"));
    world.tick();

    expect(enemy.disables.lifted).toBe(true);
    expect(enemy.disables.rooted).toBe(true);

    tickUntil(world, () => !enemy.disables.lifted, PATIENCE);

    expect(enemy.curr.x).toBe(from.x);
    expect(enemy.curr.y).toBe(from.y);
    expect(endsAt(enemy, "root")).toBe(rootEnds);
    expect(enemy.disables.rooted).toBe(true);

    tickUntil(world, () => !enemy.disables.rooted, PATIENCE);

    // The pass that ends the root runs on its end tick, and the view reads the tick after it.
    expect(world.view.tick).toBe(rootEnds + 1);
  });
});

describe("status effects and spells: a lifted unit cannot be hit, targeted, or acquired", () => {
  it("Lift: the unit cannot be hit by an area", () => {
    const { world, enemy } = arrange();

    cast(world, lift);
    world.tick();
    cast(world, blast);

    expect(enemy.resources.health).toBe(enemy.stats.maxHealth);
  });

  it("Status on a unit that becomes untargetable: new ones cannot land", () => {
    const { world, enemy } = arrange();

    cast(world, lift);
    world.tick();

    expect(
      applyStatus(
        world.state,
        unitIdOf(world, enemy),
        "slow",
        LIFT_TICKS,
        null,
        LEVELS,
      ),
    ).toBe("target_untargetable");
  });

  it("Lift: the unit cannot be acquired by an attack or a behaviour", () => {
    const { world, hero } = arrange();

    cast(world, lift);
    world.tick();

    expect(nearestEnemy(world.state, hero, AREA.radius)).toBeNull();
  });

  it("Lift: an attack ordered at the unit drops to idle and lands nothing", () => {
    const { world, hero, enemy } = arrange();

    cast(world, lift);
    world.tick();
    submit(world, {
      kind: "attack_target",
      tick: world.view.tick,
      timestamp: world.view.tick,
      targetId: unitIdOf(world, enemy),
    });
    tickTimes(world, LIFT_TICKS - 2);

    expect(hero.order.kind).toBe("none");
    expect(enemy.resources.health).toBe(enemy.stats.maxHealth);
  });

  it("Unit-target spell thrown at a lifted unit: refused, untargetable; nothing is spent", () => {
    const { world, hero, enemy } = arrange();
    const reader = createEventReader();
    const form = world.state.run.forms[0];

    if (form === undefined) {
      throw new Error("The hero has a form");
    }

    form.kit.prepared[FIRST_PREPARED] = HOARFROST;
    cast(world, lift);
    world.tick();
    refusals(world, reader);

    const mana = hero.resources.mana;

    submit(world, {
      kind: "cast",
      tick: world.view.tick,
      timestamp: world.view.tick,
      abilityId: HOARFROST,
      target: { kind: "unit", unitId: unitIdOf(world, enemy) },
    });
    world.tick();

    expect(refusals(world, reader)).toEqual(["target_untargetable"]);
    expect(hero.order.kind).toBe("none");
    expect(hero.resources.mana).toBe(mana);
  });

  it("Target lifted while the hero walks to it or during the cast point: the cast is cancelled at no cost", () => {
    const { world, hero, enemy } = arrange();
    const form = world.state.run.forms[0];

    if (form === undefined) {
      throw new Error("The hero has a form");
    }

    form.kit.prepared[FIRST_PREPARED] = HOARFROST;
    enemy.curr.x = 1400;
    enemy.prev.x = 1400;
    world.state.map.spatialHash.move(unitIdOf(world, enemy), enemy.curr);

    const mana = hero.resources.mana;

    submit(world, {
      kind: "cast",
      tick: world.view.tick,
      timestamp: world.view.tick,
      abilityId: HOARFROST,
      target: { kind: "unit", unitId: unitIdOf(world, enemy) },
    });
    world.tick();

    expect(hero.order.kind).toBe("cast");

    put(world, enemy, "lift", LIFT_TICKS);
    tickTimes(world, LIFT_TICKS - 2);

    expect(hero.order.kind).toBe("none");
    expect(hero.resources.mana).toBe(mana);
    expect(endsAt(enemy, HOARFROST)).toBe(0);
  });
});

describe("map and camera", () => {
  it("Hero pushed into a wall by knockback: the displacement stops at the wall edge; the hero is never inside an obstacle", () => {
    const world = makeWorld({ seed: 1, map: walled() });
    const hero = spawnHero(world, { orbLevels: LEVELS });

    cast(world, pushTarget, unitIdOf(world, hero));

    for (let tick = 0; tick <= PUSH_TICKS; tick += 1) {
      world.tick();

      expect(isInsideAnObstacle(world, hero)).toBe(false);
    }

    expect(hero.push.ticksLeft).toBe(0);
    expect(hero.curr.x).toBeCloseTo(WALL_X - hero.collisionRadius);
  });
});

describe("status effects: displacement among units", () => {
  it("Pushed into another unit: both are pushed apart by the collision rule, half the overlap each", () => {
    const { world, enemy } = arrange();
    const standing = spawnUnit(world, { x: 300, y: 0 });
    const stoodAt = standing.curr.x;

    cast(world, push);
    tickUntil(world, () => enemy.push.ticksLeft === 0, PATIENCE);
    world.tick();

    const gap = standing.curr.x - enemy.curr.x;

    expect(standing.curr.x).toBeGreaterThan(stoodAt);
    expect(standing.order.kind).toBe("none");
    expect(gap).toBeGreaterThanOrEqual(
      enemy.collisionRadius + standing.collisionRadius - 1e-6,
    );
  });

  it("A unit walks into a lifted unit: the lifted unit is not moved; the walker is pushed round it", () => {
    const { world, enemy } = arrange();
    const from = { x: enemy.curr.x, y: enemy.curr.y };

    cast(world, lift);
    world.tick();

    const walker = spawnUnit(world, { x: FRONT.x - 60, y: 1 });

    walk(walker);

    for (let tick = 0; tick < LIFT_TICKS - 2; tick += 1) {
      world.tick();

      expect(enemy.curr.x).toBe(from.x);
      expect(enemy.curr.y).toBe(from.y);
      expect(
        Math.hypot(walker.curr.x - enemy.curr.x, walker.curr.y - enemy.curr.y),
      ).toBeGreaterThanOrEqual(
        walker.collisionRadius + enemy.collisionRadius - 1e-6,
      );
    }

    expect(walker.curr.x).toBeGreaterThan(from.x);
  });
});

describe("status effects: two displacements in one tick", () => {
  it("Two pushes in the same tick: the first one applied takes hold; the second is ignored", () => {
    const { world, enemy } = arrange();

    cast(world, push);
    cast(world, pushOf(SHORT_DISTANCE));
    tickUntil(world, () => enemy.push.ticksLeft === 0, PATIENCE);

    expect(enemy.curr.x).toBeCloseTo(FRONT.x + DISTANCE);
  });

  it("Two pushes in the same tick: the first one applied takes hold even when it is the shorter", () => {
    const { world, enemy } = arrange();

    cast(world, pushOf(SHORT_DISTANCE));
    cast(world, push);
    tickUntil(world, () => enemy.push.ticksLeft === 0, PATIENCE);

    expect(enemy.curr.x).toBeCloseTo(FRONT.x + SHORT_DISTANCE);
  });

  it("Knocked back while lifted: lift wins, the unit moves nowhere and the rest of the push is spent in the air", () => {
    const { world, enemy } = arrange();

    cast(world, lift);
    cast(world, push);
    world.tick();

    expect(enemy.disables.lifted).toBe(true);

    tickUntil(world, () => !enemy.disables.lifted, PATIENCE);

    expect(enemy.curr.x).toBe(FRONT.x);
    expect(enemy.push.ticksLeft).toBe(0);

    tickTimes(world, PUSH_TICKS);

    expect(enemy.curr.x).toBe(FRONT.x);
  });

  it("Lifted while knocked back: lift wins, the unit comes down on the spot it was lifted from", () => {
    const { world, enemy } = arrange();

    cast(world, push);
    cast(world, lift);
    world.tick();

    expect(enemy.disables.lifted).toBe(true);

    tickUntil(world, () => !enemy.disables.lifted, PATIENCE);

    expect(enemy.curr.x).toBe(FRONT.x);
    expect(enemy.push.ticksLeft).toBe(0);
  });
});
