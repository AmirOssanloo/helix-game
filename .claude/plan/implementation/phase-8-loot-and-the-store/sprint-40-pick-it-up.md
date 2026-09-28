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
| Status | done |

> **Note, 2026-09-27:** from Q87's answer. The brief the maintainer saw had no pickup order; the Deferred row "A pickup order" is taken into this ticket.

> **Note, 2026-09-27, phase 7 inserted:** the ground item's id is its own brand, and joins the order's tagged target as one more tag (P7-S48-T03), so it can never resolve as a unit. Only the state machine writes the order (P7-S46-T03). `domain/orders/state-machine.ts` is at the 500-line limit, so the new state goes in a file of its own, the machine split by state if it must be. The right click resolves against label rectangles through the pick port that P7-S48-T04 (b) named. The size stays 1.5: the seams save what the split costs.

> **Note, 2026-09-27, from P7-S48-T04:** the right click reads, top first, an item's label from the pick port, then a unit, then an item's icon, then the ground ([ADR 0012](../../../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md)); a unit under the pointer keeps today's meaning, provisionally ([Q98](../backlog/open-questions.md)).

> **Note, 2026-09-28, from P8-S31-T02:** [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md), section 4.3, fixes the placement: `PickUpCommand` in `src/domain/commands/item-commands.ts`; `OrderKind` gains `pick_up` and `OrderTarget` the tag `ground_item` with a `groundItemId` field on every variant; the machine is split by family into five files under `src/domain/orders/`, the new transitions in `pick-up-transitions.ts`; the take runs in P8-S33-T02's pickup system; `arrive` stays a move's. The matrix column is `pickUp`. The size stays 1.5.

**Build:** a new order kind, `pick_up`, carrying the ground item's id: the `PickUpCommand` variant in `src/domain/commands/item-commands.ts`, a member of the player `Command` union, sorted in arrival order; `OrderKind` gains `pick_up`, and `OrderTarget` the tag `ground_item` with a `groundItemId` field present on every variant, `null` but for that tag. `src/domain/orders/state-machine.ts`, at 496 lines, is split by family first, with no behaviour change: `state-machine.ts` keeps issuing, clearing, and walking; `attack-transitions.ts`, `cast-transitions.ts` (cast point, backswing, channel, `finishBackswing`), and `life-transitions.ts` (`die`, `respawn`, `suspendOrder`, `resumeOrder`) take the rest; the new `pick-up-transitions.ts` holds `issuePickUp` and `endPickUp`. All stay under `domain/orders/`, so the architecture test's order-write rule is unchanged, and no file joins `eslint/size-limit.js`. The command system resolves the ground item, refuses a stale id with `target_not_found` and gold or a globe with `invalid_target`, and issues the order at the item's point. A right click on an item's icon or label sends it in place of a move; a right click on gold or a globe is a move to it; a right click anywhere else is a move, as today. The hero walks to the item as a move order does, `turning` then `moving`, re-pathing if it is pushed. The take is a second step of P8-S33-T02's pickup system: once the hero's bound radius plus `pickup_radius` reaches the item, it goes into the inventory at its first fit (P8-S33-T01) with `item_picked_up`, and the order ends through `endPickUp`; if it does not fit, the item stays, the order ends, and a `command_refused` with `no_room` names the ground item. The movement system, reaching the item's point, leaves the order for that system, which always ends it there; a walk that ends out of reach with no path left is ended the same way. An item that is gone when the hero arrives, taken or released by a map load, ends the order as a stale target ends an attack. A lift keeps the order, as it keeps a move. A new order replaces it as any order does. The [disable matrix](../../../../docs/product/specs/disable-matrix.md) gains a column for `pick_up`, `pickUp`, one answer per status in the page and in `src/content/statuses/disable-matrix.ts`, read as a move is for the walk. The [controls and orders](../../../../docs/product/features/controls-and-orders.md) page's pointer table, the [commands and events](../../../../docs/architecture/commands-and-events.md) page, and the items and loot page state it; the mechanics spec's single current order is unchanged.

**Acceptance:**
- A right click on an item sends `pick_up`; the hero walks to it and takes it on reaching the radius, and the command lands in the log and replays.
- A right click on the ground beside an item is a move.
- A full inventory leaves the item on the ground with the refusal named; a gone item ends the order with nothing taken.
- Every status answers the new column as the page says: a rooted hero does not walk to the item, a stunned hero does not start.

