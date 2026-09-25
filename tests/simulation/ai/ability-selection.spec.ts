import { describe, expect, it } from "vitest";
import { tuningTable } from "@content/public";
import type { AbilityDef, EnemyDef, Unit } from "@domain/public";
import { applyStatus, remainingCooldownTicks } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  FROST_VOLLEY,
  makeAbilityDef,
  makeAttackDef,
  makeEnemyDef,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** How far the caster notices the hero, and how far from home it follows it. */
const AGGRO_RADIUS = 700;
const LEASH_RADIUS = 2000;

/** The caster's melee reach, centre to centre before both bound radii: well inside the volley's range. */
const MELEE_RANGE = 100;

/** Where the caster starts: inside its aggro radius and the volley's range, outside its melee reach. */
const START_X = 400;

/** Where a caster starts when the hero is out of every range it has, but inside its aggro radius. */
const FAR_X = 650;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 300;

/** A stun long enough to outlast the cast point it lands in. */
const STUN_TICKS = 30;

/** A silence longer than any case below runs. */
const SILENCE_TICKS = 9000;

/** A volley with a range shorter than the caster's melee reach, so it is only ever cast from contact. */
const SHORT_VOLLEY: AbilityDef = makeAbilityDef.build({
  id: "short_volley",
  range: 10,
});

/** An ability aimed at the ground the target stands on. */
const GROUND_BURST: AbilityDef = makeAbilityDef.build({
  id: "ground_burst",
  targeting: "point",
  preview: { kind: "circle", radius: 100, atlasFrame: "disc" },
});

/** An ability aimed at its own caster, in range wherever the target stands. */
const WAR_CRY: AbilityDef = makeAbilityDef.build({
  id: "war_cry",
  targeting: "none",
  preview: { kind: "none" },
});

/** An ability aimed along a line, which only a player draws. */
const SWEEP: AbilityDef = makeAbilityDef.build({
  id: "sweep",
  targeting: "direction",
  range: 0,
  preview: {
    kind: "rectangle",
    length: 300,
    width: 100,
    offset: 150,
    atlasFrame: "disc",
  },
});

/** An ability that costs more mana than any caster below holds. */
const COSTLY: AbilityDef = makeAbilityDef.build({
  id: "costly",
  manaCost: [50, 50, 50, 50, 50, 50, 50],
});

/** A melee chaser that casts the abilities `ids` names, first listed first. */
const casterOf = (id: string, ids: readonly string[]): EnemyDef =>
  makeEnemyDef.build({
    id,
    behaviour: "melee_chaser",
    health: 5000,
    aggroRadius: AGGRO_RADIUS,
    leashRadius: LEASH_RADIUS,
    abilities: ids,
    attack: makeAttackDef.build({
      range: MELEE_RANGE,
      acquireRadius: AGGRO_RADIUS,
      projectileSpeed: 0,
      projectileRadius: 0,
    }),
  });

const VOLLEYER = casterOf("volleyer", [FROST_VOLLEY.id]);
const SHORT_CASTER = casterOf("short_caster", [SHORT_VOLLEY.id]);
const GROUNDER = casterOf("grounder", [GROUND_BURST.id]);
const SHOUTER = casterOf("shouter", [WAR_CRY.id]);
const SWEEPER = casterOf("sweeper", [SWEEP.id]);
const PAUPER = casterOf("pauper", [COSTLY.id, FROST_VOLLEY.id]);
const PAIR = casterOf("pair", [FROST_VOLLEY.id, WAR_CRY.id]);

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  caster: Unit;
  casterId: EntityId;
}>;

/** A world with every caster and ability above, the hero at the origin, and one caster of `def` at (`x`, 0). */
const arrange = (def: EnemyDef, x = START_X): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      abilities: [
        FROST_VOLLEY,
        SHORT_VOLLEY,
        GROUND_BURST,
        WAR_CRY,
        SWEEP,
        COSTLY,
      ],
      enemies: [
        VOLLEYER,
        SHORT_CASTER,
        GROUNDER,
        SHOUTER,
        SWEEPER,
        PAUPER,
        PAIR,
      ],
      tuning: { wander_radius: 0 },
    }),
  });
  const hero = spawnHero(world);
  const caster = spawnEnemy(world, { definitionId: def.id, x, y: 0 });

  return {
    world,
    hero,
    heroId: unitIdOf(world, hero),
    caster,
    casterId: unitIdOf(world, caster),
  };
};

