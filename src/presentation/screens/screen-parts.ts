import type {
  FrameSizes,
  Label,
  LabelFactory,
  Quad,
  QuadFactory,
} from "../views/quad";

/** The frame every screen's shade, panel, and button is stretched from. */
export const SCREEN_FRAME = "square";

/** Everything a screen is built over: the HUD scene's factories, which set the screen band. */
export type ScreenPorts = Readonly<{
  makeQuad: QuadFactory;
  makeLabel: LabelFactory;
  frameSizes: FrameSizes;
}>;

/** Centres `quad` on (`x`, `y`) and stretches it by the two scales. */
export const placeQuad = (
  quad: Quad,
  x: number,
  y: number,
  scaleX: number,
  scaleY: number,
): void => {
  quad.x = x;
  quad.y = y;
  quad.scaleX = scaleX;
  quad.scaleY = scaleY;
};

/** Shows or hides every quad and label a screen made. */
export const setShown = (
  quads: readonly Quad[],
  labels: readonly Label[],
  visible: boolean,
): void => {
  for (let index = 0; index < quads.length; index += 1) {
    const quad = quads[index];

    if (quad !== undefined) {
      quad.visible = visible;
    }
  }

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index];

    if (label !== undefined) {
      label.visible = visible;
    }
  }
};
