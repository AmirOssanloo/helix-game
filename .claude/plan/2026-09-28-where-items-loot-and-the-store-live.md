# Where the inventory, the ground item, loot, and the store live

**Written:** 2026-09-28 · **Author:** engineering architect role · **Ticket:** P8-S31-T02 · **For:** the game engineer building sprints 31 to 36 and 40, and the maintainer reading the two records it takes
**Status of this document:** a dated note, the structural brief. It answers the eight questions of P8-S31-T02 on top of [ADR 0011](../../docs/adr/0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) and [ADR 0012](../../docs/adr/0012-screens-draw-in-the-hud-scene-behind-one-input-claim.md), which it does not reopen. Two records are taken, both Proposed: [ADR 0013](../../docs/adr/0013-loot-on-the-ground-is-a-pooled-entity-that-stays-until-the-map-is-made-again.md) and [ADR 0014](../../docs/adr/0014-of-item-content-the-tuning-surface-reaches-only-the-loot-tables.md). The pages under `docs/` are amended to the target in the same change; the tickets they touch carry a note of 2026-09-28.

---

## The decision on one screen

- **Every new module lands in a layer that exists.** Rules in three new domain folders, `domain/items/`, `domain/loot/`, and `domain/store/`, plus the ground item under `domain/entities/`; data under `content/items/`; views, the pick port, and three screens in presentation; one panel group in devtools. **The architecture test's import table needs no new row**, and no door changes: the panel's loot preview and the screens' fit, price, and requirement reads go through `domain/queries.ts`, which is already open to both.
- **The ground item is a map-scoped entity kind with its own pool of 512 and its own id brand**, one to a walkability cell, not in the spatial hash, living until it is taken or the map is made again. A drop the world cannot take is not made and is counted; nothing is evicted ([ADR 0013](../../docs/adr/0013-loot-on-the-ground-is-a-pooled-entity-that-stays-until-the-map-is-made-again.md)).
- **Two systems join the order:** a pickup system after the checkpoint rule, which takes gold and globes on walk-over and ends a `pick_up` order with its take; and a store system after death, which closes the store when the hero leaves the ring or dies.
- **Every roll that makes an item keys on its source at its tick** (a dying unit's id, a checkpoint's index, a grant's position among the tick's commands), with purposes per source and per kind of number, and a draw index from the item's place in the roll and the line's place in the item.
- **A boss pack names its Legendary piece** in a new pack field of the map definition; the boss loot table holds the chance.
- **Of item content, only the loot tables are tunable**; bases, affixes, the rarity table, and Legendary pieces are not ([ADR 0014](../../docs/adr/0014-of-item-content-the-tuning-surface-reaches-only-the-loot-tables.md)).
- **Nothing closes phase 9's door**: the bank has a named place in run scope and a range of places; no phase 8 screen or control takes T, X, V, C, G, or Space.
- **The choices no answer settled** are decided provisionally, the most conservative reading of each, as [Q104](./implementation/backlog/open-questions.md).

---

## 1. Placement

### 1.1 Modules

Each row is a module, its layer, and the door it leaves by. "Types" is `domain/public.ts`, "reads" is `domain/queries.ts`, "rules" is `domain/rules.ts`, the doors P7-S49-T01 narrowed.

