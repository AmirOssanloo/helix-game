/**
 * The fixed depth bands. A pool sets one on a view when it is made or bound and never per
 * frame, so nothing is sorted by position; within a band, draw order is pool order. The HUD
 * runs in its own scene and needs none.
 */
export const DEPTH_GROUND = 0;
export const DEPTH_OBSTACLES = 10;
export const DEPTH_UNITS = 20;
export const DEPTH_PROJECTILES = 30;
export const DEPTH_AIR = 40;
export const DEPTH_TEXT = 50;
export const DEPTH_DEBUG = 90;
