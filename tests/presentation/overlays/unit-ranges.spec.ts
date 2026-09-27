import { describe, expect, it } from "vitest";
import {
  arrangeOverlays,
  OVERLAY_FRAME_WIDTH,
  spawnEnemy,
  unitIdOf,
  visibleQuads,
} from "../../helpers";

const RANGE_FRAME = "ring_thin";

/** Where a grunt the cases spawn stands, and where its leash anchor is moved to. */
const GRUNT_X = -150;
const GRUNT_HOME_X = -400;

describe("the unit ranges", () => {
  it("ring the hero's attack range to a target's edge and its acquire radius, around where it is drawn", () => {
    const arranged = arrangeOverlays();
    const attack = arranged.world.state.run.heroAttack.def;

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.unitRanges = true;
    arranged.sync();

    const rings = visibleQuads(arranged.quads, RANGE_FRAME);
    const diameters = rings.map(
      (ring) => (ring.scale * OVERLAY_FRAME_WIDTH) / 2,
    );

    expect(rings).toHaveLength(2);
    expect(rings.every((ring) => ring.x === 0 && ring.y === 0)).toBe(true);
    expect(diameters[0]).toBeCloseTo(attack.range + arranged.hero.boundRadius);
    expect(diameters[1]).toBeCloseTo(attack.acquireRadius);
  });

  it("ring each enemy's aggro radius around it and its leash radius around its leash anchor, and nothing for a zero radius", () => {
    const arranged = arrangeOverlays();
    const grunt = spawnEnemy(arranged.world, {
      definitionId: "melee_grunt",
      x: GRUNT_X,
      y: 0,
    });
    const dummy = spawnEnemy(arranged.world, {
      definitionId: "training_dummy",
      x: 0,
      y: GRUNT_X,
    });

    grunt.ai.leashAnchor.x = GRUNT_HOME_X;
    arranged.hash.ids = [
      unitIdOf(arranged.world, grunt),
      unitIdOf(arranged.world, dummy),
    ];
    arranged.toggles.unitRanges = true;
    arranged.sync();

    const rings = visibleQuads(arranged.quads, RANGE_FRAME);
    const aggro = rings.find((ring) => ring.x === GRUNT_X);
    const leash = rings.find((ring) => ring.x === GRUNT_HOME_X);

    expect(rings).toHaveLength(2);
    expect(((aggro?.scale ?? 0) * OVERLAY_FRAME_WIDTH) / 2).toBeCloseTo(700);
    expect(((leash?.scale ?? 0) * OVERLAY_FRAME_WIDTH) / 2).toBeCloseTo(1500);
  });
});
