import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { longRoadDef } from "@content/public";
import type { FeedbackFile } from "@devtools/public";
import { isFeedbackRefusal, readFeedbackFile } from "@devtools/public";
import type { InputLogFile } from "@simulation/public";
import { createEventReader } from "@simulation/public";
import type { Replay } from "@simulation/testing";
import { beginReplay } from "@simulation/testing";
import {
  isPackBeaten,
  loadInputLog,
  makeRegistry,
  tickDifference,
} from "../../helpers";

/**
 * The maintainer's playtest of the long road with loot and the store: the whole session from
 * the spawn at level 1 to the last boss's kill, played in one tab on the published playtest
 * build with the panel closed but for **Jump to checkpoint**, and saved with the panel's
 * **Save input log** at the end. It is the long road's reference log.
 */
const RECORDED_SESSION = "long-road-loot-playtest";

const SESSION_FILE = new URL(`./${RECORDED_SESSION}.json`, import.meta.url);

/** Where the feedback files of a playtest are kept, each named for the date it was filed. */
const NOTES_DIR = new URL(
  "../../../.claude/plan/implementation/notes/",
  import.meta.url,
);

/** A feedback file filed on this playtest: `<date>-long-road-loot-feedback-<seed>-<tick>.json`. */
const FEEDBACK_FILE = /^\d{4}-\d{2}-\d{2}-long-road-loot-feedback-.*\.json$/;

/**
 * Every command the session may hold: what a player sends, and the one panel command the
 * playtest keeps, the jump to a checkpoint after a break. A heal, a mana restore, a level up, a
 * toggle, or a grant is none of these.
 */
const ALLOWED_COMMANDS = new Set([
  "move",
  "attack_target",
  "attack_move",
  "stop",
  "slot",
  "cast",
  "spend_skill_point",
  "pick_up",
  "equip_item",
  "unequip_item",
  "move_item",
  "drop_item",
  "open_store",
  "close_store",
  "buy_item",
  "sell_item",
  "jump_to_checkpoint",
]);

const registry = makeRegistry();

/** See the replay determinism spec: these replay long sessions and assert what happened, never how fast. */
const REPLAY_TIMEOUT_MS = 240_000;

/** The replay of `file` on a fresh world on the long road, failing loudly on a refusal so the test names it. */
const replayOf = (file: InputLogFile): Replay => {
  const replay = beginReplay(file, { registry, map: longRoadDef });

  if ("reason" in replay) {
    throw new Error(replay.message);
  }

  return replay;
};

/** How many records of `file` are commands of `kind`. */
const countOf = (file: InputLogFile, kind: string): number =>
  file.records.filter((record) => record.command.kind === kind).length;

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

// Owner: the maintainer's playtest of the long road with loot. Runs once the session is saved as
// `long-road-loot-playtest.json` beside this spec; until the maintainer has played, there is no log.
describe.skipIf(!existsSync(SESSION_FILE))(
  "the long road playtest with loot and the store",
  () => {
    it("holds no heal, mana restore, level up, toggle, or grant: no panel command but the jump to a checkpoint", () => {
      const file = loadInputLog(RECORDED_SESSION);
      const panelCommands = file.records
        .map((record) => record.command.kind)
        .filter((kind) => !ALLOWED_COMMANDS.has(kind));

      expect(file.mapId).toBe(longRoadDef.id);
      expect(panelCommands).toEqual([]);
    });

    it("wears an item, buys one, and sells one", () => {
      const file = loadInputLog(RECORDED_SESSION);

      expect(countOf(file, "equip_item")).toBeGreaterThan(0);
      expect(countOf(file, "buy_item")).toBeGreaterThan(0);
      expect(countOf(file, "sell_item")).toBeGreaterThan(0);
    });

    it(
      "replays into two worlds that agree at every tick, reaches the last boss's kill, and takes every drop kind",
      () => {
        const file = loadInputLog(RECORDED_SESSION);
        const first = replayOf(file);
        const second = replayOf(file);
        const reader = createEventReader();
        const lastPack = first.view.map.packs.at(-1);
        const taken = { gold: 0, health: 0, mana: 0, item: 0 };

        if (lastPack === undefined) {
          throw new Error("The long road holds its packs");
        }

        let levelAtKill: number | null = null;
        let tickAtKill: number | null = null;

        while (!first.done) {
          first.tick();
          second.tick();

          expect(
            tickDifference(first.world.state, second.world.state),
            `after tick ${String(first.view.tick)}`,
          ).toBeNull();

          let event = first.events.read(reader);

          while (event !== null) {
            switch (event.kind) {
              case "gold_taken":
                taken.gold += 1;
                break;
              case "health_globe_taken":
                taken.health += 1;
                break;
              case "mana_globe_taken":
                taken.mana += 1;
                break;
              case "item_picked_up":
                taken.item += 1;
                break;
              default:
                break;
            }

            event = first.events.read(reader);
          }

          if (levelAtKill === null && isPackBeaten(first.view, lastPack)) {
            const heroId = first.view.run.heroId;
            const hero =
              heroId === null ? null : first.view.map.units.resolve(heroId);

            levelAtKill = hero?.progression.level ?? 0;
            tickAtKill = first.view.tick;
          }
        }

        console.info(
          `long road loot playtest: ${String(file.ticks)} ticks, the last boss killed on tick ${String(tickAtKill)} at hero level ${String(levelAtKill)}, taken ${JSON.stringify(taken)}`,
        );

        expect(first.view.tick).toBe(file.ticks);
        expect(tickAtKill).not.toBeNull();
        expect(taken.gold).toBeGreaterThan(0);
        expect(taken.health).toBeGreaterThan(0);
        expect(taken.mana).toBeGreaterThan(0);
        expect(taken.item).toBeGreaterThan(0);
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
  },
);
