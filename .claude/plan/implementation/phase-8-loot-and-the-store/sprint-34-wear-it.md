# Sprint 34 — Wear it

**Phase:** 8 · **Sized days:** 3.5; was 4, until T02 shrank on 2026-09-27 when phase 7 was inserted · **Buffer:** 1

## Goal

A worn item changes the hero's derived stats through the modifier stack, magic damage % amplifies the magical damage the hero deals, and the first real UI screen shows the inventory, its items at their size, and the armory, and moves items by clicking, with no click ever walking the hero.

## Playable outcome

Kill packs until a helm drops, right-click it to pick it up, press I, click the helm to wear it, and see armour rise in the hero's readouts; click it again to take it off. Click anywhere on the screen and the hero does not move. Milestone M12.

---

## Tickets

### P8-S34-T01 — Equipment as a modifier source, and magic damage

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1.5 |
| Depends on | P8-S33-T01 |
| Status | done |

> **Note, 2026-09-27, later:** the stat is magic damage %, not spell damage % (Q93): it amplifies every magical instance the hero deals, never physical or pure. Title was "Equipment as a modifier source, and spell damage".

> **Architect review, 2026-09-27:** P7-S46-T02 no longer adds a source identity per row or sizes the table for items. This ticket builds the armory's rows where record (a) (P7-S48-T04) puts them: a run-scope table rewritten whole by slot and read by the hero's derivation, which is the architect's lean, or rows with a source identity on every unit's table. If the record chooses the second, the ticket is re-sized before it starts.

> **Note, 2026-09-27, from P7-S48-T04:** [ADR 0011](../../../../docs/adr/0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) chose the run-scope table: each armory keeps per-stat totals rewritten whole on an equip or unequip, copied from the active form to the hero first in the stats system, and every unit's modifier table references the totals it adds, zeros for all but the hero. The one pipeline adds them wherever a stat is read, the at-the-moment reads of attack damage, magic damage, cooldown reduction, and movement speed included. No item row and no item source kind on a unit's table; `MODIFIER_TABLE_SIZE` stays 22. Size unchanged.

> **Note, 2026-09-28, from P8-S31-T02:** the Build's "rows as one source" reads as ADR 0011's totals, and [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md), section 5, adds two things: a line's value is in the designer's units on the item and is converted into simulation units by the totals rewrite, once; and magic damage is read over a base of 0, so an item's +10% is 0.1 on the flat sum of `magic_damage`, never its percentage sum. The size stays 1.5.

**Build:** each armory's totals record, in `src/domain/items/armory.ts`, is rewritten whole from its ten slots on an equip or an unequip: the base's implicit line now and its affixes from P8-S35-T01, each line read in its source definition's stat, unit, and mode, flat or percentage, and converted into simulation units there, once. The stats system copies the active form's totals into the hero's totals first each tick; every unit's modifier table references the totals it adds, the hero's for the hero and one shared record of zeros for all others; the one pipeline adds them wherever a stat is read. The derived stats move on the tick the command is consumed. A new stat, **magic damage %**, read in `magicAmplification` in `src/domain/combat/damage.ts` through the one pipeline, the attacker's rows plus the totals its table references, over a base of 0, so a +10% line is 0.1 on the flat sum, to every instance of magical damage the hero deals: a spell's initial hit and its burns, and later an active item's magical damage (Q93). It never amplifies physical damage, so neither the hero's attack nor Emberling's attack, both physical, and pure damage is not magical. The P5-S22-T03 door test for items as a modifier source becomes a test of the real armory. The [hero](../../../../docs/product/features/hero.md) page's derived-values table and the [spells and attack](../../../../docs/product/features/spells-and-attack.md) page state the new stat, and the [vocabulary](../../../../docs/product/vocabulary.md) gains it; the Deferred row for spell amplification moves to built.

> **Note, 2026-09-27, from P7-S46-T02:** the stat exists. `magic_damage` is a stat the damage door reads off the attacker's modifier rows at each magical hit, over a base of 0, before mitigation; a flat row of 0.1 is +10%. The vocabulary row and the Deferred row on the spells and attack page are already written. This ticket adds the armory as the source that writes it.

