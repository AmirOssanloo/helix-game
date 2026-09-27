import type { Vec2 } from "@shared/public";
import type { Tick } from "../tick";

/**
 * The state a unit's attack keeps between ticks: when its next shot may land, and the point
 * an attack-move was walking to.
 */
export type AttackState = {
  /**
   * The earliest tick a shot of this unit's may land. An attack point begins early enough to
   * land on it, so two shots are one attack time apart however long the point is; a tick in
   * the past is a unit that may shoot as soon as it faces something.
   */
  readyAtTick: Tick;
  /**
   * The point an attack-move was walking to before it acquired something, given back when
   * the target is gone so the walk carries on from where the unit then stands rather than
   * from where it left the line. Read only while an attack-move holds a target.
   */
  movePoint: Vec2;
};

/** An attack that may shoot at once and walks nowhere, which is what a fresh slot holds. */
export const createAttackState = (): AttackState => ({
  readyAtTick: 0,
  movePoint: { x: 0, y: 0 },
});

/** Every field back to the value a fresh slot has, in place. */
export const clearAttackState = (attack: AttackState): void => {
  attack.readyAtTick = 0;
  attack.movePoint.x = 0;
  attack.movePoint.y = 0;
};
