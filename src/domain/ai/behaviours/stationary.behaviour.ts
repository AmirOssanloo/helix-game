import type { Behaviour } from "../behaviour";

/** Stands where it spawned and never acts: the training dummy's driver, and the neutral one for a unit that needs none. */
export const stationaryBehaviour: Behaviour = (): void => {};
