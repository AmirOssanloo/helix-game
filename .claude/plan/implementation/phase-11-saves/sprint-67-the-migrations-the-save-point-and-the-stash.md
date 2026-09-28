# Sprint 67 — The migrations, the save point, and the stash

**Phase:** 11 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phase 10 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 10's bucket runs first.** If the maintainer's phase 10 run is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)'s rule).

## Goal

A save written today still loads after tomorrow's content change, the game writes one at the three save points without the world knowing, and the stash exists in run scope, saved with everything else.

## Playable outcome

In Chrome, walk from the town to map 1's waypoint: `localStorage` holds a save written at the town and again at the waypoint, and nothing written between. Headless, the stored version 1 save loads on the head of main. A save naming a base the content no longer has loads without that item and lists it.

---

## Tickets

### P11-S67-T01 — The migration chain, and a stored save of each version

| Field | Value |
| --- | --- |
| Layer | simulation, tests, docs |
| Size | 1.5 |
| Depends on | P11-S66-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **`src/simulation/save/migrations.ts`:** an ordered list of pure steps, each taking a decoded save of format version n to n + 1. Decoding runs every step from the save's version to the build's. Version 1 is the first, so the list starts empty. The runner is proved by a step the spec supplies.
- **A save read under another content version is the normal case.** Every id it holds is resolved through the rules door against the registry: item bases, affixes, Legendary pieces, active items, and the store's stock. An id the content no longer has costs the item that holds it. That item is left out, and decoding returns the list of what was lost for the start screen to say. It never throws.
- **A stored save of each version,** written by the session, under `tests/simulation/save/saves/`: version 1 now.
- **A rule for every later ticket,** written in the testing standard: a change to the save's shape moves the format version, adds a step, and adds a stored save, as a change to the log's shape does for stored logs.

**Acceptance:**
- Every stored save loads on the head of main to the build's version, and a spec over the folder picks up a file added later with no edit.
- A save naming a missing base, a missing affix, a missing Legendary, and a missing active item loads with each of those four items gone and listed, and everything else intact.
- A save of a newer format than the build's is refused with its reason.
- It plays: not on screen; the stored save loads headless.
- The bar: decoding with migration runs outside the tick, its time recorded in the sprint exit.

**Tests:**
- `tests/simulation/save/migrations.spec.ts`: the runner over a supplied step, the order, a newer version refused.
- `tests/simulation/save/stored-saves.spec.ts`: every file under `saves/` loads.
- `tests/simulation/save/missing-ids.spec.ts`: the four losses, listed.

**Pages:** [testing standard](../../../../docs/standards/testing.md), stored saves beside stored logs and the version rule; [content and registries](../../../../docs/architecture/content-and-registries.md), a save read under another content version; [where to look](../../../../docs/architecture/where-to-look.md).

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P11-S67-T02 — The save-point counter, and the storage adapter

| Field | Value |
| --- | --- |
| Layer | domain, app, devtools, tests, docs |
| Size | 1 |
| Depends on | P11-S66-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The counter:** a save-point counter in run scope, moved by the travel rules phase 10 built under `src/domain/travel/` at three moments: entering town, reaching a waypoint, and stepping through a portal. It is not a command, as a death is not one. It is listed in `save-fields.ts` as ADR 0017 says.
- **`src/app/save-storage.ts`:** after the frame's ticks, the composition root compares the counter with the last value it wrote. When the counter has moved, it takes `session.save()` and writes the text under one `localStorage` key. The world reads nothing back.
- **Only a live session writes,** by P11-S66-T01's list; a replay, a loaded log or feedback file, and the bench never write.
- **A write that fails is shown, never thrown.** Quota or disabled storage is caught in the adapter, shown as one line, and counted in the panel's readouts; it never reaches the frame.

**Acceptance:**
- Each of the three moments writes once; a tick with no move writes nothing; the long road's checkpoints write nothing.
- A replay of a log that enters town writes nothing.
- A failing storage stub leaves the frame running and the line shown.
- It plays: in Chrome by an agent, a walk from the town to map 1's waypoint. The stored key, read through the dev API, holds a save whose waypoints and gold match the walk.
- The bar: the write happens outside the tick. The frame that writes is read in Chrome by an agent and recorded, within the frame budget.

**Tests:**
- `tests/simulation/save/save-points.spec.ts`: the counter moves at the three moments and nowhere else.
- `tests/app/save-storage.spec.ts`, over a storage stub: a write when the counter moved, none otherwise, none in a replay, a failure caught and counted.

**Pages:** [simulation loop](../../../../docs/architecture/simulation-loop.md), the write after the frame's ticks; [developer panel](../../../../docs/product/features/developer-panel.md), the failed-write readout; [where to look](../../../../docs/architecture/where-to-look.md).

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A developer-panel control · A documentation change.

---

### P11-S67-T03 — The stash in run scope

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1.5 |
| Depends on | P11-S66-T02, P11-S66-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **`src/domain/items/stash.ts`:** a second grid of the inventory's shape, 10 by 8, in run scope beside the inventory. It reuses the inventory's grid type and placement rules, with a range of places of its own in `src/domain/items/item-place.ts`.
- **The moves:** the item move commands in `src/domain/items/item-commands.ts` take stash places for the moves P11-S66-T02 allows. Outside town they are refused `not_in_town`, read from the loaded map's kind.
- **Opening it:** the stash's point on the town map, and the open stash as a reference beside the open store's, by the gesture T02 sets.
- **What it joins:** the stash joins the state checksum's run-scope list, the world view, and `save-fields.ts` as saved. `pnpm restamp --checksums` records the stored logs again, since the hashed state's shape moved; every replay first proves the same units, positions, health, mana, gold, and inventory every 50 ticks on the parent commit and this one, as P9-S42-T02 did.

**Acceptance:**
- An item moves into the stash, within it, and back.
- A move into a full stash is refused, and any move outside town is refused with its reason.
- An item of every size places by the inventory's rules.
- The stash survives encode and decode field for field.
- It plays: headless, the driver's walk to town stashes a drop, saves, and decodes with the item in its cell.
- The bar: eighty more item records in run scope, read on the heap readout; a move allocates nothing, by the command spec's count.

**Tests:**
- `tests/domain/items/stash.spec.ts`: placement, fullness, the place range.
- `tests/simulation/items/stash-commands.spec.ts`: each move, and the refusals.
- `tests/simulation/save/encode-decode.spec.ts`: the stash's round trip.

**Pages:** [entities and pools](../../../../docs/architecture/entities-and-pools.md), the stash's place range; [commands and events](../../../../docs/architecture/commands-and-events.md), the refusal; [items and loot](../../../../docs/product/features/items-and-loot.md), checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Every stored save loads; the four missing ids each cost only their item | |
| Decode with migration, time headless | |
| One write per save point, none in a replay, a failed write caught | |
| The writing frame in Chrome, by an agent | |
| The stash round trip; stored logs re-stamped with every replay proved first | |
| Phase 10's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **A replay overwrites the maintainer's run.** The adapter writes only in a live session, by its spec; a playtest's run is the one thing this phase must not lose.
- **A missing id throws deep in decoding.** Every id is resolved in one pass through the rules door before any field is written, so a loss is a list, never a half-built world.
- **The stash's gesture competes with the store's ring in town.** The two rings stand apart on the town map, which T03 edits; if the design wants them together, the pick order is a note on P11-S69-T01.
