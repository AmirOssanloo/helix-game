# Sprint 43 — The column and the first three actives

**Phase:** 9 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 9 README](./README.md)'s sketch

> **Phase 8's bucket runs first.** If the maintainer's phase 8 run is triaged while this sprint is open, P8-S37-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)).

## Goal

Silence leaves the active items alone and a stun or a lift does not; the player moves an item between the bank and the inventory by hand; damage grows with the hero's level; and Scorchglass, Fetter Bolas, and Mainspring are bought, banked, and fired.

## Playable outcome

On the long road with the 12 000-gold grant, buy Scorchglass, Fetter Bolas, and Mainspring. Root a pack with the bolas, burn one with Scorchglass, empty the kit's clocks, fire Mainspring, and fire the combo again. Drag Mainspring from its bank square into the inventory and back onto G. Get silenced by a hexer and see the three keys still fire.

---

## Tickets

### P9-S43-T01 — The disable matrix's active-item column

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 0.5 |
| Depends on | P9-S42-T02 |
| Owner | The game engineer |
| Status | done |

> **Note, 2026-09-28, at the cut:** sized 1 in the sketch with the self-lift row. That row needs the flag `invulnerable`, which P9-S44-T01 makes, and P9-S44-T02 already carried it, so it was counted twice. This ticket is the column alone, at 0.5; the half day went to T02.

