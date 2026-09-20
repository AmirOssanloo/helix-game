import type { RandomState } from "@domain/public";
import { assert } from "@shared/public";

/**
 * The world's random source: xorshift32 over the 32-bit state on run scope. Chosen for a
 * state that is one integer, so a replay from the same seed reproduces every draw and the
 * state reads back in a test. The generator is stuck at zero forever, so a seed is scrambled
 * into its first state and a scramble that lands on zero takes this constant instead.
 */
const ZERO_STATE_REPLACEMENT = 0x9e3779b9;

/** One draw covers [0, 2^32); dividing by this maps it onto [0, 1). */
const DRAW_RANGE = 0x100000000;

/** A 32-bit integer hash, so nearby seeds start far apart in the sequence. */
const scramble = (seed: number): number => {
  let state = seed >>> 0;

  state ^= state >>> 16;
  state = Math.imul(state, 0x7feb352d);
  state ^= state >>> 15;
  state = Math.imul(state, 0x846ca68b);
  state ^= state >>> 16;
  state >>>= 0;

  return state === 0 ? ZERO_STATE_REPLACEMENT : state;
};

/** Random state for `seed`, at the start of its sequence. The low 32 bits of the seed count. */
export const createRandomState = (seed: number): RandomState => ({
  seed,
  state: scramble(seed),
});

/** Restarts `random` at the start of `seed`'s sequence, in place. */
export const seedRandom = (random: RandomState, seed: number): void => {
  random.seed = seed;
  random.state = scramble(seed);
};

const nextDraw = (random: RandomState): number => {
  let state = random.state;

  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  state >>>= 0;

  random.state = state;

  return state;
};

/** The next number in [0, 1). */
export const nextFloat = (random: RandomState): number =>
  nextDraw(random) / DRAW_RANGE;

/** The next integer in [0, `bound`), for an integer `bound` of at least one. */
export const nextInt = (random: RandomState, bound: number): number => {
  assert(
    Number.isInteger(bound) && bound >= 1,
    "nextInt needs an integer bound of at least one",
  );

  return Math.floor(nextFloat(random) * bound);
};
