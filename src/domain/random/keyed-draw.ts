import { HASH_RANGE, assert, hash4 } from "@shared/public";
import type { World } from "../entities/world-state";

/**
 * Why a rule draws. One list, so two sites that would draw the same number for one key on one
 * tick are seen side by side. A site that draws several numbers of one kind for one key on one
 * tick, such as a drop's affixes, takes one purpose and a draw index per number; numbers of
 * different kinds take different purposes. A value never changes once a log is recorded on it,
 * since changing it moves every draw it names, and every value stays below `PURPOSE_STRIDE`.
 */
export const DRAW_PURPOSE = {
  /** Whether a chasing unit halts at a re-path instead of walking. */
  chaseHalt: 1,
  /** How long a halt a chasing unit has just begun lasts. */
  chaseHaltLength: 2,

  /** How many items a death drops. */
  lootDropCount: 3,
  /** Which base an item dropped is. */
  lootBase: 4,
  /** Which rarity an item dropped rolls. */
  lootRarity: 5,
  /** Which affix an item rolls, one draw index per affix. */
  lootAffix: 6,
  /** The value an affix rolls within its range, one draw index per affix. */
  lootAffixValue: 7,
  /** Whether a death drops gold, and how much. */
  lootGold: 8,
  /** Whether a death drops a globe. */
  lootGlobe: 9,
  /** What a store stocks, one draw index per stock slot. */
  storeStock: 10,
} as const;

export type DrawPurpose = (typeof DRAW_PURPOSE)[keyof typeof DRAW_PURPOSE];

/** How many values a draw can take: every draw is an integer in [0, `KEYED_DRAW_RANGE`). */
export const KEYED_DRAW_RANGE = HASH_RANGE;

/**
 * How far apart one purpose's draw indices sit in the hash's purpose word. Every purpose is
 * below it, so a purpose at one index never equals another purpose at another index.
 */
export const PURPOSE_STRIDE = 256;

/** How many draw indices one purpose has: an index is an integer in [0, `DRAW_INDEX_LIMIT`). */
export const DRAW_INDEX_LIMIT = 1024;

/** The largest integer the engine keeps unboxed, which the folded purpose word stays within. */
const SMALL_INTEGER_LIMIT = 0x40000000;

const largestPurpose = Math.max(...Object.values(DRAW_PURPOSE));

if (largestPurpose >= PURPOSE_STRIDE) {
  throw new Error("Every draw purpose stays below the purpose stride");
}

if (PURPOSE_STRIDE * DRAW_INDEX_LIMIT > SMALL_INTEGER_LIMIT) {
  throw new Error(
    "A purpose folded with its largest draw index stays a small integer",
  );
}

/**
 * A rule's random draw: a hash of the run's seed, `key`, the current tick, and `purpose` with
 * its draw `index` folded in as `purpose + index × PURPOSE_STRIDE`, an integer in
 * [0, `KEYED_DRAW_RANGE`). Index 0 is the purpose alone, so a site that draws one number passes
 * 0; a site that draws many of one kind counts up from 0 and stays below `DRAW_INDEX_LIMIT`. A
 * per-unit draw keys on the unit's generational id. It reads the seed and the tick and writes
 * nothing, so a draw in one rule never moves another's, and the caller turns the integer into a
 * chance or a length with its own arithmetic.
 */
export const keyedDraw = (
  world: Readonly<World>,
  key: number,
  purpose: DrawPurpose,
  index: number,
): number => {
  assert(
    Number.isInteger(index) && index >= 0 && index < DRAW_INDEX_LIMIT,
    "A draw index is an integer below the draw index limit",
  );

  return hash4(
    world.run.random.seed,
    key,
    world.tick,
    purpose + index * PURPOSE_STRIDE,
  );
};
