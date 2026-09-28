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
| Status | done |

> **Note, 2026-09-27, later:** the flag for an item the hero dropped and has not stepped off is gone: items are picked up by a right click, not by walking over them (Q87).

> **Note, 2026-09-27, from P7-S48-T04:** a ground item holds an item instance inline, the value [ADR 0011](../../../../docs/adr/0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) defines, copied in on a drop and out on a pickup; the ground item alone has a generational id.

> **Note, 2026-09-28, from P8-S31-T02:** [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md) and [ADR 0013](../../../../docs/adr/0013-loot-on-the-ground-is-a-pooled-entity-that-stays-until-the-map-is-made-again.md) set the capacity at 512, refuse a drop past it with nothing evicted, keep one ground item to a walkability cell in a map-scope byte per cell, keep ground items out of the spatial hash, and give them no timer. The size stays 1.5.

> **Note, 2026-09-28, at close:** the item held inline needs the item value, so `src/domain/items/item.ts` (create, clear, copy, over the existing `ITEM_LINE_CAPACITY`) is made here rather than in P8-S33-T01, which extends it. A pool refusal counts in both the pool's misses and map scope's `dropsNotMade`; P8-S32-T02's no-free-cell refusal adds to `dropsNotMade` alone. The ground-item pool also joins the driver's **Pool misses** sum, and a tuned cell size that derives the grid anew marks the cell bytes again, both unforeseen and folded in as a few lines each. The three map-scope fields are left out of the state checksum with a reason until P8-S32-T02 makes the first drop, so no stored log moves.

**Build:** the ground item as an entity kind in `src/domain/entities/ground-item.ts`, with its own `GroundItemId` brand: what it is (gold, a health globe, a mana globe, or an item), its point, a pile's amount, the item instance inline, made with the slot and cleared in place, and the tick it fell; no previous position. A pool of 512, `GROUND_ITEM_CAPACITY`, in map scope, released whole by `resetMapScope` for a map load and a reset alike, with generational ids. Map scope also holds one byte per walkability cell saying whether a ground item lies there, made with the grid on a map load, and a count of drops not made. Past capacity the pool returns `null`, the drop is not made, nothing on the ground is evicted, and the miss is counted. Ground items are not added to the spatial hash; every reader walks the pool by index. The panel's readouts gain **Ground items** live over capacity. The [world model](../../../../docs/architecture/world-model.md), [entities and pools](../../../../docs/architecture/entities-and-pools.md), and where-to-look pages state the kind.

**Acceptance:**
- A ground item is taken and released without allocating after warm-up; a stale id resolves to nothing.
- Past capacity, the acquire returns `null`, no live ground item is released, and the miss is counted.
- Loading or resetting a map releases every ground item, clears every cell's byte, and leaves run scope as it was.

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
| Status | done |

> **Note, 2026-09-27:** Legendary equipment drops only from its named boss, and active items are in no loot table (Q84); six logs, not seven. The size stays 1.5: the boss's table is one more table on the same roll.

> **Note, 2026-09-27, phase 7 inserted:** the acceptance "the xorshift stream reads the same with loot on and emptied" was vacuous, since nothing in `src/` draws from that stream (`nextFloat` and `nextInt` have no caller). It is replaced by phase 7's full-state comparison (P7-S45-T02), extended here to the ground-item pool. The keyed draw's draw index and the loot purposes arrive from P7-S48-T05, and the re-stamp goes through `pnpm restamp` (P7-S45-T01). The size stays 1.5.

> **Note, 2026-09-28, from P8-S31-T02:** [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md) places the roll in `src/domain/loot/` as a pure read writing an out record, keyed on the dying unit's id with the purposes and indices of its section 3.1, three purposes appended; the Legendary is named by the boss pack's `legendaryId` and its chance is the boss table's; drops are made best first on one cell each; and the event record gains `groundItemId` and `place`. Placing is on cells open to the hero's radius class within `drop_placement_radius`. The size stays 1.5.

