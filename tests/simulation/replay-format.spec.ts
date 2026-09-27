import { describe, expect, it } from "vitest";
import { arenaDef, contentRegistry } from "@content/public";
import type { MapDef, Registry } from "@domain/public";
import {
  copyTunableDefinitions,
  createDefinitionSlots,
  definitionFields,
} from "@domain/public";
import type { InputLogFile } from "@simulation/public";
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
    serializeInputLog(
      world.view,
      world.log,
      world.mapDef.id,
      contentVersionOf(registry),
      [],
    ),
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
  it("round-trips the seed, the content version, the content reloads, the map, the ticks run, no checksums, and the records", () => {
    const file = recordedLog();

    expect(file).toEqual({
      seed: SEED,
      contentVersion: contentVersionOf(registry),
      contentReloads: [],
      mapId: RECORDED_MAP_ID,
      ticks: 2,
      checksums: [],
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

  it("reads a document with no checksums as a log that holds none", () => {
    const file = parseInputLogFile(
      '{"seed":1,"contentVersion":"a","contentReloads":[],"mapId":"m","ticks":2,"records":[]}',
    );

    expect(isReplayRefusal(file) ? null : file.checksums).toEqual([]);
  });

  it.each([
    ['"checksums":{}', "not a list"],
    ['"checksums":[{"tick":0}]', "no value"],
    ['"checksums":[{"tick":0,"value":1.5}]', "a fractional value"],
    ['"checksums":[{"tick":2,"value":1},{"tick":1,"value":1}]', "out of order"],
    ['"checksums":[{"tick":3,"value":1}]', "past the last tick"],
  ])("refuses checksums with %s, %s", (checksums) => {
    expect(
      refusalOf(
        `{"seed":1,"contentVersion":"a","contentReloads":[],"mapId":"m","ticks":2,${checksums},"records":[]}`,
      ),
    ).toContain("the checksums are not a list of ticks in order");
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
