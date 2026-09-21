import Phaser from "phaser";
import type { AtlasFrameList } from "@domain/public";
import { type AtlasLayout, layoutAtlas } from "./atlas-layout";
import { paintAtlas } from "./shape-painter";

/** The one texture every quad draws from. */
export const ATLAS_TEXTURE_KEY = "atlas";

/** The bitmap font every `BitmapText` draws with; its glyphs are frames of the atlas texture. */
export const ATLAS_FONT_KEY = "atlas_font";

/** The atlas has one source, the canvas. */
const CANVAS_SOURCE_INDEX = 0;

/** The glyph cells touch, so the font reads them with no spacing and no extra line height. */
const GLYPH_SPACING = 0;
const LINE_SPACING = 0;

const PNG_MIME_TYPE = "image/png";

/**
 * Draws every frame of the list onto one canvas at boot and registers it as one Phaser texture
 * with named frames, plus the bitmap font over its glyph grid. The layout is fixed when the
 * atlas is constructed; the canvas exists once `bake` has run in a scene. Everything on screen
 * is a white quad from here, tinted.
 */
export class ShapeAtlas {
  private readonly layout: AtlasLayout;

  private canvas: HTMLCanvasElement | null = null;

  constructor(frames: AtlasFrameList) {
    this.layout = layoutAtlas(frames);
  }

  /** Draws the atlas and registers the texture and the font on the scene's game. Once per game, before any scene draws. */
  bake(scene: Phaser.Scene): void {
    const canvas = document.createElement("canvas");

    canvas.width = this.layout.width;
    canvas.height = this.layout.height;

    const context = canvas.getContext("2d");

    if (context === null) {
      throw new Error("The shape atlas needs a 2D canvas context to bake into");
    }

    paintAtlas(context, this.layout);

    const texture = scene.textures.addCanvas(ATLAS_TEXTURE_KEY, canvas);

    if (texture === null) {
      throw new Error(
        `The texture key "${ATLAS_TEXTURE_KEY}" is already in use`,
      );
    }

    // The font goes on before any frame: the parser measures its glyph grid from the texture's
    // first frame, which is the base frame at the origin only until a named frame is added.
    if (this.layout.font !== null) {
      const font = this.layout.font;

      // The parser returns the cache entry itself, texture key and all, whatever its declared type says.
      scene.cache.bitmapFont.add(
        ATLAS_FONT_KEY,
        Phaser.GameObjects.RetroFont.Parse(scene, {
          image: ATLAS_TEXTURE_KEY,
          "offset.x": font.x,
          "offset.y": font.y,
          width: font.glyphWidth,
          height: font.glyphHeight,
          chars: font.chars,
          charsPerRow: font.charsPerRow,
          "spacing.x": GLYPH_SPACING,
          "spacing.y": GLYPH_SPACING,
          lineSpacing: LINE_SPACING,
        }),
      );
    }

    for (const { frame, x, y } of this.layout.frames) {
      const added = texture.add(
        frame.name,
        CANVAS_SOURCE_INDEX,
        x,
        y,
        frame.width,
        frame.height,
      );

      if (added === null) {
        throw new Error(
          `The atlas frame "${frame.name}" is already registered`,
        );
      }
    }

    this.canvas = canvas;
  }

  /** The baked width of the frame `name`, for a view to turn a world size into a scale. A name not in the list is an error. */
  frameWidth(name: string): number {
    for (const placed of this.layout.frames) {
      if (placed.frame.name === name) {
        return placed.frame.width;
      }
    }

    throw new Error(`The atlas has no frame "${name}"`);
  }

  /** The baked atlas as a PNG data URL, for the developer panel to save so a person can look at every frame. */
  download(): string {
    if (this.canvas === null) {
      throw new Error("The shape atlas has not been baked yet");
    }

    return this.canvas.toDataURL(PNG_MIME_TYPE);
  }
}
