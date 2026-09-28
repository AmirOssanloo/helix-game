# Sprint 36 — The store

**Phase:** 8 · **Sized days:** 4 · **Buffer:** 1

## Goal

An item tells the player what it is, the store at each checkpoint sells equipment and buys items for gold, and the panel can grant an item and gold and preview a loot table.

## Playable outcome

Stand on a checkpoint ring and click it: the store opens beside the inventory. Hover an item to read it, buy one with gold, sell another, walk off the ring and see the store close. From the panel, grant 1000 gold and a Mythical sceptre, and preview a boss's loot table.

---

## Tickets

### P8-S36-T01 — Tooltips

| Field | Value |
| --- | --- |
| Layer | domain, presentation, tests, docs |
| Size | 1 |
| Depends on | P8-S34-T03, P8-S35-T01 |
| Status | done |

> **Edited 2026-09-28:** the layer row gains domain: no earlier ticket made `domain/items/prices.ts`, which the tooltip asks for the price and sell price, so it lands here with its spec, `tests/domain/items/prices.spec.ts`; T02 prices by it.

> **Note, 2026-09-27, from P7-S48-T04:** the tooltip draws in `HudScene`'s band over the screens, for a ground label too ([ADR 0012](../../../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md)); its lines are read from the item instance's stat lines ([ADR 0011](../../../../docs/adr/0011-an-item-is-a-value-the-hero-holds-in-run-scope.md)).

> **Note, 2026-09-28, from P8-S31-T02:** the tooltip is `src/presentation/screens/tooltip.ts`. A line's value is in the designer's units on the item, so it is shown as held; the price, the sell price, and whether the requirement is met are asked of the domain's queries door (`domain/items/prices.ts`, `requirement.ts`), never worked out in presentation ([the brief](../../2026-09-28-where-items-loot-and-the-store-live.md), sections 1.1 and 5). The size stays 1.

**Build:** the pointer over an item on a screen, or over a ground label, shows its tooltip: name in its rarity's tint, rarity, base, item level, level requirement (marked when above the hero's level), the implicit stat, each affix line, and, while the store is open, its price or sell price. Every line is read from the item instance and its definitions; the tooltip sums nothing. No comparison with the worn item (Deferred). The Deferred row "Tooltips" moves to built for items.

**Acceptance:**
- Every line matches the item's record and definitions; a Legendary shows its fixed lines.
- A requirement above the hero's level reads as unmet.
- The tooltip allocates nothing while it follows the pointer, if it is Phaser.

**Tests:**
- `tests/presentation/tooltip.spec.ts`: every line from a rolled item and a Legendary; the unmet requirement; the price lines only with the store open.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

> **Note, 2026-09-28, at close:** the tooltip is `Tooltip` in `src/presentation/screens/tooltip.ts`, its line wording in `tooltip-text.ts`, drawn in the HUD band over the screens with a new text band above it: a backdrop and eleven labels made at `create`. Each frame the HUD scene asks, at the point the input claim last saw the pointer, which it now remembers from every move and press, for the item the inventory shows there (`InventoryScreen.itemAt`, none while a press is held), else, where no screen or the bar covers the point (`InputClaim.covers`), for the item under the top ground label in the pick port. The pick port is now made once by the composition root and handed to both scenes in the scene context, so the play scene's mapper and the HUD's tooltip read the same record. Every line is read from the item and run scope's definitions; a line's stat and whether it reads as a percentage are asked of the domain through two new queries, `lineSourceOf`, the totals rewrite's own read, and `isPercentLine`; the requirement of `levelRequirementOf` and `meetsRequirement`; the price of the new `priceOf` and `sellPriceOf`. The text is rewritten only when the item, the requirement mark, or the price changes, which a spec counts; following the pointer writes positions only. The tooltip takes the price line as an argument, none, buy, or sell, and the HUD passes none: with no store on the claim yet, T03 passes buy over the store's stock and sell over the inventory while the store is open. In Chrome the atlas font's size proved to be its glyph width, not its height, so the tooltip measures a glyph as its size wide and its size over the aspect tall; the ground labels measure it the other way, and that is T05, unplanned. The choices the page leaves open are [Q113](../backlog/open-questions.md), decided provisionally. `pnpm check` green, 5215 tests; at a load average near 50 from Spotlight indexing, the stats system's steady-state heap case failed in some full runs, as it did on the committed baseline in the same conditions, and passed alone and once the load fell. Definition of done walked: every change holds, no ticket reference in the code, no file past 500 lines, the domain's new reads through the queries door. Under `src/presentation`: a quad from the atlas and `BitmapText` only, in fixed bands, the new text band among them; nothing made during play; colour is a tint; the sync reads the world view and asks every verdict of the queries door; every pointer event still passes the claim first; no overlay. The render benchmark was rerun by an agent, before and after, figures in the sprint exit. Documentation: the presentation page states the tooltip, the claim's remembered pointer and cover test, and the shared pick port, in its body and quick reference; the Deferred row "Tooltips, for items" moved to built.

