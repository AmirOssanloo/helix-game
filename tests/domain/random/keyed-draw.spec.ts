import { describe, expect, it } from "vitest";
import {
  DRAW_INDEX_LIMIT,
  DRAW_PURPOSE,
  type DrawPurpose,
  KEYED_DRAW_RANGE,
  keyedDraw,
  PURPOSE_STRIDE,
} from "@domain/public";
import { hash4 } from "@shared/public";
import { makeWorld } from "../../helpers";

/** The keys a draw below is taken for: two unit ids of different slots and generations. */
const KEYS = [1, 65_538];

/** Every purpose in the one list. */
const PURPOSES: DrawPurpose[] = Object.values(DRAW_PURPOSE);

/** How many draw indices at one key the index tests below walk. */
const INDICES = 64;

/** How many ticks the distribution test walks per index. */
const TICKS = 40_000;

describe("keyedDraw", () => {
  it("is at index 0 the hash of the run's seed, the key, the tick, and the purpose, as before the index", () => {
    const world = makeWorld({ seed: 7 });

    for (let step = 0; step < 3; step += 1) {
      for (const key of KEYS) {
        for (const purpose of PURPOSES) {
          expect(keyedDraw(world.state, key, purpose, 0)).toBe(
            hash4(7, key, world.view.tick, purpose),
          );
        }
      }

      world.tick();
    }
  });

  it("gives the same draw in two worlds from one seed on one tick, and another for another seed", () => {
    const first = makeWorld({ seed: 7 });
    const second = makeWorld({ seed: 7 });
    const other = makeWorld({ seed: 8 });

    expect(keyedDraw(first.state, 1, DRAW_PURPOSE.chaseHalt, 0)).toBe(
      keyedDraw(second.state, 1, DRAW_PURPOSE.chaseHalt, 0),
    );
    expect(keyedDraw(first.state, 1, DRAW_PURPOSE.chaseHalt, 0)).not.toBe(
      keyedDraw(other.state, 1, DRAW_PURPOSE.chaseHalt, 0),
    );
  });

  it("differs by key, by tick, and by purpose", () => {
    const world = makeWorld({ seed: 7 });
    const [first = 0, second = 0] = KEYS;
    const drawn = keyedDraw(world.state, first, DRAW_PURPOSE.chaseHalt, 0);

    expect(keyedDraw(world.state, second, DRAW_PURPOSE.chaseHalt, 0)).not.toBe(
      drawn,
    );
    expect(
      keyedDraw(world.state, first, DRAW_PURPOSE.chaseHaltLength, 0),
    ).not.toBe(drawn);

    world.tick();

    expect(keyedDraw(world.state, first, DRAW_PURPOSE.chaseHalt, 0)).not.toBe(
      drawn,
    );
  });

  it("returns an integer below the draw range", () => {
    const world = makeWorld({ seed: 0xffffffff });

    for (const key of KEYS) {
      for (const purpose of PURPOSES) {
        const drawn = keyedDraw(world.state, key, purpose, 0);

        expect(Number.isInteger(drawn)).toBe(true);
        expect(drawn).toBeGreaterThanOrEqual(0);
        expect(drawn).toBeLessThan(KEYED_DRAW_RANGE);
      }
    }
  });

  it("leaves the world's random source as it found it", () => {
    const world = makeWorld({ seed: 7 });
    const before = { ...world.state.run.random };

    for (const key of KEYS) {
      for (const purpose of PURPOSES) {
        keyedDraw(world.state, key, purpose, 0);
      }
    }

    expect(world.state.run.random).toEqual(before);
  });

  it("names every purpose with a value of its own", () => {
    expect(new Set(PURPOSES).size).toBe(PURPOSES.length);
  });

  it("folds the index into the purpose word, one stride per index", () => {
    const world = makeWorld({ seed: 7 });

    for (const purpose of PURPOSES) {
      for (const index of [1, 2, INDICES - 1, DRAW_INDEX_LIMIT - 1]) {
        expect(keyedDraw(world.state, 1, purpose, index)).toBe(
          hash4(7, 1, world.view.tick, purpose + index * PURPOSE_STRIDE),
        );
      }
    }
  });

  it("keeps every purpose below the stride, so no purpose at one index meets another at another", () => {
    for (const purpose of PURPOSES) {
      expect(purpose).toBeGreaterThan(0);
      expect(purpose).toBeLessThan(PURPOSE_STRIDE);
    }

    const words = new Set<number>();

    for (const purpose of PURPOSES) {
      for (let index = 0; index < DRAW_INDEX_LIMIT; index += 1) {
        words.add(purpose + index * PURPOSE_STRIDE);
      }
    }

    expect(words.size).toBe(PURPOSES.length * DRAW_INDEX_LIMIT);
  });

  it("gives distinct draws at one key over indices 0 to 63, for every purpose", () => {
    const world = makeWorld({ seed: 7 });

    for (const key of KEYS) {
      for (const purpose of PURPOSES) {
        const drawn = new Set<number>();

        for (let index = 0; index < INDICES; index += 1) {
          drawn.add(keyedDraw(world.state, key, purpose, index));
        }

        expect(drawn.size).toBe(INDICES);
      }
    }
  });

  it.each(Array.from({ length: INDICES }, (_, index) => index))(
    "spreads a run of ticks over the whole range at index %i, so a chance drawn from it lands near its share",
    (index) => {
      const chance = 0.08;
      const world = makeWorld({ seed: 1 });
      let under = 0;

      // The draw a run of ticks would give, read without stepping a world, since the fold
      // test above holds the draw to this hash at every index.
      for (let tick = 0; tick < TICKS; tick += 1) {
        const drawn = hash4(
          world.state.run.random.seed,
          65_537,
          tick,
          DRAW_PURPOSE.lootAffix + index * PURPOSE_STRIDE,
        );

        if (drawn < chance * KEYED_DRAW_RANGE) {
          under += 1;
        }
      }

      expect(under / TICKS).toBeCloseTo(chance, 2);
    },
  );

  it("refuses an index that is negative, fractional, or at the limit", () => {
    const world = makeWorld({ seed: 7 });

    for (const index of [-1, 0.5, DRAW_INDEX_LIMIT]) {
      expect(() =>
        keyedDraw(world.state, 1, DRAW_PURPOSE.lootAffix, index),
      ).toThrow("A draw index is an integer below the draw index limit");
    }
  });
});
