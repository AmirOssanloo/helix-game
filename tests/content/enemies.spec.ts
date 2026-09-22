import { describe, expect, it } from "vitest";
import {
  atlasFrames,
  contentRegistry,
  enemies,
  trainingDummyDef,
} from "@content/public";
import { BEHAVIOUR_KEYS, ID_SHAPE, validateRegistry } from "@domain/public";

/** Every fault the content tier finds in the file `id` is written in. */
const faultsOf = (id: string) =>
  validateRegistry(contentRegistry).filter((fault) =>
    fault.file.endsWith(`/${id.replace(/_/g, "-")}.def.ts`),
  );

describe("the archetypes", () => {
  it("are listed once each, with ids of the one shape", () => {
    const ids = enemies.map((def) => def.id);

    expect(new Set(ids).size).toBe(ids.length);

    for (const id of ids) {
      expect(id).toMatch(ID_SHAPE);
    }
  });

  it("each name a behaviour the registry holds and a frame the atlas has", () => {
    const frames = new Set(atlasFrames.map((frame) => frame.name));

    for (const def of enemies) {
      expect(BEHAVIOUR_KEYS).toContain(def.behaviour);
      expect(frames.has(def.atlasFrame)).toBe(true);
      expect(frames.has(def.attack.atlasFrame)).toBe(true);
    }
  });
});

describe("the training dummy", () => {
  it("is in the registry and validates", () => {
    expect(enemies).toContain(trainingDummyDef);
    expect(faultsOf(trainingDummyDef.id)).toEqual([]);
  });

  it("never moves, never attacks, and grants nothing for dying", () => {
    expect(trainingDummyDef.behaviour).toBe("stationary");
    expect(trainingDummyDef.abilities).toEqual([]);
    expect(trainingDummyDef.movementSpeed).toBe(0);
    expect(trainingDummyDef.attack.damage).toBe(0);
    expect(trainingDummyDef.attack.acquireRadius).toBe(0);
    expect(trainingDummyDef.aggroRadius).toBe(0);
    expect(trainingDummyDef.experience).toBe(0);
    expect(trainingDummyDef.tier).toBe("normal");
  });

  it("carries a mana pool for a burn to take, and regenerates neither pool", () => {
    expect(trainingDummyDef.mana).toBeGreaterThan(0);
    expect(trainingDummyDef.manaRegen).toBe(0);
    expect(trainingDummyDef.healthRegen).toBe(0);
  });

  it("clamps at one health and is drawn as an outlined square", () => {
    expect(trainingDummyDef.indestructible).toBe(true);
    expect(trainingDummyDef.health).toBeGreaterThan(0);
    expect(trainingDummyDef.atlasFrame).toBe("square_outline");
  });
});
