# Movement, collision, and pathing

> **Entry point:** [Architecture](./README.md)
> **See also:** [Simulation loop](./simulation-loop.md) · [Entities and pools](./entities-and-pools.md) · [Ability pipeline](./ability-pipeline.md)

How a unit turns, moves, is kept out of other units and walls, finds a path, and how anything fast finds what it hits. All of it is plain arithmetic in `domain/movement/` and `domain/pathing/`; no physics engine is involved. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder. The numbers are in the [mechanics spec](../product/specs/character-movement-and-mechanics.md).

---

## The idea in one line

**Units are solid discs that turn at their own fixed rate, move at their own constant speed along a path, and get pushed apart after they move.**

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
2. Turns toward it along the shortest arc, by the unit's turn rate times the step, with a short ramp on the first ticks of a turn.
3. Translates only when the bearing is inside the action cone.
4. Advances by `min(speed × dt, distance remaining)` along the path, so a unit arrives exactly and never overshoots.

Speed is a stack: a base value, flat and percentage modifiers from statuses and orbs, and a clamp at both ends. The stack is recomputed each tick from the unit's current modifiers; nothing caches it.

The base speed and the turn rate are the unit's own. A unit spawned from a definition takes both from it, converted into per-tick values once when the world is created, beside its regeneration. The hero's form carries neither, so the hero reads the tuning table's, as does a body wearing no definition; a tuning change to them moves those units and no other. The ramp, the action cone, and the clamps are the tuning table's for every unit.

Targeted casts and attacks use the same turn, at the same rate: the ability pipeline waits for the bearing to enter the cone before its cast point starts.

---

## Being moved

A unit does not only walk. A displacement — a knockback from a cone, a pull, the drift of a wind — takes hold of it for a number of ticks and moves it a distance over them, in even steps. The steps are the first thing the movement system does each tick, before anything walks, so a displaced unit is left to the collision pass exactly as a walking one is: a push into a wall stops at the wall's edge, with the rest of the push spent against it, and nothing ever ends up inside an obstacle.

The unit keeps its order throughout. What stops it walking its own order meanwhile is a status flag: the effect that takes hold of a unit puts a status on it for the same ticks, and the flag that status raises is what the movement system reads, what the HUD greys, and what the icon shows. A push that lands during a tick, as a cast's commit does, has its flag raised only by the next tick's status pass, so the movement system also leaves alone any unit a push has hold of; the unit never walks a step on the tick it is struck. When the ticks run out the flag goes with the status and the unit walks on from wherever it was left. A unit a displacement already has hold of ignores a second one.

A lift is the other half of the same idea and moves nothing by itself: its status takes the unit's order off it for as long as the unit is in the air and gives the order back on the tick the status ends, from wherever the unit was dropped. The unit asks for a new path from there, since the one it was walking started somewhere else.

Nothing else moves a unit in the air either. A push that took hold of it counts its ticks off where it hangs without carrying it, so a push and a lift landing in the same tick leave the unit on the spot it was lifted from, and the rest of the push is spent in the air. The collision pass holds it too, as below.

---

## Areas

An effect that touches everything in a shape asks the hash for the units inside the smallest circle around the shape, then does the exact test on each candidate: a circle by its radius, a rectangle by its length along a facing and its width across it, a cone by its half angle and its length. The three tests are pure functions over plain numbers in `domain/movement/`, so the rule is testable without a world and the same test serves a cast, a zone, and a preview. The shape is placed at a point with a facing, the boundary counts as inside, and a unit is measured by where its centre stands.

---

## Blocking

After every unit has moved, the collision system separates overlaps. It is positional: it moves discs apart and changes no speed.

