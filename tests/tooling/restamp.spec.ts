import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { arenaDef, contentRegistry } from "@content/public";
import type { Registry } from "@domain/public";
import {
  contentVersionOf,
  createSessionWorld,
  isReplayRefusal,
  parseInputLogFile,
  serializeInputLog,
} from "@simulation/public";
import type { StoredLog } from "../../tooling/restamp-logs";
import { restampLogs } from "../../tooling/restamp-logs";
import { makeRegistry, REPOSITORY_ROOT, submit } from "../helpers";

const registry = makeRegistry();

/** A stamp no content has, as a log recorded on older content carries. */
const OLD_STAMP = "0badc0de";

/** Ticks each recording here runs: enough for a command to take effect, short enough to replay at once. */
const RECORDED_TICKS = 30;

const STORED_LOGS_DIR = join(REPOSITORY_ROOT, "tests", "simulation", "replays");

/** A log of `RECORDED_TICKS` ticks on the arena under `seed`, the hero levelled on its first, stamped `stamp`. */
const recordedText = (seed: number, stamp: string): string => {
  const world = createSessionWorld({ seed, registry, map: arenaDef });

  submit(world, { kind: "level_up", tick: 0, timestamp: 1 });

  for (let tick = 0; tick < RECORDED_TICKS; tick += 1) {
    world.tick();
  }

  return serializeInputLog(world.view, world.log, stamp, []);
};

/** `text` with its parsed fields changed by `change` and written back, for a log a recording could not make. */
const edited = (
  text: string,
  change: (fields: Record<string, unknown>) => Record<string, unknown>,
): string => {
  const fields: unknown = JSON.parse(text);

  if (fields === null || typeof fields !== "object") {
    throw new Error("A recorded log is an object");
  }

  return JSON.stringify(change({ ...fields }));
};

/** A move with no target: a command by the shape the log parser checks, which no tick can carry out. */
const BROKEN_MOVE: Readonly<Record<string, unknown>> = {
  kind: "move",
  tick: 3,
  timestamp: 4,
};

describe("restamping the stored logs", () => {
  it("rewrites the stamp of a log recorded on other content, and not one other character", () => {
    const text = recordedText(1, OLD_STAMP);
    const outcome = restampLogs([{ name: "old.json", text }], registry);
    const current = contentVersionOf(registry);

    expect(outcome.refusals).toEqual([]);
    expect(outcome.restamped).toEqual([
      {
        name: "old.json",
        from: OLD_STAMP,
        to: current,
        text: text.replace(OLD_STAMP, current),
      },
    ]);
  });

  it("writes nothing when every stamp is current", () => {
    const current = contentVersionOf(registry);
    const logs: StoredLog[] = [
      { name: "a.json", text: recordedText(1, current) },
      { name: "b.json", text: recordedText(2, current) },
    ];
    const outcome = restampLogs(logs, registry);

    expect(outcome.refusals).toEqual([]);
    expect(
      outcome.restamped.filter(
        (log, index) => log.from !== log.to || log.text !== logs[index]?.text,
      ),
    ).toEqual([]);
  });

  it("rewrites every stamp after a tuning edit", () => {
    const current = contentVersionOf(registry);
    const retuned: Registry = makeRegistry({
      tuning: { base_ms: registry.tuning.base_ms + 1 },
    });
    const logs: StoredLog[] = [
      { name: "a.json", text: recordedText(1, current) },
      { name: "b.json", text: recordedText(2, current) },
    ];
    const outcome = restampLogs(logs, retuned);

    expect(outcome.refusals).toEqual([]);
    expect(outcome.restamped.map((log) => [log.from, log.to])).toEqual([
      [current, contentVersionOf(retuned)],
      [current, contentVersionOf(retuned)],
    ]);
  });

  it("refuses a log that no longer replays, and writes no log at all", () => {
    const good = recordedText(1, OLD_STAMP);
    const broken = edited(recordedText(2, OLD_STAMP), (fields) => ({
      ...fields,
      records: [{ tick: 3, command: BROKEN_MOVE }],
    }));
    const outcome = restampLogs(
      [
        { name: "good.json", text: good },
        { name: "broken.json", text: broken },
      ],
      registry,
    );

    expect(outcome.restamped).toEqual([]);
    expect(outcome.refusals.map((refusal) => refusal.name)).toEqual([
      "broken.json",
    ]);
    expect(outcome.refusals[0]?.message).toContain("failed on tick 3");
  });

  it("refuses a log on a map the content has not got, one spanning a content reload, and text that is not a log", () => {
    const text = recordedText(1, OLD_STAMP);
    const lost = edited(text, (fields) => ({ ...fields, mapId: "lost_map" }));
    const reloaded = edited(text, (fields) => ({
      ...fields,
      contentReloads: ["feedf00d"],
    }));
    const outcome = restampLogs(
      [
        { name: "lost.json", text: lost },
        { name: "reloaded.json", text: reloaded },
        { name: "prose.json", text: "not a log" },
      ],
      registry,
    );

    expect(outcome.restamped).toEqual([]);
    expect(outcome.refusals.map((refusal) => refusal.name)).toEqual([
      "lost.json",
      "reloaded.json",
      "prose.json",
    ]);
  });

  it("finds every log under tests/simulation/replays/ already current, so a restamp of the tree as it is writes nothing", () => {
    const names = readdirSync(STORED_LOGS_DIR).filter((name) =>
      name.endsWith(".json"),
    );
    const stale = names.filter((name) => {
      const file = parseInputLogFile(
        readFileSync(join(STORED_LOGS_DIR, name), "utf8"),
      );

      return (
        isReplayRefusal(file) ||
        file.contentVersion !== contentVersionOf(contentRegistry)
      );
    });

    expect(names.length).toBeGreaterThan(0);
    expect(stale).toEqual([]);
  });
});
