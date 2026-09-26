import { writeFileSync } from "node:fs";
import {
  arenaDef,
  fastRunnerDef,
  meleeGruntDef,
  rangedArcherDef,
  tankDef,
} from "@content/public";
import type {
  AnyCommand,
  CastTarget,
  Registry,
  SpellDef,
  Unit,
} from "@domain/public";
import { ORB_IDS } from "@domain/public";
import type { EntityId, Vec2 } from "@shared/public";
import type { EventReader, Simulation } from "@simulation/public";
import {
  contentVersionOf,
  createEventReader,
  createSessionWorld,
  serializeInputLog,
} from "@simulation/public";
import { submit } from "../world/submit";

/**
 * The balance pass's drivers: each plays one session the way a person at the panel would,
 * sending only what the panel and a player send, reacting to what the world shows, and
 * returns the session as the input log file the panel saves. The sessions are the ones
 * `tests/simulation/replays/balance.spec.ts` replays, section 5 of the enemy catalogue reads,
 * and section 8 of the spell catalogue reads for the spells session. To record them again after a change that moves what they show, run
 * `HELIX_RECORD=balance pnpm test tests/simulation/replays/record-balance.spec.ts`,
 * then move the spec's tables and the catalogues with what the replays now read.
 */

/** The seeds the three sessions are recorded under. */
const HERO_SEED = 101;
const SPELLS_SEED = 202;
const ARCHETYPES_SEED = 303;

/** The four archetypes, in the order every session fights them. */
const ARCHETYPES = [
  meleeGruntDef.id,
  fastRunnerDef.id,
  rangedArcherDef.id,
  tankDef.id,
];

/** The hero session: a pack of five of each archetype at each of these levels, from here. */
const HERO_LEVELS = [1, 10, 20];
const PACK_SIZE = 5;
const PACK_AT: Vec2 = { x: 1500, y: 2000 };

/** The longest a hero-session fight lasts when neither side falls: forty-five seconds. */
const FIGHT_LIMIT_TICKS = 45 * 30;

/** The circle the archetypes session walks: its centre, its radius, and where a walk starts. */
const RING_CENTRE: Vec2 = { x: 1700, y: 2000 };
const RING_RADIUS = 800;
const RING_START: Vec2 = { x: 1700, y: 2800 };

/** Where an archetypes-session enemy spawns: inside the circle, in the hero's reach from its start. */
const LONE_AT: Vec2 = { x: 1700, y: 2250 };

/** How far ahead of the hero, in radians round the circle, each click on the walk lands, and how often it clicks. */
const RING_LEAD = 0.5;
const CLICK_TICKS = 6;

/**
 * The kite: the hero shoots once the gap to the grunt, edge to edge, is at least this, and
 * walks at least the kite leg between one shot and the next, so a shot is never followed by
 * another while the grunt closes.
 */
const KITE_GAP = 300;
const KITE_LEG_TICKS = 3 * 30;

/** The longest the kite runs before the driver gives up on the grunt. */
const KITE_LIMIT_TICKS = 180 * 30;

/** How long the runner and the walking archer are walked from: twenty seconds. */
const WALK_TICKS = 20 * 30;

/** How far from its start the hero may stand and still count as there. */
const ARRIVED = 4;

/** The tank's spell fights: at every orb level 7, at level 21, the tank spawned here and struck once it has walked in. */
const TANK_LEVEL = 21;
const TANK_ORB_LEVEL = 7;
const TANK_WALK_IN_TICKS = 46;
const TANK_FIGHT_TICKS = 292;
const HEAL_EVERY_TICKS = 30;

/** The spells thrown alone at a fresh tank each. */
const TANK_SINGLES = ["updraft", "zenith", "bolide", "clarion", "glacier"];

/** How long a throw waits for its cast to commit before it tries again, and how often it tries. */
const THROW_PATIENCE_TICKS = 15;
const THROW_ATTEMPTS = 10;

/** How long a committed throw is given to reach the tank before the next is thrown. */
const THROW_REACH_TICKS = 10;

