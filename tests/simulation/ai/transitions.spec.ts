import { describe, expect, it } from "vitest";
import type { AnyCommand, EnemyDef, StatusDef, Unit } from "@domain/public";
import { applyDamage } from "@domain/public";
import type { EntityId } from "@shared/public";
import type { Simulation } from "@simulation/public";
import {
  makeAttackDef,
  makeEnemyDef,
  makeRegistry,
  makeStatusDef,
  makeWorld,
  spawnEnemy,
  spawnHero,
  spawnUnit,
  submit,
  tickUntil,
  unitIdOf,
} from "../../helpers";

/** How far the enemies below notice the hero, and how far from home they follow it. */
const AGGRO_RADIUS = 500;
const LEASH_RADIUS = 1000;

/** Health a returning enemy gains a second, which is thirty-hundredths a tick at 30 Hz. */
const HEALTH_REGEN = 3;

/** The melee enemy's reach, centre to centre before both bound radii. */
const MELEE_RANGE = 100;

/** The ranged enemy's reach, well inside the aggro radius so it has somewhere to hold. */
const RANGED_RANGE = 300;

/** The hero's and the enemies' bound radii, which widen every reach. */
const HERO_BOUND = 24;
const ENEMY_BOUND = 16;

/** The tuning table's hold margin, which the ranged enemy stands inside its reach by. */
const HOLD_MARGIN = 50;

/** The tuning table's arrival epsilon: how close a walk counts as there. */
const EPSILON = 2;

/** A pack id for the cases that spawn a pack, and another for a pack that should not come. */
const PACK = 7;
const OTHER_PACK = 8;

/** Long enough for any walk below across the map. */
const PATIENCE = 900;

/** Ticks a case runs to show that nothing changed. */
const SETTLE = 60;

/** The chasing enemy: it closes to contact and swings in melee. */
const CHASER: EnemyDef = makeEnemyDef.build({
  id: "chaser",
  behaviour: "melee_chaser",
  healthRegen: HEALTH_REGEN,
  aggroRadius: AGGRO_RADIUS,
  leashRadius: LEASH_RADIUS,
  attack: makeAttackDef.build({
    range: MELEE_RANGE,
    acquireRadius: AGGRO_RADIUS,
    projectileSpeed: 0,
    projectileRadius: 0,
  }),
});

/** The holding enemy: it stands at its reach less the margin and fires. */
const HOLDER: EnemyDef = makeEnemyDef.build({
  id: "holder",
  behaviour: "ranged_holder",
  healthRegen: HEALTH_REGEN,
  aggroRadius: AGGRO_RADIUS,
  leashRadius: LEASH_RADIUS,
  attack: makeAttackDef.build({
    range: RANGED_RANGE,
    acquireRadius: AGGRO_RADIUS,
  }),
});

/** The standing enemy: the dummy's behaviour on an enemy that could fight. */
const STANDER: EnemyDef = makeEnemyDef.build({
  id: "stander",
  behaviour: "stationary",
  aggroRadius: AGGRO_RADIUS,
  leashRadius: LEASH_RADIUS,
});

/** A status that hides the hero from enemy sight, as Wane does. */
const HIDDEN: StatusDef = makeStatusDef.build({
  id: "hidden",
  flags: ["aggro_hidden"],
});

/** A status nothing may land through, for the case that loses the hero. */
const UNTOUCHABLE: StatusDef = makeStatusDef.build({
  id: "untouchable",
  flags: ["untargetable"],
});

/** Long enough that no status below runs out during its case. */
const STATUS_TICKS = 9000;

/** The two behaviours that fight, each with the reach its standing rule works to. */
const FIGHTERS = [
  { def: CHASER, range: MELEE_RANGE },
  { def: HOLDER, range: RANGED_RANGE },
] as const;

type Arranged = Readonly<{ world: Simulation; hero: Unit; heroId: EntityId }>;

/** A world with the three enemies and the two statuses, the hero at the origin, and no wander unless a case asks for one. */
const arrange = (wanderRadius = 0): Arranged => {
  const world = makeWorld({
    seed: 1,
    registry: makeRegistry({
      enemies: [CHASER, HOLDER, STANDER],
      statuses: [HIDDEN, UNTOUCHABLE],
      tuning: { wander_radius: wanderRadius },
    }),
  });
  const hero = spawnHero(world);

  return { world, hero, heroId: unitIdOf(world, hero) };
};

