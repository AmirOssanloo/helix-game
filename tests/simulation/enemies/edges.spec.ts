import { describe, expect, it } from "vitest";
import {
  arenaDef,
  contentRegistry,
  meleeGruntDef,
  rangedArcherDef,
  summonAddsDef,
  summons,
  tankDef,
  trainingDummyDef,
  tuningTable,
} from "@content/public";
import type { AnyCommand, DomainEvent, Unit } from "@domain/public";
import {
  acquireUnit,
  applyDamage,
  ENEMY_LIVE_CAP,
  fillFromDefinition,
  remainingCooldownTicks,
  wearDefinition,
} from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeEnemyDef,
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The pack every case spawns in, and another for a unit that is none of its business. */
const PACK = 1;
const OTHER_PACK = 2;

/** Somewhere west the hero runs to, past every archetype's leash. */
const FAR_WEST = -6000;

/** The status Wane puts on the hero, which hides it from enemy sight, and a length no case outlasts. */
const WANE = "wane";
const WANE_TICKS = 300;

/** Far enough past any leash that a unit whose home is moved there is past it at once. */
const BEYOND_LEASH = 10000;

/** Ticks a case runs to show that nothing changed. */
const SETTLE = 60;

/** Long enough for any walk below. */
const PATIENCE = 1500;

/** How often a chasing enemy may ask for its path, in ticks, under the content table. */
const REPATH_TICKS = tuningTable.chase_repath_interval * tuningTable.sim_hz;

/** The arrival epsilon: how close a walk counts as there, and how much two pushed discs may still overlap. */
const EPSILON = tuningTable.arrival_epsilon;

type Arranged = Readonly<{ world: Simulation; hero: Unit; heroId: EntityId }>;

/** The content registry on an open map with the hero at the origin, and no wander to move anyone off their marks. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ tuning: { wander_radius: 0 } }),
  });
  const hero = spawnHero(world);

  return { world, hero, heroId: unitIdOf(world, hero) };
};

/** `command` stamped for the next tick. */
const stamp = (
  world: Simulation,
  command: Record<string, unknown>,
): AnyCommand =>
  ({
    tick: world.view.tick,
    timestamp: world.view.tick,
    ...command,
  }) as AnyCommand;

/** Orders the hero to walk to (`x`, `y`). */
const walkHero = (world: Simulation, x: number, y: number): void => {
  submit(world, stamp(world, { kind: "move", destination: { x, y } }));
};

/** An archetype's enemy of the pack at (`x`, `y`). */
const spawnAt = (
  world: Simulation,
  definitionId: string,
  x: number,
  y = 0,
): Unit => spawnEnemy(world, { definitionId, x, y, packId: PACK });

/** A pure hit of `amount` on `target` from `source`. */
const hit = (
  world: Simulation,
  target: Unit,
  amount: number,
  source: EntityId,
): void => {
  applyDamage(world.state, unitIdOf(world, target), amount, "pure", source);
};

/** Stands in for whatever carries a unit past its leash mid-point: its home moved beyond reach, which the machine reads the same way. */
const leashNow = (unit: Unit): void => {
  unit.spawnPoint.x = unit.curr.x + BEYOND_LEASH;
};

/** The unit at `index`, which the case spawned. */
const nth = (units: readonly Unit[], index: number): Unit => {
  const unit = units[index];

  if (unit === undefined) {
    throw new Error(`The case spawned a unit at ${index}`);
  }

  return unit;
};

/** Puts Wane's status on the hero for longer than any case runs. */
const wane = (world: Simulation): void => {
  submit(
    world,
    stamp(world, { kind: "apply_status", statusId: WANE, ticks: WANE_TICKS }),
  );
};

/** Every `unit_damaged` event in the log since `reader` last read it, as target and amount. */
const damageSince = (
  world: Simulation,
  reader: ReturnType<typeof createEventReader>,
): { unitId: EntityId | null; amount: number }[] => {
  const found: { unitId: EntityId | null; amount: number }[] = [];
  let event: DomainEvent | null = world.events.read(reader);

  while (event !== null) {
    if (event.kind === "unit_damaged") {
      found.push({ unitId: event.unitId, amount: event.amount });
    }

    event = world.events.read(reader);
  }

  return found;
};

/** The distance between two units' centres. */
const gap = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
  Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y);

