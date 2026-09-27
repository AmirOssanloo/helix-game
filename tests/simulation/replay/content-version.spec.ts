import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type { Registry } from "@domain/public";
import {
  contentVersionOf,
  PRESENTATION_FIELDS,
  strictContentVersionOf,
} from "@simulation/testing";

/** One value in a definition that is not an object or a list, with where it sits. */
type Leaf = Readonly<{
  path: string;
  key: string;
  holder: Record<string, unknown>;
}>;

/** A copy of the content registry a test may write to. */
const copyOfContent = (): Registry => structuredClone(contentRegistry);

/** Every leaf of `value` under `path`, depth first. */
const leavesOf = (value: unknown, path: string, into: Leaf[]): Leaf[] => {
  if (value === null || typeof value !== "object") {
    return into;
  }

  const holder = value as Record<string, unknown>;

  for (const key of Object.keys(holder)) {
    const child = holder[key];
    const at = `${path}.${key}`;

    if (child !== null && typeof child === "object") {
      leavesOf(child, at, into);
    } else {
      into.push({ path: at, key, holder });
    }
  }

  return into;
};

/** Every leaf of `registry` outside its atlas frame list. */
const definitionLeaves = (registry: Registry): Leaf[] => {
  const { atlasFrames: _drawnOnly, ...definitions } = registry;
  const leaves: Leaf[] = [];

  for (const [kind, value] of Object.entries(definitions)) {
    leavesOf(value, kind, leaves);
  }

  return leaves;
};

/** Changes `leaf` by the smallest step its type has, and returns how to put it back. */
const nudge = (leaf: Leaf): (() => void) => {
  const written = leaf.holder[leaf.key];

  if (typeof written === "number") {
    leaf.holder[leaf.key] = written + 1;
  } else if (typeof written === "string") {
    leaf.holder[leaf.key] = `${written}_`;
  } else {
    leaf.holder[leaf.key] = written !== true;
  }

  return (): void => {
    leaf.holder[leaf.key] = written;
  };
};

const isListed = (leaf: Leaf): boolean =>
  PRESENTATION_FIELDS.includes(leaf.key);

describe("the narrow content version stamp", () => {
  it("leaves the atlas frame list out, glyphs included", () => {
    const registry = copyOfContent();
    const version = contentVersionOf(registry);
    const strict = strictContentVersionOf(registry);
    const resized = {
      ...registry,
      atlasFrames: registry.atlasFrames.map((frame, index) =>
        index === 0 ? { ...frame, width: frame.width + 1 } : frame,
      ),
    };
    const glyphless = {
      ...registry,
      atlasFrames: registry.atlasFrames.filter(
        (frame) => frame.shape.kind !== "glyph",
      ),
    };

    expect(glyphless.atlasFrames.length).toBeLessThan(
      registry.atlasFrames.length,
    );
    expect(contentVersionOf(resized)).toBe(version);
    expect(contentVersionOf(glyphless)).toBe(version);
    expect(strictContentVersionOf(resized)).not.toBe(strict);
    expect(strictContentVersionOf(glyphless)).not.toBe(strict);
  });

  it.each(PRESENTATION_FIELDS)(
    "leaves out %s wherever a definition has one",
    (field) => {
      const registry = copyOfContent();
      const version = contentVersionOf(registry);
      const strict = strictContentVersionOf(registry);
      const leaves = definitionLeaves(registry).filter(
        (leaf) => leaf.key === field,
      );
      const moved: string[] = [];
      const unseen: string[] = [];

      expect(leaves.length).toBeGreaterThan(0);

      for (const leaf of leaves) {
        const restore = nudge(leaf);

        if (contentVersionOf(registry) !== version) {
          moved.push(leaf.path);
        }

        if (strictContentVersionOf(registry) === strict) {
          unseen.push(leaf.path);
        }

        restore();
      }

      expect(moved).toEqual([]);
      expect(unseen).toEqual([]);
    },
  );

  it("moves on every other field of every definition", () => {
    const registry = copyOfContent();
    const version = contentVersionOf(registry);
    const leaves = definitionLeaves(registry).filter((leaf) => !isListed(leaf));
    const unmoved: string[] = [];

    for (const leaf of leaves) {
      const restore = nudge(leaf);

      if (contentVersionOf(registry) === version) {
        unmoved.push(leaf.path);
      }

      restore();
    }

    expect(unmoved).toEqual([]);
    expect(contentVersionOf(registry)).toBe(version);
  });
});

describe("the strict content version stamp", () => {
  it("moves on a simulation field as well", () => {
    const registry = copyOfContent();
    const retuned = {
      ...registry,
      tuning: { ...registry.tuning, base_ms: registry.tuning.base_ms + 1 },
    };

    expect(strictContentVersionOf(retuned)).not.toBe(
      strictContentVersionOf(registry),
    );
  });

  it("differs from the narrow stamp", () => {
    expect(strictContentVersionOf(contentRegistry)).not.toBe(
      contentVersionOf(contentRegistry),
    );
  });
});
