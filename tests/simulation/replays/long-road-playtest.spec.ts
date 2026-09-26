import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { longRoadDef } from "@content/public";
import type { FeedbackFile } from "@devtools/public";
import { isFeedbackRefusal, readFeedbackFile } from "@devtools/public";
import type { PackRecord } from "@domain/public";
import type { InputLogFile, Replay } from "@simulation/public";
import { beginReplay } from "@simulation/public";
import { loadInputLog, makeRegistry, tickDifference } from "../../helpers";

/**
 * The maintainer's playtest of the long road: the whole session from the spawn at level 1 to
 * the last boss, played on the published playtest build and saved with the panel's
 * **Save input log** at the end.
 */
const RECORDED_SESSION = "long-road-playtest";

const SESSION_FILE = new URL(`./${RECORDED_SESSION}.json`, import.meta.url);

/** Where the feedback files of a playtest are kept, each named for the date it was filed and the long road. */
const NOTES_DIR = new URL(
  "../../../.claude/plan/implementation/notes/",
  import.meta.url,
);

/** A feedback file filed on the long road's playtest: `<date>-long-road-feedback-<seed>-<tick>.json`. */
const FEEDBACK_FILE = /^\d{4}-\d{2}-\d{2}-long-road-feedback-.*\.json$/;

const registry = makeRegistry();

/** See the replay determinism spec: these replay long sessions and assert what happened, never how fast. */
const REPLAY_TIMEOUT_MS = 120_000;

/** The replay of `file` on a fresh world on the long road, failing loudly on a refusal so the test names it. */
const replayOf = (file: InputLogFile): Replay => {
  const replay = beginReplay(file, { registry, map: longRoadDef });

  if ("reason" in replay) {
    throw new Error(replay.message);
  }

  return replay;
};

/**
 * Whether `pack` is beaten: dead for the map, or awake with no member left standing. A pack is
 * marked dead only once the hero walks out of its sleep radius, so the last boss's pack, which
 * the hero stands on when it falls, is beaten before it is dead.
 */
const isBeaten = (replay: Replay, pack: PackRecord): boolean => {
  if (pack.state === "dead") {
    return true;
  }

  if (pack.state !== "awake") {
    return false;
  }

  const units = replay.world.state.map.units;

  for (let index = 0; index < units.end; index += 1) {
    const unit = units.at(index);

    if (unit !== null && unit.packId === pack.packId && unit.state !== "dead") {
      return false;
    }
  }

  return true;
};

/** The hero's level in `replay`'s world now. */
const heroLevelOf = (replay: Replay): number => {
  const heroId = replay.view.run.heroId;
  const hero = heroId === null ? null : replay.view.map.units.resolve(heroId);

  if (hero === null) {
    throw new Error("The playtest world has a hero");
  }

  return hero.progression.level;
};

/** Every feedback file of the playtest under the notes folder, read, by file name. */
const feedbackFiles = (): [string, FeedbackFile][] =>
  readdirSync(NOTES_DIR)
    .filter((name) => FEEDBACK_FILE.test(name))
    .map((name) => {
      const file = readFeedbackFile(
        readFileSync(new URL(name, NOTES_DIR), "utf8"),
      );

      if (file === null || isFeedbackRefusal(file)) {
        throw new Error(
          `${name} is not a feedback file${file === null ? "" : `: ${file.message}`}`,
        );
      }

      return [name, file];
    });

// Owner: the maintainer's playtest of the long road. Runs once the session is saved as
// `long-road-playtest.json` beside this spec; until the maintainer has played, there is no log.
describe.skipIf(!existsSync(SESSION_FILE))("the long road playtest", () => {
  it(
    "replays the maintainer's session into two worlds that agree at every tick, and reads the level at the last boss's kill",
    () => {
      const file = loadInputLog(RECORDED_SESSION);
      const first = replayOf(file);
      const second = replayOf(file);
      const lastPack = first.world.state.map.packs.at(-1);

      expect(file.mapId).toBe(longRoadDef.id);

      if (lastPack === undefined) {
        throw new Error("The long road holds its packs");
      }

      let levelAtKill: number | null = null;
      let tickAtKill: number | null = null;

      while (!first.done) {
        first.tick();
        second.tick();

        const difference = tickDifference(first.view, second.view);

        expect(difference, `after tick ${String(first.view.tick)}`).toBeNull();

        if (levelAtKill === null && isBeaten(first, lastPack)) {
          levelAtKill = heroLevelOf(first);
          tickAtKill = first.view.tick;
        }
      }

      console.info(
        `long road playtest: ${String(file.ticks)} ticks, the last boss killed on tick ${String(tickAtKill)} at hero level ${String(levelAtKill)}`,
      );

      expect(first.view.tick).toBe(file.ticks);
      expect(levelAtKill).not.toBeNull();
    },
    REPLAY_TIMEOUT_MS,
  );

  it(
    "loads every feedback file filed on the playtest and stops at its tick",
    () => {
      for (const [name, feedback] of feedbackFiles()) {
        const replay = replayOf(feedback.log);

        while (!replay.done) {
          replay.tick();
        }

        expect(replay.view.tick, name).toBe(feedback.tick);
      }
    },
    REPLAY_TIMEOUT_MS,
  );
});
