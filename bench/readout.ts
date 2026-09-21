import Phaser from "phaser";
import { ATLAS_FONT_KEY, installDrawCallCounter } from "@presentation/public";
import { RingBuffer } from "@shared/public";

/** How often the numbers are retyped: slow enough to read, fast enough to see a change land. */
const INTERVAL_MS = 250;

/** The font has no space glyph, so a row is two objects: a label column and a value column. */
const LEFT = 16;
const TOP = 16;
const VALUE_LEFT = 220;
const ROW_HEIGHT = 36;
/** A retro font's size is its glyph width, so this draws every glyph at its baked size. */
const FONT_SIZE = 20;

/** The debug band, above everything the scene draws. */
const DEPTH = 90;

const BYTES_PER_MB = 1024 * 1024;
const RENDER_MS_DECIMALS = 1;

/** What a measure shows where the browser or the renderer cannot supply it. */
const DASH = "-";

/** The used JS heap in MB, where the browser exposes it; only Chrome does. */
const readHeapMb = (): number | null => {
  const memory: unknown = Reflect.get(performance, "memory");

  if (typeof memory !== "object" || memory === null) {
    return null;
  }

  const used: unknown = Reflect.get(memory, "usedJSHeapSize");

  return typeof used === "number" ? used / BYTES_PER_MB : null;
};

const addRow = (
  scene: Phaser.Scene,
  row: number,
  label: string,
): Phaser.GameObjects.BitmapText => {
  const y = TOP + row * ROW_HEIGHT;

  scene.add
    .bitmapText(LEFT, y, ATLAS_FONT_KEY, label, FONT_SIZE)
    .setScrollFactor(0)
    .setDepth(DEPTH);

  return scene.add
    .bitmapText(VALUE_LEFT, y, ATLAS_FONT_KEY, DASH, FONT_SIZE)
    .setScrollFactor(0)
    .setDepth(DEPTH);
};

/** A ring the counter writes and this readout reads: one sample per frame is all it keeps. */
const RING_CAPACITY = 1;

/** A ring of one sample, so the readout reads the last frame's count and nothing older. */
const oneSampleRing = (): RingBuffer<number> =>
  new RingBuffer<number>(RING_CAPACITY, () => 0);

/**
 * The corner readout: frame rate as the game loop measures it, the mean CPU time between the
 * renderer's pre-render and post-render events, the most draw calls any frame took, the used
 * heap, and the texture units per batch the renderer came up with. Every number is a
 * `BitmapText` from the atlas font, so the readout itself adds no draw call. The heap and the
 * draw calls show a dash where they cannot be read: draw calls are counted by the game's own
 * counter, installed here on the WebGL renderer, so the benchmark and the panel agree.
 */
export class Readout {
  private readonly game: Phaser.Game;

  /** The last frame's draw calls, or `null` under the Canvas renderer. */
  private readonly drawCallRing: RingBuffer<number> | null;

  private readonly fps: Phaser.GameObjects.BitmapText;

  private readonly renderMs: Phaser.GameObjects.BitmapText;

  private readonly drawCalls: Phaser.GameObjects.BitmapText;

  private readonly heapMb: Phaser.GameObjects.BitmapText;

  private elapsedMs = 0;

  private renderStartMs = 0;

  private renderTotalMs = 0;

  private renderFrames = 0;

  private maxDrawCalls = 0;

  constructor(scene: Phaser.Scene) {
    this.game = scene.sys.game;
    this.fps = addRow(scene, 0, "FPS");
    this.renderMs = addRow(scene, 1, "RENDER");
    this.drawCalls = addRow(scene, 2, "DRAWS");
    this.heapMb = addRow(scene, 3, "HEAP");

    const renderer = this.game.renderer;
    const textures = addRow(scene, 4, "TEXTURES");

    if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      textures.setText(String(renderer.maxTextures));

      const drawCalls = oneSampleRing();

      installDrawCallCounter(
        renderer,
        { drawCalls, worldDrawCalls: oneSampleRing() },
        scene.sys.settings.key,
      );
      this.drawCallRing = drawCalls;
    } else {
      this.drawCallRing = null;
    }

    renderer.on(Phaser.Renderer.Events.PRE_RENDER, (): void => {
      this.renderStartMs = performance.now();
    });

    renderer.on(Phaser.Renderer.Events.POST_RENDER, (): void => {
      this.renderTotalMs += performance.now() - this.renderStartMs;
      this.renderFrames += 1;
    });
  }

  /** Folds the last frame into the window and retypes the rows when the window is up. */
  update(deltaMs: number): void {
    const lastFrame =
      this.drawCallRing === null ? null : this.drawCallRing.at(0);

    if (lastFrame !== null) {
      this.maxDrawCalls = Math.max(this.maxDrawCalls, lastFrame);
    }

    this.elapsedMs += deltaMs;

    if (this.elapsedMs < INTERVAL_MS) {
      return;
    }

    this.elapsedMs -= INTERVAL_MS;

    const meanRenderMs =
      this.renderFrames === 0 ? 0 : this.renderTotalMs / this.renderFrames;
    const heap = readHeapMb();

    this.fps.setText(String(Math.round(this.game.loop.actualFps)));
    this.renderMs.setText(meanRenderMs.toFixed(RENDER_MS_DECIMALS));
    this.drawCalls.setText(
      this.drawCallRing === null ? DASH : String(this.maxDrawCalls),
    );
    this.heapMb.setText(heap === null ? DASH : String(Math.round(heap)));

    this.renderTotalMs = 0;
    this.renderFrames = 0;
    this.maxDrawCalls = 0;
  }
}