/** The distance from a unit to its own spawn point. */
const fromHome = (unit: Readonly<Unit>): number =>
  Math.hypot(unit.curr.x - unit.spawnPoint.x, unit.curr.y - unit.spawnPoint.y);

/** A grunt that noticed the hero, followed it west past its leash, and turned home, with the hero gone far west. */
const returningGrunt = (): Arranged & { grunt: Unit } => {
  const arranged = arrange();
  const grunt = spawnAt(arranged.world, meleeGruntDef.id, 600);

  arranged.world.tick();
  walkHero(arranged.world, FAR_WEST, 0);
  tickUntil(arranged.world, () => grunt.ai.state === "return", PATIENCE);

  return { ...arranged, grunt };
};

describe("Leashed mid-attack", () => {
  it("cancels the attack point, walks home, and nothing lands", () => {
    const { world, heroId } = arrange();
    const grunt = spawnAt(world, meleeGruntDef.id, 300);
    const reader = createEventReader();

    tickUntil(world, () => grunt.state === "attack_windup", PATIENCE);
    damageSince(world, reader);
    leashNow(grunt);

    for (let tick = 0; tick < SETTLE; tick += 1) {
      world.tick();
    }

    expect([grunt.ai.state, grunt.order.kind]).toEqual(["return", "move"]);
    expect(
      damageSince(world, reader).filter((damage) => damage.unitId === heroId),
    ).toEqual([]);
  });

  it("lets an arrow already fired land on the hero", () => {
    const { world, heroId } = arrange();
    const archer = spawnAt(world, rangedArcherDef.id, 700);
    const reader = createEventReader();

    tickUntil(world, () => world.view.map.projectiles.count > 0, PATIENCE);
    damageSince(world, reader);
    leashNow(archer);
    world.tick();
    tickUntil(world, () => world.view.map.projectiles.count === 0, PATIENCE);

    expect(archer.ai.state).toBe("return");
    expect(
      damageSince(world, reader).filter((damage) => damage.unitId === heroId),
    ).toHaveLength(1);
  });
});

describe("Pack partially in aggro radius", () => {
  /** Where a grunt, an archer, and a tank of one pack stand in a row east of the hero, each outside its own aggro radius. */
  const GRUNT_OUTSIDE = meleeGruntDef.aggroRadius + 400;
  const ARCHER_OUTSIDE = rangedArcherDef.aggroRadius + 500;
  const TANK_OUTSIDE = tankDef.aggroRadius + 800;

  it("comes whole on the tick the first member sees the hero", () => {
    const { world } = arrange();
    const pack = [
      spawnAt(world, meleeGruntDef.id, meleeGruntDef.aggroRadius - 50),
      spawnAt(world, rangedArcherDef.id, ARCHER_OUTSIDE),
      spawnAt(world, tankDef.id, TANK_OUTSIDE),
    ];

    world.tick();

    expect(pack.map((member) => member.ai.state)).toEqual([
      "chase",
      "chase",
      "chase",
    ]);
  });

  it("comes whole on the tick after the furthest member is hit", () => {
    const { world, heroId } = arrange();
    const pack = [
      spawnAt(world, meleeGruntDef.id, GRUNT_OUTSIDE),
      spawnAt(world, rangedArcherDef.id, ARCHER_OUTSIDE),
      spawnAt(world, tankDef.id, TANK_OUTSIDE),
    ];

    world.tick();
    hit(world, nth(pack, 2), 1, heroId);
    world.tick();

    expect(pack.map((member) => member.ai.state)).toEqual([
      "chase",
      "chase",
      "chase",
    ]);
  });
});

describe("Hero uses Wane", () => {
  it("sends the chasing grunts home while the adjacent one keeps attacking", () => {
    const { world } = arrange();
    const adjacent = spawnAt(world, meleeGruntDef.id, 150);
    const chasing = [
      spawnAt(world, meleeGruntDef.id, meleeGruntDef.aggroRadius + 300),
      spawnAt(world, meleeGruntDef.id, meleeGruntDef.aggroRadius + 400),
    ];

    tickUntil(world, () => adjacent.ai.state === "attack", PATIENCE);
    wane(world);
    world.tick();

    expect([adjacent, ...chasing].map((member) => member.ai.state)).toEqual([
      "attack",
      "return",
      "return",
    ]);
  });

  it("sends an archer firing from range home", () => {
    const { world } = arrange();
    const archer = spawnAt(world, rangedArcherDef.id, 700);

    tickUntil(world, () => archer.ai.state === "attack", PATIENCE);
    wane(world);
    world.tick();

    expect(archer.ai.state).toBe("return");
  });
});