/** How far a Glacier wall is drawn from where it is thrown. */
const GLACIER_DRAG: Vec2 = { x: 0, y: 300 };

/** The R key's slot. */
const INVOKE_SLOT = 4;

/** A session world and what the driver needs to read it: its event reader and the next timestamp. */
type Session = {
  world: Simulation;
  reader: EventReader;
  stamp: number;
  committed: string[];
};

const startSession = (registry: Registry, seed: number): Session => ({
  world: createSessionWorld({ seed, registry, map: arenaDef }),
  reader: createEventReader(),
  stamp: 1,
  committed: [],
});

/** Sends `command` for the tick about to run. */
const send = (session: Session, command: Record<string, unknown>): void => {
  const tick = session.world.view.tick;

  submit(session.world, {
    ...command,
    tick,
    timestamp: session.stamp,
  } as AnyCommand);
  session.stamp += 1;
};

/** Runs one tick and keeps which casts committed on it, which a throw waits for. */
const step = (session: Session): void => {
  session.world.tick();
  session.committed.length = 0;

  let event = session.world.events.read(session.reader);

  while (event !== null) {
    if (event.kind === "cast_committed" && event.abilityId !== null) {
      session.committed.push(event.abilityId);
    }

    event = session.world.events.read(session.reader);
  }
};

const heroOf = (session: Session): Unit => {
  const heroId = session.world.state.run.heroId;
  const hero =
    heroId === null ? null : session.world.state.map.units.resolve(heroId);

  if (hero === null) {
    throw new Error("The session world holds the hero");
  }

  return hero;
};

/** Every living enemy with its id, in pool order. */
const livingEnemies = (session: Session): [EntityId, Unit][] => {
  const units = session.world.state.map.units;
  const found: [EntityId, Unit][] = [];

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);
    const id = units.idAt(index);

    if (
      unit !== null &&
      id !== null &&
      unit.kind === "enemy" &&
      unit.state !== "dead"
    ) {
      found.push([id, unit]);
    }
  }

  return found;
};

/** The living enemy nearest the hero, ties to the lower slot, or `null` for none. */
const nearestEnemy = (session: Session): [EntityId, Unit] | null => {
  const hero = heroOf(session);
  let nearest: [EntityId, Unit] | null = null;
  let best = Number.POSITIVE_INFINITY;

  for (const entry of livingEnemies(session)) {
    const distance = Math.hypot(
      entry[1].curr.x - hero.curr.x,
      entry[1].curr.y - hero.curr.y,
    );

    if (distance < best) {
      best = distance;
      nearest = entry;
    }
  }

  return nearest;
};

const isHeroDead = (session: Session): boolean =>
  heroOf(session).state === "dead";

/** Ticks until the hero stands again, if it is down. */
const awaitHero = (session: Session): void => {
  while (isHeroDead(session)) {
    step(session);
  }
};

/** Level-ups, one a tick, until the hero is at `level`. */
const levelTo = (session: Session, level: number): void => {
  while (heroOf(session).progression.level < level) {
    send(session, { kind: "level_up" });
    step(session);
  }
};

/** The panel's map reset, then a heal and a mana restore on the next tick. */
const freshStart = (session: Session): void => {
  send(session, { kind: "reset_map" });
  step(session);
  send(session, { kind: "heal" });
  send(session, { kind: "restore_mana" });
  step(session);
};

const spawnPack = (
  session: Session,
  archetypeId: string,
  count: number,
  position: Vec2,
): void => {
  send(session, {
    kind: "spawn_pack",
    archetypeId,
    tier: "normal",
    count,
    position,
  });
  step(session);
};

const attack = (session: Session, targetId: EntityId): void => {
  send(session, { kind: "attack_target", targetId });
};

/**
 * One hero-session fight: five of `archetypeId`, the hero attacking the nearest and taking the
 * next nearest the tick after each dies, until the hero falls, the pack does, or the limit.
 */
