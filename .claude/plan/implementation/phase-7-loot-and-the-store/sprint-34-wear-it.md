# Sprint 34 — Wear it

**Phase:** 7 · **Sized days:** 4 · **Buffer:** 1

## Goal

A worn item changes the hero's derived stats through the modifier stack, magic damage % amplifies the magical damage the hero deals, and the first real UI screen shows the inventory, its items at their size, and the armory, and moves items by clicking, with no click ever walking the hero.

## Playable outcome

Kill packs until a helm drops, right-click it to pick it up, press I, click the helm to wear it, and see armour rise in the hero's readouts; click it again to take it off. Click anywhere on the screen and the hero does not move. Milestone M11.

---

## Tickets

### P7-S34-T01 — Equipment as a modifier source, and magic damage

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1.5 |
| Depends on | P7-S33-T01 |
| Status | planned |

> **Note, 2026-09-27, later:** the stat is magic damage %, not spell damage % (Q93): it amplifies every magical instance the hero deals, never physical or pure. Title was "Equipment as a modifier source, and spell damage".

**Build:** each armory slot adds its item's rows, the base's implicit stat now and its affixes from P7-S35-T01, to the stats modifier stack as one source, removed whole when the item comes off. The derived stats move on the tick the command is consumed. A new stat, **magic damage %**, applied where P7-S31-T02 placed it, to every instance of magical damage the hero deals: a spell's initial hit and its burns, and later an active item's magical damage (Q93). It never amplifies physical damage, so neither the hero's attack nor Emberling's attack, both physical, and pure damage is not magical. The P5-S22-T03 door test for items as a modifier source becomes a test of the real armory. The [hero](../../../../docs/product/features/hero.md) page's derived-values table and the [spells and attack](../../../../docs/product/features/spells-and-attack.md) page state the new stat, and the [vocabulary](../../../../docs/product/vocabulary.md) gains it; the Deferred row for spell amplification moves to built.

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

### P7-S34-T02 — The first screen: open, close, and a click that stays on it

| Field | Value |
| --- | --- |
| Layer | presentation, app, tests, docs |
| Size | 1 |
| Depends on | P7-S31-T02 |
| Status | planned |

> **Note, 2026-09-26:** split from the brief's 2.5-day inventory screen, which is not on the plan's scale. The frame is first-of-kind and touches Phaser or the DOM, so it carries both half days of the anchors.

**Build:** the screen frame as P7-S31-T02 decided, Phaser or DOM. I opens and closes it, Esc closes it (Q91). A click anywhere on an open screen is claimed by it and never becomes a move, an attack, or a select on the ground beneath, as the bottom bar's clicks are today. The world keys the brief keeps live while a screen is open still act. Opening a screen changes nothing in the world and sends no command. The [controls and orders](../../../../docs/product/features/controls-and-orders.md) page's pointer and key tables, and the [presentation](../../../../docs/architecture/presentation.md) page, state it.

**Acceptance:**
- I opens and closes the screen; Esc closes it and still closes a targeting cursor first, as today.
- A left or right click on the open screen sends no command to the world.
- Q, W, E, R, D, and F act as the brief says while the screen is open.
- The draw calls in the panel's readout stay under the bar's 5 for the world with the screen open, if it is Phaser.

**Tests:**
- `tests/presentation/input-mapper.spec.ts`: a click on the screen sends nothing; I and Esc.
- `tests/presentation/screen.spec.ts`: open, close, and the claim's rectangle.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P7-S34-T03 — The inventory and armory screen

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1.5 |
| Depends on | T02, P7-S33-T01, P7-S40-T01 |
| Status | planned |

> **Note, 2026-09-27, later:** the grid is 10 by 4 with items drawn at their size in cells (Q88). Moving an item within the grid by picking it up onto the pointer and placing it is split out as P7-S35-T04, 1 day, so this ticket stays 1.5.

**Build:** the inventory and armory screen inside the frame: the ten armory slots laid out as a figure, the 10 by 4 inventory grid with each item drawn across the cells it takes, and gold. Each item is its icon in its rarity's tint, scaled to its cells. A left click on an inventory item sends `equip_item`; a left click on a worn item sends `unequip_item`; a right click on an inventory item sends `drop_item` (Q91). A refused command flashes the item as a refused key flashes its square. The screen reads the world view and sums nothing, as the HUD does. The items and loot page states each gesture.

**Acceptance:**
- Every gesture sends its command and nothing else.
- The screen shows what run scope holds after each command, on the next frame.
- An item whose requirement is above the hero's level flashes on a click and stays where it was.
- The render benchmark in Chrome with the screen open, run by an agent through browser automation, its figures in the sprint exit (standing instruction of 2026-09-27).

**Tests:**
- `tests/presentation/inventory-screen.spec.ts`: layout, items drawn across their cells, each gesture to its command, the refusal flash, the view read with no arithmetic.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| A worn item moves its derived stats and leaves cleanly | |
| Magic damage % on magical damage alone | |
| No click on a screen reaches the ground | |
| The inventory and armory screen, by hand | |
| The render benchmark with the screen open | |
| Milestone M11 | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- T02 is the first screen of the game and the ticket in this phase most likely to double (R27). The sprint's buffer day is its; a second day moves sprint 35 by a day, not its scope.
- If the brief chose DOM, the screen's pixels are outside the bar's draw-call count, and the Phaser canvas beneath still owns the clicks it does not claim: the claim's test is the whole of the risk.
