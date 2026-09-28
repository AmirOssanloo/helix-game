# Sprint 59 — The waypoint screen, travel walked, and the map checks

**Phase:** 10 · **Sized days:** 3.5 · **Buffer:** 1.5 · **Milestone:** M15, travel on authored maps
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, P9-S53-T03 onward take this sprint's spare half day first; past it, T03 moves to the top of sprint 60 ([Q118](../backlog/open-questions.md)'s rule).

> **The re-cut is read at this sprint's start** ([R45](../02-risks-and-hidden-work.md)). The ratio of actual to sized days over sprints 54 to 58, written in the sprint exit. Over 1.3: T01 builds the waypoint screen as a plain list, with its look moved to the bucket. Over 1.0 at this sprint's close, counting 59: rooms and corridors are cut to open ground broken by blocks, every region still closed by a choke ([Q131](../backlog/open-questions.md)), and P10-S60-T02 is edited in place before it starts.

## Goal

Travel is whole on authored maps and proved by a replay: the waypoint screen opens on a right click, a stored walk goes to town and back with the kept map's checksum unchanged, and the map checks the generator will call are one domain module the content tests already use.

## Playable outcome

**M15.** From the town, right-click the waypoint, choose a fixture map on the screen, fight to its waypoint, press B, go to town, sell, come back to the same fight, and take the portal down, with a short fade at each crossing and the camera clamped to each map.

---

## Tickets

### P10-S59-T01 — The waypoint screen

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1.5 |
| Depends on | P10-S57-T03, P10-S58-T01, P10-S55-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** `src/presentation/screens/waypoint.screen.ts`, registered on the input claim as the store is ([ADR 0012](../../../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md)), on the left beside the inventory ([Q115](../backlog/open-questions.md)):
- A right click on a reached waypoint walks the hero there and opens the screen on arrival.
- The screen lists **TOWN** and every reached waypoint as **MAP N**, under the stratum's name, **THE NAVE**, in glyphs from the atlas.
- A click on a row submits the travel command naming it; the current map's row is shown and refused.
- The world keeps running. The screen closes on Esc, in the claim's order, on leaving the ring, and on death ([waypoints](../../../../docs/product/features/map-and-camera.md#waypoints)).

Drawn from the shape painter's frames and the HUD's batch; no sourced asset.

**Acceptance:**
- The screen opens only on a reached waypoint and only on arrival; each closing rule holds; a click travels.
- Esc closes the waypoint screen before the inventory, as it closes the store.
- It plays: in Chrome by an agent, the town's waypoint to a fixture map and back.
- The bar: the screen draws in the HUD's batch; world draw calls unchanged; nothing allocates per frame while it is open.

**Tests:** `tests/presentation/waypoint-screen.spec.ts`: the rows by map level, the click's command, the refusal of the current map, each closing rule, Esc's order.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), the screen on the claim; [HUD](../../../../docs/product/features/hud.md) and [map and camera](../../../../docs/product/features/map-and-camera.md#waypoints), checked.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P10-S59-T02 — Travel walked on two authored fixture maps: M15

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1 |
| Depends on | T01, P10-S58-T02, P10-S58-T03, P10-S57-T01 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The fade:** the play scene fades to black and back on a transition, over a presentation time in `src/presentation/`, from a solid frame the shape painter bakes; no sourced asset. The simulation does not wait on it.
- **The camera** clamped again to each map's box on every transition, and snapped to the hero rather than lerped across maps.
- **The replay:** a stored log, `tests/simulation/replays/travel-fixtures.json`, recorded by a scripted walk on the two fixture maps and the town. It takes the town's waypoint down, reaches a waypoint, opens a town portal mid-fight, sells in town, returns, and takes the portal down.

**Acceptance:**
- The kept map's checksum, taken by the kept-scope walk, is the same on arrival in town as on the return.
- Two replays agree at every tick.
- It plays: **M15**, the playable outcome above, in Chrome by an agent, with the fade and the clamp seen at each crossing.
- The bar: the transition's frame, the longest of the crossing, read in Chrome by an agent and written in the sprint exit; the render benchmark unchanged.

**Tests:**
- `tests/simulation/replays/travel-fixtures.spec.ts`: the replay, the kept map's checksum equal across the stay in town, the step-through, the waypoint, and the portal closed by the portal down.
- `tests/presentation/world-camera.spec.ts`: the clamp per map and the snap on a transition.
- `tests/presentation/play-scene.spec.ts`: the fade on a transition.

**Pages:** [map and camera](../../../../docs/product/features/map-and-camera.md#travel), the fade and the camera on a crossing; [presentation](../../../../docs/architecture/presentation.md), checked.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P10-S59-T03 — The map checks moved into the domain

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 1 |
| Depends on | P10-S56-T01, P10-S55-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** `src/domain/map/map-checks.ts`, pure, taking a map definition and returning its faults as values, so the content tests call it now and the generator calls it from sprint 60. It holds the checks the long road's content tests run today, and one new:
- every pack's members place;
- the walk from the arrival point, or the spawn point, to the waypoint and to the portal is open to every radius class, read on the walkability grid (new, since no authored map has had a portal);
- at most the map's bound of enemies in packs near any walkable point, within the sleep radius;
- the experience budget;
- expected drops at most half the ground-item capacity, from the loot tables' expected rates ([ADR 0013](../../../../docs/adr/0013-loot-on-the-ground-is-a-pooled-entity-that-stays-until-the-map-is-made-again.md)).

It allocates from a working record the caller passes, so the generator can run it on the world's scratch. The long road's specific counts stay in its content test.

**Acceptance:**
- `tests/content/maps.spec.ts` runs every map through the module and finds no fault, with the same bounds as before.
- A fixture map with each fault finds that fault and only it.
- It plays: not applicable; no play changes.
- The bar: the checks on the long road's definition timed by the spec, for the generator's budget.

**Tests:**
- `tests/domain/map/map-checks.spec.ts`: each check's fault on a fixture made to fail it, and none on a fixture that passes.
- `tests/content/maps.spec.ts`: rewritten to call the module; its long-road counts unchanged.

**Pages:** [content and registries](../../../../docs/architecture/content-and-registries.md), the checks as the domain's; [where to look](../../../../docs/architecture/where-to-look.md), the pointer.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The ratio over sprints 54 to 58, and the re-cut read | |
| The waypoint screen, in Chrome | |
| **M15:** the travel replay, the kept map's checksum unchanged | |
| The transition's frame, in Chrome | |
| The map checks in the domain, the content tests on them | |
| The ratio over sprints 54 to 59, and the style kept or cut | |
| Phase 9's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **M15 is the phase's first proof.** A kept map whose checksum moves across the stay in town is a travel bug; it is fixed here, before sprint 60, so a generator bug never looks like one ([R45](../02-risks-and-hidden-work.md)).
- **The fade hides a slow transition.** The frame is read with the fade on and off, and the slower is the one written.
