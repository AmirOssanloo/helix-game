# Sprint 31 — The item catalogue and where it lives

**Phase:** 8 · **Sized days:** 3.5, and 0.5 unplanned (T04); was 4, until T02 shrank on 2026-09-27 when phase 7 was inserted · **Buffer:** 1

## Goal

Items exist on paper, approved by the maintainer: the ten armory slots, the bases, seven rarities, the affixes, the drop tables, and an economy whose arithmetic covers the clean run's two heals and eight mana restores. The engineering architect has placed every new module in a layer that already exists, on top of phase 7's records for where items live and the first screen. The registry takes an item definition and refuses a wrong one.

## Playable outcome

None in the browser: this sprint is paper and a schema. The content tier loads two fixture bases and a loot table, and refuses each malformed one with a message naming the field.

---

## Tickets

### P8-S31-T01 — The item catalogue: the spec

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1.5 |
| Depends on | P8-S39-T01, P8-S39-T02; every question from Q73 to Q94 answered |
| Status | done |

> **Note, 2026-09-27:** edited for the answers of 2026-09-27: the economy is the new road's (Q58), active items have no rarity and never drop (Q84), the store is a basic Diablo II store (Q90), and the words are Q94's.

> **Note, 2026-09-27, later:** edited again for the later answers: item level is the map's level (Q89), each base has a size in cells (Q88), no +1 to an orb anywhere (Q92), the stat is magic damage % (Q93), and items are picked up by a right click (Q87).

> **Note, 2026-09-28, built:** a base names its icon frame and no tint of its own, since an item's icon and label are drawn in its rarity's tint (P8-S33-T03, P8-S34-T03); an affix's tiers are grouped by stat, one stat rolled once an item, which P8-S35-T01 is edited for. The choices no answer gave are [Q103](../backlog/open-questions.md), decided provisionally. The maintainer's approval is a box under Waiting on a person, deferred until phase 8 is done by the standing instruction of 2026-09-24.

**Build:** `docs/product/specs/item-catalogue.md`, a product spec shaped like the [spell catalogue](../../../../docs/product/specs/spell-catalogue.md) and the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), with real names and numbers. It holds:

