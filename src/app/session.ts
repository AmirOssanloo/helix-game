import type { AnyCommand, MapDef, Registry } from "@domain/public";
import type {
  EventRing,
  InputLog,
  Simulation,
  Steppable,
  WorldView,
} from "@simulation/public";
import {
  checkReplayable,
  contentVersionOf,
  createSessionWorld,
  isReplayRefusal,
  parseInputLogFile,
  Replay,
  restartSessionWorld,
  serializeInputLog,
} from "@simulation/public";

/** What a session is made from: the seed of its first world, the content, and the map. */
export type SessionOptions = Readonly<{
  seed: number;
  registry: Registry;
  map: MapDef;
}>;

/**
 * The one world of a running game and the replay that may be feeding it. The driver steps
 * the session; the scenes and the panel hold the world's view, ring, and log, which keep
 * their identity across every recreate, so nothing rebinds. Recreating under a seed and
 * loading a log are the two driver operations that make a session rather than change one:
 * neither is a command, and neither is in the log.
 */
export class Session implements Steppable {
  readonly world: Simulation;

  /** The stamp of the registry the world runs on, written into every saved log. */
  readonly contentVersion: string;

  private readonly registry: Registry;

  private readonly map: MapDef;

  private replay: Replay | null = null;

  constructor(options: SessionOptions) {
    this.registry = options.registry;
    this.map = options.map;
    this.world = createSessionWorld(options);
    this.contentVersion = contentVersionOf(options.registry);
  }

  get view(): WorldView {
    return this.world.view;
  }

  get events(): EventRing {
    return this.world.events;
  }

  get log(): InputLog {
    return this.world.log;
  }

  /** The seed the current world was created under. */
  get seed(): number {
    return this.world.view.run.random.seed;
  }

  /** Whether a loaded log is still feeding the world. */
  get replaying(): boolean {
    return this.replay !== null;
  }

  /** Into the world, or refused while a replay feeds it. */
  submit(command: AnyCommand): boolean {
    return this.replay === null
      ? this.world.submit(command)
      : this.replay.submit(command);
  }

  /** One tick of the replay while one runs, of the world otherwise. A replay that has fed its last tick is let go. */
  tick(): void {
    if (this.replay === null) {
      this.world.tick();

      return;
    }

    this.replay.tick();

    if (this.replay.done) {
      this.replay = null;
    }
  }

  /** A fresh session under `seed`, any replay dropped. */
  recreate(seed: number): void {
    this.replay = null;
    restartSessionWorld(this.world, seed);
  }

  /** The session so far as one JSON document. */
  saveInputLog(): string {
    return serializeInputLog(
      this.world.view,
      this.world.log,
      this.contentVersion,
    );
  }

  /**
   * Restarts the world under the log's seed and replays `text` into it from the first tick,
   * or leaves the session as it is and returns the reason the log cannot run.
   */
  loadInputLog(text: string): string | null {
    const file = parseInputLogFile(text);

    if (isReplayRefusal(file)) {
      return file.message;
    }

    const refusal = checkReplayable(file, this.registry, this.map);

    if (refusal !== null) {
      return refusal.message;
    }

    restartSessionWorld(this.world, file.seed);
    this.replay = new Replay(this.world, file);

    return null;
  }
}
