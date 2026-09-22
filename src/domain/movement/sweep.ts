/**
 * The exact test a fast-moving disc needs: not where it ended up, but whether it touched
 * anything on the way. A projectile travelling tens of units in a tick passes clean through a
 * unit if it is tested only where it stopped, so it is tested along the segment it flew.
 *
 * Pure arithmetic over plain numbers, so a caller tests a candidate the spatial hash proposed
 * without a world and a spec walks the boundaries without one either. Touching counts as
 * contact, as the boundary counts as covered in every shape, so a disc that grazes another
 * exactly hits it.
 */

/** What `sweepDisc` answers when the moving disc never touches the still one. */
export const NO_CONTACT = -1;

/**
 * How far along the segment from (`fromX`, `fromY`) to (`toX`, `toY`) a disc of `radius`
 * first touches the still disc of `otherRadius` at (`centreX`, `centreY`): a fraction between
 * zero and one, or `NO_CONTACT` where it never touches. A moving disc that starts already
 * touching contacts at the start of the segment, and one that does not move touches only if
 * it starts touching.
 *
 * The two discs meet when the distance between their centres is the sum of their radii, which
 * is one quadratic in the fraction; the earlier of its two roots is the first contact, and a
 * root outside the segment is a contact the disc never reaches.
 */
export const sweepDisc = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  radius: number,
  centreX: number,
  centreY: number,
  otherRadius: number,
): number => {
  const offsetX = fromX - centreX;
  const offsetY = fromY - centreY;
  const reach = radius + otherRadius;
  const gap = offsetX * offsetX + offsetY * offsetY - reach * reach;

  if (gap <= 0) {
    return 0;
  }

  const stepX = toX - fromX;
  const stepY = toY - fromY;
  const travel = stepX * stepX + stepY * stepY;

  if (travel === 0) {
    return NO_CONTACT;
  }

  const closing = offsetX * stepX + offsetY * stepY;
  const discriminant = closing * closing - travel * gap;

  if (discriminant < 0) {
    return NO_CONTACT;
  }

  const at = (-closing - Math.sqrt(discriminant)) / travel;

  if (at < 0 || at > 1) {
    return NO_CONTACT;
  }

  return at;
};
