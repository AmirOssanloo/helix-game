/**
 * What the test runner hands out for `phaser`. Every Vitest project aliases the package to this
 * file, so no spec mocks a module: code under `src/presentation/` and `src/app/` sees plain
 * objects and classes with no behaviour, and the architecture tier imports the game config
 * against them.
 *
 * Add a name here when a file under `src/` starts importing it. Nothing here draws, loads, or
 * ticks; the constants carry Phaser's real values so a config built from them reads the same.
 */

class Scene {
  constructor(_config: unknown = null) {}
}

class Game {
  constructor(_config: unknown = null) {}
}

class Vector2 {
  x = 0;

  y = 0;
}

const Phaser = {
  AUTO: 0,
  CANVAS: 1,
  WEBGL: 2,
  HEADLESS: 3,
  Scale: {
    NONE: 0,
    WIDTH_CONTROLS_HEIGHT: 1,
    HEIGHT_CONTROLS_WIDTH: 2,
    FIT: 3,
    ENVELOP: 4,
    RESIZE: 5,
    EXPAND: 6,
    NO_CENTER: 0,
    CENTER_BOTH: 1,
    CENTER_HORIZONTALLY: 2,
    CENTER_VERTICALLY: 3,
  },
  Math: { Vector2 },
  Scene,
  Game,
};

export default Phaser;
