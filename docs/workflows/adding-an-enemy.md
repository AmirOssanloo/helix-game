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

export const frostArcherDef = {
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
    attackPointSeconds: 0.4,            // Before the arrow leaves; converted to ticks at load
    baseAttackSeconds: 1.7,             // One attack per this many seconds; converted to ticks at load
  },
  aggroRadius: 800,
  leashRadius: 1400,
  experience: 60,
  behaviour: 'ranged_kiter',            // A key under src/domain/ai/behaviours/
  abilities: [                          // Tried in order; each id a key of a definition under src/content/abilities/
    { id: 'frost_volley', condition: { kind: 'always' } },  // Or 'health_below' with a fraction, 'target_within' with a distance
  ],
  eliteAbility: null,                   // The one entry an elite adds after its list, or null for none
  bossAbilities: [],                    // The entries a boss adds after its list, tried in order
  statuses: [],                         // Statuses it carries for life, such as 'bash'; at most two, none raising a flag
  atlasFrame: 'square',
  tint: 0x99ddff,
} as const satisfies EnemyDef
```

Every field is required. A missing one is a validation failure, not a default, so a definition never silently inherits a number from somewhere else. `tier` is `'normal'` in a definition; a spawn asks for a tier. An elite or a boss spawns with the definition's health times the `elite_health_multiplier` or `boss_health_multiplier` tunable, grants its `experience` times the `elite_experience_multiplier` or `boss_experience_multiplier` tunable on its death, casts its `eliteAbility` or its `bossAbilities` after its own list, and is drawn with an outline. Nothing else about it changes: the rules that stun a grunt stun a boss.

---

## 3. Add the behaviour, if the existing ones do not fit

Behaviours live under `src/domain/ai/behaviours/`, one per file. Every enemy runs the same state machine in `src/domain/ai/machine.ts` — Idle, Aggro, Chase, Attack, Return, Dead — and its behaviour says only four things: whether it ever leaves Idle, whether it wanders while there, whether it kites, and where it stands to fight. `melee_chaser` stands on the hero; `ranged_holder` at its attack range less the hold margin; `ranged_kiter` there too, and it kites: once the hero is nearer than a second margin inside that point, it backs away to it while its attack is on its clock and turns to fire whenever the clock allows; `charger` waits at the range of the first ability its list names, less the margin, while that ability is on its clock, closes as the chaser does if the hero comes a margin inside that point, and closes as the chaser does once the ability is ready; and `stationary` never leaves Idle. A ranged enemy that circles the hero is new:

```bash
touch src/domain/ai/behaviours/ranged-circler.behaviour.ts
```

```typescript
export const rangedCirclerBehaviour: MachineBehaviour = {
  kind: 'machine',
  engages: true,                        // Leaves Idle on sight or on a hit
  wanders: true,                        // Walks the wander radius around its spawn point while idle
  kites: false,                         // Backs away from a hero that closes while its attack is on its clock
  standAt: (world, unit, target, attack, margin, out) => { /* write the point it wants to stand at into out */ },
}
```

Register the key in `src/domain/ai/behaviours/index.ts`. The machine resolves the point to somewhere the map allows, walks there on the chase re-path interval, and swings through the hero's attack code once the hero is in reach. A standing rule allocates nothing, changes nothing in the world it may read, and gets every number from the attack record, the unit, the unit's definition, and the margin it is handed. A driver that should not run the machine at all, as a summon's does not, is `kind: 'driver'` with a `drive` function that issues orders.

---

## 4. Add its abilities

An enemy ability is an ability definition, exactly the shape a hero spell has, under `src/content/abilities/` instead of `src/content/spells/`. The pipeline does not know the difference. Follow [Adding a spell](./adding-a-spell.md) steps 2 to 7 for `frost_volley`, with `recipe` absent — enemies do not invoke — and the ability listed in the enemy's `abilities`, or in its `eliteAbility` or `bossAbilities` when only a tier casts it. The state machine's selection rule decides when to cast it, in Chase and Attack: the first listed entry whose condition holds, that is off its clock, reaches the hero, and is aimed at a unit, a point, or nothing; the pipeline decides whether it may. An entry's condition is `always`; `health_below` with a fraction strictly between 0 and 1, for a heal kept for when the enemy is hurt; or `target_within` with a distance, centre to centre, for an ability aimed at nothing that strikes around the enemy, whose range is zero and so would otherwise be cast from anywhere. The pipeline never reads a condition. A direction or a vector ability is never chosen, so an enemy's is aimed at one of the other three. A unit ability anchors on its target, so a projectile the enemy throws at the hero writes `origin: 'caster'` to leave from the enemy.

Something the enemy does on every hit, a bash or a frost attack, is not an ability. It is a status under `src/content/statuses/` with a damage-dealt hook, listed in the enemy's `statuses`, and the spawn puts it on the unit for life.

---

## 5. Register the definition

```typescript
// src/content/enemies/index.ts
export const enemies = [meleeGruntDef, fastRunnerDef, rangedArcherDef, tankDef, trainingDummyDef, frostArcherDef]
```

---

## 6. Run the content tier

```bash
pnpm test tests/content/
```

You should see `frost_archer` validate, `ranged_kiter` resolve, `frost_volley` resolve, and `square` found in the atlas. A wrong key fails here with the key named.

---

## 7. Write the simulation tests

```bash
touch tests/simulation/enemies/frost-archer.spec.ts
```

Build a world with the hero at the centre and a pack of three Frost Archers just outside `aggroRadius`, then assert:

- **Aggro on sight.** Move the hero inside the radius. All three leave Idle within one tick; the pack shares aggro, so the two that could not see the hero aggro with the one that did.
- **Aggro on damage.** Reset. Hit one from outside the radius. The whole pack aggros.
- **Range holding.** Tick until they close. Each stops at `attack.range` minus the bound radii and fires on the `baseAttackSeconds` cadence; the first projectile leaves after `attackPointSeconds`. Both are ticks by then, converted at load.
- **Kiting.** Walk the hero into melee. Each backs away along a path and keeps firing.
- **Leash.** Walk the hero past `leashRadius`. They enter Return, walk to their spawn point, and regenerate.
- **Death and experience.** Kill one. It enters Dead, its view unbinds, the hero gains `experience`, and its pool slot is released.

```bash
pnpm test -t "frost-archer"
```

Every enemy gets these six; an ability adds one test per effect, as for a spell. `describeArchetype` in the test helpers mounts the six for a definition, given the nearest its centre may stand to the hero's when it swings, so the spec writes that number and its ability tests; `arrangeArchetype` gives an ability test the hero and one enemy to start from.

---

## 8. Spawn it from the panel

```bash
pnpm dev
```

Choose `arena` under the panel's **Map**. The **Enemies** dropdown reads the registry, so `frost_archer` is already in it. Set **Group size** to 5, click **Spawn at click**, click the far side of the arena. Five light-blue squares appear. Toggle **Attack and aggro ranges** and **Unit state labels**, then walk in: the labels flip from `idle` to `chase`, they stop at range, arrows leave them, and a slow icon appears above the hero when a volley lands. Toggle **Path lines** to watch them kite. Walk away past the leash and watch them return.

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
