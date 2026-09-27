# Sprint 33 — Walk over it

**Phase:** 8 · **Sized days:** 4 · **Buffer:** 1

> **Note, 2026-09-27, later:** re-cut on the later answers of that day. T01 grows to 2 for items several cells in size (Q88); T02 shrinks to 0.5, since only gold and globes are taken on walk-over (Q87); items are picked up by a right click, [sprint 40](./sprint-40-pick-it-up.md), which runs after this sprint.

## Goal

The hero carries gold and a run-scope inventory of 10 by 4 cells, holds items there by their size, wears them in ten armory slots through commands, and takes gold and globes by walking over or past them. The ground shows what lies on it, with a label per item and Alt for every label.

## Playable outcome

Kill a pack spawned from the panel: gold, globes, and items fall with their labels in their rarity's tint. Hold Alt to read every label. Walk through them: gold rises in the readouts and a health globe heals a hurt hero; the items stay on the ground for sprint 40's right click.

---

## Tickets

### P8-S33-T01 — The inventory and gold in run scope, and the armory commands

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 2 |
| Depends on | P8-S32-T01, P8-S32-T03 |
| Status | planned |

> **Note, 2026-09-26:** the disable-matrix column is hidden work the brief's 1.5 did not name; it fits because the column reads one value in every row.

> **Note, 2026-09-27, later:** resized from 1.5 to 2 on Q88's answer: the inventory is a 10 by 4 grid and an item takes the cells its base's size gives, as in Diablo II, so placement, a refusal by fit, and a swap that must fit are new work. The "dropped item waits" mark is gone with walk-over pickup of items (Q87).

> **Note, 2026-09-27, from P7-S48-T04:** per [ADR 0011](../../../../docs/adr/0011-an-item-is-a-value-the-hero-holds-in-run-scope.md), the inventory and gold are on run scope once, the armory's ten slots are on the form record, replacing its empty field, and an item is a fixed-shape value moved by copy; commands name a cell or a slot. The state checksum gains the inventory, the armory, and gold.

> **Note, 2026-09-28, from P8-S31-T02:** [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md) places the inventory, gold, the armory, the item value, the place encoding, and the command application in `src/domain/items/`, the command variants in `src/domain/commands/item-commands.ts` beside a 426-line `command.ts`, and names the payloads, the refusal reasons, the matrix column `items`, the events, and the event record's `place` field. A swap's covered item goes to its first fit ([Q104](../backlog/open-questions.md)). The size stays 2.

**Build:** run scope holds the hero's gold, an inventory of 10 by 4 cells in which each item takes the width and height in cells its base gives (Q88), and the armory's ten slots on each form record, whose `armory` field stops being `null`; all in `src/domain/items/` (`item.ts`, `item-place.ts`, `inventory.ts`, `armory.ts`). The inventory is 40 cell entries, each naming the placed record covering it or none, and 40 placed records, each an item, whether it is live, its corner, and the size copied from its base, all made with the world. An item placed without a cell named goes to the first place it fits, trying each cell as a corner left to right, then top to bottom; a command may name the cell. The commands `equip_item` (a cell, and an armory slot or `null`), `unequip_item` (an armory slot), `drop_item` (a cell), and `move_item` (a cell, and the cell its corner goes to), each under [ADR 0004](../../../../docs/adr/0004-all-mutation-enters-as-commands.md), recorded in the log and replayed, their variants in `src/domain/commands/item-commands.ts`, their shape checks in `src/domain/items/item-validation.ts`, and their application in `src/domain/items/item-commands.ts`, dispatched by the command system. The named refusals are the brief's section 4.1: `invalid_place`, `no_item_at_place`, `wrong_armory_slot`, `requirement_not_met`, `no_room`, and `dead`. Equipping into a worn slot swaps the worn item into its first fit once the new one has left its cells, and is refused if it has none. A `move_item` onto exactly one item swaps them, the covered one to its first fit, and is refused if it has none; onto two or more, refused. A ring goes to the empty ring slot, or to the one the command names. Dropping puts a ground item on the free cell nearest the hero's feet through `placeDrops` (P8-S32-T02), refused `no_room` when there is none. The fit test and the first fit read cells only and allocate nothing, and are exported through `domain/queries.ts` for the screen. Each command announces its event from the brief's section 4.2, and the event record gains `place`; a refusal names the place. The armory commands act under every disable and are refused while the hero is dead (Q91): the [disable matrix](../../../../docs/product/specs/disable-matrix.md) gains a column for them, `items`, which the store commands of P8-S36-T02 share, one answer per status, in the page and in `src/content/statuses/disable-matrix.ts`. The armory's stats are P8-S34-T01's; here an equipped item is only held. The [commands and events](../../../../docs/architecture/commands-and-events.md) page, the world model's run-scope rows, and the items and loot page state it.

