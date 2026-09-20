import type { WorldView } from '@simulation/public';

/** Reads the world view and writes sprites, once per frame, with the interpolation alpha between ticks. */
export type ViewSync = (world: WorldView, alpha: number) => void;