const standAndAttack = (session: Session, archetypeId: string): void => {
  freshStart(session);
  spawnPack(session, archetypeId, PACK_SIZE, PACK_AT);

  let target: [EntityId, Unit] | null = null;

  for (let ticks = 0; ticks < FIGHT_LIMIT_TICKS; ticks += 1) {
    if (isHeroDead(session)) {
      return;
    }

    if (target === null || target[1].state === "dead") {
      target = nearestEnemy(session);

      if (target === null) {
        return;
      }

      attack(session, target[0]);
    }

    step(session);
  }
};

/** The hero session: a hero that only stands and attacks, at each level, against a pack of each archetype. */
export const recordHeroSession = (registry: Registry): string => {
  const session = startSession(registry, HERO_SEED);

  for (const level of HERO_LEVELS) {
    for (const archetypeId of ARCHETYPES) {
      awaitHero(session);
      levelTo(session, level);
      standAndAttack(session, archetypeId);
    }
  }

  step(session);

  return serializeInputLog(
    session.world.view,
    session.world.log,
    contentVersionOf(registry),
    [],
  );
};

/** A click on the circle a lead ahead of where the hero stands on it. */
const clickRound = (session: Session): void => {
  const hero = heroOf(session);
  const angle =
    Math.atan2(hero.curr.y - RING_CENTRE.y, hero.curr.x - RING_CENTRE.x) +
    RING_LEAD;

  send(session, {
    kind: "move",
    destination: {
      x: RING_CENTRE.x + RING_RADIUS * Math.cos(angle),
      y: RING_CENTRE.y + RING_RADIUS * Math.sin(angle),
    },
  });
};

/** After a reset: walks the hero to the circle's start, heals it there, and spawns one of `archetypeId`. */
const loneAtRing = (session: Session, archetypeId: string): Unit => {
  freshStartAt(session);
  send(session, { kind: "heal" });
  send(session, { kind: "restore_mana" });
  step(session);
  spawnPack(session, archetypeId, 1, LONE_AT);

  const lone = nearestEnemy(session);

  if (lone === null) {
    throw new Error(`The ${archetypeId} was placed`);
  }

  return lone[1];
};

/** The panel's map reset, then the hero walked to the circle's start. */
const freshStartAt = (session: Session): void => {
  send(session, { kind: "reset_map" });
  step(session);
  send(session, { kind: "move", destination: RING_START });

  const hero = heroOf(session);

  do {
    step(session);
  } while (
    Math.hypot(hero.curr.x - RING_START.x, hero.curr.y - RING_START.y) > ARRIVED
  );
};

/** The gap between the hero and `unit`, edge to edge on their bound discs. */
const gapTo = (session: Session, unit: Readonly<Unit>): number => {
  const hero = heroOf(session);

  return (
    Math.hypot(unit.curr.x - hero.curr.x, unit.curr.y - hero.curr.y) -
    hero.boundRadius -
    unit.boundRadius
  );
};

/** Walks the circle for `ticks` ticks, clicking every few. */
const walkRound = (session: Session, ticks: number): void => {
  for (let tick = 0; tick < ticks; tick += 1) {
    if (tick % CLICK_TICKS === 0) {
      clickRound(session);
    }

    step(session);
  }
};

/**
 * The kite: the hero shoots one grunt as it spawns, then walks the circle away from it and,
 * once it has walked the kite leg and the gap is at least the kite gap, stops to shoot it,
 * walking on once the shot is loosed, until it dies.
 */
const kiteGrunt = (session: Session): void => {
  const grunt = loneAtRing(session, meleeGruntDef.id);
  const gruntId = nearestEnemy(session)?.[0] ?? null;
  const hero = heroOf(session);
  let shooting = false;
  let sinceClick = 0;

  if (gruntId === null) {
    throw new Error("The grunt was placed");
  }

  for (let ticks = 0; ticks < KITE_LIMIT_TICKS; ticks += 1) {
    if (grunt.state === "dead") {
      return;
    }

    if (shooting && hero.state === "attack_backswing") {
      shooting = false;
      sinceClick = 0;
    }

    const hasWalked = sinceClick >= KITE_LEG_TICKS || ticks === 0;

    if (!shooting && hasWalked && gapTo(session, grunt) >= KITE_GAP) {
      attack(session, gruntId);
      shooting = true;
    } else if (!shooting) {
      if (sinceClick % CLICK_TICKS === 0) {
        clickRound(session);
      }

      sinceClick += 1;
    }

    step(session);
  }

  throw new Error("The kite killed the grunt within its limit");
};