| What | Layer | Module | Leaves by |
| --- | --- | --- | --- |
| Item definition types: base, affix, rarity table, loot table, Legendary piece | domain | `domain/definitions/item-base-def.ts`, `affix-def.ts`, `rarity-def.ts`, `loot-table-def.ts`, `legendary-def.ts` | types |
| Their five kind descriptors | domain | `domain/definitions/kinds/item-base.kind.ts`, `affix.kind.ts`, `rarity.kind.ts` (single), `loot-table.kind.ts`, `legendary.kind.ts`, one line each in the kind list | rules (content checks) |
| The pack's Legendary field and its check | domain | `domain/definitions/map-def.ts`, `kinds/map.kind.ts` | types, rules |
| Item content | content | `content/items/`: `bases/`, `affixes/`, `loot/`, `legendaries/`, one file each, the rarity table, and an index registered in `content/index.ts` | `content/public.ts` |
| New tunables | content | `content/tuning.ts`: `pickup_radius`, `health_globe_restore`, `mana_globe_restore`, `drop_placement_radius`, `store_sell_fraction` | the tuning table |
| The item value: create, clear, copy, and the line capacity | domain | `domain/items/item.ts` | types, reads |
| The place encoding: a cell, an armory slot, a stock slot, a bank slot as one small integer | domain | `domain/items/item-place.ts` | reads |
| The inventory and gold: the grid, the fit test, the first fit, place and remove | domain | `domain/items/inventory.ts` | reads (fit, first fit), rules (place, remove) |
| The armory: ten slots on each form record, the totals rewrite | domain | `domain/items/armory.ts`; the `armory` field of `FormRecord` in `domain/entities/world-state.ts` stops being `null` | rules |
| Prices, the sell price, and whether the requirement is met | domain | `domain/items/prices.ts`, `domain/items/requirement.ts` | reads |
| The item commands' variants | domain | `domain/commands/item-commands.ts`, imported into the `Command` union in `command.ts` (426 lines, so the variants do not go there) | types |
| The item commands' shape checks and application | domain | `domain/items/item-validation.ts` (so `orders/validator.ts` stays small), `domain/items/item-commands.ts` | rules, through the command system |
| The ground item: kind, pool, id, capacity | domain | `domain/entities/ground-item.ts` | types, rules (pool constructor) |
| The loot roll: a pure read writing a drop into an out record | domain | `domain/loot/roll.ts`; one item's base, rarity, and lines in `domain/loot/item-roll.ts`, shared by a drop, a stock, and a grant | reads (for the panel's preview), rules |
| Placing a drop: the ring search, one to a cell, acquire, announce | domain | `domain/loot/place-drop.ts` | rules |
| The drop on death | domain | `domain/loot/drop-on-death.ts`, called from the reward step of `domain/combat/death.system.ts`, beside the experience grant | internal |
| The pickup system | domain | `domain/loot/pickup.system.ts` | rules; one line in `simulation/systems.ts` |
| The `pick_up` order's transitions | domain | `domain/orders/pick-up-transitions.ts`, with the state machine split by family (section 4.3) | internal to `domain/orders/` |
| The store: records, stock roll, commands, and the closing system | domain | `domain/store/store.ts`, `stock.ts`, `store-commands.ts`, `store.system.ts`; which checkpoint's reach the hero stands in, as a read | rules; reads (reach, for the ring click) |
| The debug grants | domain | `domain/debug/item-grants.ts`, dispatched from `debug-commands.ts` (457 lines, so the handlers do not go there) | internal |
| The new draw purposes | domain | `domain/random/keyed-draw.ts` | internal |
| The new event kinds and two fields | domain | `domain/events/domain-event.ts` | types |
| World creation of the new records; the state checksum and full-state comparison | simulation | `simulation/world.ts`; `simulation/replay/state-fields.ts` gains the inventory, gold, each armory, the hero's totals, the ground-item pool and its cell bytes, the stores, and the open store | — |
| The ground-item icon and label views | presentation | `presentation/views/ground-item.view.ts`, `ground-item-label.view.ts`, registered in the play scene's list in `presentation/scenes/play-view-syncers.ts` | — |
| The pick port's two lists | presentation | `presentation/input/input-ports.ts` | — |
| Alt, the item pick, the ring click | presentation | `presentation/input/`, the mapper | — |
| The inventory and armory, store, and tooltip screens | presentation | `presentation/screens/inventory.screen.ts`, `store.screen.ts`, `tooltip.ts`, registered by `presentation/scenes/hud.scene.ts` | — |
| The Loot group: grant item, grant gold, preview a table | devtools | `devtools/loot-group.ts`; the preview calls the roll through `domain/queries.ts` over the world view | — |

### 1.2 Run scope and map scope, as ADR 0011 decided

- **Run scope:** the inventory and gold once; an armory on each form record; the hero's item totals once; the world's copies of the item definitions and their run-scope records (the loot records rebuilt by a loot tuning command); later, the bank.
- **Map scope:** the ground-item pool; one byte per walkability cell saying whether a ground item lies there; one store record per checkpoint; which store is open. `resetMapScope` in `domain/map/map-scope.ts` releases the pool, clears the bytes, and makes the stores unstocked and closed, for a load and a reset alike.

### 1.3 The system order

`simulation/systems.ts` becomes, with the two new systems in place:

