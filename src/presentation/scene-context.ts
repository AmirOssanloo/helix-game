import type { AnyCommand, Tick } from "@domain/public";
import type { WorldView } from "@simulation/public";
import type { ShapeAtlas } from "./atlas/shape-atlas";

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

/** Everything a scene is given at construction. A scene composes over these and holds nothing else. */
export type SceneContext = Readonly<{
  atlas: ShapeAtlas;
  driver: FrameDriver;
  world: WorldView;
  report: Reporter;
}>;
