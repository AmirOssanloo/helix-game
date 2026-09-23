import Phaser from "phaser";
import type { AtlasFrameDef, AtlasFrameList } from "@domain/public";
import { type AtlasLayout, layoutAtlas, sizeTileFrames } from "./atlas-layout";
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

/** A tile's image is loaded as a texture of its own under this prefix, and removed once it is copied in. */
const IMAGE_TEXTURE_PREFIX = "atlas_image_";

const imageTextureKey = (image: string): string =>
  `${IMAGE_TEXTURE_PREFIX}${image}`;

/** Every image a tile frame of the list names, once each. */
const tileImagesOf = (frames: AtlasFrameList): readonly string[] => [
  ...new Set(
    frames.flatMap((frame) =>
      frame.shape.kind === "tile" ? [frame.shape.image] : [],
    ),
  ),
];

/**
 * Draws every frame of the list onto one canvas at boot and registers it as one Phaser texture
 * with named frames, plus the bitmap font over its glyph grid. A tile frame is copied from an
 * image a person painted, loaded from the address `imageUrls` gives its key; everything else is
 * a white quad, tinted. The layout is fixed at `bake`, once the images' sizes are known.
 */
export class ShapeAtlas {
  private readonly frames: AtlasFrameList;

  private readonly imageUrls: ReadonlyMap<string, string>;

  private layout: AtlasLayout | null = null;

  private canvas: HTMLCanvasElement | null = null;

  /** How many wedge frames the list holds: the steps of a cooldown sweep. */
  readonly wedgeSteps: number;

  constructor(frames: AtlasFrameList, imageUrls: ReadonlyMap<string, string>) {
    for (const image of tileImagesOf(frames)) {
      if (!imageUrls.has(image)) {
        throw new Error(
          `The frame list paints a tile from the image "${image}", and no address was given for it`,
        );
      }
    }

    this.frames = frames;
    this.imageUrls = imageUrls;
    this.wedgeSteps = frames.filter(
      (frame) => frame.shape.kind === "wedge",
    ).length;
  }

  /** Queues every tile's image on the scene's loader. From the `preload` of the scene that bakes. */
  preload(scene: Phaser.Scene): void {
    for (const image of tileImagesOf(this.frames)) {
      const url = this.imageUrls.get(image);

      if (url !== undefined) {
        scene.load.image(imageTextureKey(image), url);
      }
    }
  }

  /**
   * Draws the atlas and registers the texture and the font on the scene's game. Once per game,
   * after `preload`, before any scene draws. A tile image that did not load, or is not a whole
   * number of its art diamonds, stops it with the rule in the message.
   */
  bake(scene: Phaser.Scene): void {
    const images = new Map<string, HTMLImageElement | HTMLCanvasElement>();

    for (const image of tileImagesOf(this.frames)) {
      const key = imageTextureKey(image);

      if (!scene.textures.exists(key)) {
        throw new Error(
          `The tile image "${image}" did not load from ${this.imageUrls.get(image) ?? "no address"}`,
        );
      }

      const source = scene.textures.get(key).getSourceImage();

      if (
        !(source instanceof HTMLImageElement) &&
        !(source instanceof HTMLCanvasElement)
      ) {
        throw new Error(
          `The tile image "${image}" is not an image or a canvas`,
        );
      }

      images.set(image, source);
    }

    const layout = layoutAtlas(
      sizeTileFrames(this.frames, (image) => {
        const source = images.get(image);

        if (source === undefined) {
          throw new Error(`The tile image "${image}" was never loaded`);
        }

        return { width: source.width, height: source.height };
      }),
    );
    const canvas = document.createElement("canvas");

    canvas.width = layout.width;
    canvas.height = layout.height;

    const context = canvas.getContext("2d");

    if (context === null) {
      throw new Error("The shape atlas needs a 2D canvas context to bake into");
    }

    paintAtlas(context, layout, (image) => {
      const source = images.get(image);

      if (source === undefined) {
        throw new Error(`The tile image "${image}" was never loaded`);
      }

      return source;
    });

    // Copied into the atlas, the loaded images are not drawn from again: one texture stays.
    for (const image of images.keys()) {
      scene.textures.remove(imageTextureKey(image));
    }

    const texture = scene.textures.addCanvas(ATLAS_TEXTURE_KEY, canvas);

    if (texture === null) {
      throw new Error(
        `The texture key "${ATLAS_TEXTURE_KEY}" is already in use`,
      );
    }

    // The font goes on before any frame: the parser measures its glyph grid from the texture's
    // first frame, which is the base frame at the origin only until a named frame is added.
    if (layout.font !== null) {
      const font = layout.font;

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

    for (const { frame, x, y } of layout.frames) {
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

    this.layout = layout;
    this.canvas = canvas;
  }

  /** The baked width of the frame `name`, for a view to turn a world size into a scale. A name not in the list is an error. */
  frameWidth(name: string): number {
    return this.bakedFrame(name).width;
  }

  /** The baked height of the frame `name`: a tile's is its image's. A name not in the list is an error. */
  frameHeight(name: string): number {
    return this.bakedFrame(name).height;
  }

  /** The baked atlas as a PNG data URL, for the developer panel to save so a person can look at every frame. */
  download(): string {
    if (this.canvas === null) {
      throw new Error("The shape atlas has not been baked yet");
    }

    return this.canvas.toDataURL(PNG_MIME_TYPE);
  }

  private bakedFrame(name: string): AtlasFrameDef {
    if (this.layout === null) {
      throw new Error("The shape atlas has not been baked yet");
    }

    for (const placed of this.layout.frames) {
      if (placed.frame.name === name) {
        return placed.frame;
      }
    }

    throw new Error(`The atlas has no frame "${name}"`);
  }
}
