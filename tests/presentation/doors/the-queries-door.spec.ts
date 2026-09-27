import { describe, expect, expectTypeOf, it } from "vitest";
import type { KitSlots } from "@domain/public";
import * as types from "@domain/public";
import * as queries from "@domain/queries";
import { behaviourKindOf, resolveKitSlots } from "@domain/queries";
import * as rules from "@domain/rules";

/**
 * Reaches for mutators through the doors the presentation and the panel may import. Never
 * run: each line only has to fail to compile, and its `@ts-expect-error` fails the typecheck
 * if it ever does.
 */
export const reachForAMutator = (): void => {
  // @ts-expect-error A mutator is behind the rules door, not the queries door.
  queries.spendMana();
  // @ts-expect-error The types door carries no value at all.
  types.spendMana();
};

describe("the domain's doors past the simulation", () => {
  it("the types door carries no value", () => {
    expect(Object.keys(types)).toEqual([]);
  });

  it("the queries door shares no name with the rules door", () => {
    const ruleNames = new Set(Object.keys(rules));

    expect(Object.keys(queries).filter((name) => ruleNames.has(name))).toEqual(
      [],
    );
  });

  it("the queries door holds no mutator, system, or behaviour", () => {
    expect(Object.keys(queries)).not.toContain("spendMana");
    expect(Object.keys(queries)).not.toContain("addModifier");
    expect(Object.keys(queries)).not.toContain("resolveBehaviour");
    expect(Object.keys(queries)).not.toContain("resolveKit");
    expect(
      Object.keys(queries).filter((name) => name.endsWith("System")),
    ).toEqual([]);
  });

  it("a behaviour is read by its kind alone", () => {
    expect(behaviourKindOf("melee_chaser")).toBe("machine");
    expect(behaviourKindOf("no_such_behaviour")).toBeNull();
  });

  it("a kit is read by its slots alone, never its passives", () => {
    const kit = resolveKitSlots("invoke");

    expect(kit?.key).toBe("invoke");
    expect(resolveKitSlots("no_such_kit")).toBeNull();
    expectTypeOf<KitSlots>().not.toHaveProperty("refreshPassives");
  });
});
