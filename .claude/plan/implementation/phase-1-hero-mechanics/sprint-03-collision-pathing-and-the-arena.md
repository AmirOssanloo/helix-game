# Sprint 03 — Collision, pathing, the spatial hash, and the arena

**Phase:** 1 · **Sized days:** 4 · **Buffer:** 1

## Goal

Units are solid discs that push apart and never enter an obstacle; the hero paths around the arena's rectangles and through its corridor on a grid with A*.

## Playable outcome

Still no hero on screen. In tests, AT-M5 is green, a move order crosses the arena around obstacles, and a click on an obstacle resolves to its nearest walkable edge.

---

## Tickets

### P1-S03-T01 — The spatial hash

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 1 |
| Depends on | P0-S01-T02 |
| Status | done |

**Build:** Under `src/domain/movement/spatial-hash.ts`: a uniform grid on 128-unit cells (the cell size a tunable), keyed by integer coordinates packed into one number, each cell a fixed-capacity array of unit ids with a count. Operations: insert, remove, move (when a unit changes cell), circle query, segment query, rectangle query. Every query writes candidate ids into a caller-supplied buffer and returns the count; results come in cell order then slot order; nothing allocates. Pools call insert on acquire and remove on release; the movement system calls move after translating. The hash lives on map scope and is rebuilt by `loadMap`.

**Acceptance:**
- A circle query returns every unit whose cell intersects the circle and none outside those cells; the caller does the exact test.
- A moved unit is found in its new cell and not its old one.
- Two runs with the same positions return candidates in the same order.
- A cell at capacity refuses the insert and counts the miss.

**Tests:**
- `tests/domain/movement/spatial-hash.spec.ts` — the eight to ten from the testing standard.

**Definition of done:** Every change · `src/domain`.

*Edited while building: the hash is created with the world, since the unit pool it indexes is, and `loadMap` rebuilds it rather than filling a null slot; a change to the cell size tunable rebuilds it on the tick that consumes the command. "Pools call insert on acquire and remove on release" landed as the `acquireUnit` and `releaseUnit` doors in the unit's file, the shape the entities page sketches, with a `Pool.acquireIndex` so the door has the id without a scan; the movement system moves every live unit after translating, so a unit taken from the pool directly or displaced by any other write is indexed by the end of the tick. The segment query takes the radius of the disc swept along it, since the cells a segment crosses alone miss a unit whose centre is in the next cell. A cell holds 64 ids and the hash holds one cell per unit slot, so a cell is never refused for want of cells.*

---

### P1-S03-T02 — Disc push-out

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 1 |
| Depends on | T01 |
| Status | done |

**Build:** Under `src/domain/movement/collision.ts` and `collisionSystem` registered after `movementSystem`: for every unit, query the hash for neighbours and separate any pair closer than the sum of their collision radii along the centre line, half each, never changing speed; push a disc inside an axis-aligned obstacle rectangle to its nearest edge; repeat for a capped number of passes (a tunable, default 3). Ties in pair order broken by id. The three radii on the unit (collision, bound, selection) exist as distinct fields from the definition; selection is never read by the simulation.

**Acceptance:**
- AT-M5: two heroes cannot rest with centres 40 apart; they can at 54 or more.
- A disc placed inside a rectangle is outside it after one pass; a disc straddling a corner exits by the nearer edge.
- Twenty discs dropped on one point settle into a non-overlapping pile within the capped passes, and the tick allocates nothing doing so.
- A unit pushed by knockback (a debug displacement for now) into a wall stops at the wall edge.

**Tests:**
- `tests/domain/movement/collision.spec.ts` — circle-circle, circle-rectangle, corner, separation distances.
- `tests/simulation/at-locomotion.spec.ts` — `AT-M5`.
- `tests/simulation/pile-up.spec.ts` — twenty discs, no overlap after the passes, determinism across two runs.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

