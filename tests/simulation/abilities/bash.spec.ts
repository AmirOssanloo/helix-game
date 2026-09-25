import { describe, expect, it } from "vitest";
import { bashDef, tuningTable } from "@content/public";
import type { DomainEvent, EnemyDef, Unit } from "@domain/public";
import { applyDamage, STATUS_NEVER_ENDS } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  greyedSlots,
  makeAttackDef,
  makeEnemyDef,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** How long the bash stuns the unit hit, and how long before it may stun again, in ticks. */
const STUN_TICKS =
  bashDef.onDamageDealt.effects[0].seconds * tuningTable.sim_hz;
const COOLDOWN_TICKS =
  bashDef.onDamageDealt.cooldownSeconds.byLevel[0] * tuningTable.sim_hz;

/** Every slot key the ability bar shows, which a stun blocks from the tick after it lands, when the status pass raises its flag. */
const ALL_SLOTS = [1, 2, 3, 4, 5, 6];

/** Where a basher stands: inside its aggro radius of the hero at the origin, outside its reach. */
const BASHER_X = 300;

/** A hit the spec lands by hand, small against the hero's health. */
const HIT = 1;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 600;

/** A melee chaser that carries the bash. */
const BASHER: EnemyDef = makeEnemyDef.build({
  id: "basher",
  behaviour: "melee_chaser",
  health: 5000,
  aggroRadius: 700,
  leashRadius: 2000,
  statuses: [bashDef.id],
  attack: makeAttackDef.build({
    range: 100,
    acquireRadius: 700,
    projectileSpeed: 0,
    projectileRadius: 0,
  }),
});

/** A ranged holder that carries the bash, so the stun rides its shot. */
const BASHING_ARCHER: EnemyDef = makeEnemyDef.build({
  id: "bashing_archer",
  behaviour: "ranged_holder",
  health: 5000,
  aggroRadius: 700,
  leashRadius: 2000,
  statuses: [bashDef.id],
  attack: makeAttackDef.build({ range: 500, acquireRadius: 700 }),
});

/** A basher that stands and never swings, for hits the spec lands by hand. */
const STILL_BASHER: EnemyDef = makeEnemyDef.build({
  id: "still_basher",
  health: 5000,
  statuses: [bashDef.id],
});

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  reader: EventReader;
}>;

/** A world holding the three archetypes, with the hero at the origin and nothing else. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      enemies: [BASHER, BASHING_ARCHER, STILL_BASHER],
      tuning: { wander_radius: 0 },
    }),
  });
  const hero = spawnHero(world);

  return {
    world,
    hero,
    heroId: unitIdOf(world, hero),
    reader: createEventReader(),
  };
};

/** Spawns one of `def` at (`x`, 0) through the panel's pack command, as a person would, and returns it. */
const spawnPackOf = (world: Simulation, def: EnemyDef, x: number): Unit => {
  submit(world, {
    kind: "spawn_pack",
    tick: world.view.tick,
    timestamp: world.view.tick,
    archetypeId: def.id,
    tier: "normal",
    count: 1,
    position: { x, y: 0 },
  });
  world.tick();

  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== undefined && unit !== null && unit.definitionId === def.id) {
      return unit;
    }
  }

  throw new Error(`The pack command spawned a ${def.id}`);
};

/** The stuns the reader has not seen yet that landed on `unitId`, advancing it past everything. */
const stunsOn = (
  world: Simulation,
  reader: EventReader,
  unitId: EntityId,
): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (
      event.kind === "status_applied" &&
      event.statusId === "stun" &&
      event.unitId === unitId
    ) {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

const stunRowOf = (unit: Readonly<Unit>) =>
  unit.statuses.find((row) => row.definitionId === "stun");

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

describe("the bash", () => {
  it("is on the archetype that carries it from the tick it spawns, applied by itself, and never ends", () => {
    const { world, hero } = arrange();
    const basher = spawnPackOf(world, BASHER, BASHER_X);
    const row = basher.statuses.find(
      (entry) => entry.definitionId === bashDef.id,
    );

    expect(row?.sourceId).toBe(unitIdOf(world, basher));
    expect(row?.endsAtTick).toBe(STATUS_NEVER_ENDS);
    expect(
      hero.statuses.some((entry) => entry.definitionId === bashDef.id),
    ).toBe(false);
  });

  it("stuns the hero on the basher's first swing for the hook's duration, and the HUD greys every key", () => {
    const { world, hero, heroId, reader } = arrange();
    const basher = spawnPackOf(world, BASHER, BASHER_X);

    stunsOn(world, reader, heroId);
    tickUntil(world, () => stunRowOf(hero) !== undefined, PATIENCE);

    const [stun] = stunsOn(world, reader, heroId);

    expect(stun?.sourceId).toBe(unitIdOf(world, basher));
    expect(stunRowOf(hero)?.endsAtTick).toBe((stun?.tick ?? 0) + STUN_TICKS);
    expect(hero.resources.health).toBeLessThan(hero.stats.maxHealth);

    world.tick();

    expect(greyedSlots(world, hero)).toEqual(ALL_SLOTS);

    tickTimes(world, STUN_TICKS - 1);

    expect(stunRowOf(hero)).toBeUndefined();
    expect(greyedSlots(world, hero)).toEqual([]);
  });

  it("holds its internal cooldown: a hit inside it stuns nothing, and the first hit after it stuns again", () => {
    const { world, hero, heroId, reader } = arrange();
    const basher = spawnEnemy(world, {
      definitionId: STILL_BASHER.id,
      x: BASHER_X,
      y: 0,
    });
    const basherId = unitIdOf(world, basher);

    applyDamage(world.state, heroId, HIT, "pure", basherId);

    expect(stunsOn(world, reader, heroId)).toHaveLength(1);

    tickTimes(world, COOLDOWN_TICKS - 1);
    applyDamage(world.state, heroId, HIT, "pure", basherId);

    expect(stunRowOf(hero)).toBeUndefined();
    expect(stunsOn(world, reader, heroId)).toHaveLength(0);

    world.tick();
    applyDamage(world.state, heroId, HIT, "pure", basherId);

    expect(stunsOn(world, reader, heroId)).toHaveLength(1);
    expect(stunRowOf(hero)).toBeDefined();
  });

  it("stuns through a shot, which lands as the archer's hit", () => {
    const { world, hero, heroId, reader } = arrange();
    const archer = spawnPackOf(world, BASHING_ARCHER, BASHER_X);

    stunsOn(world, reader, heroId);
    tickUntil(world, () => stunRowOf(hero) !== undefined, PATIENCE);

    const [stun] = stunsOn(world, reader, heroId);

    expect(stun?.sourceId).toBe(unitIdOf(world, archer));

    world.tick();

    expect(greyedSlots(world, hero)).toEqual(ALL_SLOTS);
  });

  it("answers the hits its holder deals, never the hits it takes", () => {
    const { world, hero, heroId, reader } = arrange();
    const basher = spawnEnemy(world, {
      definitionId: STILL_BASHER.id,
      x: BASHER_X,
      y: 0,
    });
    const basherId = unitIdOf(world, basher);

    stunsOn(world, reader, basherId);
    applyDamage(world.state, basherId, HIT, "pure", heroId);

    expect(stunsOn(world, reader, basherId)).toHaveLength(0);
    expect(stunRowOf(basher)).toBeUndefined();
    expect(stunRowOf(hero)).toBeUndefined();
  });
});
