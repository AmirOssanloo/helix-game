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
| Status | done |

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

> **Edited 2026-09-28, at close:** "The content version moves; the six logs are re-stamped by `pnpm restamp`" was wrong: nothing under `content/` changed, so no stamp moved. The stores and the open store entered the hashed state instead, so the six logs' checksums were recorded again with `pnpm restamp --checksums`.

> **Note, 2026-09-28, at close:** the store is `src/domain/store/`: `store.ts` holds the records, one per checkpoint made by the map load, each stocked or not with twelve items made once, the tab of a base's armory slot (helm, body, gloves, belt, and boots in Armour; main hand and off-hand in Weapons; amulet and ring in Misc), and the reach read, `isWithinReach` and `checkpointInReach`, both on the queries door for T03's ring click. `stock.ts` rolls a stock through the item roll under `storeStock`, `storeRarity`, `storeAffix`, `storeAffixTier`, and `storeAffixValue` (10, 14 to 17), keyed on the checkpoint's index at the opening tick, at the hero's level, every slot on the store table's first item roll's weights. `store-commands.ts` checks the shape, applies, and names the refused place; `store.system.ts` runs last, after death. Map scope gains `stores` and `openStore`, in the world view and the state checksum; `resetMapScope` closes the open store, announcing it, and unstocks every store. The four variants are `StoreCommand` in `domain/commands/item-commands.ts`, read through the items column; a refusal names the stock slot's place, the cell, or the checkpoint. With four new kinds the event union passed the 25 kinds up to which the compiler relates a ring slot to it, so the sink now takes a slot and the ring reads a slot back through `isDomainEvent`, a check against a record over the union's kinds; the commands and events page states it. The panel's readouts drain the four events: Last item shows a buy or a sale with its gold, and a new Last store readout the last opening or closing. The choices no page settled are [Q114](../backlog/open-questions.md), decided provisionally. Replayed on the parent commit and on this one through a throwaway spec, the six logs gave the same units, positions, health, mana, facing, orders, gold, inventory, and ground items every 50 ticks, so only the state's shape moved, and `pnpm restamp --checksums` recorded their checksums; no stamp moved. `pnpm check` green, 5257 tests; the budget tier green. Definition of done walked: every change holds, no ticket reference in the code, no file past 500 lines, no optional property or non-null assertion. Under `src/domain` and `src/simulation`: no clock or randomness, nothing allocated by the store system or a command once a map is loaded (the stores are made at the load, as the pack records are), no module-scope state, every switch ends in `assertNever`, the reach and the sell fraction read from tunables, a rule test and a simulation test for each part, the replay test green with the checksums recorded as above, the stress tier green. A new command, event, and system: the variants are in the `Command` and `DomainEvent` unions, each refusal has a test case, the system is registered once after `deathSystem` with its reason in the order's docblock, and every new event is drained by the panel, and by the store screen from T03. Documentation: the commands and events page states the store's opening, closing, and stocking rules, the refusal's checkpoint, and the slot read back as an event; the developer panel page the two readouts.

---

### P8-S36-T03 — The store screen, opened from the checkpoint ring

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1.5 |
| Depends on | T02, P8-S34-T03, T01 |
| Status | done |

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

