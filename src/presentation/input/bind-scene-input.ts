import Phaser from "phaser";
import type { InputClaim } from "./input-claim";
import type { CameraLens } from "./input-ports";
import { suppressBrowserDefault } from "./key-bindings";
import type { Unprojection } from "./projected-lens";
import { projectedLens } from "./projected-lens";

const POINTER_DOWN_EVENT = "pointerdown";
const POINTER_UP_EVENT = "pointerup";
const POINTER_UP_OUTSIDE_EVENT = "pointerupoutside";
const POINTER_MOVE_EVENT = "pointermove";
const KEY_DOWN_EVENT = "keydown";
const KEY_UP_EVENT = "keyup";
const BLUR_EVENT = "blur";

/** The camera as a lens: screen to world through its scroll, then back through the projection, at the moment of the call. */
export const cameraLens = (
  camera: Phaser.Cameras.Scene2D.Camera,
  projection: Unprojection,
): CameraLens => {
  const scratch = new Phaser.Math.Vector2();

  return projectedLens((screenX, screenY, out): void => {
    camera.getWorldPoint(screenX, screenY, scratch);
    out.x = scratch.x;
    out.y = scratch.y;
  }, projection);
};

/** Where the binding hands each event. The play scene's are the claim's, then the mapper's. */
export type InputSink = Readonly<{
  pointerDown: (button: number, x: number, y: number) => void;
  pointerUp: (button: number, x: number, y: number) => void;
  pointerMove: (x: number, y: number) => void;
  keyDown: (code: string) => void;
  keyUp: (code: string) => void;
  blur: () => void;
}>;

/** The mapper as the binding hands it events: InputMapper's, or a test's recorder. */
export type MapperInput = Readonly<{
  pointerDown: (button: number, x: number, y: number) => void;
  pointerUp: (button: number, x: number, y: number) => void;
  keyDown: (code: string) => void;
  keyUp: (code: string) => void;
  releaseKeys: () => void;
}>;

/**
 * Every event asks `claim` first and reaches `mapper` only when it is not claimed; a pointer
 * move is the claim's alone, for the open screens, as the mapper reads the pointer itself. Losing
 * focus is everyone's: the claim forgets what is down and the mapper releases what it holds.
 */
export const claimedSink = (
  claim: InputClaim,
  mapper: MapperInput,
): InputSink => ({
  pointerDown: (button, x, y): void => {
    if (!claim.pointerDown(button, x, y)) {
      mapper.pointerDown(button, x, y);
    }
  },
  pointerUp: (button, x, y): void => {
    if (!claim.pointerUp(button, x, y)) {
      mapper.pointerUp(button, x, y);
    }
  },
  pointerMove: (x, y): void => {
    claim.pointerMove(x, y);
  },
  keyDown: (code): void => {
    if (!claim.keyDown(code)) {
      mapper.keyDown(code);
    }
  },
  keyUp: (code): void => {
    if (!claim.keyUp(code)) {
      mapper.keyUp(code);
    }
  },
  blur: (): void => {
    claim.blur();
    mapper.releaseKeys();
  },
});

/**
 * Listens on the scene's input plugins and hands every event to `sink`. The context menu is
 * disabled so a right click is an order and not a browser menu; a button coming up is handed
 * over whether it came up on the canvas or off it, so a held press dragged past the edge
 * still commits; a window blur releases every key; Alt's browser default is suppressed. Returns the unbind, for the scene's
 * shutdown.
 */
export const bindSceneInput = (
  scene: Phaser.Scene,
  sink: InputSink,
): (() => void) => {
  const input = scene.input;
  const keyboard = input.keyboard;
  const game = scene.sys.game;

  const onPointerDown = (pointer: Phaser.Input.Pointer): void => {
    sink.pointerDown(pointer.button, pointer.x, pointer.y);
  };
  const onPointerUp = (pointer: Phaser.Input.Pointer): void => {
    sink.pointerUp(pointer.button, pointer.x, pointer.y);
  };
  const onPointerMove = (pointer: Phaser.Input.Pointer): void => {
    sink.pointerMove(pointer.x, pointer.y);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    sink.keyDown(event.code);
  };
  const onKeyUp = (event: KeyboardEvent): void => {
    sink.keyUp(event.code);
  };
  const onBlur = (): void => {
    sink.blur();
  };
  // Phaser prevents the default only for an unmodified key, and Alt is its own modifier, so
  // the page listens for Alt itself, down and up, as the key comes.
  const onBrowserKey = (event: KeyboardEvent): void => {
    suppressBrowserDefault(event);
  };

  if (input.mouse !== null) {
    input.mouse.disableContextMenu();
  }

  input.on(POINTER_DOWN_EVENT, onPointerDown);
  input.on(POINTER_UP_EVENT, onPointerUp);
  input.on(POINTER_UP_OUTSIDE_EVENT, onPointerUp);
  input.on(POINTER_MOVE_EVENT, onPointerMove);
  game.events.on(BLUR_EVENT, onBlur);
  window.addEventListener(KEY_DOWN_EVENT, onBrowserKey);
  window.addEventListener(KEY_UP_EVENT, onBrowserKey);

  if (keyboard !== null) {
    keyboard.on(KEY_DOWN_EVENT, onKeyDown);
    keyboard.on(KEY_UP_EVENT, onKeyUp);
  }

  return (): void => {
    input.off(POINTER_DOWN_EVENT, onPointerDown);
    input.off(POINTER_UP_EVENT, onPointerUp);
    input.off(POINTER_UP_OUTSIDE_EVENT, onPointerUp);
    input.off(POINTER_MOVE_EVENT, onPointerMove);
    game.events.off(BLUR_EVENT, onBlur);
    window.removeEventListener(KEY_DOWN_EVENT, onBrowserKey);
    window.removeEventListener(KEY_UP_EVENT, onBrowserKey);

    if (keyboard !== null) {
      keyboard.off(KEY_DOWN_EVENT, onKeyDown);
      keyboard.off(KEY_UP_EVENT, onKeyUp);
    }
  };
};
