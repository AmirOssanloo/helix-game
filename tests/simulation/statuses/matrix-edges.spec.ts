import { describe, expect, it } from "vitest";
import {
  bashDef,
  frostAttackDef,
  heroDef,
  rootNetDef,
  silenceCurseDef,
  slamDef,
  statuses,
  tuningTable,
} from "@content/public";
import type { DomainEvent, EnemyDef, MapDef, Unit } from "@domain/public";
import {
  applyDamage,
  applyStatus,
  remainingCooldownTicks,
} from "@domain/public";
import { createGroundPick, InputMapper } from "@presentation/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  always,
  CommandRecorder,
  FixedLens,
  IntentRecorder,
  makeAttackDef,
  makeEnemyDef,
  makeFormDef,
  makeMapDef,
  makeRegistry,
  makeSpellDef,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** How long the bash stuns the unit hit, in ticks. */
const BASH_STUN_TICKS =
  bashDef.onDamageDealt.effects[0].seconds * tuningTable.sim_hz;

/** The curse's cast point, in ticks. */
const CURSE_CAST_POINT_TICKS = Math.round(
  silenceCurseDef.castPointSeconds * tuningTable.sim_hz,
);

/** The root the net carries, in ticks. */
const NET_ROOT_TICKS = Math.round(
  rootNetDef.effects[0].onHit[0].seconds * tuningTable.sim_hz,
);

/** The slam's circle and how far it pushes. */
const SLAM_RADIUS = slamDef.effects[0].target.radius;
const PUSH_DISTANCE = slamDef.effects[1].distance.byLevel[0];

/** The fraction the generic slow the frost attack applies takes off the speed. */
const SLOW_FRACTION =
  statuses.find((status) => status.id === "slow")?.modifiers[0]?.amount
    .byLevel[0] ?? 0;

/** A base speed low enough that the frost attack's slow would take it below the minimum. */
const CRAWLING_MS = 120;

/** The walking step at the minimum speed, in world units per tick. */
const MINIMUM_STEP = tuningTable.ms_min / tuningTable.sim_hz;

/** A hit the spec lands by hand, small against the hero's health. */
const HIT = 1;

/** A hit no health survives. */
const LETHAL = 100_000;

/** A lift long enough to outlast the net's root and every push. */
const LIFT_TICKS = NET_ROOT_TICKS + 30;

/** A stun long enough to outlast a bash's. */
const LONG_STUN_TICKS = BASH_STUN_TICKS * 4;

/** Long enough that the root holding a slammer outlasts every case. */
const ROOTED_TICKS = 100_000;

/** Long enough for any case below to reach the stage it waits for. */
const PATIENCE = 300;

/** Long enough for the hero to turn about and take some steps. */
const WALK_TICKS = 20;

/** Where each enemy stands: inside its aggro radius of the hero at the origin and its ability's range, outside its reach. */
const CURSER_X = 400;
const NETTER_X = 500;
const SLAMMER_X = 150;

/** Where an enemy that never moves stands: behind the hero, out of the way of its walk. */
const BEHIND_X = -300;

/** Where the wall's near face stands, behind the hero, well short of where a slam's push would end. */
const WALL_X = -100;

/** The slot keys the prepared spells sit on, and the orb key a skill point is spent on. */
const Q = 1;

/** A spell whose cast point is long enough for a stun to land inside it. */
const LONG_CAST_POINT = makeSpellDef.build({
  recipe: ["quartz", "quartz", "quartz"],
  targeting: "none",
  range: 0,
  castPointSeconds: 1,
});

/** What the spell below costs at every level. */
const MANA_COST = 50;

/** A spell whose backswing is long enough for a stun to land inside it, after its commit. */
const LONG_BACKSWING = makeSpellDef.build({
  recipe: ["ember", "ember", "ember"],
  targeting: "none",
  range: 0,
  backswingSeconds: 2,
  manaCost: [
    MANA_COST,
    MANA_COST,
    MANA_COST,
    MANA_COST,
    MANA_COST,
    MANA_COST,
    MANA_COST,
  ],
});

/** A spell aimed at a unit, whose cursor stays open until a click. */
const AIMED = makeSpellDef.build({
  recipe: ["whorl", "whorl", "whorl"],
  targeting: "unit",
});

