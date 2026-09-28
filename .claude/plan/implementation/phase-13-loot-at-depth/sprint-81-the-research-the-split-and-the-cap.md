# Sprint 81 — The research, the split, and the cap

**Phase:** 13 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 12 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 12's bucket runs first.** If the maintainer's phase 12 run is triaged while this sprint is open, the accepted tickets, written as phase 12's bucket in sprint 80's file, run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint, so no sprint holds more than four sized days ([R41](../02-risks-and-hidden-work.md)).

## Goal

The catalogue at depth is designed from research, as every catalogue here came before its schema: how Diablo II builds its items is written down, the bases and affix tiers to level 100 are designed against the hero's curve, the loot roll has room to grow, and cooldown reduction from items stops at 40%.

## Playable outcome

The long road and strata 1 to 3 play as before, every stored log unchanged but its stamp: no item at those depths sums to 40% cooldown reduction, so the cap changes nothing a player there can reach. A simulation spec dresses the hero in fixture items summing 55% and finds a spell's clock shortened by 40%, with Whorl's reduction still applied on top.

---

## Tickets

### P13-S81-T01 — Research: how Diablo II builds its items

| Field | Value |
| --- | --- |
| Layer | docs, under `.claude/plan/` |
| Size | 1.5 |
| Depends on | none |
| Owner | The game designer |
| Status | planned |

**Build:** a dated note, `.claude/plan/implementation/notes/<date>-diablo-ii-item-generation.md`, in the shape of [the Act 1 ratios note](../notes/2026-09-26-diablo-ii-act-1-ratios.md): what is sourced, from where, at what confidence, and what is estimated, marked. It covers the four mechanisms [the design outline](../../2026-09-28-design-outline-next-phases.md) names:
- **Treasure classes:** a chain of tables chosen by the monster's level, their picks and their no-drop weight, and how a class reaches a base.
- **Quality levels:** a base's level, and how a drop chooses among bases near its item level rather than evenly among all it reaches.
- **Affix levels:** an affix's level, how the item level gates it, and how a deep item's affix level is derived from its item level and its base's quality level.
- **The quality roll:** how Diablo II chooses magic, rare, set, and unique by item level against quality level.

