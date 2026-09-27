# Sprint 40 — Pick it up

**Phase:** 8 · **Sized days:** 1.5 · **Buffer:** 1, and the unspent 2.5 · **Runs:** after sprint 33, before sprint 34

> **Note, 2026-09-27:** added by a re-cut before phase 8 started, from Q87's answer: items are never taken by walking over them; the player right-clicks an item and the hero walks to it and takes it. That is a new order kind, which supersedes Q74's "no new order kind" for items. Sprints 33 and 34 were full, so the order takes the next free sprint number and runs between them, before the inventory screen needs something in the inventory. Phase 9's sketch moved to sprints 41 to 44.

## Goal

A right click on an item on the ground sends the hero to take it, as an order the disable matrix answers for every status.

## Playable outcome

Kill a pack spawned from the panel, right-click the helm it dropped, and watch the hero walk to it and take it; right-click the ground instead and the hero walks there. With the inventory full, the hero walks to the item, and it stays on the ground.

---

## Tickets

### P8-S40-T01 — Pick up an item by a right click, a new order kind

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, presentation, tests, docs |
| Size | 1.5 |
| Depends on | P8-S33-T01, P8-S33-T03 |
| Status | planned |

> **Note, 2026-09-27:** from Q87's answer. The brief the maintainer saw had no pickup order; the Deferred row "A pickup order" is taken into this ticket.

> **Note, 2026-09-27, phase 7 inserted:** the ground item's id is its own brand, and joins the order's tagged target as one more tag (P7-S48-T03), so it can never resolve as a unit. Only the state machine writes the order (P7-S46-T03). `domain/orders/state-machine.ts` is at the 500-line limit, so the new state goes in a file of its own, the machine split by state if it must be. The right click resolves against label rectangles through the pick port that P7-S48-T04 (b) named. The size stays 1.5: the seams save what the split costs.

**Build:** a new order kind, `pick_up`, carrying the ground item's id. A right click on an item's icon or label sends it in place of a move; a right click anywhere else is a move, as today. The hero walks to the item as a move order does, re-pathing if it is pushed, and on reaching the pickup radius takes the item into the inventory where it fits (P8-S33-T01); if it does not fit, the item stays and the refusal is named. An item that is gone when the hero arrives, taken or released by a map load, ends the order as a stale target ends an attack. A new order replaces it as any order does. The [disable matrix](../../../../docs/product/specs/disable-matrix.md) gains a column for `pick_up`, one answer per status in the page and in `src/content/statuses/disable-matrix.ts`, read as a move is for the walk. The [controls and orders](../../../../docs/product/features/controls-and-orders.md) page's pointer table, the [commands and events](../../../../docs/architecture/commands-and-events.md) page, and the items and loot page state it; the mechanics spec's single current order is unchanged.

**Acceptance:**
- A right click on an item sends `pick_up`; the hero walks to it and takes it on reaching the radius, and the command lands in the log and replays.
- A right click on the ground beside an item is a move.
- A full inventory leaves the item on the ground with the refusal named; a gone item ends the order with nothing taken.
- Every status answers the new column as the page says: a rooted hero does not walk to the item, a stunned hero does not start.

**Tests:**
- `tests/simulation/items/pick-up-order.spec.ts`: the walk and the take, a full inventory, a gone item, an order replaced, the replay.
- `tests/domain/orders/disable-matrix.spec.ts`: the new column, one test per cell.
- `tests/presentation/input-mapper.spec.ts`: a right click on an item, on its label, and beside it.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| An item taken by a right click, the walk and the take in the log | |
| The disable matrix's `pick_up` column | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- A right click is today always a move. Resolving it against an item's icon and label, and never against an item hidden under a unit, is the mapper's new edge; its test is the whole of the risk.
