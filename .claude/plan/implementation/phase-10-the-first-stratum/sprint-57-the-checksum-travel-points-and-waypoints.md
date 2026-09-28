# Sprint 57 — The checksum, travel points, and waypoints

**Phase:** 10 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, P9-S53-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)'s rule).

## Goal

The two scopes are seen by the checksum and the views as the record says. A map's portal and waypoint are travel points the hero right-clicks and reaches. The hero steps down from one fixture map to the next, and travels between reached waypoints by a command.

## Playable outcome

In Chrome, on the first fixture map loaded from the panel: walk past the waypoint's ring and see it reached. Right-click the portal and step through to the second fixture map's arrival point, the camera clamped to the new map. A walk that only crosses the portal does not take it.

---

## Tickets

### P10-S57-T01 — The checksum over both scopes, the world view, and the views rebinding

| Field | Value |
| --- | --- |
| Layer | simulation, presentation, tests, docs |
| Size | 1 |
| Depends on | P10-S56-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The checksum** in `src/simulation/replay/state-checksum.ts` walks run scope, then the stepped scope, then the kept scope, by role, never by which object holds it. An empty kept scope adds a fixed word, so a log with no portal hashes as it does today. The field lists stay typed against the records' keys ([R38](../02-risks-and-hidden-work.md)).
- **The world view** in `src/simulation/world-view.ts` shows the stepped scope only; nothing in presentation can reach the kept one.
- **The views rebind on a swap** as on a map load: the pools' views, the floor, the obstacles, the ground items, the labels, and the camera's clamp, through the syncer groups P10-S55-T02 made.

**Acceptance:**
- A one-field change to the kept scope by a test door moves the checksum; the same scopes swapped move it; a swap and a swap back restore it.
- Every stored log replays with no checksum moved.
- It plays: through the test door in a presentation spec, a swap redraws the other map with nothing of the first left on screen.
- The bar: the checksum's cost with a kept scope read by the replay-determinism spec's timing, within 10% of one scope's.

**Tests:**
- `tests/simulation/replay/state-checksum.spec.ts`: the kept scope walked by role; a one-field change in it moves the checksum; a swap moves it; an empty kept scope leaves every stored checksum.
- `tests/presentation/sync.spec.ts`: a swap rebinds every view, as a map load does.

**Pages:** [simulation loop](../../../../docs/architecture/simulation-loop.md), the checksum's order; [presentation](../../../../docs/architecture/presentation.md), rebinding on a swap.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · Anything under `src/presentation` · A documentation change.

---

### P10-S57-T02 — Travel points, the travel-point target, the pending travel, and the portal down

| Field | Value |
| --- | --- |
| Layer | domain, simulation, presentation, tests, docs |
| Size | 2 |
| Depends on | T01, P10-S56-T03, P9-S41-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **Travel points** in map scope: a fixed list, each a kind (portal down, waypoint, town portal's map end, town portal's town end) and a point, made with the map from its definition. The travel-point view reads the list through the world view.
- **The order's target** gains a tag, a travel point, with its index in a field of its own, as [entities and pools](../../../../docs/architecture/entities-and-pools.md) allows. The move order walks to it; the hero steps through only on reaching it with that target, never by walking over it ([the portal down](../../../../docs/product/features/map-and-camera.md#the-portal-down)).
- **The right click** picks a travel point after an item's icon and before the ground, with or without Alt ([Q124](../backlog/open-questions.md)), as one entry in `src/presentation/input/pick-order.ts`, read from world positions as units are.
- **`src/domain/travel/`** (new): the step-through, requesting a transition into run scope's one pending-travel record; the command system applies it first on the next tick, as `load_map` is applied ([ADR 0016](./sprint-54-the-records-and-the-nave-on-paper.md), the simulation loop's line). No command is invented for a rule's consequence. The portal down loads the next descent level fresh at its arrival point; on a map whose portal waits on a boss, it is refused until the boss pack's record reads dead.
- **Events:** a travel announced on the existing event fields.