> **Note, 2026-09-28, from P9-S41-T01:** the column is written in the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) (the "Disables" bullet and the quick reference's "The active-item column") and in [commands and events](../../../../docs/architecture/commands-and-events.md) ("Item command columns"); this ticket checks both against the build. The matrix is content, so if the content version covers it, the version moves and `pnpm restamp` re-stamps; no stored checksum moves, since no stored log holds an activation. **Size holds at 0.5.**

> **Note, 2026-09-29, from P9-S42-T02:** the validator's `activate_item` case in `src/domain/orders/validator.ts` checks the place and the target only, and `activationReadiness` in `src/domain/abilities/cast.ts` death, the clock, and the cost; the column goes into both, so the validator refuses by it and the HUD greys by it. The active block's root refusal is already in the request stage. A stored log now holds an activation only in a spec's own recording, so the note above holds: no stored checksum moves. **Size holds at 0.5.**

> **Note, 2026-09-29, from P9-S42-T03:** the presentation reads the column in two places this ticket's build reaches. The HUD's bank row greys a square from `activationReadiness`, so the column added there greys it and the flash stripes it with no presentation change. The item's cursor in `src/presentation/input/input-mapper.ts` (`syncCursor`) closes on death alone and skips the matrix for `cursor.kind === "item"`; with the column, it closes when the column says closed, as a slot cursor reads `targetingCursor` (Q141 (6)). `tests/presentation/input-mapper.spec.ts` has the case "leave an item's cursor open under a silence", which stays true, and gains one for a stun. **Size holds at 0.5.**

> **Note, 2026-09-29, at the close:** the column is `activeItems`, between F and Move as the page writes it, and read through one query, `activationRefusal`, on the queries door: the validator refuses by it before the place's checks, as it does every command's disable, `activationReadiness` refuses by it after death, so the bank row greys and the flash stripes with no presentation change, and the mapper closes an item's cursor where it refuses. The architecture pages already said so but for [presentation](../../../../docs/architecture/presentation.md)'s two lines on the item's cursor, now brought to it. The content version moved and `pnpm restamp` re-stamped the seven stored logs; no checksum moved.

**Build:** `DisableCellsDef` gains the active-item column and `COMMAND_COLUMNS` reads it for `activate_item`: allowed under silence, root, disarm, slow, and every row but stun and lift, which refuse it (Q121, the [disable matrix](../../../../docs/product/specs/disable-matrix.md)'s notes 17 to 20). Slipknife's refusal under root is its active block's, not the column's.

**Acceptance:**
- One test per cell of the column for every existing status row.
- It plays: a silenced hero activates an item; a stunned one is refused `stunned`, in a simulation spec.
- The bar: the validator allocates nothing; the stress tier green.

**Tests:**
- `tests/domain/orders/disable-matrix.spec.ts`: the column's cells.
- `tests/content/disable-matrix.spec.ts`: the column present for every row.

**Pages:** the disable matrix, checked; [controls and orders](../../../../docs/product/features/controls-and-orders.md), checked.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P9-S43-T02 — An active item moved between the bank and the inventory on screen

| Field | Value |
| --- | --- |
| Layer | presentation, domain, tests, docs |
| Size | 0.5 |
| Depends on | P9-S42-T01, P9-S42-T02, P9-S42-T03 |
| Owner | The game engineer |
| Status | done |

> **Note, 2026-09-28, at the cut:** not in the sketch. The item catalogue's section 7.2 says the player moves an active item between the bank and the inventory, and between two places of the bank, as any item is moved; the sketch built the domain half in the bank ticket and no gesture. Paid for by T01's half day.

> **Note, 2026-09-29, from P9-S42-T04:** an active item in the inventory's grid is still drawn as a white `disc`, since `inventory.screen.ts`'s `showItem` tints by rarity and an active item has none ([Q142](../backlog/open-questions.md) (5)). This ticket's lift makes that visible, so the grid's item takes `ACTIVE_ITEM_TINT` here, a line in `showItem` beside the lift; `inventory.screen.ts` is 494 lines, so it may need to move with the lift's code. **Size holds at 0.5.**

> **Note, 2026-09-29, at the close:** **Layer row edited:** domain added, since the presentation rules say a verdict is asked of the queries door and nothing there said whether a move with the bank goes through; `movesWithBank` in `src/domain/items/bank.ts` reads it without changing anything, beside `moveWithBank`, which applies it. **The lift.** `InventoryLift` holds a pressed place, a grid cell or a place of the bank, and lifts a placed record or a bank place; an item from the bank is drawn at its size in the grid, its grab scaled from the square. Six more marks, one per bank square, are made after the forty cell marks. Over a square the lift marks that square alone; `setDownPlace` answers the square's place or the cell, or nothing where the item lay or the move would be refused, from `moveOutcome` within the grid and `movesWithBank` with the bank at either end. The screen claims the bank's squares with its panel while it is open, so a press there is the screen's and the bar's while closed; the release sends one `move_item` from `liftedPlace` to the place, the refusal flashing the item as before, by the grid's flashes for a cell and the HUD's for a bank place. The HUD scene shows no bank tooltip while a press is held. **The tint.** The grid's item dressing moved to `inventory-dress.ts`, with the item tints, so the screen stays under 500 lines at 493; an active item is drawn in `ACTIVE_ITEM_TINT`, and the store's files import the tints from there. The readings no page settled are [Q143](../backlog/open-questions.md), decided provisionally. Tests: `tests/presentation/inventory-screen.spec.ts` (11 new cases: the emerald item in the grid; grid to an empty square, bank to the grid, and square to square each sending one `move_item` and applied on the tick; a square blocked under an item not active; an occupied square free with room and blocked with none; cells blocked under an item from the bank; nothing sent on its own square or a click; no lift while closed; a refused move flashing the item where it stays; nothing allocated over 2 000 frames of a lift carried across the grid and the bank), `tests/domain/items/bank.spec.ts` (14: `movesWithBank` against the move applied, within, into, and out of the bank, with the grid roomy and full). `pnpm check` green, 5625 tests. Of six full runs under a load average between 16 and 27, three were green and three failed on heap allowances alone, never on a collection: the stats system's case at 73 000 to 73 688 bytes against its 65 536 in two, the bank's steady-state move case at 332 976 against 262 144 in two, and the activation's steady-state case at 1 367 376 against 262 144 in one. Run alone together eight times on this change they failed once, the stats case, and three times on the parent they passed; the stats case is the one T01 and the sprint 42 tickets recorded failing on the parent under load. None of the three measures anything this change touched: the bank's case moves by `moveWithBank` and the activation's activates, both unchanged, and `movesWithBank` is read by no system. No ticket is raised. The stress tier green. **Played by an agent** in headless Chrome over the DevTools protocol on the Apple M1 (ANGLE Metal), 1920 by 1080, the dev build with the panel, with two active items written into `src/content/items/actives/index.ts` for the look and reverted after, since Mainspring is T06's, one 1 by 2 casting Quicken standing in for it, written into T through the panel's world view: I opened the inventory; it was dragged from T into the grid at cell 12, the cells 12 and 22 marked green under it and T still drawn; from the grid onto G, G's square marked green; from G to X and back; then with the inventory closed, G sent the activation, Quicken on the hero and its clock at 673, so the key followed it; a drag from G with the inventory closed moved nothing. No console error. **The inventory's frame**, the same Chrome, the inventory open and a lift held with the pointer moving every 50 ms, 30 s after an 8 s warm-up: an item from the bank carried over the grid and the squares, **60.02 fps, frames 16.6 to 16.8 ms, 2 draw calls a frame**; an item from the grid carried over the grid, 60.02 fps, 16.6 to 16.8 ms, 2 draw calls; the parent commit, the same grid lift: 60.02 fps, 16.6 to 16.8 ms, 2 draw calls. Unchanged. `pnpm bench` in a fresh Chrome: 60.02 fps, 16.6 to 16.8 ms, 1 draw call a frame, 65 MB after a collection, no console error, unchanged. Definition of done walked: every change holds (no optional property, no non-null assertion, no ticket reference in code, no file past 500 lines, `inventory-lift.ts` 429 and `inventory.screen.ts` 493, imports through the doors, `movesWithBank` added to the queries door); under `src/domain`, one pure read with no clock, randomness, allocation, or module state, a unit test against the rule it reads, no stored log touched, the stress tier green; under `src/presentation`, quads only, the six marks made at construction, colour a tint, the band over the screens, the sync asking the queries door, every press through the claim, no overlay, the benchmark rerun above; no new command, event, or system. Documentation: [items and loot](../../../../docs/product/features/items-and-loot.md#the-inventory-and-armory) gains the gesture's row and the emerald item; [presentation](../../../../docs/architecture/presentation.md) the bank row as a drop target and a source, the bank move query, and its quick reference; [where to look](../../../../docs/architecture/where-to-look.md) `inventory-dress.ts` and the bank's read. A look by hand waits under Waiting on a person, deferred by the standing instruction.

**Build:** the inventory's lift gesture (`src/presentation/screens/inventory-lift.ts`) reaches the bank row: with the inventory open, an item lifted from a bank square can be set down in the grid or on another bank square, and one lifted from the grid set down on a bank square, each sending the existing move command naming the bank place. A bank square shows green or red under a held item as a cell does. With the inventory closed the bank row takes no lift.

**Acceptance:**
- Each gesture sends one move command and nothing else; a refusal flashes the item.
- It plays: in Chrome by an agent, Mainspring dragged from its square into the grid and back onto G, and its key follows it.
- The bar: nothing allocates during a lift; the inventory's frame, by an agent, unchanged within noise.

**Tests:** `tests/presentation/inventory-screen.spec.ts`: the three gestures, the tints over a bank square, no lift with the inventory closed.

**Pages:** [items and loot](../../../../docs/product/features/items-and-loot.md#the-inventory-and-armory), checked; [presentation](../../../../docs/architecture/presentation.md), the bank row as a drop target.

**Definition of done:** Every change · Anything under `src/presentation` · A documentation change.

---

### P9-S43-T03 — The per-level amount term

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P9-S41-T01 |
| Owner | The game engineer |
| Status | done |

> **Note, 2026-09-28, from P9-S41-T01:** the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) ("Every amount is `base + perLevel × L`", "Amounts" and "The cast context" rows) places the term on the one amount shape wherever it is written, an effect list's entries and a status definition's tables alike, so the content version moves once, here; this ticket puts the caster's level into the cast context at commit, and effect lists read it. A status definition's amounts read the level the entry records when it lands, which P9-S44-T01 adds beside the applier's side; until then they read the term at zero, which every amount is. No stored checksum moves. **Size holds at 1**, provided the status tables share the effect lists' amount shape, as `amountAtOrbLevel` suggests; if they do not, the status half moves to P9-S44-T01 and this size still holds.

> **Note, 2026-09-29, at the close:** **Acceptance line edited in effect:** the stored checksums moved, with the play proved unchanged. The tuning state is hashed and gains one key per amount, and zones and projectiles now carry the caster's level, so no required term could leave a checksum where it was; the seven stored logs were replayed on the parent commit and on this one through a throwaway spec and matched units, projectiles, zones, gold, the inventory, the bank, the forms, and map scope every 50 ticks, and `pnpm restamp --checksums` then recorded them, stamps `263063f3` to `9cfdb592`. **The shape.** `Amount` in `src/domain/definitions/level-table.ts` is a level table with a required `perLevel` beside `orb` and `byLevel`, read by `amountAtLevels`, so every existing tuning key stands and the term's is the amount's path with `.perLevel`, in the amount's unit: `definitionFieldUnit` passes over `perLevel` as over `byLevel`, and a rate per second's term is divided per tick with its table. It is on a damage-area entry's amount, a status's damage and heal over time, and the siphon's burn, the amounts dealt, healed, or drained; a status modifier's table is a stat's change and keeps the plain table. **The level.** The cast context gains `level`, written by `fillCast` from `progression.level` at commit; zones and projectiles copy it with the orb levels and hand it back to the lists they run, and the checksum hashes both. A status's own amounts and its hook and expiry lists read the term at zero, since a status entry records no applier's level until P9-S44-T01 adds it, noted there. Every one of the eleven amounts content writes carries `perLevel: 0`. The readings no page settled are [Q144](../backlog/open-questions.md), decided provisionally. Tests: `tests/domain/abilities/amount.spec.ts` (9: the term at two levels and at zero, the damage-area primitive at levels 1 and 12, the per-tick division on an effect entry and on a status's rates, the tuning key in the amount's unit, and through the pipeline on Zenith retuned to 10 a level: the strike at levels 1 and 12, a level gained between the commit and the landing not counted, one gained in the cast point counted), `tests/content/abilities.spec.ts` (3: the walk finds every kind of amount, every amount carries the term, and every term reads zero), and `tests/domain/abilities/cast-context.spec.ts` and the two pool specs extended for the level. `pnpm check` green, 5638 tests, the stress tier green. Definition of done walked: every change holds (no optional property, no non-null assertion, no ticket reference in code, no file past 500 lines, imports through the doors, `Amount` on the public door and `amountAtLevels` on the rules door); under `src/domain` and `src/simulation`, no clock or randomness, the term read once on commit and copied, nothing allocated in a system, no switch added, rule tests for the read and a simulation case through the commit, every stored log replaying to its re-recorded checksums after the play was proved unchanged, the stress tier green; no new command, event, or system. Documentation: the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) says the level is copied onto zones and projectiles and the term is in its amount's unit, in the prose and the quick reference; [content and registries](../../../../docs/architecture/content-and-registries.md) the term's key and unit; [adding a spell](../../../../docs/workflows/adding-a-spell.md) the term on an amount and the level in the cast context. No person's check is asked for: nothing a player sees changes.

**Build:** every amount in an effect list gains a required per-level term: `base + perLevel × L`, where `L` is the caster's level when the cast commits, read once then. It is 0 on every existing amount; its tuning keys follow ADR 0009, the field path verbatim. The content version moves; `pnpm restamp` re-stamps the stored logs, and no checksum moves.

**Acceptance:**
- An amount with a term deals `base + perLevel × L` at the level on commit; a level gained between commit and landing does not change it.
- Every existing amount reads 0 and every stored log replays to its checksums.
- It plays: nothing a player sees changes until an active item uses it.
- The bar: the term is read on commit, not per tick; the stress tier green.

**Tests:**
- `tests/domain/abilities/amount.spec.ts`: the term at two levels, the level read on commit.
- `tests/content/abilities.spec.ts`: every amount carries the term.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the amount's shape; [content and registries](../../../../docs/architecture/content-and-registries.md), its tuning key.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

---

### P9-S43-T04 — Scorchglass

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 0.5 |
| Depends on | T01, T03, P9-S42-T04 |
| Owner | The game engineer |
| Status | done |

> **Note, 2026-09-29, from P9-S43-T03:** an amount is `{ orb, byLevel, perLevel }`, so Scorchglass's `120 + 12 × L` is a table of seven 120s naming any orb, with `perLevel: 12`; the content test in `tests/content/abilities.spec.ts` lists every amount whose term is not zero, empty until this ticket, which adds Scorchglass's to it. **Size holds at 0.5.**

> **Note, 2026-09-29, at the close:** **Acceptance line edited in effect:** the stored checksums moved, with the play proved unchanged, as in T03: the ability's 25 tuning keys joined the hashed tuning state. The seven stored logs were replayed with and without Scorchglass through a throwaway spec, the content without it stamping exactly as the logs did, and matched the whole world state but the tuning table every 50 ticks, 641 comparisons over 31 550 ticks; `pnpm restamp --checksums` then recorded them, stamps `9cfdb592` to `b4c0f136`. **The files.** `src/content/items/actives/scorchglass.def.ts` is the item, 1800 gold, 1 by 2, not refused under root; `src/content/abilities/scorchglass.def.ts` its ability, of the same id: a unit within 700, no cast point and no backswing, 30 s, 120 mana, one `damage_area` on the target of `{ orb: "ember", byLevel: seven 120s, perLevel: 12 }` magical damage, once. Nothing was added to the pipeline: magic damage % raises it at the damage door and cooldown reduction shortens its clock at commit, as for any cast. The readings no page settled are [Q145](../backlog/open-questions.md), decided provisionally. **The catalogue held to the file:** `tests/content/actives.spec.ts` reads sections 7 and 7.1 of the [item catalogue](../../../../docs/product/specs/item-catalogue.md#71-what-each-does) and holds every active item content writes to its rows: its id and price, its target, range, cast point, cooldown, and mana, and every `A + B × L magical damage` it deals against its ability's magical damage entries; it fails on a one-point change of the term. The tests that speak of enemy abilities now read those no active item casts, and the two store specs' registries hold no active item when a case asks for none, since content now defines one. Tests: `tests/simulation/actives/scorchglass.spec.ts` (9: the item and ability at the catalogue's numbers; 132 and 264 on a long-road tank at hero levels 1 and 12, less its resistance, on the tick the command lands; level 12's hit twice level 1's; with a worn +10% magic damage at both levels, 10% over the plain hit; 120 mana spent and a 900-tick clock, a second firing refused `on_cooldown`; refused `not_enough_mana`; and 100 000 activations and casts through the cast system on the training dummy, after 100 000 to warm, with no collection and the heap under 256 KB), `tests/content/actives.spec.ts` (2), and `tests/content/abilities.spec.ts`'s one non-zero term, Scorchglass's 12. `pnpm check` green, 5654 tests, the stress tier green. Of five full runs under a load average between 8 and 38, two were green, the last on the final tree, and three failed on allocation cases alone: the state checksum's "does not allocate once it is warm" timing out at 5 s in all three, and in one the stats system's case at 73 696 bytes against 65 536, the one T01 and T02 recorded. Run alone, the checksum's case misses its 256 KB by the same 315 688 bytes on the parent commit as on this one, so this change did not move it; no ticket is raised. **Played by an agent** in headless Chrome over the DevTools protocol, the dev build with the panel: 12 000 gold granted, the long road's first checkpoint, the store opened; Misc listed Scorchglass as an emerald disc named SCO; a click bought it, 12 000 to 10 200, into T, where the bank row drew it in emerald with its cost 120; with an elite tank spawned beside the hero, T pressed and the tank clicked took the tank from 300 to 201 health, a 99 hit, 132 less its 25% resistance; mana 255 to 135.6; the clock set 900 ticks out. The tank then killed the idle hero, and the death cleared the clock, as it clears every clock; a second firing set it again. No console error. Definition of done walked: every change holds (no optional property, no non-null assertion, no ticket reference in code, no file past 500 lines, imports through the doors, the item and its ability on the content's public door); a new spell, effect, or enemy ability: one definition file for each, added to its index; every key resolves and the content tier passes; the stored logs re-stamped, their checksums re-recorded after the proof above; the frames `disc` and `ring_thick` exist; the simulation test at hero levels 1 and 12, since the ability scales with the hero and not an orb; targeting, cast point, cooldown, and mana from the definition, no special case; the in-game check by an agent above, on the long road rather than the arena, since the store is there. A documentation change: [where to look](../../../../docs/architecture/where-to-look.md), the [world model](../../../../docs/architecture/world-model.md), and [adding a spell](../../../../docs/workflows/adding-a-spell.md) say `src/content/abilities/` holds the abilities active items cast too; the item catalogue is unchanged and held by the content test. A look by hand waits under Waiting on a person, deferred by the standing instruction.

**Build:** Scorchglass as an active item and its ability, at the catalogue's section 7.1 numbers: an enemy within 700, no cast point, `120 + 12 × L` magical damage at once, raised by magic damage % (Q93), 30 s, 120 mana, 1800 gold. Nothing added to the pipeline.

**Acceptance:**
- The damage at hero levels 1 and 12, with and without magic damage % worn.
- It plays: bought, banked, and fired on a long-road enemy from its key in a simulation spec.
- The bar: nothing allocates on the cast.

**Tests:** `tests/simulation/actives/scorchglass.spec.ts`: the damage at two levels, the amplification, the clock and the mana.

**Pages:** the [item catalogue](../../../../docs/product/specs/item-catalogue.md#71-what-each-does), held to the file by the content test.

**Definition of done:** Every change · A new spell, effect, or enemy ability · A documentation change.

---

### P9-S43-T05 — Fetter Bolas

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 0.5 |
| Depends on | T01, T03, P9-S42-T04 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-29, from P9-S43-T03:** a projectile carries the caster's level from the commit, so the damage its hit list deals reads `60 + 6 × L` at the level cast; the content test's list of amounts with a term gains the bolas'. **Size holds at 0.5.**

**Build:** Fetter Bolas at the catalogue's numbers: a point within 1100; a projectile at 1500 a second to the point, then every enemy within 250 rooted for 2 s and dealt `60 + 6 × L` magical damage; 18 s, 100 mana, 1600 gold. Primitives only.

**Acceptance:**
- Every enemy in the radius rooted and damaged; none outside it.
- It plays: a long-road pack caught and held in a simulation spec.
- The bar: one projectile from the pool; nothing allocates.

**Tests:** `tests/simulation/actives/fetter-bolas.spec.ts`: the flight, the radius, the root's length, the damage at two levels.

**Pages:** the item catalogue, by the content test.

**Definition of done:** Every change · A new spell, effect, or enemy ability · A documentation change.

---

### P9-S43-T06 — Mainspring and `refresh_clocks`

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | T01, P9-S42-T04 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** `refresh_clocks` is written in the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) ("Active items" and its quick-reference row); this ticket checks the page against the build rather than writing it. No stored checksum moves. **Size holds at 1.**

> **Note, 2026-09-29, from P9-S43-T02:** the drag between the bank and the grid was played in Chrome with a stand-in item, since Mainspring is this ticket's; this ticket's play in Chrome drags Mainspring itself from its square into the grid and back onto G, the sprint's playable outcome. **Size holds at 1.**

**Build:** the named effect `refresh_clocks` ends every clock the hero holds but the casting ability's own: the prepared spells', Invoke's, the hidden clocks of spells no longer in D or F ([R33](../02-risks-and-hidden-work.md)), and every active item's. Mainspring at the catalogue's numbers: no target, 180 s, 250 mana, 3000 gold.

**Acceptance:**
- After Mainspring, every clock but its own reads ready, a spell evicted from D and F before it included.
- It plays: the combo cast, Mainspring, and the combo cast again at once, in a simulation spec.
- The bar: the effect walks the hero's clocks with no allocation.

**Tests:** `tests/simulation/actives/mainspring.spec.ts`: each kind of clock ended, its own left running.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the named effect; the item catalogue, by the content test.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The active-item column, one test per cell | Done: 9 rows of 16 columns, 144 cells in `tests/domain/orders/disable-matrix.spec.ts`, the column in every row in `tests/content/disable-matrix.spec.ts`; silenced, rooted, disarmed, and slowed heroes activate and stunned and lifted ones are refused `stunned` in `tests/simulation/items/activation.spec.ts` |
| An active item moved between the bank and the inventory, by an agent in Chrome | Done in T02, 2026-09-29: `tests/presentation/inventory-screen.spec.ts` sends one `move_item` for each of grid to square, square to grid, and square to square, marks a square free or blocked by `movesWithBank`, lifts nothing while closed, flashes a refusal, and allocates nothing over a carried lift; `tests/domain/items/bank.spec.ts` holds the read to the move applied. In headless Chrome by an agent, with a stand-in item for Mainspring, which is T06's: T to the grid, the grid onto G, G to X and back, and G then firing it; nothing moved with the inventory closed. Mainspring itself is dragged in T06's play. A look by hand waits on a person, deferred |
| The per-level term, every stored log replaying | Done in T03, 2026-09-29: every amount carries `perLevel`, zero on all eleven content writes, read at the caster's level on commit in `tests/domain/abilities/amount.spec.ts`; every stored log replays, its checksums re-recorded after the play was proved unchanged every 50 ticks on the parent commit and this one, since the hashed tuning state gained the term's keys (Q144) |
| Scorchglass, Fetter Bolas, and Mainspring at their catalogue numbers | Scorchglass done in T04, 2026-09-29: the item and its ability held to the catalogue's sections 7 and 7.1 by `tests/content/actives.spec.ts`; bought, banked, and fired on a long-road tank in `tests/simulation/actives/scorchglass.spec.ts` at levels 1 and 12 with and without magic damage %, and by an agent in headless Chrome from its key. Fetter Bolas and Mainspring to come |
| The render benchmark, by an agent | T02, 2026-09-29: `pnpm bench` in a fresh headless Chrome on the Apple M1, 30 s after an 8 s warm-up, draw calls counted by wrapping the WebGL draw methods: 60.02 fps, frames 16.6 to 16.8 ms, 1 draw call a frame, 65 MB after a collection, no console error, unchanged from sprint 42's 60.00, 16.5 to 16.8, 1. The inventory's frame with a lift held and moving: 60.02 fps, 16.6 to 16.8 ms, 2 draw calls, against the parent's 60.02, 16.6 to 16.8, 2 |
| Phase 8's bucket tickets run in this sprint, if any | |
| Actual days per ticket | T01: 0.5; T02: 0.5; T03: 1; T04: 0.5 |
| Sprint total | |

## Risks in this sprint

- **The per-level term touches every amount.** It is data at 0 everywhere, so a moved checksum is a bug, not a re-record (R36).
- **Mainspring and the hidden clocks** (R33): the evicted spells' clocks are the ones easy to miss; the spec names each.
