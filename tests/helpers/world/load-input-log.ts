import { readFileSync } from "node:fs";
import type { InputLogFile } from "@simulation/public";
import { isReplayRefusal, parseInputLogFile } from "@simulation/public";

/** Where every recorded log lives, one JSON file each, named for the session it holds. */
const REPLAYS_DIR = new URL("../../simulation/replays/", import.meta.url);

/** The recorded log `name` under `tests/simulation/replays/`, parsed. A log that does not parse fails loudly with the reason, since a replay test cannot mean anything without it. */
export const loadInputLog = (name: string): InputLogFile => {
  const text = readFileSync(new URL(`${name}.json`, REPLAYS_DIR), "utf8");
  const file = parseInputLogFile(text);

  if (isReplayRefusal(file)) {
    throw new Error(
      `The recorded log "${name}" does not parse: ${file.message}`,
    );
  }

  return file;
};
