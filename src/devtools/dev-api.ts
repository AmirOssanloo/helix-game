import type {
  AnyCommand,
  DebugCommand,
  SetTuningCommand,
  Tick,
  TuningDef,
} from "@domain/public";
import type { InstrumentationRings } from "@instrumentation/public";
import type { EventRing, WorldView } from "@simulation/public";

/** One variant without the two stamps the driver writes, so a panel control names only its payload. */
type Unstamped<C> = C extends AnyCommand
  ? Omit<C, "tick" | "timestamp">
  : never;

/** What the panel submits: a debug intent or a tuning change, stamped here for the next tick. */
export type PanelCommand = Unstamped<DebugCommand | SetTuningCommand>;

/**
 * What the panel needs of the fixed-step driver: the stamps for a command built now, the one
 * door into the world, and the three operations that decide whether a frame ticks. The
 * composition root supplies the real one; the wall clock stays where it lives.
 */
export type DevDriver = Readonly<{
  nextTick: Tick;
  paused: boolean;
  catchUpCap: number;
  now: () => number;
  submit: (command: AnyCommand) => boolean;
  setPaused: (paused: boolean) => void;
  step: () => boolean;
  setCatchUpCap: (cap: number) => boolean;
}>;

/**
 * What the panel needs of the session: the operations that make a world rather than change
 * one. Recreating under a seed and loading a log to replay restart the world in place; a
 * save reads the log. None is a command, and none is in the log. The composition root
 * supplies the real one.
 */
export type DevSession = Readonly<{
  recreate: (seed: number) => void;
  saveInputLog: () => string;
  /** The message a person reads when the log cannot run, or `null` once the replay has begun. */
  loadInputLog: (text: string) => string | null;
}>;

/**
 * The driver as the panel and a person at the console drive it. None of these is a command:
 * pause, step, and the cap decide whether the driver calls `tick`, never what a tick does, so
 * the world has no state for them to change and the log never sees them. The seed is shown
 * so a person can name the session; choosing another recreates the world under it, which
 * makes a session rather than changing one and is a driver operation for the same reason.
 */
export type DriverControls = Readonly<{
  paused: boolean;
  catchUpCap: number;
  seed: number;
  pause: () => void;
  resume: () => void;
  step: () => boolean;
  setCatchUpCap: (cap: number) => boolean;
  recreate: (seed: number) => void;
}>;

/**
 * The play scene's overlay toggles, named on this side of the layer line: the same fields the
 * presentation declares, on one object the composition root hands to both. A toggle is
 * presentation state, not a command; it changes nothing in the world and is not in the log.
 */
export type OverlayToggles = {
  collisionDiscs: boolean;
  boundRadii: boolean;
  facingCone: boolean;
  pathLines: boolean;
  walkabilityGrid: boolean;
  hashCells: boolean;
  spellAreas: boolean;
};

/**
 * The play scene's one-shot request for the next ground click, named on this side of the layer
 * line: the same field the presentation declares, on one object the composition root hands to
 * both. The panel arms it; the next left click on the ground is handed to it and orders nothing.
 */
export type GroundPick = {
  pending: ((x: number, y: number) => void) | null;
};

/**
 * The one object the developer panel and a person at the console reach the game through, on
 * `window` in a development build. It submits commands into the same buffer a click lands
 * in, drives the driver, reads the world view and the event ring by reference, reads the
 * instrumentation rings, sets the overlay toggles, and asks the play scene for a ground click. The tuning table's defaults are here
 * so a slider shows its default beside it; the atlas download and the input-log save are
 * here so a person can take both away as files, and the load so a saved session replays.
 */
export type DevApi = Readonly<{
  submit: (command: PanelCommand) => boolean;
  driver: DriverControls;
  view: WorldView;
  events: EventRing;
  rings: InstrumentationRings;
  overlays: OverlayToggles;
  /** Arms the next ground click: the play scene hands its world point to `onPick` instead of ordering anything with it. Arming again replaces what was waiting. */
  pickGround: (onPick: (x: number, y: number) => void) => void;
  tuningDefaults: TuningDef;
  /** Every archetype the registry holds, by id, in the order content wrote them: what the enemies dropdown lists, without a code change per archetype. */
  archetypes: readonly string[];
  /** The session so far as one JSON document: the seed, the content version, the map, the ticks run, and every consumed command with its tick. */
  saveInputLog: () => string;
  /** Replays a saved log from its first tick on a world recreated under its seed, or returns the message saying why it cannot run. */
  loadInputLog: (text: string) => string | null;
  /** The baked shape atlas as a PNG data URL, so a person can save it and look at every frame. */
  downloadAtlas: () => string;
}>;

/** What `createDevApi` composes over. The composition root supplies each from the objects it built. */
export type DevApiPorts = Readonly<{
  driver: DevDriver;
  session: DevSession;
  view: WorldView;
  events: EventRing;
  rings: InstrumentationRings;
  overlays: OverlayToggles;
  groundPick: GroundPick;
  tuningDefaults: TuningDef;
  archetypes: readonly string[];
  downloadAtlas: () => string;
}>;

/** The property `exposeDevApi` defines: `window.DevApi`. */
export const DEV_API_NAME = "DevApi";

/** The api over `ports`. Nothing here holds a route into world state: commands go through the driver, reads go through the view. */
export const createDevApi = (ports: DevApiPorts): DevApi => {
  const { driver, view } = ports;
  const controls: DriverControls = {
    get paused(): boolean {
      return driver.paused;
    },
    get catchUpCap(): number {
      return driver.catchUpCap;
    },
    get seed(): number {
      return view.run.random.seed;
    },
    pause: (): void => {
      driver.setPaused(true);
    },
    resume: (): void => {
      driver.setPaused(false);
    },
    step: (): boolean => driver.step(),
    setCatchUpCap: (cap: number): boolean => driver.setCatchUpCap(cap),
    recreate: (seed: number): void => {
      ports.session.recreate(seed);
    },
  };

  return {
    submit: (command: PanelCommand): boolean =>
      driver.submit({
        ...command,
        tick: driver.nextTick,
        timestamp: driver.now(),
      }),
    driver: controls,
    view,
    events: ports.events,
    rings: ports.rings,
    overlays: ports.overlays,
    pickGround: (onPick: (x: number, y: number) => void): void => {
      ports.groundPick.pending = onPick;
    },
    tuningDefaults: ports.tuningDefaults,
    archetypes: ports.archetypes,
    saveInputLog: (): string => ports.session.saveInputLog(),
    loadInputLog: (text: string): string | null =>
      ports.session.loadInputLog(text),
    downloadAtlas: ports.downloadAtlas,
  };
};

/** Defines `api` on `target`, normally `window`. Called only from the development branch of the composition root. */
export const exposeDevApi = (target: object, api: DevApi): void => {
  Object.defineProperty(target, DEV_API_NAME, {
    value: api,
    configurable: true,
    enumerable: true,
    writable: false,
  });
};
