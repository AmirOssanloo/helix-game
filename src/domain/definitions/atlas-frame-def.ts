/**
 * How one atlas frame is drawn. The kind is the key the bake resolves to a painter, the same
 * way a definition names an effect: content says which shape, presentation knows how to draw
 * it. Thicknesses are in the frame's own pixels.
 */
export type AtlasShape =
  | Readonly<{ kind: "disc" }>
  | Readonly<{ kind: "ring"; thickness: number }>
  | Readonly<{ kind: "square" }>
  | Readonly<{ kind: "square_outline"; thickness: number }>
  | Readonly<{ kind: "triangle" }>
  | Readonly<{ kind: "pixel" }>
  | Readonly<{ kind: "wedge"; step: number; steps: number }>
  | Readonly<{ kind: "icon" }>
  | Readonly<{ kind: "glyph"; character: string }>;

/**
 * One frame of the shape atlas as content declares it: the name a view or a definition refers
 * to it by, the size it is baked at, and the shape drawn into it. A frame is baked large and
 * scaled down; a view may scale it up by at most two, so the size is the largest on-screen
 * size divided by two.
 */
export type AtlasFrameDef = Readonly<{
  name: string;
  width: number;
  height: number;
  shape: AtlasShape;
}>;

/** The whole frame list, in the order the bake lays it out and the font reads its glyphs. */
export type AtlasFrameList = readonly AtlasFrameDef[];
