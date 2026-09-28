import { GCProfiler } from "node:v8";
import { describe, expect, it } from "vitest";
import { meleeGruntDef } from "@content/public";
import type { DefinitionKey } from "@domain/public";
import {
  addModifier,
  addToTotals,
  removeModifiers,
  statsSystem,
} from "@domain/rules";
import type { Simulation } from "@simulation/testing";
import {
  makeRegistry,
  makeWorld,
  spawnEnemy,
  spawnHero,
  submit,
} from "../../helpers";

/** Where the spec stands its grunts: apart, with no hero to aggro on. */
const HERE = { x: 0, y: 0 };
const THERE = { x: 400, y: 0 };

/** An armour shred and a magic resistance a row adds, and the fraction of health a row takes away. */
const SHRED = -2;
const RESIST = 0.25;
const HEALTH_CUT = -0.5;

/** More than a grunt regenerates in the tick the spec reads it on, and less than a fill. */
const A_TICK_OF_REGENERATION = 1;

/** Enemies with a live row, as a crowded screen holds them. */
const ENEMIES_WITH_ROWS = 200;

/**
 * Calls made before the heap is watched, and calls made while it is. The hero's part of the
 * system runs once a call, and the engine optimises code run that rarely only after about
 * eleven thousand calls; until then every fractional number it computes is boxed. The
 * allowance is under one boxed number a call over the measured calls.
 */
const WARM_UP_CALLS = 15_000;
const MEASURED_CALLS = 4_000;
const HEAP_ALLOWANCE_BYTES = 64 * 1024;

/** Room for the warm-up on a loaded machine. */
const STEADY_STATE_TIMEOUT_MS = 120_000;

const GRUNT_HEALTH: DefinitionKey = `def:enemy:${meleeGruntDef.id}:health`;

const arrange = (): Simulation =>
  makeWorld({
    seed: 1,
    registry: makeRegistry({ tuning: { wander_radius: 0 } }),
  });

const grunt = (world: Simulation, at = HERE) =>
  spawnEnemy(world, { definitionId: meleeGruntDef.id, ...at });

describe("statsSystem over an enemy", () => {
  it("moves its armour and magic resistance on the tick a row is added, and restores them on the tick it is removed", () => {
    const world = arrange();
    const unit = grunt(world);

    world.tick();
    addModifier(unit, "summon", "armour", SHRED, 0);
    addModifier(unit, "summon", "magic_resistance", RESIST, 0);
    world.tick();

    expect(unit.stats.armour).toBe(meleeGruntDef.armour + SHRED);
    expect(unit.stats.magicResistance).toBe(
      meleeGruntDef.magicResistance + RESIST,
    );

    removeModifiers(unit, "summon");
    world.tick();

    expect(unit.liveModifierRows).toBe(0);
    expect(unit.stats.armour).toBe(meleeGruntDef.armour);
    expect(unit.stats.magicResistance).toBe(meleeGruntDef.magicResistance);
  });

  it("holds health under a maximum that falls, and does not fill it when the maximum returns", () => {
    const world = arrange();
    const unit = grunt(world);
    const cut = meleeGruntDef.health * (1 + HEALTH_CUT);

    addModifier(unit, "summon", "max_health", 0, HEALTH_CUT);
    world.tick();

    expect(unit.stats.maxHealth).toBe(cut);
    expect(unit.resources.health).toBe(cut);

    removeModifiers(unit, "summon");
    world.tick();

    expect(unit.stats.maxHealth).toBe(meleeGruntDef.health);
    expect(unit.resources.health).toBeLessThan(cut + A_TICK_OF_REGENERATION);
  });

  it("gives a unit spawned after the system has run its derived maximums at once", () => {
    const world = arrange();

    world.tick();
    statsSystem(world.state);

    const unit = grunt(world);

    expect(unit.stats.maxHealth).toBe(meleeGruntDef.health);
    expect(unit.stats.armour).toBe(meleeGruntDef.armour);
    expect(unit.resources.health).toBe(meleeGruntDef.health);
  });

  it("leaves a standing unit as it was when its archetype's health is retuned, and gives the next one the new health", () => {
    const world = arrange();
    const before = grunt(world);
    const retuned = meleeGruntDef.health * 2;

    submit(world, {
      kind: "set_tuning",
      tick: world.view.tick,
      timestamp: world.view.tick,
      key: GRUNT_HEALTH,
      value: retuned,
    });
    world.tick();

    const after = grunt(world, THERE);

    world.tick();

    expect(before.stats.maxHealth).toBe(meleeGruntDef.health);
    expect(after.stats.maxHealth).toBe(retuned);
  });
});

describe("statsSystem in steady state", () => {
  it(
    "allocates nothing over a warm world with statuses, orbs, and worn items on the hero and rows on its enemies",
    () => {
      const world = arrange();
      const hero = spawnHero(world);
      const state = world.state;
      const armory = state.run.forms[0]?.armory;

      if (armory === undefined) {
        throw new Error("The hero has a form");
      }

      addModifier(hero, "status", "max_health", 0, 0.1);
      addModifier(hero, "orb", "health_regen", 0.03, 0.07);
      addModifier(hero, "orb", "attack_speed", 5, 0);
      addToTotals(armory.totals, "armour", 3.5, 0.15);
      addToTotals(armory.totals, "mana_regen", 0.05, 0);

      for (let index = 0; index < ENEMIES_WITH_ROWS; index += 1) {
        const unit = grunt(world, {
          x: (index % 20) * 64,
          y: 64 + Math.floor(index / 20) * 64,
        });

        addModifier(unit, "status", "armour", SHRED, 0.05);
        addModifier(unit, "summon", "magic_resistance", RESIST, 0);
      }

      world.tick();

      for (let call = 0; call < WARM_UP_CALLS; call += 1) {
        statsSystem(state);
      }

      const profiler = new GCProfiler();

      profiler.start();

      const before = process.memoryUsage().heapUsed;

      for (let call = 0; call < MEASURED_CALLS; call += 1) {
        statsSystem(state);
      }

      const after = process.memoryUsage().heapUsed;
      const collections = profiler.stop().statistics.length;

      expect(hero.stats.armour).toBeGreaterThan(0);
      expect(collections).toBe(0);
      expect(after - before).toBeLessThan(HEAP_ALLOWANCE_BYTES);
    },
    STEADY_STATE_TIMEOUT_MS,
  );
});
