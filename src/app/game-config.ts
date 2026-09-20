import Phaser from "phaser";

/** The logical canvas. Scaled to fit the window and centred; never scaled by device pixel ratio. */
export const GAME_WIDTH = 1920;
export const GAME_HEIGHT = 1080;

/** The element in index.html the canvas is created inside. */
export const GAME_PARENT_ID = "game";

/**
 * The two flags a person sets on `window` before the game boots to pick a renderer by hand.
 * Forcing Canvas shows what an unsupported machine sees; forcing WebGL exists for symmetry.
 */
export type RendererOverrides = Readonly<{
  forceCanvas: boolean;
  forceWebgl: boolean;
}>;

const isFlagSet = (target: object, name: string): boolean =>
  Reflect.get(target, name) === true;

/** Reads `FORCE_CANVAS` and `FORCE_WEBGL` off `target`, normally `window`. An absent flag is false. */
export const readRendererOverrides = (target: object): RendererOverrides => ({
  forceCanvas: isFlagSet(target, "FORCE_CANVAS"),
  forceWebgl: isFlagSet(target, "FORCE_WEBGL"),
});

/** The Phaser renderer constant the overrides ask for. Canvas wins when both are set, since it is the one used on purpose. */
export const rendererType = (overrides: RendererOverrides): number => {
  if (overrides.forceCanvas) {
    return Phaser.CANVAS;
  }

  if (overrides.forceWebgl) {
    return Phaser.WEBGL;
  }

  return Phaser.AUTO;
};

/**
 * The Phaser game config, without the scene list: the composition root adds the scenes it
 * builds and the renderer type the overrides pick. There is no `physics` key, because the
 * simulation is our own fixed-step tick; the architecture test imports this object to check it.
 *
 * `maxTextures` is one because everything drawn is a quad from one atlas, and a second texture
 * would be a second batch nobody asked for.
 */
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: GAME_PARENT_ID,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: "#000000",
  render: {
    maxTextures: 1,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
};
