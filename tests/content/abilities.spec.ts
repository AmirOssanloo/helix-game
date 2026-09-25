import { describe, expect, it } from "vitest";
import {
  abilities as contentAbilities,
  contentRegistry,
  enemies,
  tuningTable,
} from "@content/public";
import type {
  AbilityDef,
  EnemyDef,
  RegistryFault,
  TargetingKind,
} from "@domain/public";
import {
  createSpellTable,
  createTuningState,
  ID_SHAPE,
  validateRegistry,
} from "@domain/public";
import {
  always,
  FROST_VOLLEY,
  makeAbilityDef,
  makeEnemyDef,
  makeRegistry,
  makeSpellDef,
} from "../helpers";

/** The content layer's abilities, read as the registry reads them. */
const abilities: readonly AbilityDef[] = contentAbilities;

/** The content layer's archetypes, read as the registry reads them. */
const archetypes: readonly EnemyDef[] = enemies;

/** The targeting kinds an enemy's behaviour can aim: its target, the point it stands on, or itself. */
const SUPPLIED_KINDS: readonly TargetingKind[] = ["unit", "point", "none"];

/** An enemy that casts the runbook's volley, for the registries below. */
const FROST_ARCHER = makeEnemyDef.build({
  id: "frost_archer",
  abilities: [always(FROST_VOLLEY.id)],
});

const onlyFault = (faults: readonly RegistryFault[]): RegistryFault => {
  const [first] = faults;

  expect(faults, JSON.stringify(faults, null, 2)).toHaveLength(1);

  if (first === undefined) {
    throw new Error("A fault list of length one has a first entry");
  }

  return first;
};

describe("the enemy abilities", () => {
  it("validate with the rest of the content registry", () => {
    const faults = validateRegistry(contentRegistry).filter((fault) =>
      fault.file.startsWith("abilities/"),
    );

    expect(faults).toEqual([]);
  });

  it("are each named by snake_case id and listed once", () => {
    for (const ability of abilities) {
      expect(ability.id).toMatch(ID_SHAPE);
    }

    expect(new Set(abilities.map((ability) => ability.id)).size).toBe(
      abilities.length,
    );
  });

  it("are each aimed at a kind an enemy's behaviour can supply", () => {
    for (const ability of abilities) {
      expect(SUPPLIED_KINDS, ability.id).toContain(ability.targeting);
    }
  });

  it("name only abilities the registry holds, from every archetype", () => {
    const held = new Set(abilities.map((ability) => ability.id));

    for (const def of archetypes) {
      for (const entry of def.abilities) {
        expect(held.has(entry.id), `${def.id} names ${entry.id}`).toBe(true);
      }
    }
  });
});