describe("Summon owner dies", () => {
  it("takes the summon on the same tick", () => {
    const { world, heroId } = arrange();
    const def = summons[0];
    const record =
      def === undefined ? undefined : world.state.run.units.get(def.id);
    const id = acquireUnit(world.state, "summon", 80, 0);
    const summon = id === null ? null : world.state.map.units.resolve(id);

    if (id === null || record === undefined || summon === null) {
      throw new Error("The registry holds a summon and the pool has room");
    }

    wearDefinition(summon, record);
    fillFromDefinition(summon, record, 1);
    summon.ownerId = heroId;
    submit(world, stamp(world, { kind: "kill_hero" }));
    world.tick();

    expect(world.state.map.units.resolve(id)).toBeNull();
  });
});

describe("Enemy summons adds when the live cap is reached", () => {
  it("refuses the cast and spends no cooldown", () => {
    const summoner = makeEnemyDef.build({
      id: "summoner",
      behaviour: "melee_chaser",
      aggroRadius: 800,
      leashRadius: 2000,
      abilities: [{ id: summonAddsDef.id, condition: { kind: "always" } }],
    });
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({
        enemies: [...contentRegistry.enemies, summoner],
        tuning: { wander_radius: 0 },
      }),
    });

    spawnHero(world);

    const caster = spawnAt(world, summoner.id, 300);

    for (let index = 1; index < ENEMY_LIVE_CAP; index += 1) {
      spawnEnemy(world, {
        definitionId: trainingDummyDef.id,
        x: -4000 + (index % 20) * 100,
        y: 4000 - Math.floor(index / 20) * 100,
      });
    }

    for (let tick = 0; tick < SETTLE; tick += 1) {
      world.tick();
    }

    expect(caster.cast.abilityId).toBeNull();
    expect(
      remainingCooldownTicks(
        caster.cooldowns,
        summonAddsDef.id,
        world.state.tick,
      ),
    ).toBe(0);
  });
});

describe("Dummy takes lethal damage", () => {
  it("stays alive at 1 health, and the number shows the whole hit", () => {
    const { world, heroId } = arrange();
    const dummy = spawnAt(world, trainingDummyDef.id, 300);
    const lethal = dummy.stats.maxHealth * 10;
    const reader = createEventReader();

    hit(world, dummy, lethal, heroId);
    world.tick();
    world.tick();

    expect([dummy.resources.health, dummy.ai.state]).toEqual([1, "idle"]);
    expect(damageSince(world, reader)).toEqual([
      { unitId: unitIdOf(world, dummy), amount: lethal },
    ]);
  });
});

describe("Enemy killed while returning", () => {
  it("dies normally and grants the hero its experience", () => {
    const { world, hero, heroId, grunt } = returningGrunt();

    hit(world, grunt, grunt.stats.maxHealth * 10, heroId);
    world.tick();

    expect(grunt.ai.state).toBe("dead");
    expect(hero.progression.experience).toBe(meleeGruntDef.experience);
  });
});

describe("Spawn point occupied on Return", () => {
  it("stops beside the unit standing on it and idles there", () => {
    const { world, grunt } = returningGrunt();
    const squatter = spawnEnemy(world, {
      definitionId: tankDef.id,
      x: grunt.spawnPoint.x,
      y: grunt.spawnPoint.y,
      packId: OTHER_PACK,
    });

    tickUntil(world, () => grunt.ai.state === "idle", PATIENCE);

    expect(grunt.order.kind).toBe("none");
    expect(fromHome(grunt)).toBeGreaterThan(grunt.collisionRadius);
    expect(gap(grunt, squatter)).toBeLessThanOrEqual(
      grunt.collisionRadius + squatter.collisionRadius + EPSILON,
    );
  });
});

