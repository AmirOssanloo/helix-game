import { describe, expect, it } from "vitest";
import { MAX_TICKS_PER_FRAME } from "@app/public";
import {
  arenaDef,
  bruteDef,
  fastRunnerDef,
  longRoadDef,
  meleeGruntDef,
  summonAddsDef,
} from "@content/public";
import type {
  PackRecord,
  SpawnProjectileEffectDef,
  SpellRecord,
  Unit,
} from "@domain/public";
import {
  applyDamage,
  countLiveEnemies,
  ENEMY_LIVE_CAP,
  issueMove,
  readTunable,
  resolveDestinationFor,
  resourcesOf,
  runEffects,
  runPrimitive,
} from "@domain/public";
import type { Vec2 } from "@shared/public";
import { distanceSquared } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import {
  createEventReader,
  createSessionWorld,
  nextFloat,
} from "@simulation/public";
import { makeCast, makeRegistry, submit } from "../helpers";

/** The live cap the performance standard sizes the tick budget for, plus the headroom the stress test asks. */
const UNIT_COUNT = 300;

/** The budget every tick is held to, in wall milliseconds. */
const TICK_BUDGET_MS = 4;

/** Ticks run before measuring, so the engine has settled on the code the ticks run. */
const WARM_UP_TICKS = 30;

/** Ticks measured: ten seconds of play at the step rate. */
const MEASURED_TICKS = 300;

/** How often every idle unit takes a new order, in ticks. */
const ORDER_INTERVAL = 15;

const SEED = 300;

/** Scratch for the legal point an order lands on. */
const landing = { x: 0, y: 0 };

/** A random point on the arena from the world's own seeded source. */
const randomPoint = (world: Simulation): void => {
  const bounds = world.view.map.bounds;
  const random = world.state.run.random;

  landing.x = bounds.minX + nextFloat(random) * (bounds.maxX - bounds.minX);
  landing.y = bounds.minY + nextFloat(random) * (bounds.maxY - bounds.minY);
};

/** Every unit standing still walks to a random legal point on the arena. */
const orderIdleUnits = (world: Simulation): void => {
  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit: Unit | null = units.at(index);

    if (unit === null || unit.state !== "idle") {
      continue;
    }

    randomPoint(world);
    resolveDestinationFor(world.state, unit, landing.x, landing.y, landing);
    issueMove(unit, landing.x, landing.y);
  }
};

/** The arena with the hero at its spawn point and the units spawned around the centre in one command. */
const arrange = (): Simulation => {
  const world = createSessionWorld({
    seed: SEED,
    registry: makeRegistry(),
    map: arenaDef,
  });

  submit(world, {
    kind: "spawn_units",
    tick: 0,
    timestamp: 0,
    count: UNIT_COUNT,
    position: arenaDef.spawnPoint,
  });
  world.tick();

  return world;
};

/** Enemies per pack, and the packs of each archetype that make the live cap between them. */
const PACK_SIZE = 10;
const PACKS_PER_ARCHETYPE = ENEMY_LIVE_CAP / PACK_SIZE / 2;

/**
 * How far from the centre the packs stand when they spawn: across the arena from the hero,
 * past every archetype's aggro radius, and near enough that the hero's loop stays inside the
 * grunts' leash, so every enemy is still chasing when the measuring ends.
 */
const PACK_RING = 1100;

/** The live projectiles the performance standard's live cap names. */
const PROJECTILE_COUNT = 100;

/**
 * Ticks run before measuring the chase: long enough for the runners to reach the hero and the
 * shots to fill, and no longer. The crowd shoves the hero off its loop as the fight goes on,
 * and some fifteen seconds in it has carried the hero far enough south that a grunt from the
 * north passes its leash; the measuring ends before that.
 */
const CHASE_WARM_UP_TICKS = 120;

/** The square the hero walks round the centre, one corner after the other, clear of every obstacle. */
const HERO_LOOP: readonly Readonly<Vec2>[] = [
  { x: 2300, y: 2000 },
  { x: 2300, y: 2300 },
  { x: 1700, y: 2300 },
  { x: 1700, y: 1700 },
  { x: 2300, y: 1700 },
];

