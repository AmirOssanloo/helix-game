import { describe, expect, it } from "vitest";
import {
  bruteDef,
  contentRegistry,
  hexerDef,
  lancerDef,
  meleeGruntDef,
  skirmisherDef,
} from "@content/public";
import type { EnemyDef, EnemyTier, Unit } from "@domain/public";
import { applyStatus } from "@domain/public";
import type { EntityId, Vec2 } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  arrangeArchetype,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** Where a melee enemy spawns from the hero at the origin: inside its reach, so its first swing starts at once. */
const MELEE_AT = 60;

/** Where a kiter spawns from the hero at the origin: inside its reach and nearer than where it holds, so the hero crowds it. */
const KITER_AT = 150;

/** Where the hero walks to: west, far enough to leave any melee reach and short of any leash. */
const AWAY = { x: -600, y: 0 };

/** Long enough for any swing below to begin and end. */
const PATIENCE = 300;

/** How long the stun below holds the unit: past the end of the backswing it lands in. */
const STUN_TICKS = 20;

/** A tick no case below reaches: an ability whose clock runs to it is never ready. */
const NEVER = 1_000_000;

/**
 * The content's enemies with the brute's bash taken off. The bash would stun the hero where the
 * hit lands and end its walk; the cases below are about the swing, with the hero still walking.
 */
const ENEMIES = contentRegistry.enemies.map((def) =>
  def.id === bruteDef.id ? { ...def, statuses: [] } : def,
);

type Swung = Readonly<{
  world: Simulation;
  unit: Unit;
  unitId: EntityId;
  backswingTicks: number;
}>;

/** Orders the hero to walk to `destination`. */
const walkHero = (world: Simulation, destination: Vec2): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination,
  });
};

/** Whether the unit stands exactly at `point`. */
const isAt = (unit: Readonly<Unit>, point: Readonly<Vec2>): boolean =>
  unit.curr.x === point.x && unit.curr.y === point.y;

/**
 * A melee enemy beside the hero at the origin, on the tick its hit lands, the hero having
 * walked west out of its reach since the attack point began.
 */
const swung = (def: EnemyDef): Swung => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      enemies: ENEMIES,
      tuning: { wander_radius: 0 },
    }),
  });

  spawnHero(world);

  const unit = spawnEnemy(world, { definitionId: def.id, x: MELEE_AT, y: 0 });
  const record = world.state.run.units.get(def.id);

  tickUntil(world, () => unit.state === "attack_windup", PATIENCE);
  walkHero(world, AWAY);
  tickUntil(world, () => unit.state === "attack_backswing", PATIENCE);

  return {
    world,
    unit,
    unitId: unitIdOf(world, unit),
    backswingTicks: record === undefined ? 0 : record.attack.backswingTicks,
  };
};

describe.each([meleeGruntDef, bruteDef])("a melee $id", (def) => {
  it("stands where its hit landed for every tick of its backswing, the hero walking away", () => {
    const { world, unit, backswingTicks } = swung(def);
    const landed = { x: unit.curr.x, y: unit.curr.y };
    let stood = 1;

    world.tick();

    while (unit.state === "attack_backswing" && isAt(unit, landed)) {
      stood += 1;
      world.tick();
    }

    expect(stood).toBe(backswingTicks);
  });

  it("chases the hero from the tick after its backswing ends", () => {
    const { world, unit } = swung(def);

    tickUntil(world, () => unit.state !== "attack_backswing", PATIENCE);
    world.tick();

    expect([unit.ai.state, unit.order.kind]).toEqual(["chase", "move"]);
  });

  it("acts on the tick a stun in its backswing ends, as it always has", () => {
    const { world, unit, unitId } = swung(def);

    world.tick();
    applyStatus(world.state, unitId, "stun", STUN_TICKS, null, []);
    world.tick();

    expect(unit.state).toBe("idle");

    tickUntil(world, () => !unit.disables.stunned, PATIENCE);

    expect([unit.ai.state, unit.order.kind]).toEqual(["chase", "move"]);
  });
});