```text
command, status, kit, stats, cast, ai, attack, pathing, movement, collision, checkpoint,
pickup, projectile, zone, death, store
```

- **Pickup, after the checkpoint rule.** It reads where collision left the hero, as the checkpoint rule does. It does two things in one pass over the ground-item pool, walked by index: for a hero holding a `pick_up` order, it takes the item once the hero's bound radius plus `pickup_radius` reaches it, into the first place it fits, or ends the order with a `no_room` refusal and the item left; and it takes every gold pile and every globe within the same reach. A dead hero, or one at zero health this tick, takes nothing, as a heal over time never reaches a unit at zero, so a hero emptied this tick still dies at its end. A globe whose pool is full is left.
- **Store, after death, last.** The acceptance says the store closes on the tick the hero dies, and death is resolved in the death system; so the store system reads the state death left, and closes the open store when the hero is dead or farther than the reach radius from the store's checkpoint.
- **The equip lands in the stats of the same tick.** The command system rewrites the armory's totals when the command applies, and the stats system copies the active form's totals first, so no new position is needed for it.
- **The drop is made in the death system**, beside the experience grant, so a drop lies on the ground from the tick of the death and can be taken from the next.

### 1.4 The inventory grid, held and fit-tested without allocating

- **Held as two records made with the world.** One entry per cell, 40, naming the placed record that covers it, or none. As many placed records as there are cells, 40, since an item takes at least one: each an item value, whether it is live, its top-left corner, and the width and height copied from its base at placement. Sizes are not tunable (ADR 0014), and a content change to a size reloads the page, so a copied size never disagrees with its base in a session.
- **The fit test** for an item of `w` by `h` with its corner at a cell: inside the grid, then at most `w × h` cell reads, a cell free if it names none or names the item being moved. At most six reads today.
- **The first fit** tries each cell as a corner in reading order, left to right then top to bottom, and takes the first that fits: at most 40 corners of six reads.
- **A swap** on `move_item` counts the distinct placed records the target cells cover, other than the item moved: none is a move, exactly one is a swap, more is refused. A swap takes both out, places the moved item at the target, and puts the covered item at its first fit; if there is none, nothing moves. An equip into a worn slot does the same with the worn item. The screen's lifted item asks the same fit test, through the queries door, to draw its cells free or blocked.

---

## 2. The ground item

- **An entity kind with its own id brand**, `GroundItemId`, beside its pool in `domain/entities/ground-item.ts`.
- **Its world-model rows:** an entity kind, owned by `domain/entities`, map scope: gold, a health globe, a mana globe, or an item held inline, lying on one cell from the tick it fell until it is taken or the map is made again. The held records beside it, the inventory, gold, the armory, the hero's totals, the store, and the bank to come, are a new table of the [world model](../../docs/architecture/world-model.md#held-records).
- **Its fields:** what it is, its point, a pile's amount of gold, the item value inline, made with the slot and cleared in place, and the tick it fell. No previous position: it never moves.
- **Capacity: 512.** A full clear of the long road with nothing taken drops about 175 things in expectation; 512 holds that about three times over.
- **Past capacity, and with no free cell:** the drop is not made, and is counted in one map-scope count beside the pool's own misses; the panel's **Ground items** readout shows live over capacity and the count. Nothing is evicted. A death makes its drops best first: a Legendary, items by rarity from the highest, gold, then globes.
- **Where it lands:** on a free walkability cell open to the hero's radius class, ring by ring outward from the body, no further than `drop_placement_radius`, one ground item to a cell, the cell's byte written with the acquire and cleared with the release. The hero's own drop searches from where the hero stands.
- **Despawn:** none. It lives until it is taken, or a map load or reset; the hero's death leaves it.
- **Not in the spatial hash.** The pickup system, the views, and the pick walk the pool by index.
- **What its view reads:** from the world view, the kind, the point, the amount, and the item's base id, Legendary piece, and rarity; from run scope's copies of the definitions, once at bind, the base's icon frame, the piece's or base's name, and the rarity's tint and default-label flag. Two view kinds: the icon at a new ground-items band (5), a child of the ground layer; the label standing up at a new item-labels band (45). Both pools sized to the screen, bound by walking the pool by index and keeping what the widened screen shows. Each frame they write the pick port's two lists, labels and icons, in drawing order.

---

## 3. Loot: purposes and draw indices