/**
 * How long the hero keeps at one leg of the loop before it turns for the next: the crowd
 * closes round it and slows it to a push, so it changes course on a clock as well as on
 * arrival, and the chasers keep re-pathing after it.
 */
const LEG_PATIENCE_TICKS = 60;

/** The states of an enemy closing on the hero or striking it. */
const CHASING: ReadonlySet<string> = new Set(["chase", "attack"]);

/**
 * The hero's shot as the auto-attack fires it, its speed, radius, and reach, flying the hero's
 * facing and sweeping what it crosses. Its hit runs the whole damage path for nothing, so the
 * live cap stays full for every measured tick.
 */
const SHOT: SpawnProjectileEffectDef = {
  kind: "spawn_projectile",
  origin: "anchor",
  speed: 900,
  radius: 12,
  homing: false,
  maxRange: 1200,
  onHit: [
    {
      kind: "damage_area",
      target: { kind: "target" },
      damageType: "physical",
      amount: { orb: "ember", byLevel: [0, 0, 0, 0, 0, 0, 0] },
      rate: "once",
      split: false,
    },
  ],
  atlasFrame: "disc",
  tint: 0xffffff,
};

type Chase = Readonly<{ world: Simulation; hero: Unit }>;

/**
 * The health each archetype of the chase is retuned to when the crowd must outlive the zones
 * burning it, so no one dies and the live cap stays full.
 */
const DURABLE_HEALTH = 10_000_000;

/**
 * The arena with the hero at its spawn point and the live cap of grunts and runners in packs
 * on a ring round the centre, each enemy struck once by the hero so every pack sets off after
 * it across the arena. A durable crowd has its archetypes' health retuned by command first.
 */
const arrangeChase = (durable: boolean): Chase => {
  const world = createSessionWorld({
    seed: SEED,
    registry: makeRegistry(),
    map: arenaDef,
  });
  const spawn = arenaDef.spawnPoint;
  const archetypes = [meleeGruntDef.id, fastRunnerDef.id];
  const packCount = PACKS_PER_ARCHETYPE * archetypes.length;

  if (durable) {
    for (const archetype of archetypes) {
      submit(world, {
        kind: "set_tuning",
        tick: 0,
        timestamp: 0,
        key: `def:enemy:${archetype}:health`,
        value: DURABLE_HEALTH,
      });
    }

    world.tick();
  }

  const tick = world.view.tick;

  for (let pack = 0; pack < packCount; pack += 1) {
    const angle = (2 * Math.PI * pack) / packCount;

    submit(world, {
      kind: "spawn_pack",
      tick,
      timestamp: pack,
      archetypeId: archetypes[pack % archetypes.length] ?? meleeGruntDef.id,
      tier: "normal",
      count: PACK_SIZE,
      position: {
        x: spawn.x + PACK_RING * Math.cos(angle),
        y: spawn.y + PACK_RING * Math.sin(angle),
      },
    });
  }

  world.tick();

  const units = world.state.map.units;
  const heroId = world.state.run.heroId;
  const hero = heroId === null ? null : units.resolve(heroId);

  if (heroId === null || hero === null) {
    throw new Error("The session world holds the hero");
  }

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (unit !== null && id !== null && unit.kind === "enemy") {
      applyDamage(world.state, id, 1, "pure", heroId);
    }
  }

  return { world, hero };
};

/** Where the boss stands when it spawns: west of the hero, inside its aggro radius and its charge's range. */
const BOSS_OFFSET = { x: -500, y: 0 };

/** The enemies the boss's one cast of adds brings. */
const ADDS = 2;

/**
 * The events the heaviest tick at the live cap announced in phase 4, every enemy chasing through
 * twenty zones with a hundred shots landing at once. The ring is sized for twenty-two such ticks;
 * an encounter whose heaviest tick announces more resizes it.
 */
const HEAVIEST_TICK_EVENTS = 714;

/**
 * The arena with the hero at its spawn point, a brute at boss tier beside it, and packs of
 * grunts and runners on the ring round the centre, the last pack short, so the boss, the crowd,
 * and one cast of the boss's adds make the live cap between them. Every enemy is struck once by
 * the hero, so the crowd sets off after it and the boss takes it up at once.
 */
