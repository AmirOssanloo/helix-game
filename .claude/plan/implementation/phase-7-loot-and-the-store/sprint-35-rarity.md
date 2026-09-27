# Sprint 35 — Rarity

**Phase:** 7 · **Sized days:** 4 · **Buffer:** 1

> **Note, 2026-09-27, later:** re-cut on the later answers of that day: T02, the +1 to an orb, is cut (Q92, no +1 to an orb anywhere), and T04, moving an item on the inventory grid by its size (Q88), takes its day.

## Goal

Items drop in seven rarities with rolled affixes, the approved catalogue's twenty bases and three Legendary pieces are content, and an item is moved on the inventory grid by its size.

## Playable outcome

Kill an elite pack from the panel and see an item whose affix count is its rarity's; a boss drops one Rare or better, and one of the three named bosses on the long road can drop its Legendary. Open the inventory, pick a 2 by 2 helm up onto the pointer, and set it down where four free cells make room.

---

## Tickets

### P7-S35-T01 — Seven rarity tiers and rolled affixes

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 2 |
| Depends on | P7-S32-T02, P7-S34-T01 |
| Status | planned |

> **Note, 2026-09-27:** the enemy-tier tables roll Common to Mythical, Mythical at a low rate from any enemy; Legendary comes only from its named boss's table (P7-S32-T02), and active items have no rarity and are in no table (Q84). An affix rolls only when the item level reaches its affix level (Q89). Tints per Q83's answer. Six logs, not seven. Later the same day: the item level is the map's (Q89's answer), and no affix touches an orb (Q92).

