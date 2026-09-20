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
| Status | planned |

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

---

### P1-S03-T03 — Map definition, the arena, and the walkability grid

| Field | Value |
| --- | --- |
| Layer | domain, content, simulation, tests |
| Size | 0.5 |
| Depends on | P0-S01-T03 |
| Status | planned |

**Build:** `MapDef` in `domain/definitions/` with bounds, obstacle rectangles, a spawn point, and an empty spawn-data list for later. `src/content/maps/arena.def.ts`: 4000 by 4000, walled, eight to twelve rectangles of varied size, one corridor wide enough for one unit, spawn at the centre. Under `src/domain/map/`: derive a walkability grid on 32-unit cells (tunable) from the rectangles at `loadMap`, inflated per radius class (small, hero, large, as a tunable list), stored on map scope as typed arrays sized once. `loadMap` sets the hero's position to the spawn point and pushes out any occupier on the first tick (handled by collision).

**Acceptance:**
- Every cell under a rectangle is blocked; every cell a hero-radius disc could not stand in without overlapping a rectangle is blocked in the hero class; the corridor is open in the small and hero classes and closed in the large class.
- The grid dimensions match the bounds; `loadMap` asserts it.

**Tests:**
- `tests/domain/map/walkability.spec.ts` — inflation per class, corridor open and closed by class.
- `tests/content/maps.spec.ts` — the arena validates (full validation lands in sprint 07; for now the shape and the corridor width).

**Definition of done:** Every change · `src/domain` · A new spell, effect, or enemy ability (the "one definition file, registered" row applies to maps).

---

### P1-S03-T04 — Grid A*, smoothing, the re-path budget, and blocked destinations

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests |
| Size | 1.5 |
| Depends on | T02, T03 |
| Status | planned |

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

---

## Sprint exit

| Check | Result |
| --- | --- |
| AT-M5 green; pathing and hash suites green | |
| Pile-up test deterministic across runs | |
| Actual days per ticket | T01 1 · T02 · T03 · T04 |

## Risks in this sprint

- **R3 and R4 are seeded here.** Push-out passes and the re-path budget are both tunables so that sprint 15 can tune rather than rewrite.
- Smoothing that walks a corner too tightly clips the obstacle by the unit's radius. Smooth on the inflated grid, not the raw one.
