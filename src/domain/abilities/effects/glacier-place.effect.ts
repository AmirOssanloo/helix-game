import type { SpawnZoneEffectDef } from "../../definitions/effect-def";
import type { Schema } from "../../definitions/schema";
import {
  countSchema,
  nonNegativeSchema,
  objectOf,
  oneOf,
  recordSchema,
} from "../../definitions/schema";
import type { World } from "../../entities/world-state";
import type { Cast } from "../cast-context";
import { createCastRecord, fillCast } from "../cast-context";
import { spawnZone } from "../primitives/spawn-zone";
import type { NamedEffect, NamedEffectNesting } from "./index";

/** A quarter turn in radians: the angle between the caster's facing and the line the segments lie on when the cast carries no direction. */
const ACROSS = Math.PI / 2;

/** The centre of a row of `count` segments sits between them, which is half a segment less than half the row. */
const HALF = 2;

/** The fields the entry naming this effect carries: how many segments, how far apart, and the zone each one is. */
export type GlacierPlaceFields = Readonly<{
  segments: number;
  spacing: number;
  zone: SpawnZoneEffectDef;
}>;

/**
 * The segment zone as far as this function can check it: an object naming the spawn-zone
 * kind. Everything else about it is an effect entry's, and an effect entry is checked
 * against the schema that knows the orb level cap, which no function beside an effect knows.
 * The registry does that, and reads the entry back through the nesting below.
 */
const zoneEntrySchema: Schema<SpawnZoneEffectDef> = (
  value,
  path,
  faults,
): value is SpawnZoneEffectDef =>
  recordSchema(value, path, faults) &&
  oneOf(["spawn_zone"])(value.kind, `${path}.kind`, faults);

/** The schema the registry validates an entry's fields against when content is loaded. */
export const glacierPlaceFields: Schema<GlacierPlaceFields> =
  objectOf<GlacierPlaceFields>({
    segments: countSchema,
    spacing: nonNegativeSchema,
    zone: zoneEntrySchema,
  });

/** The one effect entry the fields carry, for the registry to check as an entry of its own. */
export const glacierPlaceNested: NamedEffectNesting = (fields) => [
  { path: "zone", entry: (fields as GlacierPlaceFields).zone },
];

/**
 * The fields as the shape beside them, which the registry proved before a world existed. A
 * check here would allocate a fault list on the hot path to learn what content already knows.
 */
const fieldsOf = (
  fields: Readonly<Record<string, unknown>>,
): GlacierPlaceFields => fields as GlacierPlaceFields;

/** Scratch for the context each segment is spawned with, reused for every segment of every cast. */
const segment = createCastRecord();

/**
 * Glacier's wall: one zone per segment on a line through the anchor, `spacing` apart and
 * centred on it, so an odd count puts one segment on the anchor and an even one leaves the
 * middle open. The line is the cast's direction, the bearing of the drag that aimed it; a
 * cast with none lays it across the caster's facing, which at commit is the line from the
 * caster to the anchor. Each segment is turned along the line, which is what makes the
 * entry's length the wall's width and its width the wall's depth.
 *
 * Nothing else about a segment is this function's: the shape, the clock, the lists, and the
 * colour are the entry's, and the zone rule places each one as it places any other. A pool
 * with no room leaves the rest of the row unplaced, which the pool counts as a miss.
 */
export const glacierPlaceEffect: NamedEffect = (
  world: World,
  cast: Cast,
  fields: Readonly<Record<string, unknown>>,
): void => {
  const { segments, spacing, zone } = fieldsOf(fields);
  const line = cast.direction ?? cast.facing + ACROSS;
  const alongX = Math.cos(line);
  const alongY = Math.sin(line);
  const first = -((segments - 1) / HALF) * spacing;

  for (let index = 0; index < segments; index += 1) {
    const offset = first + index * spacing;

    spawnZone(
      world,
      fillCast(
        segment,
        cast.casterId,
        cast.ability,
        cast.orbLevels,
        cast.anchor.x + alongX * offset,
        cast.anchor.y + alongY * offset,
        line,
        null,
      ),
      zone,
    );
  }
};
