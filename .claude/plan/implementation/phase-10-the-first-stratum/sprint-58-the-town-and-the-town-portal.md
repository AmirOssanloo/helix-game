# Sprint 58 — The town and the town portal

**Phase:** 10 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 10 README](./README.md)'s sketch, ahead of phase 9's close at the maintainer's request; re-read at the phase's start against what phase 9 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 9's bucket runs first.** If the maintainer's phase 9 run is triaged while this sprint is open, P9-S53-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)'s rule).

> **Note, 2026-09-28:** the town runs before the town portal, the sketch's order reversed, since the portal's far end stands in the town. T03 is added at 0.5: the sketch had the town portal's domain half and no key, square, or channel on screen.

## Goal

The hero starts in a town with its store, restocked by new waypoints; presses B on a fixture map, channels three clean seconds, and goes to town and back to the same spot, on a map kept frozen while the portal stands.

## Playable outcome

A fresh session starts in the town. Buy at its store, take the waypoint to a fixture map (reached through the developer API until the screen), walk into a pack, press B, and have the channel broken by a stun. Press B again clear of the pack, step through, sell in town, and step back: the pack stands where it was, mid-swing. The long road is still reached from the panel.

---

## Tickets

### P10-S58-T01 — The town and its store

| Field | Value |
| --- | --- |
| Layer | domain, content, simulation, presentation, devtools, tests, docs |
| Size | 1.5 |
| Depends on | P10-S57-T03, P10-S54-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The town** as an authored map of kind town, `src/content/maps/town.def.ts`, to the layout P10-S54-T04 approved: no packs, an arrival point, the store's ring, its waypoint, reached from the start, and the point where a town portal's town end stands. Its floor is the existing floor tile; its obstacles are drawn as every obstacle is.
- **A fresh session starts in town.** The long road stays in the panel's map list, loaded by `load_map`. A stored log names the map it began on, so none moves. The content test that names the long road as the start map is changed in this ticket.
- **The town store** in run scope, not map scope: the store record the checkpoints use, once for the town, with the count of waypoints reached it was last stocked at. It rolls again, at the hero's level, the first time it opens after the count has risen, keyed on that count under a purpose of its own ([Q120](../backlog/open-questions.md), [the town](../../../../docs/product/features/map-and-camera.md#the-town)). The long road keeps its map-scoped checkpoint stores.
- **The open store as a store reference,** a checkpoint's index or the town's, read by the store commands and the store screen. The town's store opens by a left click on its ring, as a checkpoint's does.

**Acceptance:**
- A fresh session stands the hero at the town's arrival point with its waypoint reached; the store opens, buys, and sells as the long road's do.
- The stock rolls on the first opening, stays through goings and comings, and rolls again only after a new waypoint.
- The town store and its count join the checksum's run-scope list and ADR 0017's list.
- It plays: in Chrome by an agent, a fresh build starts in town and the store opens and sells.
- The bar: the store screen's draw calls as the long road's.

**Tests:**
- `tests/simulation/store/town-store.spec.ts`: the first roll, no roll on return, the roll after a new waypoint, the draw keyed on the count.
- `tests/simulation/store/store.spec.ts`: the store reference, a checkpoint's and the town's.
- `tests/content/maps.spec.ts`: the town is kind town with no packs, its points on open ground; a fresh session starts on it.
- `tests/presentation/store-screen.spec.ts`: opens on the town's ring.

