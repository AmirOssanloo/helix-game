# Entities and pools

> **Entry point:** [Architecture](./README.md)
> **See also:** [World model](./world-model.md) · [Simulation loop](./simulation-loop.md) · [Content and registries](./content-and-registries.md)

How runtime things are stored: pooled plain objects with generational ids, fixed capacities, and two lifetimes. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

---

## The idea in one line

**Nothing that lives during play is allocated during play.**

Every entity kind has a pool, sized at world creation and never grown. Acquiring an entity takes an object off a free list; releasing it puts it back. The garbage collector has nothing to do in steady state, so there are no collector pauses mid-fight.

---

## Pools

A pool is an array of plain objects of one kind plus a free list of indices. Each kind under `domain/entities/` declares its own pool and its own capacity:

| Kind | Capacity |
| --- | --- |
| Units — hero, enemies, summons together | 512 |
| Projectiles | 512 |
| Effects | 256 |

Zones share the effect pool's discipline with their own capacity, declared in their file.

```typescript
export const acquireFoo = (world: World): Foo | null => { /* pop the free list, bump generation, or null */ }
export const releaseFoo = (world: World, id: FooId): void => { /* clear, push the free list */ }
```

**A full pool returns `null`, never grows.** The caller decides what that means — a spawn that does not happen, a projectile that is not fired — and the instrumentation counts the miss so a designer sees a map that is over capacity before a player does. [Performance standards](../standards/performance.md#quick-reference) hold the budget.

**Entities are plain objects.** Fields are set at acquire and read by systems. There is no class hierarchy: a hero, an enemy, and a summon are one unit shape with a kind tag and a definition id. Behaviour comes from systems and from the definition's keys, never from a subclass. Typed arrays replace the object layout only when a profile of a real map shows the tick over budget, and that is a decision, not a habit.

---

## Generational ids

An id is a number packing a pool index and a generation. Releasing an entity bumps the generation, so a stale id held by a projectile, a targeting order, or a HUD label resolves to nothing instead of to whatever now occupies the slot.

```typescript
const foo = resolveFoo(world, id)   // Foo | null — null when the generation no longer matches
```

Every reference between entities is an id, never an object. A system that holds an object across ticks is holding a slot, not an entity.

---

## What an entity references

- **A definition, by id.** The immutable half. A unit knows which enemy definition it is; a projectile knows which ability fired it.
- **Other entities, by generational id.** A summon's owner. A projectile's target. A zone's caster.
- **Its own mutable state.** Position — previous and current — facing, order, resources, cooldown clocks, and a status table.

**The status table** is per unit: a small fixed array of entries, each referencing a status definition and holding the tick it ends and its stacks. The definition's stack rule decides what a second application does; the table just holds it.

---

## Two lifetimes

The world has two scopes, and every pool belongs to one.

| Scope | Holds | Reset when |
| --- | --- | --- |
| **Run** | The hero, the tuning state, the random source, and later inventory and progression | Never during a session |
| **Map** | Enemies, summons, projectiles, zones, effects, and later ground items | A map is loaded |

`loadMap` releases every map-scoped entity and rebuilds the walkability grid and the spatial hash from the new map definition. It does not touch run scope. The hero's position is set by the new map's spawn point; the hero's orbs, slots, cooldowns, and statuses are the hero's business and follow the rules for a map transition, not the pool's.

Nothing may assume the hero is recreated per map.

**The hero is one unit with one id; a form is a record it points at.** Run scope holds one form record per form the design gives the hero: its definition, its health and mana, its kit state, and its armory. The unit itself holds what is continuous across a swap — position, facing, order, statuses, level, experience, item slots, and the cooldown clock map — plus the index of the active form. A swap changes that index and nothing else, so every enemy target, homing projectile, summon owner, and camera reference that names the hero's id stays valid. Systems read the hero's body and abilities through the active form each tick and never cache its definition.

---

## Dormant packs

A map definition holds spawn data, not units. A pack is dormant — a record of what to spawn and where — until the hero comes within an activation radius, and only then does the AI system acquire units for it. A large map with many packs costs the tick nothing until the hero is near, and the unit pool bounds the live cost whatever the map's size.

---

## Anti-patterns

### Growing a pool on demand

"Just push one more when it's full." The first time a boss fight spawns adds, the pool grows mid-frame, the collector runs, and the frame drops exactly when the player needs it. A full pool returns `null` and the miss is counted.

### Holding an object across ticks

A system caching the unit it targeted last tick as an object. The unit died, the slot was reused, and the system is now attacking a summon. Hold the id and resolve it every tick.

### A subclass per kind

`BossUnit extends EliteUnit extends EnemyUnit`. The first ability that both a summon and a boss need lands in the wrong parent, and the pool can no longer be one array of one shape. One shape, a kind tag, a definition id.

---

## Quick reference

| Rule | Do |
| --- | --- |
| Allocation during play | None; every live thing comes from a pool sized at world creation |
| A pool | An array of one plain object shape plus a free list, declared in its kind's file under `domain/entities/` |
| Capacities | Units 512, projectiles 512, effects 256; zones declare their own |
| A full pool | Returns `null`; the caller decides; the instrumentation counts the miss |
| Entity shape | Plain object, kind tag, definition id; no class hierarchy |
| Typed arrays | Only after a profile shows the tick over budget |
| Ids | A number packing index and generation; released slots bump the generation |
| References between entities | By generational id, resolved every tick; never by object |
| A stale id | Resolves to `null` |
| Status table | Per unit, fixed size, entries reference a status definition |
| Run scope | Hero, tuning state, random source; never reset during a session |
| Map scope | Enemies, summons, projectiles, zones, effects; released by `loadMap` |
| `loadMap` | Resets map scope, rebuilds the grid and the spatial hash, leaves run scope alone |
| The hero across maps | Never recreated |
| The hero's forms | Run-scoped records: definition, resources, kit state, armory; the unit holds the active index |
| A form swap | Changes the active index only; the hero's id, position, facing, order, statuses, and clocks continue |
| The hero's definition | Read through the active form every tick; never cached across ticks |
| Packs | Spawn data until the hero is within the activation radius; then units |

---

## Related documentation

- [World model](./world-model.md) — which kinds exist and which scope each belongs to
- [Simulation loop](./simulation-loop.md) — when previous positions are copied and systems run over these pools
- [Movement, collision, and pathing](./movement-collision-pathing.md) — the spatial hash that indexes these pools
- [Performance standards](../standards/performance.md) — the allocation policy these pools serve
- [Simulation coding standards](../standards/simulation-coding.md) — how a system may touch a pool