> **Note, 2026-09-28, at close:** the store screen is `StoreScreen` in `src/presentation/screens/store.screen.ts`, its layout in `store-layout.ts`: a panel along the left of the canvas, the inventory's size, across from the inventory, with a title, three tab buttons, a ten by nine grid of the inventory's cells, and gold, every quad and label made at `create`, one item box per stock slot. It claims no key and no toggle opens it: `store-follow.ts`'s `followStore`, called by the HUD scene's event drain, opens it and the inventory beside it on `store_opened` and closes it, sending nothing, on `store_closed`, whatever closed the store; Escape closes it through the claim, and then it sends `close_store`. A tab click shows the tab and sends nothing; the shown tab's items are laid in stock order in lanes two cells wide, the widest base, which hold twelve of the tallest; a left click on a stocked item sends `buy_item` naming its stock slot, and a refusal naming that slot flashes it. The inventory's right click sends `sell_item` in place of `drop_item` while the world has a store open. The tooltip reads the store screen before the inventory, and `priceAt` gives its price line: buy over a stocked item, sell over an item in the inventory's grid while a store is open, none elsewhere. The ring click is `ringClicked` in `src/presentation/input/store-ring.ts`, asked by the mapper's left click with no cursor and no waiting ground pick: the checkpoint whose reach the hero stands in, alive, by `checkpointInReach`, when the click is within it too by `isWithinReach`; it sends `open_store` unless that store is open already. To stay under the file limit, the mapper's cast target moved to `castTargetOf` in `targeting-cursor.ts`, and the hero read shared by the screens and the tooltip to `screens/hero-of.ts`. The choices the pages left open are [Q115](../backlog/open-questions.md), decided provisionally; the items and loot page said a refused buy flashes the price, and now says the item, as every refused item gesture does. `pnpm check` green, 5296 tests; the budget tier green. At a load average near 50, the state checksum's and the stats system's steady-state heap cases failed in two full runs, as T01 saw, and passed alone and in a full run once the load fell. Definition of done walked: every change holds, no ticket reference in the code, no file past 500 lines, no optional property or non-null assertion. Under `src/presentation`: quads from the atlas and `BitmapText` only, in the screen band, nothing made during play, which a spec counts; colour is a tint; the sync reads the world view and asks the reach, the requirement, and the prices of the queries door; every pointer event still passes the claim first, and a ring click under an open screen is claimed, which a spec shows; no overlay; the atlas unchanged. The render benchmark was run by an agent with both screens open, figures in the sprint exit. Documentation: the presentation page states the store screen, its opening and closing with the world's store, the lanes, and the tooltip's price, in its body and quick reference; the items and loot page the store's place, its first tab, the price on hover, and the refused buy's flash; the map and camera page the ring's left click.

---

### P8-S36-T04 — Panel controls: grant an item, grant gold, preview a loot table

| Field | Value |
| --- | --- |
| Layer | domain, simulation, devtools, tests, docs |
| Size | 0.5 |
| Depends on | P8-S35-T03, T02 |
| Status | done |

> **Note, 2026-09-28, from P8-S31-T02:** [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md) keys a grant on the command's position among the tick's consumed commands under three grant purposes (section 3.3), lets a grant name a Legendary piece as well as a base, lets both grants act dead or alive ([Q104](../backlog/open-questions.md)), puts the handlers in `src/domain/debug/item-grants.ts`, and has the preview call `rollDrop` through `domain/queries.ts`, which needs no new import row. The size stays 0.5.

**Build:** a **Loot** group in the panel, `src/devtools/loot-group.ts`. **Grant item**: a base or a Legendary piece, a rarity, and an item level, sent as the `grant_item` debug command, its lines rolled through P8-S35-T01's item roll keyed on the command's position among the tick's consumed commands under `grantAffix`, `grantAffixTier`, and `grantAffixValue`, and put in the inventory at its first fit; refused `unknown_item`, `invalid_rarity` (Legendary on a base, or anything but Legendary on a piece), `invalid_item_level`, or `no_room`. **Grant gold**: an amount, a whole number of one or more, as `grant_gold`, refused `invalid_amount` otherwise. Both handled in `src/domain/debug/item-grants.ts`, both acting whether the hero is alive or dead, announcing `item_granted` and `gold_granted`. **Preview loot table**: an enemy tier and a count, calling `rollDrop` through `domain/queries.ts` over the world view that many times, with keys counted from 0 at the current tick, into one out record, and showing the counts by kind and rarity; it writes nothing to the world, so it sends no command. The [developer panel](../../../../docs/product/features/developer-panel.md) page lists the controls and the debug commands.

**Acceptance:**
- A grant lands in the log and replays.
- A preview of 10 000 boss rolls shows every drop's rarest item Rare or better and sends no command.

> **Edited 2026-09-28:** "every roll Rare or better" became "every drop's rarest item": the boss table's second item roll is on the elite weights and can be Common, so only the first, the catalogue's "one Rare or better", is held to Rare. [Q116](../backlog/open-questions.md).

**Tests:**
- `tests/simulation/dev-api.spec.ts`: both grants in the log and on replay.
- `tests/devtools/panel.spec.ts`: the group, and the preview sending nothing.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A developer-panel control · A documentation change.

