# Sprint 32 — Drops on the ground

**Phase:** 7 · **Sized days:** 4 · **Buffer:** 1

## Goal

A dying enemy rolls its tier's loot table on a draw of its own and leaves gold, globes, and items on walkable ground as a new entity kind, the same on every replay, without moving a single combat number. Every item carries an item level, the level of the map it dropped on. The atlas font can write an item's name.

## Playable outcome

Spawn a grunt pack from the panel and kill it: the panel's readouts show **Ground items** rise, and the same seed and log drop the same things in the same places. The drops are drawn from sprint 33; this sprint's evidence is headless.

---

## Tickets

### P7-S32-T01 — A ground item: a new entity kind and its pool

| Field | Value |
| --- | --- |
| Layer | domain, simulation, devtools, tests, docs |
| Size | 1.5 |
| Depends on | P7-S31-T02, P7-S31-T03 |
| Status | planned |

> **Note, 2026-09-27, later:** the flag for an item the hero dropped and has not stepped off is gone: items are picked up by a right click, not by walking over them (Q87).

**Build:** the ground item as an entity kind where P7-S31-T02 placed it: gold with an amount, a health or mana globe, or an item instance; its position. A pool of the capacity the brief set, in map scope, released whole when a map is loaded, with generational ids and the rule the brief chose for a drop past capacity, counted as a pool miss if it refuses. The panel's readouts gain **Ground items** live over capacity. The [world model](../../../../docs/architecture/world-model.md), [entities and pools](../../../../docs/architecture/entities-and-pools.md), and where-to-look pages state the kind.

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

### P7-S32-T02 — Loot tables on a draw of their own, and a drop on death

| Field | Value |
| --- | --- |
| Layer | domain, simulation, content, tests, docs |
| Size | 1.5 |
| Depends on | T01, P7-S39-T01 |
| Status | planned |

> **Note, 2026-09-27:** Legendary equipment drops only from its named boss, and active items are in no loot table (Q84); six logs, not seven. The size stays 1.5: the boss's table is one more table on the same roll.

**Build:** the loot roll where P7-S31-T02 placed it, on the keyed draw it chose. The death system's reward step, beside the experience grant, rolls the dying enemy's tier table: gold, a health globe and a mana globe each by its chance, and an item of a rarity by its weight, from the bases the table names. An elite always drops an item; a boss always drops one Rare or better; an add drops nothing. The three bosses P7-S39-T01's spec names also roll their Legendary at its low rate, by whichever link from boss pack to table the architect's brief chose, a pack field or a table keyed by map and pack; no other enemy drops a Legendary, and no table holds an active item. Drops are placed on walkable cells near the body by a bounded search, as a pack's placement is, and each announces an `item_dropped` event. Rarity is rolled but affixes are not yet: every item is its base until P7-S35-T01. The content version moves and the six logs are re-stamped; no stored log picks anything up yet, so no fight moves.

**Acceptance:**
- The same key rolls the same drops; two replays of the boss encounter log agree at every tick, drops included.
- The simulation's xorshift stream reads the same at every tick of the boss encounter log with every loot table on and with every table emptied: a drop never moves a combat outcome.
- Over 10 000 rolls per tier, each outcome lands within a stated tolerance of its weight; every elite roll holds an item and every boss roll one Rare or better; an imp drops nothing.
- Every drop lands on a walkable cell within the search radius of its body, or is refused and counted if none is free.
- Over 10 000 rolls, a named boss drops its Legendary at its rate, and every other enemy never does.
- The six stored logs replay on the new content version.

**Tests:**
- `tests/domain/loot/roll.spec.ts`: weights over 10 000 rolls, the elite and boss guarantees, the add, the same key giving the same roll.
- `tests/simulation/loot/drop-on-death.spec.ts`: drops placed on walkable cells, the same on two replays, the combat stream unmoved with the tables on and emptied.
- `tests/simulation/replay-determinism.spec.ts`: green unchanged.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

### P7-S32-T03 — Item level from the map level, quality levels, and level requirements

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 0.5 |
| Depends on | T02, P7-S39-T02 |
| Status | planned |

> **Note, 2026-09-26:** split out of the loot ticket, which the brief the maintainer saw sized at 1.5 with it.

> **Note, 2026-09-27:** rewritten for Q89's recommendation, then again the same day for its answer, Diablo I's structure: item level is the map's level, with no region and no tier offset. Titles were "Item level from the pack, and level requirements" and "Item level from the area level, quality levels, and level requirements".

**Build:** a drop's **item level** is the current map's level (P7-S39-T02), whichever enemy dropped it, a panel-spawned one included; an elite or a boss drops more and at better rarity through its table, never at a higher item level. The roll draws a base only if the item level reaches the base's **quality level**. The **level requirement** is the highest of the base's requirement and its affixes' requirements; affixes arrive with P7-S35-T01, which applies their **affix level** the same way. The equip command reads the requirement in P7-S33-T01. Enemies have no level for their stats (Q55). The content version does not move unless the catalogue's fixture bases change.

**Acceptance:**
- A normal, an elite, and a boss dying on a map of level 3 each drop at item level 3; after `set_map_level` to 7, at 7.
- A base whose quality level is above the item level never drops, over 10 000 rolls.
- A base's level requirement is the item's; with affixes, the highest of them.

**Tests:**
- `tests/domain/loot/roll.spec.ts`: the item level from the map level, the quality-level filter, the requirement rule.
- `tests/simulation/loot/drop-on-death.spec.ts`: drops after `set_map_level` take the new level.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P7-S32-T04 — The atlas font gains a space and the item glyphs, and item icons

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 0.5 |
| Depends on | P7-S31-T01 |
| Status | planned |

**Build:** `GLYPH_CHARACTERS` in `src/content/atlas-frames.ts` gains the space, `+`, and whatever else the catalogue's names and affix lines need; the space is an advance with no quad. Item icons are flat atlas shapes until art ([ADR 0001](../../../../docs/adr/0001-phaser-renderer-and-quad-atlas.md)): one frame per armory slot's silhouette, one for gold, one for a globe, each white and tinted at bind. Q64's CHECKPOINT word is not changed by this ticket; two words become possible and are Q64's to decide. The [presentation](../../../../docs/architecture/presentation.md) page's atlas line names the new frames.

**Acceptance:**
- Every character of every base's name, every rarity's name, and every affix line the catalogue can write is in the font.
- A label with a space draws one quad fewer than its characters.
- The atlas still bakes into one texture with `maxTextures: 1`.
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
| Drops the same on two replays, the combat stream unmoved | |
| Item level from the map level; the quality-level filter | |
| The font writes an item's name | |
| The render benchmark after the atlas grew | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- T02 re-stamps the six logs; run T03 after it, on top rather than in parallel.
- The loot draw's local sequence is a new use of ADR 0010. If the architect's brief supersedes that record, T02 builds on the new one and the determinism tests name it.
- The ground-item pool's capacity is a guess until the balance. P7-S38-T01's stress case fills it; a capacity that proves wrong is a one-line change and a re-stamp.
