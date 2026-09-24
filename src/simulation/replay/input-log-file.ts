import type { AnyCommand, Tick } from "@domain/public";
import type { InputLog } from "../input-log";
import type { WorldView } from "../world-view";

/** One consumed command with the tick it was consumed on, as the file holds it. */
export type InputLogRecord = Readonly<{
  tick: Tick;
  command: AnyCommand;
}>;

/**
 * What the developer panel's save button writes and a replay reads back: the seed the world
 * was created under, the content version stamp of the registry it was created on, the stamp
 * each content reload taken while it ran moved it to, the map it ran on, how many ticks it
 * ran, and every consumed command in the order the ticks took them. The file is the record a
 * bug report ships with, and a replay needs nothing else. A log with any reload in it spans
 * two versions and never replays.
 */
export type InputLogFile = Readonly<{
  seed: number;
  contentVersion: string;
  contentReloads: readonly string[];
  mapId: string;
  ticks: number;
  records: readonly InputLogRecord[];
}>;

/**
 * Why a log cannot replay: the text is not a log, the content version is not the one the
 * registry has or the log spans a content reload, or the map is not the one the world runs
 * on. The message is for a person and names what differs.
 */
export type ReplayRefusal = Readonly<{
  reason: "malformed" | "content_version" | "map";
  message: string;
}>;

/** Whether `value` is a refusal rather than the thing that was asked for. */
export const isReplayRefusal = (
  value: InputLogFile | ReplayRefusal,
): value is ReplayRefusal => "reason" in value;

/**
 * The file for the world behind `view` and its `log`, created under `contentVersion` and
 * moved by `contentReloads` since, as one JSON document. Called on a save, never per tick.
 */
export const serializeInputLog = (
  view: WorldView,
  log: InputLog,
  contentVersion: string,
  contentReloads: readonly string[],
): string => {
  const records: InputLogRecord[] = [];

  for (let index = 0; index < log.count; index += 1) {
    const tick = log.tickAt(index);
    const command = log.commandAt(index);

    if (tick !== null && command !== null) {
      records.push({ tick, command });
    }
  }

  const file: InputLogFile = {
    seed: view.run.random.seed,
    contentVersion,
    contentReloads,
    mapId: view.map.mapId,
    ticks: view.tick,
    records,
  };

  return JSON.stringify(file);
};

const malformed = (message: string): ReplayRefusal => ({
  reason: "malformed",
  message: `Not an input log: ${message}`,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isVersionList = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string");

const isTick = (value: unknown): value is Tick =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

/** Whether `value` has the shape every command shares: a kind, the tick it applies to, and its arrival stamp. The validator judges the rest when the tick consumes it. */
const isCommand = (value: unknown): value is AnyCommand =>
  isRecord(value) &&
  typeof value["kind"] === "string" &&
  isTick(value["tick"]) &&
  typeof value["timestamp"] === "number" &&
  Number.isFinite(value["timestamp"]);

/** The record `value` holds, or the reason it holds none. */
const parseRecord = (
  value: unknown,
  index: number,
): InputLogRecord | ReplayRefusal => {
  if (!isRecord(value)) {
    return malformed(`record ${String(index)} is not an object`);
  }

  const tick = value["tick"];
  const command = value["command"];

  if (!isTick(tick)) {
    return malformed(`record ${String(index)} has no tick`);
  }

  if (!isCommand(command)) {
    return malformed(
      `record ${String(index)} has no command with a kind, a tick, and a timestamp`,
    );
  }

  return { tick, command };
};

/**
 * The log `text` holds, or the reason it holds none: the text must be a JSON object with an
 * integer seed, a content version, the list of versions reloads moved it to, a map id, a tick count, and records in tick order, each
 * a tick before the count and a command with the shape every command shares. What a command
 * means is the validator's to judge when a tick consumes it, exactly as for a live one.
 */
export const parseInputLogFile = (
  text: string,
): InputLogFile | ReplayRefusal => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return malformed("the text is not JSON");
  }

  if (!isRecord(parsed)) {
    return malformed("the document is not an object");
  }

  const seed = parsed["seed"];
  const contentVersion = parsed["contentVersion"];
  const contentReloads = parsed["contentReloads"];
  const mapId = parsed["mapId"];
  const ticks = parsed["ticks"];
  const records = parsed["records"];

  if (typeof seed !== "number" || !Number.isInteger(seed)) {
    return malformed("the seed is not an integer");
  }

  if (typeof contentVersion !== "string") {
    return malformed("the content version is missing");
  }

  if (!isVersionList(contentReloads)) {
    return malformed("the content reloads are not a list of versions");
  }

  if (typeof mapId !== "string") {
    return malformed("the map id is missing");
  }

  if (!isTick(ticks)) {
    return malformed("the tick count is not a whole number");
  }

  if (!Array.isArray(records)) {
    return malformed("the records are not an array");
  }

  const parsedRecords: InputLogRecord[] = [];
  let lastTick = 0;

  for (let index = 0; index < records.length; index += 1) {
    const record = parseRecord(records[index], index);

    if ("reason" in record) {
      return record;
    }

    if (record.tick < lastTick) {
      return malformed(`record ${String(index)} is out of tick order`);
    }

    if (record.tick >= ticks) {
      return malformed(
        `record ${String(index)} is on tick ${String(record.tick)}, past the ${String(ticks)} ticks the session ran`,
      );
    }

    lastTick = record.tick;
    parsedRecords.push(record);
  }

  return {
    seed,
    contentVersion,
    contentReloads,
    mapId,
    ticks,
    records: parsedRecords,
  };
};