*Edited while building: the rules are in `collision.ts` and the system in `collision.system.ts`, the suffix the coding standard asks for. `MapDef` gained its obstacle rectangles here, since the system has nothing to push out of without them; T03 adds the bounds, the spawn point, and the spawn data. The three radii are set by `acquireUnit` from the tuning table, the only definition of a body that exists, with a `selection_radius` tunable added beside the two the spec names since the spec gives the selection size no number; a spawn from a definition writes over them. The wall row's "debug displacement" is a test writing the unit's position by hand, not a debug command. A pair on one point separates along a direction fixed by the pair's slots, so a dropped pile fans out and replays; every push moves the unit in the hash at once, since a pile dropped on a cell boundary otherwise stalled for ticks on pairs the stale hash stopped proposing. Half-each passes converge on touching rather than reach it: the largest overlap in a pile of twenty roughly halves a tick, is under a world unit by the sixth tick, and under a thousandth by the eighteenth; the pile-up test asserts those two bars, not zero. The system-level rows, the wall edge, the hash after a push, and the passes tunable, are in `tests/simulation/collision-system.spec.ts`, a fourth spec the ticket did not list.*

---

### P1-S03-T03 — Map definition, the arena, and the walkability grid

| Field | Value |
| --- | --- |
| Layer | domain, content, simulation, tests |
| Size | 0.5 |
| Depends on | P0-S01-T03 |
| Status | done |

**Build:** `MapDef` in `domain/definitions/` with bounds, obstacle rectangles (already present; added with the collision system), a spawn point, and an empty spawn-data list for later. `src/content/maps/arena.def.ts`: 4000 by 4000, walled, eight to twelve rectangles of varied size, one corridor wide enough for one unit, spawn at the centre. Under `src/domain/map/`: derive a walkability grid on 32-unit cells (tunable) from the rectangles at `loadMap`, inflated per radius class (small, hero, large, as a tunable list), stored on map scope as typed arrays sized once. `loadMap` sets the hero's position to the spawn point and pushes out any occupier on the first tick (handled by collision).

**Acceptance:**
- Every cell under a rectangle is blocked; every cell a hero-radius disc could not stand in without overlapping a rectangle is blocked in the hero class; the corridor is open in the small and hero classes and closed in the large class.
- The grid dimensions match the bounds; `loadMap` asserts it.

**Tests:**
- `tests/domain/map/walkability.spec.ts` — inflation per class, corridor open and closed by class.
- `tests/content/maps.spec.ts` — the arena validates (full validation lands in sprint 07; for now the shape and the corridor width).

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability (the "one definition file, registered" row applies to maps).

*Edited while building: `MapDef` carries `bounds`, `obstacles`, `spawnPoint`, and `spawns`, the last typed as pack-member spawn data with an archetype id, a position, and a pack id, empty on the arena. The bounds are walls to the simulation and not only to the grid: `keepInsideRect` joined the collision rules and the collision system clamps every unit inside the bounds in its obstacle pass, since a walled arena with no wall would let a unit walk out until pathing clamps destinations. The grid under `src/domain/map/walkability.ts` is one `Uint8Array` with one layer per radius class; a cell is open on a layer when a disc of the class radius fits anywhere in the cell, the conservative reading of "could not stand in" and what smoothing on the inflated grid needs, and the bounds block a strip one class radius wide inside each side. The class radii are the tunables `radius_class:0` to `:2` (small 16, hero 27, large 50) and the cell size is `walkability_cell_size`, both read at load; a unit's class is the smallest whose radius holds it. `loadMap` does not release the hero: every other unit goes, the hero is carried to the spawn point with its order cleared, and the hash is rebuilt over what is left, since the entities page says the hero is never recreated. `walkability` on map scope is never `null`, since a world is created on a map, so the world's constructor assembles map scope directly instead of calling `loadMap`. The maps are listed in `src/content/maps/index.ts` until the registry of sprint 07 takes them, and the app boots on the arena. A change to the grid's tunables mid-map takes effect at the next map load; T04's pathing system re-derives the grid on the tick that consumes the command, as the movement system rebuilds the hash.*

---

### P1-S03-T04 — Grid A*, smoothing, the re-path budget, and blocked destinations

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 1.5 |
| Depends on | T02, T03 |
| Status | done |

**Build:** Under `src/domain/pathing/`: A* over the inflated grid for the unit's radius class with a preallocated binary heap and preallocated open, closed, and parent arrays sized to the grid; line-of-sight smoothing that drops every waypoint the unit can walk straight past; the path written into the unit's fixed-capacity path buffer; a re-path queue served a fixed number of searches per tick (a tunable), hero first, others in id order, with units keeping their current path while they wait; a blocked destination resolved to the nearest legal point on the inflated obstacle; a destination outside the bounds clamped inside. The movement system follows the buffer's waypoints. `pathingSystem` registered before `movementSystem`.