/** The spell `id` in the registry. */
const spellOf = (registry: Registry, id: string): SpellDef => {
  const spell = registry.spells.find((entry) => entry.id === id);

  if (spell === undefined) {
    throw new Error(`The registry holds the spell ${id}`);
  }

  return spell;
};

/** Where `spell` is aimed at `at`, by its targeting kind. */
const aimAt = (spell: SpellDef, at: Readonly<Vec2>): CastTarget => {
  const position = { x: at.x, y: at.y };

  switch (spell.targeting) {
    case "vector":
      return {
        kind: "vector",
        position,
        end: { x: at.x + GLACIER_DRAG.x, y: at.y + GLACIER_DRAG.y },
      };

    case "direction":
      return { kind: "direction", position };

    default:
      return { kind: "point", position };
  }
};

/** A heal on every tick of a tank fight that falls on the heal interval. */
const stepHealed = (session: Session): void => {
  if (session.world.view.tick % HEAL_EVERY_TICKS === 0) {
    send(session, { kind: "heal" });
  }

  step(session);
};

/**
 * Throws `id` at `tank`: the recipe's orb keys on one tick, R on the next, the cast aimed at
 * where the tank stands on the one after; tried again until the cast commits. Once it commits,
 * the throw is given time to reach the tank, and if it lifts the tank the next throw waits for
 * it to land, so nothing is thrown at a tank held in the air.
 */
const throwAt = (
  session: Session,
  registry: Registry,
  id: string,
  tank: Readonly<Unit>,
): void => {
  const spell = spellOf(registry, id);

  for (let attempt = 0; attempt < THROW_ATTEMPTS; attempt += 1) {
    for (const orb of spell.recipe) {
      send(session, { kind: "slot", slot: ORB_IDS.indexOf(orb) + 1 });
    }

    stepHealed(session);
    send(session, { kind: "slot", slot: INVOKE_SLOT });
    stepHealed(session);
    send(session, {
      kind: "cast",
      abilityId: id,
      target: aimAt(spell, tank.curr),
    });

    for (let tick = 0; tick < THROW_PATIENCE_TICKS; tick += 1) {
      stepHealed(session);

      if (session.committed.includes(id)) {
        for (let reach = 0; reach < THROW_REACH_TICKS; reach += 1) {
          stepHealed(session);
        }

        while (tank.disables.lifted) {
          stepHealed(session);
        }

        return;
      }
    }
  }

  throw new Error(`${id} was thrown within ${String(THROW_ATTEMPTS)} tries`);
};

/** A tank spawned after a reset, walked in, and the hero's to throw at. */
const freshTank = (session: Session): [EntityId, Unit] => {
  freshStart(session);
  spawnPack(session, tankDef.id, 1, PACK_AT);

  const tank = nearestEnemy(session);

  if (tank === null) {
    throw new Error("The tank was placed");
  }

  for (let tick = 0; tick < TANK_WALK_IN_TICKS; tick += 1) {
    stepHealed(session);
  }

  return tank;
};

/** After a reset at the circle's start: one of `archetypeId` attacked until it or the hero falls. */
const standAgainst = (session: Session, archetypeId: string): void => {
  const lone = loneAtRing(session, archetypeId);
  const loneId = nearestEnemy(session)?.[0] ?? null;

  if (loneId === null) {
    throw new Error(`The ${archetypeId} was placed`);
  }

  attack(session, loneId);

  while (lone.state !== "dead" && !isHeroDead(session)) {
    step(session);
  }
};

/**
 * The archetypes session at level 1: one grunt kited, one runner walked from, one archer stood
 * against, one archer walked from, one tank stood against; then at level 21 with every orb at
 * 7, five fresh tanks each given one spell with the panel's infinite mana and no cooldowns on.
 */
