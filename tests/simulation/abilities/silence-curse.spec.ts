import { describe, expect, it } from "vitest";
import { silenceCurseDef, tuningTable } from "@content/public";
import type { EnemyDef, Unit } from "@domain/public";
import { applyStatus, remainingCooldownTicks } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
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

/** The curse's cast point, the silence it applies, and its clock, in ticks. */
const CAST_POINT_TICKS = Math.round(
  silenceCurseDef.castPointSeconds * tuningTable.sim_hz,
);
const SILENCE_TICKS = Math.round(
  silenceCurseDef.effects[0].seconds * tuningTable.sim_hz,
);
const COOLDOWN_TICKS = Math.round(
  silenceCurseDef.cooldownSeconds[0] * tuningTable.sim_hz,
);

/** Every slot key the ability bar shows, which a silence blocks. */
const ALL_SLOTS = [1, 2, 3, 4, 5, 6];

/** Where the curser stands: inside its aggro radius and the curse's range, outside its melee reach. */
const CURSER_X = 400;

/** A stun long enough to outlast the cast point it lands in. */
const STUN_TICKS = 30;

/** Long enough for the hero to turn about and take some steps, well inside the silence. */
const WALK_TICKS = 20;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 300;

/** A melee chaser that casts the curse. */
const CURSER: EnemyDef = makeEnemyDef.build({
  id: "curser",
  behaviour: "melee_chaser",
  health: 5000,
  aggroRadius: 700,
  leashRadius: 2000,
  abilities: [silenceCurseDef.id],
  attack: makeAttackDef.build({
    range: 100,
    acquireRadius: 700,
    projectileSpeed: 0,
    projectileRadius: 0,
  }),
});

type Arranged = Readonly<{
  world: Simulation;
  hero: Unit;
  heroId: EntityId;
  curser: Unit;
  curserId: EntityId;
}>;

/** A world with the curser beside the content's abilities, the hero at the origin, and one curser in range. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      enemies: [CURSER],
      tuning: { wander_radius: 0 },
    }),
  });
  const hero = spawnHero(world);
  const curser = spawnEnemy(world, {
    definitionId: CURSER.id,
    x: CURSER_X,
    y: 0,
  });

  return {
    world,
    hero,
    heroId: unitIdOf(world, hero),
    curser,
    curserId: unitIdOf(world, curser),
  };
};

const silenceRowOf = (unit: Readonly<Unit>) =>
  unit.statuses.find((row) => row.definitionId === "silence");

const inCastPoint = (unit: Readonly<Unit>) => (): boolean =>
  unit.state === "ability_cast_point";

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

describe("the silence curse", () => {
  it("is cast at the hero once the curser sees it, and silences it for the curse's duration once the cast point ends", () => {
    const { world, hero, heroId, curser, curserId } = arrange();

    tickUntil(world, inCastPoint(curser), PATIENCE);

    expect(curser.cast.abilityId).toBe(silenceCurseDef.id);
    expect(curser.cast.targetId).toBe(heroId);

    const ticks = tickUntil(
      world,
      () => silenceRowOf(hero) !== undefined,
      PATIENCE,
    );

    expect(ticks).toBeLessThanOrEqual(CAST_POINT_TICKS);
    expect(silenceRowOf(hero)?.sourceId).toBe(curserId);
    expect(silenceRowOf(hero)?.endsAtTick).toBe(
      world.state.tick - 1 + SILENCE_TICKS,
    );
    expect(
      remainingCooldownTicks(
        curser.cooldowns,
        silenceCurseDef.id,
        world.state.tick,
      ),
    ).toBe(COOLDOWN_TICKS - 1);
  });

  it("greys every key on the HUD while it lasts, and gives them back when it ends", () => {
    const { world, hero, curser } = arrange();

    tickUntil(world, inCastPoint(curser), PATIENCE);
    tickUntil(world, () => silenceRowOf(hero) !== undefined, PATIENCE);
    world.tick();

    expect(hero.disables.silenced).toBe(true);
    expect(greyedSlots(world, hero)).toEqual(ALL_SLOTS);

    tickUntil(world, () => silenceRowOf(hero) === undefined, SILENCE_TICKS);
    world.tick();

    expect(greyedSlots(world, hero)).toEqual([]);
  });

  it("leaves the hero walking: silence blocks abilities only", () => {
    const { world, hero, curser } = arrange();

    tickUntil(world, inCastPoint(curser), PATIENCE);
    tickUntil(world, () => silenceRowOf(hero) !== undefined, PATIENCE);
    world.tick();
    submit(world, {
      kind: "move",
      tick: world.view.tick,
      timestamp: world.view.tick,
      destination: { x: -2000, y: 0 },
    });

    const before = hero.curr.x;

    tickTimes(world, WALK_TICKS);

    expect(hero.order.kind).toBe("move");
    expect(hero.curr.x).toBeLessThan(before);
  });

  it("is cancelled at no cost by a stun during its cast point: no silence lands and the clock does not start", () => {
    const { world, hero, curser, curserId } = arrange();

    tickUntil(world, inCastPoint(curser), PATIENCE);
    applyStatus(world.state, curserId, "stun", STUN_TICKS, null, []);
    tickTimes(world, CAST_POINT_TICKS);

    expect(silenceRowOf(hero)).toBeUndefined();
    expect(
      remainingCooldownTicks(
        curser.cooldowns,
        silenceCurseDef.id,
        world.state.tick,
      ),
    ).toBe(0);
  });
});
