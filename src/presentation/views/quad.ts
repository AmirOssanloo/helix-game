/**
 * The surface of one game object a view writes: the seven fields a sync writes every frame,
 * the two axis scales a bar's fill stretches by, and the settings a pool makes once, when the
 * quad is made or bound or when a flash turns. Phaser's `Image` satisfies it, so a view is
 * written against this and a test hands it a recorder instead.
 */
export type Quad = {
  x: number;
  y: number;
  rotation: number;
  scale: number;
  scaleX: number;
  scaleY: number;
  tint: number;
  alpha: number;
  visible: boolean;
  setFrame: (frame: string) => unknown;
  setDepth: (depth: number) => unknown;
  setDisplaySize: (width: number, height: number) => unknown;
  setTintMode: (mode: number) => unknown;
};

/**
 * The surface of one bitmap text a HUD element or a view writes: where it sits, its colour,
 * the band it draws in, and the text, rewritten only when the value it shows changes.
 * Phaser's `BitmapText` satisfies it.
 */
export type Label = {
  x: number;
  y: number;
  tint: number;
  alpha: number;
  visible: boolean;
  setText: (text: string) => unknown;
  setDepth: (depth: number) => unknown;
};

/** Makes one hidden quad showing `frame`. A scene supplies it at `create`; nothing calls it after. */
export type QuadFactory = (frame: string) => Quad;

/** Makes one hidden label at `size` pixels a line, centred on its position. A scene supplies it at `create`; nothing calls it after. */
export type LabelFactory = (size: number) => Label;

/** The baked width of an atlas frame, so a view turns a world size into a scale once. */
export type FrameSizes = (frame: string) => number;

/** `from` toward `to` by `alpha`: the previous position toward the current one by the driver's fraction. */
export const interpolate = (from: number, to: number, alpha: number): number =>
  from + (to - from) * alpha;
