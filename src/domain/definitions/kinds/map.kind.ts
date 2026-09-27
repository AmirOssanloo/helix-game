import type { Rect } from "@shared/public";
import { ENEMY_LIVE_CAP } from "../../entities/unit";
import {
  deriveWalkabilityGrid,
  HERO_RADIUS_CLASS,
  isBlockedAt,
  RADIUS_CLASS_KEYS,
} from "../../map/walkability";
import { rectSchema, vec2Schema } from "../common-schemas";
import type { ListKind } from "../definition-kind";
import { ENEMY_TIERS } from "../enemy-def";
import type { MapDef, PackDef } from "../map-def";
import type { ValidationContext } from "../registry-checks";
import { checkReference } from "../registry-checks";
import {
  arrayOf,
  booleanSchema,
  countSchema,
  idSchema,
  objectOf,
  oneOf,
} from "../schema";

const isInsideRect = (rect: Readonly<Rect>, x: number, y: number): boolean =>
  x >= rect.minX && x <= rect.maxX && y >= rect.minY && y <= rect.maxY;

/**
 * Every checkpoint of `map` stands inside the bounds, outside every obstacle, and on a cell
 * open to the hero's radius class of the grid the tuning table derives, so a hero brought back
 * there can stand and walk. The grid is derived only for a map that has checkpoints and bounds
 * with area, and each checkpoint is refused for the first of the three it breaks.
 */
const checkCheckpoints = (
  context: ValidationContext,
  file: string,
  map: MapDef,
): void => {
  const faults = context.faults;
  const tuning = context.registry.tuning;
  const bounds = map.bounds;

  if (
    map.checkpoints.length === 0 ||
    bounds.maxX <= bounds.minX ||
    bounds.maxY <= bounds.minY
  ) {
    return;
  }

  const grid = deriveWalkabilityGrid(
    bounds,
    map.obstacles,
    tuning.walkability_cell_size,
    RADIUS_CLASS_KEYS.map((key) => tuning[key]),
  );

  for (let index = 0; index < map.checkpoints.length; index += 1) {
    const checkpoint = map.checkpoints[index];

    if (checkpoint === undefined) {
      continue;
    }

    const path = `checkpoints[${String(index)}]`;
    const { x, y } = checkpoint;

    if (!isInsideRect(bounds, x, y)) {
      faults.push({
        file,
        path,
        message: "expected a point inside the bounds",
      });
    } else if (map.obstacles.some((obstacle) => isInsideRect(obstacle, x, y))) {
      faults.push({
        file,
        path,
        message: "expected a point outside every obstacle",
      });
    } else if (isBlockedAt(grid, HERO_RADIUS_CLASS, x, y)) {
      faults.push({
        file,
        path,
        message: "expected a point on a cell open to the hero's radius class",
      });
    }
  }
};

/**
 * Every map a world may load: its id, bounds, obstacles, spawn point, checkpoints, and packs.
 * Every checkpoint stands where a hero can, every pack names an archetype that exists, and no
 * pack holds more than the live enemy cap.
 */
export const mapKind: ListKind<"maps", MapDef, null> = {
  field: "maps",
  shape: "list",
  folder: "maps",
  namespace: "a map",
  nameOf: (def) => def.id,
  stage: "levelled",
  schema: () =>
    objectOf<MapDef>({
      id: idSchema,
      bounds: rectSchema,
      obstacles: arrayOf(rectSchema),
      spawnPoint: vec2Schema,
      checkpoints: arrayOf(vec2Schema),
      packs: arrayOf(
        objectOf<PackDef>({
          archetypeId: idSchema,
          tier: oneOf(ENEMY_TIERS),
          count: countSchema,
          position: vec2Schema,
          dormant: booleanSchema,
        }),
      ),
    }),
  check: (context, file, def): void => {
    const faults = context.faults;

    checkCheckpoints(context, file, def);

    for (let index = 0; index < def.packs.length; index += 1) {
      const pack = def.packs[index];

      if (pack === undefined) {
        continue;
      }

      checkReference(
        context,
        file,
        `packs[${String(index)}].archetypeId`,
        pack.archetypeId,
        context.space("enemy", ["enemies"]),
      );

      if (pack.count < 1 || pack.count > ENEMY_LIVE_CAP) {
        faults.push({
          file,
          path: `packs[${String(index)}].count`,
          message: `expected a pack of 1 to ${String(ENEMY_LIVE_CAP)}, the live enemy cap`,
        });
      }
    }
  },
  tuning: null,
};
