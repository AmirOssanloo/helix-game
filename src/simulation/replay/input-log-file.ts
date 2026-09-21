import type { AnyCommand, Tick } from "@domain/public";
import type { InputLog } from "../input-log";

/** One consumed command with the tick it was consumed on, as the file holds it. */
export type InputLogRecord = Readonly<{
  tick: Tick;
  command: AnyCommand;
}>;

/**
 * What the developer panel's save button writes and a replay reads back: the seed the world
 * was created under and every consumed command in the order the ticks took them. The file is
 * the record a bug report ships with.
 */
export type InputLogFile = Readonly<{
  seed: number;
  records: readonly InputLogRecord[];
}>;

/** The file for `log` under `seed`, as one JSON document. Called on a save, never per tick. */
export const serializeInputLog = (seed: number, log: InputLog): string => {
  const records: InputLogRecord[] = [];

  for (let index = 0; index < log.count; index += 1) {
    const tick = log.tickAt(index);
    const command = log.commandAt(index);

    if (tick !== null && command !== null) {
      records.push({ tick, command });
    }
  }

  const file: InputLogFile = { seed, records };

  return JSON.stringify(file);
};
