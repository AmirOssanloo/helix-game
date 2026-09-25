import { describe, expect, it } from "vitest";
import { selfHealDef, statuses, tuningTable } from "@content/public";
import type { DomainEvent, EnemyDef, Unit } from "@domain/public";
import { applyStatus, remainingCooldownTicks } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeAttackDef,
  makeEnemyDef,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The heal's cast point, its clock, and how long the status it applies lasts, in ticks. */
const CAST_POINT_TICKS = Math.round(
  selfHealDef.castPointSeconds * tuningTable.sim_hz,
);
const COOLDOWN_TICKS = Math.round(
  selfHealDef.cooldownSeconds[0] * tuningTable.sim_hz,
);
const HEAL_TICKS = Math.round(
  selfHealDef.effects[0].seconds * tuningTable.sim_hz,
);

const healStatus = statuses.find((status) => status.id === "self_heal");

/** The health the status restores every tick, at the level an enemy casts at. */
const PER_TICK =
  (healStatus?.healOverTime?.perSecond.byLevel[0] ?? Number.NaN) /
  tuningTable.sim_hz;

/** The healer's maximum health, and the fraction below which its entry lets it heal. */
const MAX_HEALTH = 1000;
const FRACTION = 0.4;

/** Health just over the threshold, which never heals, and just under it, which does. */
const ABOVE = MAX_HEALTH * FRACTION + 10;
const BELOW = MAX_HEALTH * FRACTION - 10;

/** Where the healer stands: inside its aggro radius, outside its melee reach. */
const HEALER_X = 400;

/** Long enough that a disarm on the hero outlasts every case, so its attacks never move the healer's health. */
const DISARMED_TICKS = 100_000;

/** A stun long enough to outlast the cast point it lands in. */
const STUN_TICKS = 30;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 300;

/** A melee chaser that heals itself below the fraction of its health. */
const HEALER: EnemyDef = makeEnemyDef.build({
  id: "healer",
  behaviour: "melee_chaser",
  health: MAX_HEALTH,
  healthRegen: 0,
  aggroRadius: 800,
  leashRadius: 2000,
  abilities: [
    {
      id: selfHealDef.id,
      condition: { kind: "health_below", fraction: FRACTION },
    },
  ],
  attack: makeAttackDef.build({
    range: 100,
    acquireRadius: 800,
    projectileSpeed: 0,
    projectileRadius: 0,
  }),
});

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  healer: Unit;
  healerId: EntityId;
}>;

/**
 * A world with the healer beside the content's abilities, the hero at the origin and disarmed,
 * and one healer in its sight at `health`.
 */
const arrange = (health: number): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      enemies: [HEALER],
      tuning: { wander_radius: 0 },
    }),
  });
  const hero = spawnHero(world);
  const heroId = unitIdOf(world, hero);
  const healer = spawnEnemy(world, {
    definitionId: HEALER.id,
    x: HEALER_X,
    y: 0,
  });

  applyStatus(world.state, heroId, "disarm", DISARMED_TICKS, null, []);
  healer.resources.health = health;

  return {
    world,
    hero,
    heroId,
    healer,
    healerId: unitIdOf(world, healer),
  };
};

const healRowOf = (unit: Readonly<Unit>) =>
  unit.statuses.find((row) => row.definitionId === "self_heal");

const inCastPoint = (unit: Readonly<Unit>) => (): boolean =>
  unit.state === "ability_cast_point";

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** How many events of `kind` the reader has not seen, advancing it past everything. */
const countEvents = (
  world: Simulation,
  reader: EventReader,
  kind: DomainEvent["kind"],
): number => {
  let found = 0;
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === kind) {
      found += 1;
    }

    event = world.events.read(reader);
  }

  return found;
};

