import { describe, expect, it } from "vitest";
import { reloadContent } from "@app/public";
import { contentRegistry, meleeGruntDef } from "@content/public";
import type { EnemyDef, MapDef, Registry } from "@domain/public";
import type {
  CommandStamps,
  InputLogFile,
  WorldView,
} from "@simulation/public";
import {
  beginReplay,
  contentVersionOf,
  createSessionWorld,
  isReplayRefusal,
  mapOfLog,
  parseInputLogFile,
  Replay,
  serializeInputLog,
  Session,
} from "@simulation/public";
import type { MakeRegistryOptions } from "../helpers";
import { makeMapDef, makeRegistry, submit } from "../helpers";

const SEED = 5;

/** The map a session here starts on, by a fixed id so a message can name it. */
const RECORDED_MAP_ID = "recorded_map";

const recordedMap = (): MapDef => makeMapDef.build({ id: RECORDED_MAP_ID });

/** A second map, spawning away from the origin so a spec can tell the two apart, with one live pack on it. */
const OTHER_MAP_ID = "other_map";

const OTHER_SPAWN = { x: 400, y: -300 };

const otherMap = (): MapDef =>
  makeMapDef.build({
    id: OTHER_MAP_ID,
    spawnPoint: OTHER_SPAWN,
    packs: [
      {
        archetypeId: meleeGruntDef.id,
        tier: "normal",
        count: 2,
        position: { x: 900, y: -300 },
        dormant: false,
      },
    ],
  });

/** A registry over the content layer's with the two maps above, the one every session here is made from. */
const sessionRegistry = (options: MakeRegistryOptions = {}): Registry =>
  makeRegistry({ maps: [recordedMap(), otherMap()], ...options });

/** A log of two ticks with one command on the first, saved from a real session world and parsed back. */
const recordedLog = (): InputLogFile => {
  const world = createSessionWorld({
    seed: SEED,
    registry: sessionRegistry(),
    map: recordedMap(),
  });

  submit(world, { kind: "level_up", tick: 0, timestamp: 1 });
  world.tick();
  world.tick();

  const file = parseInputLogFile(
    serializeInputLog(
      world.view,
      world.log,
      world.mapDef.id,
      contentVersionOf(sessionRegistry()),
      [],
    ),
  );

  if (isReplayRefusal(file)) {
    throw new Error(file.message);
  }

  return file;
};

/** The content registry with the grunt's health at `health`, as a save of its file would assemble it. */
const withGruntHealth = (health: number): Registry =>
  sessionRegistry({
    enemies: contentRegistry.enemies.map((def): EnemyDef =>
      def.id === meleeGruntDef.id ? { ...def, health } : def,
    ),
  });

/** A session over the content registry on the map `mapId` names, and the stamps its reloads' commands carry. */
const arrangeSession = (
  mapId: string = RECORDED_MAP_ID,
): { session: Session; stamps: CommandStamps } => {
  const session = new Session({
    seed: SEED,
    registry: sessionRegistry(),
    mapId,
  });
  const stamps: CommandStamps = {
    get nextTick(): number {
      return session.view.tick;
    },
    now: (): number => 0,
  };

  return { session, stamps };
};

/** Plays `ticks` ticks into `session` from a grunt pack spawned and the hero sent walking. */
const play = (session: Session, ticks: number): void => {
  const start = session.view.tick;

  session.submit({
    kind: "spawn_pack",
    tick: start,
    timestamp: start,
    archetypeId: meleeGruntDef.id,
    tier: "normal",
    count: 3,
    position: { x: 300, y: 0 },
  });
  session.submit({
    kind: "move",
    tick: start,
    timestamp: start + 0.5,
    destination: { x: -200, y: 150 },
  });

  for (let tick = 0; tick < ticks; tick += 1) {
    session.tick();
  }
};

/** A map's entries in insertion order, so a `Map` compares as data. */
const replacer = (_key: string, value: unknown): unknown =>
  value instanceof Map ? [...value.entries()] : value;

