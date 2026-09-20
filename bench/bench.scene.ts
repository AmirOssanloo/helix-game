import Phaser from "phaser";
import { WEDGE_STEPS } from "@content/public";
import type { RandomState } from "@domain/public";
import type { ShapeAtlas } from "@presentation/public";
import { ATLAS_FONT_KEY, ATLAS_TEXTURE_KEY } from "@presentation/public";
import { createRandomState, nextFloat } from "@simulation/public";
import { countDrawCalls } from "./draw-calls";
import { Readout } from "./readout";

/**
 * The render benchmark: the caps' worth of quads, rings, wedges, and bitmap text over one atlas
 * under a following camera, so the render path is measured before a view depends on it. Every
 * object is created once in `create` and only written to after that; nothing is created,
 * destroyed, or drawn at runtime.
 *
 * Expected on the reference laptop, in Chrome and Safari, over 30 seconds, once as the game
 * is configured and once with `?textures=default`:
 *
 * | Measure     | Pass                                     |
 * | ----------- | ---------------------------------------- |
 * | Frame rate  | 60, steady                               |
 * | Render time | under 6 ms; 2 to 3 is the target         |
 * | Draw calls  | under 5 per frame                        |
 * | Heap        | flat after warm-up, in the browser panel |
 *
 * The readout in the corner shows the first three and the used heap where the browser exposes
 * it. Draw calls over the limit mean something broke the batch; render time over budget with
 * draw calls fine means an allocation or a `Text` update.
 *
 * What it drives, every frame: 300 tinted unit quads, each orbiting a point, with a tenth
 * flashing white for a moment each second; 100 projectile quads through a pool, 20 spawned a
 * second and each released after five, so the pool is full in steady state; 30 ring, disc,
 * cone, and line quads changing scale, rotation, and alpha, the triangle standing in for a
 * cone until a spell bakes one; 6 wedges stepping through every frame of the sheet; 50
 * `BitmapText` numbers retyped and moved; 50 static obstacle quads; and a camera following a
 * hero-sized quad around the middle at 1920 by 1080 with `Scale.FIT`.
 */

export const BENCH_SCENE_KEY = "bench";

/** The same seed every run, so two recordings drive the same picture. */
const SCATTER_SEED = 1;

const MS_PER_SECOND = 1000;
const TWO_PI = Math.PI * 2;

/** The map the camera is clamped to, and the smaller region every object stays inside so nothing leaves the view. */
const WORLD_WIDTH = 2400;
const WORLD_HEIGHT = 1500;
const REGION_WIDTH = 1800;
const REGION_HEIGHT = 1000;
const REGION_LEFT = (WORLD_WIDTH - REGION_WIDTH) / 2;
const REGION_TOP = (WORLD_HEIGHT - REGION_HEIGHT) / 2;

/** The depth bands the game draws in. */
const DEPTH_GROUND = 0;
const DEPTH_OBSTACLES = 10;
const DEPTH_UNITS = 20;
const DEPTH_PROJECTILES = 30;
const DEPTH_AIR = 40;
const DEPTH_TEXT = 50;

/** Units: one quad each, orbiting a point at its own rate; the first tenth flash white for a moment each second. */
const UNIT_COUNT = 300;
const FLASHING_UNIT_COUNT = UNIT_COUNT / 10;
const UNIT_DIAMETER = 40;
const UNIT_ORBIT_MIN = 20;
const UNIT_ORBIT_MAX = 80;
const UNIT_RATE_MIN = 0.5;
const UNIT_RATE_MAX = 2;
const FLASH_PERIOD_MS = 1000;
const FLASH_LENGTH_MS = 100;
const WHITE = 0xffffff;

/** Projectiles: a pool of quads, spawned at a steady rate and released after a lifetime, wrapping at the region's edges. */
const PROJECTILE_POOL_SIZE = 100;
const PROJECTILE_SPAWN_PER_SECOND = 20;
const PROJECTILE_LIFETIME_MS =
  (PROJECTILE_POOL_SIZE / PROJECTILE_SPAWN_PER_SECOND) * MS_PER_SECOND;
const PROJECTILE_DIAMETER = 12;
const PROJECTILE_SPEED = 400;
const PROJECTILE_TINT = 0xffe066;