**Build:** the loot roll in `src/domain/loot/`: `rollDrop` in `roll.ts`, a pure read over the world that writes what a death drops into an out record its caller owns and allocates nothing, exported through `domain/queries.ts` for the panel's preview (P8-S36-T04) and through `domain/rules.ts`; one item's base, rarity, and implicit value in `item-roll.ts`, which the store and the grant reuse. It draws on the keyed draw with its draw index (P7-S48-T05), keyed on the dying unit's generational id, under the purposes and indices of the brief's section 3.1: `lootGold`, `lootGoldAmount` (new), `lootGlobe` by globe entry, `lootDropCount` by item roll, reworded to "whether item roll `r` drops", `lootRarity` and `lootBase` by item roll, `lootAffixValue` at line 0 for the implicit, and `lootLegendary` (new); `lootAffixTier` (new) is appended for P8-S35-T01. The death system's reward step, beside the experience grant, rolls the dying enemy's tier table and calls `placeDrops` in `place-drop.ts`: gold, a health globe and a mana globe each by its chance, and an item of a rarity by its weight over the sum of the weights, its base drawn evenly among those the item level reaches. A chance is read clamped, since loot tables are tunable ([ADR 0014](../../../../docs/adr/0014-of-item-content-the-tuning-surface-reaches-only-the-loot-tables.md)). An elite always drops an item; a boss always drops one Rare or better; an enemy with an owner, an add, rolls nothing. A boss whose map-scope pack record's definition names a `legendaryId` also rolls that piece at the boss table's chance; a pack the panel spawns has no record and drops none; no table holds an active item. Drops are made best first, a Legendary, items by rarity from the highest, gold, then globes, each on its own free walkability cell open to the hero's radius class, found ring by ring from the body within `drop_placement_radius`; a drop with no free cell or no pool slot is not made and is counted. Each announces an `item_dropped` event naming the ground item in the event record's new `groundItemId` field; the record's other new field, `place`, is P8-S33-T01's. Rarity is rolled but affixes are not yet: every item is its base until P8-S35-T01. The content version moves and the six logs are re-stamped by `pnpm restamp`; no stored log picks anything up yet, so no fight moves and no checksum but the ground items' changes. The full-state comparison's field lists gain the ground-item pool, and the inventory and gold when P8-S33-T01 adds them.

**Acceptance:**
- The same key rolls the same drops; two replays of the boss encounter log agree at every tick, drops included.
- Over the boss encounter log with every loot table on and with every table emptied, the full-state comparison finds every pool, run-scope field, and map-scope field equal at every tick but the ground items: a drop never moves a combat outcome.
- Over 10 000 rolls per tier, each outcome lands within a stated tolerance of its weight; every elite roll holds an item and every boss roll one Rare or better; an imp drops nothing.
- Every drop lands on a walkable cell within the search radius of its body, or is refused and counted if none is free; no two ground items share a cell.
- With the pool three slots short of full, a boss's death makes its Legendary and its two items and refuses the rest, counted.
- Over 10 000 rolls, a named boss drops its Legendary at its rate, and every other enemy never does, a boss the panel spawns included.
- The panel's preview path, `rollDrop` over a read-only world, writes nothing to the world.
- The six stored logs replay on the new content version.

**Tests:**
- `tests/domain/loot/roll.spec.ts`: weights over 10 000 rolls, the elite and boss guarantees, the add, the same key giving the same roll.
- `tests/simulation/loot/drop-on-death.spec.ts`: drops placed on walkable cells, the same on two replays, and the full-state comparison equal but for ground items with the tables on and emptied. From P8-S33-T02 on, the spec holds the walk-over take off in its test world, since a globe taken moves a fight by design.
- `tests/simulation/replay-determinism.spec.ts`: green unchanged.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new command, event, or system · A documentation change.

