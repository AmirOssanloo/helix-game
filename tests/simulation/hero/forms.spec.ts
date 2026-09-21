import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import type { Simulation } from "@simulation/public";
import {
  makeFormDef,
  makeRegistry,
  makeWorld,
  spawnHero,
  submit,
} from "../../helpers";

const first = makeFormDef.build({
  body: { collisionRadius: 27, boundRadius: 24, selectionRadius: 32 },
});
const second = makeFormDef.build({
  body: { collisionRadius: 40, boundRadius: 30, selectionRadius: 50 },
});

/** A world whose hero has two forms, the first active. */
const worldWithTwoForms = (): Simulation =>
  makeWorld({
    seed: 1,
    registry: makeRegistry({
      hero: { ...heroDef, forms: [first.id, second.id] },
      forms: [first, second],
    }),
  });

describe("the hero's forms", () => {
  it("holds one run-scoped record per form, in the hero's order", () => {
    const world = worldWithTwoForms();

    expect(world.view.run.forms.map((form) => form.def.id)).toEqual([
      first.id,
      second.id,
    ]);
  });

  it("wears the first form's body from the moment it is acquired", () => {
    const world = worldWithTwoForms();
    const hero = spawnHero(world);

    expect(hero.activeFormIndex).toBe(0);
    expect(hero.collisionRadius).toBe(27);
    expect(hero.boundRadius).toBe(24);
    expect(hero.selectionRadius).toBe(32);
  });

  it("wears the second body on the tick after the active index swaps, keeping its id, position, and facing", () => {
    const world = worldWithTwoForms();
    const hero = spawnHero(world, { x: 100, y: 50, facing: 1 });
    world.tick();
    const id = world.view.run.heroId;

    hero.activeFormIndex = 1;
    world.tick();

    expect(hero.collisionRadius).toBe(40);
    expect(hero.boundRadius).toBe(30);
    expect(hero.selectionRadius).toBe(50);
    expect(world.view.run.heroId).toBe(id);
    expect(world.state.map.units.resolve(id ?? -1)).toBe(hero);
    expect(hero.curr).toEqual({ x: 100, y: 50 });
    expect(hero.facing).toBe(1);
  });

  it("keeps the hero's order across a swap", () => {
    const world = worldWithTwoForms();
    const hero = spawnHero(world);
    submit(world, {
      kind: "move",
      tick: 0,
      timestamp: 0,
      destination: { x: 1000, y: 0 },
    });
    world.tick();

    hero.activeFormIndex = 1;
    world.tick();

    expect(hero.order.kind).toBe("move");
    expect(hero.state).toBe("moving");
    expect(hero.collisionRadius).toBe(40);
  });

  it("swaps back and wears the first body again", () => {
    const world = worldWithTwoForms();
    const hero = spawnHero(world);
    hero.activeFormIndex = 1;
    world.tick();

    hero.activeFormIndex = 0;
    world.tick();

    expect(hero.collisionRadius).toBe(27);
  });

  it("gives each form its own resources", () => {
    const world = worldWithTwoForms();
    const [one, two] = world.state.run.forms;
    spawnHero(world);

    if (one === undefined || two === undefined) {
      throw new Error("The hero has two form records");
    }

    one.resources.health = 1;
    world.tick();

    expect(one.resources.health).toBe(1);
    expect(two.resources.health).toBe(300);
  });
});