[ADR 0010](../../docs/adr/0010-a-rules-random-draw-is-a-keyed-hash.md) stands unchanged: every draw is `keyedDraw(world, key, purpose, index)` at the current tick. Nothing draws on a loot purpose yet, so the eight purposes already in the list (3 to 10) may have their comments reworded, and the new ones are appended from 11. The line capacity, the most stat lines any item holds, is `L` below: 6 today, an implicit and five affixes.

### 3.1 A death's drop

**Key:** the dying unit's generational id. **Tick:** the death's. `r` counts the loot table's item rolls from 0; a Legendary is never a roll. Line 0 is the implicit; lines 1 to 5 are affixes.

| Purpose | Value | Index | Draws |
| --- | --- | --- | --- |
| `lootGold` | 8 | 0 | Whether gold drops |
| `lootGoldAmount` | new, 11 | 0 | How much, in the table's range at the item level |
| `lootGlobe` | 9 | the globe entry's place in the table: health entries first, then mana | Whether that globe drops |
| `lootDropCount` | 3 | `r` | Whether item roll `r` drops; reworded from "how many items" |
| `lootRarity` | 5 | `r` | The rarity, by the roll's weights over their sum |
| `lootBase` | 4 | `r` | The base, evenly among those whose quality level the item level reaches |
| `lootAffix` | 6 | `r × L + line` | Which stat affix line `line` rolls, among those the slot may roll and the item does not carry |
| `lootAffixTier` | new, 12 | `r × L + line` | Which tier of it, among those the item level reaches and the rarity allows |
| `lootAffixValue` | 7 | `r × L + line`, line 0 the implicit | The value in the range |
| `lootLegendary` | new, 13 | 0 | Whether a boss drops the Legendary piece its pack names, at the boss table's chance |

A Legendary's lines are its piece's fixed values, copied in; nothing is drawn for them.

### 3.2 A store's stock

**Key:** the checkpoint's index. **Tick:** the tick the store first opens. `s` counts the stock slots from 0. The item level is the hero's level on that tick; the rarity weights are the `store` loot table's.

| Purpose | Value | Index |
| --- | --- | --- |
| `storeStock`, reworded to "which base a stock slot is" | 10 | `s` |
| `storeRarity` | new, 14 | `s` |
| `storeAffix` | new, 15 | `s × L + line` |
| `storeAffixTier` | new, 16 | `s × L + line` |
| `storeAffixValue` | new, 17 | `s × L + line`, line 0 the implicit |

Because the tick is in every draw, the same seed, checkpoint, and hero level stock the same items **opened on the same tick**; P8-S36-T02's acceptance is edited to say so.

### 3.3 A debug grant

**Key:** the command's position among the tick's consumed commands. The grant names the base or piece, the rarity, and the item level, so only lines are drawn: `grantAffix` (18), `grantAffixTier` (19), `grantAffixValue` (20), each at index `line`.

Separate purposes per source mean a boss dying on the tick a store opens at a checkpoint whose index equals the boss's packed id draws nothing in common with it. The largest index is `11 × 6 + 5 = 71`, far inside the limit of 1,024; the largest purpose is 20, far inside the stride of 256.

### 3.4 Where the roll sits

`rollDrop(world, tier, key, out)` in `domain/loot/roll.ts` is a pure read: it takes the world read-only, draws, and writes what drops into an out record its caller owns, allocating nothing. The death system's reward step calls it and then `placeDrops`, the mutator. The panel's **Preview loot table** calls the same read over the world view through `domain/queries.ts`, with keys 0 to the count at the current tick, and sends no command. So a preview and a real death are one roll. A dying enemy with an owner, an add, rolls nothing; nor does the panel's plain stress body, which has no definition.

---

## 4. Commands and events

### 4.1 Commands and their refusals

Every variant carries `tick` and `timestamp`. Every one is refused `dead` while the hero is dead, by the validator's first check. Shape checks run after the disable matrix's column, as today.

