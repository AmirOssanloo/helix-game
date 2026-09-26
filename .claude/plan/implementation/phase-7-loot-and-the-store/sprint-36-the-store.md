# Sprint 36 — The store

**Phase:** 7 · **Sized days:** 4 · **Buffer:** 1

## Goal

An item tells the player what it is, the store at each checkpoint sells equipment and buys items for gold, and the panel can grant an item and gold and preview a loot table.

## Playable outcome

Stand on a checkpoint ring and click it: the store opens beside the inventory. Hover an item to read it, buy one with gold, sell another, walk off the ring and see the store close. From the panel, grant 1000 gold and a Mythical sceptre, and preview a boss's loot table.

---

## Tickets

### P7-S36-T01 — Tooltips

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1 |
| Depends on | P7-S34-T03, P7-S35-T01 |
| Status | planned |

**Build:** the pointer over an item on a screen, or over a ground label, shows its tooltip: name in its rarity's tint, rarity, base, item level, level requirement (marked when above the hero's level), the implicit stat, each affix line, and, while the store is open, its price or sell price. Every line is read from the item instance and its definitions; the tooltip sums nothing. No comparison with the worn item (Deferred). The Deferred row "Tooltips" moves to built for items.

**Acceptance:**
- Every line matches the item's record and definitions; a Legendary shows its fixed lines.
- A requirement above the hero's level reads as unmet.
- The tooltip allocates nothing while it follows the pointer, if it is Phaser.

**Tests:**
- `tests/presentation/tooltip.spec.ts`: every line from a rolled item and a Legendary; the unmet requirement; the price lines only with the store open.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P7-S36-T02 — The store: stock, buy, and sell at a checkpoint

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1 |
| Depends on | P7-S33-T01, P7-S35-T01, P7-S31-T04 |
| Status | planned |

**Build:** `open_store` is taken only while the hero stands alive within a checkpoint's reach radius, 256 since Q60's answer; on the first opening at that checkpoint it rolls the stock on the keyed draw of the checkpoint (Q90), at its region's item level, in the rarities and count the catalogue gives, held in map scope. `buy_item` takes the price in gold and moves the item to the first free cell; `sell_item` gives the sell price and the item is gone. `close_store`, and the store closes itself when the hero leaves the ring or dies. No active item is stocked in this phase. Each is a command under ADR 0004 with named refusals: not on a ring, not enough gold, no free cell, the store closed. The world keeps running while the store is open (Q90). The disable matrix's armory column from P7-S33-T01 covers the store commands. The content version moves; the seven logs are re-stamped.

**Acceptance:**
- The same seed and checkpoint stock the same items; a second opening shows what the first left.
- Buying and selling move gold and items as stated, land in the log, and replay; each refusal names its reason and changes nothing.
- Walking off the ring or dying closes the store on that tick.
- Loading a map clears every store's stock.

**Tests:**
- `tests/simulation/store/store.spec.ts`: the ring rule, the stock roll and its key, buy, sell, each refusal, closing on leaving and on death, a map load.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

### P7-S36-T03 — The store screen, opened from the checkpoint ring

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1.5 |
| Depends on | T02, P7-S34-T03 |
| Status | planned |

**Build:** a left click on the checkpoint ring the hero stands in sends `open_store` instead of a select; a click on a ring the hero is not in keeps its meaning today (Q90). The store screen opens beside the inventory: the stock as icons with prices, gold shown. A left click on a stocked item sends `buy_item`; while the store is open a right click on an inventory item sends `sell_item` instead of `drop_item` (Q91). The screen closes on `close_store` from Esc or the store's closing. The [map and camera](../../../../docs/product/features/map-and-camera.md) page's checkpoint and the items and loot page state it.

**Acceptance:**
- A click on the ring the hero stands in opens the store; the same click one unit outside the ring does not.
- Buy and sell gestures send their commands and nothing else; a refused one flashes.
- The render benchmark in Chrome with both screens open, a box under Waiting on a person in STATUS.md.

**Tests:**
- `tests/presentation/store-screen.spec.ts`: layout, each gesture to its command, the flash.
- `tests/presentation/input-mapper.spec.ts`: the ring click inside and outside the ring.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P7-S36-T04 — Panel controls: grant an item, grant gold, preview a loot table

| Field | Value |
| --- | --- |
| Layer | domain, simulation, devtools, tests, docs |
| Size | 0.5 |
| Depends on | P7-S35-T03, T02 |
| Status | planned |

**Build:** a **Loot** group in the panel. **Grant item**: a base, a rarity, and an item level, sent as the `grant_item` debug command, rolled on its own key and put in the first free cell. **Grant gold**: an amount, as `grant_gold`. **Preview loot table**: an enemy tier and a count, rolling the table that many times on scratch keys outside the world and showing the counts by kind and rarity; it changes nothing, so it sends no command. The [developer panel](../../../../docs/product/features/developer-panel.md) page lists the controls and the debug commands.

**Acceptance:**
- A grant lands in the log and replays.
- A preview of 10 000 boss rolls shows every roll Rare or better and sends no command.

**Tests:**
- `tests/simulation/dev-api.spec.ts`: both grants in the log and on replay.
- `tests/devtools/panel.spec.ts`: the group, and the preview sending nothing.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A developer-panel control · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Tooltips read from the record | |
| The store's stock keyed by its checkpoint; buy and sell in the log | |
| The store opened from the ring, by hand | |
| The panel's grants and preview | |
| The render benchmark with both screens open | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- The ring click is a new pick on the ground: it must lose to the screen's claim and win over a select. T03's test covers both edges; a wrong order is a misclick in play.
- A world that keeps running while the store is open can kill a hero who is shopping. Checkpoints stand more than 1000 from every pack, so only a chase reaches one; Q90 records it.
