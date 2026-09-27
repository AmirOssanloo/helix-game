import { describe, expect, it } from "vitest";
import { acquireUnit, applyDamage } from "@domain/rules";
import { Projection } from "@presentation/public";
import type { Vec2 } from "@shared/public";
import {
  arrangeOverlays,
  spawnEnemy,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** The tuning table's collision radius, which the hero wears. */
const HERO_COLLISION_RADIUS = 27;

/** Where a body the cases spawn stands, and how far off a grunt the labels case spawns stands. */
const GRUNT_X = -150;
const GRUNT_FAR_X = 1000;

/** Far enough past any leash that a grunt whose leash anchor moves this far is past its own. */
const BEYOND_LEASH = 4000;

/** How long a labels case waits for a state before it fails with a count. */
const MAX_TICKS = 900;

/** A state label's size, which tells it apart from a hash cell's count. */
const STATE_LABEL_SIZE = 16;

/** Dummies standing around the rectangle, clear of the wall, each drawn somewhere else on the screen. */
const AROUND_THE_RECT: readonly Vec2[] = [
  { x: -300, y: -300 },
  { x: 300, y: -300 },
  { x: -300, y: 300 },
  { x: 300, y: 300 },
];

describe("the state labels", () => {
  it("label an enemy idle, then chase, then attack, then return, as the enemies page's states run", () => {
    const arranged = arrangeOverlays();
    const grunt = spawnEnemy(arranged.world, {
      definitionId: "melee_grunt",
      x: -GRUNT_FAR_X,
      y: 0,
    });
    const gruntId = unitIdOf(arranged.world, grunt);
    const shown: (string | null)[] = [];
    const record = (): void => {
      arranged.sync();

      const label = arranged.labels.find(
        (candidate) =>
          candidate.visible &&
          candidate.x === grunt.prev.x &&
          candidate.size === STATE_LABEL_SIZE,
      );

      shown.push(label === undefined ? null : label.text);
    };

    arranged.hash.ids = [gruntId];
    arranged.toggles.stateLabels = true;
    record();

    applyDamage(arranged.world.state, gruntId, 1, "pure", arranged.heroId);
    tickUntil(arranged.world, () => grunt.ai.state === "chase", MAX_TICKS);
    record();
    tickUntil(arranged.world, () => grunt.ai.state === "attack", MAX_TICKS);
    record();
    grunt.ai.leashAnchor.x = grunt.curr.x + BEYOND_LEASH;
    tickUntil(arranged.world, () => grunt.ai.state === "return", MAX_TICKS);
    record();

    expect(shown).toEqual(["IDLE", "CHASE", "ATTACK", "RETURN"]);
  });

  it("label the hero with its order state, and rewrite a label only when the state under it changes", () => {
    const arranged = arrangeOverlays();

    arranged.hash.ids = [arranged.heroId];
    arranged.toggles.stateLabels = true;
    arranged.sync();
    arranged.sync();

    const label = arranged.labels.find(
      (candidate) => candidate.visible && candidate.size === STATE_LABEL_SIZE,
    );

    expect(label?.text).toBe("IDLE");
    expect(label?.rewrites).toBe(1);
    expect(label?.y).toBeLessThan(-HERO_COLLISION_RADIUS);

    arranged.hero.state = "attack_windup";
    arranged.sync();

    expect(label?.text).toBe("ATTACK-WINDUP");
    expect(label?.rewrites).toBe(2);
  });

  it("label the dummy, which the machine holds in Idle, and nothing over a body with no definition", () => {
    const arranged = arrangeOverlays();
    const dummy = spawnEnemy(arranged.world, {
      definitionId: "training_dummy",
      x: GRUNT_X,
      y: 0,
    });
    const bareId = acquireUnit(arranged.world.state, "enemy", 0, GRUNT_X);

    if (bareId === null) {
      throw new Error("The unit pool has room for a bare body");
    }

    arranged.hash.ids = [unitIdOf(arranged.world, dummy), bareId];
    arranged.toggles.stateLabels = true;
    arranged.sync();

    const shown = arranged.labels.filter((label) => label.visible);

    expect(shown).toHaveLength(1);
    expect(shown[0]?.x).toBe(GRUNT_X);
    expect(shown[0]?.text).toBe("IDLE");
  });

  it("stand a state label over where each body is drawn, by the same offset up the screen wherever it stands", () => {
    const projection = new Projection();
    const arranged = arrangeOverlays(projection);
    const drawn: Vec2 = { x: 0, y: 0 };
    const dummies = AROUND_THE_RECT.map((at) =>
      spawnEnemy(arranged.world, {
        definitionId: "training_dummy",
        x: at.x,
        y: at.y,
      }),
    );

    arranged.hash.ids = dummies.map((dummy) => unitIdOf(arranged.world, dummy));
    arranged.toggles.stateLabels = true;
    arranged.sync();

    const shown = arranged.labels.filter(
      (label) => label.visible && label.size === STATE_LABEL_SIZE,
    );

    expect(shown).toHaveLength(dummies.length);

    const rises = dummies.map((dummy, index) => {
      const label = shown[index];

      if (label === undefined) {
        throw new Error("Every dummy wears a label");
      }

      projection.toScreen(dummy.prev.x, dummy.prev.y, drawn);
      expect(label.x).toBeCloseTo(drawn.x);
      expect(label.y).toBeLessThan(
        drawn.y - projection.riseOf(dummy.boundRadius),
      );

      return label.y - drawn.y;
    });

    for (const rise of rises) {
      expect(rise).toBeCloseTo(rises[0] ?? Number.NaN);
    }
  });
});
