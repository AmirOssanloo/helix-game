/**
 * A one-shot request for the next point clicked on the ground. Presentation state: the
 * developer panel arms it, the input mapper answers it with the next left click that opens no
 * cursor and commits none, and that click orders nothing. The composition root makes one and
 * hands it to both; the panel names the same field on its side of the layer line.
 */
export type GroundPick = {
  /** What the next ground click is handed to, in world units, or `null` when nothing is waiting. */
  pending: ((x: number, y: number) => void) | null;
};

/** Nothing waiting, as a fresh session starts. */
export const createGroundPick = (): GroundPick => ({ pending: null });