/** The cast points of the two spells above, in ticks. */
const LONG_CAST_POINT_TICKS = Math.round(
  LONG_CAST_POINT.castPointSeconds * tuningTable.sim_hz,
);
const LONG_BACKSWING_TICKS = Math.round(
  LONG_BACKSWING.backswingSeconds * tuningTable.sim_hz,
);

const form = makeFormDef.build({
  abilities: [LONG_CAST_POINT.id, LONG_BACKSWING.id, AIMED.id],
});

/** A melee chaser's swing, which reaches only what stands beside it. */
const meleeAttack = () =>
  makeAttackDef.build({
    range: 100,
    acquireRadius: 800,
    projectileSpeed: 0,
    projectileRadius: 0,
  });

/** A melee chaser that casts the curse. */
const CURSER: EnemyDef = makeEnemyDef.build({
  id: "curser",
  behaviour: "melee_chaser",
  health: 5000,
  aggroRadius: 800,
  leashRadius: 2000,
  abilities: [always(silenceCurseDef.id)],
  attack: meleeAttack(),
});

/** A melee chaser that throws the net. */
const NETTER: EnemyDef = makeEnemyDef.build({
  id: "netter",
  behaviour: "melee_chaser",
  health: 5000,
  aggroRadius: 800,
  leashRadius: 2000,
  abilities: [always(rootNetDef.id)],
  attack: meleeAttack(),
});

/** A slammer whose swing reaches nothing, so all the hero takes is the slam's. */
const SLAMMER: EnemyDef = makeEnemyDef.build({
  id: "slammer",
  behaviour: "melee_chaser",
  health: 5000,
  aggroRadius: 800,
  leashRadius: 2000,
  abilities: [
    {
      id: slamDef.id,
      condition: { kind: "target_within", distance: SLAM_RADIUS - 50 },
    },
  ],
  attack: makeAttackDef.build({
    range: 0,
    acquireRadius: 800,
    projectileSpeed: 0,
    projectileRadius: 0,
  }),
});

/** A basher that stands and never swings, for hits the spec lands by hand. */
const STILL_BASHER: EnemyDef = makeEnemyDef.build({
  id: "still_basher",
  health: 5000,
  statuses: [bashDef.id],
});

/** A froster that stands and never swings, for hits the spec lands by hand. */
const STILL_FROSTER: EnemyDef = makeEnemyDef.build({
  id: "still_froster",
  health: 5000,
  statuses: [frostAttackDef.id],
});

/** An enemy that stands and does nothing, for the hero to walk or be pushed into. */
const STANDER: EnemyDef = makeEnemyDef.build({
  id: "stander",
  health: 5000,
  attack: makeAttackDef.build({ range: 0 }),
});

type Arranged = Readonly<{ world: Simulation; hero: Unit; heroId: EntityId }>;

type ArrangeOptions = Readonly<{
  map?: MapDef;
  baseSpeed?: number;
}>;

/**
 * A world holding every archetype above beside the content's abilities, with the hero at the
 * origin facing +X, every orb at level one, and the long cast point and the long backswing
 * prepared in D and F.
 */
const arrange = (options: ArrangeOptions = {}): Arranged => {
  const world = makeWorld({
    seed: 1,
    map: options.map ?? makeMapDef.build(),
    registry: makeRegistry({
      hero: { ...heroDef, forms: [form.id] },
      forms: [form],
      spells: [LONG_CAST_POINT, LONG_BACKSWING, AIMED],
      enemies: [CURSER, NETTER, SLAMMER, STILL_BASHER, STILL_FROSTER, STANDER],
      tuning: {
        wander_radius: 0,
        base_ms: options.baseSpeed ?? tuningTable.base_ms,
      },
    }),
  });
  const hero = spawnHero(world, { orbLevels: [1, 1, 1] });

  prepare(world, [LONG_CAST_POINT.id, LONG_BACKSWING.id]);

  return { world, hero, heroId: unitIdOf(world, hero) };
};

/** Puts `prepared` in the hero's D and F. */
const prepare = (world: Simulation, prepared: readonly string[]): void => {
  const record = world.state.run.forms[0];

  if (record === undefined) {
    throw new Error("The hero has a form");
  }

  for (let index = 0; index < prepared.length; index += 1) {
    record.kit.prepared[index] = prepared[index] ?? null;
  }
};

