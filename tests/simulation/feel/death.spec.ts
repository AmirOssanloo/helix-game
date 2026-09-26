import { describe, expect, it } from "vitest";
import { meleeGruntDef, trainingDummyDef, tuningTable } from "@content/public";
import type { AnyCommand, DomainEvent, Unit } from "@domain/public";
import {
  applyDamage,
  applyStatus,
  remainingCooldownTicks,
} from "@domain/public";
import type { EntityId } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import {
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The pack every enemy below is spawned in. */
const PACK = 1;

/** Every orb at one, so every table reads its first entry. */
const LEVELS = [1, 1, 1];

/** Hoarfrost, the spell aimed at a unit, and Emberling, the one that summons. */
const HOARFROST = "hoarfrost";
const EMBERLING = "emberling";

/** The index of the kit's first prepared slot. */
const FIRST_PREPARED = 0;

/** The respawn and corpse delays in ticks under the content table's defaults. */
const RESPAWN_TICKS = tuningTable.respawn_delay * tuningTable.sim_hz;
const CORPSE_TICKS = tuningTable.corpse_delay * tuningTable.sim_hz;

/** How close a walk counts as there, and how much two pushed discs may still overlap. */
const EPSILON = tuningTable.arrival_epsilon;

/** More than any unit's health, landed as pure so nothing mitigates it. */
const LETHAL = 100000;

/** Somewhere west the hero runs to, past every archetype's leash. */
const FAR_WEST = -6000;

/** Far enough east that a grunt there has not seen the hero, and near enough for a walk. */
const OUT_OF_SIGHT = meleeGruntDef.aggroRadius + 400;

/** A lift of a second, and a burn that outlasts it. */
const LIFT_TICKS = 30;
const BURN_TICKS = 300;

/** How long a pack chases before the hero is killed, far enough that each grunt is well off its spawn point. */
const CHASE_TICKS = 30;

/** Long enough for any wait below. */
const PATIENCE = 1500;

type Arranged = Readonly<{ world: Simulation; hero: Unit; heroId: EntityId }>;

/** The content registry on an open map with the hero on the spawn point at the origin, every orb at one, and no wander. */
const arrange = (): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({ tuning: { wander_radius: 0 } }),
  });
  const hero = spawnHero(world, { orbLevels: LEVELS });

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

/** The panel's kill, which empties the hero's health for the death system to take at the end of the tick. */
const killHero = (world: Simulation): void => {
  submit(world, stamp(world, { kind: "kill_hero" }));
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
  source: EntityId | null,
): void => {
  applyDamage(world.state, unitIdOf(world, target), amount, "pure", source);
};

/** Puts `statusId` on `unit` for `ticks`, from `source`. */
const put = (
  world: Simulation,
  unit: Unit,
  statusId: string,
  ticks: number,
  source: EntityId | null,
): void => {
  const result = applyStatus(
    world.state,
    unitIdOf(world, unit),
    statusId,
    ticks,
    source,
    LEVELS,
  );

  if (result !== "ok") {
    throw new Error(`The status lands: ${result}`);
  }
};

/** Puts `abilityId` in the hero's first prepared slot. */
const prepare = (world: Simulation, abilityId: string): void => {
  const form = world.state.run.forms[0];

  if (form === undefined) {
    throw new Error("The hero has a form");
  }

  form.kit.prepared[FIRST_PREPARED] = abilityId;
};

/** Casts `abilityId` at `target`, as a click on it does. */
const castAt = (world: Simulation, abilityId: string, target: Unit): void => {
  submit(
    world,
    stamp(world, {
      kind: "cast",
      abilityId,
      target: { kind: "unit", unitId: unitIdOf(world, target) },
    }),
  );
};

/** Ticks `world` `count` times. */
const tickTimes = (world: Simulation, count: number): void => {
  for (let tick = 0; tick < count; tick += 1) {
    world.tick();
  }
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

/** The ids of the live statuses `unit` wears. */
const wearing = (unit: Readonly<Unit>): (string | null)[] =>
  unit.statuses
    .filter((row) => row.definitionId !== null && row.endsAtTick > 0)
    .map((row) => row.definitionId);

/** The ids of every live summon, in pool order. */
const summonsOf = (world: Simulation): EntityId[] => {
  const units = world.state.map.units;
  const found: EntityId[] = [];

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (unit !== null && id !== null && unit.kind === "summon") {
      found.push(id);
    }
  }

  return found;
};

