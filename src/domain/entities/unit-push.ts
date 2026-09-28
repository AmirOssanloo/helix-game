import type { Vec2 } from "@shared/public";

/**
 * What carries the unit: the push a displacement or a charge has it in, how far it moves each tick, and how many ticks of it
 * are left. No ticks left is no push. The movement step translates by `step` while ticks
 * remain and collision decides where that leaves the unit, which is why a push into a wall
 * stops at the wall; the `knockback` status the displacement applies beside it raises the
 * displaced flag, which is what stops the unit walking itself meanwhile.
 */
export type Push = {
  step: Vec2;
  ticksLeft: number;
};

/** No push, which is what a fresh slot holds. */
export const createPush = (): Push => ({
  step: { x: 0, y: 0 },
  ticksLeft: 0,
});

/** Forgets the push. The step keeps its last values; the ticks left say whether one is carrying the unit. */
export const clearPush = (push: Push): void => {
  push.step.x = 0;
  push.step.y = 0;
  push.ticksLeft = 0;
};
