# Items and loot

> **Entry point:** [Features](./README.md)

## Overview

Enemies drop gold, health globes, mana globes, and items. The hero takes gold and globes by walking over or past them, and picks up an item by right-clicking it. It holds items in an inventory of 10 by 4 cells, wears them in ten armory slots that change its stats, and buys and sells them at a store opened from a checkpoint's ring. This page covers how all of that behaves. Which items exist and every number they carry are the [item catalogue](../specs/item-catalogue.md); the files under `src/content/items/` own the numbers once they exist, and `src/content/tuning.ts` owns the globe percentages, the pickup radius, the drop placement radius, and the sell fraction.

## Drops

When an enemy dies, it rolls its tier's loot table: gold, a health globe, a mana globe, each by its chance, and items by their rarity weights. An elite always drops an item, and a boss always drops one Rare or better and one more. An add drops nothing. Three bosses on the long road each also drop their own Legendary piece, at a low rate; no other enemy drops a Legendary.

- **The roll is on a draw of its own.** A drop never changes a fight, and a replay of the same session drops the same things in the same places.
- **Rarity and affixes.** An item drops in one of seven rarities, Common to Mythical by its roll's weights, or Legendary only as a named boss's piece. It rolls as many affixes as its rarity gives, none to five, never two on one stat, each value in its range; a Legendary rolls nothing and carries its piece's fixed stats. Its label and icon are drawn in its rarity's tint.
- **An item's level is the map's level**, whatever dropped it. It decides which bases and affixes can roll: a base drops only once the item level reaches its quality level, an affix only once it reaches its affix level. A tougher enemy drops more and at better rarity, never at a higher level.
- **Where it lands.** Each drop falls on free walkable ground near where the enemy died, found as a pack's members are placed, one drop to a spot, so two never lie on one point, and no further than 192 units from the body (`drop_placement_radius`).
- **How long it stays.** A ground item stays until it is taken or the map is loaded or reset. It never fades, and the hero's death leaves it where it lies.

## Gold and globes, taken by walking

Gold and globes are taken the moment the hero's disc comes within the pickup radius of them, 32 units by default (`pickup_radius`), whether the hero walked to them or past them on the way somewhere else. There is no order for it and no click.

- **Gold** is added to the hero's gold, a number shown on the inventory screen. It takes no cell.
- **A health globe** restores 25% of maximum health (`health_globe_restore`); **a mana globe** 25% of maximum mana (`mana_globe_restore`). A globe whose pool is full is left on the ground and waits, so a hero at full health walks over health globes and keeps them for later.
- A dead hero takes nothing, and nor does one whose health reached zero on that step: a globe never saves a hero already emptied.

## Picking up an item

An item is never taken by walking. A right click on an item's icon or its label sends the **pick up** order: the hero walks to it as a move does and takes it into the inventory on arrival, at the first place it fits. A right click on gold or a globe, its label or its icon, is a move to it, where it is taken as it is by any walk. A right click anywhere else is a move, as always.

Where an item and a unit overlap, a unit wins: an enemy is attacked, and any other unit takes the click with nothing sent; then a label picks up its item, then an item's icon, then a portal or a waypoint, then the ground is a move. So a right click aimed at an enemy in a fight is always an attack, whatever has dropped under it. **While Alt is held** the order is turned for looting: a label wins over a unit, then the unit, then an icon, then a portal or a waypoint, then the ground. Alt shows every label, so an item under an enemy can always be reached by holding Alt and clicking its label.

A pick up is a walk, and the [disable matrix](../specs/disable-matrix.md) answers it as a move: a stun or a root ends one under way and refuses a new one, a knockback carries the hero and the walk goes on, and a lift puts it aside until the hero lands. A new order replaces a pick up as it replaces any order. An item taken or gone by the time the hero arrives ends the order, and so does a walk that ends out of reach of the item. The item comes into the inventory the moment the hero is within the pickup radius of it, the same reach as gold and globes.

## Labels and Alt

Every ground item can carry a label: its name in its rarity's tint, drawn above everything on the ground. Rare and better show their labels by default. While Alt is held every label shows, the Common and Uncommon ones and gold's with its amount; Alt's browser default is suppressed. Labels that would overlap are moved apart. Globes carry no label.

## The inventory and armory

I opens and closes the inventory and armory screen; Esc closes it, after a targeting cursor if one is open. The world keeps running while it is open, and a click on it never reaches the ground beneath.

- **The inventory** is a grid of 10 by 4 cells, shared by every form the hero takes. Each item fills the cells its base's size gives: a ring one, a helm 2 by 2, a body armour 2 by 3. An item that comes in without a place named goes to the first place it fits, reading the grid left to right and top to bottom. Each item is drawn across the cells it covers, its icon in its rarity's tint, and one whose level requirement is above the hero's level is backed in red.
- **The armory** is the ten armory slots, drawn as a figure: helm, amulet, armour, main hand, off-hand, gloves, belt, boots, and two rings. The helm sits above the armour and the belt below it, the amulet beside the helm, a hand on each side of the armour, the gloves and the boots at the figure's feet, and a ring at each end of the belt. A worn item is drawn in its slot, scaled to it.
- **Gold** is shown on the screen.

