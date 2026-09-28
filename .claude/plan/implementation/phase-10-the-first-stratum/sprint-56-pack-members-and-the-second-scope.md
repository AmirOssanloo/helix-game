# Sprint 56 — Pack members and the second scope

**Phase:** 10 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, P9-S53-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)'s rule).

## Goal

The two structures travel stands on exist and cost what the record said: a pack holds a list of members, so a boss and its guard are one pack; the world holds two map scopes, the hero crossing between them as one object; and a map's portal and waypoint are drawn where they stand.

## Playable outcome

On a fixture map loaded from the panel, the portal and the waypoint are drawn as rings at their points, the waypoint's label reading its map. The long road plays as before, and its boss packs sleep and wake as before.

---

## Tickets

### P10-S56-T01 — A pack as a bounded list of members

| Field | Value |
| --- | --- |
| Layer | domain, content, simulation, tests, docs |
| Size | 1.5 |
| Depends on | P10-S55-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** a pack's definition and its record hold a bounded list of members, each an archetype, a tier, and a count, in place of one archetype, tier, and count. The bound is a constant sized for a map boss with its guard and later a split's children ([ADR 0020](../../2026-09-28-architecture-outline-next-phases.md)'s paper, phase 12). Its record counts the living by member, so a sleep keeps a mixed pack whole and a waking spawns every member at its tier. `spawn_pack` names its members. The long road's 37 packs and the arena's are each written as one member; map files are exempt from the size limit as data.

The checksum reads a one-member pack's fields in the order the old record's were read, so no stored checksum moves; the content version does, and `pnpm restamp` re-stamps.

**Acceptance:**
- A pack of a boss and two guards of another tier sleeps, wakes, and keeps its living count per member across a sleep.
- The long road's packs are one member each; every stored log replays with a re-stamp and no checksum moved ([R36](../02-risks-and-hidden-work.md)).
- The member list allocates nothing in steady state.
- It plays: the long road's pack 14 and pack 37, the bosses, wake and fight as before, by an agent in Chrome.
- The bar: the long-road stress case under `pnpm test:budget` green.

**Tests:**
- `tests/domain/ai/packs.spec.ts`: a mixed pack's sleep and waking; the bound refused past its capacity by the registry.
- `tests/simulation/spawn-pack.spec.ts`: `spawn_pack` with two members at two tiers.
- `tests/content/maps.spec.ts`: every pack's members place; the live-near bound counts every member.
- `tests/simulation/replay-determinism.spec.ts`: green after the re-stamp.

**Pages:** [entities and pools](../../../../docs/architecture/entities-and-pools.md), the pack record; [content and registries](../../../../docs/architecture/content-and-registries.md), the pack's shape in a map; [adding an enemy](../../../../docs/workflows/adding-an-enemy.md), if it writes a pack.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

### P10-S56-T02 — Two map scopes, and the hero exchanged between them

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests, docs |
| Size | 2 |
| Depends on | P10-S54-T01, P10-S55-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** as [ADR 0015](./sprint-54-the-records-and-the-nave-on-paper.md) decides:
- **Two scopes.** `src/simulation/world.ts` makes two map scopes of the same capacities; `world.map` is the stepped one, and the other is the kept scope, empty or holding a kept map. No system reads the kept scope.
- **The exchange.** A pool operation in `src/domain/entities/pool.ts` exchanges one slot's object with the same slot of another pool of its kind. A transition swaps the scopes' roles and exchanges the hero's slot-zero object between the two unit pools, so its id, statuses, clocks, and totals move with it.
- **Two loads.** A plain load empties the stepped scope and makes the new map there. A load that keeps the current map makes the new map in the empty scope and swaps the roles, so the old map becomes the kept one; a return swaps back and empties the scope left. All are domain operations the travel rules (sprint 57) call; this ticket reaches them only through a test door.
- **The heap,** measured in Chrome on the development machine by an agent after a collection: one scope as today against two, on the long road loaded beside a fixture map. The figure goes in ADR 0015's revisit point, and the record moves to Accepted. If the second scope costs more than the record's estimate by half again, the ticket stops and the architect is asked.

**Acceptance:**
- Through the test door, the hero crosses to the other scope and back with the same id, statuses, clocks, and health; the kept scope's units, projectiles, zones, and ground items are untouched by 600 ticks in the other.
- Nothing is copied field by field; no allocation on a transition but the map's own load.
- It plays: nothing new on screen yet; the long road plays as before, by an agent in Chrome.
- The bar: the heap with two scopes recorded in ADR 0015 and the sprint exit; the stress tier green.

**Tests:**
- `tests/domain/entities/unit-pool.spec.ts`: the slot exchange, both ways, ids unchanged.
- `tests/simulation/travel/kept-scope.spec.ts`: the hero across and back; the kept scope frozen for 600 ticks; the live cap and the pools' misses counting the stepped scope only.
- `tests/simulation/doors/run-scope-outlives-map-scope.spec.ts`: green with two scopes.

**Pages:** [entities and pools](../../../../docs/architecture/entities-and-pools.md) and [world model](../../../../docs/architecture/world-model.md), checked against the code; ADR 0015 accepted with its heap figure.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P10-S56-T03 — Portal and waypoint rings, and the new strings

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 0.5 |
| Depends on | P10-S55-T02, P10-S55-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** the portal and the waypoint drawn as rings at their map's points, from frames the code shape painter bakes (`src/presentation/atlas/shape-painter.ts`, listed in `src/content/atlas-frames.ts`), as every frame is: the existing ring frames or one more, with a tint for each. No drawn or sourced asset; art is phase 16's. A travel-point view in the units' band, from a pool, with its syncer in the syncer group P10-S55-T02 made; it reads the map's portal point and waypoint through the world view, and P10-S57-T02 moves it to the map's travel points. The waypoint's label, and the waypoint screen's strings to come, **TOWN**, **MAP 1** to **MAP 10**, and **THE NAVE**, are written in glyphs the atlas already has, and the font's content test lists them.

**Acceptance:**
- A fixture map's portal and waypoint drawn at their points; the long road and the arena draw none.
- Every new string is in the glyph set.
- It plays: in Chrome by an agent, a fixture map loaded from the panel shows both rings.
- The bar: the rings batch with the units; world draw calls unchanged, by the draw-call counter.

**Tests:**
- `tests/presentation/travel-point-view.spec.ts`: a ring per point at its projected position, its tint, none on a map with no points; nothing allocated per frame.
- `tests/content/catalogues.spec.ts`: the new strings in the glyph set.
- `tests/presentation/shape-atlas.spec.ts`: any new frame baked.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), the travel-point view; [map and camera](../../../../docs/product/features/map-and-camera.md#waypoints), checked.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| A mixed pack sleeps and wakes whole; the long road's logs re-stamped with no checksum moved | |
| Two scopes; the hero across and back; the kept scope frozen | |
| The heap, one scope against two, and ADR 0015 accepted | |
| The rings on a fixture map, in Chrome | |
| The render benchmark, by an agent | |
| Phase 9's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The pack record's new shape moves a checksum** ([R38](../02-risks-and-hidden-work.md)). The one-member pack is read in the old order; a moved checksum is traced to a field before anything is re-recorded.
- **The second scope's heap.** The number is measured, not assumed; over the estimate by half again stops the ticket for the architect, and the phase's re-cut is read then, not at sprint 59.
- **The exchange leaves a reference behind.** A view, a pack record, or a clock holding the hero by object rather than by id would see a stranger after a swap; the across-and-back spec reads every such holder.
