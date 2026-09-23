import { DEFAULT_DIAMOND_WIDTH } from "./projection";

/**
 * The scale the play scene draws the ground at, as the width of one cell's diamond in pixels.
 * Presentation state like the overlay toggles: the developer panel writes it, the play scene
 * reads it each frame, and nothing in the world knows it exists, so a change of scale is not a
 * command and is not in the log. The composition root makes one and hands it to both.
 */
export type ViewScale = {
  diamondWidth: number;
};

/** The scale a fresh session starts at. */
export const createViewScale = (): ViewScale => ({
  diamondWidth: DEFAULT_DIAMOND_WIDTH,
});
