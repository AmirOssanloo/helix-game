# Sprint 42 — The bank and its keys

**Phase:** 9 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 9 README](./README.md)'s sketch

> **Phase 8's bucket runs first.** If the maintainer's phase 8 run is triaged while this sprint is open, P8-S37-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)).

## Goal

An active item is a thing the hero can own and fire: a definition kind, a bank of six places in run scope beside the inventory, six keys, a row on the HUD, and the store's Misc tab that sells it.

## Playable outcome

Grant 12 000 gold from the panel on the long road, open the store at the first checkpoint, click Misc, and buy an active item: its emerald icon lands in the bank row on the HUD under T. Press T and see the activation refused with its reason, or cast, as the item allows. Try to buy the same item again and see the refusal flash.

---

## Tickets

### P9-S42-T01 — Split the presentation files at the limit

| Field | Value |
| --- | --- |
| Layer | presentation, tests |
| Size | 0.5 |
| Depends on | none |
| Owner | The game engineer |
| Status | done |

> **Note, 2026-09-29, from P9-S41-T04:** `src/presentation/input/input-mapper.ts` is 486 lines after the pick moved into `pick-order.ts`. The mapper keeps the right click's dispatch because it builds the commands. P9-S42-T03 adds the six keys there. If more than their table rows in `key-bindings.ts` land in the mapper, it passes 500, so this split may need the mapper as well, for instance the left click's commit and store ring into a file beside it. Read at the sprint's start; the size holds until then.

**Build:** two screens files phase 9 grows, split before they grow ([R40](../02-risks-and-hidden-work.md)): `src/presentation/screens/tooltip.ts`, 452 lines, its line builders out into a file of their own, where the active item's COOLDOWN and MANA lines will go; `src/presentation/screens/store.screen.ts`, 450, its tabs out, where the Misc tab's listing will go. No behaviour changes.

**Acceptance:**
- The tooltip and the store screen draw and behave as before, by their specs.
- Each file and its new neighbour under 400 lines.
- It plays: the store and the tooltip in Chrome by an agent, as before.
- The bar: the render benchmark and the store screen's frame, by an agent, unchanged from sprint 36's figures.

**Tests:** no new spec; `tests/presentation/tooltip.spec.ts` and `tests/presentation/store-screen.spec.ts` green.

**Pages:** [presentation](../../../../docs/architecture/presentation.md), if it names a moved file.

**Definition of done:** Every change · Anything under `src/presentation`.

> **Note, 2026-09-29, at close:** the tooltip's line builders are `TooltipLines` in `src/presentation/screens/tooltip-lines.ts`, 154 lines: the labels, made once, the builders in the order the lines are shown, one call a line, so the COOLDOWN and MANA lines are two builders in their place, and the tooltip's text size, capacity, and tints; `tooltip.ts` keeps the pointer's item, the change test, the prices asked of the domain, the backdrop, and placement, 335 lines. The store's tabs are `StoreTabs` in `store-tabs.ts`, 283 lines: the tabs' buttons, the grid's sockets, and the shown tab's items laid in lanes, their refusal flashes, and the pointer's stock slot, where the Misc listing will go; `store.screen.ts` keeps the panel, the title, gold, the claim's screen, and the commands, 251 lines. Every object is made in the order it was, so the specs' quad indices hold; the public door exports the same names, the tooltip's constants now from `tooltip-lines.ts`. No behaviour changed and no spec was edited. **The mapper, read at the sprint's start:** left to T03. It stands at 486; whether it passes 500 depends on what T03's dispatch adds beyond the rows in `key-bindings.ts`, and by R40 the ticket that would trip the limit splits along the seam the note names, the left click's commit and store ring into a file beside it. `pnpm check` green, 5456 tests; the stress tier green. The stats system's steady-state heap case, in `tests/domain/stats/stats-system.spec.ts`, measured 73 728 and 72 992 bytes against its 65 536 allowance in two of six full runs on this change, at a load average near 8, and passed in the other four; on the committed head it passed three full runs of three in the same session, and sprint 36 recorded it failing there under load. It passed three times alone, on this change and on the head, and nothing this change touches is loaded by a domain spec. It is a heap allowance that the machine's load reaches, not a determinism flake; it is recorded here and in the report, and no ticket is raised for it. Played by an agent in headless Chrome over the DevTools protocol on the Apple M1 (ANGLE Metal), 1920 by 1080, the dev build with the panel: a left click on the hero on the long road's first ring opened the store with twelve items beside the inventory; the Armour tab laid its nine items in lanes, the tooltip over the Uncommon leather gloves read its name, rarity and base, item level, requirement, two stat lines, and PRICE 50 GOLD; the Weapons tab showed the wand alone and the Misc tab its two rings; a buy with 0 gold changed nothing; no console error. Definition of done walked: every change holds, no optional property, no non-null assertion, no ticket reference in the code, no file past 500 lines, imports through the doors; under `src/presentation`, quads and `BitmapText` only, nothing made during play, colour a tint, the fixed bands, the sync reading the world view and asking the queries door, input through the claim, no overlay; the render benchmark rerun, figures in the sprint exit. Documentation: [where to look](../../../../docs/architecture/where-to-look.md) names `tooltip-lines.ts` and `store-tabs.ts`; the presentation page names no moved file.

