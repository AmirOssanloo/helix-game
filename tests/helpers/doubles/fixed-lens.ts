import type { CameraLens } from "@presentation/public";
import type { Vec2 } from "@shared/public";

/**
 * A camera for an input test: world is screen plus `offset`. A spec moves the offset between
 * an event and a tick to prove the pick was resolved when the event arrived.
 */
export class FixedLens implements CameraLens {
  readonly offset: Vec2 = { x: 0, y: 0 };

  worldPointAt(screenX: number, screenY: number, out: Vec2): void {
    out.x = screenX + this.offset.x;
    out.y = screenY + this.offset.y;
  }
}