| Command | Payload | Refused with |
| --- | --- | --- |
| `equip_item` | `cell`, `armorySlot` (0 to 9, or `null` for the slot the base takes, the empty ring first) | `invalid_place`; `no_item_at_place`; `wrong_armory_slot`; `requirement_not_met`; `no_room` when the worn item fits nowhere once the new one has left its cells |
| `unequip_item` | `armorySlot` | `invalid_place`; `no_item_at_place`; `no_room` |
| `move_item` | `from` cell, `to` cell (the corner) | `invalid_place`; `no_item_at_place`; `no_room` when it neither fits nor covers exactly one item that then fits |
| `drop_item` | `cell` | `invalid_place`; `no_item_at_place`; `no_room` when the pool is full or no cell is free near the hero |
| `pick_up` | `groundItemId` | the matrix's `pickUp` column; `target_not_found` for a stale id; `invalid_target` for gold or a globe. On arrival, `no_room`, announced by the pickup system, the item left |
| `open_store` | `checkpoint` | `invalid_checkpoint`; `unknown_checkpoint`; `not_at_checkpoint` outside its reach. Opening one closes any other |
| `close_store` | none | nothing; with no store open it changes nothing |
| `buy_item` | `stockSlot` | `invalid_place`; `store_closed`; `no_item_at_place`; `not_enough_gold`; `no_room` |
| `sell_item` | `cell` | `invalid_place`; `store_closed`; `no_item_at_place` |
| `grant_item` (debug) | `itemId` (a base or a Legendary piece), `rarity`, `itemLevel` | `invalid_rarity`, `invalid_item_level` for the shape; `unknown_item`; `invalid_rarity` for Legendary on a base or anything else on a piece; `no_room` |
| `grant_gold` (debug) | `amount` | `invalid_amount` unless a whole number of one or more |

New refusal reasons: `invalid_place`, `no_item_at_place`, `wrong_armory_slot`, `requirement_not_met`, `no_room`, `not_at_checkpoint`, `store_closed`, `not_enough_gold`, `unknown_item`, `invalid_rarity`, `invalid_item_level`. The grants act whether the hero is alive or dead, as the panel's heal does; with no hero at all they still act, since the inventory is run scope. Every command is in the log and replays, under [ADR 0004](../../docs/adr/0004-all-mutation-enters-as-commands.md).

**The disable matrix gains two columns.** `items`, for the eight item and store commands, answering allowed in every row (Q91); and `pickUp`, answered as `move` is in every row, since the order is a walk. The validator reads both through `refusalOf`, as it reads the others.

**Gold and globes are never a command**: the pickup system takes them.

### 4.2 Events

The event record gains two fields: `groundItemId` (`null` neutral), since a new id kind gets its own; and `place` (`-1` neutral), one small integer in `item-place.ts`'s encoding. Both are small integers or `null`, so neither boxes; each costs one word per ring slot and one assignment in the copy and the reset.

| Event | Announced by | Reads |
| --- | --- | --- |
| `item_dropped` | Every ground item made: a death's drop, the hero's `drop_item` | `groundItemId`; `unitId` the dying unit or the hero; `amount` a pile's gold |
| `gold_taken` | The pickup system | `groundItemId`, now stale; `amount` |
| `health_globe_taken`, `mana_globe_taken` | The pickup system | `groundItemId`, now stale; `amount` restored |
| `item_picked_up` | The pickup system, at a `pick_up`'s take | `groundItemId`, now stale; `place`, the cell |
| `item_equipped` | `equip_item` | `place`, the armory slot |
| `item_unequipped` | `unequip_item`, and the worn item an equip displaces | `place`, the cell |
| `item_moved` | `move_item`, one per item moved, so a swap announces two | `place`, the cell |
| `item_bought` | `buy_item` | `place`, the cell; `amount`, the price |
| `item_sold` | `sell_item` | `place`, the cell it left; `amount`, the gold given |
| `item_granted`, `gold_granted` | The debug grants | `place`; `amount` |
| `store_opened`, `store_closed` | `open_store`, `close_store`, the store system | `checkpoint` |
| `command_refused` | As today | also `place` or `groundItemId`, whichever the command named, so the screen or the label flashes that item |

### 4.3 `pick_up` in the order machine and the command union