**Pages:** [items and loot](../../../../docs/product/features/items-and-loot.md#the-store) and [map and camera](../../../../docs/product/features/map-and-camera.md#the-town), checked; [entities and pools](../../../../docs/architecture/entities-and-pools.md), the town store in run scope; [developer panel](../../../../docs/product/features/developer-panel.md), the start map.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · Anything under `src/presentation` · A documentation change.

---

### P10-S58-T02 — The town portal: the channel, its ends, and the kept map

| Field | Value |
| --- | --- |
| Layer | domain, content, simulation, tests, docs |
| Size | 2 |
| Depends on | T01, P10-S57-T02, P10-S56-T02, P9-S43-T01, P9-S42-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The channel:** the order state machine's channeling state in a new family file, `src/domain/orders/channel-transitions.ts`, whose first ability is the town portal. A channel ends at no cost on any order, an orb press, Invoke, a throw, an activation, a stun, or a lift ([the town portal](../../../../docs/product/features/map-and-camera.md#the-town-portal)).
- **The ability:** `town_portal` in content, with its channel seconds (`town_portal_channel_seconds`, 3), its clock (`town_portal_cooldown_seconds`, 60, from the portal's opening), and a required flag that no cooldown reduction shortens it, read where cooldown reduction is applied. A `town_portal` command variant, refused in town and while the clock runs.
- **The disable matrix:** B's line, its cells the active-item column's with root allowed ([Q123](../backlog/open-questions.md), [the disable matrix](../../../../docs/product/specs/disable-matrix.md) note 21), as a column of `DisableCellsDef` that `COMMAND_COLUMNS` reads.
- **The portal's two ends** as travel points: the map end where the channel finished, the town end at the town's point. The map end takes the hero to town and keeps the map; the town end takes it back to the spot it left.
- **The kept map:** the standing portal as one run-scope record (open, its map level, its point), joining the checksum's run-scope list and ADR 0017's list. One portal at a time: opening another closes the first and lets its kept map go; leaving by the portal down or a waypoint closes it too.

**Acceptance:**
- The channel completes in 3 s and is ended by each interruption above, at no cost, each in a spec.
- B is refused in town, during the clock, and under stun, lift, and the self-lift; allowed under silence, root, and disarm; cooldown reduction leaves the clock at 60 s.
- To town and back lands the hero on the same spot with every pack, corpse, projectile, zone, and ground item where it was; the portal down and a waypoint each close the portal and let the kept map go.
- It plays: through the developer API in Chrome by an agent, B's command channels, the portal is taken, and the pack waits.
- The bar: the kept map costs no system time, read by the tick's system timings with and without a kept map; nothing allocates on the channel.

**Tests:**
- `tests/simulation/travel/town-portal.spec.ts`: the channel and each ending; the refusals; the clock with cooldown reduction; to town and back; one portal at a time; the kept map let go by the portal down and by a waypoint.
- `tests/domain/orders/disable-matrix.spec.ts` and `tests/content/disable-matrix.spec.ts`: B's cells, every row.
- `tests/domain/orders/state-machine.spec.ts`: the channeling state's transitions.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the channel and the no-reduction flag; [commands and events](../../../../docs/architecture/commands-and-events.md), `town_portal`; [the disable matrix](../../../../docs/product/specs/disable-matrix.md) and [map and camera](../../../../docs/product/features/map-and-camera.md#the-town-portal), checked; the vocabulary's **channel**, checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A new spell, effect, or enemy ability · A documentation change.

---

### P10-S58-T03 — B on the keyboard and the HUD

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 0.5 |
| Depends on | T02 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** unplanned in the sketch. The HUD page has no square for B, and a 3 s channel with nothing on screen cannot be read. What the HUD shows is the game designer's: the proposed answer below is filed with the coordinator as an open question blocking this ticket, and the ticket is edited if the answer differs.

**Build:** B in `src/presentation/input/key-bindings.ts`, submitting `town_portal`. On the proposed answer:
- a square for B beside the bank row, the ability-square view reused, its clock drawn as any clock and its refusals flashing as any square's;
- the channel drawn as the portal's ring filling at the hero's feet over the 3 s, from the same frames as P10-S56-T03's.

No sound; every cue is on screen, sound being phase 16's.

**Acceptance:**
- B channels; the square shows the clock; a refused B flashes with the reason's pattern.
- It plays: in Chrome by an agent, B on a fixture map, the ring filling, a stun breaking it, the square counting down after the portal opens.
- The bar: one square and one ring, zero new draw calls in the HUD's batch; the render benchmark unchanged, by an agent.

**Tests:**
- `tests/presentation/input-mapper.spec.ts`: B submits `town_portal`.
- `tests/presentation/hud.spec.ts`: the square, its clock, its flashes.

**Pages:** [HUD](../../../../docs/product/features/hud.md), the square and the channel; [controls and orders](../../../../docs/product/features/controls-and-orders.md#the-keys), checked.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| A fresh session starts in town; the long road from the panel | |
| The town store's roll by the waypoint count | |
| The channel, its endings, B's cells, and the clock | |
| To town and back, the kept map frozen; one portal at a time | |
| B on the HUD, in Chrome | |
| The render benchmark, by an agent | |
| Phase 9's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The town portal ticket is the phase's densest 2 days**: a state, an ability, a column, and a lifecycle. If it runs over, the one-portal-at-a-time rule and its specs move to the top of sprint 59, since M15's replay does not need a second portal.
- **The start map moves.** Every spec that assumed a fresh session on the long road is found by the content test's change and pointed at the long road by name; no stored log moves.