export const recordArchetypesSession = (registry: Registry): string => {
  const session = startSession(registry, ARCHETYPES_SEED);

  kiteGrunt(session);

  loneAtRing(session, fastRunnerDef.id);
  walkRound(session, WALK_TICKS);

  standAgainst(session, rangedArcherDef.id);

  loneAtRing(session, rangedArcherDef.id);
  walkRound(session, WALK_TICKS);

  standAgainst(session, tankDef.id);

  levelTo(session, TANK_LEVEL);
  send(session, {
    kind: "set_orb_levels",
    levels: ORB_IDS.map(() => TANK_ORB_LEVEL),
  });
  step(session);
  send(session, { kind: "toggle_infinite_mana" });
  send(session, { kind: "toggle_no_cooldowns" });
  step(session);

  for (const spell of TANK_SINGLES) {
    const spawnedAt = session.world.view.tick;
    const [, tank] = freshTank(session);

    throwAt(session, registry, spell, tank);

    while (session.world.view.tick - spawnedAt < TANK_FIGHT_TICKS) {
      stepHealed(session);
    }
  }

  freshStart(session);

  return serializeInputLog(
    session.world.view,
    session.world.log,
    contentVersionOf(registry),
    [],
  );
};

/** The spells session's orb levels, each thrown at with the hero at the level beside it. */
const SPELL_LEVELS = [
  { orb: 1, hero: 3 },
  { orb: 4, hero: 12 },
  { orb: 7, hero: 21 },
];

/**
 * The spells session's order at each orb level: every spell at a grunt pack, Siphon at an
 * archer pack too, and the three that leave a summon or a status on the hero's side last, so
 * none of them outlasts its own fight into another's.
 */
const SPELL_FIGHTS = [
  { spell: "hoarfrost", archetypeId: meleeGruntDef.id },
  { spell: "glacier", archetypeId: meleeGruntDef.id },
  { spell: "siphon", archetypeId: meleeGruntDef.id },
  { spell: "siphon", archetypeId: rangedArcherDef.id },
  { spell: "updraft", archetypeId: meleeGruntDef.id },
  { spell: "zenith", archetypeId: meleeGruntDef.id },
  { spell: "bolide", archetypeId: meleeGruntDef.id },
  { spell: "clarion", archetypeId: meleeGruntDef.id },
  { spell: "emberling", archetypeId: meleeGruntDef.id },
  { spell: "quicken", archetypeId: meleeGruntDef.id },
  { spell: "wane", archetypeId: meleeGruntDef.id },
];

/** The spells after which the hero attacks through the fight: the frosted grunt for Hoarfrost, the pack for the other two. */
const ATTACKING_SPELLS = ["hoarfrost", "emberling", "quicken"];

/** Ticks from a spell-fight's spawn to its orb keys, a second and a half. */
const SPELL_KEYS_AFTER_SPAWN_TICKS = 46;

/** The longest a thrown spell is given to commit, the hero walking into its range included. */
const SPELL_COMMIT_LIMIT_TICKS = 90;

/** Ticks a spell fight runs from its spawn to the next reset: the throw and eight seconds after it. */
const SPELL_FIGHT_TICKS = 292;

/** Where the living enemies stand on average, the centre a throw at the pack aims for. */
const packCentre = (session: Session): Vec2 => {
  const enemies = livingEnemies(session);
  let x = 0;
  let y = 0;

  for (const [, unit] of enemies) {
    x += unit.curr.x;
    y += unit.curr.y;
  }

  if (enemies.length === 0) {
    throw new Error("The pack stands when the spell is thrown at it");
  }

  return { x: x / enemies.length, y: y / enemies.length };
};

/** What `spell` is aimed at: the pack's centre, or the enemy nearest it for a spell aimed at a unit. */
const packTarget = (
  spell: SpellDef,
  centre: Readonly<Vec2>,
  targetId: EntityId,
): CastTarget => {
  if (spell.targeting === "unit") {
    return { kind: "unit", unitId: targetId };
  }

  if (spell.targeting === "none") {
    return { kind: "none" };
  }

  return aimAt(spell, centre);
};