const isSlowed = (unit: Readonly<Unit>): boolean =>
  unit.statuses.some((row) => row.definitionId === "slow");

const inCastPoint = (unit: Readonly<Unit>) => (): boolean =>
  unit.state === "ability_cast_point";

const clockOf = (world: Simulation, unit: Readonly<Unit>, id: string): number =>
  remainingCooldownTicks(unit.cooldowns, id, world.state.tick);

describe("the ability selection rule", () => {
  it("casts the listed ability at the hero when it is ready and in range, through the pipeline", () => {
    const { world, hero, caster, heroId } = arrange(VOLLEYER);

    tickUntil(world, inCastPoint(caster), PATIENCE);

    expect(caster.cast.abilityId).toBe(FROST_VOLLEY.id);
    expect(caster.cast.targetId).toBe(heroId);
    expect(caster.ai.state).toBe("chase");

    tickUntil(world, () => caster.state !== "ability_cast_point", PATIENCE);

    expect(isSlowed(hero)).toBe(true);
    expect(clockOf(world, caster, FROST_VOLLEY.id)).toBeGreaterThan(0);
  });

  it("attacks while its ability is on its clock, and goes back to the attack loop after the cast", () => {
    const { world, caster, heroId } = arrange(VOLLEYER);

    tickUntil(world, inCastPoint(caster), PATIENCE);
    tickUntil(
      world,
      () =>
        caster.order.kind === "attack_target" &&
        caster.order.targetId === heroId,
      PATIENCE,
    );

    expect(clockOf(world, caster, FROST_VOLLEY.id)).toBeGreaterThan(0);
    expect(caster.cast.abilityId).toBeNull();
    expect(caster.ai.state).toBe("attack");
  });

  it("casts again once the clock runs out, from inside the attack", () => {
    const { world, caster } = arrange(VOLLEYER);

    tickUntil(world, inCastPoint(caster), PATIENCE);
    tickUntil(world, () => caster.state !== "ability_cast_point", PATIENCE);

    const ready = clockOf(world, caster, FROST_VOLLEY.id);

    tickUntil(world, () => caster.ai.state === "attack", PATIENCE);
    tickUntil(world, inCastPoint(caster), ready + PATIENCE);

    expect(caster.ai.state).toBe("attack");
    expect(caster.cast.abilityId).toBe(FROST_VOLLEY.id);
  });

  it("chases and attacks when its ability does not reach the hero", () => {
    const { world, caster, heroId } = arrange(SHORT_CASTER);

    tickUntil(
      world,
      () =>
        caster.order.kind === "attack_target" &&
        caster.order.targetId === heroId,
      PATIENCE,
    );

    expect(caster.cast.abilityId).toBeNull();
    expect(clockOf(world, caster, SHORT_VOLLEY.id)).toBe(0);
  });

  it("is cancelled at no cost by a stun during its cast point: nothing lands and the clock does not start", () => {
    const { world, hero, caster, casterId } = arrange(VOLLEYER);

    tickUntil(world, inCastPoint(caster), PATIENCE);
    world.tick();

    expect(caster.state).toBe("ability_cast_point");
    expect(
      applyStatus(world.state, casterId, "stun", STUN_TICKS, null, []),
    ).toBe("ok");

    world.tick();

    expect(caster.state).not.toBe("ability_cast_point");
    expect(caster.cast.abilityId).toBeNull();
    expect(clockOf(world, caster, FROST_VOLLEY.id)).toBe(0);
    expect(isSlowed(hero)).toBe(false);
  });

  it("never interrupts its own cast point, even with the hero in its melee reach", () => {
    const { world, caster } = arrange(VOLLEYER, MELEE_RANGE);

    tickUntil(world, inCastPoint(caster), PATIENCE);

    let ticks = 0;

    while (caster.state === "ability_cast_point") {
      expect(caster.cast.abilityId).toBe(FROST_VOLLEY.id);
      world.tick();
      ticks += 1;
    }

    expect(ticks).toBe(
      Math.round(FROST_VOLLEY.castPointSeconds * tuningTable.sim_hz),
    );
    expect(clockOf(world, caster, FROST_VOLLEY.id)).toBeGreaterThan(0);
  });

  it("does not cut short an attack point of its own to cast", () => {
    const { world, caster } = arrange(VOLLEYER, MELEE_RANGE);

    caster.cooldowns.set(FROST_VOLLEY.id, world.state.tick + PATIENCE * 10);
    tickUntil(world, () => caster.state === "attack_windup", PATIENCE);
    caster.cooldowns.set(FROST_VOLLEY.id, world.state.tick);

    while (caster.state === "attack_windup") {
      expect(caster.cast.abilityId).toBeNull();
      world.tick();
    }

    expect(caster.state).toBe("attack_backswing");

    tickUntil(world, inCastPoint(caster), PATIENCE);

    expect(caster.cast.abilityId).toBe(FROST_VOLLEY.id);
  });

  it("casts nothing while silenced, and attacks instead", () => {
    const { world, caster, casterId, heroId } = arrange(VOLLEYER);

    expect(
      applyStatus(world.state, casterId, "silence", SILENCE_TICKS, null, []),
    ).toBe("ok");
    tickUntil(
      world,
      () =>
        caster.order.kind === "attack_target" &&
        caster.order.targetId === heroId,
      PATIENCE,
    );

    expect(clockOf(world, caster, FROST_VOLLEY.id)).toBe(0);
  });

  it("aims a point ability at the ground the hero stands on", () => {
    const { world, hero, caster } = arrange(GROUNDER);

    tickUntil(world, inCastPoint(caster), PATIENCE);

    expect(caster.cast.targetKind).toBe("point");
    expect(caster.cast.targetId).toBeNull();
    expect(caster.cast.position).toEqual({ x: hero.curr.x, y: hero.curr.y });
  });

  it("aims a no-target ability at itself, from wherever the hero stands", () => {
    const { world, caster } = arrange(SHOUTER, FAR_X);

    tickUntil(world, inCastPoint(caster), PATIENCE);

    expect(caster.cast.targetKind).toBe("none");
    expect(caster.cast.abilityId).toBe(WAR_CRY.id);
  });

  it("never chooses an ability aimed along a line, which only a player draws", () => {
    const { world, caster, heroId } = arrange(SWEEPER);

    tickUntil(
      world,
      () =>
        caster.order.kind === "attack_target" &&
        caster.order.targetId === heroId,
      PATIENCE,
    );

    expect(clockOf(world, caster, SWEEP.id)).toBe(0);
  });

  it("chooses the first listed ability that is ready, and the next once the first is on its clock", () => {
    const { world, caster } = arrange(PAIR);

    tickUntil(world, inCastPoint(caster), PATIENCE);

    expect(caster.cast.abilityId).toBe(FROST_VOLLEY.id);

    tickUntil(
      world,
      () =>
        caster.state === "ability_cast_point" &&
        caster.cast.abilityId === WAR_CRY.id,
      PATIENCE,
    );

    expect(clockOf(world, caster, FROST_VOLLEY.id)).toBeGreaterThan(0);
  });

  it("fights on with its attack when the pipeline refuses the ability it chose", () => {
    const { world, caster, heroId } = arrange(PAUPER);

    tickUntil(
      world,
      () =>
        caster.order.kind === "attack_target" &&
        caster.order.targetId === heroId,
      PATIENCE,
    );

    expect(clockOf(world, caster, COSTLY.id)).toBe(0);
    expect(clockOf(world, caster, FROST_VOLLEY.id)).toBe(0);
    expect(caster.cast.abilityId).toBeNull();
  });
});
