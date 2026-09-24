import { ZONE_CAPACITY } from "@domain/public";

/**
 * How many views of each kind the play scene makes at `create`: what the fixed view can show at
 * once, plus a margin. Presentation numbers, tuned here; a view pool never grows, so a miss
 * during play means one of these is too small, never that the pool should grow.
 */

/** The live cap: the most enemies the screen is built to show at once. */
export const ON_SCREEN_ENEMIES = 200;

/** The live cap: the most projectiles the screen is built to show at once. */
export const ON_SCREEN_PROJECTILES = 100;

/** Room for the hero and the summons beside the enemies, and for a fight a little past the cap. */
const UNIT_VIEW_ROOM = 56;

/** Room for a volley a little past the projectile cap. */
const PROJECTILE_VIEW_ROOM = 28;

/** Unit views: every enemy the cap puts on screen, the hero, and the summons. Not the unit capacity. */
export const UNIT_VIEW_COUNT = ON_SCREEN_ENEMIES + UNIT_VIEW_ROOM;

/** Outlines: how many elites and bosses are on screen at once in a busy fight. */
export const OUTLINE_VIEW_COUNT = 64;

/** Rows of status icons: one per unit view, since a spell can put a status on every unit on screen at once. */
export const STATUS_ICON_VIEW_COUNT = UNIT_VIEW_COUNT;

/** Projectile views: the cap and a volley past it. Not the projectile capacity. */
export const PROJECTILE_VIEW_COUNT =
  ON_SCREEN_PROJECTILES + PROJECTILE_VIEW_ROOM;

/** Zone views: the zone pool's whole capacity, since every zone alive can be on screen at once. */
export const ZONE_VIEW_COUNT = ZONE_CAPACITY;

/** Obstacle quads: room for a map several times as busy as the arena. Bound per map, not per frame. */
export const OBSTACLE_VIEW_COUNT = 64;

/** Floor tiles: enough to cover the canvas and its margin in whole tiles. */
export const FLOOR_TILE_COUNT = 320;
