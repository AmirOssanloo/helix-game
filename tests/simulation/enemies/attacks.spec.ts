import { describe, expect, it } from "vitest";
import { meleeGruntDef, rangedArcherDef, tuningTable } from "@content/public";
import type { DomainEvent, EnemyDef, Unit } from "@domain/public";
import { applyStatus, mitigate } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** Where each enemy stands: inside its aggro radius and its reach of the hero, so it swings without walking. */
const GRUNT_X = 140;
const ARCHER_X = 400;

/** Long enough for an enemy to notice the hero, face it, and finish an attack point. */
const PATIENCE = 300;

/** Long enough for several attack times, so an enemy that may swing has swung more than once by the end of it. */
const SEVERAL_ATTACKS = 300;

/** How far a projectile moves in one tick at `perSecond`. */
const perTick = (perSecond: number): number => perSecond / tuningTable.sim_hz;

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  enemy: Unit;
  enemyId: EntityId;
  reader: EventReader;
}>;

/** The content registry with no wander, the hero at the origin, and one enemy of `def` at (`x`, 0). */
const arrange = (def: EnemyDef, x: number): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ tuning: { wander_radius: 0 } }),
  });
  const hero = spawnHero(world);
  const enemy = spawnEnemy(world, { definitionId: def.id, x, y: 0 });

  return {
    world,
    hero,
    enemy,
    enemyId: unitIdOf(world, enemy),
    reader: createEventReader(),
  };
};

/** The hero's health, which lives on its active form. */
const heroHealth = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.health ?? Number.NaN;

/** Every event the reader has not seen, advancing it past everything. */
const drain = (world: Simulation, reader: EventReader): DomainEvent[] => {
  const found: DomainEvent[] = [];

  for (
    let event = world.events.read(reader);
    event !== null;
    event = world.events.read(reader)
  ) {
    found.push({ ...event });
  }

  return found;
};

/** What `amount` of physical damage is worth against the hero's armour now. */
const againstArmour = (hero: Readonly<Unit>, amount: number): number =>
  mitigate(amount, "physical", hero.stats, tuningTable.armour_constant);

describe("the melee grunt's attack", () => {
  it("lands on the hero on the tick its attack point ends, as physical after armour", () => {
    const { world, hero, enemy, enemyId, reader } = arrange(
      meleeGruntDef,
      GRUNT_X,
    );

    tickUntil(world, () => enemy.state === "attack_windup", PATIENCE);
    drain(world, reader);

    let before = heroHealth(world);

    while (enemy.state === "attack_windup") {
      before = heroHealth(world);
      world.tick();
    }

    const expected = againstArmour(hero, meleeGruntDef.attack.damage);
    const hits = drain(world, reader).filter(
      (event) => event.kind === "unit_damaged",
    );

    expect(enemy.state).toBe("attack_backswing");
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      unitId: unitIdOf(world, hero),
      sourceId: enemyId,
      damageType: "physical",
    });
    expect(hits[0]?.amount).toBeCloseTo(expected);
    expect(expected).toBeLessThan(meleeGruntDef.attack.damage);
    // The hero regenerates a fraction of a point on the same tick, so the drop is the hit less that.
    expect(before - heroHealth(world)).toBeCloseTo(expected, 0);
  });

  it("fires nothing: no projectile is spawned for a swing", () => {
    const { world, enemy, reader } = arrange(meleeGruntDef, GRUNT_X);

    tickUntil(world, () => enemy.state === "attack_backswing", PATIENCE);

    const spawned = drain(world, reader).filter(
      (event) => event.kind === "projectile_spawned",
    );

    expect(spawned).toHaveLength(0);
    expect(world.view.map.projectiles.count).toBe(0);
  });
});

describe("the ranged archer's attack", () => {
  it("fires a homing arrow that lands 900 units a second later, as physical after armour", () => {
    const { world, hero, enemyId, reader } = arrange(rangedArcherDef, ARCHER_X);

    const flight: DomainEvent[] = [];

    tickUntil(
      world,
      () => {
        flight.push(...drain(world, reader));

        return flight.some((e) => e.kind === "projectile_hit");
      },
      PATIENCE,
    );

    const spawned = flight.find((e) => e.kind === "projectile_spawned");
    const landed = flight.find(
      (e) =>
        e.kind === "projectile_hit" && e.projectileId === spawned?.projectileId,
    );
    const damaged = flight.find(
      (e) => e.kind === "unit_damaged" && e.sourceId === enemyId,
    );

    // It touches the hero once it has closed the gap to both discs, one step taken on the tick it is fired.
    const toContact =
      ARCHER_X - rangedArcherDef.attack.projectileRadius - hero.collisionRadius;
    const steps = Math.ceil(
      toContact / perTick(rangedArcherDef.attack.projectileSpeed),
    );

    expect(rangedArcherDef.attack.projectileSpeed).toBe(900);
    expect(landed?.sourceId).toBe(enemyId);
    expect((landed?.tick ?? 0) - (spawned?.tick ?? 0)).toBe(steps - 1);
    expect(damaged?.tick).toBe(landed?.tick);
    expect(damaged?.damageType).toBe("physical");
    expect(damaged?.amount).toBeCloseTo(
      againstArmour(hero, rangedArcherDef.attack.damage),
    );
  });
});

describe.each([
  { def: meleeGruntDef, x: GRUNT_X },
  { def: rangedArcherDef, x: ARCHER_X },
])("a disarm on the $def.id", ({ def, x }) => {
  it("blocks its attack: nothing lands and nothing is fired while it lasts", () => {
    const { world, enemy, enemyId, reader } = arrange(def, x);

    tickUntil(world, () => enemy.ai.state === "attack", PATIENCE);

    const result = applyStatus(
      world.state,
      enemyId,
      "disarm",
      SEVERAL_ATTACKS * 2,
      null,
      [],
    );

    expect(result).toBe("ok");

    world.tick();
    drain(world, reader);

    for (let tick = 0; tick < SEVERAL_ATTACKS; tick += 1) {
      world.tick();

      expect(enemy.state).not.toBe("attack_windup");
    }

    // The enemy is the only thing on the map that can fire or land anything.
    const fired = drain(world, reader).filter(
      (event) =>
        event.kind === "unit_damaged" || event.kind === "projectile_spawned",
    );

    expect(enemy.disables.disarmed).toBe(true);
    expect(enemy.ai.state).toBe("attack");
    expect(fired).toHaveLength(0);
  });
});
