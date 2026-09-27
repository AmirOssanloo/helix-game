import type { AtlasFrameDef, AtlasShape } from "../atlas-frame-def";
import type { ListKind } from "../definition-kind";
import { noCheck } from "../registry-checks";
import type { Schema } from "../schema";
import {
  countSchema,
  nonNegativeSchema,
  objectOf,
  oneOf,
  stringSchema,
  taggedUnion,
} from "../schema";

const atlasShapeSchema: Schema<AtlasShape> = taggedUnion<"kind", AtlasShape>(
  "kind",
  {
    disc: objectOf({ kind: oneOf(["disc"]) }),
    ring: objectOf({ kind: oneOf(["ring"]), thickness: nonNegativeSchema }),
    square: objectOf({ kind: oneOf(["square"]) }),
    square_outline: objectOf({
      kind: oneOf(["square_outline"]),
      thickness: nonNegativeSchema,
    }),
    square_dot: objectOf({
      kind: oneOf(["square_dot"]),
      holeFraction: nonNegativeSchema,
    }),
    triangle: objectOf({ kind: oneOf(["triangle"]) }),
    cone: objectOf({
      kind: oneOf(["cone"]),
      angleDegrees: nonNegativeSchema,
    }),
    pixel: objectOf({ kind: oneOf(["pixel"]) }),
    wedge: objectOf({
      kind: oneOf(["wedge"]),
      step: countSchema,
      steps: countSchema,
    }),
    stripes: objectOf({
      kind: oneOf(["stripes"]),
      thickness: nonNegativeSchema,
    }),
    icon: objectOf({ kind: oneOf(["icon"]), glyph: stringSchema }),
    tile: objectOf({ kind: oneOf(["tile"]), image: stringSchema }),
    glyph: objectOf({ kind: oneOf(["glyph"]), character: stringSchema }),
  },
);

/**
 * The frame list every `atlasFrame` is checked against, in the order the bake lays it out: one
 * frame each, a name, a size in pixels, and a shape the bake knows. A frame is referenced by
 * its name and has no id, so a fault names it by its index.
 */
export const atlasFrameKind: ListKind<"atlasFrames", AtlasFrameDef, null> = {
  field: "atlasFrames",
  shape: "list",
  folder: "atlas-frames",
  namespace: "an atlas frame",
  nameOf: (def) => def.name,
  stage: "levelled",
  schema: () =>
    objectOf<AtlasFrameDef>({
      name: stringSchema,
      width: countSchema,
      height: countSchema,
      shape: atlasShapeSchema,
    }),
  check: noCheck,
  tuning: null,
};