/** What a spawn and a walk decide, as one string: the tick, the tuning state, the random state, and every unit slot. */
const snapshotOf = (view: WorldView): string => {
  const units: unknown[] = [];

  for (let index = 0; index < view.map.units.end; index += 1) {
    units.push(view.map.units.at(index));
  }

  return JSON.stringify(
    {
      tick: view.tick,
      tuning: view.run.tuning,
      random: view.run.random,
      units,
    },
    replacer,
  );
};

describe("a session's saved log", () => {
  it("replays identically when no content changed since the session started", () => {
    const { session } = arrangeSession();

    play(session, 40);

    const text = session.saveInputLog();
    const recorded = snapshotOf(session.view);
    const { session: replaying } = arrangeSession();

    expect(JSON.parse(text)).toMatchObject({ contentReloads: [] });
    expect(replaying.loadInputLog(text)).toBeNull();

    while (replaying.replaying) {
      replaying.tick();
    }

    expect(snapshotOf(replaying.view)).toBe(recorded);
  });

  it("is refused after a reload that changed a number, naming both versions, and replays again once the session is made again", () => {
    const { session, stamps } = arrangeSession();
    const before = session.contentVersion;

    play(session, 10);

    expect(reloadContent(session, stamps, withGruntHealth(900)).outcome).toBe(
      "taken",
    );

    play(session, 10);

    const after = session.contentVersion;
    const text = session.saveInputLog();

    expect(after).not.toBe(before);
    expect(JSON.parse(text)).toMatchObject({
      contentVersion: before,
      contentReloads: [after],
    });
    expect(session.loadInputLog(text)).toBe(
      `The log spans a content reload: it was recorded on content version ${before} and then ${after}; a replay is only valid within one content version`,
    );
    expect(session.replaying).toBe(false);
    expect(session.view.tick).toBe(20);

    const file = parseInputLogFile(text);

    if (isReplayRefusal(file)) {
      throw new Error(file.message);
    }

    expect(
      beginReplay(file, {
        registry: withGruntHealth(900),
        map: recordedMap(),
      }) instanceof Replay,
    ).toBe(false);

    session.recreate(SEED);
    play(session, 10);

    expect(JSON.parse(session.saveInputLog())).toMatchObject({
      contentVersion: after,
      contentReloads: [],
    });
    expect(session.loadInputLog(session.saveInputLog())).toBeNull();
  });

  it("names every version when two reloads were taken, one of them back to where it began", () => {
    const { session, stamps } = arrangeSession();
    const before = session.contentVersion;

    reloadContent(session, stamps, withGruntHealth(900));
    session.tick();

    const middle = session.contentVersion;

    reloadContent(session, stamps, sessionRegistry());
    session.tick();

    expect(session.contentVersion).toBe(before);
    expect(session.loadInputLog(session.saveInputLog())).toContain(
      `${before} and then ${middle} and then ${before};`,
    );
  });

  it("marks nothing when a reload changed no number", () => {
    const { session, stamps } = arrangeSession();

    reloadContent(session, stamps, sessionRegistry());
    session.tick();

    expect(JSON.parse(session.saveInputLog())).toMatchObject({
      contentReloads: [],
    });
    expect(session.loadInputLog(session.saveInputLog())).toBeNull();
  });
});

/** Where the hero of `view` stands. */
const heroAt = (view: WorldView): Readonly<{ x: number; y: number }> => {
  const heroId = view.run.heroId;
  const hero = heroId === null ? null : view.map.units.resolve(heroId);

  if (hero === null) {
    throw new Error("The session has no hero");
  }

  return { x: hero.curr.x, y: hero.curr.y };
};

