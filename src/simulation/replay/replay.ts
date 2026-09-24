import type { AnyCommand, MapDef, Registry } from "@domain/public";
import { assert } from "@shared/public";
import type { EventRing } from "../event-ring";
import { createSessionWorld } from "../session";
import type { Simulation, Steppable } from "../world";
import type { WorldView } from "../world-view";
import { contentVersionOf } from "./content-version";
import type { InputLogFile, ReplayRefusal } from "./input-log-file";

/** What a replay recreates its world from: the registry and the map the log must have been recorded on. */
export type ReplayOptions = Readonly<{
  registry: Registry;
  map: MapDef;
}>;

/**
 * Why `file` cannot replay against `registry` on `map`, or `null` when it can. A log is
 * valid only against the definitions it was recorded with, so the message names both
 * versions for a person to check out the right one. A log that spans a content reload is
 * refused whatever the registry: a replay starts every number at one version, where the
 * recording ran part of the session on another, so no registry reproduces it.
 */
export const checkReplayable = (
  file: InputLogFile,
  registry: Registry,
  map: MapDef,
): ReplayRefusal | null => {
  if (file.contentReloads.length > 0) {
    const versions = [file.contentVersion, ...file.contentReloads].join(
      " and then ",
    );

    return {
      reason: "content_version",
      message: `The log spans a content reload: it was recorded on content version ${versions}; a replay is only valid within one content version`,
    };
  }

  const current = contentVersionOf(registry);

  if (file.contentVersion !== current) {
    return {
      reason: "content_version",
      message: `The log was recorded on content version ${file.contentVersion} and this build has ${current}; a replay is only valid against the definitions it was recorded with`,
    };
  }

  if (file.mapId !== map.id) {
    return {
      reason: "map",
      message: `The log was recorded on map "${file.mapId}" and this world runs "${map.id}"`,
    };
  }

  return null;
};

/**
 * A recorded session fed back into a world, tick by tick, with no driver: each tick submits
 * the records the recording consumed on that tick, then ticks the world. Input from anywhere
 * else is refused until the recorded ticks have run, since a command the record did not
 * hold would diverge from it; afterwards the world is live and takes commands as any does.
 * The world is the caller's: a fresh one from `beginReplay`, or the session's own, restarted.
 */
export class Replay implements Steppable {
  readonly world: Simulation;

  private readonly file: InputLogFile;

  private cursor = 0;

  /** Over `world`, which has never ticked and was created under the log's seed. */
  constructor(world: Simulation, file: InputLogFile) {
    assert(
      world.view.tick === 0 && world.view.run.random.seed === file.seed,
      "A replay begins on a world that has never ticked, under the log's seed",
    );

    this.world = world;
    this.file = file;
  }

  get view(): WorldView {
    return this.world.view;
  }

  get events(): EventRing {
    return this.world.events;
  }

  /** How many ticks the recording ran. */
  get ticks(): number {
    return this.file.ticks;
  }

  /** Whether every recorded tick has run. */
  get done(): boolean {
    return this.world.view.tick >= this.file.ticks;
  }

  /** Refused with `false` until the replay is done; afterwards the world's own. */
  submit(command: AnyCommand): boolean {
    return this.done ? this.world.submit(command) : false;
  }

  /** Submits the records for the world's current tick, then ticks it. */
  tick(): void {
    const records = this.file.records;
    const tick = this.world.view.tick;

    while (this.cursor < records.length) {
      const record = records[this.cursor];

      if (record === undefined || record.tick !== tick) {
        break;
      }

      const accepted = this.world.submit(record.command);

      assert(
        accepted,
        "A tick's worth of records fits the buffer they came from",
      );
      this.cursor += 1;
    }

    this.world.tick();
  }
}

/**
 * A replay of `file` on a fresh session world under its seed, or the reason it cannot run.
 * The world is created exactly as the composition root creates one, hero included, so
 * the recording and the replay start from the same state.
 */
export const beginReplay = (
  file: InputLogFile,
  options: ReplayOptions,
): Replay | ReplayRefusal => {
  const refusal = checkReplayable(file, options.registry, options.map);

  if (refusal !== null) {
    return refusal;
  }

  const world = createSessionWorld({
    seed: file.seed,
    registry: options.registry,
    map: options.map,
  });

  return new Replay(world, file);
};
