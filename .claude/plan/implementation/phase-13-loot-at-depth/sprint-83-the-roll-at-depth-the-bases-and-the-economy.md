# Sprint 83 — The roll at depth, the bases, and the economy

**Phase:** 13 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 12 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 12's bucket runs first.** If the maintainer's phase 12 run is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([R41](../02-risks-and-hidden-work.md)).

## Goal

A drop deep down is made as the design says: the roll chooses its base and its rarity by depth, the bases reach quality level 100 in the files and the catalogue, and the town store stocks by stratum, up to Epic from the fourth.

## Playable outcome

On a map of the Ossuary, set the panel's map level to 90 and kill a pack: its drops are bases no drop at level 20 could be, labelled and with tooltips in the atlas font. The panel's loot preview at level 90 counts the rarities at the design note's weights. Grant a deep base through the panel and see it in the inventory.

---

## Tickets

### P13-S83-T01 — The roll's quality and affix levels at depth

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | P13-S81-T03, P13-S82-T01, P13-S82-T02, P13-S82-T03 or its cut |
| Owner | The game engineer |
| Status | planned |

**Build:** the roll at depth, in the files P13-S81-T03 split, as the design note sets it and P13-S82-T02 placed it:
- **The base's choice:** among the bases whose quality level the item level reaches, by the rule the note sets, such as a window below the item level, so a drop at 90 is not most often a cap.
- **The tier's choice:** by the affix level's rule the note sets.
- **The rarity's weights by depth,** in the loot tables or the treasure classes, if the note has them rise.

Every number is content or a tunable. At item levels 1 to 30 the roll draws as it does today, so every stored log replays unchanged but its stamp. If a rule the designer set cannot keep that, this ticket is the one P13-S82-T02 named, and it re-records the logs whose play moves, with every moved checksum traced to the rule ([R36](../02-risks-and-hidden-work.md)). The specs use fixture bases and tiers at deep levels, so this ticket does not wait on the content of T02 or P13-S84-T01.

**Acceptance:**
- At item levels 10, 30, 50, 70, and 100, over 10 000 rolls per tier, every rarity comes at its weight within the spec's tolerance, and every base and tier the level reaches comes by the rule's shares.
- At item levels 1 to 30, the same drops on the same draws as before.
- ADR 0014's defensive reads hold for every new number.
- It plays: in Chrome by an agent, the panel's map level set to 90 on an Ossuary map and a pack killed, its drops read by their labels.
- The bar: the roll allocates nothing; the densest Ossuary stress case under the budget tier green.

**Tests:**
- `tests/domain/loot/roll.spec.ts`: the rarity weights by depth over rolls; the unchanged draws at 1 to 30.
- `tests/domain/loot/base-choice.spec.ts`, or the name the split gave the module: the rule's shares at five levels on fixture bases.
- `tests/domain/items/affixes.spec.ts`: the tier's rule at five levels on fixture tiers.

**Pages:** the [item catalogue's section 8](../../../../docs/product/specs/item-catalogue.md#8-drops), how a base and a tier are chosen at depth; [items and loot](../../../../docs/product/features/items-and-loot.md), checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P13-S83-T02 — The bases to quality level 100 as content

| Field | Value |
| --- | --- |
| Layer | content, domain, tests, docs |
| Size | 1.5 |
| Depends on | P13-S81-T02, P13-S82-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** every base the design note adds, one file each under `src/content/items/bases/`, added to the index. Each names its armory slot's existing frame, `item_<slot>`, drawn by the shape painter as every item icon is today; no frame is added and no art is sourced. The base table moves from the design note into the [item catalogue's section 3.2](../../../../docs/product/specs/item-catalogue.md#32-the-twenty-bases) in the same commit, retitled to its count. If P13-S82-T02 found that the item value's line count must rise for a base, the constant rises here first, with the heap readout in the ticket's closing note. The content version moves: `pnpm restamp` re-stamps the stored logs, and no checksum moves, since no new base drops at the depths any stored log plays.

**Acceptance:**
- The catalogue's base table and the files agree, by the content test.
- Every name is written in the atlas font's set.
- Every requirement is within the hero's reach at the depth the base first drops, as the design note set.
- It plays: in Chrome by an agent, a base of quality level 90 granted through the panel at item level 90, seen in the inventory with its tooltip.
- The bar: the render benchmark unchanged, by an agent; no frame added.

**Tests:**
- `tests/content/catalogues.spec.ts`: the base table against the files, and every name in the font.
- `tests/content/items.spec.ts`: every base on a frame the atlas holds, and every armory slot with a base at every tenth item level to 100.

**Pages:** the item catalogue's sections 3.1 and 3.2.

**Definition of done:** Every change · A documentation change.

---

### P13-S83-T03 — The economy at depth: the town store's tables by stratum

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P13-S82-T01, P13-S82-T02, T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The store's tables by stratum,** as loot-table ids or treasure classes as P13-S82-T02 placed them, each tunable under `def:loot:`, with Epic in the tables from the fourth stratum on.
- **The town store's choice of table** by the stratum of the deepest waypoint reached, read from run scope at the restock the waypoint count already keys. The long road's checkpoint stores keep the one store table they read today.
- **The stock level at depth** as the designer answered.
- **The base values** the design note set, in the files T02 wrote.

The catalogue's section 9 and a new section on the economy at depth, beside section 10, are written from the design note with the arithmetic by stratum. If the tables of strata 1 to 3 differ from today's store table, the logs that stock a town store move, and this ticket re-records and traces them, as P13-S82-T02 named. Otherwise the content version moves and `pnpm restamp` re-stamps the logs with no checksum moved.

**Acceptance:**
- With the waypoints of the maps down to 10, 30, 31, 70, and 100 reached, the town store stocks from its stratum's table, at the stock level answered. No Epic appears before the fourth stratum, and from it Epic comes at its weight over rolls.
- A checkpoint store on the long road stocks as before.
- A store table's number slides in the panel and changes only the next restock.
- It plays: a simulation spec stocks the town store with the waypoints down to map 40 reached and finds an Epic in its stock over a seed sweep.
- The bar: the restock allocates nothing.

**Tests:**
- `tests/simulation/store/store.spec.ts`: the table by stratum, the stock level, Epic from the fourth, the checkpoint store unchanged.
- `tests/domain/definitions/tuning-keys.spec.ts`: the new tables' keys.

**Pages:** the item catalogue's sections 4 and 9, and its economy at depth; [items and loot](../../../../docs/product/features/items-and-loot.md), the store; [map and camera](../../../../docs/product/features/map-and-camera.md#travel), the town's store, checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Every rarity at its weight over rolls at item levels 10 to 100 | |
| The draws at item levels 1 to 30 unchanged, or the re-record named and traced | |
| The bases to 100, the catalogue and the files agreeing | |
| The town store by stratum, Epic from the fourth | |
| The render benchmark, by an agent | |
| Phase 12's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The roll at depth moves the logs above it.** The acceptance is draw for draw at levels 1 to 30; a rule that cannot hold it is a re-record named in advance, never found at the gate.
- **The store at depth cannot be played.** No map below the Ossuary exists until phase 14, so the town store's deep tables are proved by spec here and read in play when the Cisterns land.