const arrangeBoss = (): Chase => {
  const world = createSessionWorld({
    seed: SEED,
    registry: makeRegistry(),
    map: arenaDef,
  });
  const spawn = arenaDef.spawnPoint;
  const crowd = ENEMY_LIVE_CAP - 1 - ADDS;
  const packCount = Math.ceil(crowd / PACK_SIZE);

  submit(world, {
    kind: "spawn_pack",
    tick: 0,
    timestamp: 0,
    archetypeId: bruteDef.id,
    tier: "boss",
    count: 1,
    position: { x: spawn.x + BOSS_OFFSET.x, y: spawn.y + BOSS_OFFSET.y },
  });

  for (let pack = 0; pack < packCount; pack += 1) {
    const angle = (2 * Math.PI * pack) / packCount;

    submit(world, {
      kind: "spawn_pack",
      tick: 0,
      timestamp: pack + 1,
      archetypeId: pack % 2 === 0 ? meleeGruntDef.id : fastRunnerDef.id,
      tier: "normal",
      count: Math.min(PACK_SIZE, crowd - pack * PACK_SIZE),
      position: {
        x: spawn.x + PACK_RING * Math.cos(angle),
        y: spawn.y + PACK_RING * Math.sin(angle),
      },
    });
  }

  world.tick();

  const units = world.state.map.units;
  const heroId = world.state.run.heroId;
  const hero = heroId === null ? null : units.resolve(heroId);

  if (heroId === null || hero === null) {
    throw new Error("The session world holds the hero");
  }

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (unit !== null && id !== null && unit.kind === "enemy") {
      applyDamage(world.state, id, 1, "pure", heroId);
    }
  }

  return { world, hero };
};

/** How many enemies stand on the map. */
const enemyCount = (world: Simulation): number => {
  const units = world.state.map.units;
  let count = 0;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.kind === "enemy") {
      count += 1;
    }
  }

  return count;
};

/** Keeps the hero alive and walking its loop, and a hundred of its shots in the air. Runs between ticks. */
const drive = (
  { world, hero }: Chase,
  leg: { next: number; endsAt: number },
): void => {
  const tick = world.view.tick;

  submit(world, { kind: "heal", tick, timestamp: tick });

  if (hero.state === "idle" || tick >= leg.endsAt) {
    const destination = HERO_LOOP[leg.next % HERO_LOOP.length];

    leg.next += 1;
    leg.endsAt = tick + LEG_PATIENCE_TICKS;

    if (destination !== undefined) {
      submit(world, { kind: "move", tick, timestamp: tick, destination });
    }
  }

  while (world.state.map.projectiles.count < PROJECTILE_COUNT) {
    runPrimitive(world.state, makeCast(world, { facing: hero.facing }), SHOT);
  }
};

/** How many enemies are closing on the hero or striking it. */
const chasingCount = (world: Simulation): number => {
  const units = world.state.map.units;
  let count = 0;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.kind === "enemy" && CHASING.has(unit.ai.state)) {
      count += 1;
    }
  }

  return count;
};

/** The concurrent zones the spell load is held to. */
const ZONE_COUNT = 20;

/** Every orb at the cap, so each zone is as large, as long, and as far-reaching as the tables make it. */
const ORB_LEVELS: readonly number[] = [7, 7, 7];

/**
 * The spells the zones come from, in the order they are cast to keep the count at the cap:
 * one line of Glacier walls, then Bolides, Updrafts, and Zeniths in turn. A cast that would
 * take the count past the cap is passed over.
 */
const ROTATION: readonly string[] = [
  "glacier",
  "bolide",
  "updraft",
  "zenith",
  "bolide",
  "updraft",
  "zenith",
  "bolide",
  "updraft",
  "zenith",
];

/** How far ahead of the hero a point or a vector spell lands: in the crowd closing on it. */
const ZONE_REACH = 200;

/** Ticks run before counting at the cap: the chase closed and every spell of the mix down at least once. */
const ZONES_WARM_UP_TICKS = 150;

/**
 * Ticks between two drains by the open panel's reader. The panel refreshes four times a
 * second, about eight ticks at the step rate; the reader here drains at twice that, so a
 * refresh that slips a whole interval behind a busy frame still finds every event.
 */
const PANEL_DRAIN_TICKS = 16;

