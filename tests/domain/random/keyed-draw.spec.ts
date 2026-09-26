import { describe, expect, it } from "vitest";
import {
  DRAW_PURPOSE,
  type DrawPurpose,
  KEYED_DRAW_RANGE,
  keyedDraw,
} from "@domain/public";
import { hash4 } from "@shared/public";
import { makeWorld } from "../../helpers";

/** The keys a draw below is taken for: two unit ids of different slots and generations. */
const KEYS = [1, 65_538];

/** Every purpose in the one list. */
const PURPOSES: DrawPurpose[] = Object.values(DRAW_PURPOSE);

describe("keyedDraw", () => {
  it("is the hash of the run's seed, the key, the tick, and the purpose", () => {
    const world = makeWorld({ seed: 7 });

    for (let step = 0; step < 3; step += 1) {
      for (const key of KEYS) {
        for (const purpose of PURPOSES) {
          expect(keyedDraw(world.state, key, purpose)).toBe(
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

    expect(keyedDraw(first.state, 1, DRAW_PURPOSE.chaseHalt)).toBe(
      keyedDraw(second.state, 1, DRAW_PURPOSE.chaseHalt),
    );
    expect(keyedDraw(first.state, 1, DRAW_PURPOSE.chaseHalt)).not.toBe(
      keyedDraw(other.state, 1, DRAW_PURPOSE.chaseHalt),
    );
  });

  it("differs by key, by tick, and by purpose", () => {
    const world = makeWorld({ seed: 7 });
    const [first = 0, second = 0] = KEYS;
    const drawn = keyedDraw(world.state, first, DRAW_PURPOSE.chaseHalt);

    expect(keyedDraw(world.state, second, DRAW_PURPOSE.chaseHalt)).not.toBe(
      drawn,
    );
    expect(
      keyedDraw(world.state, first, DRAW_PURPOSE.chaseHaltLength),
    ).not.toBe(drawn);

    world.tick();

    expect(keyedDraw(world.state, first, DRAW_PURPOSE.chaseHalt)).not.toBe(
      drawn,
    );
  });

  it("returns an integer below the draw range", () => {
    const world = makeWorld({ seed: 0xffffffff });

    for (const key of KEYS) {
      for (const purpose of PURPOSES) {
        const drawn = keyedDraw(world.state, key, purpose);

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
        keyedDraw(world.state, key, purpose);
      }
    }

    expect(world.state.run.random).toEqual(before);
  });

  it("names every purpose with a value of its own", () => {
    expect(new Set(PURPOSES).size).toBe(PURPOSES.length);
  });
});
