import { describe, expect, it } from "vitest";
import { rangedArcherDef } from "@content/public";
import type { Unit } from "@domain/public";
import { applyDamage } from "@domain/public";
import type { Simulation } from "@simulation/public";
import {
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The archetype under test, as content writes it. */
const DEF = rangedArcherDef;

/** The hero's bound radius, which widens every reach at it. */
const HERO_BOUND = 24;

/** The tuning table's hold margin and arrival epsilon: how far inside its reach it stands, and how close a walk counts as there. */
const HOLD_MARGIN = 50;
const EPSILON = 2;

/** The pack every case spawns in. */
const PACK = 1;

/** Long enough for any walk below. */
const PATIENCE = 1500;

type Arranged = Readonly<{ world: Simulation; hero: Unit }>;

/** The content registry on an open map with the hero at the origin, and no wander to move anyone off their marks. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ tuning: { wander_radius: 0 } }),
  });

  return { world, hero: spawnHero(world) };
};

/** A ranged archer of the pack at (`x`, 0). */
const spawnAt = (world: Simulation, x: number): Unit =>
  spawnEnemy(world, { definitionId: DEF.id, x, y: 0, packId: PACK });

/** The distance between two units' centres. */
const gap = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
  Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y);

describe("the ranged archer", () => {
  it("aggroes with its whole pack when the hero comes inside its aggro radius", () => {
    const { world } = arrange();
    const pack = [
      spawnAt(world, DEF.aggroRadius - 50),
      spawnAt(world, DEF.aggroRadius + 250),
      spawnAt(world, DEF.aggroRadius + 550),
    ];

    world.tick();

    expect(pack.map((unit) => unit.ai.state)).toEqual([
      "chase",
      "chase",
      "chase",
    ]);
  });

  it("aggroes with its whole pack when the hero hits one from outside its aggro radius", () => {
    const { world, hero } = arrange();
    const pack = [
      spawnAt(world, DEF.aggroRadius + 250),
      spawnAt(world, DEF.aggroRadius + 550),
      spawnAt(world, DEF.aggroRadius + 850),
    ];
    const first = pack[0];

    if (first === undefined) {
      throw new Error("The pack spawned");
    }

    applyDamage(
      world.state,
      unitIdOf(world, first),
      1,
      "pure",
      unitIdOf(world, hero),
    );
    world.tick();

    expect(pack.map((unit) => unit.ai.state)).toEqual([
      "chase",
      "chase",
      "chase",
    ]);
  });

  it("holds at its attack range less the margin and swings", () => {
    const { world, hero } = arrange();
    const unit = spawnAt(world, DEF.aggroRadius - 50);
    const reach = DEF.attack.range + DEF.body.boundRadius + HERO_BOUND;

    tickUntil(world, () => unit.state === "attack_windup", PATIENCE);

    expect(gap(unit, hero)).toBeGreaterThan(reach - HOLD_MARGIN - EPSILON);
    expect(gap(unit, hero)).toBeLessThanOrEqual(reach);
  });

  it("leashes home past its leash radius and regenerates on the way", () => {
    const { world } = arrange();
    const unit = spawnAt(world, DEF.aggroRadius - 50);

    unit.resources.health = unit.stats.maxHealth / 2;
    world.tick();
    submit(world, {
      kind: "move",
      tick: world.view.tick,
      timestamp: world.view.tick,
      destination: { x: -3 * DEF.leashRadius, y: 0 },
    });
    tickUntil(world, () => unit.ai.state === "return", PATIENCE);

    const leashedAt = unit.resources.health;

    tickUntil(world, () => unit.ai.state === "idle", PATIENCE);

    expect(unit.resources.health).toBeGreaterThan(leashedAt);
  });

  // Owner: the death and experience work in the next sprint. Written when an enemy's death grants experience.
  it.todo("dies at zero health, unbinds its view, and releases its slot");

  // Owner: the death and experience work in the next sprint. Written when an enemy's death grants experience.
  it.todo("grants the hero its experience when it dies");
});
