import { describe, expect, it } from "vitest";
import type { World } from "@domain/public";
import { STATE_EXCLUDED, STATE_LEAVES } from "@simulation/testing";
import {
  arrangeEveryRecord,
  isPoolLike,
  nudgeLeaf,
  tickDifference,
} from "../index";

const LISTED = new Set(STATE_LEAVES.map((leaf) => leaf.path));
const EXCLUDED = new Set(STATE_EXCLUDED.map((entry) => entry.path));

/** Whether a listed leaf is read through `path`, as an ability's id is read through the ability. */
const isReadThrough = (path: string): boolean =>
  STATE_LEAVES.some((leaf) => leaf.path.startsWith(`${path}.`));

const join = (path: string, key: string): string =>
  path === "" ? key : `${path}.${key}`;

/**
 * Every path under `value` that holds a value and is neither a listed leaf, nor under a key
 * left out, nor read through by a listed leaf: what the lists would silently skip. A pool is
 * walked through its first slot, a list through its first item, as the lists name them.
 */
const unlistedUnder = (value: unknown, path: string, found: string[]): void => {
  if (LISTED.has(path) || EXCLUDED.has(path)) {
    return;
  }

  if (typeof value !== "object" || value === null) {
    if (!isReadThrough(path)) {
      found.push(path);
    }

    return;
  }

  if (isPoolLike(value)) {
    unlistedUnder(value.at(0), `${path}[]`, found);

    return;
  }

  if (Array.isArray(value) || value instanceof Uint8Array) {
    if (!LISTED.has(`${path}[]`)) {
      unlistedUnder(value[0], `${path}[]`, found);
    }

    return;
  }

  if (value instanceof Map) {
    if (!LISTED.has(`${path}{}`)) {
      found.push(`${path}{}`);
    }

    return;
  }

  for (const [key, child] of Object.entries(value)) {
    unlistedUnder(child, join(path, key), found);
  }
};

const unlistedOf = (world: World): string[] => {
  const found: string[] = [];

  unlistedUnder(world, "", found);

  return found;
};

describe("the full-state comparison", () => {
  it("names every leaf of every list when that leaf alone moves by the smallest step, and nothing once it is put back", () => {
    const reference = arrangeEveryRecord();
    let changed = arrangeEveryRecord();
    const misnamed: string[] = [];

    for (const leaf of STATE_LEAVES) {
      expect(tickDifference(reference.state, changed.state), leaf.path).toBe(
        null,
      );

      const nudge = nudgeLeaf(changed.state, leaf);
      const difference = tickDifference(reference.state, changed.state);

      if (difference === null || !difference.startsWith(nudge.path)) {
        misnamed.push(`${leaf.path}: ${String(difference)}`);
      }

      nudge.restore();

      if (leaf.kind === "slot") {
        changed = arrangeEveryRecord();
      }
    }

    expect(misnamed).toEqual([]);
  });

  it("lists or leaves out, with a reason, every field the world holds", () => {
    expect(unlistedOf(arrangeEveryRecord().state)).toEqual([]);
    expect(STATE_EXCLUDED.every((entry) => entry.reason.length > 0)).toBe(true);
  });

  it("fails on a field no list names", () => {
    const world = arrangeEveryRecord().state;
    const hero = world.map.units.at(0);

    if (hero === null) {
      throw new Error("The arranged world's hero is in the first slot");
    }

    Object.assign(hero.ai, { unlisted: 1 });

    expect(unlistedOf(world)).toEqual(["map.units[].ai.unlisted"]);
  });
});
