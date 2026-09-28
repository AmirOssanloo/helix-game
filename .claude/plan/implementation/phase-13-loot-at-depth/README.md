# Phase 13 — Loot at depth

**Sprints:** 81–85, sketched · **Sized days:** 19.5, sketched: 17.5 in tickets and 2 of bucket appetite · **Gate:** [Phase 13 gate](../04-phase-exit-gates.md#phase-13-gate), an outline
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md)

**Status of this page:** a sketch in the outline of phases 9 to 16, **approved by the maintainer on 2026-09-28**. It stays a sketch: its sprint files are cut when phase 12 closes and [R41](../02-risks-and-hidden-work.md)'s limit allows. Ticket IDs are assigned then.

## Goal

Items keep being worth reading all the way down:
- **The catalogue at the descent's scale:** bases to quality level 100 and affix tiers to affix level 100, so a hero at the bottom wears about +100% magic damage and +25% cooldown reduction ([the descent](../../../../docs/product/specs/the-descent.md#7-loot-at-depth)).
- **A cap of 40% on cooldown reduction from items.**
- **A Legendary piece for every stratum boss.**
- **An economy that holds at depth,** with the town store stocking up to Epic from the fourth stratum.

Research into how Diablo II builds its items comes first, as every catalogue here came before its schema.

**Why here, and not after the strata:** strata 4 to 10 are tuned against the hero's power, which is flat below map 30 without deeper items. Tuning them first would mean tuning them twice. Loot at depth cannot be played for real until those strata exist. So its balance is measured on the hero's offence index at item levels up to 100, against the descent's section 8.1, and its playtest reads deep drops by the panel's map level.

## What it builds on

- ADR 0011: a save holds live stat lines only, so raising the line count needs no migration.
- ADR 0014: only the loot tables are tunable.
- Phase 12's items to level 30.
- The driver.

## Sketched tickets

| Sprint | Ticket | Size |
| --- | --- | --- |
| 81 | Research, a dated note under `.claude/plan/`: how Diablo II builds its items, from treasure classes, quality levels, affix levels, and the quality roll | 1.5 |
| 81 | The game designer: bases to quality level 100 and affix tiers to affix level 100, and whether a new stat enters | 1.5 |
| 81 | Split `domain/loot/affix-roll.ts` and `item-roll.ts` by the seams the research names, before they grow | 0.5 |
| 81 | The 40% cap on the items' cooldown reduction, a tunable, applied where the items' sum is read | 0.5 |
| 82 | The game designer: a Legendary piece for each of the seven stratum bosses from the Cisterns down, the upper rarities' weights against about three hundred items a stratum, base values rising with quality level, and the store's tables by stratum | 1 |
| 82 | The engineering architect: the item value's line count measured before any constant moves, and treasure classes placed as a loot-table kind if the research asks for them | 1 |
| 82 | Treasure classes as a loot-table kind, tunable under ADR 0014; if the architect places none, this ticket is cut and its day goes to the bucket | 1.5 |
| 83 | The roll's quality and affix levels at depth | 1.5 |
| 83 | The bases to quality level 100 as content | 1.5 |
| 83 | The economy at depth: base values, and the town store's tables by stratum, Epic from the fourth | 1 |
| 84 | The affix tiers to affix level 100 as content | 1.5 |
| 84 | The seven Legendary pieces as content, their drops wired as each boss is built in phases 14 and 15 | 1 |
| 84 | The balance: the driver's rolls at item levels 10 to 100 put the hero's offence and defence index within the band of the descent's section 8.1 the designer sets; a save of phase 12 still loads | 1.5 |
| 85 | The maintainer's playtest and its triage: from a save at map 21, with the panel's map level set to 50 and then 90, reading what drops and what the store stocks; the log holds those commands | 0.5 |
| 85 | Documentation sync | 0.5 |
| 85 | The triage bucket, an appetite | 2 |
| 85 | The phase gate | 1 |
| | **Total** | **19.5** |

## Size and band

Mostly content, on a roll and a schema that exist; the research and treasure classes are the new ground. **Expect about 0.45: about 9 engineer-days, in a band of 7 to 14.**

## Cut-line, sketched

**In:**
- the research note;
- bases and affix tiers to level 100;
- treasure classes if the research asks for them;
- the 40% cap;
- seven more Legendary pieces;
- the economy and the store's tables at depth;
- one playtest and a bucket of 2.

**Out:**
- sets, sockets, runewords, lifesteal, and crafting (never);
- item comparison in the tooltip, unless the playtest asks;
- two-handed weapons;
- a stash larger than phase 11's;
- any new stratum.

## Gate, outlined

In [Phase exit gates](../04-phase-exit-gates.md#phase-13-gate):
- the catalogue's tables held to the files by the content test;
- every rarity at its weight at depth over rolls;
- the cap by its spec;
- the hero's index inside the designer's band;
- a stored save of each earlier version loading;
- the maintainer's reading of deep drops, triaged;
- the docs;
- the bar.

## Risks

- **The item value grows a line,** and every inventory, armory, bank, stash, store, and ground-item record grows with it. It is measured first (the architecture outline, section 4).
- **The balance is read without the strata it serves.** It is held to the descent's hero index, and each stratum's balance in phases 14 and 15 reads it again.
