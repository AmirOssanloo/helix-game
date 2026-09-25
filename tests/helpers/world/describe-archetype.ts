import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { EnemyDef, Unit } from "@domain/public";
import { applyDamage } from "@domain/public";
import type { Simulation } from "@simulation/public";
import { makeRegistry } from "../content/make-registry";
import { makeWorld } from "./make-world";
import { spawnEnemy } from "./spawn-enemy";
import { spawnHero } from "./spawn-hero";
import { submit } from "./submit";
import { tickUntil } from "./tick-until";
import { unitIdOf } from "./unit-id";

/**
 * The archetype the six tests mount for, and the nearest its centre may stand to the hero's
 * once it swings: zero for one that closes to contact, its reach less the hold margin for one
 * that holds at range. The spec computes the number, so the helper never asks which it is.
 */
export type DescribeArchetypeOptions = Readonly<{
  def: EnemyDef;
  closestGap: number;
}>;

/** The hero's bound radius, which widens every reach at it. */
const HERO_BOUND = 24;

/** The corpse delay in ticks under the content table's defaults. */
const CORPSE_TICKS = tuningTable.corpse_delay * tuningTable.sim_hz;

/** The pack every case spawns in. */
const PACK = 1;

/** Long enough for any walk below. */
const PATIENCE = 1500;

/** How often the leash case gives the hero its walk again, in ticks, so a stun or a root that dropped the order does not hold it. */
const REORDER_TICKS = 30;

/** The content registry on an open map with the hero at the origin, and no wander to move anyone off their marks. */
const arrange = (): Readonly<{ world: Simulation; hero: Unit }> => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ tuning: { wander_radius: 0 } }),
  });

  return { world, hero: spawnHero(world) };
};

/** The distance between two units' centres. */
const gap = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
  Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y);

/**
 * Mounts the six tests every archetype passes, against the content registry: aggro on sight
 * and on damage across the pack, where it stands to swing, the leash home with regeneration,
 * death and the slot given back, and the experience it grants. The spec calls it once, inside
 * nothing, and writes its ability tests beside it.
 *
 * @see docs/workflows/adding-an-enemy.md
 */
export const describeArchetype = ({
  def,
  closestGap,
}: DescribeArchetypeOptions): void => {
  const spawnAt = (world: Simulation, x: number): Unit =>
    spawnEnemy(world, { definitionId: def.id, x, y: 0, packId: PACK });

  describe(`the ${def.id} archetype`, () => {
    it("aggroes with its whole pack when the hero comes inside its aggro radius", () => {
      const { world } = arrange();
      const pack = [
        spawnAt(world, def.aggroRadius - 50),
        spawnAt(world, def.aggroRadius + 250),
        spawnAt(world, def.aggroRadius + 550),
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
        spawnAt(world, def.aggroRadius + 250),
        spawnAt(world, def.aggroRadius + 550),
        spawnAt(world, def.aggroRadius + 850),
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

    it("stands where its behaviour puts it and swings", () => {
      const { world, hero } = arrange();
      const unit = spawnAt(world, def.aggroRadius - 50);

      tickUntil(world, () => unit.state === "attack_windup", PATIENCE);

      expect(gap(unit, hero)).toBeGreaterThan(closestGap);
      expect(gap(unit, hero)).toBeLessThanOrEqual(
        def.attack.range + def.body.boundRadius + HERO_BOUND,
      );
    });

    it("leashes home past its leash radius and regenerates on the way", () => {
      const { world } = arrange();
      const unit = spawnAt(world, def.aggroRadius - 50);

      unit.resources.health = unit.stats.maxHealth / 2;

      for (
        let ticks = 0;
        ticks < PATIENCE && unit.ai.state !== "return";
        ticks += 1
      ) {
        if (ticks % REORDER_TICKS === 0) {
          submit(world, {
            kind: "move",
            tick: world.view.tick,
            timestamp: world.view.tick,
            destination: { x: -3 * def.leashRadius, y: 0 },
          });
        }

        world.tick();
      }

      expect(unit.ai.state).toBe("return");

      const leashedAt = unit.resources.health;

      tickUntil(world, () => unit.ai.state === "idle", PATIENCE);

      expect(unit.resources.health).toBeGreaterThan(leashedAt);
    });

    it("dies at zero health, and gives its slot and its place in the hash back after the corpse delay", () => {
      const { world, hero } = arrange();
      const unit = spawnAt(world, def.aggroRadius + 2000);
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
      const unit = spawnAt(world, def.aggroRadius + 2000);

      applyDamage(
        world.state,
        unitIdOf(world, unit),
        unit.stats.maxHealth * 10,
        "pure",
        unitIdOf(world, hero),
      );
      world.tick();

      expect(hero.progression.experience).toBe(def.experience);
    });
  });
};
