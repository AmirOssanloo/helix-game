import { describe, expect, it } from "vitest";
import {
  atlasFrames,
  contentRegistry,
  enemies,
  fastRunnerDef,
  heroDef,
  meleeGruntDef,
  rangedArcherDef,
  tankDef,
  trainingDummyDef,
  tuningTable,
} from "@content/public";
import type { EnemyDef } from "@domain/public";
import { BEHAVIOUR_KEYS, ID_SHAPE, validateRegistry } from "@domain/public";
import { makeEnemyDef, makeRegistry } from "../helpers";

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

/** The fields that hold an object or `null`, which a shape reads as one field whichever it holds. */
const NULLABLE_FIELDS: readonly string[] = ["eliteAbility"];

/** Every key of `value` and of every object inside it, as dotted paths, sorted: the shape a definition was written in. */
const shapeOf = (value: object, prefix = ""): string[] =>
  Object.entries(value)
    .flatMap(([key, field]: [string, unknown]): string[] =>
      typeof field === "object" &&
      field !== null &&
      !Array.isArray(field) &&
      !NULLABLE_FIELDS.includes(key)
        ? shapeOf(field, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    )
    .sort();

const ARCHETYPES: readonly EnemyDef[] = [
  meleeGruntDef,
  fastRunnerDef,
  rangedArcherDef,
  tankDef,
];

/** The arena corridor's width: a body wider than this cannot pass it. */
const CORRIDOR_WIDTH = 96;

describe("the four archetypes", () => {
  it.each(ARCHETYPES.map((def) => [def.id, def] as const))(
    "%s is in the registry and validates",
    (_id, def) => {
      expect(enemies).toContain(def);
      expect(faultsOf(def.id)).toEqual([]);
    },
  );

  it.each(ARCHETYPES.map((def) => [def.id, def] as const))(
    "%s writes every field the dummy writes, and no other",
    (_id, def) => {
      expect(shapeOf(def)).toEqual(shapeOf(trainingDummyDef));
    },
  );

  it("each stand on one of the three radius classes pathing plans for", () => {
    const classes = [
      tuningTable["radius_class:0"],
      tuningTable["radius_class:1"],
      tuningTable["radius_class:2"],
    ];

    for (const def of ARCHETYPES) {
      expect(classes).toContain(def.body.collisionRadius);
    }
  });

  it("put the grunt below the hero's speed and the runner above it", () => {
    expect(meleeGruntDef.movementSpeed).toBeLessThan(tuningTable.base_ms);
    expect(fastRunnerDef.movementSpeed).toBeGreaterThan(tuningTable.base_ms);
  });

  it("leave the archer short of the hero's range, firing a projectile", () => {
    expect(rangedArcherDef.attack.range).toBeLessThan(heroDef.attack.range);
    expect(rangedArcherDef.attack.projectileSpeed).toBeGreaterThan(0);
    expect(rangedArcherDef.behaviour).toBe("ranged_holder");
    expect(rangedArcherDef.atlasFrame).toBe("square_dot");
  });

  it("give the three melee archetypes no projectile and the chasing behaviour", () => {
    for (const def of [meleeGruntDef, fastRunnerDef, tankDef]) {
      expect(def.attack.projectileSpeed).toBe(0);
      expect(def.behaviour).toBe("melee_chaser");
    }
  });

  it("close the arena's corridor to the tank and open it to a grunt", () => {
    expect(tankDef.body.collisionRadius * 2).toBeGreaterThan(CORRIDOR_WIDTH);
    expect(meleeGruntDef.body.collisionRadius * 2).toBeLessThan(CORRIDOR_WIDTH);
  });

  it("make five grunts exactly the first level", () => {
    expect(meleeGruntDef.experience * 5).toBe(heroDef.experienceThresholds[1]);
  });

  it("are normal, can die, cast nothing yet, and differ in colour", () => {
    for (const def of ARCHETYPES) {
      expect(def.tier).toBe("normal");
      expect(def.indestructible).toBe(false);
      expect(def.abilities).toEqual([]);
    }

    expect(new Set(ARCHETYPES.map((def) => def.tint)).size).toBe(
      ARCHETYPES.length,
    );
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

describe("the tier abilities", () => {
  /** The paths of every fault the content tier finds in a registry holding `def` beside the content's. */
  const faultPaths = (def: EnemyDef): string[] =>
    validateRegistry(makeRegistry({ enemies: [...enemies, def] }))
      .filter((fault) => fault.file === "enemies/tiered.def.ts")
      .map((fault) => fault.path);

  it("give the grunt a slam as an elite, and a self-heal, a slam, and a charge as a boss", () => {
    expect(meleeGruntDef.eliteAbility?.id).toBe("slam");
    expect(meleeGruntDef.bossAbilities.map((entry) => entry.id)).toEqual([
      "self_heal",
      "slam",
      "charge",
    ]);
    expect(faultsOf(meleeGruntDef.id)).toEqual([]);
  });

  it("leave every other archetype nothing at either tier yet", () => {
    for (const def of enemies.filter((other) => other !== meleeGruntDef)) {
      expect(def.eliteAbility).toBeNull();
      expect(def.bossAbilities).toEqual([]);
    }
  });

  it("refuse an elite ability naming no ability, at the field itself", () => {
    const def = makeEnemyDef.build({
      id: "tiered",
      eliteAbility: { id: "no_such_ability", condition: { kind: "always" } },
    });

    expect(faultPaths(def)).toEqual(["eliteAbility.id"]);
  });

  it("refuse a boss ability naming no ability, or with a condition that cannot be met, at its index", () => {
    const def = makeEnemyDef.build({
      id: "tiered",
      bossAbilities: [
        { id: "slam", condition: { kind: "always" } },
        { id: "no_such_ability", condition: { kind: "always" } },
        { id: "self_heal", condition: { kind: "health_below", fraction: 1 } },
      ],
    });

    expect(faultPaths(def)).toEqual([
      "bossAbilities[1].id",
      "bossAbilities[2].condition.fraction",
    ]);
  });
});