- **In the union:** `PickUpCommand` in `domain/commands/item-commands.ts`, a member of the player `Command` union; it sorts with everything else, in arrival order.
- **In the order:** `OrderKind` gains `pick_up`; `OrderTarget` gains the tag `ground_item` and a `groundItemId` field present on every variant, `null` but for that tag. The walk is a move's: `turning`, then `moving`, toward the item's point, with a path asked for; a push re-paths it as it re-paths a move.
- **Its transitions** live in `domain/orders/pick-up-transitions.ts`: `issuePickUp(unit, groundItemId, x, y)` and `endPickUp(unit)`, legal only on a `pick_up`. `arrive` stays a move's and an attack-move's: the movement system, reaching a `pick_up`'s point, leaves the order for the pickup system, which always ends it on that tick, since standing on the point is inside the reach. A walk that ends out of reach, with no path left, is ended by the pickup system too, as a cast out of range at the end of its walk is cancelled. A lift keeps it, as it keeps a move.
- **The split.** `domain/orders/state-machine.ts` is at 496 lines. It becomes one file per family, all under `domain/orders/` so the architecture test's order-write rule needs no edit: `state-machine.ts` keeps issuing, clearing, and walking (`issueMove`, `issueAttackTarget`, `issueAttackMove`, `issueCast`, `clearOrder`, `beginMoving`, `beginFacing`, `setApproachPoint`, `arrive`); `attack-transitions.ts` the attack's five; `cast-transitions.ts` the cast point, backswing, channel, and `finishBackswing`; `life-transitions.ts` `die`, `respawn`, `suspendOrder`, `resumeOrder`; and `pick-up-transitions.ts` the new two. No file joins `eslint/size-limit.js`.
- **The command system** resolves the ground item, refuses a stale id or gold and globes, and issues the order at the item's point, which is legal ground by construction.

---

## 5. Stats

- **The armory reaches the pipeline as totals, not as one modifier source per slot.** ADR 0011 replaced the rows the ticket's wording names: each armory keeps one flat and one percentage sum per stat, rewritten whole from its ten slots on an equip or unequip; the stats system copies the active form's totals into the hero's first each tick; every unit's modifier table references the totals it adds, zeros for all but the hero. `MODIFIER_TABLE_SIZE` stays 22.
- **A line's value is in the designer's units on the item**, as content writes it, so a tooltip shows it as written; the totals rewrite converts it into the simulation's units, a regeneration per second into per tick, once, reading its source definition's stat, unit, and whether it is flat or a percentage.
- **Magic damage %** is read by `magicAmplification` in `domain/combat/damage.ts` through the one pipeline, the attacker's rows plus the totals its table references, over a base of 0, at every magical hit whose source is the hero: a spell's first hit, its burns, and a hook's damage the hero is credited with. It never reads for a physical or pure hit, and a summon's table references zeros, so neither the hero's attack nor Emberling's is amplified. Because the read is over a base of 0, an item's "+10% magic damage" line adds **0.1 to the flat sum** of `magic_damage`, not to its percentage sum; the affix and base definitions say so for that stat.
- **No item touches an orb level** (Q92): no stat line names an orb, and the orb level readers read nothing from the armory.

---

## 6. A named boss's Legendary

**A pack field.** `PackDef` gains `legendaryId: string | null`, every field required, `null` for every pack but the three the long road names (packs 14, 28, and 37, Q100). The map kind's check refuses an id that names no Legendary piece and one on a pack whose tier is not boss. The chance, 10%, is the boss loot table's `legendaryChance`, so it is tunable with the rest of the table (ADR 0014); the piece holds only its identity.

