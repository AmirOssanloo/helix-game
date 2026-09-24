import { describe, expect, it } from "vitest";
import type { CommandStamps } from "@app/public";
import { reloadContent, Session } from "@app/public";
import { arenaDef, contentRegistry, meleeGruntDef } from "@content/public";
import type { EnemyDef, MapDef, Registry } from "@domain/public";
import {
  copyTunableDefinitions,
  createDefinitionSlots,
  definitionFields,
} from "@domain/public";
import type { InputLogFile, WorldView } from "@simulation/public";
import {
  beginReplay,
  checkReplayable,
  contentVersionOf,
  createSessionWorld,
  isReplayRefusal,
  parseInputLogFile,
  Replay,
  serializeInputLog,
} from "@simulation/public";
import { makeMapDef, makeRegistry, submit } from "../helpers";

const SEED = 5;

const registry = makeRegistry();

/** The map every recorded log here was recorded on, by a fixed id so a message can name it. */
const RECORDED_MAP_ID = "recorded_map";

const recordedMap = (): MapDef => makeMapDef.build({ id: RECORDED_MAP_ID });

/** A log of two ticks with one command on the first, saved from a real session world and parsed back. */
const recordedLog = (): InputLogFile => {
  const world = createSessionWorld({
    seed: SEED,
    registry,
    map: recordedMap(),
  });

  submit(world, { kind: "level_up", tick: 0, timestamp: 1 });
  world.tick();
  world.tick();

  const file = parseInputLogFile(
    serializeInputLog(world.view, world.log, contentVersionOf(registry), []),
  );

  if (isReplayRefusal(file)) {
    throw new Error(file.message);
  }

  return file;
};

/** The refusal `parseInputLogFile` gives `text`, failing loudly when it parses instead. */
const refusalOf = (text: string): string => {
  const file = parseInputLogFile(text);

  if (!isReplayRefusal(file)) {
    throw new Error("The text parsed as a log");
  }

  return `${file.reason}: ${file.message}`;
};

describe("the content version stamp", () => {
  it("is the same for the same content", () => {
    expect(contentVersionOf(makeRegistry())).toBe(contentVersionOf(registry));
  });

  it("changes when one tuning number changes", () => {
    const retuned = makeRegistry({ tuning: { base_ms: 281 } });

    expect(contentVersionOf(retuned)).not.toBe(contentVersionOf(registry));
  });

  it("changes when any one number of any definition changes, so it covers every converted number", () => {
    const copies = copyTunableDefinitions(contentRegistry);
    const slots = createDefinitionSlots(copies, new Map([["sim_hz", 30]]));
    const stamped: Registry = { ...contentRegistry, ...copies };
    const version = contentVersionOf(stamped);
    const unchanged: string[] = [];

    expect(version).toBe(contentVersionOf(contentRegistry));
    expect(slots.size).toBe(definitionFields(contentRegistry).length);

    for (const [key, slot] of slots) {
      const holder = slot.container as Record<string | number, number>;
      const written = holder[slot.property] ?? 0;

      holder[slot.property] = written + 1;

      if (contentVersionOf(stamped) === version) {
        unchanged.push(key);
      }

      holder[slot.property] = written;
    }

    expect(unchanged).toEqual([]);
    expect(contentVersionOf(stamped)).toBe(version);
  });

  it("does not depend on the order a definition wrote its fields in", () => {
    const shuffled = makeRegistry({
      hero: {
        maxOrbLevel: registry.hero.maxOrbLevel,
        skillPointsPerLevel: registry.hero.skillPointsPerLevel,
        startingSkillPoints: registry.hero.startingSkillPoints,
        experienceThresholds: registry.hero.experienceThresholds,
        maxLevel: registry.hero.maxLevel,
        attack: registry.hero.attack,
        forms: registry.hero.forms,
      },
    });

    expect(contentVersionOf(shuffled)).toBe(contentVersionOf(registry));
  });
});

