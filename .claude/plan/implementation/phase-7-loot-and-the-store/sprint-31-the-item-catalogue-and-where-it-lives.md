# Sprint 31 — The item catalogue and where it lives

**Phase:** 7 · **Sized days:** 4, and 0.5 unplanned (T04) · **Buffer:** 1

## Goal

Items exist on paper, approved by the maintainer: the ten armory slots, the bases, seven rarities, the affixes, the drop tables, and an economy whose arithmetic covers the clean run's two heals and eight mana restores. The engineering architect has placed every new module in a layer that already exists and decided the first UI screen. The registry takes an item definition and refuses a wrong one.

## Playable outcome

None in the browser: this sprint is paper and a schema. The content tier loads two fixture bases and a loot table, and refuses each malformed one with a message naming the field.

---

## Tickets

### P7-S31-T01 — The item catalogue: the spec

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1.5 |
| Depends on | none; Q73 to Q82 answered, Q83 to Q95 provisional |
| Status | planned |

**Build:** `docs/product/specs/item-catalogue.md`, a product spec shaped like the [spell catalogue](../../../../docs/product/specs/spell-catalogue.md) and the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), with real names and numbers. It holds:

- **The ten armory slots** (Q75): Helm, Amulet, Armour, Main hand, Off-hand, Gloves, Belt, Boots, Ring, Ring, what each may hold, and the word each uses on screen and in code (Q94). One-handed only.
- **About twenty bases.** Per base: its slot, its name, its implicit stat and that stat's range by item level, its icon frame and tint, and its value in gold. Main hand: one-handed staff, wand, sceptre, dagger. Off-hand: tome, focus, buckler. "Orb" is reserved by the vocabulary and names no base.
- **Seven rarities** (Q76): Common, Uncommon, Rare, Epic, Imperial, Mythical, Legendary, in that order; the affix count of each (Q83); the label tint of each, a tint of the one atlas (Q83); its weight in each enemy tier's table; its price multiplier.
- **The affix table.** Per affix: the stat, the slots it may roll on, its range by item level, and the rarities it rolls at. Spell damage % is one. The +1 to Quartz, Whorl, or Ember rolls only at Mythical and is fixed on the Legendaries, capped at the top of the orb level tables (Q92).
- **Legendary** (Q84): fixed identities. Three equipment pieces, each carrying +1 to a different orb. The eight active items are listed by name with a drop weight of zero and no store listing; their effects are phase 8's.
- **Drops.** Per enemy tier: gold by item level, the chance of a health globe and a mana globe and what each restores (Q86), and the item table. An elite always drops an item; a boss always drops one Rare or better; an add drops nothing, as it grants no experience.
- **Item level and requirement** (Q89): the item level of each of the long road's five regions, the level requirement rule, and the item level a panel-spawned pack drops at.
- **The store** (Q90): its stock count and rarities, the item level it stocks at, the buy price rule, and the sell price rule.
- **The economy on the long road.** The expected gold, globes, and items over a full clear of its 32 packs and 54 enemies at the stated rates, and the expected health and mana restored against the clean run's 2 `heal` and 8 `restore_mana` on seed 3742014961. P7-S37-T01 tunes against this table.
- **Words** (Q94). The [vocabulary](../../../../docs/product/vocabulary.md) gains item, base, affix, rarity, item level, level requirement, gold, health globe, mana globe, ground item, label, and store, and says how an armory slot is told from slot D and F. The inventory and armory rows already there are kept.

The behaviour goes in a new feature page, `docs/product/features/items-and-loot.md`: drops, walk-over pickup, labels and Alt, the inventory and armory screen, the store at a checkpoint, edge cases, and what is deferred. The deferred lines on the [hero](../../../../docs/product/features/hero.md), [HUD](../../../../docs/product/features/hud.md), [enemies](../../../../docs/product/features/enemies.md), and [spells and attack](../../../../docs/product/features/spells-and-attack.md) pages that say no item exists are rewritten to link it. The product README and the docs index link both pages. The roadmap's later-documents table already names the catalogue.

**Acceptance:**
- Every base names one slot, an implicit stat with a range, an icon frame, and a value; every affix names its slots, its range by item level, and its rarities.
- The rarity table gives an affix count, a tint, a weight per enemy tier, and a price multiplier for each of the seven.
- The economy table shows the expected health and mana restored on a full clear covering the clean run's panel use with a stated margin, and the expected gold buying at least one Rare from the store before the last region.
- The maintainer approves the catalogue, or names what to change: a box under Waiting on a person in STATUS.md. P7-S35-T03 writes the bases from the page as approved; a later change is made in the page and the file together.