describe("a log loaded into a session", () => {
  it("replays on its own map when the session runs another", () => {
    const { session } = arrangeSession(OTHER_MAP_ID);

    expect(session.mapId).toBe(OTHER_MAP_ID);

    play(session, 40);

    const text = session.saveInputLog();
    const recorded = snapshotOf(session.view);
    const { session: replaying } = arrangeSession();

    expect(JSON.parse(text)).toMatchObject({ mapId: OTHER_MAP_ID });
    expect(replaying.mapId).toBe(RECORDED_MAP_ID);
    expect(replaying.loadInputLog(text)).toBeNull();
    expect(replaying.mapId).toBe(OTHER_MAP_ID);
    expect(replaying.view.map.mapId).toBe(OTHER_MAP_ID);
    expect(heroAt(replaying.view)).toEqual(OTHER_SPAWN);

    while (replaying.replaying) {
      replaying.tick();
    }

    expect(snapshotOf(replaying.view)).toBe(recorded);
  });

  it("is refused with its map's id when no map has it, and the world keeps running", () => {
    const { session } = arrangeSession();

    play(session, 5);

    const text = JSON.stringify({
      ...JSON.parse(session.saveInputLog()),
      mapId: "no_such_map",
    });

    expect(session.loadInputLog(text)).toBe(
      'The log was recorded on map "no_such_map", which no map in this build has',
    );
    expect(session.replaying).toBe(false);
    expect(session.mapId).toBe(RECORDED_MAP_ID);
    expect(session.view.tick).toBe(5);

    session.tick();

    expect(session.view.tick).toBe(6);
  });

  it("is refused by mapOfLog, which finds only a registered map", () => {
    const file = recordedLog();
    const found = mapOfLog(file, sessionRegistry());

    expect(isReplayRefusal(found) ? null : found.id).toBe(RECORDED_MAP_ID);
    expect(mapOfLog({ ...file, mapId: "gone" }, sessionRegistry())).toEqual({
      reason: "map",
      message:
        'The log was recorded on map "gone", which no map in this build has',
    });
  });
});

/** Submits a `load_map` for `mapId` into `session` for its next tick, as the panel's Map does, and ticks it. */
const changeMap = (session: Session, mapId: string): void => {
  const tick = session.view.tick;

  session.submit({ kind: "load_map", tick, timestamp: tick, mapId });
  session.tick();
};

/** The hero's level of `view`. */
const heroLevel = (view: WorldView): number => {
  const heroId = view.run.heroId;
  const hero = heroId === null ? null : view.map.units.resolve(heroId);

  if (hero === null) {
    throw new Error("The session has no hero");
  }

  return hero.progression.level;
};

describe("changing map", () => {
  it("is the panel's map choice: a load_map in the log that keeps the run, with no new session", () => {
    const { session } = arrangeSession();

    session.submit({ kind: "level_up", tick: 0, timestamp: 0 });
    play(session, 10);
    changeMap(session, OTHER_MAP_ID);

    expect(session.mapId).toBe(OTHER_MAP_ID);
    expect(session.startingMapId).toBe(RECORDED_MAP_ID);
    expect(session.view.tick).toBe(11);
    expect(heroLevel(session.view)).toBe(2);
    expect(heroAt(session.view)).toEqual(OTHER_SPAWN);
    expect(session.log.commandAt(session.log.count - 1)).toMatchObject({
      kind: "load_map",
      mapId: OTHER_MAP_ID,
    });
  });
});

describe("a restart", () => {
  it("begins a new run on the loaded map under the seed: both scopes made again, and nothing in the log", () => {
    const { session } = arrangeSession();

    session.submit({ kind: "level_up", tick: 0, timestamp: 0 });
    play(session, 10);
    changeMap(session, OTHER_MAP_ID);
    session.recreate(SEED + 1);

    expect(session.seed).toBe(SEED + 1);
    expect(session.view.tick).toBe(0);
    expect(session.log.count).toBe(0);
    expect(session.mapId).toBe(OTHER_MAP_ID);
    expect(session.startingMapId).toBe(OTHER_MAP_ID);
    expect(heroLevel(session.view)).toBe(1);
    expect(heroAt(session.view)).toEqual(OTHER_SPAWN);
    expect(session.view.map.units.count).toBe(1 + 2);
    expect(JSON.parse(session.saveInputLog())).toMatchObject({
      mapId: OTHER_MAP_ID,
    });
  });

  it("lists every registered map in the order the registry holds them", () => {
    const { session } = arrangeSession();

    expect(session.mapIds).toEqual([RECORDED_MAP_ID, OTHER_MAP_ID]);
  });
});
