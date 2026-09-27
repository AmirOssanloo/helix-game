# ADR 0011 — An item is a value the hero holds in run scope

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                                                         |
| ----------------- | ----------------------------------------------------------------------------- |
| **Status**        | Proposed                                                                      |
| **Date**          | 2026-09-27                                                                    |
| **Deciders**      | The engineering architect; Proposed until the maintainer reads it             |
| **Supersedes**    | None; amends [ADR 0003](./0003-layered-single-package-architecture.md)'s hero rule |
| **Superseded by** | None                                                                          |

## Context

Items are coming: an inventory of ten by four cells in which an item takes the cells its base's size gives, ten armory slots that change the hero's derived values, gold, items lying on the ground, a store, and later a bank of active items that are cast like abilities. Before any of it is built, three places disagree about where an item lives.

- [ADR 0003](./0003-layered-single-package-architecture.md) and [Entities and pools](../architecture/entities-and-pools.md) put an armory on each form record and "item slots" on the hero's unit.
- The form record in code holds an armory field that is always empty, and the unit holds no item slot.
- The product pages give each form its own armory and have the forms share the hero's other items; the loot plan puts the inventory and the armory in run scope and never names a form.

Two more questions ride on the answer. The first is what an item *is* in memory. An item that moves between the inventory, an armory slot, the ground, and later the bank has to mean the same thing in every place, and has to keep meaning it when a designer edits the catalogue: an item that dropped with +7 armour must not become +9 because the affix's range moved. The second is where an item's contribution to a derived value lives. Every unit has a modifier table of 22 rows, sized for today's sources alone; raising it from 16 grew a world's heap by 4.2%, because the unit pool holds 512 of them whether the unit is the hero or a dummy. Ten armory slots, each with an implicit stat and up to five affixes, are up to 60 rows on one unit.

The engineer building the inventory feels this first. The next one feels it more: the one who makes an active item's clock survive a trip to the ground and back, and the one who reads a profile and finds every enemy carrying rows only the hero can fill.

## Decision

**An item is a fixed-shape value, and the hero holds it in run scope. What it adds to the hero's stats reaches the modifier pipeline as one set of totals per form, never as rows on a unit.**

**Where items live.** All of it is run scope, and none of it is on the unit, whose shape every pooled enemy shares.

| What | Where | Why there |
| --- | --- | --- |
| The inventory and gold | Run scope, once for the hero | The product pages have the forms share the hero's items; a map load keeps them, as it keeps the hero |
| An armory of ten slots | On each form record, in run scope | The product pages give each form its own armory; with one form this is one armory |
| The totals the active form's armory adds | Run scope, once for the hero | So a reader of a stat needs no form and no slot |
| The bank of active items, when it comes | Run scope, once for the hero, beside the inventory | Shared by the forms, as the inventory is |
| An item on the ground | A ground item in map scope, holding the same value inline | A map load releases it with every other map-scoped thing |

**What an item is.** An item instance holds its base's id, its rarity, its item level, and one stat line per stat it carries: the implicit stat, each affix, or each fixed line of a named piece. A line holds the id it came from in content and its value, written once when the item is made. Every field is present on every instance, with a count saying how many lines are live, and the number of lines is a named constant set to the most any item in the catalogue carries. There are no content indices in it, so reordering a content file changes nothing, and no value read back from a definition, so retuning a range changes no item that already exists. A content change that removes an id an item names is a change of shape, and the page loads again, as for any definition.

**An item has no id of its own.** It is a value, like a position. Moving it between a cell, an armory slot, the ground, and the bank copies its fields into the destination's record and clears the source's, which allocates nothing because both records are made with their owner. A command names a place, a cell or an armory slot, never an item, and a ground item is named by its own generational id, as any entity is. Two items with the same base, rarity, and lines are the same item wherever they are.

**How an item's stats are read.** The armory on a form keeps, beside its slots, a totals record: one flat sum and one percentage sum per stat. An equip or an unequip rewrites it whole from the ten slots, a walk of at most 60 lines on the tick the command lands and never otherwise. At the start of the stats system, the active form's totals are copied into the hero's totals on run scope, so a form swap still changes only the active index, and an equip or a swap is in the values of the tick it lands on.

Every unit's modifier table carries one reference more: the totals it adds. The hero's is the hero's totals on run scope, set when the hero's unit is placed; every other unit's is one shared totals record of zeros made with the world, set when its slot is made. The modifier pipeline adds a table's totals to its row sums for every stat it reads, in the derivation and at the moment a rule reads a stat: an attack's damage at the shot, magic damage at a magical hit, cooldown reduction when a clock starts, and movement speed in the speed stack. No reader names the hero. The totals add inside the sums the pipeline already takes, `(base + Σflat) × (1 + Σpercent)`, so an item's +10% and a status's +10% are one +20%.

```typescript
// an item on the hero reaches every read of a stat through the table, never through a row
const foo = modifiedValue(fooBase, fooTable, "foo_stat")   // the table's rows for the stat, plus its totals
```

**What this costs at the 200 live cap.** In memory: a totals record per form, one for the hero, and one of zeros; a reference on each of the 512 unit slots, about 4 KB; and the item values themselves, 40 inventory records and 10 per form. In time: every other unit's derivation and every other read add a zero total, two additions a stat; the hero's copy is 22 numbers a tick. The unit's modifier table stays at 22 rows, sized for statuses and orbs, and no item source kind remains on it.

