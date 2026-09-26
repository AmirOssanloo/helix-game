# Sprint 33 — Walk over it

**Phase:** 7 · **Sized days:** 4 · **Buffer:** 1

## Goal

The hero carries gold and a run-scope inventory, wears items in ten armory slots through commands, and takes whatever it walks over: gold counts up, a globe restores, an item goes into the inventory. The ground shows what lies on it, with a label per item and Alt for every label.

## Playable outcome

Kill a pack spawned from the panel: gold, globes, and items fall with their labels in their rarity's tint. Hold Alt to read every label. Walk over them: gold rises in the readouts, a health globe heals a hurt hero, an item leaves the ground and lands in the inventory.

---

## Tickets

### P7-S33-T01 — The inventory and gold in run scope, and the armory commands

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1.5 |
| Depends on | P7-S32-T01, P7-S32-T03 |
| Status | planned |

**Build:** run scope holds the hero's gold, an inventory of 40 cells, one item a cell with no sizes (Q88), and the armory's ten slots. The commands `equip_item`, `unequip_item`, and `drop_item`, each under [ADR 0004](../../../../docs/adr/0004-all-mutation-enters-as-commands.md), recorded in the log and replayed, with named refusals: the item's level requirement above the hero's level, a slot the item cannot go in, no free cell, and a dead hero. Equipping into a worn slot swaps the worn item into the freed cell; a ring goes to the empty ring slot, or to the one the command names. Dropping puts a ground item at the hero's feet, marked as dropped by the hero (Q87). The armory commands act under every disable and are refused while the hero is dead (Q91): the [disable matrix](../../../../docs/product/specs/disable-matrix.md) gains a column for them, one answer per status, in the page and in `src/content/statuses/disable-matrix.ts`. The armory's stats are P7-S34-T01's; here an equipped item is only held. The [commands and events](../../../../docs/architecture/commands-and-events.md) page, the world model's run-scope rows, and the items and loot page state it.

> **Note, 2026-09-26:** the disable-matrix column is hidden work the brief's 1.5 did not name; it fits because the column reads one value in every row.

**Acceptance:**
- Equip, unequip, and drop each change run scope as stated, land in the log, and replay.
- Each refusal names its reason and changes nothing.
- A stunned, silenced, rooted, disarmed, or lifted hero can equip, unequip, and drop; a dead one cannot.
- The inventory, the armory, and gold survive a map load, as the run-scope door test says of the hero.

**Tests:**
- `tests/domain/items/inventory.spec.ts`: cells, swap, the ring rule, a full inventory.
- `tests/simulation/items/armory-commands.spec.ts`: each command and each refusal, in the log and on replay.
- `tests/domain/orders/disable-matrix.spec.ts`: the new column, one test per cell.
- `tests/simulation/hero/forms.spec.ts`: run scope kept across a map load, the inventory and gold included.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

### P7-S33-T02 — Walk-over pickup: gold, globes, and items

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** a pickup system at the place in the fixed order P7-S31-T02 chose. When the hero's disc comes within `pickup_radius` of a ground item: gold is added; a health or mana globe restores its percentage of the pool's maximum, and waits on the ground while that pool is full (Q87); an item goes into the first free cell, and stays on the ground if none is free. An item the hero dropped waits until the hero's disc has left it. Each pickup announces an event. The tunables are in `src/content/tuning.ts`. A dead hero picks up nothing. The content version moves; the seven logs are re-stamped.

From this ticket the replayed hero in `tests/simulation/replays/long-road-playtest.json` takes what it walks over, so a globe can heal it and its fights can move. Its spec is held: the last boss killed, the level printed. If it no longer holds, the ticket reports it and the maintainer chooses, as P6-S29-T04 did, rather than editing the log (R32).

**Acceptance:**
- Gold, each globe, and an item are taken on walk-over within the radius, and not from one unit further.
- A globe waits while its pool is full and is taken once the hero needs it.
- An item stays when the inventory is full, and is taken once a cell frees and the hero walks over it again.
- A dropped item is not taken back until the hero has stepped off it and on again.
- The seven stored logs replay on the new content version, and the long road playtest spec's last boss is still killed.

**Tests:**
- `tests/simulation/loot/pickup.spec.ts`: each kind, the radius edge, a full pool, a full inventory, the dropped item, a dead hero.
- `tests/simulation/replays/long-road-playtest.spec.ts`: green on the re-stamped log.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

### P7-S33-T03 — Ground item views, labels, and Alt

| Field | Value |
| --- | --- |
| Layer | presentation, app, tests, docs |
| Size | 1.5 |
| Depends on | P7-S32-T01, P7-S32-T04 |
| Status | planned |

**Build:** a ground-item view kind: the item's icon frame on the ground layer, tinted by rarity, gold and globes by their own frames; a pool sized to the screen and bound by the camera's rectangle ([presentation](../../../../docs/architecture/presentation.md)). A label view kind: the item's name in `BitmapText` with the atlas font in its rarity's tint, a pool sized to the screen. By default a label shows for the rarities Q87 names; while Alt is held every ground item's label shows, gold with its amount. Labels that would overlap are moved apart by a bounded pass with no allocation in the sync. Alt is presentation state only, not a command, since it changes nothing in the world; its browser default is suppressed, Firefox's menu bar on Windows included. The [HUD](../../../../docs/product/features/hud.md) and items and loot pages state what shows when.

**Acceptance:**
- A road with the ground-item pool full draws only what the camera sees, with no view or label miss.
- Holding Alt shows every label and releasing it hides the default-hidden ones on the next frame; no Alt press reaches the browser's menu.
- No two labels on screen overlap after the pass.
- Zero allocation in the sync with a full screen of drops, by the allocation test the views already use.
- The render benchmark in Chrome on this commit and the one before it, and the densest choke with drops read from the panel: a box under Waiting on a person in STATUS.md.

**Tests:**
- `tests/presentation/ground-item-view.spec.ts`: bind by rectangle, tint by rarity, label rules with and without Alt, the overlap pass.
- `tests/presentation/doors/view-pools-sized-to-the-screen.spec.ts`: a full ground-item pool with no miss.
- `tests/presentation/input-mapper.spec.ts`: Alt held and released, its default prevented, no command sent.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The armory commands in the log and on replay; the disable-matrix column | |
| Pickup by walking over, each kind | |
| The long road playtest spec on the re-stamped log | |
| Labels and Alt, no miss with the pool full | |
| The render benchmark and the densest choke with drops | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- T02 is the first ticket that lets a drop change a fight. If the long road playtest log no longer kills the last boss on replay, the choice is the maintainer's: keep the log as the phase 6 record on its spec's weaker assertion, or retire it in favour of P7-S37-T02's session.
- The label overlap pass is the likely overrun: T03's half day for Phaser is spent there. A pass that cannot be made allocation-free in the time is cut to labels that may overlap, with the pass to Deferred.