> **Note, 2026-09-28, at close:** the totals are `StatTotals` in `src/domain/entities/stat-totals.ts`, two `Float64Array`s of sums indexed by stat and a count of the lines summed; a record keyed by stat boxed every fractional sum read or written, which the allocation spec caught. The rewrite is `src/domain/items/armory-totals.ts`: a flat line per second is divided into per tick and a flat cooldown reduction line in seconds is read as ticks, both by the tuning table's conversion; the items' cooldown reduction percentages are one factor of the cooldown product (Q109, provisional). The `item` modifier kind is gone. Only the new work is held to "no allocation": the stats system's derivation already boxed a double on every keyed store into a `Stats` record before this ticket, the same bytes measured on the commit before it, and that is P8-S34-T04, unplanned. The six stored logs' checksums were recorded again with `pnpm restamp --checksums`, since the armory's and the hero's totals now enter the state checksum; no stamp moved.

**Acceptance:**
- Wearing and removing an item moves each derived stat it names by its value, on the same tick, and leaves the stack as it was on removal.
- Two items naming one stat add as the stack's flat and percentage rules say.
- Magic damage % raises every magical hit and burn the hero deals by its value, and leaves physical and pure damage, the attack, Emberling's attack, and enemy abilities alone.
- No allocation in the stats system in steady state.

**Tests:**
- `tests/domain/stats/modifiers.spec.ts`: the armory source added and removed.
- `tests/simulation/items/armory-stats.spec.ts`: equip and unequip against each derived stat.
- `tests/domain/combat/magic-damage.spec.ts`: amplification of a magical hit and a magical burn; none of physical or pure damage, the attack, or a summon's attack.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P8-S34-T02 — The first screen: open, close, and a click that stays on it

| Field | Value |
| --- | --- |
| Layer | presentation, app, tests, docs |
| Size | 0.5 |
| Depends on | P8-S31-T02, P7-S50-T01 |
| Status | done |

> **Note, 2026-09-26:** split from the brief's 2.5-day inventory screen, which is not on the plan's scale. The frame is first-of-kind and touches Phaser or the DOM, so it carries both half days of the anchors.

> **Note, 2026-09-27, phase 7 inserted:** shrunk from 1 to 0.5. The Phaser-or-DOM decision is P7-S48-T04 (b), and the capture layer, with the pause screen as its first consumer, is built by P7-S50-T01. This ticket is the second consumer: the inventory's frame registered on the layer, and I to open it. The first-of-kind half days were spent there.

> **Note, 2026-09-27, from P7-S48-T04:** [ADR 0012](../../../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md) decided Phaser, in `HudScene`'s screen band. The inventory is a non-modal screen registered on the input claim, with its rectangles and the keys I and Esc; the world keys stay live and it does not pause. The draw-call acceptance applies.

> **Note, 2026-09-28, from P8-S31-T02:** the screen claims I alone; Escape is the claim's, as ADR 0012 has it. No screen of this phase claims T, X, V, C, G, or Space, which [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md), section 7, keeps free for phase 9's bank; the acceptance gains that row. The size stays 0.5.

**Build:** the screen frame as P7-S48-T04 (b) decided, on the capture layer P7-S50-T01 built. I opens and closes it, Esc closes it (Q91) in the order the controls page gives, targeting cursor first, then an open screen, then pause. A click anywhere on an open screen is claimed by the capture layer and never becomes a move, an attack, or a select on the ground beneath, as the bottom bar's clicks are today. The world keys the brief keeps live while a screen is open still act. Opening a screen changes nothing in the world and sends no command. The [controls and orders](../../../../docs/product/features/controls-and-orders.md) page's pointer and key tables, and the [presentation](../../../../docs/architecture/presentation.md) page, state it.

**Acceptance:**
- I opens and closes the screen; Esc closes it and still closes a targeting cursor first, as today.
- A left or right click on the open screen sends no command to the world.
- Q, W, E, R, D, and F act as the brief says while the screen is open.
- The screen's claim names I and no other key; T, X, V, C, G, and Space reach the mapper with it open.
- The draw calls in the panel's readout stay under the bar's 5 for the world with the screen open, if it is Phaser.

**Tests:**
- `tests/presentation/input-mapper.spec.ts`: a click on the screen sends nothing; I and Esc.
- `tests/presentation/screen.spec.ts`: open, close, and the claim's rectangle.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

