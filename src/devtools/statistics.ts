import type { SampleRing } from "@instrumentation/public";

/**
 * The statistics a readout shows, computed here from the samples a ring stores. A ring never
 * holds a mean or a max; the panel computes them over the window it shows, so nothing of the
 * sort is in the tick's budget or the replay's state. Every function answers `null` for a
 * ring nobody has written, which the readout shows as a dash.
 */

/** The newest sample, or `null` for an empty ring. */
export const lastSample = (ring: SampleRing): number | null =>
  ring.count === 0 ? null : ring.at(ring.count - 1);

/** The mean of the newest `window` samples, or fewer while the ring holds fewer. */
export const windowMean = (ring: SampleRing, window: number): number | null => {
  const count = Math.min(window, ring.count);

  if (count === 0) {
    return null;
  }

  let total = 0;

  for (let offset = ring.count - count; offset < ring.count; offset += 1) {
    total += ring.at(offset) ?? 0;
  }

  return total / count;
};

/** The largest of the newest `window` samples, or fewer while the ring holds fewer. */
export const windowMax = (ring: SampleRing, window: number): number | null => {
  const count = Math.min(window, ring.count);

  if (count === 0) {
    return null;
  }

  let largest = Number.NEGATIVE_INFINITY;

  for (let offset = ring.count - count; offset < ring.count; offset += 1) {
    const sample = ring.at(offset);

    if (sample !== null && sample > largest) {
      largest = sample;
    }
  }

  return largest;
};
