import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type { RegistryFault, SpellDef, StatusDef } from "@domain/public";
import { assertRegistryValid, validateRegistry } from "@domain/public";
import {
  makeEnemyDef,
  makeFormDef,
  makeMapDef,
  makeRegistry,
  makeSpellDef,
  makeStatusDef,
  makeSummonDef,
} from "../helpers";

/** Six entries: one short of the seven orb levels. */
const SHORT_TABLE = [1, 1, 1, 1, 1, 1];

/** The content's spells with `extra` beside them, so the form that lists the ten still resolves and only the fixture is broken. */
const withSpells = (...extra: readonly SpellDef[]): readonly SpellDef[] => [
  ...contentRegistry.spells,
  ...extra,
];

/** The content's statuses with `extra` beside them, so every spell that applies one still resolves. */
const withStatuses = (...extra: readonly StatusDef[]): readonly StatusDef[] => [
  ...contentRegistry.statuses,
  ...extra,
];

/** The one fault a broken fixture is expected to produce, or the test names every fault found. */
const onlyFault = (faults: readonly RegistryFault[]): RegistryFault => {
  const [first] = faults;

  expect(faults, JSON.stringify(faults, null, 2)).toHaveLength(1);

  if (first === undefined) {
    throw new Error("A fault list of length one has a first entry");
  }

  return first;
};

describe("the content registry", () => {
  it("validates with no fault", () => {
    expect(validateRegistry(contentRegistry)).toEqual([]);
  });

  it("is what the composition root boots on without throwing", () => {
    expect(() => {
      assertRegistryValid(contentRegistry);
    }).not.toThrow();
  });
});