Each mechanism ends with a proposal for Helix in a line: adopt, adapt, or leave, and which stage of the roll it changes (the base's choice, the tier's choice, the rarity's weights by depth). The note closes with the seams it implies in `src/domain/loot/affix-roll.ts` and `src/domain/loot/item-roll.ts`, which P13-S81-T03 splits along, and with whether the catalogue should reach Diablo II's scale of about a thousand items, which [ADR 0011](../../../../docs/adr/0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) names as a revisit point. Sets, sockets, runewords, and crafting are named as read and left, never built.

**Acceptance:**
- Each of the four mechanisms is described with its source and ends with a proposal.
- The seams of the two roll files are named, each with the stage of the roll that grows there.
- The proposals are a design reference; nothing under `docs/` changes in this ticket.
- It plays: nothing changes in the build.
- The bar: not applicable, no code changes.

**Tests:** none.

**Pages:** none under `docs/`; the note is linked from the design note P13-S81-T02 writes.

**Definition of done:** Every change · A documentation change.

---

### P13-S81-T02 — The game designer: bases to quality level 100 and affix tiers to affix level 100

| Field | Value |
| --- | --- |
| Layer | docs, under `.claude/plan/` |
| Size | 1.5 |
| Depends on | T01 |
| Owner | The game designer |
| Status | planned |

**Build:** a dated design note, `.claude/plan/implementation/notes/<date>-catalogue-at-depth.md`, holding the tables that P13-S83-T02 and P13-S84-T01 write into the [item catalogue](../../../../docs/product/specs/item-catalogue.md) with their files. The tables go into the note, not the page, because `tests/content/catalogues.spec.ts` holds the page's tables to the content: a page that runs ahead of the files turns `pnpm check` red until they land. The note sets:
- **The bases**, from phase 12's level-30 table to quality level 100: how many per armory slot (the design outline's open question), each with its quality level, requirement, implicit and range, value, and the existing frame of its armory slot. Every requirement is at most the hero's expected level at the depth the base first drops, read from [the descent's section 8.1](../../../../docs/product/specs/the-descent.md#81-what-the-hero-brings), since the hero stops at level 30 while bases go to 100.
- **The affix tiers** to affix level 100, so that a hero at the bottom wears about +100% magic damage and +25% cooldown reduction in all, as the descent's section 7 asks, under the 40% cap of P13-S81-T04.
- **Whether a new stat enters,** such as mana cost reduction. The proposal is none. If one does, the note names where it is read, and P13-S82-T02 sizes it. A stat that does not fit sprint 82's free half day goes to [Deferred](../backlog/deferred.md), not into a content ticket.
- **The balance's measure:** the offence and defence index of section 8.1 as the balance ticket reads it from the hero's derived values, and the band around each of the rows at item levels 30, 50, 70, and 100 that P13-S84-T03 holds.
- **What moves above.** Every existing base and affix keeps its id and numbers, unless the note names the move and its reason. A named move to a number the long road or strata 1 to 3 roll is a re-recorded log ([R36](../02-risks-and-hidden-work.md)), which P13-S82-T02 places in a ticket.

Every name and affix line is written in the atlas font's set, capitals, digits, the space, and `+ - % . , : /` ([R29](../02-risks-and-hidden-work.md)).

**Acceptance:**
- The base and affix tables reach level 100 on every armory slot, and every slot can roll at least five stats at every item level, so a Mythical finds five affixes anywhere.
- The expected bottom of the curve, +100% magic damage and +25% cooldown reduction worn, is reachable from the tables and written as a sum.
- The index's band is written for four item levels.
- It plays: nothing changes in the build.
- The bar: not applicable, no code changes.

**Tests:** none.

**Pages:** none under `docs/` until the content tickets; [the descent](../../../../docs/product/specs/the-descent.md#7-loot-at-depth) is checked against the note, and a disagreement is the designer's to settle in the page, in this ticket.

**Definition of done:** Every change · A documentation change.

---

### P13-S81-T03 — Split the loot roll files before they grow

| Field | Value |
| --- | --- |
| Layer | domain, tests |
| Size | 0.5 |
| Depends on | T01 |
| Owner | The game engineer |
| Status | planned |

**Build:** `src/domain/loot/affix-roll.ts`, 347 lines on 2026-09-28, and `src/domain/loot/item-roll.ts`, 319, split along the seams T01's note names, before the roll at depth grows them ([R40](../02-risks-and-hidden-work.md)). The expected shape: the choice of a base apart from making the item, where the quality level's window at depth goes; the choice of a tier apart from the draw of a stat, where the affix level's rule goes. Line counts are read again at the phase's start, since phase 12's items to level 30 touch both. No behaviour changes; each split goes through the layer's doors, and nothing new is exported that no one imports.

**Acceptance:**
- Every stored log replays to its recorded checksums at every stored tick with no re-stamp and no re-record ([R36](../02-risks-and-hidden-work.md)).
- The two files and their new neighbours are each under 300 lines, leaving room for the phase.
- It plays: the long road and the phase 12 playtest logs replay green.
- The bar: the allocation specs green; the loot roll allocates nothing.

**Tests:** no new spec; `tests/domain/loot/roll.spec.ts`, `tests/domain/loot/rarity.spec.ts`, `tests/domain/items/affixes.spec.ts`, `tests/simulation/replay-determinism.spec.ts`, and `tests/architecture.spec.ts` green.

**Pages:** [where to look](../../../../docs/architecture/where-to-look.md), if a pointer names a moved file.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P13-S81-T04 — The 40% cap on cooldown reduction from items

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 0.5 |
| Depends on | none |
| Owner | The game engineer |
| Status | planned |

**Build:** a flat tunable, `item_cooldown_reduction_cap`, at 0.4, in `src/content/tuning.ts`. `snapshotCooldownSources` in `src/domain/abilities/cooldowns.ts`, where the worn items' percentage sum is read as one factor, reads that sum at most the cap: the factor is one less the smaller of the two. The modifier rows beside it, Whorl's and any status's, are not capped and multiply as before. The cap reaches the snapshot as a number handed in, so the function reads no world. The content version moves: `pnpm restamp` re-stamps the stored logs, and no checksum moves, since no stored log's hero wears 40%.

**Acceptance:**
- Items summing 55% shorten a clock by 40%; items summing 30% by 30%; Whorl's reduction and the items' capped factor multiply.
- The cap is a slider in the panel, lands in the log, and a slid cap is read at the next clock's start, never by one already running.
- Every stored log re-stamped, with no checksum moved.
- It plays: in a simulation spec, the hero in fixture items over the cap casts, and its clock is the capped one.
- The bar: one comparison per clock start; nothing allocates.

**Tests:**
- `tests/domain/abilities/cooldowns.spec.ts`: the items' sum below, at, and above the cap, with a row beside it.
- `tests/simulation/items/armory-stats.spec.ts`: worn fixture items over the cap, read at a cast.
- `tests/domain/definitions/tuning-keys.spec.ts`: the new tunable's key.

**Pages:** [hero](../../../../docs/product/features/hero.md#derived-values) and the [item catalogue's section 3.3](../../../../docs/product/specs/item-catalogue.md#33-how-a-stat-reads), the cap and what it does not cap; [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the cooldown formula and its quick reference.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The research note, four mechanisms each with a proposal | |
| The design note: bases and tiers to 100, the index's band | |
| The two roll files split, every stored log unchanged | |
| The cap, by its spec; every log re-stamped, no checksum moved | |
| Phase 12's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The research widens the catalogue.** Diablo II's scale is about a thousand items; this catalogue is sized for the tables the design note writes. A proposal to go wider is the designer's, sized by the architect in sprint 82, and past this phase's content tickets it goes to Deferred.
- **The design runs behind** ([R43](../02-risks-and-hidden-work.md)). The cap and the split do not wait on the design note; sprint 83's content does.
- **A move to an existing number.** A base or affix the long road or strata 1 to 3 roll that the design moves re-records a log; it is named in the note and placed in a ticket, never folded silently into a content ticket.
