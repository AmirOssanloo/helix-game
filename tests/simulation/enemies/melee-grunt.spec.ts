import { describe, expect, it } from "vitest";
import { meleeGruntDef, tuningTable } from "@content/public";
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
const DEF = meleeGruntDef;

/** The hero's bound radius, which widens every reach at it. */
const HERO_BOUND = 24;

/** The corpse delay in ticks under the content table's defaults. */
const CORPSE_TICKS = tuningTable.corpse_delay * tuningTable.sim_hz;

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

/** A melee grunt of the pack at (`x`, 0). */
const spawnAt = (world: Simulation, x: number): Unit =>
  spawnEnemy(world, { definitionId: DEF.id, x, y: 0, packId: PACK });

/** The distance between two units' centres. */
const gap = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
  Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y);

describe("the melee grunt", () => {
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

  it("closes to contact with the hero and swings", () => {
    const { world, hero } = arrange();
    const unit = spawnAt(world, DEF.aggroRadius - 50);

    tickUntil(world, () => unit.state === "attack_windup", PATIENCE);

    expect(gap(unit, hero)).toBeLessThanOrEqual(
      DEF.attack.range + DEF.body.boundRadius + HERO_BOUND,
    );
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

  it("dies at zero health, and gives its slot and its place in the hash back after the corpse delay", () => {
    const { world, hero } = arrange();
    const unit = spawnAt(world, DEF.aggroRadius + 2000);
    const id = unitIdOf(world, unit);

    applyDamage(
      world.state,
      id,
      unit.stats.maxHealth * 10,
      "pure",
      unitIdOf(world, hero),
    );
    world.tick();

    expect(unit.state).toBe("dead");

    for (let tick = 1; tick < CORPSE_TICKS; tick += 1) {
      world.tick();
    }

    expect(world.view.map.units.resolve(id)).not.toBeNull();

    world.tick();

    expect(world.view.map.units.resolve(id)).toBeNull();
    expect(world.view.map.spatialHash.count).toBe(1);
  });

  it("grants the hero its experience when it dies", () => {
    const { world, hero } = arrange();
    const unit = spawnAt(world, DEF.aggroRadius + 2000);

    applyDamage(
      world.state,
      unitIdOf(world, unit),
      unit.stats.maxHealth * 10,
      "pure",
      unitIdOf(world, hero),
    );
    world.tick();

    expect(hero.progression.experience).toBe(DEF.experience);
  });
});