**Acceptance:**
- A path exists around a rectangle; none across a wall; the corridor is used when it is the only way.
- Smoothing turns a path across an open room into one segment.
- A large-class unit is refused the corridor and paths around.
- With the budget at two and five units requesting, two are served this tick and three the next, the hero always first.
- A click on an obstacle produces a move to its nearest walkable edge; a click outside the map to the nearest point inside.
- The search allocates nothing after the first `loadMap`.

**Tests:**
- `tests/domain/pathing/astar.spec.ts` — the six to eight from the testing standard.
- `tests/simulation/pathing-budget.spec.ts` — the budget and hero priority.
- `tests/simulation/at-commands.spec.ts` — the obstacle-click and off-map-click rows from the map page.

**Definition of done:** Every change · `src/domain` · A new command, event, or system.

*Edited while building T03: the pathing system also re-derives the walkability grid when `walkability_cell_size` or a `radius_class` tunable has changed, on the tick that consumes the command, as the movement system rebuilds the hash; the grid records the cell size and radii it was derived under.*

*Edited while building: the pieces are `astar.ts`, `line-of-sight.ts`, `smoothing.ts`, `destination.ts`, and `pathing.system.ts` under `src/domain/pathing/`. The search's workspace, the heap and the per-cell arrays, lives on map scope as `pathSearch`, created with the world and fitted to the grid by `loadMap` and by the pathing system after a re-derive; cells are stamped with the search that touched them, so nothing is cleared between searches. Line of sight is geometric, the segment against every obstacle inflated by the class radius, rather than a walk over grid cells: a unit pushed against a wall stands in a cell the grid closes, and grid line of sight would have it sidestep to a cell centre before walking along the wall; a hair of tolerance keeps a disc touching a wall at exactly its radius in line of sight. For the same reason the search expands the start cell whatever its flag and enters the goal cell whatever its flag; every other cell on a path is open, and diagonal steps never cut a blocked corner. A destination in line of sight is one segment with no search. The destination is resolved when the order is issued, by the command system through `resolveDestination`, since only the state machine writes an order: clamped inside the bounds by the class radius, pushed to the nearest edge of the inflated obstacle for a capped number of passes, and snapped to the nearest open cell when the passes leave it inside overlapping inflations or in a cell no search can enter from beside it. "Nearest walkable edge" is therefore the inflated edge, 27 units off the rectangle for the hero, not the grid's cell boundary. A unit asks for a path through a `needsPath` flag the state machine sets on a move or attack-move and clears on a stop; the movement system no longer fills an empty path and a unit waiting for one stands still; the budget is the `repath_budget` tunable, default 8, counting the hero; an unreachable destination clears the order; a path the buffer cuts short is walked and then asked for again from its last waypoint, decided by the movement system when the path completes short of the destination by the arrival epsilon. `deriveWalkabilityGrid` takes bounds and obstacles rather than a map definition, since map scope holds those and not the definition. The collision-system row "a unit walking into a wall" now arranges its straight path by hand, since a clicked destination inside a wall no longer stays inside it. The arena-crossing row and the two click rows are in `tests/simulation/at-commands.spec.ts` under map headings; the grid re-derive, the unreachable destination, the cut path, and a hero walking around a block are in `tests/simulation/pathing-budget.spec.ts` beside the budget rows.*

---

## Sprint exit

| Check | Result |
| --- | --- |
| AT-M5 green; pathing and hash suites green | Green, 2026-09-20, in `pnpm test`: AT-M5 in `at-locomotion.spec.ts`, the search, smoothing, line of sight, and resolver in `tests/domain/pathing/astar.spec.ts`, the budget in `tests/simulation/pathing-budget.spec.ts`, the hash in its unit and simulation specs |
| Pile-up test deterministic across runs | Green, 2026-09-20: the two-run determinism row of `tests/simulation/pile-up.spec.ts` |
| Actual days per ticket | T01 1 · T02 1 · T03 0.5 · T04 1.5 |

## Risks in this sprint

- **R3 and R4 are seeded here.** Push-out passes and the re-path budget are both tunables so that sprint 15 can tune rather than rewrite.
- Smoothing that walks a corner too tightly clips the obstacle by the unit's radius. Smooth on the inflated grid, not the raw one.
