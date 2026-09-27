# ADR 0013 — Loot on the ground is a pooled entity that stays until the map is made again

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| **Status**        | Proposed                                                          |
| **Date**          | 2026-09-28                                                        |
| **Deciders**      | The engineering architect; Proposed until the maintainer reads it |
| **Supersedes**    | None                                                              |
| **Superseded by** | None                                                              |

## Context

Enemies are about to drop things: gold, health globes, mana globes, and items. Each lies at a point on the map until the hero takes it: gold and globes by walking over or past them, an item by a right click that sends the hero to it. [ADR 0011](./0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) already says an item on the ground is held inline, as a value, by something in map scope with an id of its own, since a right click and an order must name it. It does not say what that something is, how many there can be, or how long one lasts.

Four facts shape the answer.

- **The volume is known and bounded by the map.** A full clear of the long road drops, in expectation, about 51 piles of gold, 42 health globes, 51 mana globes, and 31 items: about 175 things if the hero took none of them. The hero takes gold and globes as it walks, but a globe waits while its pool is full, and an item the player does not want stays where it fell for the rest of the map.
- **Nothing that lives during play is allocated during play.** Every other runtime thing is a fixed pool whose full state returns `null` and is counted.
- **A boss's death is the worst tick.** It drops up to eight things at once, a named boss's Legendary among them, and they must land on ground the hero can reach, without piling on one point where a right click cannot tell them apart.
- **The spatial hash is the units'.** It answers "what is near" for movement, collision, targeting, and the views, and is rebuilt around units. Drops do not move and are read by only three things: the rule that takes them, the views, and the right click.

The player feels the answer when a pile they walked past is still there on the way back, and when a boss's Legendary does or does not appear. The engineer feels it in the stress test with the pool full, and in the next generated map, which may drop far more than the long road.

## Decision

**A ground item is an entity kind of its own, in map scope, with its own pool, its own id brand, and a capacity fixed at world creation. It stays until it is taken or the map is loaded or reset. A drop the world cannot take is not made, and is counted; nothing on the ground is ever evicted to make room.**

**What it is.** One plain record per slot: what it is (gold, a health globe, a mana globe, or an item), the point it lies at, the amount of a pile of gold, the item it holds inline when it is one, and the tick it fell. It has no previous position, since it never moves, and no rules of its own but being taken. The pool, its id, and its capacity sit in one file under `domain/entities/`, as every other kind's do.

**How many.** The capacity is set to hold a full clear of the busiest shipped map with nothing taken, at least twice over; the constant at the top of the file is the fact, and the stress test fills it. The views are sized to the screen, never to this capacity, so a large pool costs memory and not frame time.

**One to a cell.** A drop lands on a free walkability cell open to the hero's radius class, found ring by ring outward from where the enemy died, as a pack's members are placed, no further than a tunable radius. A cell holds at most one ground item, which map scope records in one byte per walkability cell, made with the grid on a map load and written on every drop and every take. So no two things lie on one point, and every drop is on ground the hero can stand on.

**Past capacity, or with no free cell, the drop is not made.** The pool returns `null` as every pool does, or the search finds no cell, and the drop is dropped and counted beside the pool's misses; no older ground item is released to make room. A death's drops are made best first, items from the highest rarity down with a Legendary first of all, then gold, then globes, so when the last slots or the last free cells run out it is a globe that goes without, not the boss's piece. The keyed draws of a drop are indexed by what they are, never by the order the drops are made in, so this order moves no number.

**How long.** A ground item lives until the hero takes it, or until a map load or the panel's map reset makes map scope again. The hero's death leaves every one where it lies. There is no timer.

**Not in the spatial hash.** The rule that takes gold and globes, the rule that takes an item at the end of a pick up, the ground-item views, and the right click's pick walk the pool by index, which at this capacity costs less than keeping a second index current. The views bind by the camera's world rectangle, as obstacles and checkpoint markers do.

```typescript
export type FooId = Id<"foo">                          // the ground item's own brand, beside its pool
export const acquireFoo = (world: World, /* … */): FooId | null => { /* null when full: the drop is not made */ }
```

## Consequences