/** The tick `unit`'s lift ends on, or zero when it wears none. */
const liftEndsAt = (unit: Readonly<Unit>): number =>
  unit.statuses.find((row) => row.definitionId === "lift")?.endsAtTick ?? 0;

/** The mana of the hero's form, where the hero's resources live. */
const manaOf = (world: Simulation): number =>
  world.view.run.forms[0]?.resources.mana ?? Number.NaN;

/** The distance between two units' centres. */
const gap = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
  Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y);

/** A grunt that noticed the hero, followed it west past its leash, and turned home, with the hero gone far west. */
const returningGrunt = (): Arranged & { grunt: Unit } => {
  const arranged = arrange();
  const grunt = spawnAt(arranged.world, meleeGruntDef.id, 600);

  arranged.world.tick();
  submit(
    arranged.world,
    stamp(arranged.world, {
      kind: "move",
      destination: { x: FAR_WEST, y: 0 },
    }),
  );
  tickUntil(arranged.world, () => grunt.ai.state === "return", PATIENCE);

  return { ...arranged, grunt };
};

/** A pack of three grunts a second into chasing the hero, which is then killed where it stands, on its spawn point. */
const killedWhileChased = (): Arranged & { pack: Unit[] } => {
  const arranged = arrange();
  const { world } = arranged;
  const pack = [600, 700, 800].map((x) => spawnAt(world, meleeGruntDef.id, x));

  tickTimes(world, CHASE_TICKS);
  killHero(world);
  world.tick();

  return { ...arranged, pack };
};

describe("hero", () => {
  it("Killed during a cast point: the cast is cancelled; no mana spent, no cooldown started", () => {
    const { world, hero } = arrange();
    const grunt = spawnAt(world, meleeGruntDef.id, 300);
    const reader = createEventReader();
    const mana = manaOf(world);

    prepare(world, HOARFROST);
    castAt(world, HOARFROST, grunt);
    world.tick();

    expect(hero.state).toBe("ability_cast_point");

    killHero(world);
    world.tick();
    tickTimes(world, RESPAWN_TICKS - 1);

    expect(hero.state).toBe("dead");
    expect(manaOf(world)).toBe(mana);
    expect(
      remainingCooldownTicks(hero.cooldowns, HOARFROST, world.view.tick),
    ).toBe(0);
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
    expect(wearing(grunt)).not.toContain(HOARFROST);
  });

  it("Killed while a projectile is in flight: the projectile still lands; damage credited to the hero for experience", () => {
    const { world, hero } = arrange();
    const grunt = spawnAt(world, meleeGruntDef.id, OUT_OF_SIGHT);
    const gruntId = unitIdOf(world, grunt);
    const reader = createEventReader();

    submit(world, stamp(world, { kind: "attack_target", targetId: gruntId }));
    tickUntil(
      world,
      () => eventsOfKind(world, reader, "projectile_spawned").length > 0,
      PATIENCE,
    );
    grunt.resources.health = 1;
    killHero(world);
    world.tick();

    expect(hero.state).toBe("dead");
    expect(grunt.state).not.toBe("dead");

    tickUntil(world, () => grunt.state === "dead", PATIENCE);

    expect(hero.state).toBe("dead");
    expect(hero.progression.experience).toBe(meleeGruntDef.experience);
  });

  it("Respawn while enemies are aggroed: a pack whose aggro radius reaches the spawn point takes the hero up again, and the hero gets no grace period", () => {
    const { world, hero, pack } = killedWhileChased();

    tickUntil(world, () => hero.state !== "dead", PATIENCE);
    tickUntil(
      world,
      () => pack.some((member) => member.ai.state === "attack"),
      PATIENCE,
    );

    expect(hero.state).not.toBe("dead");
    expect(pack.map((member) => member.ai.state)).toContain("attack");
  });
});

