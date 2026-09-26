# The long road

> **Entry point:** [Product](../README.md)
> **See also:** [Map and camera](../features/map-and-camera.md) · [Enemies](../features/enemies.md) · [Enemy catalogue](./enemy-catalogue.md)

**Helix — The playtest map as data: the rectangle, the five regions, every pack, the walls, the checkpoints, and the experience that takes the hero from level 1 to level 10**

| Field | Value |
|---|---|
| Document type | Content specification |
| Audience | Gameplay programming, combat design, the playtest |
| Product context | Single-player. The hero walks one long map from the spawn at level 1 to the last boss at about level 10 |
| Classification | What the long road holds and why. What a map is, the camera, and the arena are the [map and camera page](../features/map-and-camera.md); how packs wake, sleep, and fight is the [enemies page](../features/enemies.md) |
| Map id | `long_road`, written in `src/content/maps/long-road.def.ts` from this page |
| Reference | Every experience number is the [enemy catalogue's](./enemy-catalogue.md#3-the-archetypes); every level is `experienceThresholds` in `src/content/hero.ts` |

---

## 1. Purpose

The long road is a hand-authored map for playtesting the early game. The hero starts at one end at level 1 and walks to the last boss at the other, meeting the roster a few archetypes at a time, so which way is harder is never a question: forward is. It exists to answer how the early game feels, how the hero's kit plays against each archetype, and how a crowd behaves in a narrow place.

This page fixes the map as data: the bounds, the regions, one row per pack, every wall, the checkpoints, and the experience budget that the pack list adds up to. The definition file is written from it, and a test reads the pack table and the budget in [section 4](#4-the-packs) and [section 7](#7-the-experience-budget) against the file, so a pack changed in one is changed in both. Every number is a starting value the playtest may move; the budget names its inputs so a retune recomputes it rather than invalidating it.

---

## 2. The rectangle

| Property | Value |
|---|---|
| Bounds | 4000 by 24000 world units, `minX 0`, `minY 0`, `maxX 4000`, `maxY 24000`, walled on every side |
| Direction | Along the long axis: the spawn at low `y`, the last boss at high `y` |
| On screen | The square world is drawn as the [isometric view](../../adr/0006-isometric-view-over-a-square-world.md) draws every map, so a strip along `y` runs diagonally across the screen, from upper right to lower left. That is the road's look, not a mistake |
| Walkability grid | 125 by 750 cells of 32 units, one layer for each of the three radius classes |
| Spawn point | (2000, 400), the first checkpoint |
| Packs | 32, every one dormant, 54 enemies in all |
| Obstacles | 137 rectangles: 10 choke walls and 127 blocks, every edge on a 32-unit cell boundary |
| Checkpoints | 6 |

---

## 3. The regions

A region is a stretch of the road between two chokes, or between a choke and the end of the map. Each is harder than the one before it, and each is a lesson: the archetypes it adds are ones the hero has not yet met. Difficulty is which archetypes stand there, at which tier, and how many; no pack is made stronger than its tier (no per-pack or per-level scaling). Every region has an elite pack through its middle and closes with a boss-tier pack and its guard at a choke.

| Region | Name | From `y` | To `y` | Archetypes it adds | Closing boss | The choke after it |
|---|---|---|---|---|---|---|
| 1 | The approach | 0 | 4800 | Grunt, runner | Boss grunt | 4800 to 4960, 416 wide |
| 2 | The line | 4960 | 9600 | Archer, frost raider, lancer | Boss frost raider | 9600 to 9760, 352 wide |
| 3 | The hexes | 9760 | 14400 | Hexer, trapper, skirmisher | Boss skirmisher | 14400 to 14560, 288 wide |
| 4 | The heavies | 14560 | 19200 | Tank, troll, summoner, crusher | Boss troll | 19200 to 19360, 288 wide |
| 5 | The hall | 19360 | 24000 | Brute | Boss brute, the last boss | 22560 to 22720, 224 wide, into the last boss's chamber |

**1 · The approach.** Grunts and runners only: the grunt is kited, the runner is not. The elite grunt is the first tell, its slam. The boss grunt adds a heal and a charge, so the first boss is a grunt the hero cannot walk away from.

**2 · The line.** Ranged fire, a slow, and a charge: an archer punishes standing still, a frost raider catches a hero walking away, and a lancer makes distance unsafe. The three answers the hero learned in region 1 each stop working once.

**3 · The hexes.** Disables from range: a hexer's silence, a trapper's net, a skirmisher's heavy arrow from beyond the hero's reach. The boss skirmisher kites, nets, and heals, and is caught by a spell, not by walking.

**4 · The heavies.** Health and armour: a tank and a crusher take combos, a troll has to be finished, and a summoner has to be killed before its imps are. The first adds on the road are here. The boss troll heals, slams, and charges.

**5 · The hall.** The brute's bash, then the last boss: a boss brute, which bashes, slams, charges, and brings adds, with two brutes beside it in a chamber past the narrowest choke.

The dummy and the imp are never placed. Imps enter only as a summoner's or a boss's adds.

---

## 4. The packs

One row per pack. Every pack is dormant: it costs no unit until the hero comes within the activation radius, and sleeps again once left behind, as the [enemies page](../features/enemies.md#dormant-packs) says. The position is the point a pack stands around; its members are placed on free cells around it. Every position is at least 256 units from any obstacle's edge and at least 1080 from every checkpoint, so a hero who comes back at a checkpoint is outside every aggro radius on the road.

A **field** pack stands in a region's open ground. A **guard** stands between the hero and a region's boss, on the hero's side of it. A **boss** pack is one boss-tier unit a little way before the choke; the **last boss** stands in the chamber past the last choke. A guard and its boss are two packs: they wake together but share aggro only within each, so a hero who pulls the guard at the edge of its range can fight it before the boss.

The experience column is the archetype's experience from the catalogue, times the tier's multiplier, times the count.

| # | Region | Archetype | Tier | Count | x | y | Role | Experience |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 | `melee_grunt` | normal | 3 | 2000 | 1600 | field | 138 |
| 2 | 1 | `fast_runner` | normal | 3 | 1100 | 2300 | field | 90 |
| 3 | 1 | `melee_grunt` | elite | 1 | 2900 | 2800 | field | 138 |
| 4 | 1 | `fast_runner` | normal | 2 | 1300 | 3300 | field | 60 |
| 5 | 1 | `melee_grunt` | normal | 2 | 2000 | 3900 | guard | 92 |
| 6 | 1 | `melee_grunt` | boss | 1 | 2000 | 4240 | boss | 460 |
| 7 | 2 | `ranged_archer` | normal | 3 | 2000 | 6600 | field | 150 |
| 8 | 2 | `frost_raider` | normal | 3 | 1000 | 7100 | field | 114 |
| 9 | 2 | `melee_grunt` | normal | 2 | 3000 | 7300 | field | 92 |
| 10 | 2 | `lancer` | normal | 2 | 1600 | 7900 | field | 130 |
| 11 | 2 | `ranged_archer` | elite | 1 | 2800 | 8200 | field | 150 |
| 12 | 2 | `ranged_archer` | normal | 2 | 2000 | 8700 | guard | 100 |
| 13 | 2 | `frost_raider` | boss | 1 | 2000 | 9040 | boss | 380 |
| 14 | 3 | `hexer` | normal | 2 | 2000 | 11400 | field | 120 |
| 15 | 3 | `trapper` | normal | 2 | 1000 | 11900 | field | 110 |
| 16 | 3 | `fast_runner` | normal | 2 | 3000 | 12000 | field | 60 |
| 17 | 3 | `skirmisher` | normal | 2 | 2400 | 12600 | field | 110 |
| 18 | 3 | `lancer` | elite | 1 | 1200 | 13000 | field | 195 |
| 19 | 3 | `melee_grunt` | normal | 3 | 2000 | 13500 | guard | 138 |
| 20 | 3 | `skirmisher` | boss | 1 | 2000 | 13840 | boss | 550 |
| 21 | 4 | `tank` | normal | 1 | 2000 | 16200 | field | 120 |
| 22 | 4 | `troll` | normal | 1 | 1000 | 16700 | field | 85 |
| 23 | 4 | `summoner` | normal | 1 | 3000 | 16900 | field | 70 |
| 24 | 4 | `crusher` | normal | 1 | 1600 | 17500 | field | 110 |
| 25 | 4 | `frost_raider` | elite | 1 | 2800 | 17800 | field | 114 |
| 26 | 4 | `melee_grunt` | normal | 2 | 2000 | 18300 | guard | 92 |
| 27 | 4 | `troll` | boss | 1 | 2000 | 18640 | boss | 850 |
| 28 | 5 | `brute` | normal | 1 | 2000 | 21000 | field | 90 |
| 29 | 5 | `summoner` | elite | 1 | 1000 | 21400 | field | 210 |
| 30 | 5 | `skirmisher` | normal | 2 | 3000 | 21400 | field | 110 |
| 31 | 5 | `brute` | normal | 2 | 2000 | 23200 | guard | 180 |
| 32 | 5 | `brute` | boss | 1 | 2000 | 23560 | last boss | 900 |

| Tier | Packs | Enemies |
|---|---|---|
| Normal | 22 | 44 |
| Elite | 5 | 5 |
| Boss | 5 | 5 |
| Total | 32 | 54 |

Thirty-two packs, because the budget decides the number: five boss-tier units at ten times their archetype's experience take 3140 of the 6308 a full clear pays. More packs means smaller ones, or a hero past level 10 before the last boss.

---

## 5. The obstacles

### 5.1 The chokes

Each region ends at a wall that runs the whole width of the map, 160 units deep, with one opening centred on `x` 2000. The opening narrows along the road. Every choke is open to all three radius classes: a large unit, 50 in radius, has 124 units of play in the narrowest. The chokes are where a crowd presses the hero, and where the hero's share of push-out is judged in the playtest.

| Choke | Between | West wall | East wall | Opening |
|---|---|---|---|---|
| 1 | Regions 1 and 2 | (0, 4800) to (1792, 4960) | (2208, 4800) to (4000, 4960) | 416 wide, 13 cells |
| 2 | Regions 2 and 3 | (0, 9600) to (1824, 9760) | (2176, 9600) to (4000, 9760) | 352 wide, 11 cells |
| 3 | Regions 3 and 4 | (0, 14400) to (1856, 14560) | (2144, 14400) to (4000, 14560) | 288 wide, 9 cells |
| 4 | Regions 4 and 5 | (0, 19200) to (1856, 19360) | (2144, 19200) to (4000, 19360) | 288 wide, 9 cells |
| 5 | Region 5 and the last boss's chamber | (0, 22560) to (1888, 22720) | (2112, 22560) to (4000, 22720) | 224 wide, 7 cells |

### 5.2 The blocks

Inside a region, blocks break up the open ground so the road is not a straight line and a kiting hero has corners to use. They stand in rows every 384 units along the road, four to a row and three to the next in turn, eight sizes from 160 by 160 to 480 by 160 in rotation. A block that would come within about 280 units of a pack's position or a checkpoint is left out. The gaps between blocks, and between a block and a choke's opening, are open to the large radius class, so every checkpoint and every pack is reachable from the spawn by a unit of every size. [The appendix](#appendix-the-blocks) lists all 127.

---

## 6. The checkpoints

A checkpoint is a point on the road the hero comes back to after dying. The furthest one reached is where it comes back; walking back to an earlier one changes nothing. There is one at the spawn, one at each region's entrance, and one before the last boss, in order along the road. Each stands on open ground, walkable for every radius class, and more than 1000 units from every pack.

| # | Where | `x` | `y` | Nearest pack |
|---|---|---|---|---|
| 1 | The spawn | 2000 | 400 | 1200, pack 1 |
| 2 | Region 2's entrance, past choke 1 | 2000 | 5440 | 1160, pack 7 |
| 3 | Region 3's entrance, past choke 2 | 2000 | 10240 | 1160, pack 14 |
| 4 | Region 4's entrance, past choke 3 | 2000 | 15040 | 1160, pack 21 |
| 5 | Region 5's entrance, past choke 4 | 2000 | 19840 | 1160, pack 28 |
| 6 | Before the last boss, short of choke 5 | 2000 | 22080 | 1080, pack 31 |

A region's boss stands 1200 units short of the next checkpoint, so a hero that dies to it comes back at the region's own entrance, not past it.

---

## 7. The experience budget

### 7.1 The inputs

| Input | Where it lives | Value |
|---|---|---|
| Experience per archetype | The `experience` field of each definition under `src/content/enemies/`, in the [catalogue](./enemy-catalogue.md#3-the-archetypes) | Grunt 46, runner 30, archer 50, tank 120, brute 90, frost raider 38, hexer 60, trapper 55, skirmisher 55, crusher 110, summoner 70, lancer 65, troll 85 |
| Tier multipliers | `elite_experience_multiplier` and `boss_experience_multiplier` in `src/content/tuning.ts` | Normal 1, elite 3, boss 10 |
| Adds | The imp's definition | 0: an add grants nothing |
| Level table | `experienceThresholds` in `src/content/hero.ts` | Level 9 at 4620, level 10 at 5550, level 11 at 6520 |

A retune of any input recomputes the tables below from the pack list; the pack list does not move with it unless the checks in [section 7.3](#73-the-checks) stop holding.

### 7.2 Per region

| Region | Packs | Normal | Elite | Boss | Region total | Running total | Level at the region's end |
|---|---|---|---|---|---|---|---|
| 1 · The approach | 6 | 380 | 138 | 460 | 978 | 978 | 3 |
| 2 · The line | 7 | 586 | 150 | 380 | 1116 | 2094 | 5 |
| 3 · The hexes | 7 | 538 | 195 | 550 | 1283 | 3377 | 7 |
| 4 · The heavies | 7 | 477 | 114 | 850 | 1441 | 4818 | 9 |
| 5 · The hall, before the last boss | 4 | 380 | 210 | 0 | 590 | 5408 | 9 |
| The last boss | 1 | 0 | 0 | 900 | 900 | 6308 | 10 |
| **Full clear** | **32** | **2361** | **807** | **3140** | **6308** | | **10** |

Each of the first four regions is two levels: 1 to 3, 3 to 5, 5 to 7, 7 to 9. The fifth is one, and the last boss's kill is the one that takes it.

### 7.3 The checks

| Check | Holds because |
|---|---|
| A full clear reaches level 10 with the last boss's kill, not before | Everything before the last boss is 5408, 142 short of 5550; its 900 makes 6308 |
| A full clear stays under level 11 | 6308 is 212 short of 6520 |
| A hero who skips a fifth of the normal packs still reaches level 9 before the last boss | A fifth of the 22 normal packs is 5. Skipping the five worth most, packs 31, 7, 1, 19, and 10, loses 736 and leaves 4672, 52 over 4620 |

The fifth skipped is the costliest one on purpose: any other fifth leaves more.

---

## 8. Live enemies near any point

The long road holds its packs asleep until the hero is near and puts them back to sleep once it is past, so the live count follows the hero rather than the map. The bound the map's content test holds is:

**No walkable point on the road has more than 40 enemies in packs whose position lies within the sleep radius of it, for any sleep radius up to 3200.**

The pack list as written peaks at 14 within 2000 of a point, near the middle of region 2, and at 22 within 3200, around choke 1. The live cap is 200, so the bound leaves 160 for adds, which a summoner and the last boss bring two at a time, and for packs behind the hero that have not yet gone home and slept. A pack added or grown in the playtest keeps the bound or the bound is argued again here.

---

## Appendix: the blocks

Every block, in order along the road. Coordinates are world units, each on a 32-unit cell boundary.

| # | Region | minX | minY | maxX | maxY |
|---|---|---|---|---|---|
| B1 | 1 | 2496 | 480 | 2656 | 800 |
| B2 | 1 | 3392 | 512 | 3648 | 768 |
| B3 | 1 | 384 | 576 | 544 | 736 |
| B4 | 1 | 1280 | 576 | 1600 | 736 |
| B5 | 1 | 1920 | 768 | 2080 | 1248 |
| B6 | 1 | 2848 | 896 | 3232 | 1120 |
| B7 | 1 | 704 | 960 | 1184 | 1120 |
| B8 | 1 | 384 | 1216 | 608 | 1600 |
| B9 | 1 | 3456 | 1248 | 3616 | 1568 |
| B10 | 1 | 1344 | 1344 | 1504 | 1504 |
| B11 | 1 | 2400 | 1344 | 2720 | 1504 |
| B12 | 1 | 2944 | 1536 | 3104 | 2016 |
| B13 | 1 | 832 | 1664 | 1088 | 1920 |
| B14 | 1 | 288 | 2048 | 672 | 2272 |
| B15 | 1 | 2496 | 2112 | 2656 | 2272 |
| B16 | 1 | 3360 | 2112 | 3680 | 2272 |
| B17 | 1 | 1856 | 2432 | 2112 | 2688 |
| B18 | 1 | 384 | 2688 | 544 | 3168 |
| B19 | 1 | 3456 | 2880 | 3616 | 3040 |
| B20 | 1 | 1920 | 3168 | 2080 | 3488 |
| B21 | 1 | 2912 | 3200 | 3168 | 3456 |
| B22 | 1 | 3392 | 3520 | 3616 | 3904 |
| B23 | 1 | 2368 | 3584 | 2752 | 3808 |
| B24 | 1 | 256 | 3648 | 736 | 3808 |
| B25 | 1 | 2944 | 3936 | 3104 | 4256 |
| B26 | 1 | 896 | 4032 | 1056 | 4192 |
| B27 | 2 | 2496 | 5376 | 2656 | 5856 |
| B28 | 2 | 352 | 5472 | 608 | 5728 |
| B29 | 2 | 1216 | 5504 | 1696 | 5664 |
| B30 | 2 | 3328 | 5504 | 3712 | 5728 |
| B31 | 2 | 832 | 5792 | 1056 | 6176 |
| B32 | 2 | 1920 | 5888 | 2080 | 6048 |
| B33 | 2 | 2880 | 5888 | 3200 | 6048 |
| B34 | 2 | 3456 | 6144 | 3616 | 6624 |
| B35 | 2 | 384 | 6208 | 544 | 6528 |
| B36 | 2 | 1312 | 6240 | 1568 | 6496 |
| B37 | 2 | 2304 | 6272 | 2784 | 6432 |
| B38 | 2 | 2944 | 6656 | 3104 | 6816 |
| B39 | 2 | 1344 | 6976 | 1504 | 7296 |
| B40 | 2 | 2432 | 7008 | 2688 | 7264 |
| B41 | 2 | 320 | 7040 | 640 | 7200 |
| B42 | 2 | 3264 | 7040 | 3744 | 7200 |
| B43 | 2 | 1792 | 7424 | 2176 | 7648 |
| B44 | 2 | 3392 | 7776 | 3648 | 8032 |
| B45 | 2 | 384 | 7808 | 544 | 7968 |
| B46 | 2 | 704 | 8192 | 1184 | 8352 |
| B47 | 2 | 384 | 8480 | 608 | 8864 |
| B48 | 2 | 3456 | 8512 | 3616 | 8832 |
| B49 | 2 | 1344 | 8576 | 1504 | 8736 |
| B50 | 2 | 2400 | 8576 | 2720 | 8736 |
| B51 | 2 | 2944 | 8832 | 3104 | 9312 |
| B52 | 2 | 832 | 8928 | 1088 | 9184 |
| B53 | 3 | 1344 | 10208 | 1568 | 10592 |
| B54 | 3 | 288 | 10304 | 672 | 10528 |
| B55 | 3 | 2496 | 10304 | 2656 | 10464 |
| B56 | 3 | 3360 | 10304 | 3680 | 10464 |
| B57 | 3 | 896 | 10624 | 1056 | 10944 |
| B58 | 3 | 1856 | 10656 | 2112 | 10912 |
| B59 | 3 | 2816 | 10688 | 3296 | 10848 |
| B60 | 3 | 384 | 10944 | 544 | 11424 |
| B61 | 3 | 2432 | 10976 | 2656 | 11360 |
| B62 | 3 | 1248 | 11072 | 1632 | 11296 |
| B63 | 3 | 3456 | 11072 | 3616 | 11232 |
| B64 | 3 | 2912 | 11424 | 3168 | 11680 |
| B65 | 3 | 1344 | 11712 | 1504 | 12192 |
| B66 | 3 | 3392 | 11744 | 3616 | 12128 |
| B67 | 3 | 256 | 11840 | 736 | 12000 |
| B68 | 3 | 896 | 12224 | 1056 | 12384 |
| B69 | 3 | 1856 | 12224 | 2176 | 12384 |
| B70 | 3 | 352 | 12576 | 608 | 12832 |
| B71 | 3 | 3328 | 12608 | 3712 | 12832 |
| B72 | 3 | 1920 | 12992 | 2080 | 13152 |
| B73 | 3 | 2880 | 12992 | 3200 | 13152 |
| B74 | 3 | 3456 | 13248 | 3616 | 13728 |
| B75 | 3 | 384 | 13312 | 544 | 13632 |
| B76 | 3 | 1312 | 13344 | 1568 | 13600 |
| B77 | 3 | 2304 | 13376 | 2784 | 13536 |
| B78 | 3 | 768 | 13760 | 1152 | 13984 |
| B79 | 3 | 2944 | 13760 | 3104 | 13920 |
| B80 | 4 | 1344 | 15040 | 1504 | 15360 |
| B81 | 4 | 2432 | 15072 | 2688 | 15328 |
| B82 | 4 | 320 | 15104 | 640 | 15264 |
| B83 | 4 | 3264 | 15104 | 3744 | 15264 |
| B84 | 4 | 896 | 15360 | 1056 | 15840 |
| B85 | 4 | 2944 | 15392 | 3168 | 15776 |
| B86 | 4 | 1792 | 15488 | 2176 | 15712 |
| B87 | 4 | 2496 | 15808 | 2656 | 16128 |
| B88 | 4 | 3392 | 15840 | 3648 | 16096 |
| B89 | 4 | 384 | 15872 | 544 | 16032 |
| B90 | 4 | 1280 | 15872 | 1600 | 16032 |
| B91 | 4 | 2848 | 16256 | 3232 | 16480 |
| B92 | 4 | 384 | 16544 | 608 | 16928 |
| B93 | 4 | 3456 | 16576 | 3616 | 16896 |
| B94 | 4 | 1344 | 16640 | 1504 | 16800 |
| B95 | 4 | 2400 | 16640 | 2720 | 16800 |
| B96 | 4 | 832 | 16992 | 1088 | 17248 |
| B97 | 4 | 1760 | 17024 | 2240 | 17184 |
| B98 | 4 | 288 | 17408 | 672 | 17632 |
| B99 | 4 | 3360 | 17408 | 3680 | 17568 |
| B100 | 4 | 896 | 17728 | 1056 | 18048 |
| B101 | 4 | 1856 | 17760 | 2112 | 18016 |
| B102 | 4 | 384 | 18048 | 544 | 18528 |
| B103 | 4 | 2432 | 18080 | 2656 | 18464 |
| B104 | 4 | 1248 | 18176 | 1632 | 18400 |
| B105 | 4 | 3456 | 18176 | 3616 | 18336 |
| B106 | 4 | 2912 | 18528 | 3168 | 18784 |
| B107 | 4 | 800 | 18560 | 1120 | 18720 |
| B108 | 5 | 1344 | 19776 | 1504 | 20256 |
| B109 | 5 | 3392 | 19808 | 3616 | 20192 |
| B110 | 5 | 256 | 19904 | 736 | 20064 |
| B111 | 5 | 2368 | 19904 | 2752 | 20128 |
| B112 | 5 | 2944 | 20224 | 3104 | 20544 |
| B113 | 5 | 896 | 20288 | 1056 | 20448 |
| B114 | 5 | 1856 | 20288 | 2176 | 20448 |
| B115 | 5 | 2496 | 20544 | 2656 | 21024 |
| B116 | 5 | 352 | 20640 | 608 | 20896 |
| B117 | 5 | 1216 | 20672 | 1696 | 20832 |
| B118 | 5 | 3328 | 20672 | 3712 | 20896 |
| B119 | 5 | 3456 | 21312 | 3616 | 21792 |
| B120 | 5 | 384 | 21376 | 544 | 21696 |
| B121 | 5 | 1312 | 21408 | 1568 | 21664 |
| B122 | 5 | 768 | 21824 | 1152 | 22048 |
| B123 | 5 | 2944 | 21824 | 3104 | 21984 |
| B124 | 5 | 1344 | 23200 | 1504 | 23520 |
| B125 | 5 | 2432 | 23232 | 2688 | 23488 |
| B126 | 5 | 320 | 23296 | 640 | 23456 |
| B127 | 5 | 3264 | 23296 | 3744 | 23456 |

---

## Related documentation

- [Map and camera](../features/map-and-camera.md) — what a map holds, the arena beside the long road, and how the camera shows it
- [Enemies](../features/enemies.md) — packs, tiers, dormancy, and experience as the player sees them
- [Enemy catalogue](./enemy-catalogue.md) — every archetype's numbers, the experience this budget adds up
- [Hero](../features/hero.md) — the level table the budget is set against
- [ADR 0006 — The isometric view](../../adr/0006-isometric-view-over-a-square-world.md) — why a long strip runs diagonally on screen
