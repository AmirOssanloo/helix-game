import { RingBuffer } from "@shared/public";

/** One measurement written to a ring; the panel computes statistics, the ring never does. */
export type Sample = number;

/**
 * Samples a ring keeps before the oldest is overwritten: ten seconds of ticks, five of frames
 * at sixty per second. The panel shows a window no wider than this.
 */
export const SAMPLE_RING_CAPACITY = 300;

/** A fixed array of samples and a cursor. Writing one is one array write; nothing allocates after creation. */
export type SampleRing = RingBuffer<Sample>;

/** A ring with every slot at zero, at the declared capacity unless a test asks for a smaller one. */
export const createSampleRing = (
  capacity: number = SAMPLE_RING_CAPACITY,
): SampleRing => new RingBuffer<Sample>(capacity, () => 0);