describe("an enemy ability", () => {
  it("validates as a spell does, without a recipe: the runbook's volley passes", () => {
    const registry = makeRegistry({
      abilities: [FROST_VOLLEY],
      enemies: [FROST_ARCHER],
    });

    expect(validateRegistry(registry)).toEqual([]);
  });

  it("is refused with a recipe, which only the hero's spells carry", () => {
    const registry = makeRegistry({
      abilities: [
        ...contentRegistry.abilities,
        { ...FROST_VOLLEY, recipe: ["quartz", "quartz", "quartz"] } as never,
      ],
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("abilities/frost-volley.def.ts");
    expect(fault.path).toBe("recipe");
  });

  it("is refused with a table shorter than the orb cap, as a spell is", () => {
    const registry = makeRegistry({
      abilities: [
        ...contentRegistry.abilities,
        { ...FROST_VOLLEY, cooldownSeconds: [6, 6] },
      ],
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("abilities/frost-volley.def.ts");
    expect(fault.path).toBe("cooldownSeconds");
  });

  it("is refused when it names a status the registry does not hold", () => {
    const registry = makeRegistry({
      abilities: [
        {
          ...FROST_VOLLEY,
          effects: [
            {
              kind: "apply_status",
              target: { kind: "target" },
              statusId: "frostbite",
              seconds: 2,
            },
          ],
        },
      ],
      enemies: [FROST_ARCHER],
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("abilities/frost-volley.def.ts");
    expect(fault.path).toBe("effects[0].statusId");
  });

  it("shares the spells' id space: one named as a spell is refused", () => {
    const registry = makeRegistry({
      spells: [
        ...contentRegistry.spells,
        makeSpellDef.build({
          id: FROST_VOLLEY.id,
          recipe: ["ember", "ember", "ember"],
        }),
      ],
      abilities: [FROST_VOLLEY],
      enemies: [FROST_ARCHER],
    });

    const faults = validateRegistry(registry);

    expect(
      faults.some((fault) => fault.message.includes(FROST_VOLLEY.id)),
      JSON.stringify(faults, null, 2),
    ).toBe(true);
  });

  it("is refused when an archetype names one that does not exist", () => {
    const registry = makeRegistry({
      abilities: [makeAbilityDef.build({ id: "frost_nova" })],
      enemies: [FROST_ARCHER],
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("enemies/frost-archer.def.ts");
    expect(fault.path).toBe("abilities[0].id");
  });

  it.each([0, 1, -0.5, 1.5, Number.NaN])(
    "is refused when an entry's health fraction is %s, outside the open range from 0 to 1",
    (fraction) => {
      const registry = makeRegistry({
        abilities: [FROST_VOLLEY],
        enemies: [
          makeEnemyDef.build({
            id: "frost_archer",
            abilities: [
              {
                id: FROST_VOLLEY.id,
                condition: { kind: "health_below", fraction },
              },
            ],
          }),
        ],
      });

      const fault = onlyFault(validateRegistry(registry));

      expect(fault.file).toBe("enemies/frost-archer.def.ts");
      expect(fault.path).toBe("abilities[0].condition.fraction");
    },
  );

  it.each([0, -100, Number.POSITIVE_INFINITY])(
    "is refused when an entry's target distance is %s, not a distance greater than 0",
    (distance) => {
      const registry = makeRegistry({
        abilities: [FROST_VOLLEY],
        enemies: [
          makeEnemyDef.build({
            id: "frost_archer",
            abilities: [
              {
                id: FROST_VOLLEY.id,
                condition: { kind: "target_within", distance },
              },
            ],
          }),
        ],
      });

      const fault = onlyFault(validateRegistry(registry));

      expect(fault.file).toBe("enemies/frost-archer.def.ts");
      expect(fault.path).toBe("abilities[0].condition.distance");
    },
  );

  it("passes an entry of each condition kind whose number can be met", () => {
    const registry = makeRegistry({
      abilities: [FROST_VOLLEY],
      enemies: [
        makeEnemyDef.build({
          id: "frost_archer",
          abilities: [
            always(FROST_VOLLEY.id),
            {
              id: FROST_VOLLEY.id,
              condition: { kind: "health_below", fraction: 0.5 },
            },
            {
              id: FROST_VOLLEY.id,
              condition: { kind: "target_within", distance: 250 },
            },
          ],
        }),
      ],
    });

    expect(validateRegistry(registry)).toEqual([]);
  });

  it("is held by run scope beside the spells, at the first level, with its seconds in ticks", () => {
    const tuning = createTuningState(tuningTable);
    const table = createSpellTable(
      contentRegistry.spells,
      [FROST_VOLLEY],
      tuning,
    );
    const record = table.get(FROST_VOLLEY.id);
    const simHz = tuningTable.sim_hz;

    expect(record?.def.recipe).toEqual([]);
    expect(record?.castPointTicks).toBe(
      Math.round(FROST_VOLLEY.castPointSeconds * simHz),
    );
    expect(record?.backswingTicks).toBe(
      Math.round(FROST_VOLLEY.backswingSeconds * simHz),
    );
    expect(record?.cooldownTicks).toEqual(
      FROST_VOLLEY.cooldownSeconds.map((seconds) =>
        Math.round(seconds * simHz),
      ),
    );
    expect(table.size).toBe(contentRegistry.spells.length + 1);
  });
});