---

### P9-S42-T02 — The active item kind and the bank in run scope

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1.5 |
| Depends on | P9-S41-T01, P9-S41-T02 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** the rules are written in [commands and events](../../../../docs/architecture/commands-and-events.md) ("Item and store commands", "Activating an item", the events, and their quick-reference rows), [entities and pools](../../../../docs/architecture/entities-and-pools.md) ("The bank is six places beside the inventory"), and the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) ("Active items"); this ticket's pages are checked against them, not written. Two things the placement adds to the build: the cast under way records that its source is the bank, and the commit cancels it with nothing spent when the bank no longer holds an item naming its ability (sold or moved to the inventory during a cast point); and an accepted activation announces on existing fields, `place`, `unitId`, and `abilityId`. **Moves a stored checksum on purpose:** the bank in run scope and the cast sub-record's source field, both in the one `--checksums` re-record already planned, after the replay proves the play unchanged. **Size holds at 1.5.**

**Build:**
- **The kind.** An active item is a definition kind of its own under `src/content/items/actives/`, in the three files a kind costs (phase 7's toy kind): id, name, price, a size of 1 by 2 cells, and a required active block naming its ability by string key (ADR 0005) and its "refused while rooted" flag. No rarity, no item level, no affix. Its items are added one by one by the tickets that write their abilities; until then a spec defines a fixture active item whose block names an existing ability.
- **The bank.** Six places in run scope beside the inventory, with a range of their own in the place encoding (`src/domain/items/item-place.ts`), read top row first: T, X, V, then C, G, Space. A bought active item goes to the first free place, else into the inventory where it fits; buying one the hero already holds, in the bank or the inventory, is refused `already_held`. The existing move command moves an active item between the bank and the inventory and between two places of the bank; anything but an active item is refused a bank place. Selling from the bank works as from the inventory, at a quarter of the price.
- **The activation.** `activate_item` names a bank place. It is refused `no_item_at_place`, `invalid_place`, `on_cooldown`, `not_enough_mana`, or `dead`; otherwise it casts the item's ability through the pipeline as the hero's cast, with the item's clock on the hero keyed by the ability id (ADR 0011), shortened by cooldown reduction (Q109). An item in the inventory is carried and not activated.
- The bank joins the state checksum's run-scope list and the world view. `pnpm restamp --checksums` records the stored logs again, since the hashed state's shape moved; every replay first proves the same units, positions, health, mana, gold, and inventory every 50 ticks on the parent commit and this one, as P8-S36-T02 did.

**Acceptance:**
- A bought active item lands in the first free place, then the inventory when the bank is full; a second copy is refused.
- Moving an item, or selling it and buying it again, keeps its clock (catalogue 7.2).
- Each refusal names its reason and changes nothing; each command lands in the log and replays.
- It plays: through the panel's grant and the store, a fixture active item bought on the long road and activated by command in a simulation spec.
- The bar: nothing allocates on an activation or a move in steady state; the stress and budget tiers green.

**Tests:**
- `tests/domain/items/bank.spec.ts`: the first free place, the full bank, one copy, moves in and out, a non-active item refused a place.
- `tests/simulation/items/activation.spec.ts`: `activate_item` through the pipeline, the clock by ability id surviving a move and a resale, each refusal, the log and its replay.
- `tests/content/actives.spec.ts`: every active item's ability key resolves, its size is 1 by 2, and it holds no rarity.

**Pages:** [items and loot](../../../../docs/product/features/items-and-loot.md), the bank, checked against the build; [commands and events](../../../../docs/architecture/commands-and-events.md), `activate_item` and its refusals; [content and registries](../../../../docs/architecture/content-and-registries.md), the kind.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

### P9-S42-T03 — The six keys and the bank row on the HUD

| Field | Value |
| --- | --- |
| Layer | presentation, domain, simulation, tests, docs |
| Size | 1.5 |
| Depends on | T01, T02, P9-S41-T04 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** two parts of this ticket sit outside presentation, so the layer row gains domain and simulation, and the definition of done gains "A change under `src/domain` or `src/simulation`". The tie-break order, Q to F then T, X, V, C, G, Space, is the command buffer's sort in `src/simulation/command-buffer.ts`, as [commands and events](../../../../docs/architecture/commands-and-events.md#ordering) now says. A cursor that takes the hero reads a targeting kind of its own, **unit or self**, which the [ability pipeline](../../../../docs/architecture/ability-pipeline.md#targeting-kinds) now names: the kind in the ability definition's schema and the request stage accepting the caster for it are built here, so Gyre Sceptre and Veilblade only name it. No stored checksum moves, since no stored log holds an activation. **Size holds at 1.5**, tight; the sprint's buffer takes an overrun.

**Build:**
- **The keys.** T, X, V, C, G, and Space send `activate_item` for the bank's six places (Q82); Space's default page scroll is suppressed. The keys resolve in the tie-break order after Q, W, E, R, D, F, in that order. An item whose ability wants a target opens the targeting cursor as a spell does; Gyre Sceptre's and Veilblade's cursor accepts the hero as well as an enemy, so a left click on the hero casts on it (catalogue 7.1).
- **The bank row.** Six squares beside the kit's row, reusing the ability-square view: the item's icon, its cooldown wedge, its mana cost greyed when short, and its key.
- **The tooltip.** An active item's tooltip, in the inventory, the store, and over its bank square, adds COOLDOWN N and MANA N in the same font (Q113).

**Acceptance:**
- Each key sends its place; a key over an empty place sends nothing.
- The tie-break order holds when two keys land on one tick.
- It plays: in Chrome by an agent, Space pressed with the page scrolled to its top does not scroll it; a bought item's wedge runs after its activation.
- The bar: the bank row adds no draw call; the render benchmark and the HUD's frame with six items, by an agent.

**Tests:**
- `tests/presentation/input-mapper.spec.ts`: the six keys to their places, the tie-break order, the hero as a target for the cursor that accepts it.
- `tests/presentation/hud.spec.ts`: the bank row from the world view, the wedge, the greyed cost.
- `tests/presentation/tooltip.spec.ts`: the two lines on an active item and nowhere else.

**Pages:** [controls and orders](../../../../docs/product/features/controls-and-orders.md#the-keys) and [HUD](../../../../docs/product/features/hud.md), checked against the build; [presentation](../../../../docs/architecture/presentation.md), the bank row and the cursor that takes the hero.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · Anything under `src/presentation` · A documentation change.

---

### P9-S42-T04 — Active items in the store's Misc tab

| Field | Value |
| --- | --- |
| Layer | domain, presentation, content, tests, docs |
| Size | 0.5 |
| Depends on | T01, T02 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** the always-stocked Misc cell is placed in [commands and events](../../../../docs/architecture/commands-and-events.md#item-and-store-commands) as **the listing of active items**: every active item content defines, at every store, in the registry's order, read from the definitions and never rolled, stocked, or emptied, with a range of its own in the place encoding that `buy_item` names; it holds no state, so nothing joins the checksum. This ticket checks that page against the build. **Size holds at 0.5**; the sprint's risk line about the Misc cell is answered.

**Build:** every active item that exists is listed in the Misc tab of every store, at its catalogue price, always in stock and never rolled, so buying one does not empty its cell; its icon and label are emerald green (Q84). No loot table holds one, and the content check refuses a loot table that names one. The Deferred row "The eight active items in the store" moves to Taken.

**Acceptance:**
- The Misc tab lists every active item after the stocked rings and amulets, at its price; a buy follows T02's rules.
- Over 10 000 rolls of every table, no active item drops.
- It plays: in Chrome by an agent, the Misc tab on the long road's first ring, a buy, and the icon in the bank row.
- The bar: the store screen's frame, by an agent, unchanged within noise.

**Tests:**
- `tests/simulation/store/store.spec.ts`: the Misc listing, a buy, a refused second buy.
- `tests/domain/loot/roll.spec.ts`: no active item over 10 000 rolls per tier.
- `tests/presentation/store-screen.spec.ts`: the listing and its tint.

**Pages:** [items and loot](../../../../docs/product/features/items-and-loot.md#the-store), checked; [Deferred](../backlog/deferred.md).

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The two presentation files split, behaviour unchanged | Done in T01, 2026-09-29: `tooltip.ts` 335 lines and `tooltip-lines.ts` 154; `store.screen.ts` 251 and `store-tabs.ts` 283; `tests/presentation/tooltip.spec.ts` and `tests/presentation/store-screen.spec.ts` green unedited, 31 cases. In headless Chrome by an agent, the store, its three tabs, and the tooltip with its price as before. The store screen's frame, by an agent in headless Chrome over the DevTools protocol on the Apple M1 (ANGLE Metal), 1920 by 1080, the dev build with the panel, the store and the inventory open and the pointer moving across the store's grid every 50 ms, 30 s after an 8 s warm-up: **60.00 fps, every frame 16.5 to 16.8 ms, 2 draw calls a frame, heap after a collection 84.1 MB, no console error**; against sprint 36's 60.03 fps, 16.5 to 16.8 ms, 2 draw calls, 83.5 MB: unchanged within noise |
| The bank: first free place, one copy, the clock kept across a move and a resale | |
| `activate_item` through the pipeline, in the log and on replay | |
| The six keys and the tie-break order; Space not scrolling the page in Chrome | |
| The Misc tab and no active item in any table | |
| The render benchmark and the HUD's frame with the bank row, by an agent | T01, 2026-09-29: `pnpm bench` in the same headless Chrome, 30 s after an 8 s warm-up, draw calls counted by wrapping the WebGL draw methods: 60.00 fps, frames 16.5 to 16.8 ms, 1 draw call a frame, heap after a collection 64.6 MB, no console error; against sprint 41's 60.01 fps, 16.5 to 16.8 ms, 1 draw call: unchanged. No view or atlas changed. The HUD's frame with the bank row waits on T03 |
| Phase 8's bucket tickets run in this sprint, if any | |
| Actual days per ticket | T01 0.5 of 0.5 |
| Sprint total | |

## Risks in this sprint

- **Space and G are pressed by accident.** Nothing guards them here; the playtest reads them (the phase README's risks).
- **The checksum's shape moves with the bank.** The replay proves the play unchanged before `--checksums` records it (R36, R38).
- **An always-stocked Misc cell is a new store rule.** If the architect's placement puts it elsewhere, T04's note says so and the size holds.
