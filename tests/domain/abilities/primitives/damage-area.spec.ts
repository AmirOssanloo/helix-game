import { describe, expect, it } from "vitest";
import type {
  DamageAreaEffectDef,
  EffectTargetDef,
  Unit,
} from "@domain/public";
import { runPrimitive } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { makeCast, makeWorld, spawnHero, spawnUnit } from "../../../helpers";

/** The health every unit in the fixture starts with, well above anything the spec deals. */
const HEALTH = 10000;

/** The amount every entry below deals, whole or divided. */
const AMOUNT = 600;

/** Where the twelve enemies of the fixture stand around the hero at the origin. */
const POSITIONS: readonly (readonly [number, number])[] = [
  [100, -200],
  [100, 0],
  [100, 200],
  [300, -200],
  [300, 0],
  [300, 200],
  [500, -200],
  [500, 0],
  [500, 200],
  [700, 0],
  [-100, 0],
  [0, 300],
];

type Arranged = { world: Simulation; enemies: readonly Unit[] };

/** The id of the enemy the fixture placed at `index`. The hero holds the slot before them. */
const idOfEnemy = (world: Simulation, index: number): EntityId => {
  const id = world.state.map.units.idAt(index + 1);

  if (id === null) {
    throw new Error("The fixture places twelve enemies after the hero");
  }

  return id;
};

/** The hero at the origin facing +X, with the twelve enemies of the fixture around it. */
const arrange = (): Arranged => {
  const world = makeWorld({ seed: 1 });

  spawnHero(world);

  const enemies = POSITIONS.map(([x, y]) =>
    spawnUnit(world, { x, y, health: HEALTH }),
  );

  return { world, enemies };
};

/** A damage-area entry over `target`, of `AMOUNT` pure damage, split or not. */
const entry = (
  target: EffectTargetDef,
  split = false,
): DamageAreaEffectDef => ({
  kind: "damage_area",
  target,
  damageType: "pure",
  amount: { orb: "quartz", byLevel: [AMOUNT] },
  rate: "once",
  split,
});

/** What each enemy of the fixture lost, in the order the fixture placed them. */
const losses = (enemies: readonly Unit[]): number[] =>
  enemies.map((enemy) => HEALTH - enemy.resources.health);

/** The indices of the enemies that lost anything. */
const hit = (enemies: readonly Unit[]): number[] =>
  losses(enemies)
    .map((loss, index) => (loss > 0 ? index : -1))
    .filter((index) => index >= 0);

describe("the damage-area primitive over a shape", () => {
  it("hits exactly the units inside a circle", () => {
    const { world, enemies } = arrange();

    runPrimitive(
      world.state,
      makeCast(world),
      entry({ kind: "circle", radius: 250 }),
    );

    expect(hit(enemies)).toEqual([0, 1, 2, 10]);
  });

  it("hits exactly the units inside a rectangle turned to the facing", () => {
    const { world, enemies } = arrange();

    runPrimitive(
      world.state,
      makeCast(world),
      entry({ kind: "rectangle", length: 800, width: 200 }),
    );

    expect(hit(enemies)).toEqual([1, 4, 10]);
  });

  it("hits exactly the units inside a cone from the anchor", () => {
    const { world, enemies } = arrange();

    runPrimitive(
      world.state,
      makeCast(world),
      entry({ kind: "cone", angleDegrees: 90, length: 600 }),
    );

    expect(hit(enemies)).toEqual([1, 3, 4, 5, 6, 7, 8]);
  });

  it("turns the shape with the cast's facing", () => {
    const { world, enemies } = arrange();

    runPrimitive(
      world.state,
      makeCast(world, { facing: Math.PI / 2 }),
      entry({ kind: "cone", angleDegrees: 90, length: 600 }),
    );

    expect(hit(enemies)).toEqual([2, 11]);
  });
});

describe("the damage-area primitive's amount", () => {
  it("applies the whole amount to each unit when it does not split", () => {
    const { world, enemies } = arrange();

    runPrimitive(
      world.state,
      makeCast(world),
      entry({ kind: "circle", radius: 250 }),
    );

    expect(losses(enemies)[1]).toBe(AMOUNT);
    expect(losses(enemies)[10]).toBe(AMOUNT);
  });

  it("divides the amount evenly among the units it hits when it splits", () => {
    const { world, enemies } = arrange();

    runPrimitive(
      world.state,
      makeCast(world),
      entry({ kind: "circle", radius: 250 }, true),
    );

    expect(losses(enemies)[1]).toBe(AMOUNT / 4);
    expect(losses(enemies)[10]).toBe(AMOUNT / 4);
  });

  it("reads its table at the levels the cast snapshotted", () => {
    const { world, enemies } = arrange();
    const scaling: DamageAreaEffectDef = {
      kind: "damage_area",
      target: { kind: "circle", radius: 250 },
      damageType: "pure",
      amount: { orb: "whorl", byLevel: [10, 20, 30] },
      rate: "once",
      split: false,
    };

    runPrimitive(
      world.state,
      makeCast(world, { orbLevels: [1, 3, 1] }),
      scaling,
    );

    expect(losses(enemies)[1]).toBe(30);
  });

  it("takes this tick's share of a per-second amount", () => {
    const { world, enemies } = arrange();
    const perSecond: DamageAreaEffectDef = {
      kind: "damage_area",
      target: { kind: "circle", radius: 250 },
      damageType: "pure",
      amount: { orb: "quartz", byLevel: [30] },
      rate: "per_second",
      split: false,
    };

    runPrimitive(world.state, makeCast(world), perSecond);

    expect(losses(enemies)[1]).toBe(1);
  });

  it("spends a split amount on nobody when the shape finds nobody", () => {
    const { world, enemies } = arrange();

    runPrimitive(
      world.state,
      makeCast(world, { x: 5000, y: 5000 }),
      entry({ kind: "circle", radius: 250 }, true),
    );

    expect(hit(enemies)).toEqual([]);
  });
});

describe("the damage-area primitive over the cast's target", () => {
  it("hits the one unit the cast is aimed at, wherever it stands", () => {
    const { world, enemies } = arrange();

    runPrimitive(
      world.state,
      makeCast(world, { targetId: idOfEnemy(world, 9) }),
      entry({ kind: "target" }),
    );

    expect(hit(enemies)).toEqual([9]);
  });

  it("hits nobody when the cast is aimed at nobody", () => {
    const { world, enemies } = arrange();

    runPrimitive(world.state, makeCast(world), entry({ kind: "target" }));

    expect(hit(enemies)).toEqual([]);
  });
});

describe("whom an area leaves alone", () => {
  it("leaves units on the caster's own side alone", () => {
    const { world } = arrange();
    const summon = spawnUnit(world, {
      kind: "summon",
      x: 100,
      y: 50,
      health: HEALTH,
    });

    runPrimitive(
      world.state,
      makeCast(world),
      entry({ kind: "circle", radius: 250 }),
    );

    expect(summon.resources.health).toBe(HEALTH);
  });

  it("leaves a corpse alone", () => {
    const { world, enemies } = arrange();
    const corpse = enemies[1];

    if (corpse === undefined) {
      throw new Error("The fixture places twelve enemies");
    }

    corpse.state = "dead";

    runPrimitive(
      world.state,
      makeCast(world),
      entry({ kind: "circle", radius: 250 }),
    );

    expect(corpse.resources.health).toBe(HEALTH);
  });
});