> **Note, 2026-09-28, at close:** the grants are `grant_item` and `grant_gold`, two `DebugCommand` variants, handled in `src/domain/debug/item-grants.ts` and dispatched by `applyDebugCommand`, which now takes the command's place among the tick's consumed commands from the command system. A base's lines are rolled by `rollLines` in `domain/loot/item-roll.ts`, split out of `rollItem` so a drop, a stock, and a grant roll lines one way, keyed on that place under `grantAffix`, `grantAffixTier`, and `grantAffixValue` (18 to 20), into a new scratch item, `grantedItem`; a piece's by `writeLegendary`; either goes in at its first fit. `rollLines` clears its item first: a grant after a piece carried the piece's id onto the next base until it did, which the replay spec caught. The shape check refuses an empty rarity as `invalid_rarity` and an item level or gold that is not a whole number of one or more as `invalid_item_level` or `invalid_amount`; the handler refuses `unknown_item`, `invalid_rarity` for a rarity the table does not hold, a base as Legendary, or a piece as anything else, and `no_room`. Both act hero or no hero, alive or dead, and announce `item_granted` with the cell and `gold_granted` with the amount, drained by the panel's Last item readout. The Loot group is `src/devtools/loot-group.ts`: Item lists every base then every piece and Rarity every rarity, read from the view; Item level, Grant item; Gold amount, Grant gold, and the run's Gold; Preview tier, Rolls, and Preview loot table, which calls `previewLoot` in `loot-preview.ts`: `rollDrop` through `@domain/queries` over the view, keys 0 up to the count on the current tick, into one drop record the group made, with no piece named, counting gold piles and gold, globes, items by rarity, drops by their rarest item, and pieces. It sends nothing. The choices no page settled are [Q116](../backlog/open-questions.md), decided provisionally. The new draw purposes move no existing draw and the grant scratch is not hashed, so the six logs replay unchanged and nothing was re-stamped. `pnpm check` green, 5314 tests, after one full run in which the stats system's steady-state heap case failed at a load average near 13, as T01 and T03 saw; it passed alone three times on this change and three on the committed baseline, and in the next full run. The budget tier green. Definition of done walked: every change holds, no ticket reference in the code, no file past 500 lines (`debug-commands.ts` 469, `command.ts` 460), no optional property or non-null assertion. Under `src/domain`: no clock or randomness but the keyed draw, nothing allocated by a grant, whose item is scratch, no module-scope state, every switch ends in `assertNever`, the refusal cases each tested, the replay green. A new command and event: both variants are in the `DebugCommand` and `DomainEvent` unions and the kinds records, each refusal has a case in `tests/simulation/dev-api.spec.ts`, and both events are drained by the panel. A developer-panel control: the grants are debug commands, in the log, and a recorded session with both replays to the same inventory and gold; the Gold readout reads the view; the preview writes nothing. Documentation: the developer panel page lists the Loot group, its refusals, and the grant in Last item; the commands and events page and the developer tools page state the grants' keying and refusals and the preview, in body and quick reference.

---

