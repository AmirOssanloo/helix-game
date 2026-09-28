# Sprint 54 — The records and the Nave on paper

**Phase:** 10 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 10 does not start while two phases' playtests are outstanding** ([R41](../02-risks-and-hidden-work.md)). **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, the accepted tickets, P9-S53-T03 onward in the [sprint 53 file](../phase-9-active-items/sprint-53-the-bucket-the-docs-and-the-gate.md), run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint, so no sprint holds more than four sized days ([Q118](../backlog/open-questions.md)'s rule).

## Goal

Everything the phase builds is decided before any code: the kept map, the generated map, the save that must hold what this phase adds to run scope, and the family whose rows the Nave's enemies are, each as a decision record; the Nave's recipe and the town's layout as design the generator and the town map are built to.

## Playable outcome

None in the build; this sprint is paper. The long road plays as phase 9 left it.

---

## Tickets

### P10-S54-T01 — ADR 0015, a town portal keeps its map as a second map scope that is not stepped

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The engineering architect |
| Status | planned |

**Build:** `docs/adr/0015-a-town-portal-keeps-its-map-as-a-second-map-scope-that-is-not-stepped.md`, from section 3 of [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md), written **Proposed**:
- The world makes two map scopes of the same capacities. One is stepped; the other is kept or empty; the roles swap at a transition.
- The hero holds slot zero in both unit pools. A transition exchanges the slot's object, so the hero's id, statuses, clocks, and totals travel with it and nothing is copied field by field.
- What "frozen" means: no system reads the kept scope; the live cap, the pools' misses, and the drops not made count the stepped scope only. Each scope has its own ground-item capacity of 512, which answers [ADR 0013](../../../../docs/adr/0013-loot-on-the-ground-is-a-pooled-entity-that-stays-until-the-map-is-made-again.md)'s revisit point on a kept map's ground items.
- The checksum walks both scopes by role, the stepped first; the world view shows the stepped scope only; the views rebind on a swap as on a map load.
- The alternatives weighed: the kept map serialised through the checksum's field lists; one scope with the town as a walled area; a kept map as a save.
- The heap: the second scope's cost estimated from the pool capacities, record sizes, and the grid at the largest map the recipe allows. The revisit point is set from the number P10-S56-T02 measures in Chrome, and that ticket moves the record to Accepted.

It amends the "Two lifetimes" section of [entities and pools](../../../../docs/architecture/entities-and-pools.md) and [ADR 0003](../../../../docs/adr/0003-layered-single-package-architecture.md)'s two scopes, as target, with placeholders.

**Acceptance:**
- The record states every bullet above and its revisit point names the heap figure it waits on.
- Entities and pools states two map scopes, the kept one unread, in its body and its quick reference.
- No page gains a phase number, a ticket, or a sprint.
- It plays: nothing changes in the build; `tests/docs-links.spec.ts` green.
- The bar: not applicable, no code changes; the heap estimate is written in the record for P10-S56-T02 to check.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** the new record; the ADR index; [entities and pools](../../../../docs/architecture/entities-and-pools.md); [world model](../../../../docs/architecture/world-model.md), if it names the scopes.

**Definition of done:** Every change · A documentation change.

---

### P10-S54-T02 — ADR 0016, a generated map is a pure function of the run's seed, its level, and its recipe

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The engineering architect |
| Status | planned |

**Build:** `docs/adr/0016-a-generated-map-is-a-pure-function-of-the-runs-seed-its-level-and-its-recipe.md`, written and accepted, from the outline's section 3:
- The map reference, an authored id or a descent level, replacing the bare map id in map scope; the map kind, town, descent, or authored, on the map definition.
- **How a descent level resolves before the generator exists.** Until P10-S60-T01, a descent level resolves to an authored map a list names by level, given at world creation. Tests give two fixture maps; the build gives none, so a descent level is refused there. The generator replaces the lookup. The lookup stays as a test door, so travel specs keep walking fixture maps. This is what lets travel be built and proved before the generator ([R45](../02-risks-and-hidden-work.md)).
- The generator's draws, keyed on the level at tick 0 under purposes of their own ([ADR 0010](../../../../docs/adr/0010-a-rules-random-draw-is-a-keyed-hash.md)), so no play draw moves a map and no map draw moves play.
- The recipe as a definition kind with no tuning surface; a generator version constant folded into the content version; a golden hash of a sampled seed sweep that fails on any change to the output without the version moving.
- Validation at generation by the domain's map checks, a bounded retry by attempt index, the recipe's plain fallback layout, which passes by construction, and the counter.
- The cost: generation and the grid on the transition tick, left out of the tick budget's window as a map load already is, with a budget of its own, under 50 ms headless on the development machine for the recipe's largest map.

[Content and registries](../../../../docs/architecture/content-and-registries.md) gains the recipe kind. [Simulation loop](../../../../docs/architecture/simulation-loop.md) gains the transition's place in the tick: the pending-travel record applied first on the next tick, as `load_map` is. [Performance](../../../../docs/standards/performance.md) gains the generation budget. Each is written as target, with placeholders.

**Acceptance:**
- The record states every bullet above, the resolution before the generator included.
- The three pages state their rule in the body and the quick reference.
- It plays: nothing changes in the build; `tests/docs-links.spec.ts` green.
- The bar: not applicable; the generation budget is written for P10-S61-T03 to read.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** the new record; the ADR index; content and registries; simulation loop; performance; [where to look](../../../../docs/architecture/where-to-look.md), pointers for the recipe and the generator.

**Definition of done:** Every change · A documentation change.

---

