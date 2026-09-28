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

This page fixes items as data: every armory slot, every base with its size, gate, and value, the rarity table, the affix table, the Legendary pieces, the loot table of each enemy tier, the store's stock and prices, and the arithmetic that says what a full clear of the long road pays. The item definitions under `src/content/items/` are written from it, and a test reads its base, rarity, affix, and Legendary tables against those files, and each Legendary piece against the boss pack that names it in the long road's map file.

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

Eight items with a power the hero activates. They have no rarity, their labels are emerald green, they are in no loot table and never drop, and they are bought only in the store's Misc tab, at a steep price. Each is modelled on a Dota 2 item and keeps what makes that item a decision: when to fire it matters more than that it was fired.

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

### 7.1 What each does

`L` is the hero's level when the activation commits: the three that deal damage grow with the hero, since an active item has no item level and must stay worth its key a hundred maps down. Their magical damage is raised by magic damage %, and every clock below is shortened by the cooldown reduction the hero has, items' and Whorl's, as a spell's is.

| Active item | Model | Target | Range | Cast point | Cooldown | Mana | What it does |
|---|---|---|---|---|---|---|---|
| Gyre Sceptre | Eul's Scepter | The hero, or an enemy | 600 | None | 23 s | 100 | On an enemy: lifts it where it stands for 2.5 s, then drops it there with 60 + 5 × L magical damage. On the hero: the self-lift for 2.5 s, untargetable and invulnerable, shedding on the tick it rises every status an enemy put on it; Q, W, E, and R work in the air. Cast on the hero by pressing its key and left-clicking the hero |
| Scorchglass | Dagon | An enemy | 700 | None | 30 s | 120 | 120 + 12 × L magical damage, at once |
| Slipknife | Blink Dagger | A point | 1200 | None | 15 s | None | The hero blinks to the point, the nearest walkable ground to it, or 1200 toward it if the point is further. Every projectile aimed at the hero is disjointed. Refused for 3 s after the hero takes damage from an elite or a boss, and under root |
| Rimeward | Shiva's Guard | None | A ring to 900 | None | 30 s | 100 | A ring grows from the hero to 900 over 1.5 s; each enemy it reaches takes 90 + 9 × L magical damage once and is slowed 40% for 4 s. While it is in the bank, +4 armour |
| Skyfall Maul | Meteor Hammer | A point | 600 | 2 s | 28 s | 125 | After the long cast point, a meteor lands at the point 0.5 s later: 100 + 10 × L magical damage to each enemy within 300, and a burn of 25 + 2.5 × L a second for 3 s |
| Mainspring | Refresher Orb | None | None | None | 180 s | 250 | Every clock the hero holds ends: its prepared spells', Invoke's, the hidden clocks of spells no longer in D or F, and every active item's but Mainspring's own |
| Fetter Bolas | Gleipnir | A point | 1100 | None | 18 s | 100 | A bolas flies to the point at 1500 a second; there it roots every enemy within 250 for 2 s and deals 60 + 6 × L magical damage |
| Veilblade | Ethereal Blade | The hero, or an enemy | 800 | None | 20 s | 100 | A blade flies at 1275 a second; its target is ethereal for 3 s: immune to physical damage, unable to attack, and taking 40% more magical damage. An enemy also takes 60 + 6 × L magical damage, raised by the 40%, and is slowed 50% for the 3 s |

### 7.2 The bank

- **Six places, six keys.** The bank holds up to six active items, one to each of T, X, V above and C, G, Space below, in that grid. An item in the bank is activated by its key; one in the inventory is carried and not activated.
- **Where one goes.** A bought active item goes to the first free place in the bank, reading the grid top row first, and into the inventory where it fits if the bank is full. The player moves one between the bank and the inventory, and between two places of the bank, as any item is moved, so the player chooses its key.
- **One of each.** Buying an active item the hero already holds, in the bank or the inventory, is refused, since two copies share one clock and the second would be gold spent for nothing.
- **In the inventory** each takes 1 by 2 cells. Each sells for a quarter of its price, as any item does.
- **Its clock** belongs to the item, not the place: moving it, or selling one and buying it again, keeps the clock running.

---

## 8. Drops

When an enemy dies, it rolls its tier's table on a draw of its own, so a drop never changes a fight. An add drops nothing, as it grants no experience. Everything drops at the **item level** of the map it dies on, `L` below, whatever tier dropped it: an elite or a boss drops more and at better rarity, never at a higher level. The long road's map level is 3.

| Tier | Gold | Health globe | Mana globe | Items |
|---|---|---|---|---|
| Normal | 40%: one pile of `4 × L` to `8 × L` | 25%: one | 50%: one | 12%: one, on the normal weights |
| Elite | Always: one pile of `12 × L` to `24 × L` | One | One | One, on the elite weights |
| Boss | Always: one pile of `30 × L` to `60 × L` | Two | Two | Two: one Rare or better on the boss weights, and one on the elite weights; and a named boss's Legendary at 10% |
| Add | Nothing | Nothing | Nothing | Nothing |

- **An item's base** is drawn evenly from the bases whose quality level the item level reaches.
- **A globe restores 25% of its pool's maximum**, health or mana, when the hero takes it. It waits on the ground while that pool is full.
- **Gold** is a number the hero holds, not an item, and takes no cell.

---

## 9. The store