**The clock of an active item stays where [ADR 0003](./0003-layered-single-package-architecture.md) put cooldown clocks**, on the hero's unit, keyed by ability id. Moving an item touches no clock, so its cooldown survives any move with no rule for moves; two copies of one active item share one clock, and selling a cooling item and buying another does not reset it. If the bank's design wants a clock per copy, that clock is one field on the instance and is copied with the rest.

**What the equipment ticket builds.** The armory's totals record and its rewrite on equip and unequip, the copy at the start of the stats system, the totals reference on the modifier table and its addition in the one pipeline, and magic damage % read through that pipeline off the attacker. It adds no row, no source kind, and no capacity to the unit's table.

## Consequences

### What this makes easy

**An enemy never pays for the hero's gear.** The 512 slots of the unit pool keep their table at 22 rows whatever the hero wears, so the heap stays where the last measurement put it and the stats system's walk over 200 enemies does the same work it does today.

**An item means the same thing everywhere it goes.** A designer who retunes an affix's range changes what drops next, never what the player is holding. A bug report with an inventory in it reads the same on the next build as on this one.

**A move is a copy, and a command names a place.** The inventory, the armory, the ground, and the bank are records made once with their owner; moving an item between them is a handful of field writes, and the input log reads "equip from cell 3, 1", which replays without any item id having to be minted the same way twice.

**A stat reads one way for every unit.** Attack damage, magic damage, cooldown reduction, and movement speed each have one read, and the hero's gear is in it without a branch. A test of the pipeline hands a table any totals it likes.

**Forms stay one index.** The armory follows the form, as the product pages say, and a swap still changes the active index and nothing else; the stats system sees the new form's armory on the tick of the swap.

### What this makes hard

**Two things sum into a stat, not one.** A reader who looks only at the rows of a table misses the gear. The pipeline is the one place that adds both, and a test holds every read to it, but a new read that walks the rows by hand is a bug this shape invites.

**An item's size is fixed by the catalogue.** The count of lines is a constant, so an item with more lines than the most the catalogue gives needs the constant raised, which grows every inventory, armory, and ground-item record at once. It is small, and it is not free.

**Items with the same parts are indistinguishable.** Nothing can refer to "this sword" across a move, since there is no id. A feature that needs to follow one copy, such as a clock per copy or an item's history, carries its own field on the instance.

**A retune does not reach items already held.** It is the point, and it will surprise a designer who expects the panel's slider to move the sword in the inventory. The panel's grant is the way to see a retuned item.

**Per-form armories are chosen before a second form exists.** With one form they cost nothing. When a second form arrives, whether it may wear what the first form wears, and what happens to its armory on a swap, are product questions this record does not answer.

## Alternatives considered

**An item's rows on every unit's modifier table, each row tagged with its source.** The most uniform: one kind of row, one walk, and a status's rows and a sword's side by side. It lost on memory. Sixty item rows on a table of 22 make every one of the 512 slots carry 82, and the six rows added before cost 4.2% of a world's heap, so this is about ten times that, for rows only one unit can ever fill. Every row would also need its source's slot to be removed whole, and a status's first-empty-row search would walk past sixty item rows on every application to the hero.

**One row per stat on the hero's table, summed from the armory.** At most eleven item rows, rewritten whole on an equip. Close, and cheaper than the first. It lost because the unit's table is one shape for every unit, so the eleven rows are still paid 512 times, and it keeps an item source kind on a table that otherwise holds only what a status or an orb writes.

**The armory's totals read only by the hero's derivation.** This was the lean going in. It covers the values the stats system writes, and misses the four stats a rule reads at the moment: an attack's damage, magic damage, cooldown reduction, and movement speed. Magic damage % is an item stat by name, so a record that stopped at the derivation would leave the one stat items are built for unread.

**An item instance with an id, in a run-scope pool, referenced from the inventory, the armory, and the ground.** Every copy could then be followed, and a clock could hang off the id. It lost because an item on the ground lives in map scope and one in the inventory in run scope: a map load would have to find and free every pooled item whose only reference was a released ground item, and an id minted on a drop would have to be minted identically on replay for the log to name it. A value needs neither.

**One armory for the hero, shared by every form.** Simpler, and what the loot plan's wording suggests. It lost because the product pages give each form its own armory; changing that is a product decision, and with one form the per-form armory costs nothing today.

## Revisit when

- A second form arrives. Whether forms share an armory, and what a swap does to what is worn, are asked then.
- The catalogue grows past the line count the constant allows, or past about a thousand items. Then the instance's size is measured against the inventory and the ground-item pool.
- Something must follow one copy of an item: a clock per copy, a durability, a socket. It is one field on the instance first; an id is the second answer.
- A profile shows the added totals costing measurable time on the 200 units that read zeros. Then the pipeline skips a zero record.

## References

Nothing enforces it yet; the tickets that build items do:

- The unit's modifier table stays at `MODIFIER_TABLE_SIZE` with no item source kind, and a test of the pipeline holds every stat read to rows plus totals.
- The state checksum covers the inventory, the armory, gold, and the hero's totals once they exist, so a replay that disagrees about an item fails.
- The content reload's shape check refuses a change that removes an id an item names, by loading the page again.

---

## Related documentation

- [Entities and pools](../architecture/entities-and-pools.md) — the two lifetimes, and the hero's forms
- [ADR 0003 — Layered single-package architecture](./0003-layered-single-package-architecture.md) — the run scope and the form record this record places items in
- [ADR 0004 — All mutation enters as commands](./0004-all-mutation-enters-as-commands.md) — why an equip or a move is a command naming a place
- [Simulation coding standards](../standards/simulation-coding.md) — the allocation rule a move by copy keeps
- [Vocabulary](../product/vocabulary.md) — armory, inventory, and item
