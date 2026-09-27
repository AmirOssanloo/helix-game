# Sprint 32 — Drops on the ground

**Phase:** 8 · **Sized days:** 4 · **Buffer:** 1

## Goal

A dying enemy rolls its tier's loot table on a draw of its own and leaves gold, globes, and items on walkable ground as a new entity kind, the same on every replay, without moving a single combat number. Every item carries an item level, the level of the map it dropped on. The atlas font can write an item's name.

## Playable outcome

Spawn a grunt pack from the panel and kill it: the panel's readouts show **Ground items** rise, and the same seed and log drop the same things in the same places. The drops are drawn from sprint 33; this sprint's evidence is headless.

---

## Tickets

### P8-S32-T01 — A ground item: a new entity kind and its pool

| Field | Value |
| --- | --- |
| Layer | domain, simulation, devtools, tests, docs |
| Size | 1.5 |
| Depends on | P8-S31-T02, P8-S31-T03 |
| Status | planned |

> **Note, 2026-09-27, later:** the flag for an item the hero dropped and has not stepped off is gone: items are picked up by a right click, not by walking over them (Q87).

**Build:** the ground item as an entity kind where P8-S31-T02 placed it: gold with an amount, a health or mana globe, or an item instance; its position. A pool of the capacity the brief set, in map scope, released whole when a map is loaded, with generational ids and the rule the brief chose for a drop past capacity, counted as a pool miss if it refuses. The panel's readouts gain **Ground items** live over capacity. The [world model](../../../../docs/architecture/world-model.md), [entities and pools](../../../../docs/architecture/entities-and-pools.md), and where-to-look pages state the kind.

**Acceptance:**
- A ground item is taken and released without allocating after warm-up; a stale id resolves to nothing.
- Past capacity, the brief's rule holds and the miss is counted.
- Loading a map releases every ground item and leaves run scope as it was.

**Tests:**
- `tests/domain/entities/ground-item-pool.spec.ts`: take, release, capacity, the rule past it, a stale id.
- `tests/simulation/world.spec.ts`: a map load releases every ground item.
- `tests/devtools/panel.spec.ts`: the readout.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A developer-panel control · A documentation change.

---

### P8-S32-T02 — Loot tables on a draw of their own, and a drop on death

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1.5 |
| Depends on | T01, P8-S39-T01 |
| Status | planned |

> **Note, 2026-09-27:** Legendary equipment drops only from its named boss, and active items are in no loot table (Q84); six logs, not seven. The size stays 1.5: the boss's table is one more table on the same roll.

> **Note, 2026-09-27, phase 7 inserted:** the acceptance "the xorshift stream reads the same with loot on and emptied" was vacuous, since nothing in `src/` draws from that stream (`nextFloat` and `nextInt` have no caller). It is replaced by phase 7's full-state comparison (P7-S45-T02), extended here to the ground-item pool. The keyed draw's draw index and the loot purposes arrive from P7-S48-T05, and the re-stamp goes through `pnpm restamp` (P7-S45-T01). The size stays 1.5.

**Build:** the loot roll where P8-S31-T02 placed it, on the keyed draw with its draw index (P7-S48-T05), one index per number a drop rolls. The death system's reward step, beside the experience grant, rolls the dying enemy's tier table: gold, a health globe and a mana globe each by its chance, and an item of a rarity by its weight, from the bases the table names. An elite always drops an item; a boss always drops one Rare or better; an add drops nothing. The three bosses P8-S39-T01's spec names also roll their Legendary at its low rate, by whichever link from boss pack to table the architect's brief chose, a pack field or a table keyed by map and pack; no other enemy drops a Legendary, and no table holds an active item. Drops are placed on walkable cells near the body by a bounded search, as a pack's placement is, and each announces an `item_dropped` event. Rarity is rolled but affixes are not yet: every item is its base until P8-S35-T01. The content version moves and the six logs are re-stamped by `pnpm restamp`; no stored log picks anything up yet, so no fight moves and no checksum but the ground items' changes. The full-state comparison's field lists gain the ground-item pool, and the inventory and gold when P8-S33-T01 adds them.

**Acceptance:**
- The same key rolls the same drops; two replays of the boss encounter log agree at every tick, drops included.
- Over the boss encounter log with every loot table on and with every table emptied, the full-state comparison finds every pool, run-scope field, and map-scope field equal at every tick but the ground items: a drop never moves a combat outcome.
- Over 10 000 rolls per tier, each outcome lands within a stated tolerance of its weight; every elite roll holds an item and every boss roll one Rare or better; an imp drops nothing.
- Every drop lands on a walkable cell within the search radius of its body, or is refused and counted if none is free.
- Over 10 000 rolls, a named boss drops its Legendary at its rate, and every other enemy never does.
- The six stored logs replay on the new content version.