/** `command` stamped for the next tick. */
const stamp = (
  world: Simulation,
  command: Record<string, unknown>,
): AnyCommand =>
  ({
    tick: world.view.tick,
    timestamp: world.view.tick,
    ...command,
  }) as AnyCommand;

/** Orders the hero to walk to (`x`, `y`). */
const walkHero = (world: Simulation, x: number, y: number): void => {
  submit(world, stamp(world, { kind: "move", destination: { x, y } }));
};

/** Puts `statusId` on the hero for longer than any case runs. */
const statusHero = (world: Simulation, statusId: string): void => {
  submit(
    world,
    stamp(world, { kind: "apply_status", statusId, ticks: STATUS_TICKS }),
  );
};

/** One point of pure damage on `unit` from the hero. */
const hit = (world: Simulation, unit: Unit, heroId: EntityId): void => {
  applyDamage(world.state, unitIdOf(world, unit), 1, "pure", heroId);
};

/** The distance between two units' centres. */
const gap = (a: Readonly<Unit>, b: Readonly<Unit>): number =>
  Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y);

/** The distance from a unit to its own spawn point. */
const fromHome = (unit: Readonly<Unit>): number =>
  Math.hypot(unit.curr.x - unit.spawnPoint.x, unit.curr.y - unit.spawnPoint.y);

