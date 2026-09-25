import { expect, it } from "vitest";
import type { EnemyDef } from "@domain/public";
import { arrangeArchetype } from "./arrange-archetype";
import { submit } from "./submit";
import { tickUntil } from "./tick-until";

/** Long enough for the archetype to open fire from where it stands. */
const PATIENCE = 600;

/** How long the hero walks at it: long enough for two of any roster archetype's shots, short of its leash. */
const WALK_TICKS = 150;

/**
 * Mounts the kiting case for an archetype whose behaviour kites, beside the six
 * `describeArchetype` mounts: once it is firing, the hero walks straight at it, and it backs
 * away along a path and fires again while the hero keeps coming. `x` is where it spawns from
 * the hero at the origin, inside its aggro radius.
 *
 * @see docs/workflows/adding-an-enemy.md
 */
export const describeKiting = (def: EnemyDef, x: number): void => {
  it("backs away along a path from a hero that walks at it, and keeps firing", () => {
    const { world, unit } = arrangeArchetype(def.id, x);

    tickUntil(world, () => unit.state === "attack_backswing", PATIENCE);
    submit(world, {
      kind: "move",
      tick: world.view.tick,
      timestamp: world.view.tick,
      destination: { x: x + def.leashRadius, y: 0 },
    });

    let backedAway = false;
    let hadPath = false;
    let shotsAfter = 0;
    let wasSwinging = true;

    for (let tick = 0; tick < WALK_TICKS; tick += 1) {
      world.tick();

      const isBacking =
        unit.ai.state === "attack" && unit.order.kind === "move";
      const isSwinging = unit.state === "attack_backswing";

      backedAway = backedAway || isBacking;
      hadPath = hadPath || (isBacking && unit.path.count > 0);

      if (backedAway && isSwinging && !wasSwinging) {
        shotsAfter += 1;
      }

      wasSwinging = isSwinging;
    }

    expect([backedAway, hadPath]).toEqual([true, true]);
    expect(shotsAfter).toBeGreaterThanOrEqual(1);
  });
};