A store stands at every checkpoint of the long road, opened by standing in its ring and clicking it, and in the town above the descent, whose maps hold none ([travel](../features/map-and-camera.md#travel)). It is a basic Diablo II vendor: three tabs, a grid of items in each, and the price on hover. The town's store is rolled again at the hero's level the first time it opens after the hero reaches a new waypoint; every other rule below holds for both.

| Property | Value |
|---|---|
| Tabs | **Armour**: helm, armour, gloves, belt, and boots. **Weapons**: main hand and off-hand. **Misc**: amulets, rings, and the active items |
| Stock | 12 items, rolled on the store's first opening at its checkpoint and never restocked while the map stays loaded; a map load or reset empties every store |
| Stock level | The hero's level on the tick the store first opens, as the item level: its bases and affixes are gated by it as a drop's are by the map's |
| Stock rarities | Common to Rare, on the store weights of [section 4](#4-the-rarities) |
| Buying | The base's value times the rarity's price multiplier. A Legendary is never stocked; the active items at their own prices |
| Selling | A quarter of the price, rounded down, whatever the item |

A stock of 12 at a Rare weight of 15% holds at least one Rare 86% of the time, and the five stores up to region 5's entrance all but certainly hold one between them. The dearest Rare a store stocks at hero level 9 is chain mail, 600 gold; the cheapest at level 1 is a cap, leather gloves, or a sash, 125.

---

## 10. The economy on the long road

A full clear of [the long road](./the-long-road.md#4-the-packs): 89 normal enemies, 10 elites, and 5 bosses, at map level 3, of which regions 1 to 4 hold 58 normal enemies, 8 elites, and 4 bosses. Sections 10.1 and 10.3 are expectations over the loot tables of [section 8](#8-drops). Section 10.2 is measured: the balance pass's walk of the road, stored as `tests/simulation/replays/balance-loot.json`, whose spec reads every figure there.

### 10.1 What a full clear drops

| Drop | Normal | Elite | Boss | Full clear | Before region 5 |
|---|---|---|---|---|---|
| Gold | 89 × 40% × 18 = 640.8 | 10 × 54 = 540 | 5 × 135 = 675 | **1856** | **1390** |
| Health globes | 89 × 25% = 22.25 | 10 | 10 | **42.25** | 30.5 |
| Mana globes | 89 × 50% = 44.5 | 10 | 10 | **64.5** | 45 |
| Items | 89 × 12% = 10.7 | 10 | 10 | **30.7**, and 0.3 Legendary | 23.0 |

The items of a full clear by rarity: 10.9 Common, 9.0 Uncommon, 7.5 Rare, 2.5 Epic, 0.64 Imperial, 0.19 Mythical, and 0.3 Legendary, one piece in about three runs.

### 10.2 Health and mana against the clean run

The clean run of the old road needed 2 **Heal** and 8 **Restore mana** from the developer panel to finish. Each sets its pool to its maximum, so each is worth at most one full pool: 2 health pools and 8 mana pools is the least the drops must cover.

The walk measures it on the long road. A driver plays the hero from the spawn at level 1 to the last boss's kill on seed 3742014961, checkpoint to checkpoint, sending only what a player sends. It fights what wakes within 800 of its line, spends each skill point as it comes, and turns aside for a globe within 600 of it when the pool it restores is below half. It walks over gold, picks up items by the order, wears what fits an empty armory slot, and sells and buys at each store. It kills 45 normal enemies, 6 elites, and the 5 bosses, 56 of the road's 104, and the last boss falls on tick 8489 with the hero at level 9, with no panel command and no death.

| Pool | The clean run's panel use, at most | Globes dropped on the walk | Globes the walk took | Taken against the panel use |
|---|---|---|---|---|
| Health | 2 pools | 29, 7.25 pools | 23, 4.1 pools | 2.1 times |
| Mana | 8 pools | 40, 10 pools | 38, 9.3 pools | 1.2 times |

A globe taken into a pool not far from full restores less than its quarter, so the pools taken are fewer than the globes times a quarter.

The economy holds two margins:

- **Health:** outside the boss fights, the hero's health never falls below **25%** of its maximum. A boss fight is any tick a living boss stands within 1200 of the hero. On the walk the lowest is 44%.
- **Pools:** the globes the walk takes restore at least the clean run's panel use, 2 health pools and 8 mana pools.

The health margin is the stored seed's reading. What the economy promises on every seed is less: the road is finished from level 1 to the last boss's kill with no heal or mana from the panel, and with at most one death, which may come early in region 1 before the first globes fall. Of eight seeds walked on these values, every one reaches the last boss's kill with no panel command, and none dies more than once.

A normal enemy's mana globe chance is 50%, not 35%: at 35% the walk's kills drop 33 mana globes, 8.25 pools, which only just covers the 8. A full clear at 50% drops 16.1 mana pools, above the 15.4 the clean run's 8 would reach if the hero's spending grew with the road's length. A hero that clears more of the road than the walk does takes more of both.

### 10.3 Gold against the store

A hero reaching region 5 has, in expectation, 1390 gold from drops alone, before selling anything. The dearest Rare the store stocks there, at hero level 9, is chain mail at 600, so the hero buys at least one Rare before the last region with 2.3 times the gold. Selling the 23 items that dropped by then, most of them Common and Uncommon, at a quarter of their price adds more. An active item, at 1400 to 3000, is a run's savings.

The walk takes 1236 gold from 24 of the 25 piles its kills drop, sells 16 items, and buys four Rares at the stores up to region 5's entrance.

---

## Related documentation

- [Items and loot](../features/items-and-loot.md) — how drops, pickup, the inventory, the armory, and the store behave for the player
- [The long road](./the-long-road.md) — the packs, the bosses that drop the Legendaries, and the map level of 3
- [Enemy catalogue](./enemy-catalogue.md) — the tiers whose tables section 8 gives
- [Hero](../features/hero.md) — the stats an item's rows join
- [Product vocabulary](../vocabulary.md) — item, base, affix, rarity, and the levels