/** The spells of the mix as run scope holds them, in the rotation's order. */
const recordsOf = (world: Simulation): SpellRecord[] =>
  ROTATION.map((id) => {
    const record = world.state.run.spells.get(id);

    if (record === undefined) {
      throw new Error(`Content registers ${id}`);
    }

    return record;
  });

/**
 * One commit of `record` at the orb cap, as the cast pipeline fills its context: a point or a
 * vector spell lands ahead of the hero, the vector with no drag, and a direction spell starts
 * at the hero, all along its facing.
 */
const commit = (world: Simulation, hero: Unit, record: SpellRecord): void => {
  const targeting = record.def.targeting;
  const reach =
    targeting === "point" || targeting === "vector" ? ZONE_REACH : 0;

  runEffects(
    world.state,
    makeCast(world, {
      ability: record.def,
      orbLevels: ORB_LEVELS,
      x: hero.curr.x + reach * Math.cos(hero.facing),
      y: hero.curr.y + reach * Math.sin(hero.facing),
      facing: hero.facing,
    }),
    record.def.effects,
  );
};

/** How many zones one commit of each spell of the rotation puts down, read off a world of its own. */
const zonesPerCast = (): number[] => {
  const world = createSessionWorld({
    seed: SEED,
    registry: makeRegistry(),
    map: arenaDef,
  });

  world.tick();

  const heroId = world.state.run.heroId;
  const hero = heroId === null ? null : world.state.map.units.resolve(heroId);

  if (hero === null) {
    throw new Error("The session world holds the hero");
  }

  return recordsOf(world).map((record) => {
    const before = world.state.map.zones.count;

    commit(world, hero, record);

    return world.state.map.zones.count - before;
  });
};

/** Commits the next spell of the rotation that fits until twenty zones stand. Runs between ticks. */
const topUpZones = (
  { world, hero }: Chase,
  records: readonly SpellRecord[],
  perCast: readonly number[],
  cursor: { next: number },
): void => {
  const zones = world.state.map.zones;
  let passedOver = 0;

  while (zones.count < ZONE_COUNT && passedOver < ROTATION.length) {
    const slot = cursor.next % ROTATION.length;
    const record = records[slot];
    const placed = perCast[slot] ?? 0;

    cursor.next += 1;

    if (record === undefined || zones.count + placed > ZONE_COUNT) {
      passedOver += 1;

      continue;
    }

    passedOver = 0;
    commit(world, hero, record);
  }
};

/** Reads every event `reader` has not seen, as a render frame or a panel refresh does. */
const drain = (world: Simulation, reader: EventReader): void => {
  while (world.events.read(reader) !== null) {
    // Reading is the whole of it; what a reader does with an event is not measured here.
  }
};

/** How often the hero on the long road is healed, in ticks. */
const WALK_HEAL_TICKS = 10;

/** How near an enemy must stand for the hero on the long road to stop and fight it. */
const ENGAGE_RADIUS = 800;

/** How near the hero must come to a stop on the road before it walks to the next. */
const ARRIVAL_RADIUS = 160;

/** Ticks between two orders of the same kind, so an order the crowd shoved off is given again. */
const REORDER_TICKS = 30;

/** Ticks between two spells the hero commits at what it fights. */
const SPELL_TICKS = 20;

/** The spells that throw damage at what the hero fights, in the order they are committed. */
const WALK_ROTATION: readonly string[] = ["bolide", "zenith", "updraft"];

/**
 * The most ticks the walk is given, some thirteen minutes of play. The road is 24000 long and
 * the hero walks it in under a minute and a half; the rest is fighting.
 */
const WALK_LIMIT_TICKS = 24_000;

/**
 * The most enemies one cast brings: the adds of a boss-tier cast. A live count this far under
 * the cap on every tick means no cast and no pack could have been refused by it.
 */
const LARGEST_SPAWN =
  summonAddsDef.effects.reduce(
    (most, effect) =>
      effect.kind === "spawn_unit" ? Math.max(most, effect.count) : most,
    0,
  ) * 3;

type Walk = {
  world: Simulation;
  hero: Unit;
  records: SpellRecord[];
  /** The stops on the road in order: each checkpoint past the spawn, then the last boss's pack. */
  stops: readonly Readonly<Vec2>[];
  stop: number;
  /** The tick the last move and the last attack order were given, and at what. */
  movedAt: number;
  movedTo: number;
  attackedAt: number;
  attacked: number | null;
  castAt: number;
  cast: number;
};

