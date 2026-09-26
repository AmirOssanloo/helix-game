import { describe, expect, it } from "vitest";
import {
  abilities,
  atlasFrames,
  bruteDef,
  contentRegistry,
  crusherDef,
  enemies,
  fastRunnerDef,
  frostRaiderDef,
  heroDef,
  hexerDef,
  impDef,
  lancerDef,
  meleeGruntDef,
  rangedArcherDef,
  skeinDef,
  skirmisherDef,
  summonerDef,
  tankDef,
  trainingDummyDef,
  trapperDef,
  trollDef,
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

  it("leave the runner, the archer, the tank, the dummy, and the imp nothing at either tier", () => {
    for (const def of [
      fastRunnerDef,
      rangedArcherDef,
      tankDef,
      trainingDummyDef,
      impDef,
    ]) {
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

/** The nine archetypes of the long roster, in the catalogue's order. */
const ROSTER: readonly EnemyDef[] = [
  bruteDef,
  frostRaiderDef,
  hexerDef,
  trapperDef,
  skirmisherDef,
  crusherDef,
  summonerDef,
  lancerDef,
  trollDef,
];

/** The roster archetypes that fight from range, drawn with the dot, and those that close to contact. */
const RANGED: readonly EnemyDef[] = [
  hexerDef,
  trapperDef,
  skirmisherDef,
  summonerDef,
];
const MELEE: readonly EnemyDef[] = [
  bruteDef,
  frostRaiderDef,
  crusherDef,
  lancerDef,
  trollDef,
];

/** The two statuses an archetype carries for what it does on every hit. */
const ON_HIT_STATUSES = ["bash", "frost_attack"];

/** Every id an entry list names. */
const idsOf = (entries: readonly { id: string }[]): string[] =>
  entries.map((entry) => entry.id);

describe("the long roster", () => {
  it.each(ROSTER.map((def) => [def.id, def] as const))(
    "%s is in the registry and validates",
    (_id, def) => {
      expect(enemies).toContain(def);
      expect(faultsOf(def.id)).toEqual([]);
    },
  );

  it.each(ROSTER.map((def) => [def.id, def] as const))(
    "%s writes every field the dummy writes, and no other",
    (_id, def) => {
      expect(shapeOf(def)).toEqual(shapeOf(trainingDummyDef));
    },
  );

  it("is every archetype but the four, the dummy, and the imp", () => {
    expect(idsOf(ROSTER).sort()).toEqual(
      idsOf(
        enemies.filter(
          (def) =>
            !ARCHETYPES.includes(def) &&
            def !== trainingDummyDef &&
            def !== impDef,
        ),
      ).sort(),
    );
  });

  it("is normal, can die, and grants experience", () => {
    for (const def of ROSTER) {
      expect(def.tier).toBe("normal");
      expect(def.indestructible).toBe(false);
      expect(def.experience).toBeGreaterThan(0);
    }
  });

  it("gives every archetype in the game its own colour", () => {
    expect(new Set(enemies.map((def) => def.tint)).size).toBe(enemies.length);
  });

  it("meets every enemy ability and both on-hit statuses in some archetype's own list", () => {
    const own = ROSTER.flatMap((def) => [
      ...idsOf(def.abilities),
      ...def.statuses,
    ]);

    for (const id of [...abilities.map((def) => def.id), ...ON_HIT_STATUSES]) {
      expect(own).toContain(id);
    }
  });

  it("gives every archetype an elite ability and boss abilities it does not already cast", () => {
    for (const def of ROSTER) {
      const own = idsOf(def.abilities);

      expect(def.eliteAbility).not.toBeNull();
      expect(own).not.toContain(def.eliteAbility?.id);
      expect(def.bossAbilities.length).toBeGreaterThan(0);

      for (const id of idsOf(def.bossAbilities)) {
        expect(own).not.toContain(id);
      }
    }
  });

  it("fires a projectile short of the hero's range from the dotted square, and closes to contact with the plain one", () => {
    expect(idsOf([...RANGED, ...MELEE]).sort()).toEqual(idsOf(ROSTER).sort());

    for (const def of RANGED) {
      expect(def.attack.projectileSpeed).toBeGreaterThan(0);
      expect(def.attack.range).toBeLessThan(heroDef.attack.range);
      expect(def.atlasFrame).toBe("square_dot");
    }

    for (const def of MELEE) {
      expect(def.attack.projectileSpeed).toBe(0);
      expect(def.atlasFrame).toBe("square");
    }
  });

  it("closes the arena's corridor to the crusher alone", () => {
    for (const def of ROSTER) {
      expect(def.body.collisionRadius * 2 > CORRIDOR_WIDTH).toBe(
        def === crusherDef,
      );
    }
  });
});

/**
 * How much wider than it is drawn an enemy's body is, as its collision radius over its bound
 * radius, the drawn size: at least the medium class's 32 over 24, the widest a body drawn at
 * 24 can be and still path through the arena's 96-unit corridor on cells of 32, and at most
 * half as wide again.
 */
const NARROWEST_BODY_SHARE = 32 / 24;
const WIDEST_BODY_SHARE = 1.5;

/** Every enemy that swings in melee: no projectile and some reach, so not the dummy. */
const SWINGING = enemies.filter(
  (def) => def.attack.projectileSpeed === 0 && def.attack.range > 0,
);

describe("every enemy's body", () => {
  it.each(enemies.map((def) => [def.id, def] as const))(
    "%s is wider than it is drawn, by a third to a half of its drawn radius, so two side by side part before their shapes touch",
    (_id, def) => {
      const share = def.body.collisionRadius / def.body.boundRadius;

      expect(share).toBeGreaterThanOrEqual(NARROWEST_BODY_SHARE);
      expect(share).toBeLessThanOrEqual(WIDEST_BODY_SHARE);
    },
  );

  it("stands on one of the three radius classes pathing plans for", () => {
    const classes = [
      tuningTable["radius_class:0"],
      tuningTable["radius_class:1"],
      tuningTable["radius_class:2"],
    ];

    for (const def of enemies) {
      expect(classes).toContain(def.body.collisionRadius);
    }
  });

  it.each(SWINGING.map((def) => [def.id, def] as const))(
    "%s pressed against the hero's body is inside its reach",
    (_id, def) => {
      const contact = skeinDef.body.collisionRadius + def.body.collisionRadius;
      const reach =
        def.attack.range + skeinDef.body.boundRadius + def.body.boundRadius;

      expect(contact).toBeLessThanOrEqual(reach);
    },
  );
});

describe("every fighting archetype", () => {
  it.each(
    [...ARCHETYPES, ...ROSTER, impDef].map((def) => [def.id, def] as const),
  )("%s is slower than the hero, so walking away from it works", (_id, def) => {
    expect(def.movementSpeed).toBeLessThan(tuningTable.base_ms);
  });
});
