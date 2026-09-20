# Movement, collision, and pathing

> **Entry point:** [Architecture](./README.md)
> **See also:** [Simulation loop](./simulation-loop.md) · [Entities and pools](./entities-and-pools.md) · [Ability pipeline](./ability-pipeline.md)

How a unit turns, moves, is kept out of other units and walls, finds a path, and how anything fast finds what it hits. All of it is plain arithmetic in `domain/movement/` and `domain/pathing/`; no physics engine is involved. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder. The numbers are in the [mechanics spec](../product/specs/character-movement-and-mechanics.md).

---

## The idea in one line

**Units are solid discs that turn at a fixed rate, move at a constant speed along a path, and get pushed apart after they move.**

There is no momentum, no acceleration, no bounce. A unit that receives a move order is either turning, moving, or arrived, and each tick does exactly one step of that.

---

## Three radii

Every unit carries three radii, and they are never collapsed into one:

| Radius | Used by |
| --- | --- |
| Collision | Pathing and unit-to-unit blocking; two units may not rest closer than the sum of theirs |
| Bound | Range checks; attack reach and cast range add the attacker's and the target's |
| Selection | The presentation's click test; not a simulation value |

---

## Turning, then moving

A unit facing away from its target does not slide sideways toward it. Each tick the movement system:

1. Computes the bearing to the next path point.
2. Turns toward it along the shortest arc, by the turn rate times the step, with a short ramp on the first ticks of a turn.
3. Translates only when the bearing is inside the action cone.
4. Advances by `min(speed × dt, distance remaining)` along the path, so a unit arrives exactly and never overshoots.

Speed is a stack: a base value, flat and percentage modifiers from statuses and orbs, and a clamp at both ends. The stack is recomputed each tick from the unit's current modifiers; nothing caches it.

Targeted casts and attacks use the same turn: the ability pipeline waits for the bearing to enter the cone before its cast point starts.

---

## Blocking

After every unit has moved, the collision system separates overlaps. It is positional: it moves discs apart and changes no speed.

- **Unit against unit:** two discs closer than the sum of their collision radii are pushed apart along the line between their centres, each by half the overlap.
- **Unit against obstacle:** a disc overlapping an axis-aligned rectangle is pushed out until it touches: by the nearest edge when its centre is inside, straight away from the nearest point of the rectangle when its centre is outside.
- **Passes:** the system repeats a capped number of times, the cap a tunable, so a pile-up settles; it does not iterate to convergence. Every pass takes half of what overlap remains, so a pile converges on touching over a few ticks rather than snapping apart in one.
- **Order:** pairs in pool order, each pair once, the lower id first; a pair on the same point separates along a direction fixed by the pair, so a replay repeats it. Every push moves the unit in the spatial hash at once, so the next query in the same pass sees it.

Enemies do not steer around each other. They push. That is what makes a pack feel like a crowd, and it is what the [mechanics spec](../product/specs/character-movement-and-mechanics.md) asks for.

---

## Obstacles and the grid

A map definition holds obstacles as axis-aligned rectangles. At load, `domain/map/` derives a walkability grid from them: one cell per fixed square of world units, blocked where a rectangle covers it. The grid is derived once per map and inflated per radius class — a large unit sees a cell blocked that a small one does not — so pathing never has to ask about a unit's radius mid-search.

---

## The spatial hash

Every question of the form "what is near here" goes through one uniform grid hash in `domain/movement/`: cells of a fixed size keyed by integer coordinates, each holding the ids of the units in it.

| Operation | Used by |
| --- | --- |
| Insert and remove | Pools, on acquire and release |
| Move | The movement system, when a unit changes cell |
| Circle query | Aggro, attack range, area effects, attack-move target search, pack activation |
| Segment query, widened by a radius | Projectile sweeps, line and cone effects |
| Rectangle query | The presentation, to bind views to what the camera can see |