/** Effects: each frame kind in turn, pulsing in size, turning, and fading in and out. */
const EFFECT_COUNT = 30;
const EFFECT_FRAMES = [
  "ring_thin",
  "ring_thick",
  "disc",
  "triangle",
  "pixel",
] as const;
const LINE_FRAME = "pixel";
const EFFECT_SIZE_MIN = 80;
const EFFECT_SIZE_MAX = 240;
const EFFECT_PULSE = 0.5;
const EFFECT_RATE_MIN = 0.5;
const EFFECT_RATE_MAX = 3;
const EFFECT_ALPHA_MIN = 0.3;
const EFFECT_ALPHA_MAX = 0.9;
const EFFECT_TINT = 0x66ccff;
const LINE_THICKNESS = 6;

/** Wedges: a cooldown sweep each, stepping through the sheet, each a few steps ahead of the last. */
const WEDGE_COUNT = 6;
const WEDGE_SIZE = 96;
const WEDGE_STEP_MS = 30;
const WEDGE_OFFSET_STEPS = 8;
const WEDGE_SPACING = 120;
const WEDGE_TINT = 0xffffff;

/** Numbers: a bitmap text each, retyped and moved every frame. */
const NUMBER_COUNT = 50;
/** A retro font's size is its glyph width, so this draws every glyph at its baked size. */
const NUMBER_FONT_SIZE = 20;
const NUMBER_DRIFT = 40;
const NUMBER_RATE_MIN = 0.5;
const NUMBER_RATE_MAX = 2;
const NUMBER_STRIDE = 1000;

/** Obstacles: static squares. */
const OBSTACLE_COUNT = 50;
const OBSTACLE_SIZE_MIN = 60;
const OBSTACLE_SIZE_MAX = 120;
const OBSTACLE_TINT = 0x555555;

/** The camera follows a hero-sized quad circling the middle of the region. */
const TARGET_DIAMETER = 48;
const TARGET_ORBIT = 60;
const TARGET_RATE = 0.4;
const TARGET_TINT = 0xff66aa;
const CAMERA_LERP = 0.1;

type Image = Phaser.GameObjects.Image;

type Unit = Readonly<{
  view: Image;
  centreX: number;
  centreY: number;
  orbit: number;
  rate: number;
  phase: number;
  tint: number;
}>;

type Projectile = {
  readonly view: Image;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  /** Milliseconds alive, or -1 while the slot is free. */
  ageMs: number;
};

type Effect = Readonly<{
  view: Image;
  isLine: boolean;
  size: number;
  rate: number;
  phase: number;
}>;

type NumberText = Readonly<{
  view: Phaser.GameObjects.BitmapText;
  x: number;
  y: number;
  rate: number;
  offset: number;
}>;

const FREE = -1;

const between = (random: RandomState, min: number, max: number): number =>
  min + nextFloat(random) * (max - min);

/** A fully saturated colour at `hue` in [0, 1), as a tint. */
const hueToTint = (hue: number): number => {
  const channel = (offset: number): number => {
    const k = (offset + hue * 6) % 6;

    return Math.round(255 * (1 - Math.max(0, Math.min(k, 4 - k, 1))));
  };

  return (channel(5) << 16) | (channel(3) << 8) | channel(1);
};

const wrap = (value: number, min: number, size: number): number => {
  const offset = (value - min) % size;

  return min + (offset < 0 ? offset + size : offset);
};

export class BenchScene extends Phaser.Scene {
  private readonly atlas: ShapeAtlas;

  private readonly random: RandomState = createRandomState(SCATTER_SEED);

  private readonly units: Unit[] = [];

  private readonly projectiles: Projectile[] = [];

  private readonly effects: Effect[] = [];

  private readonly wedges: Image[] = [];

  private readonly wedgeFrames: readonly string[] = Array.from(
    { length: WEDGE_STEPS },
    (_, index): string => `wedge_${index + 1}`,
  );

  private readonly numbers: NumberText[] = [];

  private target: Image | null = null;

  private readout: Readout | null = null;

  private spawnDebt = 0;

  constructor(atlas: ShapeAtlas) {
    super({ key: BENCH_SCENE_KEY });
    this.atlas = atlas;
  }

  create(): void {
    this.atlas.bake(this);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createObstacles();
    this.createUnits();
    this.createProjectiles();
    this.createEffects();
    this.createWedges();
    this.createNumbers();

    const target = this.add
      .image(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, ATLAS_TEXTURE_KEY, "disc")
      .setDisplaySize(TARGET_DIAMETER, TARGET_DIAMETER)
      .setTint(TARGET_TINT)
      .setDepth(DEPTH_UNITS);

    this.cameras.main.startFollow(target, false, CAMERA_LERP, CAMERA_LERP);
    this.target = target;
    this.readout = new Readout(this, countDrawCalls(this.sys.game.renderer));
  }

