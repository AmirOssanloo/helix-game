# Sprint 82 — The pieces, the line count, and treasure classes

**Phase:** 13 · **Sized days:** 3.5 · **Buffer:** 1, and 0.5 unallocated
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 12 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 12's bucket runs first.** If the maintainer's phase 12 run is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket and take the unallocated half day first; past it, this sprint's last planned ticket moves to the top of the next sprint ([R41](../02-risks-and-hidden-work.md)).

## Goal

Every number the phase's content needs is designed, and the structure it lands in is decided before any constant moves: the seven Legendary pieces, the rarity weights at depth, and the economy are in the design note; the item value's line count is measured; treasure classes are placed or refused, and built if placed.

## Playable outcome

The long road drops as it did. If treasure classes are built, its drops are read through them, the panel's loot preview at item level 3 counts the same drops as before over 10 000 rolls, and every stored log replays unchanged but its stamp. If they are not, nothing in the build moves.

---

## Tickets

### P13-S82-T01 — The game designer: the pieces, the weights at depth, and the economy

| Field | Value |
| --- | --- |
| Layer | docs, under `.claude/plan/` |
| Size | 1 |
| Depends on | P13-S81-T01, P13-S81-T02 |
| Owner | The game designer |
| Status | planned |

**Build:** the rest of the design note P13-S81-T02 began:
- **A Legendary piece for each of the seven stratum bosses from the Cisterns down:** the Drowned Hook, the Brood Queen, the Kindled King, the Glass Twins, the Choirmaster, the Binder Below, and the Unwound. Each with its base, requirement, fixed lines, and value, and the boss that drops it, at the catalogue's named-boss rate. Its requirement is a level below the hero's expected level at its boss, from the descent's section 8.1. Phases 14 and 15 design the bosses' kits and build the bosses; each wires its piece's drop then.
- **The upper rarities' weights against about three hundred items a stratum,** rather than the long road's thirty: whether the Imperial and Mythical weights rise with depth or only the affixes do (the design outline's open question), as a table by item level.
- **Base values rising with quality level,** so gold, which is `L` times a tier's range, keeps buying something.
- **The store's tables by stratum,** Epic from the fourth, and **what the town store's stock level reads at depth.** Today it is the hero's level, which stops at 30, so the store can never stock a base of quality level above 30. The proposal is the map level of the deepest waypoint reached; the answer is the designer's.
- **The economy at depth,** as the catalogue's section 10 does for the road: a stratum's expected gold against what its store stocks, at strata 1, 4, 7, and 10.

A piece's name is written in the atlas font's set, without apostrophes.

**Acceptance:**
- Seven pieces, each with a boss, a requirement, lines no more than an item holds today or a line count P13-S82-T02 is asked to raise, and a value.
- The rarity weights by item level, the store's tables by stratum, and the stock level's answer are tables P13-S83-T01 and P13-S83-T03 can write as content.
- The arithmetic at depth shows gold buying at least one Rare or better at the store of each sampled stratum.
- It plays: nothing changes in the build.
- The bar: not applicable, no code changes.

**Tests:** none.

**Pages:** none under `docs/` until the content tickets.

**Definition of done:** Every change · A documentation change.

> **Note, 2026-09-28:** the sketches of phases 14 and 15 give each of their design tickets a boss's "kit and piece". This ticket designs the pieces; those tickets design the kits and check the piece against the fight, editing it in place if the fight asks.

---

### P13-S82-T02 — The engineering architect: the line count, treasure classes, and the placement

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | T01, P13-S81-T02 |
| Owner | The engineering architect |
| Status | planned |

**Build:** section 4's phase 13 of [the architecture outline](../../2026-09-28-architecture-outline-next-phases.md), read against the design note:
- **The line count, measured before any constant moves.** The most lines any designed item carries, an implicit and a Mythical's five, a piece's fixed lines, and a new stat if one enters, against `ITEM_LINE_CAPACITY` in `src/domain/definitions/item-base-def.ts`, 6 on 2026-09-28. If it must rise, the heap readout on the long road's densest choke with the ground-item pool full and two map scopes, before and after on a working branch, and the records it grows: every inventory, armory, bank, stash, store, and ground-item record. The checksum walks live lines only, and a save holds live lines only ([ADR 0011](../../../../docs/adr/0011-an-item-is-a-value-the-hero-holds-in-run-scope.md)), so no log moves and no migration is written; this ticket confirms both against phase 11's save module. The ticket that first needs the constant raised raises it.
- **Treasure classes,** if the research and the design ask for them: placed as a loot-table kind, tunable under [ADR 0014](../../../../docs/adr/0014-of-item-content-the-tuning-surface-reaches-only-the-loot-tables.md), with the chain's bound, its working memory on the world's scratch, and the defensive reads that ADR requires. A record is written only if the placement amends ADR 0014's kinds; otherwise it is an edit to [content and registries](../../../../docs/architecture/content-and-registries.md).
- **The store's tables by stratum** as loot-table ids, and the stock level's read.
- **The roll at depth:** where the quality level's window and the affix level's rule sit in the split files, and whether they keep the roll at item levels 1 to 30 drawing as it does, so no stored log moves. A design move to a number those levels roll is placed in a named ticket that re-records and traces ([R36](../02-risks-and-hidden-work.md)).
- **The placement [R17](../02-risks-and-hidden-work.md) asks for:** the pages each later phase 13 ticket edits, in a note under that ticket, and each seam beside the ticket that first consumes it ([R37](../02-risks-and-hidden-work.md)). A size that moves is a note on its ticket before it starts.

**Acceptance:**
- The line count's answer, with the heap figures if the constant rises, is in the ticket's closing note.
- Treasure classes are placed with their bound and tuning keys, or refused with the reason; if refused, T03 is cut in this ticket's commit.
- Each later phase 13 ticket carries a note from this ticket naming its pages.
- No page gains a phase number, a ticket, or a sprint.
- It plays: nothing changes in the build; `tests/docs-links.spec.ts` is green.
- The bar: the heap readout, if the constant is to rise.

**Tests:** none new; `tests/docs-links.spec.ts` green.

**Pages:** [content and registries](../../../../docs/architecture/content-and-registries.md), the loot-table kind; [entities and pools](../../../../docs/architecture/entities-and-pools.md), the item value's line count if it moves; [where to look](../../../../docs/architecture/where-to-look.md).

**Definition of done:** Every change · A documentation change.

---

### P13-S82-T03 — Treasure classes as a loot-table kind

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | T02 |
| Owner | The game engineer |
| Status | planned; cut by T02 if the architect places none, and its day and a half goes to sprint 85's bucket |

**Build:** treasure classes as T02 places them. A class names, by item level, what a drop's item roll draws from: another class or the roll itself. A drop walks the chain to a bound the kind checks at load, allocating nothing and keeping its working memory on the world's scratch. The kind is tunable under `def:loot:`, and its reads are defensive as ADR 0014 requires: a chance clamped, a weight below zero read as zero, and a table whose allowed weights sum to nothing drops no item. The four tier tables and the store's, as they stand, are expressed as classes whose draws at item levels 1 to 30 are the draws of today, draw for draw. The content version moves: `pnpm restamp` re-stamps the stored logs, and no checksum moves.

**Acceptance:**
- At item levels 1 to 30 the drop roll gives the same drops as before on the same keyed draws; every stored log replays with no re-record.
- A chain at its bound is refused at load, and a chain within it never walks further.
- A class's number slides in the panel, lands in the log, and changes only the next roll.
- It plays: in Chrome by an agent, the long road's first region cleared with the loot preview at the map's level reading as before.
- The bar: the roll allocates nothing, by the allocation spec; the long-road stress case under the budget tier green.

**Tests:**
- `tests/domain/loot/treasure-class.spec.ts`: the chain by item level, the bound, the defensive reads.
- `tests/domain/loot/roll.spec.ts`: over 10 000 rolls per tier at item levels 3 and 30, the drops equal to the tables' before the change.
- `tests/domain/definitions/tuning-keys.spec.ts`: the class's keys under `loot`, and no other item kind's.
- `tests/content/items.spec.ts`: every class reached from a tier's table, and every class reaching a roll.

**Pages:** [content and registries](../../../../docs/architecture/content-and-registries.md), as T02 placed it; the [item catalogue's section 8](../../../../docs/product/specs/item-catalogue.md#8-drops); the [vocabulary](../../../../docs/product/vocabulary.md), **treasure class**.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The seven pieces, the weights at depth, the store's tables, and the stock level, in the design note | |
| The line count's answer, and the heap figures if it rises | |
| Treasure classes: built, every stored log unchanged; or cut, and the bucket at 3.5 | |
| Phase 12's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The item value grows a line,** and every record that holds an item grows with it. It is measured here, before the constant moves, and the ticket that needs the line raises it.
- **Treasure classes moving the long road.** A chain that draws differently at the road's level moves every stored log's ground items. The acceptance is draw for draw; a difference is a bug here, not a re-record.
- **The store's stock level at depth** is a design answer the economy ticket cannot proceed without; if it is late, P13-S83-T03 swaps with P13-S84-T01.