/** Spawns one of `def` at (`x`, `y`) and returns it with its id. */
const place = (
  world: Simulation,
  def: EnemyDef,
  x: number,
  y = 0,
): { unit: Unit; id: EntityId } => {
  const unit = spawnEnemy(world, { definitionId: def.id, x, y });

  return { unit, id: unitIdOf(world, unit) };
};

/** A slammer at (`x`, `y`), rooted, so where a case puts it is where it slams from. */
const placeSlammer = (world: Simulation, x: number, y = 0): Unit => {
  const slammer = place(world, SLAMMER, x, y);

  applyStatus(world.state, slammer.id, "root", ROOTED_TICKS, null, []);

  return slammer.unit;
};

/** A mapper over the world, as the scene builds one, recording what it sends and refuses. */
const mapperOver = (world: Simulation) => {
  const driver = new CommandRecorder(world);
  const intents = new IntentRecorder();
  const mapper = new InputMapper({
    driver,
    lens: new FixedLens(),
    world: world.view,
    intents,
    groundPick: createGroundPick(),
  });

  return { driver, intents, mapper };
};

const rowOf = (unit: Readonly<Unit>, statusId: string) =>
  unit.statuses.find((row) => row.definitionId === statusId);

const liveRows = (unit: Readonly<Unit>): string[] =>
  unit.statuses.flatMap((row) =>
    row.definitionId === null ? [] : [row.definitionId],
  );

const inCastPoint = (unit: Readonly<Unit>) => (): boolean =>
  unit.state === "ability_cast_point";

const tickTimes = (world: Simulation, ticks: number): void => {
  for (let count = 0; count < ticks; count += 1) {
    world.tick();
  }
};

/** The hero's mana, which lives on its active form. */
const heroMana = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.mana ?? Number.NaN;

/** Puts `statusId` on the hero for `ticks`, from nobody. */
const put = (
  world: Simulation,
  heroId: EntityId,
  statusId: string,
  ticks: number,
): void => {
  applyStatus(world.state, heroId, statusId, ticks, null, [1, 1, 1]);
};

/** Lands a small hit on the hero from `sourceId`, so the source's damage-dealt hook answers it. */
const hitFrom = (
  world: Simulation,
  heroId: EntityId,
  sourceId: EntityId,
): void => {
  applyDamage(world.state, heroId, HIT, "pure", sourceId);
};

const castNone = (world: Simulation, abilityId: string): void => {
  submit(world, {
    kind: "cast",
    tick: world.view.tick,
    timestamp: world.view.tick,
    abilityId,
    target: { kind: "none" },
  });
};

const moveTo = (world: Simulation, x: number, y: number): void => {
  submit(world, {
    kind: "move",
    tick: world.view.tick,
    timestamp: world.view.tick,
    destination: { x, y },
  });
};

const spend = (world: Simulation, slot: number): void => {
  submit(world, {
    kind: "spend_skill_point",
    tick: world.view.tick,
    timestamp: world.view.tick,
    slot,
  });
};

/** Every event of `kind` the reader has not seen, advancing it past everything. */
const eventsOfKind = (
  world: Simulation,
  reader: EventReader,
  kind: DomainEvent["kind"],
): DomainEvent[] => {
  const found: DomainEvent[] = [];
  let event = world.events.read(reader);

  while (event !== null) {
    if (event.kind === kind) {
      found.push({ ...event });
    }

    event = world.events.read(reader);
  }

  return found;
};

/** Ticks until the curser has silenced the hero, then once more so the status pass raises the flag. */
const curseTheHero = (world: Simulation, hero: Unit, curser: Unit): void => {
  tickUntil(world, inCastPoint(curser), PATIENCE);
  tickUntil(world, () => rowOf(hero, "silence") !== undefined, PATIENCE);
  world.tick();
};

/** Ticks until the netter's net has rooted the hero, then once more so the status pass raises the flag. */
const netTheHero = (world: Simulation, hero: Unit, netter: Unit): void => {
  tickUntil(world, inCastPoint(netter), PATIENCE);
  tickUntil(world, () => rowOf(hero, "root") !== undefined, PATIENCE);
  world.tick();
};

/** Ticks through the slam's cast point to the tick after it lands. */
const slam = (world: Simulation, slammer: Unit): void => {
  tickUntil(world, inCastPoint(slammer), PATIENCE);
  tickUntil(world, () => slammer.state !== "ability_cast_point", PATIENCE);
};