/**
 * The long road with the hero at its spawn, every orb at the cap. The stops are the
 * checkpoints after the spawn in order and the last pack's point, the last boss.
 */
const arrangeWalk = (): Walk => {
  const world = createSessionWorld({
    seed: SEED,
    registry: makeRegistry(),
    map: longRoadDef,
  });

  submit(world, {
    kind: "set_orb_levels",
    tick: 0,
    timestamp: 0,
    levels: ORB_LEVELS,
  });
  world.tick();

  const heroId = world.state.run.heroId;
  const hero = heroId === null ? null : world.state.map.units.resolve(heroId);
  const lastPack = longRoadDef.packs.at(-1);

  if (hero === null || lastPack === undefined) {
    throw new Error("The long road holds the hero and its packs");
  }

  return {
    world,
    hero,
    records: WALK_ROTATION.map((id) => {
      const record = world.state.run.spells.get(id);

      if (record === undefined) {
        throw new Error(`Content registers ${id}`);
      }

      return record;
    }),
    stops: [...longRoadDef.checkpoints.slice(1), lastPack.position],
    stop: 0,
    movedAt: -REORDER_TICKS,
    movedTo: -1,
    attackedAt: -REORDER_TICKS,
    attacked: null,
    castAt: 0,
    cast: 0,
  };
};

/** The nearest living enemy within the engage radius of the hero, or `null`. */
const nearestFoe = (world: Simulation, hero: Unit): number | null => {
  const units = world.state.map.units;
  let nearest: number | null = null;
  let best = ENGAGE_RADIUS * ENGAGE_RADIUS;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit === null || unit.kind !== "enemy" || unit.state === "dead") {
      continue;
    }

    const dx = unit.curr.x - hero.curr.x;
    const dy = unit.curr.y - hero.curr.y;
    const gap = dx * dx + dy * dy;

    if (gap <= best) {
      best = gap;
      nearest = units.idAt(index);
    }
  }

  return nearest;
};

/**
 * One commit of the next spell of the walk's rotation at `foe`, at the orb cap: a point spell
 * lands on it, and a direction spell starts at the hero facing it.
 */
const commitAt = (walk: Walk, foe: Unit): void => {
  const { world, hero } = walk;
  const record = walk.records[walk.cast % walk.records.length];

  walk.cast += 1;

  if (record === undefined) {
    return;
  }

  const facing = Math.atan2(foe.curr.y - hero.curr.y, foe.curr.x - hero.curr.x);
  const atFoe = record.def.targeting === "point";

  runEffects(
    world.state,
    makeCast(world, {
      ability: record.def,
      orbLevels: ORB_LEVELS,
      x: atFoe ? foe.curr.x : hero.curr.x,
      y: atFoe ? foe.curr.y : hero.curr.y,
      facing,
    }),
    record.def.effects,
  );
};

/**
 * Plays the hero down the road for one tick, between ticks: healed every ten, it attacks the
 * nearest enemy within reach and throws a spell at it on a clock, and with none near it walks
 * to the next stop, taking the one after once it arrives.
 */
const walkOn = (walk: Walk): void => {
  const { world, hero } = walk;
  const tick = world.view.tick;

  if (tick % WALK_HEAL_TICKS === 0) {
    submit(world, { kind: "heal", tick, timestamp: tick });
  }

  const foeId = nearestFoe(world, hero);
  const foe = foeId === null ? null : world.state.map.units.resolve(foeId);

  if (foeId !== null && foe !== null) {
    if (foeId !== walk.attacked || tick - walk.attackedAt >= REORDER_TICKS) {
      submit(world, {
        kind: "attack_target",
        tick,
        timestamp: tick,
        targetId: foeId,
      });
      walk.attacked = foeId;
      walk.attackedAt = tick;
    }

    if (tick - walk.castAt >= SPELL_TICKS) {
      commitAt(walk, foe);
      walk.castAt = tick;
    }

    walk.movedTo = -1;

    return;
  }

  walk.attacked = null;

  const current = walk.stops[walk.stop];

  if (
    current !== undefined &&
    walk.stop < walk.stops.length - 1 &&
    distanceSquared(hero.curr, current) <= ARRIVAL_RADIUS * ARRIVAL_RADIUS
  ) {
    walk.stop += 1;
  }

  const destination = walk.stops[walk.stop];

  if (
    destination !== undefined &&
    (walk.movedTo !== walk.stop || tick - walk.movedAt >= REORDER_TICKS)
  ) {
    submit(world, { kind: "move", tick, timestamp: tick, destination });
    walk.movedTo = walk.stop;
    walk.movedAt = tick;
  }
};

