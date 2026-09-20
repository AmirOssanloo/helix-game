# Adding an enemy

> **Entry point:** [Workflows](./README.md)

**Purpose:** add one enemy archetype — from definition file to a green check and a pack spawned from the developer panel. In order; each step says what you type and what you should see.

The example below adds a made-up archetype called **Frost Archer**: a ranged enemy that keeps its distance and applies a slow. It exists only on this page.

---

## 1. Read the pages that own the shape

[Content and registries](../architecture/content-and-registries.md) says how a definition points at an AI behaviour and at abilities by string key. [Movement, collision, and pathing](../architecture/movement-collision-pathing.md) says what every unit gets for free: turn-then-move, disc push-out, grid A*, and the spatial hash. An enemy definition adds numbers and keys to that; it never adds movement code.

---

## 2. Write the definition

One file per archetype under `src/content/enemies/`. The file name is the id.

```bash
touch src/content/enemies/frost-archer.def.ts
```

```typescript
import type { EnemyDef } from '@domain/public'

export const frostArcher: EnemyDef = {
  id: 'frost_archer',
  name: 'Frost Archer',
  tier: 'normal',                       // 'normal' | 'elite' | 'boss'
  health: 320,
  healthRegen: 0.5,                     // Per second; the pipeline converts to per tick
  armour: 2,
  magicResistance: 0.25,
  moveSpeed: 300,
  turnRate: 0.7,                        // Radians per 0.03 s, as the hero's
  collisionRadius: 24,
  boundRadius: 24,
  attack: {
    damage: 28,
    damageType: 'physical',
    range: 550,
    projectileSpeed: 900,
    attackPointTicks: 12,
    baseAttackTicks: 51,
  },
  aggroRadius: 800,
  leashRadius: 1400,
  experience: 60,
  behaviour: 'ranged_kiter',            // A key under src/domain/ai/behaviours/
  abilities: ['frost_volley'],          // Keys of definitions under src/content/abilities/
  atlasFrame: 'square',
  tint: 0x99ddff,
}
```

Every field is required. A missing one is a validation failure, not a default, so a definition never silently inherits a number from somewhere else. `tier` selects the outline frame the view adds and nothing else; an elite is stronger because its numbers are, not because it is elite.

---

## 3. Add the behaviour, if the existing ones do not fit

Behaviours live under `src/domain/ai/behaviours/`, one per file, and drive the enemy's state machine — Idle, Aggro, Chase, Attack, Return, Dead. `melee-chaser`, `ranged-holder`, and `stationary` exist. A ranged enemy that backs away when the hero closes is new:

```bash
touch src/domain/ai/behaviours/ranged-kiter.behaviour.ts
```

```typescript
export const rangedKiterBehaviour: Behaviour = {
  chase: (world, unit, target) => { /* … */ },
  attack: (world, unit, target) => { /* … */ },
}
```

Register the key in `src/domain/ai/behaviours/index.ts`. A behaviour reads the spatial hash for range checks and asks the pathing module for a path; it allocates nothing and gets every number from `unit.def`.

---

## 4. Add its abilities

An enemy ability is an ability definition, exactly the shape a hero spell has, under `src/content/abilities/` instead of `src/content/spells/`. The pipeline does not know the difference. Follow [Adding a spell](./adding-a-spell.md) steps 2 to 7 for `frost-volley`, with `recipe` absent — enemies do not invoke — and the ability listed in the enemy's `abilities`. The behaviour decides when to cast it; the pipeline decides whether it may.

---

## 5. Register the definition

```typescript
// src/content/enemies/index.ts
export const enemies = [meleeGrunt, fastRunner, rangedArcher, tank, trainingDummy, frostArcher]
```

---

## 6. Run the content tier

```bash
pnpm test tests/content/
```

You should see `frost-archer` validate, `ranged-kiter` resolve, `frost-volley` resolve, and `square` found in the atlas. A wrong key fails here with the key named.

---

## 7. Write the simulation tests

```bash
touch tests/simulation/enemies/frost-archer.spec.ts
```

Build a world with the hero at the centre and a pack of three Frost Archers just outside `aggroRadius`, then assert:

- **Aggro on sight.** Move the hero inside the radius. All three leave Idle within one tick; the pack shares aggro, so the two that could not see the hero aggro with the one that did.
- **Aggro on damage.** Reset. Hit one from outside the radius. The whole pack aggros.
- **Range holding.** Tick until they close. Each stops at `attack.range` minus the bound radii and fires on `baseAttackTicks` cadence; the first projectile leaves after `attackPointTicks`.
- **Kiting.** Walk the hero into melee. Each backs away along a path and keeps firing.
- **Leash.** Walk the hero past `leashRadius`. They enter Return, walk to their spawn point, and regenerate.
- **Death and experience.** Kill one. It enters Dead, its view unbinds, the hero gains `experience`, and its pool slot is released.

```bash
pnpm test -t "frost-archer"
```

Every enemy gets these six; an ability adds one test per effect, as for a spell.

---

## 8. Spawn it from the panel

```bash
pnpm dev
```

The **Enemies** dropdown reads the registry, so `frost-archer` is already in it. Set **Group size** to 5, click **Spawn at click**, click the far side of the arena. Five light-blue squares appear. Toggle **Attack and aggro ranges** and **Unit state labels**, then walk in: the labels flip from `idle` to `chase`, they stop at range, arrows leave them, and a slow icon appears above the hero when a volley lands. Toggle **Path lines** to watch them kite. Walk away past the leash and watch them return.

If the tick readout climbs with five on screen, something in the behaviour is re-pathing every tick; the re-path budget lives in `src/domain/pathing/`.

---

## 9. Tune it

Numbers in a definition hot-reload. Edit `health` or `moveSpeed`, save, and the next spawned pack has the new numbers. For live retuning of an existing pack, the **Tuning** group exposes every field a definition marks tunable. A tuning change is a command in the input log, so a session that found the right numbers replays.

---

## 10. Definition of done

Walk the "A new enemy or behaviour" rows in the [definition of done](./definition-of-done.md), and the spell rows for any ability you added. The [enemies](../product/features/enemies.md) page gets a row if a player can tell the new archetype apart from the others.

---

## Related documentation

- [Content and registries](../architecture/content-and-registries.md) — how a definition names its behaviour and abilities
- [Movement, collision, and pathing](../architecture/movement-collision-pathing.md) — what every enemy gets without writing movement code
- [Adding a spell](./adding-a-spell.md) — the same steps for the enemy's abilities
- [Enemies](../product/features/enemies.md) — how enemies behave for the player
- [Definition of done](./definition-of-done.md) — the rows this change must pass
