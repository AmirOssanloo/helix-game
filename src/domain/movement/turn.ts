import { shortestArc, wrapAngle } from "@shared/public";

/**
 * One tick of turning `facing` toward `target` along the shortest arc. `maxStep` is the full
 * rate in radians per tick; the ramp scales it by how far into the turn the unit is, one part
 * in `rampTicks` on the first tick (`turnTicks` zero) and the full rate from tick `rampTicks`
 * on. When the remaining arc is within the step, the result is `target` exactly, so a turn
 * never overshoots and the last tick lands on the bearing.
 */
export const turnToward = (
  facing: number,
  target: number,
  maxStep: number,
  rampTicks: number,
  turnTicks: number,
): number => {
  const arc = shortestArc(facing, target);
  const ramp = Math.min((turnTicks + 1) / rampTicks, 1);
  const step = maxStep * ramp;

  if (Math.abs(arc) <= step) {
    return wrapAngle(target);
  }

  return wrapAngle(facing + Math.sign(arc) * step);
};

/**
 * The action cone: whether the bearing `toTarget` is within `halfAngle` of `facing`, inside
 * which a move translates, an attack starts its attack point, and a targeted cast starts its
 * cast point. The boundary counts as inside.
 */
export const isInsideCone = (
  facing: number,
  toTarget: number,
  halfAngle: number,
): boolean => Math.abs(shortestArc(facing, toTarget)) <= halfAngle;
