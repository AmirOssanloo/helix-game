import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import type { EffectId, ProjectileId, UnitId, ZoneId } from "@domain/public";
import {
  createEffectPool,
  createProjectilePool,
  createUnitPool,
  createZonePool,
} from "@domain/public";
import type { Id } from "@shared/public";
import {
  GENERATION_BITS,
  INDEX_BITS,
  MAX_GENERATION,
  MAX_INDEX,
  nextGeneration,
  packId,
  unpackGeneration,
  unpackIndex,
} from "@shared/public";
import { listSourceFiles, SOURCE_DIR } from "../helpers";

describe("packId", () => {
  it.each([
    { index: 0, generation: 0 },
    { index: 511, generation: 1 },
    { index: 7, generation: 3 },
    { index: MAX_INDEX, generation: 0 },
    { index: 0, generation: MAX_GENERATION },
    { index: MAX_INDEX, generation: MAX_GENERATION },
  ])(
    "packs index $index and generation $generation so both unpack unchanged",
    ({ index, generation }) => {
      const id = packId(index, generation);

      expect(unpackIndex(id)).toBe(index);
      expect(unpackGeneration(id)).toBe(generation);
    },
  );

  it("changes the id when the generation of the same slot is bumped", () => {
    const before = packId(42, 1);

    const after = packId(42, nextGeneration(1));

    expect(after).not.toBe(before);
    expect(unpackIndex(after)).toBe(unpackIndex(before));
  });

  it("gives distinct slots distinct ids in the same generation", () => {
    expect(packId(1, 0)).not.toBe(packId(2, 0));
  });

  it("stays a non-negative integer at the largest index and generation", () => {
    const id = packId(MAX_INDEX, MAX_GENERATION);

    expect(Number.isSafeInteger(id)).toBe(true);
    expect(id).toBeGreaterThanOrEqual(0);
    expect(id).toBeLessThan(2 ** (INDEX_BITS + GENERATION_BITS));
  });

  it.each([
    { index: -1, generation: 0 },
    { index: MAX_INDEX + 1, generation: 0 },
    { index: 0, generation: -1 },
    { index: 0, generation: MAX_GENERATION + 1 },
  ])(
    "refuses index $index and generation $generation outside the bit split",
    ({ index, generation }) => {
      expect(() => packId(index, generation)).toThrow();
    },
  );
});

describe("nextGeneration", () => {
  it("advances by one", () => {
    expect(nextGeneration(0)).toBe(1);
  });

  it("wraps to zero past the largest generation the bits hold", () => {
    expect(nextGeneration(MAX_GENERATION)).toBe(0);
  });
});

/** The id of the first slot `pool` hands out, for a spec that needs an id each pool minted. */
const firstIdOf = <I extends Id<string>>(pool: {
  acquireIndex: () => number;
  idAt: (index: number) => I | null;
}): I => {
  const id = pool.idAt(pool.acquireIndex());

  if (id === null) {
    throw new Error("A fresh pool hands out its first slot");
  }

  return id;
};

describe("an id's kind", () => {
  it("costs nothing at run time: a pool's id is the number it packed", () => {
    const unitId = firstIdOf(createUnitPool());

    expect(typeof unitId).toBe("number");
    expect(unitId).toBe(packId(0, 0));
  });

  it("lets each pool take its own ids and no other pool's", () => {
    const units = createUnitPool();
    const projectiles = createProjectilePool();
    const zones = createZonePool();
    const effects = createEffectPool();
    const unitId: UnitId = firstIdOf(units);
    const projectileId: ProjectileId = firstIdOf(projectiles);
    const zoneId: ZoneId = firstIdOf(zones);
    const effectId: EffectId = firstIdOf(effects);

    expect(units.resolve(unitId)).not.toBeNull();
    expect(projectiles.resolve(projectileId)).not.toBeNull();
    expect(zones.resolve(zoneId)).not.toBeNull();
    expect(effects.resolve(effectId)).not.toBeNull();

    // Each line below compiles only if the pairing is refused; what it returns is not the point.
    // @ts-expect-error a projectile id is not a unit id
    units.resolve(projectileId);
    // @ts-expect-error a zone id is not a unit id
    units.resolve(zoneId);
    // @ts-expect-error an effect id is not a unit id
    units.resolve(effectId);
    // @ts-expect-error a unit id is not a projectile id
    projectiles.resolve(unitId);
    // @ts-expect-error a zone id is not a projectile id
    projectiles.resolve(zoneId);
    // @ts-expect-error an effect id is not a projectile id
    projectiles.resolve(effectId);
    // @ts-expect-error a unit id is not a zone id
    zones.resolve(unitId);
    // @ts-expect-error a projectile id is not a zone id
    zones.resolve(projectileId);
    // @ts-expect-error an effect id is not a zone id
    zones.resolve(effectId);
    // @ts-expect-error a unit id is not an effect id
    effects.resolve(unitId);
    // @ts-expect-error a projectile id is not an effect id
    effects.resolve(projectileId);
    // @ts-expect-error a zone id is not an effect id
    effects.resolve(zoneId);
    // @ts-expect-error a plain number is no pool's id
    units.release(packId(0, 0));
  });

  it("names no kind of entity under shared, which holds only the generic tag", () => {
    const shared = join(SOURCE_DIR, "shared");
    const offenders = listSourceFiles(shared)
      .filter((file) =>
        /\b(?:UnitId|ProjectileId|ZoneId|EffectId|EntityId)\b|Id<"/u.test(
          readFileSync(file, "utf8"),
        ),
      )
      .map((file) => relative(SOURCE_DIR, file).split("\\").join("/"));

    expect(offenders).toEqual([]);
  });
});
