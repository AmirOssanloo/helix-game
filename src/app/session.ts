import type {
  AnyCommand,
  ContentChange,
  MapDef,
  Registry,
  Tick,
} from "@domain/public";
import { contentChangeOf } from "@domain/public";
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
  mapOfLog,
  parseInputLogFile,
  Replay,
  restartSessionWorld,
  serializeInputLog,
} from "@simulation/public";

/** What a session is made from: the seed of its first world, the content, and the id of the map in it the first world runs on. */
export type SessionOptions = Readonly<{
  seed: number;
  registry: Registry;
  mapId: string;
}>;

/** The map `registry` holds under `mapId`, or `null` when none does. */
const mapNamed = (registry: Registry, mapId: string): MapDef | null => {
  for (const map of registry.maps) {
    if (map.id === mapId) {
      return map;
    }
  }

  return null;
};

/** The stamps a command built now carries: the driver's, so a reload's commands sort among a click's. */
export type CommandStamps = Readonly<{
  nextTick: Tick;
  now: () => number;
}>;

/** What a retune came to: what the new registry changes, and how many of its retunes the command buffer had no room for. */
export type SessionRetune = Readonly<{
  change: ContentChange;
  refused: number;
}>;

/**
 * The one world of a running game and the replay that may be feeding it. The driver steps
 * the session; the scenes and the panel hold the world's view, ring, and log, which keep
 * their identity across every recreate, so nothing rebinds. Recreating under a seed,
 * choosing a map, and loading a log are the driver operations that make a session rather
 * than change one: none is a command, and none is in the log.
 */
export class Session implements Steppable {
  readonly world: Simulation;

  private registry: Registry;

  private version: string;

  /** The stamp the current world was created under, which a saved log begins on. */
  private createdVersion: string;

  /** The stamp each content reload taken since the current world was created moved it to, in order. */
  private readonly reloads: string[] = [];

  private replay: Replay | null = null;

  /** Keys a retune submitted a command for that no tick has applied yet: each holds the registry's default once it does. */
  private readonly pendingRetunes = new Set<string>();

  constructor(options: SessionOptions) {
    const map = mapNamed(options.registry, options.mapId);

    if (map === null) {
      throw new Error(`The content registers no map "${options.mapId}"`);
    }

    this.registry = options.registry;
    this.world = createSessionWorld({
      seed: options.seed,
      registry: options.registry,
      map,
    });
    this.version = contentVersionOf(options.registry);
    this.createdVersion = this.version;
  }

  /** The stamp of the registry the world runs on, written into every saved log. */
  get contentVersion(): string {
    return this.version;
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

  /** The id of the map the current world was made on. */
  get mapId(): string {
    return this.world.mapDef.id;
  }

  /** The id of every map the content registers, in the order the maps index lists them: what a session can be made on. */
  get mapIds(): readonly string[] {
    return this.registry.maps.map((map): string => map.id);
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
    this.pendingRetunes.clear();

    if (this.replay === null) {
      this.world.tick();

      return;
    }

    this.replay.tick();

    if (this.replay.done) {
      this.replay = null;
    }
  }

  /** A fresh session under `seed` on the map the world runs, any replay dropped. */
  recreate(seed: number): void {
    this.restartOn(seed, this.world.mapDef);
  }

  /**
   * A fresh session on the map registered as `mapId`, under the seed the world runs, any
   * replay dropped; or the session as it is and the message naming an id no map has.
   */
  chooseMap(mapId: string): string | null {
    const map = mapNamed(this.registry, mapId);

    if (map === null) {
      return `No map has the id "${mapId}"`;
    }

    this.restartOn(this.seed, map);

    return null;
  }

  private restartOn(seed: number, map: MapDef): void {
    this.replay = null;
    this.pendingRetunes.clear();
    restartSessionWorld(this.world, seed, map);
    this.beginVersion();
  }

  /** The world was made again under the registry it has now, so its log begins on that registry's stamp alone. */
  private beginVersion(): void {
    this.createdVersion = this.version;
    this.reloads.length = 0;
  }

  /**
   * Takes `next`, a validated registry, when it changes nothing but numbers: a recreate, a load,
   * and the stamp of a saved log read it from here on, and each number it changes that no
   * tuning command has moved goes in as a `set_tuning` command stamped by `stamps`, so the
   * running world changes by command and the log sees it. A stamp it moves is written into
   * the saved log beside the one the world was created under, so the log is refused as
   * spanning two versions until the next recreate or load. The command goes to the world, not
   * the driver, so a hidden tab holds it in the buffer rather than dropping it as it drops
   * input. When `next` changes anything else, nothing is taken. Never called during a replay.
   */
  retune(next: Registry, stamps: CommandStamps): SessionRetune {
    const change = contentChangeOf(
      this.registry,
      next,
      this.world.view.run.tuning,
      this.pendingRetunes,
    );

    if (change.kind === "reshaped") {
      return { change, refused: 0 };
    }

    const version = contentVersionOf(next);

    if (version !== this.version) {
      this.reloads.push(version);
    }

    this.registry = next;
    this.version = version;
    this.world.adoptRegistry(next);

    let refused = 0;

    for (const retune of change.retunes) {
      const submitted = this.world.submit({
        kind: "set_tuning",
        key: retune.key,
        value: retune.value,
        tick: stamps.nextTick,
        timestamp: stamps.now(),
      });

      if (submitted) {
        this.pendingRetunes.add(retune.key);
      } else {
        refused += 1;
      }
    }

    return { change, refused };
  }

  /** The session so far as one JSON document: stamped with the version its world was created under, and every version a reload moved it to since. */
  saveInputLog(): string {
    return serializeInputLog(
      this.world.view,
      this.world.log,
      this.createdVersion,
      this.reloads,
    );
  }

  /**
   * Restarts the world under the log's seed on the log's map and replays `text` into it from
   * the first tick, or leaves the session as it is and returns the reason the log cannot run:
   * among them a map id no map in the content has.
   */
  loadInputLog(text: string): string | null {
    const file = parseInputLogFile(text);

    if (isReplayRefusal(file)) {
      return file.message;
    }

    const map = mapOfLog(file, this.registry);

    if (isReplayRefusal(map)) {
      return map.message;
    }

    const refusal = checkReplayable(file, this.registry, map);

    if (refusal !== null) {
      return refusal.message;
    }

    restartSessionWorld(this.world, file.seed, map);
    this.pendingRetunes.clear();
    this.beginVersion();
    this.replay = new Replay(this.world, file);

    return null;
  }
}
