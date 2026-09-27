/**
 * The HUD scene's fixed depth bands, apart from the play scene's: the bar, then screens above
 * it. Every label draws over every quad of its band. A pool sets one when it is made and never
 * per frame; within a band, draw order is pool order.
 */
export const HUD_DEPTH_BAR = 0;
export const HUD_DEPTH_BAR_TEXT = 1;
export const HUD_DEPTH_SCREEN = 10;
export const HUD_DEPTH_SCREEN_TEXT = 11;