**Acceptance:**
- Equip, unequip, move, and drop each change run scope as stated, land in the log, and replay.
- A 2 by 3 item fits where six free cells make that shape and nowhere else; a swap whose worn item cannot fit is refused and changes nothing.
- Each refusal names its reason and changes nothing.
- A stunned, silenced, rooted, disarmed, or lifted hero can equip, unequip, move, and drop; a dead one cannot.
- The inventory, the armory, and gold survive a map load, as the run-scope door test says of the hero.

**Tests:**
- `tests/domain/items/inventory.spec.ts`: placement by size, the first fit, a named cell, the fit refusal, the swap that must fit, the ring rule, no allocation in the fit test.
- `tests/simulation/items/armory-commands.spec.ts`: each command and each refusal, in the log and on replay.
- `tests/domain/orders/disable-matrix.spec.ts`: the new column, one test per cell.
- `tests/simulation/hero/forms.spec.ts`: run scope kept across a map load, the inventory and gold included.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

### P8-S33-T02 — Walk-over pickup: gold and globes

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 0.5 |
| Depends on | T01 |
| Status | planned |

> **Note, 2026-09-27:** the paragraph on the phase 6 playtest log's fights moving is gone: P8-S39-T01 retires that log before this ticket.

> **Note, 2026-09-27, later:** narrowed to gold and globes and resized from 1 to 0.5 on Q87's answer: items are never taken by walking; they are picked up by a right click, P8-S40-T01. The dropped-item wait is no longer needed. Title was "Walk-over pickup: gold, globes, and items".

> **Note, 2026-09-28, from P8-S31-T02:** [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md) places the system in `src/domain/loot/pickup.system.ts`, after the checkpoint rule and before projectiles; names its events; and has a hero at zero health on the tick take nothing ([Q104](../backlog/open-questions.md)). P8-S40-T01 adds the `pick_up` take to the same pass. The size stays 0.5.

**Build:** a pickup system, `src/domain/loot/pickup.system.ts`, registered in `src/simulation/systems.ts` after `checkpointSystem` and before `projectileSystem`, so it reads where collision left the hero. It walks the ground-item pool by index. When a ground item of gold or a globe lies within the hero's bound radius plus `pickup_radius`, on the hero's way somewhere else as much as when it walks to it: gold is added; a health or mana globe restores `health_globe_restore` or `mana_globe_restore` of the pool's maximum, and waits on the ground while that pool is full (Q87). The taken ground item is released and its cell's byte cleared, by the same module that places. An item is never taken by this system's walk-over. Each take announces `gold_taken`, `health_globe_taken`, or `mana_globe_taken` with the amount. The tunables are in `src/content/tuning.ts`. A dead hero, or one at zero health on this tick, picks up nothing, so a hero emptied this tick still dies at its end. The globe values start at Q86's answer, 25% of the pool, tuned later in P8-S37-T01. The content version moves; the six logs are re-stamped by `pnpm restamp`.

**Acceptance:**
- Gold and each globe are taken within the radius, walking past as well as onto them, and not from one unit further.
- A globe waits while its pool is full and is taken once the hero needs it and passes it.
- The hero walking over an item leaves it on the ground.
- The six stored logs replay on the new content version.

