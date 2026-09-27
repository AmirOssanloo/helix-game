import { GCProfiler } from "node:v8";
import Phaser from "phaser";
import { describe, expect, it } from "vitest";
import type { SampleRing } from "@instrumentation/public";
import { createSampleRing } from "@instrumentation/public";
import type { DrawCallRenderer, RenderedScene } from "@presentation/public";
import { installDrawCallCounter, PLAY_SCENE_KEY } from "@presentation/public";

const HUD_KEY = "hud";

/** How many arguments each renderer method takes, as Phaser's WebGL renderer declares it. */
const DRAW_ELEMENTS_ARITY = 7;
const DRAW_INSTANCED_ARITY = 8;

/** Draws run before measuring, so the wrappers are compiled as a long session would run them. */
const WARM_UP_DRAWS = 10_000;

/** Draws measured: about a minute of the busiest frames' batches. */
const MEASURED_DRAWS = 200_000;

/** What the heap may move by over the measured draws, for the runner's own bookkeeping; a rest array per draw would be megabytes. */
const HEAP_ALLOWANCE_BYTES = 256 * 1024;

type Listener = (scene: RenderedScene) => void;

/**
 * A renderer that draws nothing and remembers how many times its own draw methods ran, so a
 * spec proves the wrapper still calls through. Built against the real port type.
 */
class RendererRecorder implements DrawCallRenderer {
  /** Calls that reached the renderer's own methods, past the wrapper. */
  ownDraws = 0;

  private readonly listeners = new Map<string, Listener[]>();

  /** The last arguments each own method was handed, written in place so a draw allocates nothing here either. */
  readonly lastElements: unknown[] = [0, 0, 0, 0, 0, 0, 0];

  readonly lastInstanced: unknown[] = [0, 0, 0, 0, 0, 0, 0, 0];

  drawElements = (
    context: never,
    textures: never,
    program: never,
    vao: never,
    count: never,
    offset: never,
    topology: never,
  ): void => {
    this.ownDraws += 1;
    this.lastElements[0] = context;
    this.lastElements[1] = textures;
    this.lastElements[2] = program;
    this.lastElements[3] = vao;
    this.lastElements[4] = count;
    this.lastElements[5] = offset;
    this.lastElements[6] = topology;
  };