/**
 * Whether the pack `pack` records is beaten: dead for the map, or awake with no member left
 * standing. A pack is marked dead only once the hero walks out of its sleep radius, so the
 * last boss's pack, which the hero stands on, is beaten before it is dead.
 */
const isBeaten = (world: Simulation, pack: PackRecord): boolean => {
  if (pack.state === "dead") {
    return true;
  }

  if (pack.state !== "awake") {
    return false;
  }

  const units = world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.packId === pack.packId && unit.state !== "dead") {
      return false;
    }
  }

  return true;
};

/**
 * How many awake packs of the loaded map stand farther behind the hero along the road than
 * the sleep radius and were not fighting it: each should have walked home and slept.
 */
const awakeBehind = (world: Simulation, hero: Unit, reach: number): number => {
  const packs: readonly PackRecord[] = world.state.map.packs;
  let count = 0;

  for (const pack of packs) {
    if (pack.state === "awake" && pack.def.position.y < hero.curr.y - reach) {
      count += 1;
    }
  }

  return count;
};

describe("stress", () => {
  it("holds the mean tick under the budget with 300 generic units taking random orders on the arena", () => {
    const world = arrange();

    expect(world.view.map.units.count).toBe(UNIT_COUNT + 1);

    for (let tick = 0; tick < WARM_UP_TICKS; tick += 1) {
      if (tick % ORDER_INTERVAL === 0) {
        orderIdleUnits(world);
      }

      world.tick();
    }

    let totalMs = 0;
    let maxMs = 0;

    for (let tick = 0; tick < MEASURED_TICKS; tick += 1) {
      if (tick % ORDER_INTERVAL === 0) {
        orderIdleUnits(world);
      }

      const start = performance.now();

      world.tick();

      const elapsed = performance.now() - start;

      totalMs += elapsed;
      maxMs = Math.max(maxMs, elapsed);
    }

    const meanMs = totalMs / MEASURED_TICKS;

    expect(
      meanMs,
      `mean tick ${meanMs.toFixed(3)} ms, max ${maxMs.toFixed(3)} ms over ${String(MEASURED_TICKS)} ticks`,
    ).toBeLessThan(TICK_BUDGET_MS);
    expect(world.view.map.units.misses).toBe(0);
  });

  it("holds the mean tick under the budget with the live cap of enemies chasing the hero across the arena and a hundred projectiles in flight", () => {
    const chase = arrangeChase(false);
    const { world, hero } = chase;
    const leg = { next: 0, endsAt: 0 };

    expect(world.view.map.units.count).toBe(ENEMY_LIVE_CAP + 1);

    // No halts: a timing budget measures the worst case, a halted enemy costs less per tick than a walking one, and halts are covered by chase-halts.spec.ts.
    submit(world, {
      kind: "set_tuning",
      tick: world.view.tick,
      timestamp: world.view.tick,
      key: "chase_halt_chance",
      value: 0,
    });

    for (let tick = 0; tick < CHASE_WARM_UP_TICKS; tick += 1) {
      drive(chase, leg);
      world.tick();
    }

    let totalMs = 0;
    let maxMs = 0;
    let fewestChasing = ENEMY_LIVE_CAP;

    for (let tick = 0; tick < MEASURED_TICKS; tick += 1) {
      drive(chase, leg);

      expect(world.view.map.projectiles.count).toBe(PROJECTILE_COUNT);
      fewestChasing = Math.min(fewestChasing, chasingCount(world));

      const start = performance.now();

      world.tick();

      const elapsed = performance.now() - start;

      totalMs += elapsed;
      maxMs = Math.max(maxMs, elapsed);
    }

    const meanMs = totalMs / MEASURED_TICKS;

    expect(world.view.map.units.count).toBe(ENEMY_LIVE_CAP + 1);
    expect(resourcesOf(world.state, hero).health).toBeGreaterThan(0);
    expect(fewestChasing).toBe(ENEMY_LIVE_CAP);
    expect(
      meanMs,
      `mean tick ${meanMs.toFixed(3)} ms, max ${maxMs.toFixed(3)} ms over ${String(MEASURED_TICKS)} ticks`,
    ).toBeLessThan(TICK_BUDGET_MS);
    expect(world.view.map.units.misses).toBe(0);
    expect(world.view.map.projectiles.misses).toBe(0);
  });

  it("loses no event to the presentation or the open panel and misses no pool with the live cap chasing the hero through twenty zones and a hundred projectiles", () => {
    const chase = arrangeChase(true);
    const { world, hero } = chase;
    const leg = { next: 0, endsAt: 0 };
    const records = recordsOf(world);
    const perCast = zonesPerCast();
    const cursor = { next: 0 };
    const presentation = createEventReader();
    const panel = createEventReader();

    /** Tops up the hero's load, the zones, and the shots, and returns how many zones stand. */
    const topUp = (): number => {
      drive(chase, leg);
      topUpZones(chase, records, perCast, cursor);

      return world.view.map.zones.count;
    };

    /** The drains a render frame at the catch-up cap and a slipped panel refresh make after `tick`. */
    const drainAfter = (tick: number): void => {
      if ((tick + 1) % MAX_TICKS_PER_FRAME === 0) {
        drain(world, presentation);
      }

      if ((tick + 1) % PANEL_DRAIN_TICKS === 0) {
        drain(world, panel);
      }
    };

    for (let tick = 0; tick < ZONES_WARM_UP_TICKS; tick += 1) {
      topUp();
      world.tick();
      drainAfter(tick);
    }

    let totalMs = 0;
    let maxMs = 0;

    for (
      let tick = ZONES_WARM_UP_TICKS;
      tick < ZONES_WARM_UP_TICKS + MEASURED_TICKS;
      tick += 1
    ) {
      expect(topUp()).toBe(ZONE_COUNT);

      const start = performance.now();

      world.tick();

      const elapsed = performance.now() - start;

      totalMs += elapsed;
      maxMs = Math.max(maxMs, elapsed);
      drainAfter(tick);
    }

    const meanMs = totalMs / MEASURED_TICKS;
    const map = world.view.map;

    expect(map.units.count).toBe(ENEMY_LIVE_CAP + 1);
    expect(map.projectiles.count).toBe(PROJECTILE_COUNT);
    expect(resourcesOf(world.state, hero).health).toBeGreaterThan(0);
    expect(
      meanMs,
      `mean tick ${meanMs.toFixed(3)} ms, max ${maxMs.toFixed(3)} ms over ${String(MEASURED_TICKS)} ticks`,
    ).toBeLessThan(TICK_BUDGET_MS);
    expect(world.events.overwrites).toBe(0);
    expect(map.units.misses).toBe(0);
    expect(map.projectiles.misses).toBe(0);
    expect(map.effects.misses).toBe(0);
    expect(map.zones.misses).toBe(0);
  });

  it("holds the mean tick under the budget with a boss and its adds among the live cap chasing the hero and a hundred projectiles in flight, never past the cap", () => {
    const chase = arrangeBoss();
    const { world, hero } = chase;
    const leg = { next: 0, endsAt: 0 };

    expect(enemyCount(world)).toBe(ENEMY_LIVE_CAP - ADDS);

    let mostEnemies = 0;

    for (let tick = 0; tick < CHASE_WARM_UP_TICKS; tick += 1) {
      drive(chase, leg);
      world.tick();
      mostEnemies = Math.max(mostEnemies, enemyCount(world));
    }

    let totalMs = 0;
    let maxMs = 0;
    let heaviestTickEvents = 0;

    for (let tick = 0; tick < MEASURED_TICKS; tick += 1) {
      drive(chase, leg);

      const cursor = world.events.cursor;
      const start = performance.now();

      world.tick();

      const elapsed = performance.now() - start;

      totalMs += elapsed;
      maxMs = Math.max(maxMs, elapsed);
      heaviestTickEvents = Math.max(
        heaviestTickEvents,
        world.events.cursor - cursor,
      );
      mostEnemies = Math.max(mostEnemies, enemyCount(world));
    }

    const meanMs = totalMs / MEASURED_TICKS;

    expect(mostEnemies).toBe(ENEMY_LIVE_CAP);
    expect(enemyCount(world)).toBe(ENEMY_LIVE_CAP);
    expect(resourcesOf(world.state, hero).health).toBeGreaterThan(0);
    expect(
      meanMs,
      `mean tick ${meanMs.toFixed(3)} ms, max ${maxMs.toFixed(3)} ms, heaviest tick ${String(heaviestTickEvents)} events over ${String(MEASURED_TICKS)} ticks`,
    ).toBeLessThan(TICK_BUDGET_MS);
    expect(heaviestTickEvents).toBeLessThanOrEqual(HEAVIEST_TICK_EVENTS);
    expect(world.view.map.units.misses).toBe(0);
    expect(world.view.map.projectiles.misses).toBe(0);
  });
  it("holds the live cap and the mean tick under the budget with the hero walking the long road from the spawn to the last boss", () => {
    const walk = arrangeWalk();
    const { world, hero } = walk;
    const packs = world.state.map.packs;
    const lastPack = packs.at(-1);
    const search = world.state.map.pathSearch;
    const tuning = world.state.run.tuning;
    const behind = Math.max(
      readTunable(tuning, "pack_sleep_radius"),
      readTunable(tuning, "pack_activation_radius"),
    );

    if (lastPack === undefined) {
      throw new Error("The long road holds its packs");
    }

    let ticks = 0;
    let totalMs = 0;
    let maxMs = 0;
    let worst = "";
    let heaviestTickEvents = 0;
    let mostExpansions = 0;
    let mostLive = 0;
    let waited = 0;
    let lastBehind = 0;
    let mostBehind = 0;
    let heroDeaths = 0;
    let wasDead = false;

    while (!isBeaten(world, lastPack) && ticks < WALK_LIMIT_TICKS) {
      walkOn(walk);

      const cursor = world.events.cursor;
      const expanded = search.expanded;
      const start = performance.now();

      world.tick();

      const elapsed = performance.now() - start;

      const events = world.events.cursor - cursor;
      const expansions = search.expanded - expanded;

      ticks += 1;
      totalMs += elapsed;

      if (elapsed > maxMs) {
        maxMs = elapsed;
        worst = `tick ${String(world.view.tick)}, ${String(events)} events, ${String(expansions)} expansions, ${String(countLiveEnemies(world.state))} live`;
      }

      heaviestTickEvents = Math.max(heaviestTickEvents, events);
      mostExpansions = Math.max(mostExpansions, expansions);
      mostLive = Math.max(mostLive, countLiveEnemies(world.state));
      waited += packs.filter((pack) => pack.state === "waiting").length;
      lastBehind = awakeBehind(world, hero, behind);
      mostBehind = Math.max(mostBehind, lastBehind);

      const dead = hero.state === "dead";

      heroDeaths += dead && !wasDead ? 1 : 0;
      wasDead = dead;
    }

    const meanMs = totalMs / ticks;

    console.info(
      `long road: ${String(ticks)} ticks, mean ${meanMs.toFixed(3)} ms, worst ${maxMs.toFixed(3)} ms (${worst}), heaviest tick ${String(heaviestTickEvents)} events, most A* expansions in a tick ${String(mostExpansions)}, most live ${String(mostLive)}, most awake behind ${String(mostBehind)}, hero deaths ${String(heroDeaths)}, level ${String(hero.progression.level)}`,
    );

    expect(isBeaten(world, lastPack)).toBe(true);
    expect(mostLive).toBeLessThanOrEqual(ENEMY_LIVE_CAP - LARGEST_SPAWN);
    expect(waited).toBe(0);
    expect(lastBehind).toBe(0);
    expect(
      meanMs,
      `mean tick ${meanMs.toFixed(3)} ms, max ${maxMs.toFixed(3)} ms over ${String(ticks)} ticks`,
    ).toBeLessThan(TICK_BUDGET_MS);
    expect(world.view.map.units.misses).toBe(0);
    expect(world.view.map.projectiles.misses).toBe(0);
  });
});
