import type { Projectile } from "@domain/public";
import { PROJECTILE_CAPACITY } from "@domain/public";
import type { DeepReadonly, EntityId } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { CameraFrame } from "../camera/camera-frame";
import { DEPTH_PROJECTILES } from "./depth-bands";
import type { FrameSizes, Quad, QuadFactory } from "./quad";
import { interpolate } from "./quad";
import { ViewPool } from "./view-pool";

/** What a projectile with no frame of its own is drawn as, and what every view is made with; binding sets the one it names. */
const FALLBACK_FRAME = "disc";

const DIAMETERS_PER_RADIUS = 2;

/**
 * One projectile in flight: a single quad at the projectiles band, sized once to the
 * projectile's radius when it is bound, since a projectile never changes size, and written
 * each frame with where it is and which way it points. The position is interpolated from the
 * previous tick's by the driver's fraction, so a projectile crossing thirty units a tick
 * reads as a smooth flight rather than a row of jumps.
 */
export class ProjectileView {
  private readonly quad: Quad;

  private readonly frameSizes: FrameSizes;

  constructor(quad: Quad, frameSizes: FrameSizes) {
    this.quad = quad;
    this.frameSizes = frameSizes;
  }

  bind(_id: EntityId, projectile: DeepReadonly<Projectile>): void {
    const frame = projectile.frame ?? FALLBACK_FRAME;

    this.quad.setFrame(frame);
    this.quad.setDepth(DEPTH_PROJECTILES);
    this.quad.tint = projectile.tint;
    this.quad.scale =
      (projectile.radius * DIAMETERS_PER_RADIUS) / this.frameSizes(frame);
  }

  sync(projectile: DeepReadonly<Projectile>, alpha: number): void {
    this.quad.x = interpolate(projectile.prev.x, projectile.curr.x, alpha);
    this.quad.y = interpolate(projectile.prev.y, projectile.curr.y, alpha);
    this.quad.rotation = projectile.facing;
    this.quad.visible = true;
  }

  release(): void {
    this.quad.visible = false;
  }
}

export type ProjectileViewPool = ViewPool<
  DeepReadonly<Projectile>,
  ProjectileView
>;

/** `size` projectile views over quads from `makeQuad`, at scene `create`. */
export const createProjectileViewPool = (
  size: number,
  makeQuad: QuadFactory,
  frameSizes: FrameSizes,
): ProjectileViewPool => {
  const views: ProjectileView[] = [];

  for (let index = 0; index < size; index += 1) {
    views.push(new ProjectileView(makeQuad(FALLBACK_FRAME), frameSizes));
  }

  return new ViewPool(views, PROJECTILE_CAPACITY);
};

/**
 * One frame of the projectile views: projectiles are not in the spatial hash, so the pool is
 * walked by index, and every projectile drawn inside the frame's screen keeps a view and is
 * written. One that landed, expired, or left the screen has its view released.
 */
export const syncProjectileViews = (
  pool: ProjectileViewPool,
  world: WorldView,
  frame: CameraFrame,
  alpha: number,
): void => {
  const projectiles = world.map.projectiles;

  pool.beginFrame();

  for (let index = 0; index < projectiles.end; index += 1) {
    const projectile = projectiles.at(index);
    const id = projectiles.idAt(index);

    if (
      projectile === null ||
      id === null ||
      !frame.showsBetween(projectile.prev, projectile.curr, alpha)
    ) {
      continue;
    }

    const view = pool.keep(id, projectile);

    if (view !== null) {
      view.sync(projectile, alpha);
    }
  }

  pool.releaseUnkept();
};