- **The ten armory slots** (Q75): Helm, Amulet, Armour, Main hand, Off-hand, Gloves, Belt, Boots, Ring, Ring, what each may hold, and the word each uses on screen and in code (Q94). One-handed only.
- **About twenty bases.** Per base: its slot, its name, its **size in cells** in the 10 by 4 inventory, Diablo II style, such as 2 by 2 for a helm and 1 by 1 for a ring (Q88), its **quality level** (it drops only when an item level reaches it, Q89), its level requirement, its implicit stat and that stat's range, its icon frame and tint, and its value in gold. Main hand: one-handed staff, wand, sceptre, dagger. Off-hand: tome, focus, buckler. "Orb" is reserved by the vocabulary and names no base.
- **Seven rarities** (Q76): Common, Uncommon, Rare, Epic, Imperial, Mythical, Legendary, in that order; the affix count of each, 0, 1, 2, 3, 4, 5, and Legendary fixed (Q83); the label tint of each, a tint of the one atlas: gray, white, blue, orange, gold, purple, red (Q83); its weight in each enemy tier's table, Mythical low and from any enemy; its price multiplier.
- **The affix table.** Per affix: the stat, the slots it may roll on, its **affix level** (it rolls only when the item level reaches it) and level requirement, its range, and the rarities it rolls at. **Magic damage %** is one (Q93): it amplifies all magical damage the hero deals, never physical, and pure damage is not magical. No affix touches an orb level (Q92). A small table: the catalogue at Diablo II's scale is a Deferred row, not this ticket.
- **Legendary** (Q84): fixed identities. Three equipment pieces, each with fixed values of existing, simple stats, such as +10% magic damage, each dropped at a low rate only by the named boss P8-S39-T01's spec gives it.
- **Active items** (Q84): the eight are listed by name, with no rarity, a label in emerald green, and a store price in the Misc tab; they never drop. Their effects and their listing are phase 9's.
- **Drops.** Per enemy tier: gold by item level, the chance of a health globe and a mana globe and what each restores (Q86: 25% of the pool; 25% and 35% for a normal enemy, one of each for an elite, two of each for a boss), and the item table. An elite always drops an item; a boss always drops one Rare or better; an add drops nothing, as it grants no experience.
- **Item level and requirement** (Q89): an item's item level is the level of the map it drops on, Diablo I's dungeon level, whatever tier dropped it; elites and bosses drop more and at better rarity, not at a higher item level. The long road's level is 3 (P8-S39-T02). The level requirement is the highest of the base's and its affixes'.
- **The store** (Q90), as close to a basic Diablo II store as the game allows: three tabs, Armour, Weapons, and Misc (the active items' tab from phase 9); a grid of items with prices on hover; 12 items from Common to Rare stocked at the hero's level when a checkpoint's store first opens, never restocked; it buys at a quarter of the price.
- **The economy on the long road.** The expected gold, globes, and items over a full clear of the new road's 100 to 130 enemies at the stated rates, and the expected health and mana restored against the sustain gap the clean run measured on the old road, 2 `heal` and 8 `restore_mana`. P8-S37-T01 tunes against this table on the new road.
- **Words** (Q94, answered). The [vocabulary](../../../../docs/product/vocabulary.md) gains item, base, affix, rarity, item level, map level, quality level, affix level, level requirement, magic damage (already added by P7-S46-T02, 2026-09-27), gold, health globe, mana globe, ground item, label, pick up, store, active item and "activate" (Q85), and armory slot, always with the word armory so a bare "slot" stays D or F; the Armour slot is `body` in code. The inventory and armory rows already there are kept.

The behaviour goes in a new feature page, `docs/product/features/items-and-loot.md`: drops, gold and globes taken on walk-over, items picked up by a right click, labels and Alt, the inventory and armory screen, the store at a checkpoint, edge cases, and what is deferred. The deferred lines on the [hero](../../../../docs/product/features/hero.md), [HUD](../../../../docs/product/features/hud.md), [enemies](../../../../docs/product/features/enemies.md), and [spells and attack](../../../../docs/product/features/spells-and-attack.md) pages that say no item exists are rewritten to link it. The product README and the docs index link both pages. The roadmap's later-documents table already names the catalogue.

**Acceptance:**
- Every base names one slot, a size in cells that fits the 10 by 4 inventory, an implicit stat with a range, an icon frame, and a value; every affix names its slots, its range by item level, and its rarities.
- The rarity table gives an affix count, a tint, a weight per enemy tier, and a price multiplier for each of the seven.
- The economy table shows the expected health and mana restored on a full clear of the new road covering the clean run's panel use with a stated margin, and the expected gold buying at least one Rare from the store before the last region.
- Every Legendary names its boss; no active item appears in a loot table.
- The maintainer approves the catalogue, or names what to change: a box under Waiting on a person in STATUS.md. P8-S35-T03 writes the bases from the page as approved; a later change is made in the page and the file together.

**Tests:** none here. P8-S31-T03 and P8-S35-T03 make `tests/content/catalogues.spec.ts` read the page's tables against the files.

**Definition of done:** Every change · A documentation change.

---

### P8-S31-T02 — Where the inventory, the ground item, loot, and the store live

| Field | Value |
| --- | --- |
| Layer | docs |
| Size | 1 |
| Depends on | T01 as drafted, not its approval; the phase 7 gate, P7-S48-T04 above all |
| Status | done |

> **Note, 2026-09-26:** a structural ticket. It is the engineering architect's; the delivery strategist names the questions and does not answer them. The brief the maintainer saw sized it at 1; it is 1.5 because the first UI screen is a structural decision of its own, the one ADR 0003's three-scene rule names as its revisit condition.

> **Note, 2026-09-27, phase 7 inserted:** shrunk from 1.5 to 1, and retitled from "Where items, loot, and the store live, and the first screen". Five of its questions arrive answered from phase 7:
> - the modifier model: one overflow policy and an attacker-side read (P7-S46-T02), and where an item's rows live, with any source identity they need, in record (a) (P7-S48-T04). The architect review of 2026-09-27 moved the row's source identity from P7-S46-T02 to record (a);
> - typed ids and the order's tagged target (P7-S48-T03);
> - the first screen and input capture, a decision record, with the capture layer built (P7-S48-T04 (b), P7-S50-T01);
> - where items live and item identity, a decision record (P7-S48-T04 (a));
> - the keyed draw's draw index and loot purposes, with ADR 0010 amended (P7-S48-T05).
>
> What is left places the inventory, the ground item and its pool, loot, and the store. Was items 2, 4, and 7, the item in memory, the loot draw, and the first screen, now answered.

> **Note, 2026-09-27, from P7-S48-T04:** [ADR 0011](../../../../docs/adr/0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) places the inventory and gold in run scope once, an armory on each form record, and an item as a fixed-shape value with no id, moved by copy, a command naming a cell or a slot; [ADR 0012](../../../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md) puts screens in `HudScene` behind the input claim. The brief places modules on both and does not reopen them.

> **Note, 2026-09-28, built:** [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md) answers the eight questions, with two decision records, [ADR 0013](../../../../docs/adr/0013-loot-on-the-ground-is-a-pooled-entity-that-stays-until-the-map-is-made-again.md) for the ground item's pool and lifetime and [ADR 0014](../../../../docs/adr/0014-of-item-content-the-tuning-surface-reaches-only-the-loot-tables.md) for the item tuning surface, both Proposed; the choices no doc settled are [Q104](../backlog/open-questions.md), decided provisionally. The import table needs no new row. Seventeen tickets of sprints 31 to 36 and 40 carry a note.

**Build:** the engineering architect's structural brief, and whatever decision records it takes, answering each of these on top of phase 7's records. The roadmap's door says later modules land in layers that already exist ([layers](../../../../docs/architecture/layers-and-dependency-rule.md)).

1. **Placement.**
   - The modules for affixes, loot tables and the roll, the inventory and gold, the armory as a modifier source, the ground item, pickup, and the store, each in a layer that exists and behind the doors P7-S49-T01 narrowed.
   - Run scope and map scope as P7-S48-T04 (a) decided.
   - The place in the fixed system order of the system that takes gold and globes on walk-over, of the `pick_up` order's take (Q87), and of the store's auto-close system, which closes the store when the hero leaves the ring or dies.
   - The inventory as a 10 by 4 grid of items several cells in size (Q88): how an item's cells are held and fit-tested without allocating.
2. **The ground item.** A new entity kind with its own id brand (P7-S48-T03): its world-model rows, its pool capacity, the eviction rule for a drop past capacity, its despawn rule (that it lives until the map is reset, or a stated alternative), and what its view reads.
3. **Loot.** Which purposes of P7-S48-T05's loot block each roll uses, at which draw indices; the store's stock drawn the same way on its checkpoint.
4. **Commands and events.**
   - `equip_item`, `unequip_item`, `drop_item`, `buy_item`, `sell_item`, `open_store`, `close_store`, and the debug commands `grant_item` and `grant_gold`, each under [ADR 0004](../../../../docs/adr/0004-all-mutation-enters-as-commands.md), with their refusals.
   - The events a drop, a pickup, and each command announce, on the event record as P7-S47-T04 decided.
   - Gold and globes are taken by a system on walk-over, not a command.
   - An item is taken by a new order kind, `pick_up`, sent by a right click on it (Q87, which supersedes Q74's "no new order kind" for items): where it sits in the order machine, which P8-S40-T01 must split by state to stay under the size limit, and in the command union.
5. **Stats.** The armory as one modifier source per slot, its rows where P7-S48-T04 (a) put them. Magic damage % through the attacker-side read in `dealDamage`, to every magical instance the hero deals and never to physical or pure (Q93). No item touches an orb level (Q92).
6. **A named boss's Legendary.** How a boss pack on a map names the Legendary it drops (Q84): a pack field or a loot table keyed by map and pack, since a pack is otherwise an archetype at a tier with no identity. Added 2026-09-27.
7. **Room for phase 9's active items.** Nothing decided here closes the [phase 9](../phase-9-active-items/README.md) door:
   - a bank of six active-item slots beside the armory, where P7-S48-T04 (a) put run-scope items, that an active item equips into;
   - the keys T, X, V, C, G, and Space (Q82), which no phase 8 screen or control takes.

   The bank is not built here; the brief names where it would go.
8. **Tuning at item scale.** Whether item bases and affixes are tunable from the panel as other definitions are, or untunable as [ADR 0009](../../../../docs/adr/0009-definition-tuning-key-is-the-field-path.md)'s precedent for maps suggests. Phase 7 left this here on purpose.

**Acceptance:**
- The brief names a module and a layer for every item in the list, and the architecture test's import table needs no new row, or the brief says which and why.
- The world model gains the ground item's rows and the run-scope inventory, armory, and gold rows; entities and pools, commands and events, where to look, and presentation name what the brief decides.
- Each decision record the brief takes is written; it is Proposed until the maintainer reads it, a box under Waiting on a person in STATUS.md, and the tickets after it build on it as written.
- Every ticket from P8-S31-T03 to P8-S36-T04 that the brief changes is edited in place with a one-line note before it starts.

**Tests:** none. From P8-S31-T03 on, the architecture test's import rules hold the placement.

**Definition of done:** Every change · A documentation change.

---

### P8-S31-T03 — The item schema and the registry

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | T01, T02 |
| Status | done |

> **Note, 2026-09-27:** a base carries a quality level and an affix an affix level (Q89), and a boss's loot table can name a Legendary (Q84); six logs to re-stamp, not seven, since P8-S39-T01 retires the phase 6 playtest log.

> **Note, 2026-09-27, later:** a base also carries its size in cells (Q88).

> **Note, 2026-09-28, from P8-S31-T02:** [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md) makes five kinds, not four: a Legendary piece is a kind of its own, and a boss pack names its piece in a new `legendaryId` field of the map's pack, with the chance on the boss loot table, so there is no loot table per Legendary boss. Of the five only the loot table is tunable, under the word `loot` ([ADR 0014](../../../../docs/adr/0014-of-item-content-the-tuning-surface-reaches-only-the-loot-tables.md)); there is a `store` loot table beside the three tiers'. The tunables are named. The size stays 1: the fifth descriptor is one file on the pattern of the other four.

> **Note, 2026-09-28, built:** the five kinds are one descriptor each, and the loot table's rebuild writes a new run-scope record, the world's copies of the tables by id. A roll's weight names a rarity by id, so a loot table names rarities and never an item; the Legendary rarity, whose items are fixed, is named by no weight or affix. "An affix on a slot it may not roll on" is read as an affix off the armory slots of its stat's first tier, since the roll draws a stat by the slot and then a tier. The whole affix table and the rarity table are in content now, since the catalogue test reads them; the bases are the cap and the band, drawn with `square` and `disc` until P8-S32-T04 gives the slots their silhouettes. `drop_placement_radius` is 192. The three choices are [Q105](../backlog/open-questions.md), decided provisionally. The six logs are on content version 244c0bd9, their checksums recorded again since the tuning state gains the loot keys and five tunables. The stamp spec that nudges every leaf passed its default time with the item content and was given 60 seconds.

**Build:** the definition types the catalogue needs, placed where T02 says, under `src/domain/definitions/` with a descriptor each under `kinds/`: an item base with its size in cells, its quality level, and its requirement; an affix with its affix level and requirement; the rarity table, a single kind; a loot table, one each for `normal`, `elite`, `boss`, and `store`, holding the chances of gold and each globe, the gold range, its item rolls each with a chance and a weight per rarity, and for the boss the Legendary chance; and a Legendary piece on a base, with its fixed lines and requirement. Each with its validation schema, every field required. The loot table's descriptor is tunable under `loot`; the other four carry `tuning: null`, as `mapKind` does. The map's `PackDef` gains `legendaryId: string | null`, checked by the map kind: an id naming a piece that exists, on a boss-tier pack only. `src/content/items/` with an index registered in the content registry, holding two fixture bases, one fixture Legendary piece, the four loot tables, and the rarity and affix tables; the real twenty bases and three pieces are P8-S35-T03's. The tunables go in `src/content/tuning.ts`: `pickup_radius`, `health_globe_restore`, `mana_globe_restore`, `drop_placement_radius`, and `store_sell_fraction`. The [content and registries](../../../../docs/architecture/content-and-registries.md) page and the world model's definition kinds state the new kinds. Adding definitions moves the content version, so the six stored logs are re-stamped by `pnpm restamp`. Each new kind is one descriptor (P7-S47-T02).

**Acceptance:**
- The registry takes a well-formed base and refuses, with a message naming the field: a missing field, an unknown armory slot, a size that does not fit the 10 by 4 grid, an affix on a slot it may not roll on, a loot table naming an unknown rarity, a Legendary piece on an unknown base, a pack naming an unknown piece or naming one at a tier other than boss, an atlas frame not in the frame list.
- No tuning key names an item kind but `loot`.
- The rarity table's seven rows match the catalogue's.
- The six stored logs replay on the new content version.
- `pnpm check` green.

**Tests:**
- `tests/domain/definitions/item-schema.spec.ts`: each refusal above, and a well-formed base taken.
- `tests/content/items.spec.ts`: the index loads; the four loot tables exist; a loot table names rarities and never an item, so no active item can be in one.
- `tests/domain/definitions/tuning-keys.spec.ts`, or the tuning key spec already there: the `loot` keys present, no key for the other four item kinds.
- `tests/content/catalogues.spec.ts`: the catalogue's rarity and affix tables against the content, the four weight columns read against the four loot tables.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P8-S31-T04 — The checkpoint reach radius at 256

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 0.5 |
| Depends on | none; Q60 answered |
| Status | done |

> **Note, 2026-09-26:** unplanned, from the maintainer's answer to Q60 the same day, a phase 6 value changed after phase 6 closed. It runs first in the sprint, before T01: it settles the last phase 6 number in the build, so every re-stamp of phase 8 lands on top of it rather than under it, and it sets the ring P8-S36-T03 makes clickable. The sprint's sized total is 4.5 by this ticket, as the plan's rules allow for unplanned work.

> **Note, 2026-09-27:** sprint 39, the new road, now runs before this sprint, so this ticket checks the reach on the new road; the phase 6 playtest log is retired by then, so its acceptance row is gone and six logs are re-stamped.

> **Note, 2026-09-28, built:** the checkpoint rule and the ring already read the tunable, and the checkpoint, death, dev-api, and view specs already read the table's value, so the one-line change moved them all to the edge at 256 with no edit; the stress spec's long-road walk gained the check that every checkpoint is reached in order. The logs' checksums were recorded again with `pnpm restamp --checksums`, since the tuning table is hashed from tick 0.

**Build:** `checkpoint_reach_radius` in `src/content/tuning.ts` from 512 to 256. The checkpoint ring in `src/presentation/views/checkpoint.view.ts` draws as wide as the radius (Q64); if it reads the tunable it follows with no edit, and if it holds its own size the ticket makes it read the tunable. The pages that state the radius, the [map and camera](../../../../docs/product/features/map-and-camera.md) and [developer panel](../../../../docs/product/features/developer-panel.md) pages among them, say 256. The content version moves, so the six stored logs are re-stamped by `pnpm restamp`.

**Acceptance:**
- A hero within 256 of a checkpoint reaches it, and one at 257 does not; the ring draws 256 wide.
- On the long-road case of `tests/simulation/stress.spec.ts`, the walk reaches every checkpoint of the new road in order.
- The six stored logs replay on the new content version.
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
| The item catalogue approved by the maintainer | Drafted 2026-09-28 by P8-S31-T01, every agent-checkable acceptance row holding: [the item catalogue](../../../../docs/product/specs/item-catalogue.md) and [items and loot](../../../../docs/product/features/items-and-loot.md). The approval waits on the maintainer, deferred until phase 8 is done by the standing instruction of 2026-09-24, a box in STATUS.md; Q103 with it |
| The architect's brief and its decision records | Done 2026-09-28 by P8-S31-T02: [the brief](../../2026-09-28-where-items-loot-and-the-store-live.md) answers the eight questions; [ADR 0013](../../../../docs/adr/0013-loot-on-the-ground-is-a-pooled-entity-that-stays-until-the-map-is-made-again.md) and [ADR 0014](../../../../docs/adr/0014-of-item-content-the-tuning-surface-reaches-only-the-loot-tables.md) Proposed, the maintainer's reading a box in STATUS.md deferred until phase 8 is done by the standing instruction of 2026-09-24; Q104 decided provisionally; no new import-table row |
| The schema refuses what it should, and the six logs re-stamped | Done 2026-09-28 by P8-S31-T03: the five item kinds, the pack's `legendaryId`, and the five tunables; every refusal of the acceptance in `tests/domain/definitions/item-schema.spec.ts`; the catalogue's rarity and affix tables and the four weight columns read against the files; the six logs on content version 244c0bd9 with their checksums recorded again; `pnpm check` and the budget tier green |
| The checkpoint reach at 256, every checkpoint reached on the long-road walk | Done 2026-09-28 by P8-S31-T04: the walk reaches checkpoints 0 to the last in order in 4338 ticks with no hero death; the six logs on content version a486c35a |
| Actual days per ticket | T01: 0.5 against 1.5; T02: 0.5 against 1; T03: 0.5 against 1; T04: 0.25 against 0.5 |
| Sprint total | Sized 4, 3.5 and 0.5 unplanned, with 1 of buffer, done in 1.75, the buffer unspent; closed 2026-09-28 on every row an agent can verify. The catalogue's approval is the maintainer's, deferred until phase 8 is done by the standing instruction of 2026-09-24, a box in STATUS.md |

## Risks in this sprint

- The catalogue's approval is calendar time outside the sprint. Sprints 32 to 34 build on the draft and fixture bases; P8-S35-T03 waits on the approval.
- The first screen's decision is phase 7's (P7-S48-T04 (b)), and its capture layer is built there (P7-S50-T01), so it no longer moves this sprint. Was: it could move P8-S34-T02 and T03 by a day either way.
- Adding the five item kinds (four until P8-S31-T02 made the Legendary piece its own) leans on phase 7's descriptors (P7-S47-T02). If that ticket's toy kind took more than three files, T03 is sized again before it starts.
- The catalogue's economy is arithmetic on the new road's 100 to 130 kills, which sprint 39 writes first. If it cannot cover the clean run's sustain at rates that still read as rare, it says so before sprint 32.