- **Unit against unit:** two discs closer than the sum of their collision radii are pushed apart along the line between their centres, each by half the overlap. A unit in the air is still a disc but one nothing moves: the unit on the ground takes the whole overlap, and two units in the air leave each other where they hang.
- **Unit against obstacle:** a disc overlapping an axis-aligned rectangle is pushed out until it touches: by the nearest edge when its centre is inside, straight away from the nearest point of the rectangle when its centre is outside.
- **Passes:** the system repeats a capped number of times, the cap a tunable, so a pile-up settles; it does not iterate to convergence. Every pass takes half of what overlap remains, so a pile converges on touching over a few ticks rather than snapping apart in one.
- **Order:** pairs in pool order, each pair once, the lower id first; a pair on the same point separates along a direction fixed by the pair, so a replay repeats it. Every push moves the unit in the spatial hash at once, so the next query in the same pass sees it.

Enemies do not steer around each other. They push. That is what makes a pack feel like a crowd, and it is what the [mechanics spec](../product/specs/character-movement-and-mechanics.md) asks for.

---

## Obstacles and the grid

A map definition holds its bounds and its obstacles as axis-aligned rectangles. The bounds are walls: collision keeps every disc inside them exactly as it keeps every disc out of an obstacle. At load, `domain/map/` derives a walkability grid from both: one cell per fixed square of world units, one layer per radius class, a cell open on a layer when a disc of that class's radius can stand anywhere in the cell without overlapping a rectangle or leaving the bounds. The grid is derived once per map and inflated per radius class — a large unit sees a cell blocked that a small one does not — so pathing never has to ask about a unit's radius mid-search. A unit paths on the smallest class whose radius holds its own, so a layer never opens a cell the unit does not fit in. The cell size and the class radii are tunables.

---

## The spatial hash

Every question of the form "what is near here" goes through one uniform grid hash in `domain/movement/`: cells of a fixed size keyed by integer coordinates, each holding the ids of the units in it.

| Operation | Used by |
| --- | --- |
| Insert and remove | Pools, on acquire and release |
| Move | The movement system, when a unit changes cell |
| Circle query | Attack range, area effects, attack-move target search, an occupied spawn point |
| Segment query, widened by a radius | Projectile sweeps, line and cone effects |
| Rectangle query | The presentation, to bind views to what the camera can see |

The hash returns candidates; the caller does the exact test. It returns ids in cell-then-index order so a replay finds the same target first. Queries write into a caller-supplied buffer and allocate nothing. A segment query takes the radius of the disc swept along it, so a unit whose centre is in a neighbouring cell is still a candidate. The cell size is a tunable; a change rebuilds the hash.

---

## Pathing

A move order asks `domain/pathing/` for a path from the unit to the target on the walkability grid:

- **A blocked destination** resolves to the nearest legal point on the inflated obstacle, and one outside the bounds to the nearest point inside them, when the order is issued, so an order always holds a point the unit can stand on. A point the grid closes on every side snaps to the nearest open cell instead.
- **A destination in line of sight** is one segment, with no search: the segment crosses no obstacle inflated by the class radius.
- **A\* with a binary heap** otherwise, on the grid inflated for the unit's radius class, from the cell under the unit to the cell under the destination, with diagonal steps that never cut a blocked corner. The search's arrays are allocated once per grid and reused by every search.
- **Line-of-sight smoothing** afterwards, dropping every waypoint that the unit can walk straight past, so a path across an open room is one segment and a path around a corner turns once at it.
- **A re-path budget per tick.** A unit that needs a path waits its turn; the system serves a fixed number each tick, the hero first and the rest in pool order, and a unit not yet served keeps whatever path it has and stands still if it has none.
- **An unreachable destination** clears the order: the unit has nowhere legal to go.

A path is a fixed-capacity buffer on the unit, not an allocated array. A path longer than the buffer is walked to its last waypoint and planned again from there.

---

## Projectiles

A projectile moves fast enough that testing where it ends up would skip over a unit. Each tick the projectile system sweeps the segment from the projectile's previous position to its current one against the discs the spatial hash returns for that segment, and the first hit along it wins. A homing projectile skips the query and tests only its target's disc, following the target's current position each tick.