describe("the input log file", () => {
  it("round-trips the seed, the content version, the content reloads, the map, the ticks run, and the records", () => {
    const file = recordedLog();

    expect(file).toEqual({
      seed: SEED,
      contentVersion: contentVersionOf(registry),
      contentReloads: [],
      mapId: RECORDED_MAP_ID,
      ticks: 2,
      records: [
        { tick: 0, command: { kind: "level_up", tick: 0, timestamp: 1 } },
      ],
    });
  });

  it("refuses text that is not JSON", () => {
    expect(refusalOf("{")).toBe(
      "malformed: Not an input log: the text is not JSON",
    );
  });

  it("refuses a document without a seed", () => {
    expect(refusalOf('{"records":[]}')).toContain("the seed is not an integer");
  });

  it("refuses a document without a content version", () => {
    expect(refusalOf('{"seed":1,"records":[]}')).toContain(
      "the content version is missing",
    );
  });

  it("refuses a document whose content reloads are not a list of versions", () => {
    expect(
      refusalOf(
        '{"seed":1,"contentVersion":"a","contentReloads":"b","mapId":"m","ticks":1,"records":[]}',
      ),
    ).toContain("the content reloads are not a list of versions");
  });

  it("refuses a record with no command shape", () => {
    expect(
      refusalOf(
        '{"seed":1,"contentVersion":"a","contentReloads":[],"mapId":"m","ticks":2,"records":[{"tick":0,"command":{"kind":"noop"}}]}',
      ),
    ).toContain("record 0 has no command");
  });

  it("refuses records out of tick order", () => {
    const text = JSON.stringify({
      seed: 1,
      contentVersion: "a",
      contentReloads: [],
      mapId: "m",
      ticks: 3,
      records: [
        { tick: 2, command: { kind: "noop", tick: 2, timestamp: 1 } },
        { tick: 1, command: { kind: "noop", tick: 1, timestamp: 2 } },
      ],
    });

    expect(refusalOf(text)).toContain("record 1 is out of tick order");
  });

  it("refuses a record past the ticks the session ran", () => {
    const text = JSON.stringify({
      seed: 1,
      contentVersion: "a",
      contentReloads: [],
      mapId: "m",
      ticks: 1,
      records: [{ tick: 1, command: { kind: "noop", tick: 1, timestamp: 1 } }],
    });

    expect(refusalOf(text)).toContain("past the 1 ticks the session ran");
  });
});

describe("a replay is refused", () => {
  it("when the content version differs, with a message naming both versions", () => {
    const recorded = { ...recordedLog(), contentVersion: "deadbeef" };
    const refusal = checkReplayable(recorded, registry, recordedMap());

    expect(refusal?.reason).toBe("content_version");
    expect(refusal?.message).toContain("deadbeef");
    expect(refusal?.message).toContain(contentVersionOf(registry));
  });

  it("when the log spans a content reload, with a message naming every version, even on the registry it ended on", () => {
    const recorded = {
      ...recordedLog(),
      contentVersion: "deadbeef",
      contentReloads: [contentVersionOf(registry)],
    };
    const refusal = checkReplayable(recorded, registry, recordedMap());

    expect(refusal).toEqual({
      reason: "content_version",
      message: `The log spans a content reload: it was recorded on content version deadbeef and then ${contentVersionOf(registry)}; a replay is only valid within one content version`,
    });
  });

  it("when the map differs, with a message naming both maps", () => {
    const refusal = checkReplayable(recordedLog(), registry, arenaDef);

    expect(refusal?.reason).toBe("map");
    expect(refusal?.message).toContain(`"${RECORDED_MAP_ID}"`);
    expect(refusal?.message).toContain('"arena"');
  });

  it("by beginReplay, which then creates no world", () => {
    const recorded = { ...recordedLog(), contentVersion: "deadbeef" };
    const result = beginReplay(recorded, { registry, map: recordedMap() });

    expect(result instanceof Replay).toBe(false);
  });

  it("never when the log was recorded on this content and this map", () => {
    const file = recordedLog();
    const map = makeMapDef.build();

    expect(
      checkReplayable(file, registry, { ...map, id: file.mapId }),
    ).toBeNull();
  });
});

/** The content registry with the grunt's health at `health`, as a save of its file would assemble it. */
const withGruntHealth = (health: number): Registry =>
  makeRegistry({
    enemies: contentRegistry.enemies.map((def): EnemyDef =>
      def.id === meleeGruntDef.id ? { ...def, health } : def,
    ),
  });

/** A session over the content registry, and the stamps its reloads' commands carry. */
const arrangeSession = (): { session: Session; stamps: CommandStamps } => {
  const session = new Session({
    seed: SEED,
    registry: makeRegistry(),
    map: recordedMap(),
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

    reloadContent(session, stamps, makeRegistry());
    session.tick();

    expect(session.contentVersion).toBe(before);
    expect(session.loadInputLog(session.saveInputLog())).toContain(
      `${before} and then ${middle} and then ${before};`,
    );
  });

  it("marks nothing when a reload changed no number", () => {
    const { session, stamps } = arrangeSession();

    reloadContent(session, stamps, makeRegistry());
    session.tick();

    expect(JSON.parse(session.saveInputLog())).toMatchObject({
      contentReloads: [],
    });
    expect(session.loadInputLog(session.saveInputLog())).toBeNull();
  });
});
