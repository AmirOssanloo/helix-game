import type { Registry } from "@domain/public";
import type { InputLogFile } from "@simulation/public";
import { isReplayRefusal, parseInputLogFile } from "@simulation/public";
import type { StateChecksum } from "@simulation/testing";
import {
  beginReplay,
  checksumMismatch,
  contentVersionOf,
  mapOfLog,
  recordChecksums,
} from "@simulation/testing";

/** One stored log as it sits on disk: its file name and its text. */
export type StoredLog = Readonly<{
  name: string;
  text: string;
}>;

/**
 * What a re-stamp rewrites: the stamp alone, refusing a log whose replay misses a checksum it
 * holds; or the stamp and the checksums, recorded from the replay, which a change whose
 * behaviour is meant to move them runs.
 */
export type RestampMode = "stamps" | "checksums";

/**
 * One log's stamp before and after, whether its checksums were rewritten, and its text with
 * the new stamp and checksums, which is the text it had when nothing changed.
 */
export type RestampedLog = Readonly<{
  name: string;
  from: string;
  to: string;
  checksumsRewritten: boolean;
  text: string;
}>;

/** Why one log cannot be re-stamped. The message is for a person. */
export type RestampRefusal = Readonly<{
  name: string;
  message: string;
}>;

/** What a re-stamp came to: every log with its new text, or every refusal and nothing to write. */
export type RestampOutcome = Readonly<{
  restamped: readonly RestampedLog[];
  refusals: readonly RestampRefusal[];
}>;

/** The top-level stamp's key and value, as the log file writes them. */
const STAMP_PATTERN = /("contentVersion"\s*:\s*)"[^"]*"/;

/** The checksums' key and list, as the log file writes them. No entry holds a bracket. */
const CHECKSUMS_PATTERN = /"checksums"\s*:\s*\[[^\]]*\]/;

/** The records' key, which a log saved before checksums existed has the checksums inserted before. */
const RECORDS_PATTERN = /"records"\s*:/;

/**
 * The checksums `file`, stamped `stamp`, reaches on `registry` when replayed to its last tick,
 * or why it does not replay that far.
 */
const replayChecksums = (
  file: InputLogFile,
  stamp: string,
  registry: Registry,
): StateChecksum[] | string => {
  const map = mapOfLog(file, registry);

  if (isReplayRefusal(map)) {
    return map.message;
  }

  const replay = beginReplay(
    { ...file, contentVersion: stamp },
    { registry, map },
  );

  if (isReplayRefusal(replay)) {
    return replay.message;
  }

  try {
    return recordChecksums(replay);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    return `the replay failed on tick ${String(replay.view.tick)}: ${reason}`;
  }
};

/** `text` with `checksums` in place of the ones it holds, or inserted before its records when it holds none. */
const replaceChecksums = (
  text: string,
  checksums: readonly StateChecksum[],
): string => {
  const written = `"checksums":${JSON.stringify(checksums)}`;

  return CHECKSUMS_PATTERN.test(text)
    ? text.replace(CHECKSUMS_PATTERN, written)
    : text.replace(RECORDS_PATTERN, `${written},"records":`);
};

/**
 * `text` with its stamp `to`, its checksums `checksums`, and every other character as it was,
 * or `null` when the two are not where a log writes them.
 */
const rewritten = (
  text: string,
  file: InputLogFile,
  to: string,
  checksums: readonly StateChecksum[],
): string | null => {
  const stamped = text.replace(STAMP_PATTERN, `$1"${to}"`);
  const next =
    checksums === file.checksums
      ? stamped
      : replaceChecksums(stamped, checksums);
  const reread = parseInputLogFile(next);

  if (isReplayRefusal(reread)) {
    return null;
  }

  const expected = JSON.stringify({ ...file, contentVersion: to, checksums });

  return JSON.stringify(reread) === expected ? next : null;
};

/** One log re-stamped on `registry` to `to` under `mode`, or the reason it is not. */
const restampOne = (
  log: StoredLog,
  registry: Registry,
  to: string,
  mode: RestampMode,
): RestampedLog | RestampRefusal => {
  const file = parseInputLogFile(log.text);

  if (isReplayRefusal(file)) {
    return { name: log.name, message: file.message };
  }

  const replayed = replayChecksums(file, to, registry);

  if (typeof replayed === "string") {
    return { name: log.name, message: replayed };
  }

  const mismatch = checksumMismatch(file.checksums, replayed);

  if (mode === "stamps" && mismatch !== null) {
    return {
      name: log.name,
      message: `${mismatch}. Only a change whose behaviour is meant to move it records the checksums again, by pnpm restamp --checksums`,
    };
  }

  const rewriteChecksums =
    mode === "checksums" &&
    (mismatch !== null || file.checksums.length !== replayed.length);
  const checksums = rewriteChecksums ? replayed : file.checksums;
  const text = rewritten(log.text, file, to, checksums);

  if (text === null) {
    return {
      name: log.name,
      message: "its stamp or its checksums are not where a log writes them",
    };
  }

  return {
    name: log.name,
    from: file.contentVersion,
    to,
    checksumsRewritten: rewriteChecksums,
    text,
  };
};

/**
 * Every stored log in `logs` re-stamped to the content version of `registry`, touching no other
 * field but, under `checksums`, the checksums. Each is replayed to its last tick under the new
 * stamp first: a log that does not parse, names a map the registry has not got, spans a content
 * reload, or fails on any tick is refused, and so, under `stamps`, is one whose replay misses a
 * checksum it holds. One refusal leaves every log unwritten, so a re-stamp never hides a log
 * that stopped replaying behind a stamp that says it still does.
 */
export const restampLogs = (
  logs: readonly StoredLog[],
  registry: Registry,
  mode: RestampMode,
): RestampOutcome => {
  const to = contentVersionOf(registry);
  const restamped: RestampedLog[] = [];
  const refusals: RestampRefusal[] = [];

  for (const log of logs) {
    const outcome = restampOne(log, registry, to, mode);

    if ("message" in outcome) {
      refusals.push(outcome);
    } else {
      restamped.push(outcome);
    }
  }

  return refusals.length > 0
    ? { restamped: [], refusals }
    : { restamped, refusals };
};
