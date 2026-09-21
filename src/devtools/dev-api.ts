import type {
  AnyCommand,
  DebugCommand,
  SetTuningCommand,
  Tick,
  TuningDef,
} from "@domain/public";
import type { InstrumentationRings } from "@instrumentation/public";
import type { EventRing, InputLog, WorldView } from "@simulation/public";
import { serializeInputLog } from "@simulation/public";

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
 * The driver as the panel and a person at the console drive it. None of these is a command:
 * pause, step, and the cap decide whether the driver calls `tick`, never what a tick does, so
 * the world has no state for them to change and the log never sees them. The seed is shown
 * so a person can name the session; choosing another recreates the world, which is a driver
 * operation too and arrives with the replay loader.
 */
export type DriverControls = Readonly<{
  paused: boolean;
  catchUpCap: number;
  seed: number;
  pause: () => void;
  resume: () => void;
  step: () => boolean;
  setCatchUpCap: (cap: number) => boolean;
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
};

/**
 * The one object the developer panel and a person at the console reach the game through, on
 * `window` in a development build. It submits commands into the same buffer a click lands
 * in, drives the driver, reads the world view and the event ring by reference, reads the
 * instrumentation rings, and sets the overlay toggles. The tuning table's defaults are here
 * so a slider shows its default beside it; the atlas download and the input-log save are
 * here so a person can take both away as files.
 */
export type DevApi = Readonly<{
  submit: (command: PanelCommand) => boolean;
  driver: DriverControls;
  view: WorldView;
  events: EventRing;
  rings: InstrumentationRings;
  overlays: OverlayToggles;
  tuningDefaults: TuningDef;
  /** The session so far as one JSON document: the seed and every consumed command with its tick. */
  saveInputLog: () => string;
  /** The baked shape atlas as a PNG data URL, so a person can save it and look at every frame. */
  downloadAtlas: () => string;
}>;

/** What `createDevApi` composes over. The composition root supplies each from the objects it built. */
export type DevApiPorts = Readonly<{
  driver: DevDriver;
  view: WorldView;
  events: EventRing;
  log: InputLog;
  rings: InstrumentationRings;
  overlays: OverlayToggles;
  tuningDefaults: TuningDef;
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
    tuningDefaults: ports.tuningDefaults,
    saveInputLog: (): string =>
      serializeInputLog(view.run.random.seed, ports.log),
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
