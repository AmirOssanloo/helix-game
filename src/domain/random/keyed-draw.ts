import { HASH_RANGE, hash4 } from "@shared/public";
import type { World } from "../entities/world-state";

/**
 * Why a rule draws. One list, so two sites that would draw the same number for one key on one
 * tick are seen side by side, and a site that draws twice for one key on one tick takes two
 * entries. A value never changes once a log is recorded on it, since changing it moves every
 * draw it names.
 */
export const DRAW_PURPOSE = {
  /** Whether a chasing unit halts at a re-path instead of walking. */
  chaseHalt: 1,
  /** How long a halt a chasing unit has just begun lasts. */
  chaseHaltLength: 2,
} as const;

export type DrawPurpose = (typeof DRAW_PURPOSE)[keyof typeof DRAW_PURPOSE];

/** How many values a draw can take: every draw is an integer in [0, `KEYED_DRAW_RANGE`). */
export const KEYED_DRAW_RANGE = HASH_RANGE;

/**
 * A rule's random draw: a hash of the run's seed, `key`, the current tick, and `purpose`, an
 * integer in [0, `KEYED_DRAW_RANGE`). A per-unit draw keys on the unit's generational id. It
 * reads the seed and the tick and writes nothing, so a draw in one rule never moves another's,
 * and the caller turns the integer into a chance or a length with its own arithmetic.
 */
export const keyedDraw = (
  world: Readonly<World>,
  key: number,
  purpose: DrawPurpose,
): number => hash4(world.run.random.seed, key, world.tick, purpose);
