import { describe, expect, it } from "vitest";
import { arenaDef } from "@content/public";
import type { MapDef } from "@domain/public";
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
    serializeInputLog(world.view, world.log, contentVersionOf(registry)),
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

  it("does not depend on the order a definition wrote its fields in", () => {
    const shuffled = makeRegistry({
      hero: {
        maxOrbLevel: registry.hero.maxOrbLevel,
        skillPointsPerLevel: registry.hero.skillPointsPerLevel,
        startingSkillPoints: registry.hero.startingSkillPoints,
        experienceThresholds: registry.hero.experienceThresholds,
        maxLevel: registry.hero.maxLevel,
        forms: registry.hero.forms,
      },
    });

    expect(contentVersionOf(shuffled)).toBe(contentVersionOf(registry));
  });
});

describe("the input log file", () => {
  it("round-trips the seed, the content version, the map, the ticks run, and the records", () => {
    const file = recordedLog();

    expect(file).toEqual({
      seed: SEED,
      contentVersion: contentVersionOf(registry),
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

  it("refuses a record with no command shape", () => {
    expect(
      refusalOf(
        '{"seed":1,"contentVersion":"a","mapId":"m","ticks":2,"records":[{"tick":0,"command":{"kind":"noop"}}]}',
      ),
    ).toContain("record 0 has no command");
  });

  it("refuses records out of tick order", () => {
    const text = JSON.stringify({
      seed: 1,
      contentVersion: "a",
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