describe.each(FIGHTERS)(
  "the machine under $def.behaviour",
  ({ def, range }) => {
    describe("Idle", () => {
      it("chases a hero that stands inside its aggro radius", () => {
        const { world } = arrange();
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS - 50,
          y: 0,
        });

        world.tick();

        expect(enemy.ai.state).not.toBe("idle");
      });

      it("stays at rest while the hero is outside its aggro radius", () => {
        const { world } = arrange();
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS + 100,
          y: 0,
        });

        for (let tick = 0; tick < SETTLE; tick += 1) {
          world.tick();
        }

        expect(enemy.ai.state).toBe("idle");
      });

      it("chases a hero that hit it from outside its aggro radius", () => {
        const { world, heroId } = arrange();
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS + 400,
          y: 0,
        });

        hit(world, enemy, heroId);
        world.tick();

        expect(enemy.ai.state).toBe("chase");
      });

      it("does not notice a hero hidden from enemy sight", () => {
        const { world } = arrange();

        statusHero(world, HIDDEN.id);

        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS - 50,
          y: 0,
        });

        for (let tick = 0; tick < SETTLE; tick += 1) {
          world.tick();
        }

        expect(enemy.ai.state).toBe("idle");
      });

      it("wanders no further from home than the wander radius", () => {
        const wanderRadius = 64;
        const { world } = arrange(wanderRadius);
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS + 1000,
          y: 0,
        });
        let furthest = 0;

        for (let tick = 0; tick < PATIENCE; tick += 1) {
          world.tick();
          furthest = Math.max(furthest, fromHome(enemy));
        }

        expect(furthest).toBeGreaterThan(wanderRadius / 2);
        expect(furthest).toBeLessThanOrEqual(wanderRadius + EPSILON);
      });
    });

    describe("Aggro", () => {
      it("brings every idle member of its pack into Chase on the tick one notices", () => {
        const { world } = arrange();
        const members = [
          AGGRO_RADIUS - 50,
          AGGRO_RADIUS + 300,
          AGGRO_RADIUS + 600,
        ].map((x) =>
          spawnEnemy(world, { definitionId: def.id, x, y: 0, packId: PACK }),
        );

        world.tick();

        expect(members.map((member) => member.ai.state)).toEqual([
          "chase",
          "chase",
          "chase",
        ]);
      });

      it("leaves another pack at rest", () => {
        const { world } = arrange();

        spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS - 50,
          y: 0,
          packId: PACK,
        });

        const stranger = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS + 300,
          y: 0,
          packId: OTHER_PACK,
        });

        world.tick();

        expect(stranger.ai.state).toBe("idle");
      });
    });

    describe("Chase", () => {
      it("attacks the hero once the hero is in its reach", () => {
        const { world, hero, heroId } = arrange();
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS - 50,
          y: 0,
        });

        tickUntil(world, () => enemy.ai.state === "attack", PATIENCE);

        expect(enemy.order.targetId).toBe(heroId);
        expect(gap(enemy, hero)).toBeLessThanOrEqual(
          range + HERO_BOUND + ENEMY_BOUND,
        );
      });

      it("goes home once it passes its leash", () => {
        const { world } = arrange();
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS - 50,
          y: 0,
        });

        world.tick();
        walkHero(world, -3 * LEASH_RADIUS, 0);
        tickUntil(world, () => enemy.ai.state === "return", PATIENCE);

        expect(fromHome(enemy)).toBeGreaterThan(LEASH_RADIUS);
      });

      it("goes home when the hero hides from enemy sight", () => {
        const { world } = arrange();
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS - 50,
          y: 0,
        });

        world.tick();
        statusHero(world, HIDDEN.id);
        world.tick();

        expect(enemy.ai.state).toBe("return");
      });

      it("keeps chasing a dead hero to the point it stands up at", () => {
        const { world, hero } = arrange();

        walkHero(world, 400, 0);
        tickUntil(world, () => hero.curr.x >= 400 - EPSILON, PATIENCE);

        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: 800,
          y: 0,
        });

        world.tick();
        submit(world, stamp(world, { kind: "kill_hero" }));
        world.tick();
        tickUntil(world, () => hero.state !== "dead", PATIENCE);

        expect([
          enemy.ai.state,
          enemy.order.destination.x,
          enemy.order.destination.y,
        ]).toEqual(["chase", hero.spawnPoint.x, hero.spawnPoint.y]);
      });
    });

    describe("Attack", () => {
      it("chases again when the hero walks out of its reach", () => {
        const { world } = arrange();
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS - 50,
          y: 0,
        });

        tickUntil(world, () => enemy.ai.state === "attack", PATIENCE);
        walkHero(world, -LEASH_RADIUS / 2, 0);
        tickUntil(world, () => enemy.ai.state === "chase", PATIENCE);

        expect(enemy.order.kind).toBe("move");
      });

      it("cancels the attack point and goes home when leashed mid-attack", () => {
        const { world } = arrange();
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS - 50,
          y: 0,
        });

        tickUntil(world, () => enemy.state === "attack_windup", PATIENCE);
        enemy.spawnPoint.x = 3 * LEASH_RADIUS;
        world.tick();

        expect([
          enemy.ai.state,
          enemy.state,
          world.view.map.projectiles.count,
        ]).toEqual(["return", "turning", 0]);
      });

      it("goes home when the hero becomes untargetable", () => {
        const { world } = arrange();
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS - 50,
          y: 0,
        });

        tickUntil(world, () => enemy.ai.state === "attack", PATIENCE);
        statusHero(world, UNTOUCHABLE.id);
        world.tick();

        expect(enemy.ai.state).toBe("return");
      });
    });

    describe("Return", () => {
      /** An enemy that noticed the hero, followed it west past its leash, and turned home. */
      const leashed = (): Readonly<{ world: Simulation; enemy: Unit }> => {
        const { world } = arrange();
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS - 50,
          y: 0,
        });

        enemy.resources.health = enemy.stats.maxHealth / 2;
        world.tick();
        walkHero(world, -3 * LEASH_RADIUS, 0);
        tickUntil(world, () => enemy.ai.state === "return", PATIENCE);

        return { world, enemy };
      };

      it("regenerates at its definition's rate while it walks home", () => {
        const { world, enemy } = leashed();
        const before = enemy.resources.health;

        for (let tick = 0; tick < SETTLE; tick += 1) {
          world.tick();
        }

        expect(enemy.resources.health - before).toBeCloseTo(
          (HEALTH_REGEN / 30) * SETTLE,
        );
      });

      it("rests on arriving at its spawn point", () => {
        const { world, enemy } = leashed();

        tickUntil(world, () => enemy.ai.state === "idle", PATIENCE);

        expect(fromHome(enemy)).toBeLessThanOrEqual(enemy.collisionRadius);
      });

      it("ignores a hit from the hero on the way home", () => {
        const { world, enemy } = leashed();
        const heroId = world.state.run.heroId;

        if (heroId === null) {
          throw new Error("The hero is live");
        }

        hit(world, enemy, heroId);
        world.tick();

        expect(enemy.ai.state).toBe("return");
      });

      it("rests beside a unit standing on its spawn point", () => {
        const { world, enemy } = leashed();

        spawnUnit(world, {
          kind: "summon",
          x: enemy.spawnPoint.x,
          y: enemy.spawnPoint.y,
        });
        tickUntil(world, () => enemy.ai.state === "idle", PATIENCE);

        expect([
          enemy.order.kind,
          fromHome(enemy) > enemy.collisionRadius,
        ]).toEqual(["none", true]);
      });
    });

    describe("Dead", () => {
      it("is entered by the death pass", () => {
        const { world, heroId } = arrange();
        const enemy = spawnEnemy(world, {
          definitionId: def.id,
          x: AGGRO_RADIUS - 50,
          y: 0,
        });

        world.tick();
        applyDamage(
          world.state,
          unitIdOf(world, enemy),
          enemy.stats.maxHealth,
          "pure",
          heroId,
        );
        world.tick();

        expect(enemy.ai.state).toBe("dead");
      });
    });
  },
);