  override update(time: number, delta: number): void {
    const seconds = time / MS_PER_SECOND;

    this.moveTarget(seconds);
    this.moveUnits(seconds, time);
    this.moveProjectiles(delta);
    this.animateEffects(seconds);
    this.sweepWedges(time);
    this.retypeNumbers(seconds, time);

    if (this.readout !== null) {
      this.readout.update(delta);
    }
  }

  private regionX(): number {
    return REGION_LEFT + nextFloat(this.random) * REGION_WIDTH;
  }

  private regionY(): number {
    return REGION_TOP + nextFloat(this.random) * REGION_HEIGHT;
  }

  private createObstacles(): void {
    for (let index = 0; index < OBSTACLE_COUNT; index += 1) {
      const size = between(this.random, OBSTACLE_SIZE_MIN, OBSTACLE_SIZE_MAX);

      this.add
        .image(this.regionX(), this.regionY(), ATLAS_TEXTURE_KEY, "square")
        .setDisplaySize(size, size)
        .setTint(OBSTACLE_TINT)
        .setDepth(DEPTH_OBSTACLES);
    }
  }

  private createUnits(): void {
    for (let index = 0; index < UNIT_COUNT; index += 1) {
      const tint = hueToTint(index / UNIT_COUNT);
      const view = this.add
        .image(0, 0, ATLAS_TEXTURE_KEY, "disc")
        .setDisplaySize(UNIT_DIAMETER, UNIT_DIAMETER)
        .setTint(tint)
        .setDepth(DEPTH_UNITS);

      this.units.push({
        view,
        centreX: this.regionX(),
        centreY: this.regionY(),
        orbit: between(this.random, UNIT_ORBIT_MIN, UNIT_ORBIT_MAX),
        rate: between(this.random, UNIT_RATE_MIN, UNIT_RATE_MAX),
        phase: nextFloat(this.random) * TWO_PI,
        tint,
      });
    }
  }

  private createProjectiles(): void {
    for (let index = 0; index < PROJECTILE_POOL_SIZE; index += 1) {
      const view = this.add
        .image(0, 0, ATLAS_TEXTURE_KEY, "disc")
        .setDisplaySize(PROJECTILE_DIAMETER, PROJECTILE_DIAMETER)
        .setTint(PROJECTILE_TINT)
        .setDepth(DEPTH_PROJECTILES)
        .setVisible(false);

      this.projectiles.push({
        view,
        x: 0,
        y: 0,
        velocityX: 0,
        velocityY: 0,
        ageMs: FREE,
      });
    }
  }

  private createEffects(): void {
    for (let index = 0; index < EFFECT_COUNT; index += 1) {
      const frame = EFFECT_FRAMES[index % EFFECT_FRAMES.length] ?? LINE_FRAME;
      const isLine = frame === LINE_FRAME;
      const view = this.add
        .image(this.regionX(), this.regionY(), ATLAS_TEXTURE_KEY, frame)
        .setTint(EFFECT_TINT)
        .setDepth(isLine ? DEPTH_AIR : DEPTH_GROUND);

      if (isLine) {
        view.setOrigin(0, 0.5);
      }

      this.effects.push({
        view,
        isLine,
        size: between(this.random, EFFECT_SIZE_MIN, EFFECT_SIZE_MAX),
        rate: between(this.random, EFFECT_RATE_MIN, EFFECT_RATE_MAX),
        phase: nextFloat(this.random) * TWO_PI,
      });
    }
  }

  private createWedges(): void {
    const left = WORLD_WIDTH / 2 - ((WEDGE_COUNT - 1) * WEDGE_SPACING) / 2;
    const top = REGION_TOP + WEDGE_SIZE;

    for (let index = 0; index < WEDGE_COUNT; index += 1) {
      this.wedges.push(
        this.add
          .image(
            left + index * WEDGE_SPACING,
            top,
            ATLAS_TEXTURE_KEY,
            "wedge_1",
          )
          .setDisplaySize(WEDGE_SIZE, WEDGE_SIZE)
          .setTint(WEDGE_TINT)
          .setDepth(DEPTH_AIR),
      );
    }
  }

  private createNumbers(): void {
    for (let index = 0; index < NUMBER_COUNT; index += 1) {
      const x = this.regionX();
      const y = this.regionY();

      this.numbers.push({
        view: this.add
          .bitmapText(x, y, ATLAS_FONT_KEY, "0", NUMBER_FONT_SIZE)
          .setDepth(DEPTH_TEXT),
        x,
        y,
        rate: between(this.random, NUMBER_RATE_MIN, NUMBER_RATE_MAX),
        offset: index * NUMBER_STRIDE,
      });
    }
  }

