/**
 * How many values a hash can take: every result is an integer in [0, `HASH_RANGE`). 24 bits,
 * so a result is always a small integer the engine never boxes, and a result times a count of
 * a few million stays exact.
 */
export const HASH_RANGE = 0x1000000;

/** How far a finished 32-bit hash is shifted right to leave its top 24 bits. */
const RESULT_SHIFT = 8;

/** The murmur3 block constants and its per-block step. */
const BLOCK_MULTIPLIER_A = 0xcc9e2d51;
const BLOCK_MULTIPLIER_B = 0x1b873593;
const BLOCK_ROTATION = 15;
const STATE_ROTATION = 13;
const STATE_MULTIPLIER = 5;
const STATE_INCREMENT = 0xe6546b64;

/** The murmur3 finaliser's constants, which spread every input bit over every output bit. */
const FINAL_MULTIPLIER_A = 0x85ebca6b;
const FINAL_MULTIPLIER_B = 0xc2b2ae35;
const FINAL_SHIFT_A = 16;
const FINAL_SHIFT_B = 13;

/** The number of 32-bit words the hash takes, folded into its state before finalising. */
const WORD_COUNT = 4;

const WORD_BITS = 32;

const rotate = (value: number, bits: number): number =>
  (value << bits) | (value >>> (WORD_BITS - bits));

/** One murmur3 block: the word `word` folded into the running state `state`. */
const mixWord = (state: number, word: number): number => {
  let block = Math.imul(word | 0, BLOCK_MULTIPLIER_A);

  block = rotate(block, BLOCK_ROTATION);
  block = Math.imul(block, BLOCK_MULTIPLIER_B);

  const mixed = rotate(state ^ block, STATE_ROTATION);

  return (Math.imul(mixed, STATE_MULTIPLIER) + STATE_INCREMENT) | 0;
};

/**
 * A pure hash of four integers into [0, `HASH_RANGE`): murmur3's 32-bit mixing over the four
 * words in order, then its finaliser, keeping the top 24 bits. Each argument counts by its low
 * 32 bits, so an unsigned 32-bit seed and a negative integer both hash. The same four integers
 * always give the same result, and the order of the arguments matters. It allocates nothing.
 */
export const hash4 = (a: number, b: number, c: number, d: number): number => {
  let state = mixWord(0, a);

  state = mixWord(state, b);
  state = mixWord(state, c);
  state = mixWord(state, d);
  state ^= WORD_COUNT;
  state ^= state >>> FINAL_SHIFT_A;
  state = Math.imul(state, FINAL_MULTIPLIER_A);
  state ^= state >>> FINAL_SHIFT_B;
  state = Math.imul(state, FINAL_MULTIPLIER_B);
  state ^= state >>> FINAL_SHIFT_A;

  return state >>> RESULT_SHIFT;
};