/**
 * A unit of `def` at `tier` beside the hero, who stands at the origin, on the tick its hit
 * lands, every ability its tier lists held on its clock until then and `abilityId` ready from
 * that tick, so the only thing between it and the cast is its backswing.
 */
const readyInBackswing = (
  def: EnemyDef,
  tier: EnemyTier,
  abilityId: string,
  at: number,
): Swung => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      enemies: ENEMIES,
      tuning: { wander_radius: 0 },
    }),
  });

  spawnHero(world);

  const unit = spawnEnemy(world, { definitionId: def.id, x: at, y: 0 });
  const record = world.state.run.units.get(def.id);

  if (record === undefined) {
    throw new Error(`The registry holds an archetype ${def.id}`);
  }

  unit.tier = tier;

  for (const entry of record.abilitiesByTier[tier]) {
    unit.cooldowns.set(entry.id, NEVER);
  }

  tickUntil(world, () => unit.state === "attack_backswing", PATIENCE);
  unit.cooldowns.set(abilityId, 0);

  return {
    world,
    unit,
    unitId: unitIdOf(world, unit),
    backswingTicks: record.attack.backswingTicks,
  };
};

describe.each([
  { def: meleeGruntDef, tier: "elite", abilityId: "slam" },
  { def: bruteDef, tier: "boss", abilityId: "charge" },
  { def: lancerDef, tier: "normal", abilityId: "charge" },
] as const)("a melee $def.id at $tier tier", ({ def, tier, abilityId }) => {
  it(`holds its place and its attack through the backswing with its ${abilityId} ready, and casts it on the tick after`, () => {
    const { world, unit, backswingTicks } = readyInBackswing(
      def,
      tier,
      abilityId,
      MELEE_AT,
    );
    const landed = { x: unit.curr.x, y: unit.curr.y };
    let stood = 1;

    world.tick();

    while (
      unit.state === "attack_backswing" &&
      isAt(unit, landed) &&
      unit.order.kind === "attack_target" &&
      unit.cast.abilityId === null
    ) {
      stood += 1;
      world.tick();
    }

    expect(stood).toBe(backswingTicks);
    expect(unit.cast.abilityId).toBeNull();

    world.tick();

    expect(unit.cast.abilityId).toBe(abilityId);
  });
});

describe("a melee grunt at elite tier with its slam ready from the start", () => {
  it("runs the slam it began to its end, as it always has", () => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({
        enemies: ENEMIES,
        tuning: { wander_radius: 0 },
      }),
    });

    spawnHero(world);

    const unit = spawnEnemy(world, {
      definitionId: meleeGruntDef.id,
      x: MELEE_AT,
      y: 0,
    });

    unit.tier = "elite";

    tickUntil(world, () => unit.cast.abilityId === "slam", PATIENCE);
    tickUntil(world, () => unit.cast.abilityId === null, PATIENCE);

    expect(unit.cooldowns.get("slam")).toBeGreaterThan(world.view.tick);
  });
});

describe.each([
  { def: skirmisherDef, abilityId: "arrow" },
  { def: hexerDef, abilityId: "silence_curse" },
] as const)(
  "a kiter, the $def.id, with its $abilityId ready",
  ({ def, abilityId }) => {
    it("casts it in its backswing, as it always has", () => {
      const { world, unit } = readyInBackswing(
        def,
        "normal",
        abilityId,
        KITER_AT,
      );

      world.tick();

      expect(unit.cast.abilityId).toBe(abilityId);
    });
  },
);

describe.each([skirmisherDef, hexerDef])("a kiter, the $id", (def) => {
  it("backs away from a hero that crowds it on the tick after its shot, in its backswing", () => {
    const { world, unit } = arrangeArchetype(def.id, KITER_AT);

    tickUntil(world, () => unit.state === "attack_backswing", PATIENCE);
    world.tick();

    expect([unit.ai.state, unit.order.kind]).toEqual(["attack", "move"]);
  });
});
