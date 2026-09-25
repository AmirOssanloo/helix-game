import { describe, expect, it } from "vitest";
import { heroDef } from "@content/public";
import { addModifier, applyStatus, removeModifiers } from "@domain/public";
import {
  makeFormDef,
  makeRegistry,
  makeStatusDef,
  makeWorld,
  spawnHero,
} from "../../helpers";

/** The factory form's maximum health at level one: 100 base and 10 strength at 20 each. */
const BASE_MAX_HEALTH = 300;

/** What the fixture status adds to maximum health, flat, at every orb level. */
const STATUS_FLAT = 100;

/** What the fixture item adds: a flat amount, and a fraction of the whole. */
const ITEM_FLAT = 50;
const ITEM_PERCENT = 0.5;

/** Long enough that the status outlasts the case. */
const STATUS_TICKS = 600;

/** Ticks run with the item worn, to show nothing a tick does takes its row away. */
const WORN_TICKS = 30;

const form = makeFormDef.build({ abilities: [] });

const fortify = makeStatusDef.build({
  id: "fortify",
  modifiers: [
    {
      stat: "max_health",
      kind: "flat",
      amount: { orb: "quartz", byLevel: [STATUS_FLAT] },
    },
  ],
});

describe("the door: stats are modifier-driven, so an item is one more source", () => {
  it("changes maximum health through the same stack as a status, and takes only its own rows when it leaves", () => {
    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({
        hero: { ...heroDef, forms: [form.id] },
        forms: [form],
        statuses: [fortify],
      }),
    });
    const hero = spawnHero(world);
    const heroId = world.view.run.heroId;

    if (heroId === null) {
      throw new Error("The world names its hero");
    }

    applyStatus(world.state, heroId, fortify.id, STATUS_TICKS, null, [1, 1, 1]);
    world.tick();

    expect(hero.stats.maxHealth).toBe(BASE_MAX_HEALTH + STATUS_FLAT);

    addModifier(hero.modifiers, "item", "max_health", ITEM_FLAT, 0);
    addModifier(hero.modifiers, "item", "max_health", 0, ITEM_PERCENT);

    for (let tick = 0; tick < WORN_TICKS; tick += 1) {
      world.tick();
    }

    expect(hero.stats.maxHealth).toBe(675);

    removeModifiers(hero.modifiers, "item");
    world.tick();

    expect(hero.stats.maxHealth).toBe(BASE_MAX_HEALTH + STATUS_FLAT);
  });
});