describe("Hero dies with enemies chasing", () => {
  /** A pack of three grunts chasing a hero that is then killed where it stands, on its spawn point. */
  const killedWhileChased = (): Arranged & { pack: Unit[] } => {
    const arranged = arrange();
    const { world } = arranged;
    const pack = [600, 700, 800].map((x) =>
      spawnAt(world, meleeGruntDef.id, x),
    );

    world.tick();
    submit(world, stamp(world, { kind: "kill_hero" }));
    world.tick();

    return { ...arranged, pack };
  };

  it("keeps the pack chasing to the spawn point: nothing resets them", () => {
    const { world, hero, pack } = killedWhileChased();
    const seen = new Set<string>();

    while (hero.state === "dead") {
      world.tick();

      for (const member of pack) {
        seen.add(member.ai.state);
      }
    }

    expect([...seen]).toEqual(["chase"]);
  });

  it("gives the hero no grace period: the pack attacks on the tick after it stands up", () => {
    const { world, hero, pack } = killedWhileChased();

    tickUntil(world, () => hero.state !== "dead", PATIENCE);
    world.tick();

    expect(pack.map((member) => member.ai.state)).toContain("attack");
  });
});

describe("Enemy blocked by a pack in a corridor", () => {
  /** East of the arena's east corridor, where the pack stands, and west of it, where the hero waits. */
  const PACK_AT = { x: 3360, y: 2000 };
  const HERO_AT = { x: 2300, y: 2000 };

  it("asks for its path no more often than its re-path interval while it queues", () => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry(),
      map: arenaDef,
    });
    const hero = spawnHero(world, HERO_AT);

    submit(
      world,
      stamp(world, {
        kind: "spawn_pack",
        archetypeId: meleeGruntDef.id,
        tier: "normal",
        count: 10,
        position: PACK_AT,
      }),
    );
    world.tick();

    const units = world.state.map.units;
    const grunts: Unit[] = [];

    for (let index = 0; index < units.end; index += 1) {
      const unit = units.at(index);

      if (unit !== null && unit.definitionId === meleeGruntDef.id) {
        grunts.push(unit);
      }
    }

    const first = grunts[0];

    if (first === undefined) {
      throw new Error("The pack spawned");
    }

    hit(world, first, 1, unitIdOf(world, hero));

    const asked = grunts.map(() => [] as number[]);

    for (let tick = 0; tick < SETTLE * 6; tick += 1) {
      const before = grunts.map((grunt) => grunt.ai.repathAtTick);
      const states = grunts.map((grunt) => grunt.ai.state);

      world.tick();
      grunts.forEach((grunt, index) => {
        if (
          states[index] === "chase" &&
          grunt.ai.state === "chase" &&
          grunt.ai.repathAtTick !== before[index]
        ) {
          asked[index]?.push(world.view.tick);
        }
      });
    }

    const gaps = asked.flatMap((ticks) =>
      ticks.slice(1).map((tick, index) => tick - (ticks[index] ?? 0)),
    );

    expect(gaps.length).toBeGreaterThan(0);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(REPATH_TICKS);
  });
});

describe("Enemies pushed off the spawn point on the first tick", () => {
  /** Three grunts all spawned on one point, far enough from the hero to rest. */
  const STACK_AT = meleeGruntDef.aggroRadius + 1000;

  /** A pack of three grunts spawned on top of one another. */
  const stacked = (world: Simulation): Unit[] =>
    [0, 1, 2].map(() => spawnAt(world, meleeGruntDef.id, STACK_AT));

  it("rests where the push left it, and walks nowhere", () => {
    const { world } = arrange();
    const pack = stacked(world);

    for (let tick = 0; tick < SETTLE; tick += 1) {
      world.tick();
    }

    expect(pack.map((member) => [member.ai.state, member.order.kind])).toEqual([
      ["idle", "none"],
      ["idle", "none"],
      ["idle", "none"],
    ]);
    expect(gap(nth(pack, 0), nth(pack, 1))).toBeGreaterThanOrEqual(
      2 * meleeGruntDef.body.collisionRadius - EPSILON,
    );
  });

  it("comes to rest again, all three, after a leash sends them home", () => {
    const { world, heroId } = arrange();
    const pack = stacked(world);

    world.tick();
    hit(world, nth(pack, 0), 1, heroId);
    walkHero(world, FAR_WEST, 0);
    tickUntil(
      world,
      () => pack.every((member) => member.ai.state === "return"),
      PATIENCE,
    );
    tickUntil(
      world,
      () => pack.every((member) => member.ai.state === "idle"),
      PATIENCE,
    );

    expect(pack.map((member) => member.order.kind)).toEqual([
      "none",
      "none",
      "none",
    ]);
  });
});
