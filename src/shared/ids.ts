import { assert } from "./assert";

/**
 * A number packing a pool index in its low bits and a generation above them. A released slot
 * bumps its generation, so an id held across the release no longer matches and resolves to
 * nothing.
 */
export type EntityId = number;

/** How many low bits of an id hold the pool index. */
export const INDEX_BITS = 16;

/**
 * How many bits above the index hold the generation. With the index bits they fill 31 bits,
 * so every id is a non-negative 32-bit integer and the bitwise operations below stay exact.
 */
export const GENERATION_BITS = 15;

export const MAX_INDEX = (1 << INDEX_BITS) - 1;

export const MAX_GENERATION = (1 << GENERATION_BITS) - 1;

export const packId = (index: number, generation: number): EntityId => {
  assert(
    index >= 0 && index <= MAX_INDEX,
    "A pool index must fit the id's index bits",
  );
  assert(
    generation >= 0 && generation <= MAX_GENERATION,
    "A generation must fit the id's generation bits",
  );

  return (generation << INDEX_BITS) | index;
};

export const unpackIndex = (id: EntityId): number => id & MAX_INDEX;

export const unpackGeneration = (id: EntityId): number => id >>> INDEX_BITS;

/** The generation after `generation`, wrapping to zero past the last one the bits can hold. */
export const nextGeneration = (generation: number): number =>
  (generation + 1) & MAX_GENERATION;