**Tests:**
- `tests/domain/loot/roll.spec.ts`: weights over 10 000 rolls, the elite and boss guarantees, the add, the same key giving the same roll.
- `tests/simulation/loot/drop-on-death.spec.ts`: drops placed on walkable cells, the same on two replays, and the full-state comparison equal but for ground items with the tables on and emptied. From P8-S33-T02 on, the spec holds the walk-over take off in its test world, since a globe taken moves a fight by design.
- `tests/simulation/replay-determinism.spec.ts`: green unchanged.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

### P8-S32-T03 — Item level from the map level, quality levels, and level requirements

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 0.5 |
| Depends on | T02, P8-S39-T02 |
| Status | planned |

> **Note, 2026-09-26:** split out of the loot ticket, which the brief the maintainer saw sized at 1.5 with it.

> **Note, 2026-09-27:** rewritten for Q89's recommendation, then again the same day for its answer, Diablo I's structure: item level is the map's level, with no region and no tier offset. Titles were "Item level from the pack, and level requirements" and "Item level from the area level, quality levels, and level requirements".

**Build:** a drop's **item level** is the current map's level (P8-S39-T02), whichever enemy dropped it, a panel-spawned one included; an elite or a boss drops more and at better rarity through its table, never at a higher item level. The roll draws a base only if the item level reaches the base's **quality level**. The **level requirement** is the highest of the base's requirement and its affixes' requirements; affixes arrive with P8-S35-T01, which applies their **affix level** the same way. The equip command reads the requirement in P8-S33-T01. Enemies have no level for their stats (Q55). The content version does not move unless the catalogue's fixture bases change.

**Acceptance:**
- A normal, an elite, and a boss dying on a map of level 3 each drop at item level 3; after `set_map_level` to 7, at 7.
- A base whose quality level is above the item level never drops, over 10 000 rolls.
- A base's level requirement is the item's; with affixes, the highest of them.

**Tests:**
- `tests/domain/loot/roll.spec.ts`: the item level from the map level, the quality-level filter, the requirement rule.
- `tests/simulation/loot/drop-on-death.spec.ts`: drops after `set_map_level` take the new level.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P8-S32-T04 — The atlas font gains a space and the item glyphs, and item icons

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 0.5 |
| Depends on | P8-S31-T01 |
| Status | planned |

> **Note, 2026-09-27, phase 7 inserted:** since P7-S45-T01 narrows the content-version stamp to simulation data, adding glyphs, frames, and icons to the atlas no longer re-stamps the stored logs; this ticket re-stamps nothing.

**Build:** `GLYPH_CHARACTERS` in `src/content/atlas-frames.ts` gains the space, `+`, and whatever else the catalogue's names and affix lines need; the space is an advance with no quad. Item icons are flat atlas shapes until art ([ADR 0001](../../../../docs/adr/0001-phaser-renderer-and-quad-atlas.md)): one frame per armory slot's silhouette, one for gold, one for a globe, each white and tinted at bind. Q64's CHECKPOINT word is not changed by this ticket; two words become possible and are Q64's to decide. The [presentation](../../../../docs/architecture/presentation.md) page's atlas line names the new frames.

**Acceptance:**
- Every character of every base's name, every rarity's name, and every affix line the catalogue can write is in the font.
- A label with a space draws one quad fewer than its characters.
- The atlas still bakes into one texture with `maxTextures: 1`.
- The stored logs' stamps and checksums are unchanged.
- The render benchmark in Chrome on this commit, run by an agent through browser automation, its figures in the sprint exit (standing instruction of 2026-09-27; edited that day from a box under Waiting on a person).

**Tests:**
- `tests/presentation/shape-atlas.spec.ts`: the new glyphs and frames present; the space draws no quad.
- `tests/content/catalogues.spec.ts`: every string the catalogue can put on screen is drawable with the font.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Ground items pooled in map scope, released by a map load | |
| Drops the same on two replays, the world but its ground items unmoved | |
| Item level from the map level; the quality-level filter | |
| The font writes an item's name | |
| The render benchmark after the atlas grew | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- T02 re-stamps the six logs with `pnpm restamp`; run T03 after it, on top rather than in parallel. T04 no longer re-stamps (P7-S45-T01).
- The loot draw's local sequence is a new use of ADR 0010. If the architect's brief supersedes that record, T02 builds on the new one and the determinism tests name it.
- The ground-item pool's capacity is a guess until the balance. P8-S38-T01's stress case fills it; a capacity that proves wrong is a one-line change and a `pnpm restamp`.
