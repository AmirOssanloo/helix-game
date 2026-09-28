# The descent

> **Entry point:** [Product](../README.md)
> **See also:** [Map and camera](../features/map-and-camera.md#travel) · [Enemy catalogue](./enemy-catalogue.md) · [Item catalogue](./item-catalogue.md) · [Product vision](../vision.md)

**Helix — The descent as design: a hundred maps in ten strata, the roster that makes each deeper map harder without scaling an enemy by level, the bosses and what each demands, and the arithmetic behind the curve**

| Field | Value |
|---|---|
| Document type | Content specification |
| Audience | Combat design, gameplay programming, the playtest |
| Product context | Single-player. One hero walks down through about a hundred generated maps below a town, portal to portal |
| Classification | What the descent holds and why its difficulty rises the way it does. How travel between maps and town behaves for the player is the [map and camera page](../features/map-and-camera.md#travel); every archetype's numbers are the [enemy catalogue's](./enemy-catalogue.md) once written |
| Reference | Diablo I's descent and monster families; Diablo II's champion modifiers and act bosses; Dota 2's disables and the items that answer them |

---

## 1. Purpose

The descent is the game's structure: the hero walks a map, finds its portal, and steps through to the next, deeper and harder, to the last map at the bottom. This page fixes its shape: how many maps, how they group, which enemies stand in each group and why, what each boss asks of the player, and the arithmetic that says the curve rises all the way down with no enemy's stats scaled by a level.

Every number here is a starting value set against the hero expected at a depth, named beside it. The files that hold a map recipe, an archetype, or a boss own their numbers once written, and win when this page disagrees. What this page owns is the shape and the reasoning, above all the reasoning in [section 8](#8-why-the-curve-rises-without-scaling-an-enemy-by-level), which is the answer to a question that will be asked again.

---

## 2. The shape

| Property | Value |
|---|---|
| Maps | 100, each one map level deeper than the one above it: map 1 is map level 1, map 100 is map level 100 |
| Strata | Ten, of ten maps each. A stratum shares a look and a roster, introduces two families of enemy the hero has not met, and ends in a stratum boss on its tenth map |
| The town | Above map 1. No enemies, no drops, the store, and the town's waypoint ([travel](../features/map-and-camera.md#travel)) |
| A map | Generated from the run's seed and its map level, so the same run always walks the same map at the same depth |
| Enemies on a map | 90 to 130, the long road's density; a full clear takes about eight to twelve minutes |
| The hero's level | 1 at the top, about 12 by map 10, 21 by map 30, 25 by map 50, and 30, the table's top, near map 100. The [level table](../features/hero.md) keeps its first twelve levels as the long road reaches them, and changes only above 12; every variant of the descent carries experience of its own, set so a hero that clears most of each map follows this line. So the long road still reaches 12 at its last boss |
| Loot | Every drop at the map's level, as the [item catalogue](./item-catalogue.md#8-drops) says, so the deepest maps drop the deepest items |

### 2.1 A map's parts

Each generated map is a walk from its **arrival point**, where the hero comes in, to its **portal**, the way down to the next map. Between them:

- **Two or three regions**, harder toward the portal, as the long road's regions are. The Nave's maps are rooms and corridors, as Diablo I's Cathedral: rooms of open ground joined by corridors and doorways one to three bodies wide, so every map is full of places to hold a pack. Where a stratum's maps are open ground broken by blocks instead, each region is still closed by a choke.
- **One waypoint**, between a third and a half of the way from the arrival point to the portal along the walk, so reaching it is a fight and it saves part of the walk, never all of it.
- **Field packs** of the stratum's families, **elite packs** through each region, and one **map boss**: a boss-tier pack of one of the stratum's families with a guard, standing before the portal.
- On the tenth map of a stratum, the **stratum boss** in a chamber before the portal, which opens only once it is dead.

The arrival point and the waypoint, once reached, are the map's two checkpoints: a hero who dies comes back at the furthest of them.

### 2.2 The ten strata

| Stratum | Maps | Name | Families it introduces | What it teaches | Stratum boss |
|---|---|---|---|---|---|
| 1 | 1–10 | The Nave | Grunt, runner, archer, tank, frost raider, lancer | Kiting, range, a slow, a charge | The Gaolmaster |
| 2 | 11–20 | The Undercroft | Hexer, trapper, skirmisher, crusher, summoner, troll, brute | Disables from range, heavies, adds, a stun on a swing | The Hollow Abbess |
| 3 | 21–30 | The Ossuary | Leech, bolter | Mana drained over time; a stun in flight | Marrowleech |
| 4 | 31–40 | The Cisterns | Dragger, bloater | Pulled into the pack; a death that bursts | The Drowned Hook |
| 5 | 41–50 | The Warrens | Mender, dreadcaller | A healer to kill first; fear | The Brood Queen |
| 6 | 51–60 | The Furnace | Raiser, nest | A dead pack that stands again; a spawner that must be broken | The Kindled King |
| 7 | 61–70 | The Mirrorhalls | Flicker, kindler | A caster that blinks away; burning ground | The Glass Twins |
| 8 | 71–80 | The Hushed Choir | Hush, thornback | The items taken away; damage turned back | The Choirmaster |
| 9 | 81–90 | The Rift | Binder, nullifier | A tether that stuns on leaving; a field of silence | The Binder Below |
| 10 | 91–100 | The Pit | Splitter, bulwark | Bodies that split; a shield that faces the hero | The Unwound, the last boss |

The thirteen archetypes the long road holds are the first thirteen families. The long road stays what it is, a hand-authored playtest map outside the descent, compressed to take the hero from level 1 to 12 in one map; the descent spreads the same families over its first two strata at its own pace.

---

## 3. Families and variants

A **family** is a set of archetypes that pose one problem: one behaviour, one body shape, and one kit of enemy abilities, drawn with one silhouette. Each archetype of a family is a **variant**, numbered I to IV. A variant is a whole archetype with its own name, tint, and numbers, set against the hero expected at the stratum it stands in; the higher variants add one ability, or a stronger version of the family's own, so a variant IV reads as the same problem made sharper, not only larger.

A family lives five strata: variant I in the stratum that introduces it, II, III, and IV in the three below, and IV once more in its fifth, as the crowd around the newer families, before it retires. A family introduced in stratum 8 or deeper reaches the Pit before it reaches IV, and stops where it stands. So a map deep in the descent holds none of the enemies near the top, and every stratum holds two problems the hero has not met.

| Stratum | Families standing in it | Variants |
|---|---|---|
| 1 | 6 | Six at I |
| 2 | 13 | Seven at I, six at II |
| 3 | 15 | Two at I, seven at II, six at III |
| 4 | 17 | Two at I, two at II, seven at III, six at IV |
| 5 | 19 | Two at each of I, II, and III, seven at IV, and the first six at IV as the crowd |
| 6 | 15 | Two at each of I to III, two at IV, and the seven of stratum 2 at IV as the crowd |
| 7 to 10 | 10 each | Two at each of I to IV, and two more at IV as the crowd |

A map draws six to eight of its stratum's families: the two new ones always, in its later regions, and the rest as its seed chooses. The descent holds 29 families and about a hundred variants.

### 3.1 The sixteen families below the long road

Each is introduced for one problem, and each problem has an answer in the hero's kit or its active items.

| Family | Stratum | Behaviour | The problem | Its abilities | The answer |
|---|---|---|---|---|---|
| Leech | 3 | Kiter | Drains the hero's mana over time | `mana_burn`, cast at range | Gyre Sceptre on the hero sheds it; kill the leech first; spend the mana before it is taken |
| Bolter | 3 | Holder | A stun thrown as a slow, visible projectile | `stun_bolt` | Slipknife or Gyre Sceptre on the hero disjoints it; Hoarfrost or a lift in the bolter's cast point |
| Dragger | 4 | Holder | Pulls the hero into its pack | `drag_hook`, a homing projectile | Disjoint it; stand where the pack is not |
| Bloater | 4 | Chaser | Bursts on death, harming every unit near it, enemies too; a burst that kills another bloater sets it off on the next tick, so a chain runs one link a tick and can be seen | `death_burst` | Kill it at range, or push it off with Clarion first; or pop one inside its pack and let the chain do the work |
| Mender | 5 | Holder | Heals the most hurt member of its pack | `mend` | Kill it first; Veilblade or a lift takes it out of the fight |
| Dreadcaller | 5 | Kiter | Fear: the hero runs from it and takes no order | `fear` | Gyre Sceptre on the hero sheds it; a disable on the caster first |
| Raiser | 6 | Holder | Stands its pack's dead up again, once each | `raise` | Kill it before its pack, or while its pack still stands |
| Nest | 6 | Stationary | Brings runners of its stratum every few seconds until broken | `spawn_brood` | Break it; its brood leaves with it |
| Flicker | 7 | Kiter | Blinks away when the hero closes | `blink_away` | Fetter Bolas, Hoarfrost, or a lift; Slipknife after it |
| Kindler | 7 | Chaser | Leaves burning ground where it walks | `ember_trail` | Fight where it has not walked; kill it at range |
| Hush | 8 | Kiter | Mute: the six active-item keys refused for a few seconds | `mute` | The kit, which mute leaves alone; kill it first |
| Thornback | 8 | Chaser | Turns part of the damage it takes back on the hero | `thorns`, carried | Kill it with one burst; Veilblade on the hero turns the physical part away |
| Binder | 9 | Holder | A tether: leaving its circle before it ends stuns | `tether` | Stay and fight inside it, or be lifted by Gyre Sceptre until it breaks |
| Nullifier | 9 | Holder | Lays a field that silences whoever stands in it | `null_field` | Leave the field; the attack and the active items still work in it |
| Splitter | 10 | Chaser | Splits into two smaller on death, twice | `split` | Area damage; Rimeward and Skyfall Maul |
| Bulwark | 10 | Chaser | Its shield turns away projectiles and spells from its front | `front_shield` | Come at it from the side or behind; Slipknife behind it |

Each enemy ability and status named here is written with its family, in the enemy catalogue and the [status effects page](../features/status-effects.md), and each status gets its row in the [disable matrix](./disable-matrix.md) then. `mana_burn` is written now, since bosses cast it as early as stratum 3.

Deep variants resist magic, the Diablo II way: some variants III and IV carry magic resistance of 0.5 to 0.75, and a few in strata 9 and 10 carry 1, which a magical hit does nothing to. That is not an immunity rule: resistance is a number every archetype has, pure damage and the attack still land, and every disable still does. It asks the hero for a second kind of damage.

---

## 4. Aspects

An elite or boss pack of the descent rolls **aspects**: named modifiers its every member shares, shown as an icon over each, as Diablo II's champion and unique packs roll theirs. An aspect changes numbers or adds a carried status; it never makes a unit immune to a disable. They make one family read differently from map to map, which is how the descent gets new combinations without new families.

| Aspect | What it does |
|---|---|
| Swift | Movement speed and attack speed up by a third |
| Stoneskin | Armour doubled |
| Warded | Magic resistance up by 0.3, to at most 0.75 |
| Frostbound | Every hit may slow the hero, the frost raider's carried `frost_attack` |
| Leeching | Every hit applies a short `mana_burn` |
| Burning | Leaves burning ground where it dies |
| Rallying | Its pack within 600 attacks a quarter faster |
| Blinking | Blinks to the hero's side every eight seconds |
| Volley | A ranged attack looses three shots in a fan |
| Vengeful | Turns a fifth of the damage it takes back on the hero |

| Stratum | Aspects on an elite pack | Aspects on a map boss |
|---|---|---|
| 1 | 0 | 1 |
| 2 to 4 | 1 | 2 |
| 5 to 7 | 1 | 2 |
| 8 to 10 | 2 | 3 |

A stratum boss rolls none: its kit is written for it.

---

## 5. Bosses

### 5.1 Map bosses

Every map but a stratum's tenth has one map boss: a boss-tier unit of one of the stratum's families, with its tier's boss abilities, its aspects, and a guard of two or three of its family, standing before the portal. It drops as the item catalogue's boss table says. The portal does not wait on it; a hero may walk past it, and rarely can.

### 5.2 Stratum bosses

Each stratum ends with a boss of its own: an archetype written once, with its own kit, that stands in a chamber on the stratum's tenth map. The portal to the next stratum opens only once it is dead. Each is built around one demand the pillar names: it casts what a Dota hero fears, telegraphed, and the fight is won by the player who saw the cast and answered it. A boss changes what it casts below three quarters, a half, and a quarter of its health, since an ability's condition can already be a fraction of the caster's health; it is not scripted beyond that.

| Stratum boss | Map | What it casts | What it demands |
|---|---|---|---|
| The Gaolmaster | 10 | `stun_bolt` every six seconds, grunt adds, a slam | Disjoint the bolt with Slipknife or Gyre Sceptre, or be stunned among adds |
| The Hollow Abbess | 20 | `silence_curse`, a root net, summoner adds | Shed the silence with Gyre Sceptre, or kill the adds on the attack and items alone |
| Marrowleech | 30 | `mana_burn` on a clock and a leech's drain; mana-burning adds | Spend the mana before it burns, shed the burn, and finish it inside a window |
| The Drowned Hook | 40 | `drag_hook` into a ring of bloaters | Disjoint the hook, or be pulled into bursts |
| The Brood Queen | 50 | `fear` and nests that must be broken | Shed the fear, then break the nests before the brood grows |
| The Kindled King | 60 | Burning ground in rings, `thorns` | Read the ground and hold back when it turns damage back |
| The Glass Twins | 70 | Two flickers that blink apart; damage either takes is dealt to the other, whatever its state, so their health stays equal and they die together | Catch one: hold it with Fetter Bolas or a lift and spend the combo on it, since damage to either kills both |
| The Choirmaster | 80 | `mute` and `silence_curse` in turn | Read which is on: the kit when muted, the items when silenced |
| The Binder Below | 90 | `tether` and `stun_bolt` together | Stay inside the tether and disjoint the bolt, or lift out until the tether breaks |
| The Unwound | 100 | Every disable the descent has taught, one set a quarter of its health | Every answer, each at the right moment |

Each stratum boss drops a Legendary piece of its own at the catalogue's named-boss rate, beside its boss drops, so the descent grows the Legendary pieces with it.

---

## 6. Density

| Strata | Normal field pack | Elite pack | Elite share of a map's enemies | Enemies on a map |
|---|---|---|---|---|
| 1 to 3 | 3 to 6 | 2 to 3 | About 10% | 90 to 110 |
| 4 to 7 | 4 to 7 | 2 to 3 | About 15% | 100 to 120 |
| 8 to 10 | 5 to 8 | 3 | About 20% | 110 to 130 |

Every map is held to the long road's bound on live enemies near a point, so no walkable point has more than 60 enemies in packs within the sleep radius of it; the live cap of 200 stands. Density rises by pack size and elite share, never past that bound.

---

## 7. Loot at depth

A drop's item level is the map's, so the store and the ground reach deeper bases and affixes as the hero goes down. For the curve in [section 8](#8-why-the-curve-rises-without-scaling-an-enemy-by-level) to hold, the item catalogue must reach the bottom: bases and affix tiers whose quality and affix levels run to 100, so that a hero at the bottom wears about +100% magic damage and +25% cooldown reduction in all, and gold, which is `L` times a tier's range, buys what the store stocks at its level. A catalogue that stops at affix level 10, as the long road's does, leaves the hero's power flat below map 30 and the curve carried by enemy numbers alone, which is the descent the pillars rule out.

---

## 8. Why the curve rises without scaling an enemy by level

**The rule:** no enemy's stats read a level, of the map or of the hero. A map's level drives its loot alone. The rise comes from deeper and different archetypes, tiers, aspects, and density. This page keeps that rule on purpose, and this section is why.

### 8.1 What the hero brings

The hero's power at a depth, as an index where the level-1 hero at map 1 is 1. Offence is its spell damage per second: the orbs' tables, about three times from orb level 1 to 7 with Whorl's shorter clocks, times the magic damage and cooldown reduction its items give. Defence is its effective health: maximum health, about 516 at level 1 and 2040 at level 30, with armour and worn items.

| Map | Hero level | Orb levels | Items give, about | Offence | Defence |
|---|---|---|---|---|---|
| 1 | 1 | 1 | Nothing | 1.0 | 1.0 |
| 10 | 12 | About 4 | +10% magic damage | 2.1 | 2.0 |
| 20 | 17 | About 6 | +20% | 2.9 | 2.7 |
| 30 | 21 | 7 | +30%, +5% cooldown reduction | 3.4 | 3.2 |
| 50 | 25 | 7 | +50%, +10% | 4.5 | 4.0 |
| 70 | 28 | 7 | +70%, +15% | 5.6 | 4.7 |
| 100 | 30 | 7 | +100%, +25% | 7.0 | 5.5 |

### 8.2 What the enemies must bring

For each map to be harder than the one above, the time the hero takes to kill a normal enemy and the share of its health a normal enemy takes per second must both rise with depth, not only keep pace. The descent sets them to rise to about 1.6 times and 1.5 times over its length, so the average normal enemy's health must reach about 11 times, and its damage about 8 times, a stratum 1 variant I's.

| Map | Normal enemy health, target | Against the hero's offence | Normal enemy damage, target | Against the hero's defence |
|---|---|---|---|---|
| 1 | 1.0 | 1.0 | 1.0 | 1.0 |
| 10 | 2.3 | 1.1 | 2.1 | 1.05 |
| 30 | 4.2 | 1.24 | 3.5 | 1.09 |
| 50 | 5.9 | 1.31 | 4.6 | 1.15 |
| 70 | 7.7 | 1.38 | 5.6 | 1.19 |
| 100 | 11.2 | 1.6 | 8.3 | 1.5 |

### 8.3 What each instrument can carry

- **Tiers** multiply by fixed amounts: an elite has three times its archetype's health and a boss four. They do not grow with depth, so they carry only the mix: a map whose elite share rises from 10% to 20% raises the average enemy's health by about 1.16.
- **Aspects** carry about 1.2 more on the enemies that roll them, averaged over a map.
- **Density** raises how many enemies press the hero at once, about 1.4 from the top to the bottom by pack size, but not how long any one takes to kill, and the live cap and the near-point bound stop it there.
- **New families** bring problems, not numbers: a leech or a hush makes a fight harder in a way no multiplier measures.

Together tiers and aspects carry about 1.4 of the 11.2. The rest, about 8 times in health and 5.5 in damage, must come from the archetypes' own numbers: a variant IV of stratum 10 has about eight times the health of a variant I of stratum 1.

### 8.4 Why not a multiplier by level

A multiplier by map level would reach the same numbers on the same archetypes: a grunt at map 90 with eight times its health. It is refused for three reasons.

1. **An archetype is something the player learns.** A grunt dies to three of the hero's attacks, a runner to one; the enemy catalogue sets every archetype by how many of the hero's hits it takes, and the hero's attack does not grow with level so those counts hold. A grunt that takes three hits at map 1 and fourteen at map 90 is two different enemies wearing one name, and neither can be learned.
2. **The vision rules out a descent that grows harder only by making the same enemies bigger.** A multiplier by level is exactly that, applied everywhere at once, and it tempts every later decision to reach for it.
3. **It is the maintainer's answer, given twice.** A level drives only loot.

The cost of refusing it is width: about a hundred variants in 29 families. A variant is content, not code: its family's behaviour and abilities, a row of numbers set against the hero at its stratum, a tint, and at most one ability more. The families are the real cost, sixteen new behaviours and abilities below the long road, two a stratum, and each is paid for by a new problem the descent needs anyway.

If a playtest of the deep strata finds the curve flat with every family and aspect in place, the answer is a closer look at the hero's side, the catalogue at depth and the level table, before any enemy reads a level.

---

## 9. Open numbers

- The level table above level 12, and each variant's experience: the long road reaches level 12 in one map and keeps doing so, the descent reaches it by map 10 on its variants' own, smaller experience.
- Each family's variant numbers, written against the hero at its stratum by the enemy catalogue's method: hits to kill and hits to be killed.
- The generator's map recipe per stratum: its size, regions, chokes, and pack budget against the density table.
- The stratum bosses' kits in numbers, and their Legendary pieces.

---

## Related documentation

- [Map and camera](../features/map-and-camera.md#travel) — portals, waypoints, the town portal, and the town as the player uses them
- [Enemy catalogue](./enemy-catalogue.md) — the method every variant's numbers follow, and the thirteen families of the top
- [Item catalogue](./item-catalogue.md) — the loot tables whose level is the map's, and the catalogue the curve needs at depth
- [Status effects](../features/status-effects.md) — mana burn, dispel, disjoint, and the statuses the families bring
- [Product vision](../vision.md) — the descent and roster pillars this page makes concrete