> **Note, 2026-09-28, at close:** the screen is `InventoryScreen` in `src/presentation/screens/inventory.screen.ts`, a titled panel along the right of the canvas above the bar, its rectangle `INVENTORY_RECT`; T03 lays the armory, the grid, and gold inside it. The claim gained toggles: `addToggle(code, screen)` opens a closed screen on its key while no modal screen is open, and the open screen names the key and closes on it, so the key never reaches the mapper. Two things the ticket did not name were fixed in the claim on the way: a key a screen or toggle took is now edge-triggered, so a held I does not flicker the screen, and a modal screen now stops keys from reaching the screens beneath it, so I under the pause screen does not close the inventory. The screens' shared ports and helpers moved to `src/presentation/screens/screen-parts.ts`. Measured by an agent in headless Chrome over the DevTools protocol on the Apple M1, draw calls counted by wrapping the WebGL draw methods: 2 a frame (the world's 1 and the HUD's 1) with the screen closed, open, and closed again, and no console error. One `pnpm check` under a load average near 55 from another session timed out two replay specs and one allocation spec, none touched here; each passed alone, and the full gate passed once the load fell.

---

### P8-S34-T03 — The inventory and armory screen

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1.5 |
| Depends on | T02, P8-S33-T01, P8-S40-T01 |
| Status | done |

> **Note, 2026-09-27, later:** the grid is 10 by 4 with items drawn at their size in cells (Q88). Moving an item within the grid by picking it up onto the pointer and placing it is split out as P8-S35-T04, 1 day, so this ticket stays 1.5.

> **Note, 2026-09-27, from P7-S48-T04:** the screen is its own module registered on `HudScene`, made at `create` and pooled ([ADR 0012](../../../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md)); the worn items are read from the active form's armory and the inventory from run scope ([ADR 0011](../../../../docs/adr/0011-an-item-is-a-value-the-hero-holds-in-run-scope.md)).

> **Note, 2026-09-28, from P8-S31-T02:** the screen is `src/presentation/screens/inventory.screen.ts`. Whether an item's requirement is met is asked of the domain's queries door, never worked out in the screen, and a refusal flashes the item at the place the `command_refused` event's new `place` field names ([the brief](../../2026-09-28-where-items-loot-and-the-store-live.md), sections 1.1 and 4.2). The size stays 1.5.

**Build:** the inventory and armory screen inside the frame: the ten armory slots laid out as a figure, the 10 by 4 inventory grid with each item drawn across the cells it takes, and gold. Each item is its icon in its rarity's tint, scaled to its cells. A left click on an inventory item sends `equip_item`; a left click on a worn item sends `unequip_item`; a right click on an inventory item sends `drop_item` (Q91). A refused command flashes the item as a refused key flashes its square. The screen reads the world view and sums nothing, as the HUD does. The items and loot page states each gesture.

**Acceptance:**
- Every gesture sends its command and nothing else.
- The screen shows what run scope holds after each command, on the next frame.
- An item whose requirement is above the hero's level flashes on a click and stays where it was.
- The render benchmark in Chrome with the screen open, run by an agent through browser automation, its figures in the sprint exit (standing instruction of 2026-09-27).

**Tests:**
- `tests/presentation/inventory-screen.spec.ts`: layout, items drawn across their cells, each gesture to its command, the refusal flash, the view read with no arithmetic.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.


> **Note, 2026-09-28, at close:** the screen is `InventoryScreen` in `src/presentation/screens/inventory.screen.ts`, its layout in `inventory-layout.ts`, an item on it an `ItemBoxView` (`item-box.view.ts`): a backdrop over the item's cells or slot, the base's icon in the rarity's tint scaled to the box's shorter side, and the refusal flash, one box per armory slot and one per placed record, made at `create`; the flashes are `InventoryFlashes` (`inventory-flashes.ts`), a tick per cell by the item's corner and one per armory slot. The HUD scene syncs the screen each frame it is open and hands it every drained event. The screen always sends the gesture's command and the domain refuses; the red backing of an item above the hero's level is asked of `meetsRequirement` through the queries door, and the armory's figure and that red are Q110, decided provisionally. Two queries the screen reads the world view through took the view's types: `recordAt` reads any `{ cells }`, and `levelRequirementOf` and `meetsRequirement` a deep-readonly item; a type widening only, no behaviour moved. `pnpm check` green, 5079 tests. Definition of done walked: every change holds, no ticket reference in the code, no file past 500 lines. Under `src/presentation`: quads from the atlas and `BitmapText` only, in the screen band; nothing made during play; colour is a tint; the sync reads the world view and writes sprites, reads none back, and asks the one verdict of the queries door; every press still goes through the claim; no overlay. The render benchmark was rerun by an agent, figures in the sprint exit. Documentation: the items and loot page states the figure, the drawing, the red backing, and that a click on nothing does nothing; the presentation page states the item box, the fixed set, and the flash by place, in its body and quick reference.

---

### P8-S34-T04 — The stats derivation allocates nothing

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 0.25 |
| Depends on | P8-S34-T01 |
| Status | planned |

