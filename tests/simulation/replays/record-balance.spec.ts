import { describe, expect, it } from "vitest";
import { parseInputLogFile, isReplayRefusal } from "@simulation/public";
import {
  LOOT_WALK_SEED,
  makeRegistry,
  recordArchetypesSession,
  recordHeroSession,
  recordLootWalk,
  recordSpellsSession,
  saveInputLog,
} from "../../helpers";

/** Recording plays three long sessions; it asserts what it wrote, never how fast. */
const RECORD_TIMEOUT_MS = 120_000;

/** Whether this run records the balance sessions again, or the loot walk, which it does only when asked. */
const RECORDING = process.env.HELIX_RECORD === "balance";
const RECORDING_LOOT = process.env.HELIX_RECORD === "loot";

// Owner: whoever moves what the balance sessions show. Runs only with HELIX_RECORD=balance, since it overwrites the stored logs.
describe.skipIf(!RECORDING)("recording the balance sessions", () => {
  it.each([
    { name: "balance-hero", record: recordHeroSession },
    { name: "balance-spells", record: recordSpellsSession },
    { name: "balance-archetypes", record: recordArchetypesSession },
  ])(
    "records $name and writes a log that parses",
    ({ name, record }) => {
      const text = record(makeRegistry());

      expect(isReplayRefusal(parseInputLogFile(text))).toBe(false);

      saveInputLog(name, text);
    },
    RECORD_TIMEOUT_MS,
  );
});

// Owner: whoever moves what the loot walk shows. Runs only with HELIX_RECORD=loot, since it overwrites the stored log.
describe.skipIf(!RECORDING_LOOT)("recording the loot walk", () => {
  it(
    "records balance-loot and writes a log that parses",
    () => {
      const text = recordLootWalk(makeRegistry(), LOOT_WALK_SEED);

      expect(isReplayRefusal(parseInputLogFile(text))).toBe(false);

      saveInputLog("balance-loot", text);
    },
    RECORD_TIMEOUT_MS,
  );
});
