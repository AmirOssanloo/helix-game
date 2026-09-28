import { describe, expect, it } from "vitest";
import { contentRegistry, heroDef } from "@content/public";
import { applyStatus, createItem, placeItem } from "@domain/rules";
import {
  makeFormDef,
  makeRegistry,
  makeStatusDef,
  makeWorld,
  spawnHero,
  submit,
} from "../../helpers";

/** The factory form's maximum health at level one: 100 base and 10 strength at 20 each. */
const BASE_MAX_HEALTH = 300;

/** What the fixture status adds to maximum health, flat, at every orb level. */
const STATUS_FLAT = 100;

/** What the fixture Legendary helm adds: a flat amount, and a fraction of the whole. */
const ITEM_FLAT = 50;
const ITEM_PERCENT = 0.5;

/** Long enough that the status outlasts the case. */
const STATUS_TICKS = 600;

/** Ticks run with the item worn, to show nothing a tick does takes its totals away. */
const WORN_TICKS = 30;

/** The armory's helm slot. */
const HELM = 0;

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

const cap = contentRegistry.itemBases.find((base) => base.id === "cap");

describe("the door: stats are modifier-driven, so an item is one more source", () => {
  it("changes maximum health through the same pipeline as a status, and takes only its own part when it comes off", () => {
    if (cap === undefined) {
      throw new Error("The content holds the cap");
    }

    const world = makeWorld({
      seed: 1,
      registry: makeRegistry({
        hero: { ...heroDef, forms: [form.id] },
        forms: [form],
        statuses: [fortify],
        legendaries: [
          ...contentRegistry.legendaries,
          {
            id: "bulwark_piece",
            name: "Bulwark",
            baseId: cap.id,
            requirement: 1,
            lines: [
              { stat: "max_health", kind: "flat", value: ITEM_FLAT },
              { stat: "max_health", kind: "percent", value: ITEM_PERCENT },
            ],
          },
        ],
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

    const item = createItem();
    const flat = item.lines[0];
    const percent = item.lines[1];

    if (flat === undefined || percent === undefined) {
      throw new Error("An item holds two lines");
    }

    item.baseId = cap.id;
    item.rarityId = "legendary";
    item.legendaryId = "bulwark_piece";
    item.itemLevel = 1;
    item.lineCount = 2;
    flat.sourceId = "bulwark_piece";
    flat.value = ITEM_FLAT;
    percent.sourceId = "bulwark_piece";
    percent.value = ITEM_PERCENT;
    placeItem(world.state.run.inventory, item, cap.width, cap.height, 0);
    submit(world, {
      kind: "equip_item",
      tick: world.view.tick,
      timestamp: world.view.tick,
      cell: 0,
      armorySlot: null,
    });

    for (let tick = 0; tick < WORN_TICKS; tick += 1) {
      world.tick();
    }

    expect(hero.stats.maxHealth).toBe(675);
    expect(hero.liveModifierRows).toBe(1);

    submit(world, {
      kind: "unequip_item",
      tick: world.view.tick,
      timestamp: world.view.tick,
      armorySlot: HELM,
    });
    world.tick();

    expect(hero.stats.maxHealth).toBe(BASE_MAX_HEALTH + STATUS_FLAT);
    expect(hero.liveModifierRows).toBe(1);
  });
});
