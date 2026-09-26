# Sprint 32 — Drops on the ground

**Phase:** 7 · **Sized days:** 4 · **Buffer:** 1

## Goal

A dying enemy rolls its tier's loot table on a draw of its own and leaves gold, globes, and items on walkable ground as a new entity kind, the same on every replay, without moving a single combat number. Every item carries the item level of the pack that dropped it. The atlas font can write an item's name.

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

**Build:** the ground item as an entity kind where P7-S31-T02 placed it: gold with an amount, a health or mana globe, or an item instance; its position; whether the hero dropped it and has not yet stepped off it (Q87). A pool of the capacity the brief set, in map scope, released whole when a map is loaded, with generational ids and the rule the brief chose for a drop past capacity, counted as a pool miss if it refuses. The panel's readouts gain **Ground items** live over capacity. The [world model](../../../../docs/architecture/world-model.md), [entities and pools](../../../../docs/architecture/entities-and-pools.md), and where-to-look pages state the kind.

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
| Depends on | T01 |
| Status | planned |

**Build:** the loot roll where P7-S31-T02 placed it, on the keyed draw it chose. The death system's reward step, beside the experience grant, rolls the dying enemy's tier table: gold, a health globe and a mana globe each by its chance, and an item of a rarity by its weight, from the bases the table names. An elite always drops an item; a boss always drops one Rare or better; an add drops nothing. Drops are placed on walkable cells near the body by a bounded search, as a pack's placement is, and each announces an `item_dropped` event. Rarity is rolled but affixes are not yet: every item is its base until P7-S35-T01. The content version moves and the seven logs are re-stamped; no stored log picks anything up yet, so no fight moves.

**Acceptance:**
- The same key rolls the same drops; two replays of the boss encounter log agree at every tick, drops included.
- The simulation's xorshift stream reads the same at every tick of the boss encounter log with every loot table on and with every table emptied: a drop never moves a combat outcome.
- Over 10 000 rolls per tier, each outcome lands within a stated tolerance of its weight; every elite roll holds an item and every boss roll one Rare or better; an imp drops nothing.
- Every drop lands on a walkable cell within the search radius of its body, or is refused and counted if none is free.
- The seven stored logs replay on the new content version.

**Tests:**
- `tests/domain/loot/roll.spec.ts`: weights over 10 000 rolls, the elite and boss guarantees, the add, the same key giving the same roll.
- `tests/simulation/loot/drop-on-death.spec.ts`: drops placed on walkable cells, the same on two replays, the combat stream unmoved with the tables on and emptied.
- `tests/simulation/replay-determinism.spec.ts`: green unchanged.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

---

### P7-S32-T03 — Item level from the pack, and level requirements

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 0.5 |
| Depends on | T02 |
| Status | planned |

> **Note, 2026-09-26:** split out of the loot ticket, which the brief the maintainer saw sized at 1.5 with it. It is a content-format change: the map's packs gain a field, and a required field means every pack of every map is edited.

**Build:** every map pack gains an `itemLevel` field (Q89): the long road's 32 packs by their region, 1 to 5, as the catalogue's table says, and any pack on the arena at 1. A pack spawned from the panel drops at the item level of the hero's furthest checkpoint's region, so no command changes shape and no stored log is refused. A drop carries its item level; the level requirement is the catalogue's rule applied to it, read by the equip command in P7-S33-T01. The [long road spec](../../../../docs/product/specs/the-long-road.md)'s pack table gains the column. The content version moves; the seven logs are re-stamped.

**Acceptance:**
- Every pack of every map names an item level from 1 to 5; the long road's match the spec's regions.
- A drop's item level is its pack's; a panel pack's is the furthest checkpoint's region.
- The level requirement of each item level matches the catalogue.

**Tests:**
- `tests/content/maps.spec.ts`: every pack's item level, and the long road's against the spec.
- `tests/domain/loot/roll.spec.ts`: the item level carried; the requirement rule.

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
- The render benchmark in Chrome on this commit and the one before it, a box under Waiting on a person in STATUS.md.

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
| Item level from the pack on every map | |
| The font writes an item's name | |
| The render benchmark after the atlas grew | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- T02 re-stamps the seven logs; run T03 after it and re-stamp once more on top rather than twice in parallel.
- The loot draw's local sequence is a new use of ADR 0010. If the architect's brief supersedes that record, T02 builds on the new one and the determinism tests name it.
- The ground-item pool's capacity is a guess until the balance. P7-S38-T01's stress case fills it; a capacity that proves wrong is a one-line change and a re-stamp.