**Tests:** none here. P7-S31-T03 and P7-S35-T03 make `tests/content/catalogues.spec.ts` read the page's tables against the files.

**Definition of done:** Every change · A documentation change.

---

### P7-S31-T02 — Where items, loot, and the store live, and the first screen

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1.5 |
| Depends on | T01 as drafted, not its approval |
| Status | planned |

> **Note, 2026-09-26:** a structural ticket. It is the engineering architect's; the delivery strategist names the questions and does not answer them. The brief the maintainer saw sized it at 1; it is 1.5 because the first UI screen is a structural decision of its own, the one ADR 0003's three-scene rule names as its revisit condition.

**Build:** the engineering architect's structural brief, and whatever decision records it takes, answering each of these. The roadmap's door says later modules land in layers that already exist ([layers](../../../../docs/architecture/layers-and-dependency-rule.md)).

1. **Placement.** The modules for items, affixes, loot tables and the roll, the inventory and gold, the armory as a modifier source, the ground item, pickup, and the store, each in a layer that exists; what is run scope (the inventory, the armory, gold) and what is map scope (ground items, the store's stock); the pickup system's place in the fixed system order.
2. **The item in memory.** What an item instance is, how it moves between the ground, the inventory, the armory, and the store without allocating in steady state, and how it is referred to (a generational id or a slot index) across scopes.
3. **The ground item.** A new entity kind: its world-model rows, its pool capacity, what happens to a drop past capacity, that it lives until the map is reset, and what its view reads.
4. **The loot draw.** Under [ADR 0010](../../../../docs/adr/0010-a-rules-random-draw-is-a-keyed-hash.md): a keyed draw on the dying unit's id and the tick with a purpose of its own, seeding a local sequence for a table that rolls many numbers, as that record's revisit clause foresees; never the xorshift stream the simulation's combat reads. The store's stock drawn the same way on its checkpoint. Whether this amends ADR 0010 or supersedes it.
5. **Commands and events.** `equip_item`, `unequip_item`, `drop_item`, `buy_item`, `sell_item`, `open_store`, `close_store`, and the debug commands `grant_item` and `grant_gold`, each under [ADR 0004](../../../../docs/adr/0004-all-mutation-enters-as-commands.md), with their refusals; the events a drop, a pickup, and each command announce. Pickup is a system on walk-over and not a command, and adds no order kind (Q74).
6. **Stats.** The armory as one modifier source per slot through the stack the P5-S22-T03 door test covers; where spell damage % is applied in the damage pipeline (Q93); where an effective orb level is read, once, for the +1 (Q92).
7. **The first screen.** Phaser, as a container in the HUD scene of atlas quads and `BitmapText`, or DOM, as an adapter beside the developer panel, weighed against [ADR 0001](../../../../docs/adr/0001-phaser-renderer-and-quad-atlas.md)'s one atlas and draw-call budget, [ADR 0003](../../../../docs/adr/0003-layered-single-package-architecture.md)'s three-scene rule, and the panel's DOM precedent. How a click on a screen never reaches the ground, generalising the bottom bar's rule that a click there never reaches the world. How I, Esc, and Alt reach it, which world keys still act while it is open, and how Alt's browser default is suppressed. Whether a screen pauses the world (Q91 proposes not).
8. **Room for phase 8's active items.** Nothing decided here closes the [phase 8](../phase-8-active-items/README.md) door: a bank of six active-item slots beside the armory, in the run-scope model and on the inventory screen, that an active item equips into; and the keys T, X, V, C, G, and Space (Q82), which no phase 7 screen or control takes. The bank is not built here; the brief names where it would go.

**Acceptance:**
- The brief names a module and a layer for every item in the list, and the architecture test's import table needs no new row, or the brief says which and why.
- The world model gains the ground item's rows and the run-scope inventory, armory, and gold rows; entities and pools, commands and events, where to look, and presentation name what the brief decides.
- Each decision record the brief takes is written; it is Proposed until the maintainer reads it, a box under Waiting on a person in STATUS.md, and the tickets after it build on it as written.
- Every ticket from P7-S31-T03 to P7-S36-T04 that the brief changes is edited in place with a one-line note before it starts.

**Tests:** none. From P7-S31-T03 on, the architecture test's import rules hold the placement.

**Definition of done:** Every change · A documentation change.

---

### P7-S31-T03 — The item schema and the registry

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | T01, T02 |
| Status | planned |

**Build:** the definition types the catalogue needs, placed where T02 says: an item base, an affix, the rarity table, and a loot table per enemy tier, each with its validation schema, every field required. `src/content/items/` with an index registered in the content registry, holding two fixture bases, one loot table per enemy tier, and the rarity and affix tables; the real twenty bases are P7-S35-T03's. The tunables the catalogue names (globe percentages, pickup radius) go in `src/content/tuning.ts`. The [content and registries](../../../../docs/architecture/content-and-registries.md) page and the world model's definition kinds state the new kinds. Adding definitions moves the content version, so the seven stored logs are re-stamped: the six, and `long-road-playtest.json`.

**Acceptance:**
- The registry takes a well-formed base and refuses, with a message naming the field: a missing field, an unknown armory slot, an affix on a slot it may not roll on, a loot table naming an unknown base, an atlas frame not in the frame list.
- The rarity table's seven rows match the catalogue's.
- The seven stored logs replay on the new content version.
- `pnpm check` green.

**Tests:**
- `tests/domain/definitions/item-schema.spec.ts`: each refusal above, and a well-formed base taken.
- `tests/content/items.spec.ts`: the index loads; every loot table names bases that exist.
- `tests/content/catalogues.spec.ts`: the catalogue's rarity and affix tables against the content.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P7-S31-T04 — The checkpoint reach radius at 256

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 0.5 |
| Depends on | none; Q60 answered |
| Status | planned |

> **Note, 2026-09-26:** unplanned, from the maintainer's answer to Q60 the same day, a phase 6 value changed after phase 6 closed. It runs first in the sprint, before T01: it settles the last phase 6 number in the build, so every re-stamp of phase 7 lands on top of it rather than under it, and it sets the ring P7-S36-T03 makes clickable. The sprint's sized total is 4.5 by this ticket, as the plan's rules allow for unplanned work.

**Build:** `checkpoint_reach_radius` in `src/content/tuning.ts` from 512 to 256. The checkpoint ring in `src/presentation/views/checkpoint.view.ts` draws as wide as the radius (Q64); if it reads the tunable it follows with no edit, and if it holds its own size the ticket makes it read the tunable. The pages that state the radius, the [map and camera](../../../../docs/product/features/map-and-camera.md) and [developer panel](../../../../docs/product/features/developer-panel.md) pages among them, say 256. The content version moves, so the seven stored logs are re-stamped: the six, and `long-road-playtest.json`.

**Acceptance:**
- A hero within 256 of a checkpoint reaches it, and one at 257 does not; the ring draws 256 wide.
- On the long-road case of `tests/simulation/stress.spec.ts`, the walk reaches every checkpoint in order, as it did at 512.
- `tests/simulation/replays/long-road-playtest.spec.ts` still reads the last boss killed. If the smaller radius moves where the maintainer's hero came back after a death and the replay no longer kills the last boss, the ticket reports it and the maintainer chooses, rather than editing the log.
- The seven stored logs replay on the new content version.
- `pnpm check` green, the budget project included.

**Tests:**
- `tests/domain/map/checkpoint.spec.ts`, `tests/simulation/hero/death.spec.ts`, `tests/simulation/dev-api.spec.ts`: moved to the new default where they read it, the reach edge at 256.
- `tests/presentation/checkpoint-view.spec.ts`: the ring's width follows the radius.
- `tests/simulation/stress.spec.ts`: every checkpoint reached on the long-road walk.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · Anything under `src/presentation` · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The item catalogue approved by the maintainer | |
| The architect's brief and its decision records | |
| The schema refuses what it should, and the seven logs re-stamped | |
| The checkpoint reach at 256, every checkpoint reached on the long-road walk | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- The catalogue's approval is calendar time outside the sprint. Sprints 32 to 34 build on the draft and fixture bases; P7-S35-T03 waits on the approval.
- The first screen's decision can move P7-S34-T02 and T03 by a day either way: DOM is cheaper to lay out and costs a click-claim across two input sources; Phaser keeps one input path and costs a layout written by hand in quads.
- The catalogue's economy is arithmetic on 54 kills. If it cannot cover the clean run's sustain at rates that still read as rare, it says so, and Q95 is answered before sprint 32.
