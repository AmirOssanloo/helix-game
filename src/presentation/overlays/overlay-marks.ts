import { DEPTH_DEBUG } from "../views/depth-bands";
import type { Quad, QuadFactory } from "../views/quad";
import { makeQuads } from "../views/quad-run";

/** Every overlay draws at low alpha, so several read at once over the units. */
export const RING_ALPHA = 0.5;
export const LINE_ALPHA = 0.8;
export const CELL_ALPHA = 0.25;
export const OPAQUE = 1;

/** Labels are white; the number or the word is what tells them apart. */
export const LABEL_TINT = 0xffffff;

export const DIAMETERS_PER_RADIUS = 2;

/** Every line is this thick, in world units. */
const LINE_THICKNESS = 3;

/** `size` quads of `frame` at the debug band, hidden, made once. */
export const makeOverlayQuads = (
  size: number,
  frame: string,
  makeQuad: QuadFactory,
): Quad[] => makeQuads(size, frame, DEPTH_DEBUG, makeQuad);

/** Lays `quad`, a stretched pixel, from (`ax`, `ay`) to (`bx`, `by`). */
export const layLine = (
  quad: Quad,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  scalePerUnit: number,
  tint: number,
): void => {
  const dx = bx - ax;
  const dy = by - ay;

  quad.x = (ax + bx) / 2;
  quad.y = (ay + by) / 2;
  quad.rotation = Math.atan2(dy, dx);
  quad.scaleX = Math.sqrt(dx * dx + dy * dy) * scalePerUnit;
  quad.scaleY = LINE_THICKNESS * scalePerUnit;
  quad.tint = tint;
  quad.alpha = LINE_ALPHA;
  quad.visible = true;
};

/** Lays `quad`, a ring frame, at (`x`, `y`) at `radius`. */
export const layRing = (
  quad: Quad,
  x: number,
  y: number,
  radius: number,
  scalePerUnit: number,
  tint: number,
): void => {
  quad.x = x;
  quad.y = y;
  quad.rotation = 0;
  quad.scale = radius * DIAMETERS_PER_RADIUS * scalePerUnit;
  quad.tint = tint;
  quad.alpha = RING_ALPHA;
  quad.visible = true;
};
