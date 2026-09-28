# Item catalogue

> **Entry point:** [Product](../README.md)
> **See also:** [Items and loot](../features/items-and-loot.md) · [The long road](./the-long-road.md) · [Enemy catalogue](./enemy-catalogue.md)

**Helix — Items as data: the ten armory slots, the bases, seven rarities, the affixes, what each enemy drops, the store, and the economy of a full clear of the long road**

| Field | Value |
|---|---|
| Document type | Content specification |
| Audience | Gameplay programming, combat design, the playtest |
| Product context | Single-player. One hero, one inventory of 10 by 4 cells, ten armory slots, gold as a number |
| Classification | What items exist and what their numbers are. How drops, pickup, the screens, and the store behave for the player is the [items and loot page](../features/items-and-loot.md) |
| Stats | Every stat an item carries is one the hero already has, from the modifier pipeline the [hero page](../features/hero.md#derived-values) describes: `(base + flat) × (1 + percent)` |
| Reference | Diablo II's item structure, at the size of a small catalogue: bases with an implicit stat, rarities by affix count, and affixes gated by level. Item level is Diablo I's: the level of the map an item drops on |

---

## 1. Purpose

This page fixes items as data before any is built: every armory slot, every base with its size, gate, and value, the rarity table, the affix table, the Legendary pieces, the drop table of each enemy tier, the store's stock and prices, and the arithmetic that says what a full clear of the long road pays. The item definitions under `src/content/items/` are written from it, and a test reads its base, rarity, affix, and Legendary tables against those files, and each Legendary piece against the boss pack that names it in the long road's map file.

Every number is a starting value. The definition file owns it once the file exists, and the file wins when this page disagrees; the playtest and the balance pass move numbers in the file and in this page together. What this page owns is the shape: which slot takes what, which stat an item may roll where, and what the economy is set to cover.

---

## 2. The armory slots

The armory holds what the hero wears: ten armory slots, each taking items of one kind. Every weapon is one-handed. The word "armory slot" always carries "armory", so a bare "slot" stays D or F.

| Armory slot | In code | Takes | On screen | Store tab |
|---|---|---|---|---|
| Helm | `helm` | Cap, circlet | HELM | Armour |
| Amulet | `amulet` | Pendant | AMULET | Misc |
| Armour | `body` | Quilted armour, robe, chain mail | ARMOUR | Armour |
| Main hand | `main_hand` | Staff, wand, dagger, sceptre | MAIN HAND | Weapons |
| Off-hand | `off_hand` | Tome, buckler, focus | OFF-HAND | Weapons |
| Gloves | `gloves` | Leather gloves, gauntlets | GLOVES | Armour |
| Belt | `belt` | Sash, heavy belt | BELT | Armour |
| Boots | `boots` | Leather boots, greaves | BOOTS | Armour |
| Ring | `ring` | Band | RING | Misc |
| Ring | `ring` | Band | RING | Misc |

The two ring slots take the same items: a ring goes to the empty one, or to the one named. The Armour slot is `body` in code so the word stays free for the armour stat. "Orb" is Quartz, Whorl, and Ember, and names no base.

---

## 3. The bases

A base is what an item is before its rarity: its armory slot, its size in the inventory, the item level it needs to drop, the hero level it needs to be worn, one **implicit** stat every item of the base carries, and its value in gold.

### 3.1 How to read a base

| Field | Meaning |
|---|---|
| Id | The snake_case string every command, event, and log line uses. It never renames |
| Size | Width by height in inventory cells. The inventory is 10 wide and 4 high, so nothing is taller than 4 |
| Quality level | The lowest item level at which the base drops or is stocked |
| Requirement | The hero level it needs to be worn, before its affixes raise it |
| Implicit | The stat every item of the base carries, rolled once in its range when the item is made |
| Frame | The atlas frame of its icon, one silhouette per armory slot. An icon is white in the atlas and drawn in its item's rarity tint, so a base names a frame and no tint of its own |
| Value | Gold. The store's price is the value times the rarity's price multiplier |

### 3.2 The twenty bases

| Base | Id | Armory slot | Size | Quality level | Requirement | Implicit | Range | Frame | Value |
|---|---|---|---|---|---|---|---|---|---|
| Cap | `cap` | Helm | 2 by 2 | 1 | 1 | Armour, flat | +1 to 2 | `item_helm` | 25 |
| Circlet | `circlet` | Helm | 2 by 2 | 4 | 4 | Maximum mana, flat | +20 to 35 | `item_helm` | 70 |
| Pendant | `pendant` | Amulet | 1 by 1 | 1 | 1 | Maximum mana, flat | +10 to 20 | `item_amulet` | 40 |
| Quilted armour | `quilted_armour` | Armour | 2 by 3 | 1 | 1 | Armour, flat | +2 to 3 | `item_body` | 35 |
| Robe | `robe` | Armour | 2 by 3 | 3 | 3 | Maximum mana, flat | +25 to 40 | `item_body` | 55 |
| Chain mail | `chain_mail` | Armour | 2 by 3 | 7 | 7 | Armour, flat | +5 to 7 | `item_body` | 120 |
| Staff | `staff` | Main hand | 1 by 3 | 1 | 1 | Maximum mana, flat | +15 to 25 | `item_main_hand` | 30 |
| Wand | `wand` | Main hand | 1 by 2 | 1 | 1 | Magic damage | +2 to 4% | `item_main_hand` | 35 |
| Dagger | `dagger` | Main hand | 1 by 2 | 2 | 2 | Attack damage, flat | +3 to 6 | `item_main_hand` | 40 |
| Sceptre | `sceptre` | Main hand | 1 by 3 | 5 | 5 | Magic damage | +5 to 8% | `item_main_hand` | 95 |
| Tome | `tome` | Off-hand | 2 by 2 | 1 | 1 | Maximum mana, flat | +10 to 20 | `item_off_hand` | 30 |
| Buckler | `buckler` | Off-hand | 2 by 2 | 2 | 2 | Armour, flat | +1 to 3 | `item_off_hand` | 40 |
| Focus | `focus` | Off-hand | 1 by 2 | 3 | 3 | Mana regeneration, flat | +0.3 to 0.6 a second | `item_off_hand` | 55 |
| Leather gloves | `leather_gloves` | Gloves | 2 by 2 | 1 | 1 | Attack speed, flat | +3 to 6 | `item_gloves` | 25 |
| Gauntlets | `gauntlets` | Gloves | 2 by 2 | 6 | 6 | Armour, flat | +2 to 4 | `item_gloves` | 90 |
| Sash | `sash` | Belt | 2 by 1 | 1 | 1 | Maximum health, flat | +10 to 20 | `item_belt` | 25 |
| Heavy belt | `heavy_belt` | Belt | 2 by 1 | 5 | 5 | Maximum health, flat | +30 to 45 | `item_belt` | 85 |
| Leather boots | `leather_boots` | Boots | 2 by 2 | 1 | 1 | Movement speed, percent | +1 to 2% | `item_boots` | 30 |
| Greaves | `greaves` | Boots | 2 by 2 | 6 | 6 | Armour, flat | +2 to 4 | `item_boots` | 90 |
| Band | `band` | Ring | 1 by 1 | 1 | 1 | Health regeneration, flat | +0.2 to 0.5 a second | `item_ring` | 40 |

Every armory slot has a base of quality level 3 or lower, so on the long road, at map level 3, every slot can drop: fourteen bases do there, and the other six are reached by a higher map level or by the store's stock at the hero's level. Gold and globes are drawn with the frames `item_gold` and `item_globe`, a globe tinted by its pool.

### 3.3 How a stat reads

Magic damage is a fraction of each magical hit the hero deals, added before the target's magic resistance: +10% raises a 100-damage magical hit to 110 before resistance. It raises every magical hit, a spell's first hit and its burns alike, and never a physical or a pure one, so the hero's attack and Emberling's attack are untouched by it. Movement speed and cooldown reduction are percentages of the pipeline; every other stat is flat, in its own unit. Magic resistance is flat, in points of the fraction the hero's 25% starts at. Attack speed is in the points the hero's 100 base starts at.

No item raises an orb level, anywhere.

---

## 4. The rarities

Seven rarities, from Common to Legendary. A rarity says how many affixes an item rolls, the tint its label and icon are drawn in, how often it drops from each enemy tier, how often the store stocks it, and what it costs.

| Rarity | Affixes | Tint | Normal weight | Elite weight | Boss weight | Store weight | Price multiplier | Label by default |
|---|---|---|---|---|---|---|---|---|
| Common | 0 | gray, `0x9d9d9d` | 600 | 300 | 0 | 50 | 1 | No |
| Uncommon | 1 | white, `0xf2f2f2` | 280 | 400 | 0 | 35 | 2 | No |
| Rare | 2 | blue, `0x5a7dff` | 90 | 200 | 700 | 15 | 5 | Yes |
| Epic | 3 | orange, `0xff8a1f` | 25 | 75 | 220 | 0 | 10 | Yes |
| Imperial | 4 | gold, `0xe8c547` | 4 | 20 | 60 | 0 | 20 | Yes |
| Mythical | 5 | purple, `0xa855f7` | 1 | 5 | 20 | 0 | 40 | Yes |
| Legendary | Fixed | red, `0xe53935` | 0 | 0 | 0 | 0 | 60 | Yes |

- **Weights** are out of 1000 in each column. The boss column is the boss's guaranteed Rare-or-better item; a boss's other item rolls the elite column.
- **Mythical** drops from any enemy, at a tenth of a percent of a normal enemy's items.
- **Legendary** is never rolled from a weight: its three pieces each drop from one named boss only, on a roll of their own ([section 6](#6-the-legendary-pieces)).
- **Active items** have no rarity. Their labels are emerald green, `0x2ecc71` ([section 7](#7-the-active-items)).
- **Labels:** a ground item of Rare or better shows its label by default; holding Alt shows every ground item's label, gold's with its amount.

---

## 5. The affixes

An affix is one stat line an item rolls beyond its base's implicit stat. An item rolls as many as its rarity gives, and never two on the same stat: it draws a stat from those its armory slot may roll, that have a tier its item level reaches and its rarity allows, and that none of its affixes already carries, then one tier of that stat among those its item level reaches and its rarity allows, then a value in that tier's range. The implicit is not an affix, so a staff's implicit maximum mana does not keep it from rolling a mana affix. An item that finds fewer open stats than its rarity gives rolls as many as it finds. A tier is reached when the item level is at least its affix level. The item's level requirement is the highest of its base's requirement and its affixes' requirements.

Every stat has a first tier at affix level 1, but for cooldown reduction, and every armory slot may roll at least five stats at affix level 1, so a Mythical item finds five affixes at any item level.

| Affix | Id | Stat | Armory slots | Affix level | Requirement | Range | Rarities | On screen |
|---|---|---|---|---|---|---|---|---|
| Health I | `health_1` | Maximum health, flat | Helm, amulet, armour, off-hand, gloves, belt, boots, ring | 1 | 1 | +10 to 20 | Uncommon to Mythical | +N MAXIMUM HEALTH |
| Health II | `health_2` | Maximum health, flat | As Health I | 5 | 5 | +21 to 35 | Uncommon to Mythical | +N MAXIMUM HEALTH |
| Health III | `health_3` | Maximum health, flat | As Health I | 9 | 9 | +36 to 55 | Rare to Mythical | +N MAXIMUM HEALTH |
| Health regeneration I | `health_regen_1` | Health regeneration, flat | Helm, amulet, armour, belt, boots, ring | 1 | 1 | +0.3 to 0.6 a second | Uncommon to Mythical | +N HEALTH REGENERATION |
| Health regeneration II | `health_regen_2` | Health regeneration, flat | As I | 6 | 6 | +0.7 to 1.2 a second | Uncommon to Mythical | +N HEALTH REGENERATION |
| Mana I | `mana_1` | Maximum mana, flat | Helm, amulet, armour, main hand, off-hand, gloves, belt, boots, ring | 1 | 1 | +10 to 20 | Uncommon to Mythical | +N MAXIMUM MANA |
| Mana II | `mana_2` | Maximum mana, flat | As Mana I | 5 | 5 | +21 to 35 | Uncommon to Mythical | +N MAXIMUM MANA |
| Mana III | `mana_3` | Maximum mana, flat | As Mana I | 9 | 9 | +36 to 55 | Rare to Mythical | +N MAXIMUM MANA |
| Mana regeneration I | `mana_regen_1` | Mana regeneration, flat | Helm, amulet, armour, main hand, off-hand, belt, ring | 1 | 1 | +0.2 to 0.4 a second | Uncommon to Mythical | +N MANA REGENERATION |
| Mana regeneration II | `mana_regen_2` | Mana regeneration, flat | As I | 6 | 6 | +0.5 to 0.9 a second | Uncommon to Mythical | +N MANA REGENERATION |
| Armour I | `armour_1` | Armour, flat | Helm, armour, off-hand, gloves, belt, boots | 1 | 1 | +1 to 2 | Uncommon to Mythical | +N ARMOUR |
| Armour II | `armour_2` | Armour, flat | As Armour I | 5 | 5 | +3 to 4 | Uncommon to Mythical | +N ARMOUR |
| Armour III | `armour_3` | Armour, flat | As Armour I | 9 | 9 | +5 to 7 | Rare to Mythical | +N ARMOUR |
| Attack speed I | `attack_speed_1` | Attack speed, flat | Amulet, main hand, gloves, ring | 1 | 1 | +5 to 10 | Uncommon to Mythical | +N ATTACK SPEED |
| Attack speed II | `attack_speed_2` | Attack speed, flat | As I | 7 | 7 | +11 to 20 | Uncommon to Mythical | +N ATTACK SPEED |
| Attack damage I | `attack_damage_1` | Attack damage, flat | Main hand, gloves, ring | 1 | 1 | +2 to 4 | Uncommon to Mythical | +N ATTACK DAMAGE |
| Attack damage II | `attack_damage_2` | Attack damage, flat | As I | 6 | 6 | +5 to 9 | Uncommon to Mythical | +N ATTACK DAMAGE |
| Magic damage I | `magic_damage_1` | Magic damage | Amulet, main hand, off-hand | 1 | 1 | +2 to 4% | Uncommon to Mythical | +N% MAGIC DAMAGE |
| Magic damage II | `magic_damage_2` | Magic damage | As I | 5 | 5 | +5 to 8% | Uncommon to Mythical | +N% MAGIC DAMAGE |
| Magic damage III | `magic_damage_3` | Magic damage | As I | 10 | 10 | +9 to 12% | Rare to Mythical | +N% MAGIC DAMAGE |
| Magic resistance I | `magic_resistance_1` | Magic resistance, flat | Helm, amulet, armour, off-hand, ring | 1 | 1 | +2 to 3% | Uncommon to Mythical | +N% MAGIC RESISTANCE |
| Magic resistance II | `magic_resistance_2` | Magic resistance, flat | As I | 7 | 7 | +4 to 6% | Uncommon to Mythical | +N% MAGIC RESISTANCE |
| Movement speed I | `movement_speed_1` | Movement speed, percent | Boots | 1 | 1 | +1 to 3% | Uncommon to Mythical | +N% MOVEMENT SPEED |
| Movement speed II | `movement_speed_2` | Movement speed, percent | Boots | 6 | 6 | +4 to 6% | Uncommon to Mythical | +N% MOVEMENT SPEED |
| Cooldown reduction I | `cooldown_reduction_1` | Cooldown reduction, percent | Helm, amulet, main hand, off-hand | 4 | 4 | +2 to 4% | Rare to Mythical | +N% COOLDOWN REDUCTION |
| Cooldown reduction II | `cooldown_reduction_2` | Cooldown reduction, percent | As I | 9 | 9 | +5 to 7% | Rare to Mythical | +N% COOLDOWN REDUCTION |

A whole-number stat rolls whole numbers; a regeneration rolls in tenths; a percentage rolls in whole percents. An implicit rolls in the same steps, and every step of a range is as likely as another. The affixes at affix level 1 of each armory slot:

| Armory slot | Stats at affix level 1 |
|---|---|
| Helm | Health, health regeneration, mana, mana regeneration, armour, magic resistance |
| Amulet | Health, health regeneration, mana, mana regeneration, attack speed, magic damage, magic resistance |
| Armour | Health, health regeneration, mana, mana regeneration, armour, magic resistance |
| Main hand | Mana, mana regeneration, attack speed, attack damage, magic damage |
| Off-hand | Health, mana, mana regeneration, armour, magic damage, magic resistance |
| Gloves | Health, mana, armour, attack speed, attack damage |
| Belt | Health, health regeneration, mana, mana regeneration, armour |
| Boots | Health, health regeneration, mana, armour, movement speed |
| Ring | Health, health regeneration, mana, mana regeneration, attack speed, attack damage, magic resistance |

The table is small on purpose: a catalogue at Diablo II's scale, of about a thousand items, is deferred.

---

## 6. The Legendary pieces

Three pieces with fixed identities. Each is built on a base, takes its size and frame, and carries fixed values of existing stats in place of an implicit roll and affixes. Each drops only from its named boss on [the long road](./the-long-road.md#4-the-packs), as a third item beside the boss's two, at 10% a kill. No other enemy drops a Legendary, and the store never stocks one.

| Piece | Id | Base | Dropped by | Requirement | Fixed stats | Value |
|---|---|---|---|---|---|---|
| Rimecoil | `rimecoil` | Band | Pack 14, the boss frost raider closing region 2 | 4 | +0.5 health regeneration, +10% magic damage, +30 maximum mana | 40 |
| Trollhide | `trollhide` | Sash | Pack 28, the boss troll closing region 4 | 8 | +80 maximum health, +1.5 health regeneration, +3 armour | 25 |
| Hallcrown | `hallcrown` | Cap | Pack 37, the last boss | 11 | +2 armour, +12% magic damage, +6% cooldown reduction, +40 maximum mana | 25 |

A Legendary's item level is the map's, as every drop's is, and its base's quality level does not gate it: its boss is its gate. Its requirement is a level below the hero's expected level at its boss's kill on a full clear, 5, 9, and 12, so a piece that drops can be worn at once.

---

## 7. The active items

Eight items with a power the hero activates. They have no rarity, their labels are emerald green, they are in no loot table and never drop, and they are bought only in the store's Misc tab, at a steep price. Their effects, sizes, and the bank they are worn in wait on the [roadmap](../roadmap.md); this table fixes their names and prices.

| Active item | Id | Store price |
|---|---|---|
| Gyre Sceptre | `gyre_sceptre` | 1600 |
| Scorchglass | `scorchglass` | 1800 |
| Slipknife | `slipknife` | 1400 |
| Rimeward | `rimeward` | 2000 |
| Skyfall Maul | `skyfall_maul` | 2200 |
| Mainspring | `mainspring` | 3000 |
| Fetter Bolas | `fetter_bolas` | 1600 |
| Veilblade | `veilblade` | 2000 |

---

## 8. Drops

When an enemy dies, it rolls its tier's table on a draw of its own, so a drop never changes a fight. An add drops nothing, as it grants no experience. Everything drops at the **item level** of the map it dies on, `L` below, whatever tier dropped it: an elite or a boss drops more and at better rarity, never at a higher level. The long road's map level is 3.

| Tier | Gold | Health globe | Mana globe | Items |
|---|---|---|---|---|
| Normal | 40%: one pile of `4 × L` to `8 × L` | 25%: one | 35%: one | 12%: one, on the normal weights |
| Elite | Always: one pile of `12 × L` to `24 × L` | One | One | One, on the elite weights |
| Boss | Always: one pile of `30 × L` to `60 × L` | Two | Two | Two: one Rare or better on the boss weights, and one on the elite weights; and a named boss's Legendary at 10% |
| Add | Nothing | Nothing | Nothing | Nothing |

- **An item's base** is drawn evenly from the bases whose quality level the item level reaches.
- **A globe restores 25% of its pool's maximum**, health or mana, when the hero takes it. It waits on the ground while that pool is full.
- **Gold** is a number the hero holds, not an item, and takes no cell.

---

## 9. The store

A store stands at every checkpoint, opened by standing in its ring and clicking it. It is a basic Diablo II vendor: three tabs, a grid of items in each, and the price on hover.

| Property | Value |
|---|---|
| Tabs | **Armour**: helm, armour, gloves, belt, and boots. **Weapons**: main hand and off-hand. **Misc**: amulets, rings, and the active items |
| Stock | 12 items, rolled on the store's first opening at its checkpoint and never restocked |
| Stock level | The hero's level on the tick the store first opens, as the item level: its bases and affixes are gated by it as a drop's are by the map's |
| Stock rarities | Common to Rare, on the store weights of [section 4](#4-the-rarities) |
| Buying | The base's value times the rarity's price multiplier. A Legendary is never stocked; the active items at their own prices |
| Selling | A quarter of the price, rounded down, whatever the item |

A stock of 12 at a Rare weight of 15% holds at least one Rare 86% of the time, and the five stores up to region 5's entrance all but certainly hold one between them. The dearest Rare a store stocks at hero level 9 is chain mail, 600 gold; the cheapest at level 1 is a cap, leather gloves, or a sash, 125.

---

## 10. The economy on the long road

A full clear of [the long road](./the-long-road.md#4-the-packs): 89 normal enemies, 10 elites, and 5 bosses, at map level 3, of which regions 1 to 4 hold 58 normal enemies, 8 elites, and 4 bosses. Every figure is an expectation over the drop tables of [section 8](#8-drops).

### 10.1 What a full clear drops

| Drop | Normal | Elite | Boss | Full clear | Before region 5 |
|---|---|---|---|---|---|
| Gold | 89 × 40% × 18 = 640.8 | 10 × 54 = 540 | 5 × 135 = 675 | **1856** | **1390** |
| Health globes | 89 × 25% = 22.25 | 10 | 10 | **42.25** | 30.5 |
| Mana globes | 89 × 35% = 31.15 | 10 | 10 | **51.15** | 36.3 |
| Items | 89 × 12% = 10.7 | 10 | 10 | **30.7**, and 0.3 Legendary | 23.0 |

The items of a full clear by rarity: 10.9 Common, 9.0 Uncommon, 7.5 Rare, 2.5 Epic, 0.64 Imperial, 0.19 Mythical, and 0.3 Legendary, one piece in about three runs.

### 10.2 Health and mana against the clean run

The clean run of the old road needed 2 **Heal** and 8 **Restore mana** from the developer panel to finish. Each sets its pool to its maximum, so each is worth at most one full pool: 2 health pools and 8 mana pools is the most the clean run took. A globe restores a quarter of a pool.

| Pool | The clean run's panel use, at most | A full clear's globes | Margin |
|---|---|---|---|
| Health | 2 pools | 42.25 × 25% = 10.6 pools | 5.3 times |
| Mana | 8 pools | 51.15 × 25% = 12.8 pools | 1.6 times |

The margin the economy is set to is at least 1.5 times, to cover a globe taken into a pool not far from full and the globes a hero walks past. Both hold.

The new road holds 104 enemies against the old road's 54, 1.93 times as many, and a longer road may spend more. If the hero's spending grows with the road, the need is 3.9 health pools, still covered 2.7 times, and 15.4 mana pools, which 12.8 does not cover. The normal enemy's mana globe chance is the lever: at 50% a full clear drops 64.5 mana globes, 16.1 pools. The balance pass reads the new road's spending and moves the chance if it must.

### 10.3 Gold against the store

A hero reaching region 5 has, in expectation, 1390 gold from drops alone, before selling anything. The dearest Rare the store stocks there, at hero level 9, is chain mail at 600, so the hero buys at least one Rare before the last region with 2.3 times the gold. Selling the 23 items that dropped by then, most of them Common and Uncommon, at a quarter of their price adds more. An active item, at 1400 to 3000, is a run's savings.

---

## Related documentation

- [Items and loot](../features/items-and-loot.md) — how drops, pickup, the inventory, the armory, and the store behave for the player
- [The long road](./the-long-road.md) — the packs, the bosses that drop the Legendaries, and the map level of 3
- [Enemy catalogue](./enemy-catalogue.md) — the tiers whose tables section 8 gives
- [Hero](../features/hero.md) — the stats an item's rows join
- [Product vocabulary](../vocabulary.md) — item, base, affix, rarity, and the levels
