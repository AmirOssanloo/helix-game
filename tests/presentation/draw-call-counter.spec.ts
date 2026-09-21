import Phaser from "phaser";
import { describe, expect, it } from "vitest";
import type { SampleRing } from "@instrumentation/public";
import { createSampleRing } from "@instrumentation/public";
import type { DrawCallRenderer, RenderedScene } from "@presentation/public";
import { installDrawCallCounter, PLAY_SCENE_KEY } from "@presentation/public";

const HUD_KEY = "hud";

type Listener = (scene: RenderedScene) => void;

/**
 * A renderer that draws nothing and remembers how many times its own draw methods ran, so a
 * spec proves the wrapper still calls through. Built against the real port type.
 */
class RendererRecorder implements DrawCallRenderer {
  /** Calls that reached the renderer's own methods, past the wrapper. */
  ownDraws = 0;

  private readonly listeners = new Map<string, Listener[]>();

  drawElements = (): void => {
    this.ownDraws += 1;
  };

  drawInstancedArrays = (): void => {
    this.ownDraws += 1;
  };

  on = (event: string, listener: Listener): void => {
    const list = this.listeners.get(event) ?? [];

    list.push(listener);
    this.listeners.set(event, list);
  };

  emit(event: string, scene: RenderedScene): void {
    for (const listener of this.listeners.get(event) ?? []) {
      listener(scene);
    }
  }
}

const sceneNamed = (key: string): RenderedScene => ({
  sys: { settings: { key } },
});

const NO_SCENE = sceneNamed("");

type Arranged = {
  renderer: RendererRecorder;
  drawCalls: SampleRing;
  worldDrawCalls: SampleRing;
  preRender: () => void;
  render: (key: string) => void;
  postRender: () => void;
};

const arrange = (): Arranged => {
  const renderer = new RendererRecorder();
  const drawCalls = createSampleRing();
  const worldDrawCalls = createSampleRing();

  installDrawCallCounter(
    renderer,
    { drawCalls, worldDrawCalls },
    PLAY_SCENE_KEY,
  );

  return {
    renderer,
    drawCalls,
    worldDrawCalls,
    preRender: (): void => {
      renderer.emit(Phaser.Renderer.Events.PRE_RENDER, NO_SCENE);
    },
    render: (key): void => {
      renderer.emit(Phaser.Renderer.Events.RENDER, sceneNamed(key));
    },
    postRender: (): void => {
      renderer.emit(Phaser.Renderer.Events.POST_RENDER, NO_SCENE);
    },
  };
};

describe("the draw-call counter", () => {
  it("writes the draws between pre-render and post-render to the ring, and still draws", () => {
    const arranged = arrange();

    arranged.preRender();
    arranged.renderer.drawElements();
    arranged.renderer.drawElements();
    arranged.renderer.drawInstancedArrays();
    arranged.postRender();

    expect(arranged.drawCalls.at(0)).toBe(3);
    expect(arranged.renderer.ownDraws).toBe(3);
  });

  it("attributes the world scene's share by the render event, so the HUD's draws are outside it", () => {
    const arranged = arrange();

    arranged.preRender();
    arranged.render(PLAY_SCENE_KEY);
    arranged.renderer.drawElements();
    arranged.renderer.drawElements();
    arranged.render(HUD_KEY);
    arranged.renderer.drawElements();
    arranged.postRender();

    expect(arranged.drawCalls.at(0)).toBe(3);
    expect(arranged.worldDrawCalls.at(0)).toBe(2);
  });

  it("counts the world scene's draws that flush at post-render when it renders last", () => {
    const arranged = arrange();

    arranged.preRender();
    arranged.render(HUD_KEY);
    arranged.renderer.drawElements();
    arranged.render(PLAY_SCENE_KEY);
    arranged.renderer.drawElements();
    arranged.postRender();

    expect(arranged.worldDrawCalls.at(0)).toBe(1);
  });

  it("starts every frame from zero", () => {
    const arranged = arrange();

    arranged.preRender();
    arranged.renderer.drawElements();
    arranged.renderer.drawElements();
    arranged.postRender();
    arranged.preRender();
    arranged.renderer.drawElements();
    arranged.postRender();

    expect(arranged.drawCalls.at(1)).toBe(1);
    expect(arranged.drawCalls.count).toBe(2);
  });

  it("writes nothing until a frame completes, which is what a Canvas renderer looks like", () => {
    const arranged = arrange();

    arranged.preRender();
    arranged.renderer.drawElements();

    expect(arranged.drawCalls.count).toBe(0);
  });
});
