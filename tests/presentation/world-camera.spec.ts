import { describe, expect, it } from "vitest";
import type { FollowCamera } from "@presentation/public";
import { Projection, WorldCamera } from "@presentation/public";
import { FEEDBACK_TIMINGS } from "../helpers";

/** A lerp tuned to close a quarter of the distance a frame, and one past all of it. */
const TUNED_LERP = 0.25;
const PAST_ALL = 3;

type Arranged = {
  camera: WorldCamera;
  /** Every lerp the camera was handed, the follow's first. */
  lerps: number[];
};

/** A world camera over a Phaser camera double that records the lerps it is handed. */
const arrange = (lerp: number = FEEDBACK_TIMINGS.cameraLerp): Arranged => {
  const lerps: number[] = [];
  const double: FollowCamera = {
    scrollX: 0,
    scrollY: 0,
    width: 1920,
    height: 1080,
    setZoom: (): void => {},
    setLerp: (x: number): void => {
      lerps.push(x);
    },
    startFollow: (_target, _round, x: number): void => {
      lerps.push(x);
    },
    setBounds: (): void => {},
    centerOn: (): void => {},
  };

  return {
    camera: new WorldCamera(double, new Projection(), lerp),
    lerps,
  };
};

describe("the world camera's lerp", () => {
  it("follows with the lerp the tuning table holds at creation", () => {
    expect(arrange().lerps).toEqual([FEEDBACK_TIMINGS.cameraLerp]);
  });

  it("follows with a tuned lerp from the frame it is handed", () => {
    const arranged = arrange();

    arranged.camera.setLerp(TUNED_LERP);

    expect(arranged.lerps).toEqual([FEEDBACK_TIMINGS.cameraLerp, TUNED_LERP]);
  });

  it("writes nothing to the camera on a frame the lerp has not changed", () => {
    const arranged = arrange();

    arranged.camera.setLerp(FEEDBACK_TIMINGS.cameraLerp);
    arranged.camera.setLerp(FEEDBACK_TIMINGS.cameraLerp);

    expect(arranged.lerps).toHaveLength(1);
  });

  it("holds a lerp between nothing and all of the distance a frame", () => {
    const arranged = arrange(-1);

    arranged.camera.setLerp(PAST_ALL);

    expect(arranged.lerps).toEqual([0, 1]);
  });
});