### P8-S36-T05 — Ground labels measured at the font's glyph size

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 0.25 |
| Depends on | T01 |
| Status | done |

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
| The store's stock keyed by its checkpoint; buy and sell in the log | 2026-09-28, T02, in `tests/simulation/store/store.spec.ts`: the same seed, checkpoint, hero level, and opening tick stock the same twelve items at the hero's level, Common to Rare; another checkpoint or another tick stocks others; a second opening after five levels shows what the first left; a boss dying on the opening tick leaves the stock as it is without the death and shares no item and no purpose with it; a buy, a sale, and their refusals move gold and items as stated or nothing; walking off the ring closes the store on the tick the hero passes 256 and not before, and death on its tick; a reset or a load closes it and clears every stock; a session of eight store commands lands in the log and replays to the recorded state |
| The store opened from the ring, by hand | 2026-09-28, T03, by an agent: `tests/presentation/store-screen.spec.ts` and the ring cases of `tests/presentation/input-mapper.spec.ts`, and in headless Chrome, where a left click on the hero standing on the long road's first ring opened the store with twelve items and the inventory beside it, and the pointer over a stocked item showed its price. The walk by hand waits under Waiting on a person in STATUS.md, deferred until phase 8 is done by the maintainer's standing instruction of 2026-09-24 |
| The panel's grants and preview | 2026-09-28, T04: a Mythical sceptre granted at item level 40 lands at cell 0 with its implicit and five affixes, a Legendary Hallcrown with its fixed lines, and 1000 gold, each in the log, whether the hero is alive or dead; two grants of one base on one tick roll different lines; a session of four grants replays to the same inventory and gold; every refusal names its reason and changes nothing, in `tests/simulation/dev-api.spec.ts`. The Loot group lists every base and piece and every rarity and sends its grants as commands; a preview of 10 000 boss drops at level 1 shows no drop whose rarest item is below Rare and no drop with none, 10 000 gold piles, and sends no command and changes nothing, in `tests/devtools/panel.spec.ts`. A look at the group by hand waits under Waiting on a person in STATUS.md, deferred until phase 8 is done by the maintainer's standing instruction of 2026-09-24 |
| The render benchmark with both screens open | T01, before the store screen exists: `pnpm bench` in the same headless Chrome, 30 s after an 8 s warm-up, 60.03 fps, 16.5 to 16.8 ms, 1 draw call a frame, heap 64.2 MB, no console error; the committed baseline 60.03 fps, 16.5 to 16.8 ms, 1 draw call, 64.1 MB: unchanged, as the atlas did not change and the bench draws no screen. T03, by an agent in headless Chrome over the DevTools protocol on the Apple M1 (ANGLE Metal), 1920 by 1080, the dev build with the panel, 30 s after an 8 s warm-up: a left click on the hero on the long road's first ring, the store and the inventory open, the pointer moving across the store's grid every 50 ms with the tooltip and its price showing: **60.03 fps, every frame 16.5 to 16.8 ms, 2 draw calls a frame, heap after a collection 83.5 MB, no console error**; on the same commit with the inventory alone open and the pointer on Hallcrown, as T01 measured: 60.07 fps, 16.5 to 16.8 ms, 2 draw calls, 83.4 MB. `pnpm bench` in the same Chrome: 60.03 fps, 16.5 to 16.8 ms, 1 draw call a frame, heap 64.8 MB, no console error, unchanged from T01's |
| Ground labels measured as drawn | 2026-09-28, T05, in `tests/presentation/ground-item-view.spec.ts`: a Leather gloves label's pick rectangle is 14 glyphs of 16 wide and 16 over the glyph's aspect, 25.6, tall; two Leather gloves labels whose centres stand 180 apart on one line, where the old measure of 10 a glyph kept them side by side over each other, are moved a glyph's height apart, and no two labels drawn overlap. The pass now keeps a slack of 1/1024 of a pixel when it asks whether a label moved just above another overlaps it, as a height of 25.6 left a rounding error that found the same blocker again until the nudge limit hid the label. By an agent in headless Chrome over the DevTools protocol on the Apple M1 (ANGLE Metal), 1920 by 1080, the dev build with the panel: forty boss brutes killed at the spawn, about 190 drops on the ground, Alt held, 30 s after an 8 s warm-up: **60.07 fps, every frame 16.5 to 16.8 ms, 2 draw calls a frame, heap after a collection 84.0 MB, no console error**, the labels stacked with none over another; on the commit before, the same scene: 60.03 fps, 16.5 to 16.8 ms, 2 draw calls, 84.0 MB, the labels drawn over each other in a heap. `pnpm bench` in the same Chrome: 60.07 fps, 16.5 to 16.8 ms, 1 draw call a frame, heap 64.5 MB, no console error, unchanged from T03's |
| Actual days per ticket | T01: 0.5 against 1; T02: 0.5 against 1; T03: 0.5 against 1.5; T04: 0.5 against 0.5; T05, unplanned, from the buffer: 0.25 against 0.25 |
| Sprint total | Sized 4 with 1 of buffer, done in 2.25, 0.25 of the buffer spent on the unplanned T05. Closed 2026-09-28 on every row an agent can verify; the by-hand walk of the store and the look at the panel's Loot group wait under Waiting on a person, deferred until phase 8 is done by the maintainer's standing instruction of 2026-09-24 |

## Risks in this sprint

- The ring click is a new pick on the ground: it must lose to the screen's claim and win over a select. T03's test covers both edges; a wrong order is a misclick in play.
- A world that keeps running while the store is open can kill a hero who is shopping. Checkpoints stand more than 1000 from every pack, so only a chase reaches one; Q90 records it.