> **Note, 2026-09-28, from P8-S32-T01:** `groundItems`, `groundItemCells`, and `dropsNotMade` stand in `src/simulation/replay/state-fields.ts` as left out, "always empty: nothing drops yet"; this ticket lists them there, the pool by its fields and the item inline, and `acquireGroundItem` in `src/domain/entities/ground-item.ts` is the acquire `placeDrops` calls. A drop with no free cell adds to `world.map.dropsNotMade`.

> **Note, 2026-09-28, at close:** built as written, with six things the ticket did not foresee, each a few lines and folded in. First, `rollDrop` takes the pack's Legendary id as a fifth argument, since the panel's preview has no pack to read it from; it reaches past the simulation through `domain/queries.ts` alone, because the door test refuses one name in two doors, and `placeDrops` and `dropOnDeath` go through `domain/rules.ts`. Second, run scope gains the world's copies of the item bases, the rarity table, and the Legendary pieces, which the roll reads, left out of the checksum as built from the registry. Third, a loot table is refused with more than eight item rolls, `LOOT_ITEM_ROLL_LIMIT`, the room the drop's out record makes. Fourth, the elite and boss guarantees are held in the roll against any tuning, and the ring order and the gold rounding are chosen; the three are [Q106](../backlog/open-questions.md), decided provisionally. Fifth, the content version did not move, since no content changed: the six logs keep their stamps and `pnpm restamp --checksums` re-recorded their checksums, which moved only because the ground items and the cell bytes are now hashed. The full-state comparison with the tables on and emptied is in the drop spec, over `stateDifference` with the ground items and the loot tunables taken from one side. Sixth, since the definition of done removes an event nobody reads and the ground-item views walk the pool, the panel's readouts drain `item_dropped` into a **Last drop** readout (`tests/devtools/panel.spec.ts`, the [developer panel](../../../../docs/product/features/developer-panel.md) page). The cell bytes are hashed as a sparse byte list, each set cell's index, so the checksum stays cheap over a map's thousands of cells.

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

> **Note, 2026-09-28, from P8-S31-T03:** the two fixture bases are drawn with `square` and `disc` until this ticket; it points the cap at `item_helm` and the band at `item_ring` once the frames exist. A base's `atlasFrame` is a presentation field, so the move re-stamps nothing ([Q105](../backlog/open-questions.md)).

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
| Ground items pooled in map scope, released by a map load | Yes: a pool of 512 in map scope with its own `GroundItemId`, the byte per cell, and `dropsNotMade`; a map load and a reset release every ground item and free every cell (`tests/domain/entities/ground-item-pool.spec.ts`, `tests/simulation/world.spec.ts`). The panel's **Ground items** readout shows live over capacity and the drops not made |
| Drops the same on two replays, the world but its ground items unmoved | Yes: two replays of the boss encounter log agree at every tick, drops included, and with every loot table on and every table emptied the full-state comparison finds everything but the ground items and the loot tunables equal at every tick (`tests/simulation/loot/drop-on-death.spec.ts`); the roll's weights, guarantees, and Legendary rate over 10 000 rolls a tier in `tests/domain/loot/roll.spec.ts`. The six logs' checksums re-recorded, their stamps unchanged |
| Item level from the map level; the quality-level filter | |
| The font writes an item's name | |
| The render benchmark after the atlas grew | |
| Actual days per ticket | T01: 0.5 (sized 1.5); T02: 0.75 (sized 1.5) |
| Sprint total | |

## Risks in this sprint

- T02 re-stamps the six logs with `pnpm restamp`; run T03 after it, on top rather than in parallel. T04 no longer re-stamps (P7-S45-T01).
- The loot draw's local sequence is a new use of ADR 0010. If the architect's brief supersedes that record, T02 builds on the new one and the determinism tests name it. The brief of 2026-09-28 does not: it keeps ADR 0010 as written and appends purposes to the list.
- The ground-item pool's capacity is a guess until the balance. P8-S38-T01's stress case fills it; a capacity that proves wrong is a one-line change and a `pnpm restamp`.