  private moveTarget(seconds: number): void {
    if (this.target === null) {
      return;
    }

    const angle = seconds * TARGET_RATE * TWO_PI;

    this.target.setPosition(
      WORLD_WIDTH / 2 + Math.cos(angle) * TARGET_ORBIT,
      WORLD_HEIGHT / 2 + Math.sin(angle) * TARGET_ORBIT,
    );
  }

  private moveUnits(seconds: number, timeMs: number): void {
    const flashing = timeMs % FLASH_PERIOD_MS < FLASH_LENGTH_MS;

    for (let index = 0; index < this.units.length; index += 1) {
      const unit = this.units[index];

      if (unit === undefined) {
        continue;
      }

      const angle = unit.phase + seconds * unit.rate;

      unit.view.setPosition(
        unit.centreX + Math.cos(angle) * unit.orbit,
        unit.centreY + Math.sin(angle) * unit.orbit,
      );
      unit.view.setRotation(angle);

      if (index < FLASHING_UNIT_COUNT) {
        unit.view.setTint(flashing ? WHITE : unit.tint);
        unit.view.setTintMode(
          flashing ? Phaser.TintModes.FILL : Phaser.TintModes.MULTIPLY,
        );
      }
    }
  }

  private spawnProjectile(): void {
    for (const projectile of this.projectiles) {
      if (projectile.ageMs !== FREE) {
        continue;
      }

      const heading = nextFloat(this.random) * TWO_PI;

      projectile.x = this.regionX();
      projectile.y = this.regionY();
      projectile.velocityX = Math.cos(heading) * PROJECTILE_SPEED;
      projectile.velocityY = Math.sin(heading) * PROJECTILE_SPEED;
      projectile.ageMs = 0;
      projectile.view.setVisible(true);

      return;
    }
  }

  private moveProjectiles(deltaMs: number): void {
    this.spawnDebt += (deltaMs / MS_PER_SECOND) * PROJECTILE_SPAWN_PER_SECOND;

    while (this.spawnDebt >= 1) {
      this.spawnDebt -= 1;
      this.spawnProjectile();
    }

    const deltaSeconds = deltaMs / MS_PER_SECOND;

    for (const projectile of this.projectiles) {
      if (projectile.ageMs === FREE) {
        continue;
      }

      projectile.ageMs += deltaMs;

      if (projectile.ageMs >= PROJECTILE_LIFETIME_MS) {
        projectile.ageMs = FREE;
        projectile.view.setVisible(false);

        continue;
      }

      projectile.x = wrap(
        projectile.x + projectile.velocityX * deltaSeconds,
        REGION_LEFT,
        REGION_WIDTH,
      );
      projectile.y = wrap(
        projectile.y + projectile.velocityY * deltaSeconds,
        REGION_TOP,
        REGION_HEIGHT,
      );
      projectile.view.setPosition(projectile.x, projectile.y);
    }
  }

  private animateEffects(seconds: number): void {
    for (const effect of this.effects) {
      const angle = effect.phase + seconds * effect.rate;
      const pulse = 1 + EFFECT_PULSE * Math.sin(angle);
      const size = effect.size * pulse;

      if (effect.isLine) {
        effect.view.setDisplaySize(size, LINE_THICKNESS);
      } else {
        effect.view.setDisplaySize(size, size);
      }

      effect.view.setRotation(angle);
      effect.view.setAlpha(
        EFFECT_ALPHA_MIN +
          ((EFFECT_ALPHA_MAX - EFFECT_ALPHA_MIN) * (1 + Math.cos(angle))) / 2,
      );
    }
  }

  private sweepWedges(timeMs: number): void {
    const step = Math.floor(timeMs / WEDGE_STEP_MS);

    for (let index = 0; index < this.wedges.length; index += 1) {
      const wedge = this.wedges[index];
      const frame =
        this.wedgeFrames[(step + index * WEDGE_OFFSET_STEPS) % WEDGE_STEPS];

      if (wedge !== undefined && frame !== undefined) {
        wedge.setFrame(frame);
      }
    }
  }

  private retypeNumbers(seconds: number, timeMs: number): void {
    for (const number of this.numbers) {
      const angle = seconds * number.rate;

      number.view.setPosition(
        number.x + Math.cos(angle) * NUMBER_DRIFT,
        number.y + Math.sin(angle) * NUMBER_DRIFT,
      );
      number.view.setText(String(Math.floor(timeMs) + number.offset));
    }
  }
}