describe("map and camera", () => {
  it("Hero spawned on an occupied spot: enemies standing on the spawn point are pushed out on the first tick", () => {
    const { world, hero } = arrange();

    hero.curr.x = FAR_WEST;
    hero.prev.x = FAR_WEST;
    world.state.map.spatialHash.move(unitIdOf(world, hero), hero.curr);
    killHero(world);
    world.tick();

    const squatter = spawnAt(world, meleeGruntDef.id, 0);

    tickUntil(world, () => hero.state !== "dead", RESPAWN_TICKS + 1);

    expect([hero.curr.x, hero.curr.y]).toEqual([0, 0]);

    world.tick();

    expect(gap(hero, squatter)).toBeGreaterThanOrEqual(
      hero.collisionRadius + squatter.collisionRadius - EPSILON,
    );
  });
});

describe("enemies", () => {
  it("Summon owner dies: the summon expires on the same tick", () => {
    const { world } = arrange();
    const reader = createEventReader();

    prepare(world, EMBERLING);
    submit(
      world,
      stamp(world, {
        kind: "cast",
        abilityId: EMBERLING,
        target: { kind: "none" },
      }),
    );
    tickUntil(
      world,
      () => eventsOfKind(world, reader, "cast_committed").length > 0,
      PATIENCE,
    );

    const summonIds = summonsOf(world);

    expect(summonIds).toHaveLength(1);

    killHero(world);
    world.tick();

    expect(summonIds.map((id) => world.state.map.units.resolve(id))).toEqual([
      null,
    ]);
  });

  // Owner: the enemy abilities work. Written when an enemy ability summons adds; no archetype casts one yet.
  it.todo(
    "Enemy summons adds when the live cap is reached: the ability is refused this cast; cooldown is not spent",
  );

  it("Dummy takes lethal damage: health clamps at 1; damage numbers still show the full amount", () => {
    const { world, heroId } = arrange();
    const dummy = spawnAt(world, trainingDummyDef.id, 300);
    const reader = createEventReader();

    hit(world, dummy, LETHAL, heroId);
    world.tick();
    world.tick();

    expect(dummy.state).not.toBe("dead");
    expect(dummy.resources.health).toBe(1);
    expect(
      eventsOfKind(world, reader, "unit_damaged").map((event) => event.amount),
    ).toEqual([LETHAL]);
  });

  it("Enemy killed while returning: dies normally, grants experience", () => {
    const { world, hero, heroId, grunt } = returningGrunt();

    hit(world, grunt, LETHAL, heroId);
    world.tick();

    expect(grunt.ai.state).toBe("dead");
    expect(hero.progression.experience).toBe(meleeGruntDef.experience);
  });

  it("Hero dies with enemies chasing: they turn for home on the next tick, and none paths toward the respawn point", () => {
    const { world, hero, pack } = killedWhileChased();
    const fromRespawn = (member: Readonly<Unit>): number =>
      Math.hypot(
        member.curr.x - hero.spawnPoint.x,
        member.curr.y - hero.spawnPoint.y,
      );
    const atDeath = pack.map(fromRespawn);

    world.tick();

    expect(
      pack.map((member) => [
        member.ai.state,
        member.order.destination.x,
        member.order.destination.y,
      ]),
    ).toEqual(
      pack.map((member) => [
        "return",
        member.spawnPoint.x,
        member.spawnPoint.y,
      ]),
    );

    let nearest = Number.POSITIVE_INFINITY;

    while (hero.state === "dead") {
      pack.forEach((member, slot) => {
        nearest = Math.min(nearest, fromRespawn(member) - (atDeath[slot] ?? 0));
      });
      world.tick();
    }

    expect(nearest).toBeGreaterThanOrEqual(-EPSILON);
  });
});