describe("the self-heal", () => {
  it.each([
    ["at full health", MAX_HEALTH],
    ["just above its fraction", ABOVE],
  ])(
    "is never cast %s: the clock does not start and the health does not move",
    (_label, health) => {
      const { world, healer } = arrange(health);

      tickTimes(world, PATIENCE);

      expect(healRowOf(healer)).toBeUndefined();
      expect(healer.resources.health).toBe(health);
      expect(
        remainingCooldownTicks(
          healer.cooldowns,
          selfHealDef.id,
          world.state.tick,
        ),
      ).toBe(0);
    },
  );

  it("is cast on the caster once its health is below the fraction, and puts the status on it for its duration", () => {
    const { world, healer, healerId } = arrange(BELOW);

    tickUntil(world, inCastPoint(healer), PATIENCE);

    expect(healer.cast.abilityId).toBe(selfHealDef.id);

    const waited = tickUntil(
      world,
      () => healRowOf(healer) !== undefined,
      PATIENCE,
    );

    expect(waited).toBeGreaterThanOrEqual(CAST_POINT_TICKS - 1);
    expect(healRowOf(healer)?.sourceId).toBe(healerId);
    expect(healRowOf(healer)?.endsAtTick).toBe(
      world.state.tick - 1 + HEAL_TICKS,
    );
    expect(
      remainingCooldownTicks(
        healer.cooldowns,
        selfHealDef.id,
        world.state.tick,
      ),
    ).toBeGreaterThan(COOLDOWN_TICKS - CAST_POINT_TICKS - 1);
  });

  it("restores its rate every tick while it lasts and nothing after, announcing no damage", () => {
    const { world, healer } = arrange(BELOW);

    tickUntil(world, () => healRowOf(healer) !== undefined, PATIENCE);
    world.tick();

    const reader = createEventReader();

    world.events.read(reader);
    countEvents(world, reader, "unit_damaged");

    const before = healer.resources.health;

    tickTimes(world, 10);

    expect(healer.resources.health - before).toBeCloseTo(PER_TICK * 10, 6);
    expect(countEvents(world, reader, "unit_damaged")).toBe(0);

    tickUntil(world, () => healRowOf(healer) === undefined, PATIENCE);

    const after = healer.resources.health;

    tickTimes(world, 10);

    expect(healer.resources.health).toBe(after);
    expect(after - BELOW).toBeLessThanOrEqual(PER_TICK * HEAL_TICKS + 1e-6);
  });

  it("never restores past the maximum", () => {
    const { world, healer, healerId } = arrange(MAX_HEALTH - PER_TICK / 2);

    applyStatus(world.state, healerId, "self_heal", 10, healerId, []);
    tickTimes(world, 5);

    expect(healer.resources.health).toBe(MAX_HEALTH);
  });

  it("restores the hero's pool, which lives on its active form", () => {
    const { world, heroId, healerId } = arrange(MAX_HEALTH);
    const form = world.state.run.forms[0];

    if (form === undefined) {
      throw new Error("The hero has a form");
    }

    applyStatus(world.state, healerId, "stun", PATIENCE, null, []);
    world.tick();
    form.resources.health = 100;
    applyStatus(world.state, heroId, "self_heal", 20, heroId, []);

    const before = form.resources.health;

    tickTimes(world, 10);

    expect(form.resources.health - before).toBeGreaterThanOrEqual(
      PER_TICK * 10 - 1e-6,
    );
  });

  it("is cancelled at no cost by a stun during its cast point: no status and the clock does not start", () => {
    const { world, healer, healerId } = arrange(BELOW);

    tickUntil(world, inCastPoint(healer), PATIENCE);
    applyStatus(world.state, healerId, "stun", STUN_TICKS, null, []);
    tickTimes(world, CAST_POINT_TICKS);

    expect(healRowOf(healer)).toBeUndefined();
    expect(healer.resources.health).toBe(BELOW);
    expect(
      remainingCooldownTicks(
        healer.cooldowns,
        selfHealDef.id,
        world.state.tick,
      ),
    ).toBe(0);
  });
});
