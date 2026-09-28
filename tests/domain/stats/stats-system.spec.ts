import { describe, expect, it } from "vitest";
import { meleeGruntDef } from "@content/public";
import type { DefinitionKey } from "@domain/public";
import { addModifier, removeModifiers, statsSystem } from "@domain/rules";
import type { Simulation } from "@simulation/testing";
import { makeRegistry, makeWorld, spawnEnemy, submit } from "../../helpers";

/** Where the spec stands its grunts: apart, with no hero to aggro on. */
const HERE = { x: 0, y: 0 };
const THERE = { x: 400, y: 0 };

/** An armour shred and a magic resistance a row adds, and the fraction of health a row takes away. */
const SHRED = -2;
const RESIST = 0.25;
const HEALTH_CUT = -0.5;

/** More than a grunt regenerates in the tick the spec reads it on, and less than a fill. */
const A_TICK_OF_REGENERATION = 1;

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
