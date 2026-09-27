import type { Registry } from "@domain/public";
import type { InputLogFile } from "@simulation/public";
import {
  beginReplay,
  contentVersionOf,
  isReplayRefusal,
  mapOfLog,
  parseInputLogFile,
} from "@simulation/public";

/** One stored log as it sits on disk: its file name and its text. */
export type StoredLog = Readonly<{
  name: string;
  text: string;
}>;

/** One log's stamp before and after, and its text with the new stamp, which is the text it had when the two agree. */
export type RestampedLog = Readonly<{
  name: string;
  from: string;
  to: string;
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

/** Why `file`, stamped `stamp`, does not replay to its last tick on `registry`, or `null` when it does. */
const replayFailure = (
  file: InputLogFile,
  stamp: string,
  registry: Registry,
): string | null => {
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
    while (!replay.done) {
      replay.tick();
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    return `the replay failed on tick ${String(replay.view.tick)}: ${reason}`;
  }

  return null;
};

/** `text` with its stamp `to` and every other character as it was, or `null` when the stamp is not where a log writes it. */
const withStamp = (
  text: string,
  file: InputLogFile,
  to: string,
): string | null => {
  const rewritten = text.replace(STAMP_PATTERN, `$1"${to}"`);
  const reread = parseInputLogFile(rewritten);

  if (isReplayRefusal(reread)) {
    return null;
  }

  const expected = JSON.stringify({ ...file, contentVersion: to });

  return JSON.stringify(reread) === expected ? rewritten : null;
};

/** One log re-stamped on `registry` to `to`, or the reason it is not. */
const restampOne = (
  log: StoredLog,
  registry: Registry,
  to: string,
): RestampedLog | RestampRefusal => {
  const file = parseInputLogFile(log.text);

  if (isReplayRefusal(file)) {
    return { name: log.name, message: file.message };
  }

  const failure = replayFailure(file, to, registry);

  if (failure !== null) {
    return { name: log.name, message: failure };
  }

  const text = withStamp(log.text, file, to);

  if (text === null) {
    return {
      name: log.name,
      message: "its stamp is not where a log writes it",
    };
  }

  return { name: log.name, from: file.contentVersion, to, text };
};

/**
 * Every stored log in `logs` re-stamped to the content version of `registry`, touching no other
 * field. Each is replayed to its last tick under the new stamp first: a log that does not parse,
 * names a map the registry has not got, spans a content reload, or fails on any tick is refused,
 * and one refusal leaves every log unwritten, so a re-stamp never hides a log that stopped
 * replaying behind a stamp that says it still does.
 */
export const restampLogs = (
  logs: readonly StoredLog[],
  registry: Registry,
): RestampOutcome => {
  const to = contentVersionOf(registry);
  const restamped: RestampedLog[] = [];
  const refusals: RestampRefusal[] = [];

  for (const log of logs) {
    const outcome = restampOne(log, registry, to);

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
