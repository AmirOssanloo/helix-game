import type { InputLogFile } from "@simulation/public";
import { isReplayRefusal, parseInputLogFile } from "@simulation/public";

/** The field that marks a document as a feedback file rather than a bare input log. */
export const FEEDBACK_FILE_KIND = "helix_feedback";

/**
 * The build a file was written on, named on this side of the layer line: the same fields the
 * composition root stamps at build time, handed to the panel through the api.
 */
export type BuildStamp = Readonly<{
  commit: string;
  dirty: boolean;
}>;

/**
 * What the feedback key saves: a person's note, the tick the world stood on when they wrote it,
 * the build and the content version it was written on, and the session's input log up to that
 * tick. Loading it replays the log and stops on the tick, so the note is read against the
 * world it was written about. Feedback changes no world state; the file is not a command and
 * nothing of it is in the log.
 */
export type FeedbackFile = Readonly<{
  kind: typeof FEEDBACK_FILE_KIND;
  note: string;
  tick: number;
  build: BuildStamp;
  contentVersion: string;
  log: InputLogFile;
}>;

/** Why a document that says it is a feedback file cannot be read as one. The message is for a person. */
export type FeedbackRefusal = Readonly<{
  reason: "malformed";
  message: string;
}>;

/** The parts a feedback file is written from; the log is the session's saved log as the session serialised it. */
export type FeedbackParts = Readonly<{
  note: string;
  tick: number;
  build: BuildStamp;
  contentVersion: string;
  logText: string;
}>;

const malformed = (message: string): FeedbackRefusal => ({
  reason: "malformed",
  message: `Not a feedback file: ${message}`,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The file for `parts` as one JSON document, the log held whole inside it. Called on a save, never per tick. */
export const writeFeedbackFile = (parts: FeedbackParts): string => {
  const log = parseInputLogFile(parts.logText);

  if (isReplayRefusal(log)) {
    throw new Error(`The session saved a log it cannot read: ${log.message}`);
  }

  const file: FeedbackFile = {
    kind: FEEDBACK_FILE_KIND,
    note: parts.note,
    tick: parts.tick,
    build: { commit: parts.build.commit, dirty: parts.build.dirty },
    contentVersion: parts.contentVersion,
    log,
  };

  return JSON.stringify(file);
};

/**
 * The feedback `text` holds; the reason it holds none when it says it is feedback and is not;
 * or `null` when it does not say it is feedback at all, which is how a bare input log reads.
 * The log inside is read as a saved log is, and the note's tick must be the tick it ends on.
 */
export const readFeedbackFile = (
  text: string,
): FeedbackFile | FeedbackRefusal | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  if (!isRecord(parsed) || parsed["kind"] !== FEEDBACK_FILE_KIND) {
    return null;
  }

  const note = parsed["note"];
  const tick = parsed["tick"];
  const build = parsed["build"];
  const contentVersion = parsed["contentVersion"];

  if (typeof note !== "string") {
    return malformed("the note is not text");
  }

  if (typeof tick !== "number" || !Number.isInteger(tick) || tick < 0) {
    return malformed("the tick is not a whole number");
  }

  if (
    !isRecord(build) ||
    typeof build["commit"] !== "string" ||
    typeof build["dirty"] !== "boolean"
  ) {
    return malformed("the build names no commit");
  }

  if (typeof contentVersion !== "string") {
    return malformed("the content version is missing");
  }

  const log = parseInputLogFile(JSON.stringify(parsed["log"] ?? null));

  if (isReplayRefusal(log)) {
    return malformed(`its log cannot be read. ${log.message}`);
  }

  if (log.ticks !== tick) {
    return malformed(
      `the note is on tick ${String(tick)} and its log ends on tick ${String(log.ticks)}`,
    );
  }

  return {
    kind: FEEDBACK_FILE_KIND,
    note,
    tick,
    build: { commit: build["commit"], dirty: build["dirty"] },
    contentVersion,
    log,
  };
};

/** Whether `value` is a refusal rather than a feedback file. */
export const isFeedbackRefusal = (
  value: FeedbackFile | FeedbackRefusal,
): value is FeedbackRefusal => "reason" in value;

const describeBuild = (build: BuildStamp): string =>
  build.dirty
    ? `commit ${build.commit} with uncommitted changes`
    : `commit ${build.commit}`;

/**
 * The line a person reads when the feedback was written on another build than this one, or
 * `null` when both are the same clean commit. A log replays only on the code it was recorded
 * on, so a different commit, or uncommitted changes on either side, may replay differently
 * from what was played.
 */
export const buildDifference = (
  written: BuildStamp,
  current: BuildStamp,
): string | null => {
  if (written.commit === current.commit && !written.dirty && !current.dirty) {
    return null;
  }

  const which =
    written.commit === current.commit
      ? "The commit is the same, but a tree had uncommitted changes"
      : "The commit differs";

  return `${which}: the feedback was written on ${describeBuild(written)} and this build is ${describeBuild(current)}, so the replay may not match what was played`;
};