describe("spells and attack", () => {
  it("Target dies during the cast point of a unit-target spell: the cast is cancelled at no cost", () => {
    const { world, hero, heroId } = arrange();
    const grunt = spawnAt(world, meleeGruntDef.id, 300);
    const reader = createEventReader();
    const mana = manaOf(world);

    prepare(world, HOARFROST);
    castAt(world, HOARFROST, grunt);
    world.tick();

    expect(hero.state).toBe("ability_cast_point");

    hit(world, grunt, LETHAL, heroId);
    tickTimes(world, 3);

    expect(hero.state).toBe("idle");
    expect(manaOf(world)).toBe(mana);
    expect(
      remainingCooldownTicks(hero.cooldowns, HOARFROST, world.view.tick),
    ).toBe(0);
    expect(eventsOfKind(world, reader, "cast_committed")).toEqual([]);
  });

  it("Emberling out when the hero dies: the summon expires immediately, with no death of its own", () => {
    const { world } = arrange();
    const reader = createEventReader();

    prepare(world, EMBERLING);
    submit(
      world,
      stamp(world, {
        kind: "cast",
        abilityId: EMBERLING,
        target: { kind: "none" },
      }),
    );
    tickUntil(world, () => summonsOf(world).length > 0, PATIENCE);

    const [summonId] = summonsOf(world);

    killHero(world);
    world.tick();

    expect(
      summonId === undefined ? null : world.state.map.units.resolve(summonId),
    ).toBeNull();
    expect(
      eventsOfKind(world, reader, "unit_died").map((event) => event.unitId),
    ).toEqual([world.state.run.heroId]);
  });
});

describe("status effects", () => {
  it("Status on a dying unit: cleared with the death", () => {
    const { world, heroId } = arrange();
    const grunt = spawnAt(world, meleeGruntDef.id, OUT_OF_SIGHT);
    const reader = createEventReader();

    put(world, grunt, "slow", BURN_TICKS, heroId);
    put(world, grunt, "burn", BURN_TICKS, heroId);
    hit(world, grunt, LETHAL, heroId);
    world.tick();
    eventsOfKind(world, reader, "unit_damaged");
    tickTimes(world, CORPSE_TICKS - 1);

    expect(grunt.state).toBe("dead");
    expect(wearing(grunt)).toEqual([]);
    expect(eventsOfKind(world, reader, "unit_damaged")).toEqual([]);
  });

  it("A lifted unit killed by a burn it wears: dies in the air, the lift goes with the death, and the corpse is released on time", () => {
    const { world, hero, heroId } = arrange();
    const grunt = spawnAt(world, meleeGruntDef.id, OUT_OF_SIGHT);
    const gruntId = unitIdOf(world, grunt);

    grunt.resources.health = 1;
    put(world, grunt, "burn", BURN_TICKS, heroId);
    put(world, grunt, "lift", LIFT_TICKS, heroId);
    tickUntil(world, () => grunt.state === "dead", PATIENCE);

    const diedAt = world.view.tick;

    expect(diedAt).toBeLessThan(LIFT_TICKS);
    expect(wearing(grunt)).toEqual([]);
    expect(hero.progression.experience).toBe(meleeGruntDef.experience);

    tickUntil(
      world,
      () => world.state.map.units.resolve(gruntId) === null,
      PATIENCE,
    );

    expect(world.view.tick - diedAt).toBe(CORPSE_TICKS);
  });

  it("The hero dies with a unit in the air: the unit comes down where it was lifted, when the lift ends", () => {
    const { world, heroId } = arrange();
    const grunt = spawnAt(world, meleeGruntDef.id, OUT_OF_SIGHT);
    const liftedAt = { x: grunt.curr.x, y: grunt.curr.y };

    put(world, grunt, "lift", LIFT_TICKS, heroId);

    const endsAtTick = liftEndsAt(grunt);

    world.tick();
    killHero(world);
    world.tick();

    expect(liftEndsAt(grunt)).toBe(endsAtTick);

    tickUntil(world, () => wearing(grunt).length === 0, PATIENCE);

    expect(world.view.tick).toBe(endsAtTick + 1);
    expect(grunt.state).not.toBe("dead");
    expect({ x: grunt.curr.x, y: grunt.curr.y }).toEqual(liftedAt);
  });
});