### P10-S54-T03 — ADR 0017, run scope is the save, on paper; ADR 0018, a variant is a row of its family

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The engineering architect |
| Status | planned |

**Build:** two records, from the outline's section 3.
- **`docs/adr/0017-run-scope-is-the-save.md`, Proposed.** What a save holds: every run-scope field, listed by a typed list over run scope's keys, each field left out named with its reason. Nothing of map scope; a run resumes in town ([Q126](../backlog/open-questions.md), [Q127](../backlog/open-questions.md)). Clocks as ticks remaining; the text format with a format version and the content and generator versions; a chain of pure migrations; where encoding lives; when a save is written, by a save-point counter the rules move; a log that begins from a save. Its list names this phase's run-scope additions by name: waypoints reached, the standing town portal, the town store, and the pending-travel record, the last as left out with its reason. Each phase 10 ticket that adds run-scope state checks its line here. The record is accepted at phase 11's start, by the ticket that builds it.
- **`docs/adr/0018-a-variant-is-a-row-of-its-family.md`, accepted.** A family as a definition kind: a behaviour key, a body, a silhouette frame, an ability kit, carried statuses, and one row per variant (id, name, tint, numbers, at most one ability more). The registry expands each row into the archetype record the domain reads today, so no rule changes. Tuning keys under [ADR 0009](../../../../docs/adr/0009-definition-tuning-key-is-the-field-path.md), the field path into the family's row. The long road's thirteen archetypes stay as they are, and the descent's families share their behaviours and abilities by key only.

**Acceptance:**
- ADR 0017 lists every run-scope field phase 10 adds, and ADR 0018 names the long road as untouched.
- [Content and registries](../../../../docs/architecture/content-and-registries.md) states the family kind and its expansion in its body and quick reference.
- It plays: nothing changes in the build; `tests/docs-links.spec.ts` green.
- The bar: not applicable, no code changes.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** the two records; the ADR index; content and registries; [entities and pools](../../../../docs/architecture/entities-and-pools.md), run scope's list pointing at ADR 0017.

**Definition of done:** Every change · A documentation change.

---

### P10-S54-T04 — The Nave's recipe and the town's layout, as design

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

**Build:** the recipe the generator is built to, written in `docs/product/specs/the-nave.md`, a stratum spec of its own as [the long road](../../../../docs/product/specs/the-long-road.md) has, and linked from [the descent](../../../../docs/product/specs/the-descent.md#9-open-numbers)'s open numbers. It answers the descent's open recipe number and the design outline's two open questions for phase 10:
- **Style:** rooms and corridors, as Diablo I's Cathedral ([Q131](../backlog/open-questions.md)): room sizes, corridor and doorway widths of one to three bodies, and how many rooms a map holds.
- **Size:** the map's bounds in world units against eight to twelve minutes at the driver's pace, with the reasoning from the long road's minutes per region.
- **Regions:** two or three, harder toward the portal; each closed by a choke.
- **Placement:** the arrival point, the waypoint a third to a half along the walk, the map boss before the portal with a guard of two or three, and the tenth map's chamber, one doorway in, whose portal opens on the stratum boss's death.
- **Pack budget,** by [the density table](../../../../docs/product/specs/the-descent.md#6-density): field packs of 3 to 6, elite packs of 2 to 3, about 10% elite, 90 to 110 enemies, the bound of 60 near any point, and expected drops at most half the ground-item capacity ([ADR 0013](../../../../docs/adr/0013-loot-on-the-ground-is-a-pooled-entity-that-stays-until-the-map-is-made-again.md)'s revisit point).
- **The plain fallback layout:** what a player sees when the retry is exhausted, which must still teach a choke.
- **The floor's tint:** a colour that reads as the Nave on the existing floor tile. There is no new art: every frame in phase 10 is drawn by the code shape painter, and the floor tile is the one image the build already loads ([Q133](../backlog/open-questions.md), art in phase 16).
- **The town:** its layout, small enough to cross in a few seconds; the arrival point, the store's ring, the waypoint, and where the town's end of a portal stands, written on [map and camera](../../../../docs/product/features/map-and-camera.md#the-town).

Each number is a row of a table a content test reads, as the long road's are.

**Acceptance:**
- Every number the generator's tickets (P10-S60-T01 to P10-S61-T02) and the town ticket (P10-S58-T01) need is on the page, as a table.
- Approved before P10-S60-T01 starts, by the game designer on the maintainer's delegation as the design outline was, with the date written under the page's tables ([R43](../02-risks-and-hidden-work.md)).
- It plays: not applicable; paper.
- The bar: the recipe's 90 to 110 enemies and the bound of 60 are what the stress case (P10-S64-T01) reads.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** the new stratum spec; [the descent](../../../../docs/product/specs/the-descent.md), its open numbers pointing at it; [map and camera](../../../../docs/product/features/map-and-camera.md#the-town), the town's layout; [product README](../../../../docs/product/README.md), the new page listed.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| ADR 0015 written Proposed, with the heap estimate | |
| ADR 0016 accepted, with the resolution before the generator | |
| ADR 0017 Proposed with phase 10's run-scope fields listed; ADR 0018 accepted | |
| The Nave's recipe and the town's layout approved, as tables | |
| Phase 9's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The records move a size.** A record that finds more work than a ticket carries names the ticket and the size in a note under it, before that ticket starts; the phase's total is re-read at sprint 55's start.
- **The recipe's design outruns its minutes.** Map size against eight to twelve minutes is a guess until the driver walks one (P10-S62-T01); the page says so, and the number is tuned as content in P10-S64-T02 ([R42](../02-risks-and-hidden-work.md)).