describe("the machine under melee_chaser", () => {
  it("keeps attacking a hero that hides while it is adjacent", () => {
    const { world, heroId } = arrange();
    const enemy = spawnEnemy(world, {
      definitionId: CHASER.id,
      x: AGGRO_RADIUS - 50,
      y: 0,
    });

    tickUntil(world, () => enemy.ai.state === "attack", PATIENCE);
    statusHero(world, HIDDEN.id);

    for (let tick = 0; tick < SETTLE; tick += 1) {
      world.tick();
    }

    expect([enemy.ai.state, enemy.order.targetId]).toEqual(["attack", heroId]);
  });

  it("closes to contact with a hero standing still", () => {
    const { world, hero } = arrange();
    const enemy = spawnEnemy(world, {
      definitionId: CHASER.id,
      x: AGGRO_RADIUS - 50,
      y: 0,
    });

    tickUntil(world, () => enemy.state === "attack_windup", PATIENCE);

    expect(gap(enemy, hero)).toBeLessThanOrEqual(
      MELEE_RANGE + HERO_BOUND + ENEMY_BOUND,
    );
  });
});

describe("the machine under ranged_holder", () => {
  it("goes home when the hero hides while it fires from range", () => {
    const { world } = arrange();
    const enemy = spawnEnemy(world, {
      definitionId: HOLDER.id,
      x: AGGRO_RADIUS - 10,
      y: 0,
    });

    tickUntil(world, () => enemy.ai.state === "attack", PATIENCE);
    statusHero(world, HIDDEN.id);
    world.tick();

    expect([enemy.ai.state, enemy.order.kind]).toEqual(["return", "move"]);
  });

  it("holds at its reach less the margin", () => {
    const { world, hero } = arrange();
    const enemy = spawnEnemy(world, {
      definitionId: HOLDER.id,
      x: AGGRO_RADIUS - 10,
      y: 0,
    });
    const reach = RANGED_RANGE + HERO_BOUND + ENEMY_BOUND;

    tickUntil(world, () => enemy.state === "attack_windup", PATIENCE);

    expect(gap(enemy, hero)).toBeGreaterThan(reach - HOLD_MARGIN - EPSILON);
    expect(gap(enemy, hero)).toBeLessThanOrEqual(reach);
  });

  it("fires a projectile at the hero", () => {
    const { world, heroId } = arrange();

    spawnEnemy(world, {
      definitionId: HOLDER.id,
      x: AGGRO_RADIUS - 10,
      y: 0,
    });
    tickUntil(world, () => world.view.map.projectiles.count > 0, PATIENCE);

    const projectiles = world.view.map.projectiles;
    let targetId: EntityId | null = null;

    for (let index = 0; index < projectiles.end; index += 1) {
      const shot = projectiles.at(index);

      if (shot !== null) {
        targetId = shot.targetId;
      }
    }

    expect(targetId).toBe(heroId);
  });
});

describe("the machine under stationary", () => {
  it("stays at rest with the hero inside its aggro radius", () => {
    const { world } = arrange();
    const enemy = spawnEnemy(world, {
      definitionId: STANDER.id,
      x: AGGRO_RADIUS - 50,
      y: 0,
    });

    for (let tick = 0; tick < SETTLE; tick += 1) {
      world.tick();
    }

    expect(enemy.ai.state).toBe("idle");
  });

  it("stays at rest when the hero hits it", () => {
    const { world, heroId } = arrange();
    const enemy = spawnEnemy(world, {
      definitionId: STANDER.id,
      x: AGGRO_RADIUS + 400,
      y: 0,
    });

    hit(world, enemy, heroId);

    for (let tick = 0; tick < SETTLE; tick += 1) {
      world.tick();
    }

    expect(enemy.ai.state).toBe("idle");
  });

  it("never wanders", () => {
    const { world } = arrange(64);
    const enemy = spawnEnemy(world, {
      definitionId: STANDER.id,
      x: AGGRO_RADIUS + 1000,
      y: 0,
    });

    for (let tick = 0; tick < PATIENCE; tick += 1) {
      world.tick();
    }

    expect(fromHome(enemy)).toBe(0);
  });
});