**Acceptance:**
- A right click on the portal walks the hero there and steps it through to the next fixture map's arrival point on the tick after it arrives; crossing it with a move order does not.
- A portal gated on a boss refuses until the boss pack is dead, then takes the hero.
- A unit or a label under the click wins over the portal; the portal wins over the ground.
- It plays: in Chrome by an agent, the first fixture map's portal taken to the second.
- The bar: nothing allocates on the step-through but the map's own load; the transition tick's cost printed by the spec.

**Tests:**
- `tests/simulation/travel/portal-down.spec.ts`: the walk and the step-through; the pass-over not taken; the gated portal refused then taken; the pending travel applied first on the next tick.
- `tests/presentation/pick-order.spec.ts`: a travel point in its place in the order, with and without Alt.
- `tests/domain/orders/order.spec.ts`: the travel-point tag and its index.

**Pages:** [commands and events](../../../../docs/architecture/commands-and-events.md), the travel event and the pending travel; [simulation loop](../../../../docs/architecture/simulation-loop.md), checked; [controls and orders](../../../../docs/product/features/controls-and-orders.md#the-pointer), checked; [where to look](../../../../docs/architecture/where-to-look.md), the travel rules.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · Anything under `src/presentation` · A documentation change.

---

### P10-S57-T03 — Waypoints reached in run scope, and the travel command

| Field | Value |
| --- | --- |
| Layer | domain, simulation, tests, docs |
| Size | 1 |
| Depends on | T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **Waypoints reached:** one byte per map level in run scope, set when the hero comes within `waypoint_reach_radius`, 256, of a map's waypoint, with no click, through the checkpoint system's reach. A descent map's checkpoints are its arrival point and its waypoint ([checkpoints on a map of the descent](../../../../docs/product/features/map-and-camera.md#checkpoints-on-a-map-of-the-descent)); a dead hero comes back at the furthest reached, the map not made fresh. The field joins the checksum's run-scope list and ADR 0017's list.
- **The travel command,** naming a map level or the town, refused unless the hero stands within the reach of a reached waypoint and the destination is reached; it requests the pending travel, which makes the map fresh with the hero standing on its waypoint. The town's destination is refused until P10-S58-T01 gives the town; fixture specs name a fixture town.

**Acceptance:**
- A waypoint is reached by walking, once, and stays reached across a map made fresh.
- Travel from a reached waypoint to another reached one, and to the fixture town, lands the hero on the destination's waypoint with the map made fresh; every refusal has its reason.
- A hero dying past the waypoint comes back at it; dying before it, at the arrival point.
- It plays: in Chrome by an agent, the waypoint's ring shows reached; the command submitted through the developer API travels, since the screen is sprint 59's.
- The bar: one byte per level in run scope; nothing allocates.

**Tests:**
- `tests/simulation/travel/waypoints.spec.ts`: the reach, the byte, the command's refusals, the landing, the map made fresh.
- `tests/domain/map/checkpoint.spec.ts`: a descent map's two checkpoints and the respawn at the furthest.
- `tests/simulation/replay/state-checksum.spec.ts`: the waypoint bytes in the run-scope list.

**Pages:** [commands and events](../../../../docs/architecture/commands-and-events.md), the travel command and its refusals; [entities and pools](../../../../docs/architecture/entities-and-pools.md), run scope's new field; [map and camera](../../../../docs/product/features/map-and-camera.md#waypoints), checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The checksum over both scopes by role; a kept-scope field moves it | |
| Every stored log unchanged | |
| The portal down, with the pass-over not taken and the gate | |
| Waypoints reached and the travel command | |
| The render benchmark, by an agent | |
| Phase 9's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The checksum is blind to a swap** ([R38](../02-risks-and-hidden-work.md)). Walked by role, with a spec that swaps and requires a move; any stored checksum that moves is traced before anything is re-stamped.
- **The pending travel lands mid-tick.** A transition applied anywhere but first on the next tick lets a system read half a map; the portal spec asserts the tick it lands on.