### What this makes easy

**A pile left behind is there on the way back.** Nothing the player walked past disappears while they fight elsewhere on the map, and a replay shows the same ground to the tick.

**The boss's piece is the last thing to go without.** At the edge of capacity the world gives up a mana globe, not a Legendary, and the panel's readout says it happened.

**A right click is never ambiguous about position.** One item to a cell means two items never share a point, and every drop lies where the hero can walk.

**Ground items cost the tick almost nothing.** No hash updates, no movement, no collision; the take is one walk of the pool for the hero alone, and a drop is a bounded search on the tick of a death.

**It is the pool discipline the rest of the game uses.** A full pool returns `null` and is counted, so the instrumentation, the stress test, and the performance rules need nothing new.

### What this makes hard

**A map that drops more than the capacity loses drops.** On the long road it takes two full clears with nothing taken; on a generated map of a hundred levels the capacity is asked again. The loss is counted, never silent, but a player who has not read the panel sees only that a death dropped less than usual.

**Clutter is the player's to clear.** With no timer, an area the player farmed and left stays full of unwanted Commons until the map is made again. Labels hide Common and Uncommon by default, which helps the screen and not the pool.

**A second index of what lies where.** The byte per cell must be written on every drop and every take, and a take that forgets it leaves a cell that looks full forever. One module owns both writes.

**The pool is walked, not queried.** A rule that wants "the ground items near this point" at scale, such as a pet that fetches items, would walk every slot; that rule is the one to reopen this.

## Alternatives considered

**Evict the oldest ground item to make room.** Every drop is made, and the oldest pile, usually one the player walked past, goes. It was close, and it is what a player who never reads the panel would least notice. It lost because "oldest" is not "least wanted": the oldest thing on the map may be the Rare the player means to come back for, and it vanishes because of a Common that fell somewhere else. Eviction by value was weighed too and lost on the same ground with a slower scan. Refusing the new drop is what every pool here does, and it is what the game this loot is modelled on did with its own item limit on a level.

**A despawn timer.** Piles and items vanish some seconds or minutes after they fall, as some games do. The pool would rarely fill. It lost because the product pages say a ground item stays until it is taken or the map is made again, and a timer is a product change that turns a walk back for a globe into a race.

**Ground items in the spatial hash.** Every query would find them the way it finds units. It lost because the hash is rebuilt and moved for units every tick, and the three readers of ground items are cheaper walking a few hundred slots by index than paying for a second kind in every cell.

**Drops as fields of the dying unit or its pack record.** No new kind at all: a corpse holds what it dropped. It lost because a unit's slot is released after the corpse delay and a pack sleeps, while a drop must outlive both, and because a right click and the pick up order need an id for the thing on the ground itself.

## Revisit when

- A generated map, or any shipped map, drops in a full clear more than half the pool's capacity. Then the capacity is raised, or a lifetime is reopened with the product.
- The panel's readout shows drops refused in a playtest of a shipped map.
- A rule needs ground items near an arbitrary point at scale, such as an item-fetching summon or a magnet. Then an index of ground items is weighed.
- The product asks for ground items to fade.

## References

Nothing enforces it until the ground item is built; its tests will:

- The ground-item pool spec under `tests/domain/entities/` holds the capacity, the `null` past it, the count, and a stale id resolving to nothing.
- The drop-on-death spec under `tests/simulation/loot/` holds one item to a cell, the placement radius, and the best-first order at the edge of capacity.
- The stress test's long-road case under `tests/simulation/` fills the pool and holds the tick budget.
- The state checksum covers the ground-item pool and the byte per cell, so a replay that disagrees about the ground fails.

---

## Related documentation

- [Entities and pools](../architecture/entities-and-pools.md) — the pool discipline and the two lifetimes this kind joins
- [ADR 0011 — An item is a value the hero holds in run scope](./0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) — the item a ground item holds inline
- [Items and loot](../product/features/items-and-loot.md) — how drops land and how long they stay, for the player
- [Performance standards](../standards/performance.md) — the budget the stress test holds the full pool to
- [Presentation](../architecture/presentation.md) — the views that bind ground items by the camera's rectangle