describe("a broken definition", () => {
  it("fails on an effect key that resolves to nothing, naming the file and the key", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({
          id: "frost_lance",
          effects: [{ kind: "named", key: "frost_lance_hti", fields: {} }],
        }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("spells/frost-lance.def.ts");
    expect(fault.path).toBe("effects[0].key");
    expect(fault.message).toContain("frost_lance_hti");
  });

  it("fails on a named effect's field that its own schema refuses, naming the field", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({
          id: "frost_lance",
          effects: [
            {
              kind: "named",
              key: "siphon_burn",
              fields: { burn: 100, damagePerMana: 0.5 },
            },
          ],
        }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("spells/frost-lance.def.ts");
    expect(fault.path).toBe("effects[0].fields.burn");
  });

  it("fails on a status id named inside a named effect's own zone entry", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({
          id: "frost_lance",
          effects: [
            {
              kind: "named",
              key: "glacier_place",
              fields: {
                segments: 3,
                spacing: 100,
                distance: 100,
                zone: {
                  kind: "spawn_zone",
                  shape: { kind: "rectangle", length: 100, width: 50 },
                  anchor: "anchor",
                  delaySeconds: 0,
                  lifetime: { kind: "seconds", seconds: 1 },
                  motion: { kind: "still" },
                  onActivate: [],
                  eachTick: [
                    {
                      kind: "apply_status",
                      target: { kind: "zone" },
                      statusId: "frostbite",
                      seconds: 0.5,
                    },
                  ],
                  atlasFrame: "square",
                  tint: 0xffffff,
                },
              },
            },
          ],
        }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("spells/frost-lance.def.ts");
    expect(fault.path).toBe("effects[0].fields.zone.eachTick[0].statusId");
  });

  it("fails on a frame a named effect's own zone entry names that is not in the list", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({
          id: "frost_lance",
          effects: [
            {
              kind: "named",
              key: "glacier_place",
              fields: {
                segments: 3,
                spacing: 100,
                distance: 100,
                zone: {
                  kind: "spawn_zone",
                  shape: { kind: "rectangle", length: 100, width: 50 },
                  anchor: "anchor",
                  delaySeconds: 0,
                  lifetime: { kind: "seconds", seconds: 1 },
                  motion: { kind: "still" },
                  onActivate: [],
                  eachTick: [],
                  atlasFrame: "hexagon",
                  tint: 0xffffff,
                },
              },
            },
          ],
        }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.path).toBe("effects[0].fields.zone.atlasFrame");
  });

  it("fails on a level table of six entries inside a named effect's own zone entry", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({
          id: "frost_lance",
          effects: [
            {
              kind: "named",
              key: "glacier_place",
              fields: {
                segments: 3,
                spacing: 100,
                distance: 100,
                zone: {
                  kind: "spawn_zone",
                  shape: { kind: "rectangle", length: 100, width: 50 },
                  anchor: "anchor",
                  delaySeconds: 0,
                  lifetime: {
                    kind: "seconds",
                    seconds: { orb: "quartz", byLevel: SHORT_TABLE },
                  },
                  motion: { kind: "still" },
                  onActivate: [],
                  eachTick: [],
                  atlasFrame: "square",
                  tint: 0xffffff,
                },
              },
            },
          ],
        }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.path).toBe("effects[0].fields.zone.lifetime.seconds");
  });

  it("fails on a cooldown table of six entries, naming the table", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({ id: "frost_lance", cooldownSeconds: SHORT_TABLE }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("spells/frost-lance.def.ts");
    expect(fault.path).toBe("cooldownSeconds");
    expect(fault.message).toContain("7");
  });

  it("fails on a level table of six entries inside a status modifier", () => {
    const registry = makeRegistry({
      statuses: withStatuses(
        makeStatusDef.build({
          id: "frost",
          modifiers: [
            {
              stat: "movement_speed",
              kind: "percent",
              amount: { orb: "quartz", byLevel: SHORT_TABLE },
            },
          ],
        }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("statuses/frost.def.ts");
    expect(fault.path).toBe("modifiers[0].amount.byLevel");
  });

  it("fails on a frame that is not in the list", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({ id: "frost_lance", atlasFrame: "dsic" }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("spells/frost-lance.def.ts");
    expect(fault.path).toBe("atlasFrame");
    expect(fault.message).toContain("dsic");
  });

  it("fails on a preview frame that is not in the list", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({
          id: "frost_lance",
          preview: { kind: "circle", radius: 100, atlasFrame: "rign_thin" },
        }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.path).toBe("preview.atlasFrame");
  });

  it("fails on two spells sharing an id, naming both files", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({ id: "frost_lance" }),
        makeSpellDef.build({ id: "frost_lance", tint: 0x000000 }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("spells/frost-lance.def.ts");
    expect(fault.path).toBe("id");
    expect(fault.message).toContain("spells/frost-lance.def.ts");
  });

  it("fails on a status id an apply-status entry names that does not exist", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({
          id: "frost_lance",
          effects: [
            {
              kind: "apply_status",
              target: { kind: "target" },
              statusId: "frostbite",
              seconds: 2,
            },
          ],
        }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.path).toBe("effects[0].statusId");
    expect(fault.message).toContain("frostbite");
  });

  it("fails on a status id named inside a zone's each-tick list", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({
          id: "frost_lance",
          effects: [
            {
              kind: "spawn_zone",
              shape: { kind: "circle", radius: 100 },
              anchor: "anchor",
              delaySeconds: 0,
              lifetime: { kind: "seconds", seconds: 1 },
              motion: { kind: "still" },
              onActivate: [],
              eachTick: [
                {
                  kind: "apply_status",
                  target: { kind: "zone" },
                  statusId: "frostbite",
                  seconds: 0.5,
                },
              ],
              atlasFrame: "ring_thin",
              tint: 0xffffff,
            },
          ],
        }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.path).toBe("effects[0].eachTick[0].statusId");
  });

  it("fails on a per-second damage rate outside a zone's each-tick list", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({
          id: "frost_lance",
          effects: [
            {
              kind: "damage_area",
              target: { kind: "target" },
              damageType: "magical",
              amount: { orb: "quartz", byLevel: [1, 2, 3, 4, 5, 6, 7] },
              rate: "per_second",
              split: false,
            },
          ],
        }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.path).toBe("effects[0].rate");
  });

  it("fails on a summon id a spawn-unit entry names that does not exist", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({
          id: "frost_lance",
          effects: [
            {
              kind: "spawn_unit",
              summonId: "frost_wisp",
              count: 1,
              offset: { forward: 0, right: 80 },
              lifetimeSeconds: {
                orb: "quartz",
                byLevel: [1, 1, 1, 1, 1, 1, 1],
              },
              bonuses: [],
            },
          ],
        }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.path).toBe("effects[0].summonId");
    expect(fault.message).toContain("frost_wisp");
  });

  it("fails on a behaviour key that resolves to nothing", () => {
    const registry = makeRegistry({
      enemies: [makeEnemyDef.build({ id: "grunt", behaviour: "stationery" })],
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("enemies/grunt.def.ts");
    expect(fault.path).toBe("behaviour");
    expect(fault.message).toContain("stationery");
  });

  it("fails on an enemy and a summon sharing an id", () => {
    const registry = makeRegistry({
      enemies: [makeEnemyDef.build({ id: "wisp" })],
      summons: [makeSummonDef.build({ id: "wisp" })],
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("summons/wisp.def.ts");
    expect(fault.path).toBe("id");
  });

  it("fails on a map spawn naming an archetype that does not exist", () => {
    const registry = makeRegistry({
      maps: [
        makeMapDef.build({
          id: "pit",
          spawns: [
            { archetypeId: "grunt", position: { x: 0, y: 0 }, packId: 0 },
          ],
        }),
      ],
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("maps/pit.def.ts");
    expect(fault.path).toBe("spawns[0].archetypeId");
  });

  it("fails on a form naming an ability that does not exist", () => {
    const registry = makeRegistry({
      forms: [
        makeFormDef.build({
          id: "skein",
          abilities: ["hoarfrost", "frost_lance"],
        }),
      ],
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("forms/skein.def.ts");
    expect(fault.path).toBe("abilities[1]");
  });

  it("fails on a field the schema does not know, naming it", () => {
    const registry = makeRegistry({
      spells: withSpells({
        ...makeSpellDef.build({ id: "frost_lance" }),
        cooldown: 3,
      } as never),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.path).toBe("cooldown");
    expect(fault.message).toBe("unknown field");
  });

  it("fails on a tint outside three bytes", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({ id: "frost_lance", tint: 0x1000000 }),
      ),
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.path).toBe("tint");
  });

  it("fails on an experience table shorter than the level cap", () => {
    const registry = makeRegistry({
      hero: { ...contentRegistry.hero, experienceThresholds: [0, 100] },
    });

    const fault = onlyFault(validateRegistry(registry));

    expect(fault.file).toBe("hero.ts");
    expect(fault.path).toBe("experienceThresholds");
  });

  it("throws from the assertion with every fault in the message", () => {
    const registry = makeRegistry({
      spells: withSpells(
        makeSpellDef.build({ id: "frost_lance", atlasFrame: "dsic" }),
        makeSpellDef.build({ id: "frost_bolt", cooldownSeconds: SHORT_TABLE }),
      ),
    });

    const boot = (): void => {
      assertRegistryValid(registry);
    };

    expect(boot).toThrow("2 fault(s)");
    expect(boot).toThrow("spells/frost-lance.def.ts: atlasFrame");
    expect(boot).toThrow("spells/frost-bolt.def.ts: cooldownSeconds");
  });
});
