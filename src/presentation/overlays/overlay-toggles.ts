/**
 * Which debug overlays the play scene draws this frame. Presentation state: the developer
 * panel writes it, the play scene reads it each frame, and nothing in the world knows it
 * exists, so a toggle is not a command and is not in the log. The composition root makes one
 * and hands it to both; the panel names the same fields on its side of the layer line.
 */
export type OverlayToggles = {
  /** The solid disc of every unit on screen: what pathing and unit-to-unit blocking see. */
  collisionDiscs: boolean;
  /** The range buffer of every unit on screen, as a second ring, since tuning the wrong one is the classic mistake. */
  boundRadii: boolean;
  /** The hero's heading and the two edges of its action cone. */
  facingCone: boolean;
  /** The waypoints left on every moving unit's path, from where it stands. */
  pathLines: boolean;
  /** Every cell of the walkability grid the hero's radius class may not stand in. */
  walkabilityGrid: boolean;
  /** Every occupied cell of the spatial hash, with the count of units in it. */
  hashCells: boolean;
};

/** Every overlay off, as a fresh session starts. */
export const createOverlayToggles = (): OverlayToggles => ({
  collisionDiscs: false,
  boundRadii: false,
  facingCone: false,
  pathLines: false,
  walkabilityGrid: false,
  hashCells: false,
});
