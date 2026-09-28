# Phase 13 — Loot at depth

**Sprints:** 81–85, in sprint files · **Sized days:** 19.5: 17.5 in tickets and 2 of bucket appetite, or 16 and 3.5 if treasure classes are cut · **Gate:** [Phase 13 gate](../04-phase-exit-gates.md#phase-13-gate), an outline
**Written:** 2026-09-28 · **Author:** the delivery strategist, from [the design outline](../../2026-09-28-design-outline-next-phases.md) and [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md)

**Status of this page:** a sketch in the outline of phases 9 to 16, **approved by the maintainer on 2026-09-28**. Its sprint files were cut the same day by the delivery strategist, ahead of the phases before it at the maintainer's request, and the ticket table below names them. They are re-read at the phase's start against what phases 10 to 12 left, and a ticket that moved is edited in place with a one-line note. The phase starts when phase 12 closes and [R41](../02-risks-and-hidden-work.md)'s limit allows.

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

## Sprints and tickets

Cut on 2026-09-28 from the sketch the maintainer approved. Each ticket block in its sprint file is self-contained: size, dependencies, owner, what to build, acceptance with "it plays" and the bar, tests, pages, and the definition of done. No size moved from the sketch.

| Sprint | Ticket | Size |
| --- | --- | --- |
| [81 — The research, the split, and the cap](./sprint-81-the-research-the-split-and-the-cap.md) | P13-S81-T01 — Research: how Diablo II builds its items | 1.5 |
| | P13-S81-T02 — The game designer: bases to quality level 100 and affix tiers to affix level 100 | 1.5 |
| | P13-S81-T03 — Split the loot roll files before they grow | 0.5 |
| | P13-S81-T04 — The 40% cap on cooldown reduction from items | 0.5 |
| [82 — The pieces, the line count, and treasure classes](./sprint-82-the-pieces-the-line-count-and-treasure-classes.md) | P13-S82-T01 — The game designer: the pieces, the weights at depth, and the economy | 1 |
| | P13-S82-T02 — The engineering architect: the line count, treasure classes, and the placement | 1 |
| | P13-S82-T03 — Treasure classes as a loot-table kind; cut by T02 if the architect places none, its 1.5 to the bucket | 1.5 |
| [83 — The roll at depth, the bases, and the economy](./sprint-83-the-roll-at-depth-the-bases-and-the-economy.md) | P13-S83-T01 — The roll's quality and affix levels at depth | 1.5 |
| | P13-S83-T02 — The bases to quality level 100 as content | 1.5 |
| | P13-S83-T03 — The economy at depth: the town store's tables by stratum | 1 |
| [84 — The affix tiers, the pieces, and the balance](./sprint-84-the-affix-tiers-the-pieces-and-the-balance.md) | P13-S84-T01 — The affix tiers to affix level 100 as content | 1.5 |
| | P13-S84-T02 — The seven Legendary pieces as content | 1 |
| | P13-S84-T03 — The balance at depth, and every earlier save loading | 1.5 |
| [85 — The playtest, the bucket, the docs, and the gate](./sprint-85-the-playtest-the-bucket-the-docs-and-the-gate.md) | P13-S85-T01 — The maintainer's playtest and its triage | 0.5 |
| | P13-S85-T02 — Documentation sync | 0.5 |
| | The bucket, P13-S85-T04 onward, an appetite | 2 |
| | P13-S85-T03 — The phase gate | 1 |
| | **Total** | **19.5** |

**What the cut changed inside the 19.5,** each noted in its ticket:
- **The designer's tables go into a dated design note,** `notes/<date>-catalogue-at-depth.md`, not into the item catalogue. `tests/content/catalogues.spec.ts` holds the page's tables to the files, so a page written in sprint 81 would turn `pnpm check` red until sprints 83 and 84 land. Each content ticket moves its table into the page in the same commit as its files.
- **Two design answers the sketch did not ask for,** both in P13-S82-T01. First, what the town store's stock level reads at depth: it is the hero's level today, which stops at 30, so the store could never stock a base of quality level above 30. Second, the requirements of deep bases, held to the hero's reach at the depth they drop, in P13-S81-T02.
- **The roll at depth is held draw for draw at item levels 1 to 30,** so the stored logs of the long road and strata 1 to 3 do not move. A design rule that cannot hold this is a re-record named in advance by the architect's ticket ([R36](../02-risks-and-hidden-work.md)).
- **The seven pieces wait on a list.** No boss that drops them exists until phases 14 and 15, so the content test gains a list of pieces whose boss is not yet built. Each boss ticket empties its row, and phase 15's gate reads the list empty.
- **The balance builds its own measure.** No index reader exists in the code. P13-S84-T03 adds the sweep under `tooling/` and grows the driver's wear policy from "an empty armory slot" to a comparison by the index's weights, inside its 1.5.
- **The playtest reads the store as the save stocks it.** The panel's map level moves drops, not the town store, and no map below the Ossuary exists, so the store's deep tables are proved by spec in P13-S83-T03.

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
- any new stratum;
- drawn item art and item sounds, phase 16. Item icons and any new base's frame are painted in code by the shape painter, as today.

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

## Exit record

Not yet walked. P13-S84-T03 records the index's figures by item level here, and P13-S85-T03 records every gate row with its numbers.
