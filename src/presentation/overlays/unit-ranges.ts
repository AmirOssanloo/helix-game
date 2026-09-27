import type { Unit } from "@domain/public";
import type { DeepReadonly } from "@shared/public";
import type { WorldView } from "@simulation/public";
import type { ScreenUnits } from "../camera/screen-units";
import type { Quad } from "../views/quad";
import { interpolate } from "../views/quad";
import { QuadRun } from "../views/quad-run";
import { layRing } from "./overlay-marks";

const ATTACK_RANGE_TINT = 0xff5050;
const ACQUIRE_TINT = 0xffa040;
const AGGRO_TINT = 0xffe040;
const LEASH_TINT = 0x60a0ff;

/**
 * The ranges the fight is decided by. On the hero, its attack range as far as a target's edge,
 * the range and its bound radius, and the acquire radius an attack-move searches; on each
 * enemy on screen with a definition, the aggro radius around where it stands and the leash
 * radius around its leash anchor, which is what the machine measures each from. A radius of
 * zero, the training dummy's, draws nothing.
 */
export class UnitRanges {
  private readonly hero: QuadRun;

  private readonly aggro: QuadRun;

  private readonly leash: QuadRun;

  private readonly scalePerUnit: number;

  constructor(
    hero: readonly Quad[],
    aggro: readonly Quad[],
    leash: readonly Quad[],
    frameWidth: number,
  ) {
    this.hero = new QuadRun(hero);
    this.aggro = new QuadRun(aggro);
    this.leash = new QuadRun(leash);
    this.scalePerUnit = 1 / frameWidth;
  }

  get misses(): number {
    return this.hero.misses + this.aggro.misses + this.leash.misses;
  }

  sync(world: WorldView, units: ScreenUnits, alpha: number): void {
    const ids = units.ids;

    for (let index = 0; index < units.count; index += 1) {
      const id = ids[index];
      const unit = id === undefined ? null : world.map.units.resolve(id);

      if (unit === null) {
        continue;
      }

      if (unit.kind === "hero") {
        this.ringHero(world, unit, alpha);
      } else if (unit.kind === "enemy") {
        this.ringEnemy(world, unit, alpha);
      }
    }

    this.finish();
  }

  hide(): void {
    this.finish();
  }

  private ringHero(
    world: WorldView,
    hero: DeepReadonly<Unit>,
    alpha: number,
  ): void {
    const attack = world.run.heroAttack.def;
    const x = interpolate(hero.prev.x, hero.curr.x, alpha);
    const y = interpolate(hero.prev.y, hero.curr.y, alpha);

    this.ring(
      this.hero,
      x,
      y,
      attack.range + hero.boundRadius,
      ATTACK_RANGE_TINT,
    );
    this.ring(this.hero, x, y, attack.acquireRadius, ACQUIRE_TINT);
  }

  private ringEnemy(
    world: WorldView,
    unit: DeepReadonly<Unit>,
    alpha: number,
  ): void {
    const definitionId = unit.definitionId;
    const record =
      definitionId === null ? undefined : world.run.units.get(definitionId);

    if (record === undefined) {
      return;
    }

    this.ring(
      this.aggro,
      interpolate(unit.prev.x, unit.curr.x, alpha),
      interpolate(unit.prev.y, unit.curr.y, alpha),
      record.def.aggroRadius,
      AGGRO_TINT,
    );
    this.ring(
      this.leash,
      unit.ai.leashAnchor.x,
      unit.ai.leashAnchor.y,
      record.def.leashRadius,
      LEASH_TINT,
    );
  }

  private ring(
    run: QuadRun,
    x: number,
    y: number,
    radius: number,
    tint: number,
  ): void {
    if (radius <= 0) {
      return;
    }

    const quad = run.take();

    if (quad !== null) {
      layRing(quad, x, y, radius, this.scalePerUnit, tint);
    }
  }

  private finish(): void {
    this.hero.finish();
    this.aggro.finish();
    this.leash.finish();
  }
}
