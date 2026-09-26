import type {
  Effect,
  PackRecord,
  PoolView,
  Projectile,
  RunScope,
  SpatialHashView,
  Tick,
  Unit,
  WalkabilityView,
  Zone,
} from "@domain/public";
import type { DeepReadonly, Rect, Vec2 } from "@shared/public";

/**
 * A compile-time read-only view over the live world: read by reference during sync, never
 * copied, never written. Each pool shows its read side only, so `acquire` and `release` are
 * not reachable through it, and every field under it is `readonly` at every depth.
 */
export type WorldView = DeepReadonly<{
  tick: Tick;
  run: RunScope;
  map: {
    mapId: string;
    units: PoolView<Unit>;
    projectiles: PoolView<Projectile>;
    effects: PoolView<Effect>;
    zones: PoolView<Zone>;
    walkability: WalkabilityView;
    bounds: Readonly<Rect>;
    obstacles: readonly Rect[];
    spatialHash: SpatialHashView;
    spawnPoint: Readonly<Vec2>;
    checkpoints: readonly Readonly<Vec2>[];
    furthestCheckpoint: number;
    packs: readonly PackRecord[];
  };
}>;
