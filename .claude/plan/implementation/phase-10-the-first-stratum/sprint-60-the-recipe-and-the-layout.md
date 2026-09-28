# Sprint 60 — The recipe and the layout

**Phase:** 10 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, P9-S53-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)'s rule).

## Goal

A descent level makes a map: the recipe is a definition, the generator draws only on its own keys, and a seed and a level give rooms joined by corridors, with an arrival point, a waypoint midway along the walk, and a portal behind the boss room, the same every time.

## Playable outcome

A generated map, loaded through a test door in a simulation spec and in the play scene's spec, is rooms and corridors: the waypoint a third to a half along the walk, the portal behind the last room, no packs yet, and the same map for the same seed and level every time. The build reaches one from sprint 61, when the panel's jump to a map level arrives (P10-S61-T04); until then no descent map is reachable in the build, since the town's waypoint lists only reached ones.

---

## Tickets

### P10-S60-T01 — The recipe, the generator's draws, its version, and the plain layout

| Field | Value |
| --- | --- |
| Layer | domain, content, simulation, tests, docs |
| Size | 2 |
| Depends on | P10-S59-T03, P10-S54-T02, P10-S54-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The recipe** as a definition kind, `src/domain/definitions/recipe-def.ts`, with `tuning: null` as a map's has, validated by the registry. The Nave's recipe, `src/content/strata/nave.def.ts`, is written to the numbers P10-S54-T04 approved. Until the Nave's families exist (P10-S63-T02), the long road's grunt, runner, archer, tank, frost raider, and lancer stand in for its roster. So the generator is built on fixture families and none of its tickets waits on the roster's rows.
- **`src/domain/generation/`** (new), pure: a recipe, the run's seed, and a level in; a `MapDef` of kind descent out. Its working record is on the world's scratch, or a record the caller passes in Node. It draws through the keyed draw with the level as key, at tick 0, under purposes of its own ([ADR 0010](../../../../docs/adr/0010-a-rules-random-draw-is-a-keyed-hash.md), [R31](../02-risks-and-hidden-work.md)).
- **The resolution:** a descent level resolves by generation in the build, replacing the empty list of P10-S55-T03; the fixture list stays as a test door.
- **The generator version,** a constant folded into the content version in `src/simulation/replay/content-version.ts`, so a log recorded on one generator refuses on another by its stamp.
- **The plain fallback layout:** the recipe's layout that passes the map checks by construction, as P10-S54-T04 described it, with a choke closing each region. The generator's first layout until T02.

**Acceptance:**
- The same seed, level, and recipe give a map equal field by field; another level or seed gives another.
- A played session's draws do not move a generated map, and generation does not move a played session's draws.
- The plain layout passes every map check on 100 seeds at every level of the Nave.
- It plays: in a simulation spec, the hero loaded onto a generated plain map by the test door walks from arrival to waypoint to portal and steps down to the next level's map.
- The bar: generation of the plain layout timed headless by the spec, against the 50 ms budget.

**Tests:**
- `tests/domain/generation/generate-map.spec.ts`: purity by seed, level, and recipe; the kind; the plain layout's checks on a sweep of 100 seeds.
- `tests/simulation/generation/draw-isolation.spec.ts`: every map of a seed generated before and after a played session, equal ([R31](../02-risks-and-hidden-work.md)).
- `tests/content/recipes.spec.ts`: the Nave's recipe validates and matches the stratum spec's tables.
- `tests/simulation/replay/content-version.spec.ts`: the generator version in the stamp.

**Pages:** [content and registries](../../../../docs/architecture/content-and-registries.md) and [world model](../../../../docs/architecture/world-model.md), checked against ADR 0016; [where to look](../../../../docs/architecture/where-to-look.md), the generator and the recipes.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P10-S60-T02 — The rooms-and-corridors layout

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 2 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Nave's layout, as Diablo I's Cathedral ([Q131](../backlog/open-questions.md), [a map's parts](../../../../docs/product/specs/the-descent.md#21-a-maps-parts)), in `src/domain/generation/`:
- **Rooms** of open ground, of the recipe's sizes, on the walkability grid's cell edges.
- **Corridors and doorways** one to three bodies wide, joining the rooms into one connected walk. The walls between are obstacle rectangles, so the grid, the pathing, and the obstacle view take them as any map's.
- **Two or three regions** along the walk, each closed by a choke.
- **The points:** an arrival point in the first room; the waypoint in a room a third to a half along the walk from arrival to portal, measured along the grid's path; the last room before the portal as the boss room. On a map whose level ends a stratum, that room is the stratum boss's chamber, one doorway in.
- **The walk's length and the waypoint's fraction** returned beside the map for the sweep to print.

If the re-cut at sprint 59 fired, this ticket builds open ground broken by blocks instead, the long road's style, with every region closed by a choke, and is edited in place with a note before it starts.

**Acceptance:**
- Every map the layout makes on 100 seeds at every level of the Nave passes the map checks without the retry, or the rate is written; the waypoint's fraction lies in a third to a half on every one.
- The obstacle count and the grid's size are printed for the largest map, against the heap figure of ADR 0015.
- It plays: in a simulation spec, the hero walks a generated map from arrival to waypoint to portal by move orders alone; walked in Chrome by an agent once the panel's jump arrives in sprint 61.
- The bar: generation of the largest map under 50 ms headless, printed by the spec; A* from arrival to portal timed once.

**Tests:** `tests/domain/generation/rooms-layout.spec.ts`: connectivity for every radius class, corridor widths, regions and their chokes, the waypoint's fraction, the boss room and the chamber on a tenth map, on a sweep of 100 seeds.

**Pages:** [movement, collision, and pathing](../../../../docs/architecture/movement-collision-pathing.md), if a generated map's obstacle count asks a line; the Nave's spec, checked against what the layout makes.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The recipe kind; the Nave's recipe on stand-in families | |
| Purity and draw isolation | |
| The plain layout on 100 seeds, every check | |
| Rooms and corridors (or the fallback cut, if it fired) on 100 seeds; the waypoint's fraction | |
| Generation time of the largest map, headless | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The layout's tuning does not converge** ([R42](../02-risks-and-hidden-work.md)). A layout that fails its checks is fixed as recipe content, wider chokes and fewer rooms, never by a new generator branch; if sprints 60 and 61 run over 1.0, open ground is the fallback cut.
- **Many obstacles.** Rooms carved from solid make many wall rectangles; the grid and the obstacle view are sized by count, and the largest map's count is printed before packs are placed on it.