**Tests:**
- `tests/simulation/items/pick-up-order.spec.ts`: the walk and the take, a full inventory, a gone item, gold refused as a target, a walk ending out of reach, a lift keeping the order, an order replaced, the replay.
- The order and state-machine specs under `tests/domain/orders/`: green unchanged across the split.
- `tests/domain/orders/disable-matrix.spec.ts`: the new column, one test per cell.
- `tests/presentation/input-mapper.spec.ts`: a right click on an item, on its label, and beside it.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · Anything under `src/presentation` · A documentation change.

> **Note, 2026-09-28, at close:** `PickUpCommand` is a member of the `Command` union beside `ItemCommand`, not of it, since it names a ground item and no place and reads its own column; the item union and its place stay as they were. The take puts the item in through `placeAtFirstFit` in `domain/items/item-commands.ts`. `input-mapper.ts` stays under the limit at 497 lines. A refused pick up's label flash, which the items page states, is P8-S40-T02, unplanned.

### P8-S40-T02 — A refused pick up flashes the item's label

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 0.25 |
| Depends on | P8-S40-T01 |
| Status | done |

> **Note, 2026-09-28:** unplanned, added at P8-S40-T01's close. The [items and loot](../../../../docs/product/features/items-and-loot.md#states-and-edge-cases) page says a pick up with no room leaves the item on the ground "and the refusal flashes", and the brief's event table says a `command_refused` names the ground item "so the screen or the label flashes that item". P8-S40-T01 announces the refusal with `groundItemId`; nothing in presentation drains it yet, since the HUD flashes only a slot. It is paid from the sprint's buffer.

**Build:** the play scene's event drain hands a `command_refused` that names a ground item to the ground-item label views, which flash that item's label, and show it for the flash even when it is Common or Uncommon with Alt up, for as long as the world view's tuning state says a refusal flash shows (`refusalFlashTicks`), in the refusal tint the HUD's flash uses. A label that is not on the screen flashes nothing. No game object is made; the flash is a tint and a visibility on the pooled label. The [presentation](../../../../docs/architecture/presentation.md) page states it beside the pick port.

**Acceptance:**
- A pick up refused with `no_room` flashes the item's label for the refusal flash's ticks, then the label returns to its tint and its default visibility.
- A refusal naming a place and not a ground item flashes no label.

**Tests:**
- `tests/presentation/ground-item-view.spec.ts`: the flash, its end, a hidden label shown for it, and a refusal with no ground item.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

> **Note, 2026-09-28, at close:** the record is `ItemLabelFlashes` in `src/presentation/views/item-flashes.ts`, one entry per slot of the ground-item pool, the hit flashes' shape, on the play stage beside them; the event drain writes it through `flashRefusedItem` only for an item the camera frame shows, and the label sync asks it. The flash tint is the HUD's `FLASH_REFUSED_TINT`, white. The render benchmark was rerun in Chrome on the Apple M1: 60 fps over 30 s, 0.5 ms render, 1 draw call, the heap flat, as before.

---

## Sprint exit

| Check | Result |
| --- | --- |
| An item taken by a right click, the walk and the take in the log | P8-S40-T01: `tests/simulation/items/pick-up-order.spec.ts` walks the hero to the item and takes it within the pickup radius, and replays a recorded `pick_up` to the recording's state; `tests/presentation/input-mapper.spec.ts` sends it from an icon and from a label |
| A refused pick up flashes the item's label | P8-S40-T02: `tests/presentation/ground-item-view.spec.ts` flashes the label in the refusal tint for the refusal flash's ticks, shows a label Alt hides for the flash, and flashes nothing for a refusal naming a place or an item off screen |
| The disable matrix's `pick_up` column | P8-S40-T01: `pickUp`, the move's answer in all nine rows, on the page and in the data; one test per cell in `tests/domain/orders/disable-matrix.spec.ts` |
| Actual days per ticket | P8-S40-T01: sized 1.5, done in 1. P8-S40-T02, unplanned: sized 0.25, done in 0.25, from the buffer |
| Sprint total | Sized 1.5 with 1 of buffer; done in 1.25, 0.25 of the buffer spent on the unplanned label flash. Closed 2026-09-28 on every row an agent can verify; no row needs a person |

## Risks in this sprint

- A right click is today always a move. Resolving it against an item's icon and label, and never against an item hidden under a unit, is the mapper's new edge; its test is the whole of the risk.
