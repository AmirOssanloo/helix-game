import type {
  Effect,
  EffectId,
  GroundItem,
  GroundItemId,
  PackRecord,
  PoolView,
  Projectile,
  ProjectileId,
  RunScope,
  SpatialHashView,
  StoreRecord,
  Tick,
  Unit,
  UnitId,
  WalkabilityView,
  Zone,
  ZoneId,
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
    level: number;
    units: PoolView<Unit, UnitId>;
    projectiles: PoolView<Projectile, ProjectileId>;
    effects: PoolView<Effect, EffectId>;
    zones: PoolView<Zone, ZoneId>;
    groundItems: PoolView<GroundItem, GroundItemId>;
    groundItemCells: ArrayLike<number>;
    dropsNotMade: number;
    walkability: WalkabilityView;
    bounds: Readonly<Rect>;
    obstacles: readonly Rect[];
    spatialHash: SpatialHashView;
    spawnPoint: Readonly<Vec2>;
    checkpoints: readonly Readonly<Vec2>[];
    furthestCheckpoint: number;
    stores: readonly StoreRecord[];
    openStore: number;
    packs: readonly PackRecord[];
  };
}>;
