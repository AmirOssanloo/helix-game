import { createCandidateBuffer, UNIT_CAPACITY } from "@domain/public";
import type { EntityId, Rect } from "@shared/public";
import type { WorldView } from "@simulation/public";

/**
 * The units inside the camera's world box this frame, asked of the spatial hash once and read
 * by every view and overlay that binds by unit: the unit views, the outlines, the status icons,
 * and the overlays that mark units. The ids come in the hash's order; each reader resolves them
 * and does its own test against the screen. The buffer is sized to the unit capacity when the
 * scene is made and never grows.
 */
export class ScreenUnits {
  private readonly buffer: EntityId[] = createCandidateBuffer(UNIT_CAPACITY);

  private found = 0;

  /** The ids found, valid from the first up to `count`. */
  get ids(): readonly EntityId[] {
    return this.buffer;
  }

  /** How many units the last gather found. */
  get count(): number {
    return this.found;
  }

  /** Asks the hash for every unit inside `box`, replacing what the last gather found. */
  gather(world: WorldView, box: Readonly<Rect>): void {
    this.found = world.map.spatialHash.queryRectangle(
      box.minX,
      box.minY,
      box.maxX,
      box.maxY,
      this.buffer,
    );
  }
}