/** Ticks until no push has hold of `units`, so each stands where its push left it. */
const settle = (world: Simulation, units: readonly Unit[]): void => {
  tickUntil(
    world,
    () => units.every((unit) => unit.push.ticksLeft === 0),
    PATIENCE,
  );
};

/** How far the hero walks in one tick along +X, which it already faces, once it is under way. */
const stepOf = (world: Simulation, hero: Unit): number => {
  moveTo(world, 5000, 0);
  world.tick();
  world.tick();

  const before = hero.curr.x;

  world.tick();

  return hero.curr.x - before;
};

describe("the status page's states, through the enemy abilities that cause them", () => {
  describe("Stunned during a cast point", () => {
    it("a bash inside the hero's cast point cancels the cast at no cost: no mana spent, no clock started, nothing committed", () => {
      const { world, hero, heroId } = arrange();
      const basher = place(world, STILL_BASHER, BEHIND_X);
      const reader = createEventReader();
      const mana = heroMana(world);

      castNone(world, LONG_CAST_POINT.id);
      world.tick();

      expect(hero.state).toBe("ability_cast_point");

      hitFrom(world, heroId, basher.id);

      expect(rowOf(hero, "stun")?.sourceId).toBe(basher.id);

      tickTimes(world, LONG_CAST_POINT_TICKS);

      expect(hero.state).toBe("idle");
      expect(heroMana(world)).toBe(mana);
      expect(
        remainingCooldownTicks(
          hero.cooldowns,
          LONG_CAST_POINT.id,
          world.state.tick,
        ),
      ).toBe(0);
      expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
    });
  });

  describe("Stunned after the cast point", () => {
    it("a bash in the backswing leaves the committed spell resolved: mana spent and the clock running", () => {
      const { world, hero, heroId } = arrange();
      const basher = place(world, STILL_BASHER, BEHIND_X);
      const reader = createEventReader();
      const mana = heroMana(world);

      castNone(world, LONG_BACKSWING.id);
      tickUntil(world, () => hero.state === "ability_backswing", PATIENCE);
      hitFrom(world, heroId, basher.id);
      world.tick();

      expect(hero.disables.stunned).toBe(true);
      expect(eventsOfKind(world, reader, "cast_committed")).toHaveLength(1);
      expect(heroMana(world)).toBe(mana - MANA_COST);
      expect(
        remainingCooldownTicks(
          hero.cooldowns,
          LONG_BACKSWING.id,
          world.state.tick,
        ),
      ).toBeGreaterThan(0);
      expect(hero.state).not.toBe("ability_backswing");
      expect(LONG_BACKSWING_TICKS).toBeGreaterThan(BASH_STUN_TICKS);
    });
  });

  describe("Silenced or stunned while the targeting cursor is open", () => {
    it("the curse closes an open spell cursor at no cost, and leaves an attack-move cursor open", () => {
      const { world, hero } = arrange();
      const curser = place(world, CURSER, CURSER_X);
      const { driver, intents, mapper } = mapperOver(world);
      const mana = heroMana(world);

      prepare(world, [AIMED.id]);
      mapper.keyDown("KeyD");

      expect(mapper.cursor.kind).toBe("slot");

      curseTheHero(world, hero, curser.unit);
      mapper.syncCursor();

      expect(mapper.cursor.kind).toBe("closed");
      expect(driver.commands).toEqual([]);
      expect(intents.refusals).toEqual([]);
      expect(heroMana(world)).toBe(mana);

      mapper.keyDown("KeyA");
      mapper.syncCursor();

      expect(mapper.cursor.kind).toBe("attack_move");
    });

    it.each(["KeyD", "KeyA"])(
      "a bash closes the cursor %s opened, at no cost",
      (code) => {
        const { world, heroId } = arrange();
        const basher = place(world, STILL_BASHER, BEHIND_X);
        const { driver, intents, mapper } = mapperOver(world);

        prepare(world, [AIMED.id]);
        mapper.keyDown(code);

        expect(mapper.cursor.kind).not.toBe("closed");

        hitFrom(world, heroId, basher.id);
        world.tick();
        mapper.syncCursor();

        expect(mapper.cursor.kind).toBe("closed");
        expect(driver.commands).toEqual([]);
        expect(intents.refusals).toEqual([]);
      },
    );
  });

  describe("Silenced with a move running", () => {
    it("the curse leaves the move running: the hero keeps walking", () => {
      const { world, hero } = arrange();
      const curser = place(world, CURSER, CURSER_X);

      tickUntil(world, inCastPoint(curser.unit), PATIENCE);
      moveTo(world, 0, 2000);
      tickUntil(world, () => rowOf(hero, "silence") !== undefined, PATIENCE);
      world.tick();

      expect(hero.disables.silenced).toBe(true);
      expect(hero.order.kind).toBe("move");

      const before = hero.curr.y;

      tickTimes(world, WALK_TICKS);

      expect(hero.curr.y).toBeGreaterThan(before);
    });
  });

  describe("Stunned or silenced with a skill point unspent", () => {
    it("the point is spent under the curse's silence", () => {
      const { world, hero } = arrange();
      const curser = place(world, CURSER, CURSER_X);

      hero.progression.skillPoints = 1;
      curseTheHero(world, hero, curser.unit);
      spend(world, Q);
      world.tick();

      expect(hero.disables.silenced).toBe(true);
      expect(world.view.run.forms[0]?.kit.orbLevels[0]).toBe(2);
      expect(hero.progression.skillPoints).toBe(0);
    });

    it("the point is spent under a bash's stun", () => {
      const { world, hero, heroId } = arrange();
      const basher = place(world, STILL_BASHER, BEHIND_X);

      hero.progression.skillPoints = 1;
      hitFrom(world, heroId, basher.id);
      world.tick();
      spend(world, Q);
      world.tick();

      expect(hero.disables.stunned).toBe(true);
      expect(world.view.run.forms[0]?.kit.orbLevels[0]).toBe(2);
      expect(hero.progression.skillPoints).toBe(0);
    });
  });

  describe("Rooted while lifted by Updraft", () => {
    it("lift wins over the net's root: the root keeps counting in the air and the hero comes down on the spot it was lifted from", () => {
      const { world, hero, heroId } = arrange();
      const netter = place(world, NETTER, NETTER_X);

      netTheHero(world, hero, netter.unit);

      const rootEnds = rowOf(hero, "root")?.endsAtTick;
      const x = hero.curr.x;
      const y = hero.curr.y;

      put(world, heroId, "updraft_lift", LIFT_TICKS);
      world.tick();

      expect(hero.disables.lifted).toBe(true);
      expect(hero.disables.rooted).toBe(true);
      expect(rowOf(hero, "root")?.endsAtTick).toBe(rootEnds);

      tickUntil(world, () => !hero.disables.rooted, PATIENCE);

      expect(world.state.tick - 1).toBe(rootEnds);
      expect(hero.disables.lifted).toBe(true);

      tickUntil(world, () => !hero.disables.lifted, PATIENCE);

      expect(hero.curr.x).toBe(x);
      expect(hero.curr.y).toBe(y);
    });
  });

  describe("Lifted with a move running", () => {
    it("the move is put aside in the air and walked again from the drop", () => {
      const { world, hero, heroId } = arrange();

      moveTo(world, 2000, 0);
      tickTimes(world, WALK_TICKS);
      put(world, heroId, "lift", LIFT_TICKS);
      world.tick();

      const x = hero.curr.x;

      expect(hero.order.kind).toBe("none");
      expect(hero.suspended.kind).toBe("move");

      tickUntil(
        world,
        () => rowOf(hero, "lift")?.endsAtTick === world.state.tick,
        PATIENCE,
      );

      expect(hero.disables.lifted).toBe(true);
      expect(hero.curr.x).toBe(x);

      world.tick();

      expect(hero.disables.lifted).toBe(false);
      expect(hero.order.kind).toBe("move");

      tickTimes(world, WALK_TICKS);

      expect(hero.curr.x).toBeGreaterThan(x);
    });
  });

  describe("Rooted during a move", () => {
    it("the net clears the move: the hero stands until the root expires and does not resume it", () => {
      const { world, hero } = arrange();
      const netter = place(world, NETTER, NETTER_X);

      tickUntil(world, inCastPoint(netter.unit), PATIENCE);
      moveTo(world, 0, -2000);
      tickUntil(world, () => rowOf(hero, "root") !== undefined, PATIENCE);
      world.tick();

      const y = hero.curr.y;

      expect(hero.disables.rooted).toBe(true);
      expect(hero.order.kind).toBe("none");

      tickUntil(world, () => !hero.disables.rooted, PATIENCE);
      tickTimes(world, WALK_TICKS);

      expect(hero.order.kind).not.toBe("move");
      expect(hero.curr.y).toBeGreaterThanOrEqual(y);
    });
  });

  describe("Knocked back into an obstacle", () => {
    it("the slam's push stops at the obstacle's edge", () => {
      const { world, hero } = arrange({
        map: makeMapDef.build({
          obstacles: [
            { minX: WALL_X - 400, minY: -2000, maxX: WALL_X, maxY: 2000 },
          ],
        }),
      });
      const slammer = placeSlammer(world, SLAMMER_X);

      slam(world, slammer);
      settle(world, [hero]);

      expect(hero.curr.x - hero.collisionRadius).toBeGreaterThanOrEqual(
        WALL_X - 1e-6,
      );
      expect(hero.curr.x - hero.collisionRadius).toBeLessThan(WALL_X + 1);
    });
  });

  describe("Knocked back while lifted, or lifted while knocked back", () => {
    it("a lift mid-push holds the hero where it was lifted: the rest of the slam's push is spent in the air", () => {
      const { world, hero, heroId } = arrange();
      const slammer = placeSlammer(world, SLAMMER_X);

      slam(world, slammer);
      world.tick();

      expect(hero.push.ticksLeft).toBeGreaterThan(0);

      const x = hero.curr.x;
      const y = hero.curr.y;

      put(world, heroId, "lift", LIFT_TICKS);
      world.tick();

      expect(hero.disables.lifted).toBe(true);

      tickUntil(world, () => !hero.disables.lifted, PATIENCE);

      expect(hero.push.ticksLeft).toBe(0);
      expect(hero.curr.x).toBe(x);
      expect(hero.curr.y).toBe(y);
    });

    it("a slam on a lifted hero moves it nowhere, and it comes down on the spot it was lifted from", () => {
      const { world, hero, heroId } = arrange();
      const slammer = placeSlammer(world, SLAMMER_X);

      tickUntil(world, inCastPoint(slammer), PATIENCE);

      const x = hero.curr.x;
      const y = hero.curr.y;

      put(world, heroId, "lift", LIFT_TICKS);
      world.tick();

      expect(hero.disables.lifted).toBe(true);

      tickUntil(world, () => !hero.disables.lifted, PATIENCE);

      expect(rowOf(hero, "knockback")).toBeUndefined();
      expect(hero.curr.x).toBe(x);
      expect(hero.curr.y).toBe(y);
    });
  });

  describe("A unit walks into a lifted unit", () => {
    it("the hero walking through a lifted enemy is pushed round it, and the lifted enemy is not moved", () => {
      const { world, hero } = arrange();
      const stander = place(world, STANDER, 200, 10);

      applyStatus(world.state, stander.id, "lift", LIFT_TICKS, null, []);
      world.tick();

      const x = stander.unit.curr.x;
      const y = stander.unit.curr.y;

      moveTo(world, 400, 0);
      tickUntil(world, () => hero.curr.x > 300, LIFT_TICKS - 1);

      expect(stander.unit.disables.lifted).toBe(true);
      expect(stander.unit.curr.x).toBe(x);
      expect(stander.unit.curr.y).toBe(y);
    });
  });

  describe("Pushed into another unit", () => {
    it("the slam pushes the hero into a unit behind it, and the two are pushed apart until they just touch", () => {
      const { world, hero } = arrange();
      const slammer = placeSlammer(world, SLAMMER_X);
      const stander = place(world, STANDER, -120);
      const start = stander.unit.curr.x;

      slam(world, slammer);
      settle(world, [hero]);
      world.tick();

      const apart = Math.hypot(
        hero.curr.x - stander.unit.curr.x,
        hero.curr.y - stander.unit.curr.y,
      );

      expect(stander.unit.curr.x).toBeLessThan(start);
      expect(apart).toBeGreaterThanOrEqual(
        hero.collisionRadius + stander.unit.collisionRadius - 1e-6,
      );
    });
  });

  describe("Two pushes in the same tick", () => {
    it("of two slams landing on one tick, the first applied carries the hero its whole distance and the second is ignored", () => {
      const { world, hero, heroId } = arrange();
      const east = placeSlammer(world, SLAMMER_X, 0);
      const north = placeSlammer(world, 0, SLAMMER_X);
      const reader = createEventReader();

      slam(world, east);

      expect(
        remainingCooldownTicks(east.cooldowns, slamDef.id, world.state.tick),
      ).toBe(
        remainingCooldownTicks(north.cooldowns, slamDef.id, world.state.tick),
      );

      settle(world, [hero]);

      const knockbacks = eventsOfKind(world, reader, "status_applied").filter(
        (event) => event.unitId === heroId && event.statusId === "knockback",
      );
      const along = [Math.abs(hero.curr.x), Math.abs(hero.curr.y)].sort(
        (a, b) => a - b,
      );

      expect(knockbacks).toHaveLength(1);
      expect(along[0]).toBeCloseTo(0, 6);
      expect(along[1]).toBeCloseTo(PUSH_DISTANCE, 0);
    });
  });

  describe("Slowed below the minimum speed", () => {
    it("the frost attack's slow on a hero this slow clamps its walk at the minimum speed", () => {
      const { world, hero, heroId } = arrange({ baseSpeed: CRAWLING_MS });
      const froster = place(world, STILL_FROSTER, BEHIND_X);

      expect(CRAWLING_MS * (1 + SLOW_FRACTION)).toBeLessThan(
        tuningTable.ms_min,
      );

      hitFrom(world, heroId, froster.id);

      expect(stepOf(world, hero)).toBeCloseTo(MINIMUM_STEP);
    });
  });

  describe("Two stuns at once", () => {
    it("a second bash refreshes the first: one row, ending where the later one ends", () => {
      const { world, hero, heroId } = arrange();
      const first = place(world, STILL_BASHER, BEHIND_X);
      const second = place(world, STILL_BASHER, BEHIND_X, 200);

      hitFrom(world, heroId, first.id);
      tickTimes(world, BASH_STUN_TICKS / 2);
      hitFrom(world, heroId, second.id);

      expect(liveRows(hero).filter((id) => id === "stun")).toHaveLength(1);
      expect(rowOf(hero, "stun")?.endsAtTick).toBe(
        world.state.tick + BASH_STUN_TICKS,
      );
    });

    it("a bash under a longer stun leaves the longer end standing", () => {
      const { world, hero, heroId } = arrange();
      const basher = place(world, STILL_BASHER, BEHIND_X);

      put(world, heroId, "stun", LONG_STUN_TICKS);
      world.tick();
      hitFrom(world, heroId, basher.id);

      expect(liveRows(hero).filter((id) => id === "stun")).toHaveLength(1);
      expect(rowOf(hero, "stun")?.endsAtTick).toBe(LONG_STUN_TICKS);
    });
  });

  describe("Status on a dying unit", () => {
    it("the curse's silence is cleared with the hero's death", () => {
      const { world, hero, heroId } = arrange();
      const curser = place(world, CURSER, CURSER_X);

      curseTheHero(world, hero, curser.unit);
      applyDamage(world.state, heroId, LETHAL, "pure", curser.id);
      world.tick();

      expect(hero.state).toBe("dead");
      expect(liveRows(hero)).toEqual([]);
      expect(hero.disables.silenced).toBe(false);
    });
  });

  describe("Status on a unit that becomes untargetable", () => {
    it("the net's root keeps counting while a lift holds the hero out of reach", () => {
      const { world, hero, heroId } = arrange();
      const netter = place(world, NETTER, NETTER_X);

      netTheHero(world, hero, netter.unit);

      const rootEnds = rowOf(hero, "root")?.endsAtTick;

      put(world, heroId, "lift", LIFT_TICKS);
      world.tick();

      expect(hero.disables.untargetable).toBe(true);
      expect(rowOf(hero, "root")?.endsAtTick).toBe(rootEnds);

      tickUntil(world, () => rowOf(hero, "root") === undefined, PATIENCE);

      expect(world.state.tick - 1).toBe(rootEnds);
      expect(hero.disables.untargetable).toBe(true);
    });

    it("a curse whose cast point ends while a lift holds the hero lands no silence", () => {
      const { world, hero, heroId } = arrange();
      const curser = place(world, CURSER, CURSER_X);

      tickUntil(world, inCastPoint(curser.unit), PATIENCE);
      put(world, heroId, "lift", LIFT_TICKS);
      tickTimes(world, CURSE_CAST_POINT_TICKS + 1);

      expect(hero.disables.untargetable).toBe(true);
      expect(rowOf(hero, "silence")).toBeUndefined();
    });
  });
});