**Tests:**
- `tests/simulation/loot/pickup.spec.ts`: gold and each globe, walking past and onto, the radius edge, a full pool, an item left alone, a dead hero, a hero at zero health on the tick, the cell freed.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

### P8-S33-T03 — Ground item views, labels, and Alt

| Field | Value |
| --- | --- |
| Layer | presentation, app, tests, docs |
| Size | 1.5 |
| Depends on | P8-S32-T01, P8-S32-T04 |
| Status | planned |

> **Note, 2026-09-27, later:** the render benchmark is an agent's, in Chrome, by the standing instruction of that day; an item's icon and label are what P8-S40-T01's right click resolves against.

> **Note, 2026-09-27, from P7-S48-T04:** the rectangle each label exposes is written to the pick port [ADR 0012](../../../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md) defines: a fixed record of canvas rectangles and ground item ids, in drawing order, rewritten each frame by the label views.

> **Note, 2026-09-28, from P8-S31-T02:** [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md) keeps ground items out of the spatial hash, so the views walk the pool by index; puts the icon at a new ground-items band (5) and the label at a new item-labels band (45); and has the pick port hold two lists, labels and icons, both written by these views. The size stays 1.5.

**Build:** a ground-item view kind, `src/presentation/views/ground-item.view.ts`: the item's icon frame on the ground layer at the ground-items band, the frame its base names, tinted by rarity, gold and globes by their own frames, a globe tinted by its pool; a pool sized to the screen, bound each frame by walking the ground-item pool by index and keeping what the widened screen shows, since ground items are not in the spatial hash ([presentation](../../../../docs/architecture/presentation.md)). A label view kind, `ground-item-label.view.ts`, standing up at the item-labels band: the item's name, a Legendary's piece name, in `BitmapText` with the atlas font in its rarity's tint, a pool sized to the screen. Both read the ground item from the world view and the base, piece, and rarity from run scope's definition copies, once at bind; both are registered in the play scene's list. Each frame they rewrite the pick port's two lists, labels and icons, each in drawing order. By default a label shows for the rarities Q87 names; while Alt is held every ground item's label shows, gold with its amount. Labels that would overlap are moved apart by a bounded pass with no allocation in the sync. Each view and label exposes the rectangle a pointer pick reads, for the right click of sprint 40. Alt is presentation state only, not a command, since it changes nothing in the world; its browser default is suppressed. The [HUD](../../../../docs/product/features/hud.md) and items and loot pages state what shows when.

**Acceptance:**
- A road with the ground-item pool full draws only what the camera sees, with no view or label miss.
- Holding Alt shows every label and releasing it hides the default-hidden ones on the next frame; no Alt press reaches the browser's menu.
- No two labels on screen overlap after the pass.
- Zero allocation in the sync with a full screen of drops, by the allocation test the views already use.
- The render benchmark in Chrome on this commit, and the densest choke with drops read from the panel, both run by an agent through browser automation, the figures in the sprint exit.

**Tests:**
- `tests/presentation/ground-item-view.spec.ts`: bind by rectangle, tint by rarity, label rules with and without Alt, the overlap pass, the pick rectangle.
- `tests/presentation/doors/view-pools-sized-to-the-screen.spec.ts`: a full ground-item pool with no miss.
- `tests/presentation/input-mapper.spec.ts`: Alt held and released, its default prevented, no command sent.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The armory commands in the log and on replay; items placed by size; the disable-matrix column | |
| Gold and globes taken on walk-over; items left on the ground | |
| Labels and Alt, no miss with the pool full | |
| The render benchmark and the densest choke with drops, by an agent in Chrome | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- T01's fit test is the first packing problem in the game. Kept to first fit in reading order, it is small; anything cleverer, such as rearranging to make room, is Deferred.
- The label overlap pass is the likely overrun: T03's half day for Phaser is spent there. A pass that cannot be made allocation-free in the time is cut to labels that may overlap, with the pass to Deferred.
