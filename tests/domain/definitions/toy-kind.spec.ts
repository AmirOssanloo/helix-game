import { describe, expect, it } from "vitest";
import { contentRegistry } from "@content/public";
import type {
  AnyKind,
  DefinitionKey,
  ListKind,
  Registry,
  RunScope,
} from "@domain/public";
import { readTunable } from "@domain/queries";
import {
  checkReference,
  copyTunableDefinitionsOf,
  createDefinitionSlotsOf,
  createTuningState,
  DEFINITION_KINDS,
  idSchema,
  numberSchema,
  objectOf,
  setDefinitionTunable,
  validateRegistry,
  validateRegistryOf,
} from "@domain/rules";
import { makeWorld } from "../../helpers";

/** A definition of a kind the game does not have: a number to tune and a status it names. */
type ToyDef = Readonly<{ id: string; strength: number; statusId: string }>;

/** What each rebuild the toy kind was asked for received, in order. */
type Rebuilt = Readonly<{ id: string; strength: number; simHz: number }>;

/**
 * The toy kind's descriptor, written as a real kind's file writes one, with its rebuild handing
 * each call to `rebuilt` so a test can see it.
 */
const toyKindOf = (rebuilt: Rebuilt[]): ListKind<"toys", ToyDef, "toy"> => ({
  field: "toys",
  shape: "list",
  folder: "toys",
  namespace: "a toy",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: () =>
    objectOf<ToyDef>({
      id: idSchema,
      strength: numberSchema,
      statusId: idSchema,
    }),
  check: (context, file, def): void => {
    checkReference(
      context,
      file,
      "statusId",
      def.statusId,
      context.space("status", ["statuses"]),
    );
  },
  tuning: {
    kind: "toy",
    title: "Toys",
    rebuild: (_run, id, def, simHz): void => {
      rebuilt.push({ id, strength: def.strength, simHz });
    },
  },
});

/** The kind list with the toy kind as its last line, as a real kind is added. */
const kindsWith = (rebuilt: Rebuilt[]): readonly AnyKind[] => [
  ...DEFINITION_KINDS,
  toyKindOf(rebuilt),
];

/** A status the content holds, for the toy to name. */
const STATUS_ID = contentRegistry.statuses[0]?.id ?? "";

/** A sound toy. */
const TOY: ToyDef = { id: "toy_one", strength: 3, statusId: STATUS_ID };

/** The content registry with a toys field holding `toys`. */
const registryWith = (
  toys: readonly unknown[],
): Registry & Readonly<Record<string, unknown>> => ({
  ...contentRegistry,
  toys,
});

describe("a toy definition kind added by a descriptor and a line in the list", () => {
  it("validates a sound toy with no fault, and the real list is unchanged by it", () => {
    expect(validateRegistryOf(kindsWith([]), registryWith([TOY]))).toEqual([]);
    expect(validateRegistry(contentRegistry)).toEqual([]);
  });

  it("refuses a toy whose shape fails its schema, under the toy's own file", () => {
    expect(
      validateRegistryOf(
        kindsWith([]),
        registryWith([{ ...TOY, strength: "strong" }]),
      ),
    ).toEqual([
      {
        file: "toys/toy-one.def.ts",
        path: "strength",
        message: "expected a finite number",
      },
    ]);
  });

  it("refuses a toy naming a status that does not exist", () => {
    expect(
      validateRegistryOf(
        kindsWith([]),
        registryWith([{ ...TOY, statusId: "no_such_status" }]),
      ),
    ).toEqual([
      {
        file: "toys/toy-one.def.ts",
        path: "statusId",
        message: '"no_such_status" is not the id of any status',
      },
    ]);
  });

  it("refuses two toys sharing an id, in the toy namespace", () => {
    expect(validateRegistryOf(kindsWith([]), registryWith([TOY, TOY]))).toEqual(
      [
        {
          file: "toys/toy-one.def.ts",
          path: "id",
          message:
            '"toy_one" is already the id of a toy in toys/toy-one.def.ts',
        },
      ],
    );
  });

  it("reaches the world's definition copies and tuning slots, and a tuning command rebuilds it", () => {
    const rebuilt: Rebuilt[] = [];
    const kinds = kindsWith(rebuilt);
    const registry = registryWith([TOY]);
    const copies = copyTunableDefinitionsOf(kinds, registry);
    const tuning = createTuningState(registry.tuning);
    const slots = createDefinitionSlotsOf(kinds, copies, tuning);
    // The real route adds the toy's word to the kinds a key may name by type; a list built in a test cannot.
    const key = "def:toy:toy_one:strength" as DefinitionKey;
    const simHz = readTunable(tuning, "sim_hz");

    expect(copies["toys"]).toEqual([TOY]);
    expect(copies["toys"]).not.toBe(registry["toys"]);
    expect(tuning.get(key)).toBe(TOY.strength);
    expect(slots.has(key)).toBe(true);

    const world = makeWorld({ seed: 1 });
    const run: RunScope = {
      ...world.state.run,
      tuning,
      definitionSlots: slots,
    };

    setDefinitionTunable(run, key, 7);

    expect(copies["toys"]).toEqual([{ ...TOY, strength: 7 }]);
    expect(TOY.strength).toBe(3);
    expect(tuning.get(key)).toBe(7);
    expect(rebuilt).toEqual([{ id: "toy_one", strength: 7, simHz }]);
  });
});