| Gesture | On | What it does |
|---|---|---|
| Left click | An inventory item | A press whose pointer does not move a few pixels before the release. Equips it into its armory slot. A worn item there goes back into the grid where it fits, and the equip is refused if it does not |
| Left click | A worn item | Unequips it into the grid where it fits |
| Right click | An inventory item | Drops it on the ground at the hero's feet; while the store is open, sells it instead |
| Press and move | An inventory item | Lifts it onto the pointer once it moves a few pixels, drawn at its size where it was grabbed, showing the cells it would take as free or blocked: the cells nearest where it is held, kept inside the grid. Releasing sets it down where it fits, or swaps it with the one item it would cover, which goes to the first place it then fits; where it covers two items, or the one it covers would have no place, the cells show blocked and releasing puts it back. Esc, which closes the screen, a release outside the grid, or a release where it lay puts it back |
| Pointer over | Any item, on a screen or a ground label | Shows its tooltip: name in its tint, rarity, base, item level, level requirement, marked when above the hero's level, the implicit stat, each affix line, and the price or sell price while the store is open |

A click on an empty cell or an empty slot does nothing. A refused gesture flashes the item, as a refused key flashes its square, and the item stays where it was: an item above the hero's level flashes on a left click and is not worn. Every change to the inventory, the armory, or gold is a command, recorded in the input log and replayed.

## Wearing an item

A worn item adds its implicit stat and its affixes to the hero's stats on the tick it goes on, and takes them away on the tick it comes off. Its stats join the same pipeline the orb passives do, so an item's +20 maximum health and a Quartz instance's regeneration add up the same way. An item can be worn only once the hero's level reaches its level requirement, the highest of its base's and its affixes'; a Legendary piece's is the higher of its own and its base's.

**Magic damage** raises every magical hit the hero deals by its fraction, before the target's resistance: a spell's first hit and its burns. It never raises a physical hit, so neither the hero's attack nor Emberling's, and pure damage is not magical. No item raises an orb level.

## The store

A store stands at every checkpoint. A left click on the checkpoint ring the hero stands in opens it; a click on a ring the hero is not in keeps its usual meaning, and a click by a dead hero, or on the ring of the store already open, sends nothing. The store opens on the left of the screen with the inventory beside it on the right, as Diablo II's store does, and shows gold.

- **Three tabs:** Armour, Weapons, and Misc, the last holding amulets, rings, and the active items. A click on a tab shows it; the store opens on Armour. Each tab is a grid of its items' icons in their rarity's tint, at their size, one whose level requirement is above the hero's level backed in red.
- **Stock:** 12 items from Common to Rare, rolled the first time that checkpoint's store opens, at the hero's level on that tick, and never restocked while the map stays loaded.
- **Buying:** a left click on a stocked item buys it for its price, into the inventory where it fits. The pointer over it shows the price in its tooltip.
- **Selling:** a right click on an inventory item sells it for a quarter of its price (`store_sell_fraction`), rounded down. The pointer over it shows the sell price in its tooltip.
- **Closing:** Esc, or the hero leaving the ring or dying. Esc closes the store first and a second Esc the inventory; the inventory stays open until it is closed itself. The world keeps running while the store is open.

## States and edge cases

| State | What happens |
|---|---|
| A pick up with no room in the inventory | The hero walks to the item; it stays on the ground, and the refusal flashes. Nothing is dropped to make room |
| An equip or buy with no room for what comes out | Refused with the item flashed; nothing moves |
| An item whose level requirement is above the hero's level | It can be carried, sold, and dropped, not worn. Its tooltip marks the requirement |
| A globe whose pool is full | It waits on the ground until the pool is not full |
| Two gold piles and a globe in one step | All three are taken on that tick |
| The hero dies holding items | Nothing is lost: the inventory, the armory, and gold are kept. The store closes |
| The hero dies with the pick up order in flight | The order is cleared as every order is at death; the item stays |
| A command sent while the hero is dead | Every inventory, armory, and store command is refused while the hero is dead; under every disable, it is taken |
| Not enough gold | The buy is refused and the item flashes in the store |
| The store opened away from a ring | Refused; only the ring the hero stands in opens a store |
| A map loaded or reset | Every ground item is gone, and every store is emptied, closed, and stocked afresh the next time it opens. The inventory, the armory, and gold are run scope and are kept |
| More on the ground than the map holds | A drop with no room, past the limit of ground items on a map or with no free spot near where the enemy died, is not made, and the developer panel counts it; nothing already on the ground is removed. A death's drops are made best first, so a globe goes without before an item, and a Legendary last of all. The limit holds at least two full clears of the long road with nothing taken |
| The page reloaded | The inventory is lost with the session: there are no saves |
| Active items | Listed in the store's Misc tab, always, beside the stock; they never drop. One the hero already holds cannot be bought again ([the bank](../specs/item-catalogue.md#72-the-bank)) |

## Deferred

- **Activating the active items**, and the bank of six keys they are held in. What each does, and the bank's rules, are the [item catalogue's](../specs/item-catalogue.md#7-the-active-items); they are listed and bought before they can be used.
- **A catalogue at Diablo II's scale**, about a thousand items, and item art. Icons are flat silhouettes in a rarity tint. The descent needs its bases and affixes to reach item level 100 ([the descent](../specs/the-descent.md#7-loot-at-depth)).
- **Two-handed weapons, sets, sockets, and lifesteal.**
- **A stash**, which waits on saves and stands in the town; a store that buys back what it sold. The town's store restocks as the hero goes deeper ([travel](./map-and-camera.md#travel)).
- **Item comparison** in a tooltip.
- **A death penalty**, which waits on saves. Crafting is never built.

---

## Related documentation

- [Item catalogue](../specs/item-catalogue.md) — every slot, base, rarity, affix, loot table, and price, and the economy of the long road
- [Hero](./hero.md) — the stats a worn item joins
- [Controls and orders](./controls-and-orders.md) — the right click, the pointer, and the keys
- [Map and camera](./map-and-camera.md) — the checkpoints a store stands at, and the map level
- [Enemies](./enemies.md) — the tiers whose deaths drop loot