A hit stops the projectile where it touched, so its hit list runs from the point of contact, and releases it. A projectile that touches nothing is released when it has flown its maximum range; a homing one is released the moment its target dies, is put out of reach, or has its pool slot reused, so it never lands on whatever took the slot. The system runs after collision, so a sweep reads where the tick's pushes and walks left every unit, and before death resolves, so a hit it landed is counted on the tick it landed it.

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
| Turning | Shortest arc at the unit's turn rate times the step, with a short ramp; translation only inside the action cone |
| Moving | `min(speed × dt, remaining)` along the path; no acceleration, no overshoot |
| Speed | A stack of base, modifiers, and clamps, recomputed every tick |
| Base speed and turn rate | The unit's definition's, converted once at world creation; the tuning table's for the hero and a body with no definition. Ramp, cone, and clamps are the table's for all |
| Targeted casts and attacks | Wait for the bearing to enter the cone before the cast point |
| Displacement | Even steps over a count of ticks, taken before anything walks and left to the same collision pass, so a push stops at a wall; the unit keeps its order and a status flag, or the push itself on the tick it lands, is what stops it walking meanwhile; a second displacement on a unit already held is ignored |
| A lift | Moves nothing itself: its status takes the order off the unit and gives it back on the tick the status ends, from where the unit was dropped, with a new path asked for |
| A unit in the air | Moved by nothing: a push on it counts its ticks off without carrying it, and in a colliding pair the unit on the ground takes the whole overlap; two in the air leave each other alone |
| Area shapes | Circle, rotated rectangle, and cone, each a pure test in `domain/movement/`; candidates from the hash's circle query, then the exact test on the unit's centre; the boundary is inside |
| Unit blocking | Positional push-out along the centre line, half each, a capped number of passes the tunable sets, no speed change; all of it on the grounded unit when the other is in the air |
| Obstacle blocking | Push out of the axis-aligned rectangle until touching: by the nearest edge from inside, away from the nearest point from outside; and back inside the bounds, which are walls |
| Push order | Pool order, each pair once, lower id first; a coincident pair along a direction fixed by the pair; the hash updated on every push |
| Enemies and each other | Push, never steer |
| The walkability grid | Derived once per map from the bounds and the obstacle rectangles, one layer per radius class; a cell is open where a disc of the class radius fits anywhere in it; a unit paths on the smallest class that holds it; cell size and class radii are tunables |
| "What is near" | Always the spatial hash: insert, remove, move, circle, segment, rectangle; the cell size a tunable |
| Hash results | Candidate ids in cell-then-index order, written into a caller-supplied buffer |
| Pathing | Grid A* with a binary heap, then line-of-sight smoothing; a destination in line of sight is one segment with no search |
| Re-pathing | A fixed budget per tick, hero first, the rest in pool order; a unit not yet served keeps its path and stands still without one |
| A blocked destination | The nearest legal point on the inflated obstacle, or the nearest point inside the bounds, resolved when the order is issued; a point the grid closes on every side snaps to the nearest open cell |
| An unreachable destination | The order is cleared |
| A path | A fixed-capacity buffer on the unit; one longer than the buffer is walked to its last waypoint and planned again from there |
| Projectiles | Sweep the segment from previous to current position; first hit wins |
| Homing projectiles | Test only the target's disc, at the target's current position |
| A projectile that hits | Stops at the point of contact, runs its hit list there, and is released |
| A projectile that touches nothing | Released when it has flown its maximum range, or, homing, the moment its target is gone or out of reach |

---

## Related documentation

- [Character movement and mechanics](../product/specs/character-movement-and-mechanics.md) — the numbers and the feel requirements this page implements
- [Simulation loop](./simulation-loop.md) — where in the tick movement, collision, and projectiles run
- [Entities and pools](./entities-and-pools.md) — the pools the spatial hash indexes
- [Ability pipeline](./ability-pipeline.md) — the turn-to-face stage and the projectile primitive
- [ADR 0002 — Custom fixed-step simulation](../adr/0002-custom-fixed-step-simulation.md) — why there is no physics engine
