import { describe, expect, it } from "vitest";
import { meleeGruntDef } from "@content/public";
import type { Registry } from "@domain/public";
import type { InputLogFile } from "@simulation/public";
import { isReplayRefusal, parseInputLogFile } from "@simulation/public";
import type { StateChecksum } from "@simulation/testing";
import {
  beginReplay,
  CHECKSUM_INTERVAL,
  checksumMismatch,
  createHasher,
  recordChecksums,
  Replay,
  Session,
  stateChecksum,
  stateDifference,
} from "@simulation/testing";
import { makeMapDef, makeRegistry } from "../../helpers";

const SEED = 11;

/** How many ticks the recording runs between map changes. */
const LEG_TICKS = 45;

const START = makeMapDef.build({ id: "start" });

const NEXT = makeMapDef.build({
  id: "next",
  spawnPoint: { x: 400, y: -300 },
  packs: [
    {
      archetypeId: meleeGruntDef.id,
      tier: "normal",
      count: 3,
      position: { x: 700, y: -300 },
      dormant: false,
      legendaryId: null,
    },
  ],
});

const registry = (): Registry => makeRegistry({ maps: [START, NEXT] });

const hasher = createHasher();

/** Submits `command`'s payload into `session` stamped for its next tick. */
const submitNow = (
  session: Session,
  command:
    | Readonly<{ kind: "load_map"; mapId: string }>
    | Readonly<{
        kind: "move";
        destination: Readonly<{ x: number; y: number }>;
      }>
    | Readonly<{ kind: "level_up" }>,
): void => {
  const tick = session.view.tick;

  session.submit({ ...command, tick, timestamp: tick });
};

/**
 * A session started on `START` that walks, changes to `NEXT`, walks toward its pack, and
 * changes back, saved as a log carrying the checksums the recording itself reached.
 */
const record = (): Readonly<{ file: InputLogFile; header: unknown }> => {
  const session = new Session({
    seed: SEED,
    registry: registry(),
    mapId: START.id,
  });
  const checksums: StateChecksum[] = [];
  const run = (ticks: number): void => {
    for (let tick = 0; tick < ticks; tick += 1) {
      if (session.view.tick % CHECKSUM_INTERVAL === 0) {
        checksums.push({
          tick: session.view.tick,
          value: stateChecksum(session.world.state, hasher),
        });
      }

      session.tick();
    }
  };

  submitNow(session, { kind: "level_up" });
  submitNow(session, { kind: "move", destination: { x: 300, y: 200 } });
  run(LEG_TICKS);
  submitNow(session, { kind: "load_map", mapId: NEXT.id });
  run(1);
  submitNow(session, { kind: "move", destination: { x: 650, y: -300 } });
  run(LEG_TICKS);
  submitNow(session, { kind: "load_map", mapId: START.id });
  run(LEG_TICKS);
  checksums.push({
    tick: session.view.tick,
    value: stateChecksum(session.world.state, hasher),
  });

  const text = session.saveInputLog();
  const parsed = parseInputLogFile(text);

  if (isReplayRefusal(parsed)) {
    throw new Error(parsed.message);
  }

  return { file: { ...parsed, checksums }, header: JSON.parse(text) };
};

/** A replay of `file` on a fresh world, failing loudly when it is refused. */
const replayOf = (file: InputLogFile): Replay => {
  const replay = beginReplay(file, { registry: registry(), map: START });

  if (!(replay instanceof Replay)) {
    throw new Error(replay.message);
  }

  return replay;
};

describe("a log with map changes", () => {
  it("names the map the session started on in its header, and holds each change as a load_map", () => {
    const { file, header } = record();

    expect(header).toMatchObject({ mapId: START.id });
    expect(
      file.records
        .map((entry) => entry.command)
        .filter((command) => command.kind === "load_map"),
    ).toMatchObject([
      { kind: "load_map", mapId: NEXT.id },
      { kind: "load_map", mapId: START.id },
    ]);
  });

  it("replays into two worlds that agree at every tick and travel the same maps", () => {
    const { file } = record();
    const first = replayOf(file);
    const second = replayOf(file);
    const visited = new Set<string>();

    while (!first.done) {
      first.tick();
      second.tick();
      visited.add(first.view.map.mapId);

      expect(stateDifference(first.world.state, second.world.state)).toBeNull();
    }

    expect(second.done).toBe(true);
    expect([...visited]).toEqual([START.id, NEXT.id]);
    expect(first.view.map.mapId).toBe(START.id);
  });

  it("replays to the checksums the recording reached", () => {
    const { file } = record();

    expect(
      checksumMismatch(file.checksums, recordChecksums(replayOf(file))),
    ).toBeNull();
  });
});
