# Sprint 35 — Rarity

**Phase:** 7 · **Sized days:** 4 · **Buffer:** 1

## Goal

Items drop in seven rarities with rolled affixes, the top tiers can raise an orb by one, and the approved catalogue's twenty bases and three Legendary pieces are content.

## Playable outcome

Kill an elite pack from the panel and see a Rare or better with two affixes or more; a boss drops one Rare or better. Wear a Mythical with +1 Quartz and see Quartz's number on the bottom bar rise by one, capped at 7.

---

## Tickets

### P7-S35-T01 — Seven rarity tiers and rolled affixes

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 2 |
| Depends on | P7-S32-T02, P7-S34-T01 |
| Status | planned |

**Build:** an item's affixes rolled at the drop on the loot draw's sequence: the count its rarity gives (Q83), drawn from its slot's affix pool without repeat, each value from the affix's range at the item's item level. The item instance holds its rolled values in a fixed number of places, the most any rarity rolls, so a roll allocates nothing. A Legendary rolls nothing and reads its fixed identity from its definition; the eight active items have a weight of zero (Q84). Each affix is a row the armory source adds, so P7-S34-T01's stack carries them unchanged. The rarity's tint reaches the label and the icon. The content version moves; the seven logs are re-stamped.

**Acceptance:**
- Each rarity rolls its affix count, never one affix twice, each value in its range at its item level.
- The same key rolls the same affixes; the xorshift stream still reads the same with the tables on and emptied.
- Over 10 000 rolls per enemy tier, each rarity lands within a stated tolerance of its weight, and no active item drops.
- A worn item's affixes move the derived stats they name.

**Tests:**
- `tests/domain/items/affixes.spec.ts`: count per rarity, no repeat, ranges by item level, the same key giving the same roll, a Legendary's fixed rows.
- `tests/domain/loot/rarity.spec.ts`: weights per enemy tier over 10 000 rolls; actives at zero.
- `tests/simulation/items/armory-stats.spec.ts`: an affix on a worn item.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P7-S35-T02 — Plus one to an orb

| Field | Value |
| --- | --- |
| Layer | domain, simulation, presentation, tests, docs |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

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
| Depends on | P7-S31-T01 approved, T01, T02, P7-S32-T04 |
| Status | planned |

**Build:** about twenty base definitions under `src/content/items/` from the approved catalogue, and the three Legendary pieces, each with +1 to a different orb (Q84). The fixture bases of P7-S31-T03 stay for tests. Each base's icon frame exists. The loot tables name them. The content version moves; the seven logs are re-stamped.

**Acceptance:**
- Every base and Legendary piece in the catalogue has a file, registered, and the catalogue's tables match the files.
- Every armory slot has at least one base; the main hand holds staff, wand, sceptre, and dagger; the off-hand holds tome, focus, and buckler.

**Tests:**
- `tests/content/catalogues.spec.ts`: the catalogue's base and Legendary tables against the files.
- `tests/content/items.spec.ts`: every slot covered.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Seven rarities at their weights, affixes rolled and worn | |
| +1 to an orb, capped, read everywhere a level is read | |
| The catalogue's bases and Legendaries as content | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- T01 is the largest ticket in the phase. If it runs over, T03 moves to sprint 36's buffer rather than T02, since the orb bonus touches the kit and is better done while the affix roll is in one head.
- T03 waits on the catalogue's approval. If the approval has not come, T03 is written from the page as drafted and a later change is made in the page and the files together.
