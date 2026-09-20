import type { WorldView } from "@simulation/public";

/** What a scene needs of the driver: a frame to hand it, and the fraction to interpolate by. The composition root supplies the real one. */
export type FrameDriver = Readonly<{
  onFrame: (frameDeltaMs: number) => void;
  alpha: number;
}>;

/** Where a scene sends a line meant for a person. Nothing under presentation writes to the console itself. */
export type Reporter = (message: string) => void;

/** Everything a scene is given at construction. A scene composes over these and holds nothing else. */
export type SceneContext = Readonly<{
  driver: FrameDriver;
  world: WorldView;
  report: Reporter;
}>;
