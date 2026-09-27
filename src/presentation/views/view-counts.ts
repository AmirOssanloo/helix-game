import { ZONE_CAPACITY } from "@domain/public";

/**
 * How many views of each kind the play scene makes at `create`: what the fixed view can show at
 * once, plus a margin. Every pool size in presentation lives here, the debug overlays' and the
 * floating numbers' included. Presentation numbers, tuned here; a view pool never grows, so a
 * miss during play means one of these is too small, never that the pool should grow.
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

/** Obstacle quads: the most rectangles the camera's world rectangle reaches on the busiest shipped map, and room past it. Bound per frame, not per map. */
export const OBSTACLE_VIEW_COUNT = 64;

/** Checkpoint rings: a map's checkpoints stand far enough apart that two show at once at most, so this is room past that. */
export const CHECKPOINT_VIEW_COUNT = 8;

/** Floor tiles: enough to cover the canvas and its margin in whole tiles. */
export const FLOOR_TILE_COUNT = 320;

/** The busiest fight the floating numbers are sized for: this many hits landing inside one second, each on a unit of its own. */
export const FLOATING_NUMBER_HITS_A_SECOND = 200;

/** Room past the bar, so a fight a little busier than it still recycles nothing. */
const FLOATING_NUMBER_MARGIN = 56;

/**
 * How many floating numbers the set holds: every hit the bar lands inside one number's rise,
 * each raising its own, plus the margin. A number rises for the fade duration the tuning table
 * sets, a second by default, so that is the bar's hits a second. A rise tuned longer than that
 * recycles the oldest sooner, and counts it.
 */
export const FLOATING_NUMBER_COUNT =
  FLOATING_NUMBER_HITS_A_SECOND + FLOATING_NUMBER_MARGIN;

/**
 * The debug overlays' pools, made only where the panel is. Each bounds how much of an overlay
 * draws at once; a frame past a pool counts a miss instead of growing it.
 */

/** Rings per unit overlay, collision, bound, aggro, and leash: the unit views on screen and more. */
export const OVERLAY_RING_COUNT = 320;

/** The facing overlay: the heading and the two edges of the action cone. */
export const OVERLAY_FACING_QUAD_COUNT = 3;

/** The hero's two range rings: its attack range and its acquire radius. */
export const OVERLAY_HERO_RANGE_QUAD_COUNT = 2;

/** Path segments across every path on screen. */
export const OVERLAY_PATH_SEGMENT_COUNT = 512;

/** Shaded blocked cells: the densest view of a shipped map, with room past it. */
export const OVERLAY_BLOCKED_CELL_COUNT = 2048;

/** Occupied hash cells on screen, each an outline and a count label. */
export const OVERLAY_HASH_CELL_COUNT = 256;

/** Spell-area outlines per shape kind: circle, rectangle, and cone. */
export const OVERLAY_AREA_COUNT = 64;

/** State labels over the units on screen. */
export const OVERLAY_STATE_LABEL_COUNT = 256;