> **Note, 2026-09-28:** unplanned, added at P8-S34-T01's close. T01's acceptance asks for no allocation in the stats system in steady state. Measured under Vitest after 300,000 warm-up calls, `deriveStats` allocates about 48 bytes a call and `applyModifiers` about 16, the same on the commit before T01: `deriveOver` and `applyModifiersOver` write each value with a keyed store, `out[source.key] = …`, and a fractional double stored that way into a `Stats` record is boxed on the heap. The hero derives once a tick and every enemy with a live row once a tick, so the rule of [simulation coding](../../../../docs/standards/simulation-coding.md#quick-reference) is broken on every tick with a status on screen. It is paid from the sprint's buffer.

**Build:** the two derivation walks write each value through a store that names its field, as each `StatSource` already names its field for `copy`, or hold the derived values where a fractional store is not boxed; whichever keeps every reader of `unit.stats` as it is. The stats system, over a hero with rows and items and 200 enemies with rows, allocates nothing once warm.

**Acceptance:**
- The stats system allocates nothing in steady state, with statuses, orbs, and worn items live.
- No stored log's checksum moves.

**Tests:**
- `tests/domain/stats/stats-system.spec.ts`: no allocation over a warm world with rows on the hero and on enemies.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation`.

---

## Sprint exit

| Check | Result |
| --- | --- |
| A worn item moves its derived stats and leaves cleanly | Yes: `tests/simulation/items/armory-stats.spec.ts`, each of the seven derived values by a flat line on the equip's tick and back on the unequip's, two items and a status summing in one multiplier, and the attack damage, movement speed, and cooldown reads at the moment; the door test `tests/simulation/doors/items-are-a-modifier-source.spec.ts` now wears a real item |
| Magic damage % on magical damage alone | Yes: `tests/domain/combat/magic-damage.spec.ts`, +10% on a magical hit and a magical burn; none on physical or pure, the hero's attack, Emberling's attack, or an enemy's magical hit |
| No click on a screen reaches the ground | Yes: `tests/presentation/input-mapper.spec.ts`, a left or right click on the open inventory, edges included, sends no command and the log gains nothing, and the same right click off it is a move; `tests/presentation/screen.spec.ts`, every press inside the rectangle and its release kept from the mapper. The world's draw calls with the screen open: 1, the HUD's 1, measured by an agent in headless Chrome |
| The inventory and armory screen, by hand | Deferred until phase 8 is done, by the maintainer's standing instruction of 2026-09-24; a box under Waiting on a person in STATUS.md. Every agent-verifiable row holds: `tests/presentation/inventory-screen.spec.ts`, and the gestures driven in headless Chrome |
| The render benchmark with the screen open | 2026-09-28, T03, by an agent: headless Chrome 153 over the DevTools protocol on the Apple M1 (ANGLE Metal), 1920 by 1080, 30 s after an 8 s warm-up, draw calls counted by wrapping the WebGL draw methods. **The game with the screen open**, the dev build with the panel: 25 items placed in the grid for the measurement (5 caps and 20 bands in every rarity, written into run scope from the page, since no grant command exists before P8-S38), gold 1234, I pressed, then a left click on a cap that wore it and a right click on a band that dropped it at the hero's feet, both through the claim, the hero standing where it was with no order: 60.00 fps, every frame 16.5 to 16.8 ms, **2 draw calls a frame** (the world's 1 and the HUD's 1, as with the screen closed at T02), heap after a collection 39.4 MB, no console error. **The render benchmark** (`pnpm bench`), as configured: 60.00 fps, 16.5 to 16.8 ms, 1 draw call a frame, heap 25.3 MB, no console error; against sprint 33's 60.00 fps, 16.8 ms worst, 1 draw call: unchanged, as the atlas did not change and the bench draws no screen |
| Milestone M12 | |
| Actual days per ticket | P8-S34-T01: sized 1.5, done in 1. P8-S34-T02: sized 0.5, done in 0.25. P8-S34-T03: sized 1.5, done in 0.75 |
| Sprint total | |

## Risks in this sprint

- T02 was the first screen of the game and the ticket in this phase most likely to double (R27). Since 2026-09-27 the first screen is phase 7's pause screen, so T02 is the second consumer of a layer that exists. The sprint's buffer day now goes to T03, the first screen laid out at size.
- If the brief chose DOM, the screen's pixels are outside the bar's draw-call count, and the Phaser canvas beneath still owns the clicks it does not claim: the claim's test is the whole of the risk.
