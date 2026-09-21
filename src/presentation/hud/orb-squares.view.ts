import type { KitState } from "@domain/public";
import { orbAt } from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import type { FrameSizes, Quad, QuadFactory } from "../views/quad";
import { ORB_SQUARE_SIZE } from "./hud-layout";
import { OPAQUE, orbTint, SOCKET_TINT } from "./palette";

const ORB_FRAME = "square";
const SOCKET_FRAME = "square_outline";

/**
 * The orb buffer on the bar: one square per slot of the buffer, oldest on the left, each in
 * its orb's colour, and an outline where the slot is empty. Shown only while the active kit
 * has orbs; a kit without them hides the row.
 */
export class OrbSquaresView {
  private readonly fills: readonly Quad[];

  private readonly sockets: readonly Quad[];

  constructor(size: number, makeQuad: QuadFactory, frameSizes: FrameSizes) {
    const fills: Quad[] = [];
    const sockets: Quad[] = [];
    const fillScale = ORB_SQUARE_SIZE / frameSizes(ORB_FRAME);
    const socketScale = ORB_SQUARE_SIZE / frameSizes(SOCKET_FRAME);

    for (let index = 0; index < size; index += 1) {
      const fill = makeQuad(ORB_FRAME);
      const socket = makeQuad(SOCKET_FRAME);

      fill.scale = fillScale;
      fill.alpha = OPAQUE;
      socket.scale = socketScale;
      socket.tint = SOCKET_TINT;
      socket.alpha = OPAQUE;
      fills.push(fill);
      sockets.push(socket);
    }

    this.fills = fills;
    this.sockets = sockets;
  }

  /** How many buffer slots the row shows. */
  get size(): number {
    return this.fills.length;
  }

  /** Puts square `index` at (`x`, `y`). Once, at layout. */
  place(index: number, x: number, y: number): void {
    const fill = this.fills[index];
    const socket = this.sockets[index];

    if (fill !== undefined && socket !== undefined) {
      fill.x = x;
      fill.y = y;
      socket.x = x;
      socket.y = y;
    }
  }

  /** Shows the instances `state` holds, oldest first; a slot past its count is an empty socket. */
  sync(state: DeepReadonly<KitState>): void {
    for (let index = 0; index < this.fills.length; index += 1) {
      const fill = this.fills[index];
      const socket = this.sockets[index];
      const orb = orbAt(state, index);

      if (fill === undefined || socket === undefined) {
        continue;
      }

      if (orb === null) {
        fill.visible = false;
        socket.visible = true;
      } else {
        fill.tint = orbTint(orb);
        fill.visible = true;
        socket.visible = false;
      }
    }
  }

  hide(): void {
    for (let index = 0; index < this.fills.length; index += 1) {
      const fill = this.fills[index];
      const socket = this.sockets[index];

      if (fill !== undefined && socket !== undefined) {
        fill.visible = false;
        socket.visible = false;
      }
    }
  }
}