---

### P8-S36-T02 — The store: stock, buy, and sell at a checkpoint

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1 |
| Depends on | P8-S33-T01, P8-S35-T01, P8-S31-T04 |
| Status | planned |

> **Note, 2026-09-27:** Q90 answered as proposed, made a basic Diablo II store: the stock is at the hero's level when the store first opens, as Diablo II's vendors stock (Q89), not at the region's; each stocked base sits in the tab the catalogue gives it. Six logs, not seven.

> **Note, 2026-09-28, from P8-S31-T02:** [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md) places the store in `src/domain/store/`, one record per checkpoint in map scope and the open store beside them; keys the stock on the checkpoint's index at the tick it first opens, under five store purposes (section 3.2), so the acceptance names the tick ([Q104](../backlog/open-questions.md)); rolls rarities on the `store` loot table; closes the store in a store system registered after `deathSystem`, so a death closes it on its own tick; and names the payloads, refusals, and events (section 4). The size stays 1.

**Build:** in `src/domain/store/`: `store.ts`, one store record per checkpoint of the loaded map, made by the map load, each stocked or not with 12 stock slots, and which store is open, all map scope and made again by `resetMapScope`; `stock.ts`, the roll; `store-commands.ts`; and `store.system.ts`. `open_store` names a checkpoint and is taken only while the hero stands alive within that checkpoint's reach radius, 256 since Q60's answer; opening one closes any other. On the first opening at that checkpoint it rolls the stock through P8-S35-T01's item roll, keyed on the checkpoint's index at that tick (Q90), under `storeStock` (the base), `storeRarity`, `storeAffix`, `storeAffixTier`, and `storeAffixValue` at the brief's indices, at an item level of the hero's level on that tick, 12 items from Common to Rare on the `store` loot table's weights, each in its tab, Armour, Weapons, or Misc, by its base's armory slot, never restocked. `buy_item` names a stock slot, takes the price in gold, and moves the item into the inventory at its first fit by its size (Q88, edited 2026-09-27), emptying the slot; `sell_item` names a cell and gives the sell price, the price times `store_sell_fraction` rounded down, and the item is gone. `close_store` closes the open store and changes nothing when none is. The store system, registered in `src/simulation/systems.ts` after `deathSystem`, closes the store when the hero is dead or farther than the reach radius from its checkpoint, on that tick. No active item is stocked in this phase. Each is a command under ADR 0004, its variant in `src/domain/commands/item-commands.ts`, with the named refusals of the brief's section 4.1: `not_at_checkpoint`, `unknown_checkpoint`, `not_enough_gold`, `no_room`, `store_closed`, `no_item_at_place`, `invalid_place`, and `dead`. Each announces its event: `store_opened`, `store_closed`, `item_bought`, `item_sold`. The world keeps running while the store is open (Q90). The disable matrix's armory column from P8-S33-T01 covers the store commands. The content version moves; the six logs are re-stamped by `pnpm restamp`.

**Acceptance:**
- The same seed, checkpoint, hero level, and opening tick stock the same items, at the hero's level; a second opening shows what the first left, whatever the hero's level is by then.
- A boss dying on the tick a store opens draws nothing in common with the stock.
- Buying and selling move gold and items as stated, land in the log, and replay; each refusal names its reason and changes nothing.
- Walking off the ring or dying closes the store on that tick.
- Loading a map clears every store's stock.

