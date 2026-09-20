import Phaser from "phaser";

/**
 * Counts the draw calls of one frame. Every batch handler, the filter pass, and the GPU tile
 * layer draw through two public methods on the renderer, `drawElements` and
 * `drawInstancedArrays`, so wrapping the two on the renderer instance sees every draw. The
 * count resets on the renderer's pre-render event and is published on post-render, so a read
 * between frames is the last whole frame. The Canvas renderer has nothing to count.
 */
export type DrawCallCounter = Readonly<{
  /** Draw calls in the last completed frame. */
  lastFrame: () => number;
}>;

export const countDrawCalls = (
  renderer:
    Phaser.Renderer.Canvas.CanvasRenderer | Phaser.Renderer.WebGL.WebGLRenderer,
): DrawCallCounter | null => {
  if (!(renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) {
    return null;
  }

  const drawElements = renderer.drawElements;
  const drawInstancedArrays = renderer.drawInstancedArrays;
  let inFrame = 0;
  let lastFrame = 0;

  renderer.drawElements = (
    drawingContext,
    textures,
    program,
    vao,
    count,
    offset,
    topology,
  ): void => {
    inFrame += 1;
    drawElements.call(
      renderer,
      drawingContext,
      textures,
      program,
      vao,
      count,
      offset,
      topology,
    );
  };

  renderer.drawInstancedArrays = (
    drawingContext,
    textures,
    program,
    vao,
    first,
    count,
    instanceCount,
  ): void => {
    inFrame += 1;
    drawInstancedArrays.call(
      renderer,
      drawingContext,
      textures,
      program,
      vao,
      first,
      count,
      instanceCount,
    );
  };

  renderer.on(Phaser.Renderer.Events.PRE_RENDER, (): void => {
    inFrame = 0;
  });

  renderer.on(Phaser.Renderer.Events.POST_RENDER, (): void => {
    lastFrame = inFrame;
  });

  return { lastFrame: (): number => lastFrame };
};