/** The living enemy nearest `at`, ties to the lower slot. */
const enemyNearest = (session: Session, at: Readonly<Vec2>): EntityId => {
  let nearest: EntityId | null = null;
  let best = Number.POSITIVE_INFINITY;

  for (const [id, unit] of livingEnemies(session)) {
    const distance = Math.hypot(unit.curr.x - at.x, unit.curr.y - at.y);

    if (distance < best) {
      best = distance;
      nearest = id;
    }
  }

  if (nearest === null) {
    throw new Error("An enemy stands to throw at");
  }

  return nearest;
};

/**
 * One spells-session fight: a reset, a pack of five of `archetypeId`, and `id` thrown a second
 * and a half later at the pack's centre, at the enemy nearest it for a spell aimed at a unit;
 * once the throw commits, the hero attacks for the spells that fight beside the attack, and
 * otherwise stands, healed each second, until eight seconds have passed.
 */
const throwAtPack = (
  session: Session,
  registry: Registry,
  id: string,
  archetypeId: string,
): void => {
  const spell = spellOf(registry, id);

  send(session, { kind: "reset_map" });
  stepHealed(session);
  send(session, { kind: "restore_mana" });
  stepHealed(session);

  const spawnedAt = session.world.view.tick;

  send(session, {
    kind: "spawn_pack",
    archetypeId,
    tier: "normal",
    count: PACK_SIZE,
    position: PACK_AT,
  });

  while (session.world.view.tick - spawnedAt < SPELL_KEYS_AFTER_SPAWN_TICKS) {
    stepHealed(session);
  }

  for (const orb of spell.recipe) {
    send(session, { kind: "slot", slot: ORB_IDS.indexOf(orb) + 1 });
  }

  stepHealed(session);
  send(session, { kind: "slot", slot: INVOKE_SLOT });
  stepHealed(session);

  const centre = packCentre(session);
  const targetId = enemyNearest(session, centre);

  send(session, {
    kind: "cast",
    abilityId: id,
    target: packTarget(spell, centre, targetId),
  });

  const thrownAt = session.world.view.tick;

  do {
    stepHealed(session);

    if (session.world.view.tick - thrownAt > SPELL_COMMIT_LIMIT_TICKS) {
      throw new Error(`${id} committed within its limit`);
    }
  } while (!session.committed.includes(id));

  if (ATTACKING_SPELLS.includes(id)) {
    if (spell.targeting === "unit") {
      attack(session, targetId);
    } else {
      send(session, { kind: "attack_move", destination: packCentre(session) });
    }
  }

  while (session.world.view.tick - spawnedAt < SPELL_FIGHT_TICKS) {
    stepHealed(session);
  }
};

/**
 * The spells session: under the panel's infinite mana and no cooldowns, at each orb level with
 * the hero at the level beside it, every spell thrown once at a fresh pack.
 */
export const recordSpellsSession = (registry: Registry): string => {
  const session = startSession(registry, SPELLS_SEED);

  send(session, { kind: "toggle_infinite_mana" });
  send(session, { kind: "toggle_no_cooldowns" });
  step(session);

  for (const { orb, hero } of SPELL_LEVELS) {
    levelTo(session, hero);
    send(session, {
      kind: "set_orb_levels",
      levels: ORB_IDS.map(() => orb),
    });
    step(session);

    for (const { spell, archetypeId } of SPELL_FIGHTS) {
      throwAtPack(session, registry, spell, archetypeId);
    }
  }

  freshStart(session);

  return serializeInputLog(
    session.world.view,
    session.world.log,
    contentVersionOf(registry),
    [],
  );
};

/** Where every recorded log lives. */
const REPLAYS_DIR = new URL("../../simulation/replays/", import.meta.url);

/** Writes `text` as the recorded log `name` under `tests/simulation/replays/`. */
export const saveInputLog = (name: string, text: string): void => {
  writeFileSync(new URL(`${name}.json`, REPLAYS_DIR), text);
};