**Tests:**
- `tests/simulation/store/store.spec.ts`: the ring rule, the stock roll and its key, buy, sell, each refusal, closing on leaving and on death, a map load.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

### P8-S36-T03 — The store screen, opened from the checkpoint ring

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1.5 |
| Depends on | T02, P8-S34-T03, T01 |
| Status | planned |

> **Note, 2026-09-27:** Q90 answered: as close to a basic Diablo II store as possible, with three tabs, a grid, and prices on hover. The tabs are three views of one grid, so the size stays 1.5.

> **Note, 2026-09-27, from P7-S48-T04:** the store is a second non-modal screen on the input claim, laid out beside the inventory in `HudScene` ([ADR 0012](../../../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md)).

> **Note, 2026-09-28, from P8-S31-T02:** the screen is `src/presentation/screens/store.screen.ts` and claims no key. The mapper asks the domain's queries door which checkpoint's reach the hero stands in, and the click names it; `buy_item` names a stock slot ([the brief](../../2026-09-28-where-items-loot-and-the-store-live.md), sections 1.1 and 4.1). The size stays 1.5.

> **Note, 2026-09-28, from T01:** the tooltip takes its price line as an argument, and the HUD scene passes none. This ticket passes `buy` over a stocked item and `sell` over an inventory item while the store is open, asking the store screen for the item under the pointer before the inventory. The size stays 1.5.

**Build:** a left click on the checkpoint ring the hero stands in, as the domain's reach query says, sends `open_store` naming that checkpoint instead of a select; a click on a ring the hero is not in keeps its meaning today (Q90). The store screen opens beside the inventory, as a Diablo II vendor's does: three tabs, **Armour**, **Weapons**, and **Misc**, the last empty until phase 9 lists the active items in it; each tab a grid of item icons in their rarity's tint; the price shown on hover in the item's tooltip (T01); gold shown. A left click on a tab shows it and sends nothing. A left click on a stocked item sends `buy_item`; while the store is open a right click on an inventory item sends `sell_item` instead of `drop_item` (Q91). The screen closes on `close_store` from Esc or the store's closing. The [map and camera](../../../../docs/product/features/map-and-camera.md) page's checkpoint and the items and loot page state it.

**Acceptance:**
- A click on the ring the hero stands in opens the store; the same click one unit outside the ring does not.
- Buy and sell gestures send their commands and nothing else; a refused one flashes.
- The render benchmark in Chrome with both screens open, run by an agent through browser automation, its figures in the sprint exit (standing instruction of 2026-09-27).

**Tests:**
- `tests/presentation/store-screen.spec.ts`: the tabs and their grids, the price on hover, each gesture to its command, the flash.
- `tests/presentation/input-mapper.spec.ts`: the ring click inside and outside the ring.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P8-S36-T04 — Panel controls: grant an item, grant gold, preview a loot table

| Field | Value |
| --- | --- |
| Layer | domain, simulation, devtools, tests, docs |
| Size | 0.5 |
| Depends on | P8-S35-T03, T02 |
| Status | planned |

> **Note, 2026-09-28, from P8-S31-T02:** [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md) keys a grant on the command's position among the tick's consumed commands under three grant purposes (section 3.3), lets a grant name a Legendary piece as well as a base, lets both grants act dead or alive ([Q104](../backlog/open-questions.md)), puts the handlers in `src/domain/debug/item-grants.ts`, and has the preview call `rollDrop` through `domain/queries.ts`, which needs no new import row. The size stays 0.5.

