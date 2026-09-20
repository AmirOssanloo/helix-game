import type { SampleRing } from "./sample-ring";
import { createSampleRing } from "./sample-ring";

/**
 * One ring per measurement. Every ring is on in every build; the panel that reads them is what
 * a production build strips. Who writes each ring is the driver, the play scene, the pools'
 * counters, and the event ring's counter, sampled after each tick.
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
  /** Events the ring has lost to overwrites since the world was created, after one tick. */
  eventOverwrites: SampleRing;
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
  eventOverwrites: createSampleRing(),
});
