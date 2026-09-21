import type { SampleRing } from "./sample-ring";
import { createSampleRing } from "./sample-ring";

/**
 * One ring per measurement. Every ring is on in every build; the panel that reads them is what
 * a production build strips. Who writes each ring is the driver, the play scene, the
 * draw-call counter, the pools' counters, and the event ring's counter.
 */
export type InstrumentationRings = Readonly<{
  /** Wall milliseconds around one `tick`, written by the driver. */
  tickTime: SampleRing;
  /** Wall milliseconds around the sync and the render of one frame, written by the play scene. */
  renderTime: SampleRing;
  /** Frames per second implied by one frame delta, written by the driver. */
  frameRate: SampleRing;
  /** Live units after one tick. */
  liveUnits: SampleRing;
  /** Live projectiles after one tick. */
  liveProjectiles: SampleRing;
  /** Live effects after one tick. */
  liveEffects: SampleRing;
  /** Live zones after one tick. */
  liveZones: SampleRing;
  /** Acquires every pool has refused since the world was created, summed, after one tick. */
  poolMisses: SampleRing;
  /** Binds every view pool has refused since the play scene was created, summed, after one frame. */
  viewMisses: SampleRing;
  /** Events the ring has lost to overwrites since the world was created, after one tick. */
  eventOverwrites: SampleRing;
  /** Draw calls in one frame, every scene, written by the draw-call counter on the renderer's post-render. Never written under the Canvas renderer. */
  drawCalls: SampleRing;
  /** The world scene's share of `drawCalls`, so the figure the budget is held to excludes the HUD. */
  worldDrawCalls: SampleRing;
}>;

/** Every ring, empty, at the declared capacity. Created once at boot. */
export const createRings = (): InstrumentationRings => ({
  tickTime: createSampleRing(),
  renderTime: createSampleRing(),
  frameRate: createSampleRing(),
  liveUnits: createSampleRing(),
  liveProjectiles: createSampleRing(),
  liveEffects: createSampleRing(),
  liveZones: createSampleRing(),
  poolMisses: createSampleRing(),
  viewMisses: createSampleRing(),
  eventOverwrites: createSampleRing(),
  drawCalls: createSampleRing(),
  worldDrawCalls: createSampleRing(),
});