The hash returns candidates; the caller does the exact test. It returns ids in cell-then-index order so a replay finds the same target first. Queries write into a caller-supplied buffer and allocate nothing. A segment query takes the radius of the disc swept along it, so a unit whose centre is in a neighbouring cell is still a candidate. The cell size is a tunable; a change rebuilds the hash.

---

## Pathing

A move order asks `domain/pathing/` for a path from the unit to the target on the walkability grid:

- **A\* with a binary heap**, on the grid inflated for the unit's radius class.
- **Line-of-sight smoothing** afterwards, dropping every waypoint that the unit can walk straight past, so a path across an open room is one segment.
- **A re-path budget per tick.** Enemies that need a new path queue for it; the system serves a fixed number each tick and the rest keep their current path. The hero is served first.
- **A blocked destination** resolves to the nearest legal point on the inflated obstacle.

A path is a fixed-capacity buffer on the unit, not an allocated array.

---

## Projectiles

A projectile moves fast enough that testing where it ends up would skip over a unit. Each tick the projectile system sweeps the segment from the projectile's previous position to its current one against the discs the spatial hash returns for that segment, and the first hit along it wins. A homing projectile skips the query and tests only its target's disc, following the target's current position each tick.

---

## Anti-patterns

### Steering instead of pushing

Giving enemies avoidance so they flow around each other. They stop bumping, then they stop reaching the hero, and a pack that should surround becomes a queue. Push-out, capped passes.

### One radius

Using the collision radius for range too. Every ranged attack lands short by one radius, and the fix ends up as a magic constant in the attack system. Three radii, from the definition.

### Testing a projectile where it stopped

A point-in-disc check at the end of the tick. A fast projectile passes clean through a small unit between two ticks. Sweep the segment.

---

## Quick reference

| Rule | Do |
| --- | --- |
| Physics engine | None; movement and collision are plain arithmetic in `domain/movement/` |
| Three radii | Collision for blocking and pathing, bound for range, selection for clicks; never collapsed |
| Turning | Shortest arc at the turn rate times the step, with a short ramp; translation only inside the action cone |
| Moving | `min(speed × dt, remaining)` along the path; no acceleration, no overshoot |
| Speed | A stack of base, modifiers, and clamps, recomputed every tick |
| Targeted casts and attacks | Wait for the bearing to enter the cone before the cast point |
| Unit blocking | Positional push-out along the centre line, half each, a capped number of passes the tunable sets, no speed change |
| Obstacle blocking | Push out of the axis-aligned rectangle until touching: by the nearest edge from inside, away from the nearest point from outside |
| Push order | Pool order, each pair once, lower id first; a coincident pair along a direction fixed by the pair; the hash updated on every push |
| Enemies and each other | Push, never steer |
| The walkability grid | Derived once per map from obstacle rectangles, inflated per radius class |
| "What is near" | Always the spatial hash: insert, remove, move, circle, segment, rectangle; the cell size a tunable |
| Hash results | Candidate ids in cell-then-index order, written into a caller-supplied buffer |
| Pathing | Grid A* with a binary heap, then line-of-sight smoothing |
| Re-pathing | A fixed budget per tick, hero first; the rest keep their path |
| A blocked destination | The nearest legal point on the inflated obstacle |
| A path | A fixed-capacity buffer on the unit |
| Projectiles | Sweep the segment from previous to current position; first hit wins |
| Homing projectiles | Test only the target's disc, at the target's current position |

---

## Related documentation

- [Character movement and mechanics](../product/specs/character-movement-and-mechanics.md) — the numbers and the feel requirements this page implements
- [Simulation loop](./simulation-loop.md) — where in the tick movement, collision, and projectiles run
- [Entities and pools](./entities-and-pools.md) — the pools the spatial hash indexes
- [Ability pipeline](./ability-pipeline.md) — the turn-to-face stage and the projectile primitive
- [ADR 0002 — Custom fixed-step simulation](../adr/0002-custom-fixed-step-simulation.md) — why there is no physics engine
