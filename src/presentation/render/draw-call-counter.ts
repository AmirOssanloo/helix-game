import Phaser from "phaser";
import type { RingBuffer } from "@shared/public";

/** The two rings the counter writes, once per frame on post-render. */
export type DrawCallRings = Readonly<{
  drawCalls: RingBuffer<number>;
  worldDrawCalls: RingBuffer<number>;
}>;

/** What the render event hands its listener: the scene about to draw, named by its key. */
export type RenderedScene = Readonly<{
  sys: Readonly<{
    settings: Readonly<{
      key: string;
    }>;
  }>;
}>;

/**
 * What the counter needs of the WebGL renderer: the two public draw methods every batch
 * handler, the filter pass, and the GPU tile layer draw through, and its event emitter.
 * Phaser's `WebGLRenderer` satisfies it; the composition root proves the renderer is one
 * before installing, since the Canvas renderer has nothing to count and no such methods.
 */
export type DrawCallRenderer = {
  drawElements: (...args: never[]) => void;
  drawInstancedArrays: (...args: never[]) => void;
  on: (event: string, listener: (scene: RenderedScene) => void) => unknown;
};

/**
 * Wraps the renderer's two draw methods so every draw of a frame is counted, and splits the
 * count by scene from the render event, which fires per camera before the scene's children
 * draw. On pre-render the counts reset; on post-render the frame total and the share drawn
 * between the world scene's render event and the next scene's go to the rings, so the world
 * figure the budget is held to excludes the HUD. Nothing is read from renderer internals.
 * Installed once, at boot, after the game is ready.
 */
export const installDrawCallCounter = (
  renderer: DrawCallRenderer,
  rings: DrawCallRings,
  worldSceneKey: string,
): void => {
  const drawElements = renderer.drawElements;
  const drawInstancedArrays = renderer.drawInstancedArrays;
  let inFrame = 0;
  let worldShare = 0;
  let spanStart = 0;
  let inWorld = false;

  const closeSpan = (): void => {
    if (inWorld) {
      worldShare += inFrame - spanStart;
    }

    inWorld = false;
  };

  renderer.drawElements = (...args: never[]): void => {
    inFrame += 1;
    drawElements.apply(renderer, args);
  };

  renderer.drawInstancedArrays = (...args: never[]): void => {
    inFrame += 1;
    drawInstancedArrays.apply(renderer, args);
  };

  renderer.on(Phaser.Renderer.Events.PRE_RENDER, (): void => {
    inFrame = 0;
    worldShare = 0;
    spanStart = 0;
    inWorld = false;
  });

  renderer.on(Phaser.Renderer.Events.RENDER, (scene: RenderedScene): void => {
    closeSpan();
    inWorld = scene.sys.settings.key === worldSceneKey;
    spanStart = inFrame;
  });

  renderer.on(Phaser.Renderer.Events.POST_RENDER, (): void => {
    closeSpan();
    rings.drawCalls.write(inFrame);
    rings.worldDrawCalls.write(worldShare);
  });
};
