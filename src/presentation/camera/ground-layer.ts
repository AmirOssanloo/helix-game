import type Phaser from "phaser";
import { DEPTH_GROUND } from "../views/depth-bands";

/** The inner container turns the world a quarter of a half turn, so its axes run along the screen's diagonals. */
const EIGHTH_TURN = Math.PI / 4;

/** The world's x and y axes, turned onto the diagonals, are this much longer across than the projection wants per unit of `k`. */
const DIAGONAL = Math.SQRT2;

/** And the screen's vertical is squashed to half, which is what makes a square a 2:1 diamond. */
const SQUASH = 0.5;

const DEPTH_PROPERTY = "depth";

/**
 * Everything that lies on the ground, drawn through the projection by two nested containers:
 * the inner turned an eighth of a turn, the outer scaled by `k√2` across and half that down.
 * A child written at a world point is drawn at the screen point the projection gives, and a
 * circle becomes a 2:1 ellipse, a rectangle a parallelogram, a heading its screen angle, with
 * nothing in a view knowing. The layer sits at the ground band in the scene; inside it the
 * bands are the order of its list, which it keeps sorted by depth, since a container draws its
 * children in list order whatever their depth says.
 */
export class GroundLayer {
  private readonly outer: Phaser.GameObjects.Container;

  private readonly inner: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, scale: number) {
    this.outer = scene.add.container(0, 0);
    this.inner = scene.add.container(0, 0);
    this.inner.rotation = EIGHTH_TURN;
    this.outer.add(this.inner);
    this.outer.setDepth(DEPTH_GROUND);
    this.outer.setScale(scale * DIAGONAL, scale * DIAGONAL * SQUASH);
  }

  /** Lays `child` on the ground: from now on it is written in world coordinates. */
  add<T extends Phaser.GameObjects.GameObject>(child: T): T {
    this.inner.add(child);

    return child;
  }

  /**
   * Puts the list back in band order if a child's depth has changed since the last frame. A
   * pool sets a quad's band when it first binds it and never again, so this sorts a handful of
   * times early in a session and after that only walks the list.
   */
  keepSorted(): void {
    const list = this.inner.list;
    let previous = Number.NEGATIVE_INFINITY;

    for (let index = 0; index < list.length; index += 1) {
      const child = list[index];
      const depth: unknown =
        child === undefined ? undefined : Reflect.get(child, DEPTH_PROPERTY);

      if (typeof depth !== "number") {
        continue;
      }

      if (depth < previous) {
        this.inner.sort(DEPTH_PROPERTY);

        return;
      }

      previous = depth;
    }
  }
}
