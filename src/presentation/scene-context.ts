import type { AnyCommand, Tick } from "@domain/public";
import type { RingBuffer } from "@shared/public";
import type { EventRing, WorldView } from "@simulation/public";
import type { ShapeAtlas } from "./atlas/shape-atlas";
import type { ViewScale } from "./camera/view-scale";
import type { SlotFlashes } from "./hud/slot-flashes";
import type { GroundPick } from "./input/ground-pick";
import type { OverlayToggles } from "./overlays/overlay-toggles";

/**
 * What the input mapper needs of the driver: the tick a command built now applies to, the
 * arrival stamp to order it by, and the one door into the world. The composition root supplies
 * the real one, so the wall clock stays where it lives.
 */
export type CommandDriver = Readonly<{
  nextTick: Tick;
  now: () => number;
  submit: (command: AnyCommand) => boolean;
}>;

/** What a scene needs of the driver: a frame to hand it, the fraction to interpolate by, and the command door. */
export type FrameDriver = CommandDriver &
  Readonly<{
    onFrame: (frameDeltaMs: number) => void;
    alpha: number;
  }>;

/** Where a scene sends a line meant for a person. Nothing under presentation writes to the console itself. */
export type Reporter = (message: string) => void;

/** The instrumentation rings a scene writes. The composition root hands the real ones; the type names only what a scene needs. */
export type SceneRings = Readonly<{
  /** Binds the view pools have refused since the play scene was created, summed, written once per frame. */
  viewMisses: RingBuffer<number>;
  /** Wall milliseconds from the start of the play scene's sync to the end of its render, written once per frame. */
  renderTime: RingBuffer<number>;
}>;

/**
 * Everything a scene is given at construction. A scene composes over these and holds nothing
 * else. The flashes are shared by the two scenes: the play scene's mapper writes one for a
 * cursor it would not open, and the HUD writes one for a refused-command event and draws them
 * all. The overlay toggles and the view scale are shared with the developer panel, which
 * writes them.
 */
export type SceneContext = Readonly<{
  atlas: ShapeAtlas;
  driver: FrameDriver;
  world: WorldView;
  events: EventRing;
  rings: SceneRings;
  flashes: SlotFlashes;
  overlays: Readonly<OverlayToggles>;
  viewScale: Readonly<ViewScale>;
  /** The panel's request for the next ground click, answered by the play scene's mapper. */
  groundPick: GroundPick;
  report: Reporter;
}>;