**Build:** a **Loot** group in the panel, `src/devtools/loot-group.ts`. **Grant item**: a base or a Legendary piece, a rarity, and an item level, sent as the `grant_item` debug command, its lines rolled through P8-S35-T01's item roll keyed on the command's position among the tick's consumed commands under `grantAffix`, `grantAffixTier`, and `grantAffixValue`, and put in the inventory at its first fit; refused `unknown_item`, `invalid_rarity` (Legendary on a base, or anything but Legendary on a piece), `invalid_item_level`, or `no_room`. **Grant gold**: an amount, a whole number of one or more, as `grant_gold`, refused `invalid_amount` otherwise. Both handled in `src/domain/debug/item-grants.ts`, both acting whether the hero is alive or dead, announcing `item_granted` and `gold_granted`. **Preview loot table**: an enemy tier and a count, calling `rollDrop` through `domain/queries.ts` over the world view that many times, with keys counted from 0 at the current tick, into one out record, and showing the counts by kind and rarity; it writes nothing to the world, so it sends no command. The [developer panel](../../../../docs/product/features/developer-panel.md) page lists the controls and the debug commands.

**Acceptance:**
- A grant lands in the log and replays.
- A preview of 10 000 boss rolls shows every roll Rare or better and sends no command.

**Tests:**
- `tests/simulation/dev-api.spec.ts`: both grants in the log and on replay.
- `tests/devtools/panel.spec.ts`: the group, and the preview sending nothing.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A developer-panel control · A documentation change.

---

### P8-S36-T05 — Ground labels measured at the font's glyph size

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 0.25 |
| Depends on | T01 |
| Status | planned |

> **Note, 2026-09-28:** unplanned, found in T01. The atlas font's size is its glyph width (Phaser's retro font sets the font's size to the glyph's width), so a label made at 16 draws glyphs 16 wide and 25.6 tall. `createGroundItemLabels` measures a glyph as the size times the aspect wide, 10, and the size tall, 16, so the pass that moves labels apart and the rectangles written to the pick port are smaller than what is drawn: two labels may overlap, and a right click or a tooltip near a label's ends misses it. Taken from the sprint's buffer.

**Build:** the ground labels measure a glyph as their size wide and their size over the glyph's aspect tall, for the pass and for the pick port's rectangles, as the tooltip does.

**Acceptance:**
- A label's pick rectangle covers the glyphs it draws, end to end and top to bottom.
- Two labels drawn side by side do not overlap after the pass.

**Tests:**
- `tests/presentation/ground-item-view.spec.ts`: the pick rectangle's width and height from the text's length and the glyph's aspect; the pass keeping two long labels apart.

**Definition of done:** Every change · Anything under `src/presentation`.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Tooltips read from the record | 2026-09-28, T01: every line of a rolled Rare cap and of Hallcrown matches its record and definitions, the unmet requirement reads red, the price lines show only when asked for, and following the pointer rewrites no text, in `tests/presentation/tooltip.spec.ts`. By an agent in headless Chrome over the DevTools protocol on the Apple M1 (ANGLE Metal), 1920 by 1080, the dev build with the panel: Hallcrown placed in the grid, I pressed, the pointer on it, then moved across it every 50 ms through a 30 s measurement after an 8 s warm-up: the tooltip read as the spec says, the requirement in red at hero level 1, **60.03 fps, every frame 16.5 to 16.8 ms, 2 draw calls a frame, heap after a collection 83.0 MB, no console error**; the committed baseline on the same run, the screen open with the pointer on the item and no tooltip: 60.03 fps, 16.5 to 16.8 ms, 2 draw calls, 82.8 MB |
| The store's stock keyed by its checkpoint; buy and sell in the log | |
| The store opened from the ring, by hand | |
| The panel's grants and preview | |
| The render benchmark with both screens open | T01, before the store screen exists: `pnpm bench` in the same headless Chrome, 30 s after an 8 s warm-up, 60.03 fps, 16.5 to 16.8 ms, 1 draw call a frame, heap 64.2 MB, no console error; the committed baseline 60.03 fps, 16.5 to 16.8 ms, 1 draw call, 64.1 MB: unchanged, as the atlas did not change and the bench draws no screen. Both screens open is T03's |
| Actual days per ticket | T01: 0.5 against 1 |
| Sprint total | |

## Risks in this sprint

- The ring click is a new pick on the ground: it must lose to the screen's claim and win over a select. T03's test covers both edges; a wrong order is a misclick in play.
- A world that keeps running while the store is open can kill a hero who is shopping. Checkpoints stand more than 1000 from every pack, so only a chase reaches one; Q90 records it.