**Build:** an item's affixes rolled at the drop on the loot draw's sequence: the count its rarity gives (Q83: 0 to 5), drawn without repeat from the affixes of its slot's pool whose affix level the item level reaches, each value from the affix's range. The level requirement becomes the highest of the base's and the rolled affixes' (P7-S32-T03's rule). The item instance holds its rolled values in a fixed number of places, the most any rarity rolls, so a roll allocates nothing. A Legendary rolls nothing and reads its fixed identity from its definition. Each affix is a row the armory source adds, so P7-S34-T01's stack carries them unchanged. The rarity's tint reaches the label and the icon: gray, white, blue, orange, gold, purple, red, Common to Legendary. The content version moves; the six logs are re-stamped.

**Acceptance:**
- Each rarity rolls its affix count, never one affix twice, each affix's level reached by the item level, each value in its range.
- The same key rolls the same affixes; the xorshift stream still reads the same with the tables on and emptied.
- Over 10 000 rolls per enemy tier, each rarity from Common to Mythical lands within a stated tolerance of its weight; no enemy-tier table rolls a Legendary or an active item.
- A worn item's affixes move the derived stats they name.

**Tests:**
- `tests/domain/items/affixes.spec.ts`: count per rarity, no repeat, the affix-level filter, ranges, the requirement as the highest, the same key giving the same roll, a Legendary's fixed rows.
- `tests/domain/loot/rarity.spec.ts`: weights per enemy tier over 10 000 rolls; no Legendary or active item from an enemy-tier table.
- `tests/simulation/items/armory-stats.spec.ts`: an affix on a worn item.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P7-S35-T02 — Plus one to an orb

| Field | Value |
| --- | --- |
| Layer | domain, simulation, presentation, tests, docs |
| Size | 1 |
| Depends on | T01 |
| Status | cut |

> **Note, 2026-09-27:** cut before it started, by the maintainer's answer to Q92: no +1 to an orb anywhere. The three Legendary pieces carry fixed values of existing, simple stats instead (P7-S35-T03). Its day goes to T04. The text below is kept as it was written.

> **Note, 2026-09-26:** split from the rarity ticket. The brief the maintainer saw added half a day to rarity for the seven tiers; this is the reason it is a day on its own. It is the first item effect that reaches the Skein kit, and the [mechanics spec](../../../../docs/product/specs/character-movement-and-mechanics.md) section 2.2 keeps any item effect on orb level inside its scope.

**Build:** an affix that adds one to Quartz's, Whorl's, or Ember's level. The effective orb level, the invested level plus the bonus capped at 7, the top of the orb level tables, is read in the one place P7-S31-T02 named (Q92): each instance's passive, updated on the tick the item goes on or comes off; each spell's tables at commit; and the total orb levels the Invoke cooldown reads. Skill points still go into the invested level up to 7. The bottom bar's orb square shows the effective level. The mechanics spec's section 2.2 and the section on orb levels, the [orbs and Invoke](../../../../docs/product/features/orbs-and-invoke.md) page, and the HUD page state it.

**Acceptance:**
- Wearing +1 Quartz at an invested 3 makes Quartz 4 for its passive on the same tick, for a spell committed after it, and for the Invoke cooldown; at an invested 7 it stays 7.
- A spell committed before the item came off keeps the level it committed at.
- The bottom bar shows the effective level.
- Every acceptance test in the mechanics spec section 16 stays green by name.

**Tests:**
- `tests/simulation/items/orb-bonus.spec.ts`: the passive, the commit, the Invoke cooldown, the cap, removal mid-cast.
- `tests/presentation/hud.spec.ts`: the effective level on the square.
- `pnpm test -t "AT-"`: unchanged.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · Anything under `src/presentation` · A documentation change.

---

### P7-S35-T03 — The bases and the Legendary equipment

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1 |
| Depends on | P7-S31-T01 approved, T01, P7-S32-T04 |
| Status | planned |

> **Note, 2026-09-27:** each Legendary is tied to the named boss P7-S39-T01's spec gives it (Q84); six logs, not seven.

> **Note, 2026-09-27, later:** the Legendaries carry fixed values of existing stats, not +1 to an orb (Q92), and each base carries its size in cells (Q88); T02 no longer a dependency, since it is cut.

**Build:** about twenty base definitions under `src/content/items/` from the approved catalogue, each with its size in cells and its quality level, and the three Legendary pieces, each with fixed values of existing, simple stats such as +10% magic damage, and each in its own boss's table (Q84). The fixture bases of P7-S31-T03 stay for tests. Each base's icon frame exists. The loot tables name them. The content version moves; the six logs are re-stamped.

**Acceptance:**
- Every base and Legendary piece in the catalogue has a file, registered, and the catalogue's tables match the files.
- Every armory slot has at least one base; the main hand holds staff, wand, sceptre, and dagger; the off-hand holds tome, focus, and buckler.

**Tests:**
- `tests/content/catalogues.spec.ts`: the catalogue's base and Legendary tables against the files.
- `tests/content/items.spec.ts`: every slot covered.

**Definition of done:** Every change · A documentation change.

---

### P7-S35-T04 — Moving an item on the inventory grid by its size

| Field | Value |
| --- | --- |
| Layer | presentation, tests, docs |
| Size | 1 |
| Depends on | P7-S34-T03, P7-S33-T01 |
| Status | planned |

> **Note, 2026-09-27, later:** new, from Q88's answer: items take more than one cell, as in Diablo II, so the screen's placement grows. Split from the inventory screen, P7-S34-T03, to keep that ticket at 1.5; with P7-S33-T01's half day it is the +1.5 Q88 costs.

**Build:** on the inventory screen: pressing on an inventory item and moving the pointer a few pixels lifts it onto the pointer, drawn at its size, while a click that does not move keeps Q91's meaning, equip; the cells it would take are shown free or blocked as the pointer moves; releasing sets it down with `move_item` where it fits, or swaps it with the one item it would cover, as P7-S33-T01's rules say; Esc or a release outside the grid puts it back. The items and loot page states the gesture. The screen sums nothing; every placement is a command.

**Acceptance:**
- An item lifted and set down where it fits sends one `move_item` and nothing else; where it does not, the cells show blocked and nothing is sent.
- Setting an item on exactly one other swaps them as the command's rule says; on two, it is blocked.
- A lifted item put back leaves the grid as it was.

**Tests:**
- `tests/presentation/inventory-screen.spec.ts`: lift, the free and blocked cells, set down, swap, put back, each to its command or none.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Seven rarities at their weights, affixes rolled and worn | |
| The catalogue's bases, with sizes, and Legendaries as content | |
| An item moved on the grid by its size | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- T01 is the largest ticket in the phase. If it runs over, T04 moves to sprint 36's buffer before T03 does, since the bases are what sprint 36's store stocks.
- T03 waits on the catalogue's approval. If the approval has not come, T03 is written from the page as drafted and a later change is made in the page and the files together.
