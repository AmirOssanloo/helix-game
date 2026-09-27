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
export const acquireFoo = (world: World, /* … */): FooId | null => { /* pop the free list and write the slot, or null */ }
export const releaseFoo = (world: World, id: FooId): void => { /* clear in place, bump the generation, push the free list */ }
```

**A full pool returns `null`, never grows.** The caller decides what that means — a spawn that does not happen, a projectile that is not fired — and the instrumentation counts the miss so a designer sees a map that is over capacity before a player does. [Performance standards](../standards/performance.md#quick-reference) hold the budget.

**Entities are plain objects.** Fields are set at acquire and read by systems. There is no class hierarchy: a hero, an enemy, and a summon are one unit shape with a kind tag and a definition id. Behaviour comes from systems and from the definition's keys, never from a subclass. A unit an ability spawns takes the kind its definition names, a summon for a summon definition and an enemy for an archetype, never its caster's. Typed arrays replace the object layout only when a profile of a real map shows the tick over budget, and that is a decision, not a habit.

**A unit is one shape, grouped by concern.** The fields every system reads, such as its position, order, resources, and statuses, sit on the unit itself. The state one concern keeps between ticks sits in a sub-record of its own, declared beside the unit under `domain/entities/` with its own create and clear: the attack's, the cast under way, the AI machine's, the pack it belongs to, and what ties a summon to its owner. A sub-record is made once with the pool slot and cleared in place on release; none is replaced or reallocated. A concern that grows adds its field to its sub-record, not to the unit.

**The derived values come from one key list.** The unit's stats and the base it stores at spawn are plain objects with one named field per entry of the list. Each entry names its field, the modifier stat whose rows change it, what an attribute point is worth toward it on a form, and the base a definition gives it. Creating, clearing, deriving, and spawning walk the list, so a new derived value is one entry in it and nothing else in the rules.

---

## Generational ids

An id is a number packing a pool index and a generation. Releasing an entity bumps the generation, so a stale id held by a projectile, a targeting order, or a HUD label resolves to nothing instead of to whatever now occupies the slot.

```typescript
const foo = world.map.foos.resolve(id)   // Foo | null — null when the generation no longer matches
```

Every reference between entities is an id, never an object. A system that holds an object across ticks is holding a slot, not an entity.

**An id carries its pool's kind.** `shared/` holds one generic tagged number, `Id<Brand>`, beside the packing, and names no kind. Each kind declares its own id beside its pool under `domain/entities/`, a unit's, a projectile's, a zone's, an effect's, and a ground item's. A pool is typed by its id and takes and resolves only that one, so a projectile's id passed where a unit's is wanted fails the typecheck rather than resolving whatever occupies that slot of the unit pool. The tag exists only for the compiler: at run time an id is the number the pool packed.

```typescript
export type FooId = Id<"foo">                                  // in the kind's file, beside its pool
export const createFooPool = (): Pool<Foo, FooId> => { /* … */ }
```

The pool is where a packed number becomes an id, and the one place the compiler is told so. The only other is the input log's parser, at the boundary, where a command read from a file claims its ids. A fixed-size buffer or scratch record typed to hold an id starts each slot at a placeholder the pool module gives, and writes it before any read.

---

## What an entity references

- **A definition, by id.** The immutable half. A unit knows which enemy definition it is; a projectile knows which ability fired it.
- **Other entities, by generational id.** A summon's owner. A projectile's target. A zone's caster.
- **Its own mutable state.** Position — previous and current — facing, order, resources, cooldown clocks, and a status table.

**An order's target is tagged by kind**: nothing, a point, or a unit. It is one record whose every field is present whatever the tag, written in place with the tag, so an order change allocates nothing; its type is a union over the tag, so a reader checks the tag before it reads a unit from it and states which targets it handles. A new kind of target, such as a ground item, is one more tag. Where the unit walks is not the target: the order's destination is its own field, which the attack and cast rules move to an approach point while the target stays.

**The status table** is per unit: a small fixed array of entries, each referencing a status definition and holding the tick it ends, its stacks, the unit that applied it, and that applier's orb levels, which every table on the definition is read at. The definition's stack rule decides what a second application does; the table just holds it.

---

## Two lifetimes

The world has two scopes, and every pool belongs to one.

| Scope | Holds | Reset when |
| --- | --- | --- |
| **Run** | The hero and its form records, the tuning state, the world's copies of the definitions, the maps the content registers, the random source, and the hero's items | Never during a session |
| **Map** | Enemies, summons, projectiles, zones, effects, and ground items | A map is loaded |

**Beside the two scopes sits the world's scratch**: the working memory the rules write and read within a call, such as a candidate buffer, a scratch point, the context an effect list runs with, the event an announcement is written through, and a re-entrancy guard. It is made once with the world, never grows, and nothing in it is read on a later tick, so it is not world state: the state checksum leaves it out and the world view does not show it. A value a later tick reads is state, and lives in run or map scope.

`loadMap` releases every map-scoped entity but the hero, whose slot in the unit pool it keeps, and rebuilds the walkability grid and the spatial hash from the new map definition. It does not touch run scope. It is a rule in `domain/map/`, and it runs only as a `load_map` command at the command system's point in the tick, resolving the map's id against the maps run scope holds, validated with the rest of the content. A map change is in the input log and replays. The hero's position and spawn point are set by the new map's spawn point, and no checkpoint is reached; the hero's orbs, slots, cooldowns, and statuses are the hero's business and follow the rules for a map transition, not the pool's.

Nothing may assume the hero is recreated per map.

**The hero is one unit with one id; a form is a record it points at.** Run scope holds one form record per form the design gives the hero: its definition, its health and mana, its kit state, and its armory. The unit itself holds what is continuous across a swap — position, facing, order, statuses, level, experience, and the cooldown clock map — plus the index of the active form. A swap changes that index and nothing else, so every enemy target, homing projectile, summon owner, and camera reference that names the hero's id stays valid. Systems read the hero's body and abilities through the active form each tick and never cache its definition.

**The hero's items live in run scope, never on the unit.** The unit is one shape for every slot of the pool, so a field the hero alone fills is paid 512 times. The inventory and gold sit in run scope once, shared by the forms; each form record carries its armory of slots; an item on the ground is a ground item in map scope. [ADR 0011](../adr/0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) is the reason.

- **An item is a value.** A fixed-shape record of its base's id, its rarity, its item level, and a fixed number of stat lines, each the content id it came from and its value, written once when the item is made. It holds no content index and no value read back from a definition, so a retune changes no item already made. It has no id: moving it copies its fields into the destination's record and clears the source's, and a command names a place, a cell or a slot, never an item.
- **What the armory adds reaches the pipeline as totals.** Each armory keeps one flat and one percentage sum per stat beside its slots, rewritten whole from its slots when an item goes on or comes off. The stats system copies the active form's totals into the hero's totals on run scope first each tick. Every unit's modifier table references the totals it adds, the hero's for the hero and one shared record of zeros for every other unit, and the one modifier pipeline adds them to the row sums wherever a stat is read. The unit's table holds no item row.
- **An item's clock is the unit's.** Cooldown clocks stay on the hero's unit, keyed by ability id, so moving an item touches no clock.

```typescript
export type FooItem = { baseId: string; lineCount: number; lineIds: (string | null)[]; lineValues: number[] /* … */ }
```

---

## Dormant packs

A map definition holds spawn data, not units. A pack is dormant — a record of what to spawn and where — until the hero comes within an activation radius, and only then does the AI system acquire units for it. A large map with many packs costs the tick nothing until the hero is near, and the unit pool bounds the live cost whatever the map's size.

The records are map scope, rebuilt by `loadMap`. A pack not marked dormant is placed by the load itself. Each record is asleep, waiting, awake, or dead. A pack the world cannot take, past the live cap or with no room, waits and is tried on every tick the hero is near.

Waking and sleeping run both ways, in the one rule the AI pass ends with. An awake pack whose point the hero is farther from than the `pack_sleep_radius` tunable, or the activation radius if that is larger, sleeps once every living member stands in Idle at full health: every slot under its pack id, adds and corpses included, goes back to the pool, and the record keeps its survivor count. Waking places the survivors, whole, under a new pack id. A pack with no living member is dead for the map until the map loads again. A pack spawned from the panel has no record and never sleeps. Sleeping and waking touch only the record and the pool, so neither allocates.

A pack's members stand on free cells taken ring by ring outward from its point, one body apart. The search stops at the `pack_placement_radius` tunable, in world units from the point, so a pack walled in with no room within that radius costs a bounded search each tick it is tried, and waits. The default holds a pack at the live cap of the largest bodies on open ground.

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
| Entity shape | Plain object, kind tag, definition id; no class hierarchy; a unit an ability spawns takes the kind its definition names |
| A unit's layout | One shape; the state one concern keeps between ticks in its own sub-record beside the unit, made with the slot and cleared in place, never replaced; a concern that grows adds its field to its sub-record |
| Derived values | One named field per entry of the one key list; create, clear, derive, and spawn walk it |
| Typed arrays | Only after a profile shows the tick over budget |
| Ids | A number packing index and generation; released slots bump the generation |
| An id's kind | Tagged per pool with the generic `Id<Brand>` from `shared/`; each kind's id declared beside its pool; a pool takes and resolves only its own; no cost at run time |
| Where a number becomes an id | Inside the pool, and at the input log's boundary; nowhere else. A buffer or scratch slot typed to hold an id starts at the pool module's placeholder and is written before any read |
| An order's target | One fixed-shape record tagged nothing, a point, or a unit; every field always present and written with the tag; a reader checks the tag before it reads the unit; the walk goal is the order's destination, not the target |
| References between entities | By generational id, resolved every tick; never by object |
| A stale id | Resolves to `null` |
| Status table | Per unit, fixed size, entries reference a status definition |
| Run scope | Hero and its form records, tuning state, the definition copies, the maps, random source, the hero's items; never reset during a session |
| Map scope | Enemies, summons, projectiles, zones, effects, ground items; released by `loadMap`, which keeps the hero's slot in the unit pool |
| The world's scratch | Working memory dead at the end of every tick, made with the world; not state, left out of the checksum. A value read on a later tick is state instead |
| `loadMap` | Runs only as a `load_map` command, whose id resolves against the maps in run scope; resets map scope, rebuilds the grid and the spatial hash, gives the hero the map's spawn point with no checkpoint reached, leaves run scope alone |
| The hero across maps | Never recreated |
| The hero's forms | Run-scoped records: definition, resources, kit state, armory; the unit holds the active index |
| The hero's items | Run scope, never the unit: the inventory and gold once, an armory on each form record; on the ground, a ground item in map scope |
| An item | A fixed-shape value: base id, rarity, item level, a fixed number of stat lines of content id and value written once; no content index, no id of its own |
| Moving an item | Copy its fields into the destination's record and clear the source's; a command names a cell or a slot, never an item |
| An item's stats | The armory's per-stat totals, rewritten whole on an equip or unequip, copied from the active form to the hero first in the stats system; every unit's table references the totals it adds, zeros for all but the hero; the one pipeline adds them wherever a stat is read; no item row on a unit's table |
| An item's clock | On the unit, keyed by ability id; a move touches no clock |
| A form swap | Changes the active index only; the hero's id, position, facing, order, statuses, and clocks continue |
| The hero's definition | Read through the active form every tick; never cached across ticks |
| Packs | Spawn data until the hero is within the activation radius; then units; spawn data again once the hero is past `pack_sleep_radius` and every living member rests at home at full health |
| A map's pack records | Map scope, rebuilt by `loadMap`; asleep, waiting, awake, or dead; a pack not marked dormant placed by the load; a sleep keeps the survivor count and a waking places the survivors whole under a new pack id, neither allocating; a pack with none is dead until the next load; one the world cannot take keeps waiting; a pack the panel spawns has no record and never sleeps |
| A pack's placement | Free cells ring by ring from its point, no further than `pack_placement_radius`; no room within it, and it waits |

---

## Related documentation

- [World model](./world-model.md) — which kinds exist and which scope each belongs to
- [Simulation loop](./simulation-loop.md) — when previous positions are copied and systems run over these pools
- [Movement, collision, and pathing](./movement-collision-pathing.md) — the spatial hash that indexes these pools
- [Performance standards](../standards/performance.md) — the allocation policy these pools serve
- [Simulation coding standards](../standards/simulation-coding.md) — how a system may touch a pool
- [ADR 0011 — An item is a value the hero holds in run scope](../adr/0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) — why items live in run scope and reach the stats as totals
