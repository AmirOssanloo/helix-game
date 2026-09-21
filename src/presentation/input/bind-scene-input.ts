import Phaser from "phaser";
import type { InputMapper } from "./input-mapper";
import type { CameraLens } from "./input-ports";

const POINTER_DOWN_EVENT = "pointerdown";
const WHEEL_EVENT = "wheel";
const KEY_DOWN_EVENT = "keydown";
const KEY_UP_EVENT = "keyup";
const BLUR_EVENT = "blur";

/** The camera as a lens: screen to world through its scroll and zoom at the moment of the call. */
export const cameraLens = (
  camera: Phaser.Cameras.Scene2D.Camera,
): CameraLens => {
  const scratch = new Phaser.Math.Vector2();

  return {
    worldPointAt: (screenX, screenY, out): void => {
      camera.getWorldPoint(screenX, screenY, scratch);
      out.x = scratch.x;
      out.y = scratch.y;
    },
  };
};

/**
 * Listens on the scene's input plugins and hands every event to `mapper`. The context menu is
 * disabled so a right click is an order and not a browser menu; a window blur releases every
 * key. Returns the unbind, for the scene's shutdown.
 */
export const bindSceneInput = (
  scene: Phaser.Scene,
  mapper: InputMapper,
): (() => void) => {
  const input = scene.input;
  const keyboard = input.keyboard;
  const game = scene.sys.game;

  const onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    mapper.pointerDown(pointer.button, pointer.x, pointer.y);
  };
  const onWheel = (
    _pointer: Phaser.Input.Pointer,
    _over: readonly Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
  ): void => {
    mapper.wheel(deltaY);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    mapper.keyDown(event.code);
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    mapper.keyUp(event.code);
  };
  const onBlur = (): void => {
    mapper.releaseKeys();
  };

  if (input.mouse !== null) {
    input.mouse.disableContextMenu();
  }

  input.on(POINTER_DOWN_EVENT, onPointerDown);
  input.on(WHEEL_EVENT, onWheel);
  game.events.on(BLUR_EVENT, onBlur);

  if (keyboard !== null) {
    keyboard.on(KEY_DOWN_EVENT, onKeyDown);
    keyboard.on(KEY_UP_EVENT, onKeyUp);
  }

  return (): void => {
    input.off(POINTER_DOWN_EVENT, onPointerDown);
    input.off(WHEEL_EVENT, onWheel);
    game.events.off(BLUR_EVENT, onBlur);

    if (keyboard !== null) {
      keyboard.off(KEY_DOWN_EVENT, onKeyDown);
      keyboard.off(KEY_UP_EVENT, onKeyUp);
    }
  };
};