  drawInstancedArrays = (
    context: never,
    textures: never,
    program: never,
    vao: never,
    first: never,
    count: never,
    instanceCount: never,
    topology: never,
  ): void => {
    this.ownDraws += 1;
    this.lastInstanced[0] = context;
    this.lastInstanced[1] = textures;
    this.lastInstanced[2] = program;
    this.lastInstanced[3] = vao;
    this.lastInstanced[4] = first;
    this.lastInstanced[5] = count;
    this.lastInstanced[6] = instanceCount;
    this.lastInstanced[7] = topology;
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

/** A stand-in for one of the renderer's arguments, which the counter hands on without looking. */
const argument = (name: string): never => name as never;

/** The arguments a batch handler hands `drawElements`, in its order. */
const ELEMENTS_ARGUMENTS = [
  "context",
  "textures",
  "program",
  "vao",
  "count",
  "offset",
  "topology",
];

/** The arguments a batch handler hands `drawInstancedArrays`, in its order. */
const INSTANCED_ARGUMENTS = [
  "context",
  "textures",
  "program",
  "vao",
  "first",
  "count",
  "instanceCount",
  "topology",
];

/** One draw through the wrapped `drawElements`, as a batch handler makes it. */
const drawElements = (renderer: DrawCallRenderer): void => {
  renderer.drawElements(
    argument("context"),
    argument("textures"),
    argument("program"),
    argument("vao"),
    argument("count"),
    argument("offset"),
    argument("topology"),
  );
};

/** One draw through the wrapped `drawInstancedArrays`. */
const drawInstancedArrays = (renderer: DrawCallRenderer): void => {
  renderer.drawInstancedArrays(
    argument("context"),
    argument("textures"),
    argument("program"),
    argument("vao"),
    argument("first"),
    argument("count"),
    argument("instanceCount"),
    argument("topology"),
  );
};

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
    drawElements(arranged.renderer);
    drawElements(arranged.renderer);
    drawInstancedArrays(arranged.renderer);
    arranged.postRender();

    expect(arranged.drawCalls.at(0)).toBe(3);
    expect(arranged.renderer.ownDraws).toBe(3);
  });

  it("attributes the world scene's share by the render event, so the HUD's draws are outside it", () => {
    const arranged = arrange();

    arranged.preRender();
    arranged.render(PLAY_SCENE_KEY);
    drawElements(arranged.renderer);
    drawElements(arranged.renderer);
    arranged.render(HUD_KEY);
    drawElements(arranged.renderer);
    arranged.postRender();

    expect(arranged.drawCalls.at(0)).toBe(3);
    expect(arranged.worldDrawCalls.at(0)).toBe(2);
  });

  it("counts the world scene's draws that flush at post-render when it renders last", () => {
    const arranged = arrange();

    arranged.preRender();
    arranged.render(HUD_KEY);
    drawElements(arranged.renderer);
    arranged.render(PLAY_SCENE_KEY);
    drawElements(arranged.renderer);
    arranged.postRender();

    expect(arranged.worldDrawCalls.at(0)).toBe(1);
  });

  it("starts every frame from zero", () => {
    const arranged = arrange();

    arranged.preRender();
    drawElements(arranged.renderer);
    drawElements(arranged.renderer);
    arranged.postRender();
    arranged.preRender();
    drawElements(arranged.renderer);
    arranged.postRender();

    expect(arranged.drawCalls.at(1)).toBe(1);
    expect(arranged.drawCalls.count).toBe(2);
  });

  it("writes nothing until a frame completes, which is what a Canvas renderer looks like", () => {
    const arranged = arrange();

    arranged.preRender();
    drawElements(arranged.renderer);

    expect(arranged.drawCalls.count).toBe(0);
  });

  it("wraps each draw method with the renderer's own arity, and hands every argument on in order", () => {
    const arranged = arrange();

    drawElements(arranged.renderer);
    drawInstancedArrays(arranged.renderer);

    expect(arranged.renderer.drawElements.length).toBe(DRAW_ELEMENTS_ARITY);
    expect(arranged.renderer.drawInstancedArrays.length).toBe(
      DRAW_INSTANCED_ARITY,
    );
    expect(arranged.renderer.lastElements).toEqual(ELEMENTS_ARGUMENTS);
    expect(arranged.renderer.lastInstanced).toEqual(INSTANCED_ARGUMENTS);
  });

  it("allocates nothing per draw once it is warm", () => {
    const arranged = arrange();
    const renderer = arranged.renderer;
    const context = argument("context");

    arranged.preRender();

    for (let draw = 0; draw < WARM_UP_DRAWS; draw += 1) {
      renderer.drawElements(
        context,
        context,
        context,
        context,
        context,
        context,
        context,
      );
      renderer.drawInstancedArrays(
        context,
        context,
        context,
        context,
        context,
        context,
        context,
        context,
      );
    }

    const profiler = new GCProfiler();

    profiler.start();

    const before = process.memoryUsage().heapUsed;

    for (let draw = 0; draw < MEASURED_DRAWS; draw += 1) {
      renderer.drawElements(
        context,
        context,
        context,
        context,
        context,
        context,
        context,
      );
      renderer.drawInstancedArrays(
        context,
        context,
        context,
        context,
        context,
        context,
        context,
        context,
      );
    }

    const after = process.memoryUsage().heapUsed;
    const collections = profiler.stop().statistics.length;

    arranged.postRender();

    expect(arranged.drawCalls.at(0)).toBe(2 * (WARM_UP_DRAWS + MEASURED_DRAWS));
    expect(collections).toBe(0);
    expect(after - before).toBeLessThan(HEAP_ALLOWANCE_BYTES);
  });
});
