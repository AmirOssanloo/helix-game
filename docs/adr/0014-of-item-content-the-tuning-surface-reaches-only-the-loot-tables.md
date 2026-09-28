# ADR 0014 — Of item content, the tuning surface reaches only the loot tables

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                                             |
| ----------------- | ----------------------------------------------------------------- |
| **Status**        | Accepted, 2026-09-28                                              |
| **Date**          | 2026-09-28                                                        |
| **Deciders**      | The engineering architect; accepted by the game designer on the maintainer's delegation, with no change |
| **Supersedes**    | None; narrows [ADR 0009](./0009-definition-tuning-key-is-the-field-path.md)'s reach for five new kinds |
| **Superseded by** | None                                                              |

## Context

[ADR 0009](./0009-definition-tuning-key-is-the-field-path.md) makes every number on the hero, forms, spells, abilities, statuses, enemies, and summons a tunable, keyed by its field path, so a slider in the developer panel moves it mid-session and the change lands in the input log. Maps are the exception: their kind reaches no tuning surface, because a map's numbers are geometry a live world is built from.

Items bring five kinds of content: the bases, the affixes, the rarity table, the loot tables, and the Legendary pieces. Their numbers are of two sorts.

- **Numbers that shape what the player already holds.** A base's size in cells lays out the inventory; its quality level and requirement, an affix's affix level and range, and a Legendary's fixed lines are written into an item, or gate it, when it is made; a base's value and a rarity's price multiplier price what is held. [ADR 0011](./0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) makes a made item a value that never reads back a range, so retuning a range already reaches only the next item. But a base's size tuned under items lying in the grid would leave the grid's cells disagreeing with the items that fill them, and a value tuned mid-session would reprice everything the player holds.
- **Numbers that shape only what drops next.** A loot table's chance of gold, of each globe, and of each item, its gold range, and its rarity weights are read at the roll and at no other moment. These are the numbers the balance pass moves, and the catalogue names one of them, the normal enemy's mana globe chance, as the lever if the road runs short of mana.

A retune of the first sort also has no validation. A tuning command checks only that its value is finite, while an item definition's load checks that a size fits the grid, that a requirement is a level, and that each weight table has a Rare-or-better column for a boss.

The designer feels this at the panel: a slider for every one of some four hundred item numbers, most of which would break or reprice what they are holding. The engineer feels it the first time a grid holds an item wider than the cells it stamped.

## Decision

**The descriptors of the item base, the affix, the rarity table, and the Legendary piece reach no tuning surface: their tuning is `null`, as a map's is. The loot table's descriptor is tunable, under the kind word `loot`, and its numbers are read so that no value a tuning command can write breaks a roll.**

- **Item definitions change by editing content.** Under the dev server, an edit to a base, an affix, the rarity table, or a Legendary piece changes something the tuning surface does not reach, so the page reloads, as for any such change. A headless run, a test, and a replay read the files.
- **Loot tables are tuned like any definition.** A key names the table by its id and the number by its field path, `def:loot:<id>:<field path>`. Each enemy tier names one table, and the store names one of its own. A tuning command writes the world's copy and rebuilds the one loot record read from it, so the next roll reads the new number and nothing already on the ground or held changes.
- **A roll reads a table defensively.** A chance is read clamped to between none and always. A rarity is drawn by its weight over the sum of the weights the roll allows, so a weight tuned up or down changes how often it comes and never leaves a table that sums wrong; a weight below zero is read as zero, and a roll whose allowed weights sum to nothing drops no item.
- **The live numbers of the economy that are not a table's are flat tunables.** What a health globe and a mana globe restore, the radius the hero takes gold and globes within, the radius a drop is placed within, and the fraction of a price the store pays are entries of the tuning table.

```text
def:loot:foo:bazChance            a number at the top of a loot table
def:loot:foo:bar.0.weights:2      a table entry inside the first entry of a list
```

## Consequences

### What this makes easy

**A slider never breaks what the player holds.** No tuning command can resize an item in the grid, reprice the inventory, or move a requirement under an item already worn, because no key names those numbers.

**The balance lever is live.** The designer can slide the normal enemy's mana globe chance, a boss's gold, or a tier's rarity weights mid-session, watch the next deaths, and send the log; the change replays.

**The panel stays readable.** The tuning surface gains a loot folder of a few dozen numbers, not four hundred item fields, and the tuning state grows by as much.

**The content checks hold.** A size, a level, an affix's slots, and a Legendary's lines are checked once, at load, and nothing mid-session can put them outside what the check allowed.

### What this makes hard

**An item number means a reload in the browser, and a reload loses the inventory.** There are no saves, so a designer trying a base's value or an affix's range in a live session starts the session again. The panel's grant makes the new item on the new page; the recording driver tunes headless, where a reload costs nothing.

**Two kinds of item number.** A designer has to know that a loot table's numbers slide and an item's do not. The panel shows only what slides, so the question answers itself there, but the files do not say it.

**The roll carries the table's safety.** Clamping chances and normalising weights is one more thing the roll does that a load-time check would otherwise do, and a roll that forgets it is a bug a slider finds.

## Alternatives considered

**Every item kind tunable, as ADR 0009's rule would have it by default.** The most uniform, and it was close for the affixes, whose ranges already reach only the next item. It lost on the bases and the rarity table: a size tuned under a filled grid and a price tuned under a full inventory change what the player holds, which [ADR 0011](./0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) exists to prevent, and a tuning command cannot run the checks that keep a size inside the grid. Tuning the affixes alone would split the item kinds three ways instead of two.

**No item content tunable, the loot tables included, as a map's is not.** The simplest line to state. It lost because the loot tables are exactly what the balance moves, their numbers reach nothing already made, and the catalogue names one of them as the lever a playtest may need.

**The drop chances as flat entries of the tuning table, beside the globe values.** A slider without a definition kind being tunable at all. It lost because the chances and the weights belong together, one table per tier, and splitting a tier's table between a content file and the tuning table gives a tier's loot table two owners.

## Revisit when

- Saves arrive, so a reload no longer loses the inventory. Then tuning an affix's range live costs less to refuse and is weighed again.
- A designer needs to tune a base or an affix number live in a session they keep, more than once.
- A loot table grows a number that shapes something already made, such as a Legendary's lines moving onto it. Then that number leaves the table.

## References

Nothing enforces it until the kinds are written; their tests will:

- The descriptors under `src/domain/definitions/kinds/` for the base, the affix, the rarity table, and the Legendary piece carry `tuning: null`, and the loot table's names `loot`; the tuning key spec under `tests/domain/definitions/` finds no key naming an item kind but `loot`.
- The loot roll's spec under `tests/domain/loot/` holds a chance above one or below none, a weight below zero, and a table whose allowed weights sum to nothing.
- The content-change rule under `src/domain/definitions/` reloads the page for any change to an item definition but a number of a loot table, and its spec says so.

---

## Related documentation

- [ADR 0009 — A definition number's tuning key is its field path, verbatim](./0009-definition-tuning-key-is-the-field-path.md) — the rule this record narrows for items
- [ADR 0011 — An item is a value the hero holds in run scope](./0011-an-item-is-a-value-the-hero-holds-in-run-scope.md) — why a made item never reads back a definition
- [Content and registries](../architecture/content-and-registries.md) — the kinds, the tuning surface, and the hot reload
- [Item catalogue](../product/specs/item-catalogue.md) — the numbers each kind holds
- [Developer panel](../product/features/developer-panel.md) — the sliders a tunable kind appears under