At a boss's death, the drop reads the unit's pack id, finds the map-scope pack record with that id (a walk of at most the map's packs), and rolls `lootLegendary` against the chance if its definition names a piece. A pack the panel spawns has no record, so its boss drops no Legendary; a pack that slept and woke keeps its record, so its boss still does.

A loot table keyed by map and pack was rejected: a pack's index moves whenever a map's pack list is edited, and a generated map of the descent would have to write a second table beside the packs it generates. A field travels with the pack, and a generator writes it where it writes the tier.

---

## 7. Room for phase 9

- **The bank's place** is run scope, beside the inventory: six item records made with the world, with place range 300 to 305 reserved in `item-place.ts`. A command naming a bank slot is a new variant beside the item commands; `equip_item`'s armory slot never widens to it.
- **The keys.** The inventory screen claims only the key that toggles it; Escape is the claim's; the store claims no key; Alt is presentation state. None of T, X, V, C, G, or Space is taken by any phase 8 screen, control, or mapping, and the presentation page says so. The slot-key variant stays 1 to 6; the bank's keys are phase 9's own variant, and the tie-break extends then.
- **The store's Misc tab** lists active items from their own definitions at their fixed price, not from the stock, so the stock record and its roll do not change for them.
- **Their clocks** stay on the hero's unit keyed by ability id (ADR 0011), and they cast through the pipeline, where magic damage already reads.
- Whether an active item is the same item value with its own id in place of a base, or a record of its own in the bank, is phase 9's first ticket's: either fits the bank's place and range.

---

## 8. Tuning at item scale

**Loot tables are tunable; bases, affixes, the rarity table, and Legendary pieces are not** ([ADR 0014](../../docs/adr/0014-of-item-content-the-tuning-surface-reaches-only-the-loot-tables.md)). ADR 0009's rule reaches the five item kinds only where a retune cannot reach what the player already holds.

- The four untunable descriptors carry `tuning: null`, as `mapKind` does. An edit to one reloads the page under the dev server; headless work reads the files.
- The loot table's descriptor names the kind word `loot`: `def:loot:<id>:<field path>`. There is one table per enemy tier, `normal`, `elite`, and `boss`, and one for the store, `store`, so the store's rarity weights sit with the others. A roll reads a table defensively: a chance clamped to between none and always; a rarity by its weight over the sum of the weights the roll allows; a weight below zero as zero; nothing when the allowed sum is zero.
- The flat tunables in `content/tuning.ts`: `pickup_radius`, `health_globe_restore`, `mana_globe_restore`, `drop_placement_radius`, `store_sell_fraction`.

---

## 9. The architecture test's import table

**No new row, and no door changes.**

- `domain` imports only `shared`; the three new folders are inside it.
- `simulation` registers two systems and creates records through `domain/rules.ts`.
- `content` imports the new definition types through `domain/public.ts`.
- `presentation` reads the world view and asks `domain/queries.ts` for the fit test, the requirement, the prices, the place encoding, and the checkpoint reach.
- `devtools` previews a loot table through `domain/queries.ts`, already open to it, and sends the grants through `DevApi`.
- `app` registers two view syncers and three screens.

Nothing imports anything it cannot import today. What P8-S31-T03 onward adds to the test is placement, held by the existing rows; no file joins the size-limit list, since the command variants, the debug grants, the item shape checks, and the order machine's families each get a file of their own.

---

## 10. What this brief changed

**Decision records**, both Proposed until the maintainer reads them, a box under Waiting on a person:

- [ADR 0013 — Loot on the ground is a pooled entity that stays until the map is made again](../../docs/adr/0013-loot-on-the-ground-is-a-pooled-entity-that-stays-until-the-map-is-made-again.md)
- [ADR 0014 — Of item content, the tuning surface reaches only the loot tables](../../docs/adr/0014-of-item-content-the-tuning-surface-reaches-only-the-loot-tables.md)

**Pages amended to the target:** [world model](../../docs/architecture/world-model.md) (the ground item, the held records, the five item kinds, the relationships), [entities and pools](../../docs/architecture/entities-and-pools.md) (capacity, the order target's tag, the inventory grid, ground items, the store), [commands and events](../../docs/architecture/commands-and-events.md) (the item and store commands, the columns, the events and fields), [where to look](../../docs/architecture/where-to-look.md), [presentation](../../docs/architecture/presentation.md) (bands, views, labels, Alt, the pick port's icons, the ring click, the item screens and their keys), [simulation loop](../../docs/architecture/simulation-loop.md) (an item roll's keys), [content and registries](../../docs/architecture/content-and-registries.md) (the checks, the tunable kinds), [ability pipeline](../../docs/architecture/ability-pipeline.md) (magic damage read with the totals), [layers](../../docs/architecture/layers-and-dependency-rule.md) (what the domain and content hold, where item code goes), the [ADR index](../../docs/adr/README.md), the [docs index](../../docs/README.md)'s task row, and [items and loot](../../docs/product/features/items-and-loot.md) (a drop to a spot, no fading, the capacity edge case, where a swapped item goes).

**Tickets edited in place** with a note of 2026-09-28: P8-S31-T03; P8-S32-T01, T02; P8-S33-T01, T02, T03; P8-S40-T01; P8-S34-T01, T02, T03; P8-S35-T01, T03, T04; P8-S36-T01, T02, T03, T04. P8-S32-T03 and T04 are unchanged.

**Open question:** [Q104](./implementation/backlog/open-questions.md), the choices the docs did not settle, decided provisionally.
