# The enemy retune: Diablo II Act 1 ratios

**Written:** 2026-09-26 · **By:** the delivery strategist, from the draft the maintainer approved with changes the same day · **Used by:** P6-S30-T03, linked from the enemy catalogue · **Updated when:** the clean playtest retunes a number

The numbers P6-S30-T03 sets, how each was reached from Diablo II's first act at normal difficulty, and the Diablo II figures they came from. The hero is not changed; the hero's side toward Diablo II curves is a row of [Deferred](../backlog/deferred.md).

**What is sourced and what is estimated.** Monster health, damage, level, and the champion and unique rules are transcribed from The Arreat Summit, high confidence, except where marked [fextralife]. Four inputs are **estimates, not sourced figures**, and every number resting on them is marked so: the Diablo II hero's life curve (50 + 9.5 per level), a Diablo II hero's hit (3 + 1.2 per level), every speed fraction, since no reachable source publishes monster speeds, and the hit chance, which the draft set at 0.5 and the maintainer dropped. Health is the robust part: the 1 to 4 hit band pins it whatever the estimates.

---

## The maintainer's decisions, 2026-09-26

- Health, health regeneration, and movement speed per archetype exactly as drafted.
- Attack damage **twice the draft**: the draft multiplied each hit's share by a Diablo II hit chance of 0.5, and this game has no miss, so the discount is dropped. Hits to kill the hero roughly halve.
- `elite_health_multiplier` stays 3; `boss_health_multiplier` 10 to 4; the experience multipliers unchanged.
- A tier damage multiplier, `elite_damage_multiplier` and `boss_damage_multiplier`, both 1.5, read at spawn as the health multipliers are (Q71), built as P6-S29-T08.
- `self_heal` 40 a second to 10.
- The last boss stays a boss-tier brute, 340 health; the gap to Andariel is the Deferred row "A dedicated last boss", revisited after the clean run.
- Spells are not changed; their overkill is flagged below for the playtest.

---

## The hero these numbers are set against, unchanged

| Hero level | 1 | 3 | 5 | 7 | 8 | 9 | 10 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Max health (120 + 22 × strength) | 516 | 622 | 727 | 833 | 886 | 938 | 991 |
| Armour (agility / 6), and the share of physical damage it blocks | 2.33, 12.3 % | 2.97, 15.1 % | 3.60, 17.8 % | 4.23, 20.3 % | 4.55, 21.4 % | 4.87, 22.6 % | 5.18, 23.7 % |
| Basic attack | 42 every 1.49 s | 42 / 1.44 s | 42 / 1.40 s | 42 / 1.36 s | 42 / 1.34 s | 42 / 1.32 s | 42 / 1.30 s |

- The basic attack's damage does not grow with level: `attackDamageOf` is the definition's damage plus modifier rows. Level adds attack speed, health, and armour; damage grows only through modifiers, Ember instances (+3 at Ember 1 to +21 at Ember 7, each, up to three held) and Quicken. So hits to kill at a region's level are hits to kill at 42.
- The hero's speed is `base_ms`, 280. Before the retune four archetypes outran it: the runner 340, the imp 300, the frost raider 290, the skirmisher 290. After it none does.
- Region entry levels, from the long road spec: region 1 level 1, region 2 level 3, region 3 level 5, region 4 level 7, region 5 level 9, the last boss killed at 9 to 10. Each archetype is tuned at the entry level of the first region it appears in, the hardest case; nothing scales per region.
- Armour reduction is `0.06a / (1 + 0.06a)`. The hero's 42 lands as 42, 39.6, 37.5, 35.6, 33.9, 30.9, and 28.4 against armour 0, 1, 2, 3, 4, 6, and 8.

## The mapping

One to one onto the fourteen Act 1 monsters the ticket names, each at the variant a Diablo II player meets at the matching point of the act.

| Archetype (first region) | Diablo II monster (variant, level) | Why |
| --- | --- | --- |
| `melee_grunt` (1) | Zombie (Zombie, 1) | Slow, relentless melee that is kited. Corpsefire, the first unique, is a Zombie, as the first boss is a grunt |
| `fast_runner` (1) | Fallen (Fallen, 1) | The weakest and quickest of the Blood Moor's pack fodder, one hit |
| `ranged_archer` (2) | Corrupt Rogue Archer (Dark Ranger, 4) | The Stony Field archer that holds range and punishes standing still |
| `frost_raider` (2) | Corrupt Rogue (Vile Hunter, 5) | Plain quick melee that chases a hero walking away; the slow on its hit is its own status |
| `lancer` (2) | Corrupt Spearwoman (Vile Lancer, 5) | Diablo II calls her variants Lancers; reach melee with Jab and Power Strike, the charge |
| `hexer` (3) | Skeleton Mage (Returned Mage, 8) | A caster at range with magic resistance, the one to kill first |
| `trapper` (3) | Skeleton Archer (Returned Archer, 8) | A ranged holder; the net is its ability on top |
| `skirmisher` (3) | Spike Fiend (Thorn Beast, 8) | Small, quick, fires volleys at range |
| `tank` (4) | Wendigo (Yeti, 9) | The act's biggest, slowest-to-kill normal, with sweeping blows; Treehead Woodfist is one |
| `troll` (4) | Giant Spider (Arach, 11) | Regenerates half again as fast as other monsters: finished, not worn down |
| `summoner` (4) | Fallen Shaman (Dark Shaman, 11) | Revives its pack, dies fast, has a ranged bolt |
| `crusher` (4) | Goatman (Death Clan, 10) | Armoured clan warrior with block, a heavy melee hitter |
| `imp` (adds, 4) | Blood Hawk (Foul Crow, 4) | Spawned by something else, fragile, quick, and gives no experience, as a nest-spawned hawk |
| `brute` (5) | Skeleton (Burning Dead, 13) | Region 5 is the Catacombs tier; Bonebreaker, the skeleton brute unique, is Extra Strong |

| Region boss (boss tier) | Diablo II unique | Its health over its base type's at the same level | Why |
| --- | --- | --- | --- |
| Boss grunt (1) | Corpsefire | 38 over a Zombie, about **4.0** | The Zombie boss of the first dungeon |
| Boss frost raider (2) | Rakanishu (Coldcrow for the theme, but her figures are not published) | 26 over a Carver's 6.5, **4.0** | An Extra Fast melee unique |
| Boss skirmisher (3) | Blood Raven | 113 over a Black Archer's 41, **2.8** | A ranged unique that kites and brings adds |
| Boss troll (4) | Treehead Woodfist | 122 over a Brute's 30.5, **4.0** | Heavy melee that is finished |
| Reference | Bishibosh, Bonebreaker | 28 over 7, **4.0**; 36 over 9, **4.0** | Confirms the rule |
| **Last boss** (boss brute, 5) | **Andariel** (level 12, 1024 health, 6 to 19 twice, poison) | About **17** times a Catacombs normal (a Ghoul or an Arach, about 60) | The act boss; not matched, see below |

## The method

1. **Health.** Diablo II hits = the monster's average health over a Diablo II hero's hit at that level, rounded up, the hit **estimated** at 3 + 1.2 × level (the starting weapon plus strength, then upgrades), clamped to 1 to 4. Health here is about (N − 0.4) × the hero's 42 after the archetype's armour, rounded down to 5: exactly N hits, with a margin of 40 % of a hit for regeneration and rounding.
2. **Damage.** The share of a Diablo II hero's life one hit takes = the monster's average hit over a Diablo II hero's life at that level, the life **estimated** at 50 + 9.5 × (level − 1) (an Amazon's base with about half the stat points in Vitality). The damage here = that share × the hero's health at the entry level ÷ (1 − the hero's armour reduction), so the share that lands matches. The draft multiplied the share by a Diablo II hit chance of 0.5; **the maintainer dropped it**, since this game has no miss, so every damage below is the draft's doubled.
3. **Speed.** No reachable source publishes a Diablo II monster's walk or run; the fractions of a walking hero are **estimates** from The Arreat Summit's words for each monster: slow (the Zombie) 0.55, heavy 0.70, normal 0.75 to 0.80, quick 0.85 to 0.90, fast 0.95. Speed = fraction × 280, rounded to 5. Every fighting archetype lands below the hero.
4. **Tiers.** Elites keep 3 times the health, as Diablo II champions (3 at normal). Bosses 4 times: every Act 1 superunique with published health is 4.0 times its base type but Blood Raven at 2.8. Both tiers hit 1.5 times as hard (Q71). The experience multipliers stay 3 and 10. Attack timings, armour, magic resistance, mana, ranges, and radii do not move; regeneration is scaled with health.
5. **Checks.** Hits to kill an enemy use 42, no Ember, the acceptance test's figure, with three Ember held at the Ember level a region's skill points plausibly allow (1, 1, 2, 3, 4) in brackets. Hits to kill the hero use its entry level and its armour.

## The approved numbers

Hits to kill an enemy at 42, three Ember held in brackets; the share is the share of the hero's health one hit lands at the entry level; hits to kill the hero at the entry level, the draft's figure first. Speeds and shares rest on estimates.

| Archetype | Level | Health | Regen | Speed (× hero, estimate) | Damage (draft) | Diablo II hits → N | Hits to kill it (Ember) | Share | Hits to kill the hero (draft) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `melee_grunt` | 1 | 400 → **95** | 1 → 0.2 | 240 → **155** (0.55) | 20 → **26** (13) | 2.3 → 3 | 11 → **3** (3) | 4.4 % | 30 → **23** (46) |
| `fast_runner` | 1 | 220 → **25** | 0.5 → 0.1 | 340 → **250** (0.89) | 10 → **18** (9) | 0.6 → 1 | 6 → **1** (1) | 3.0 % | 59 → **33** (66) |
| `ranged_archer` | 3 | 300 → **100** | 0.5 → 0.2 | 260 → **225** (0.80) | 20 → **24** (12) | 2.1 → 3 | 8 → **3** (2) | 3.2 % | 37 → **31** (62) |
| `frost_raider` | 3 | 280 → **60** | 0.5 → 0.1 | 290 → **240** (0.86) | 12 → **30** (15) | 1.5 → 2 | 8 → **2** (2) | 4.0 % | 62 → **25** (49) |
| `lancer` | 3 | 450 → **55** | 1 → 0.1 | 250 → **225** (0.80) | 24 → **38** (19) | 1.9 → 2 | 13 → **2** (2) | 5.2 % | 31 → **20** (39) |
| `hexer` | 5 | 260 → **65** | 0.5 → 0.1 | 250 → **210** (0.75) | 14 → **30** (15) | 1.5 → 2 | 7 → **2** (1) | 3.4 % | 64 → **30** (59) |
| `trapper` | 5 | 320 → **95** | 0.5 → 0.1 | 260 → **210** (0.75) | 16 → **30** (15) | 2.5 → 3 | 9 → **3** (2) | 3.4 % | 56 → **30** (59) |
| `skirmisher` | 5 | 240 → **65** | 0.5 → 0.1 | 290 → **265** (0.95) | 14 → **34** (17) | 1.2 → 2 | 6 → **2** (1) | 3.8 % | 64 → **27** (53) |
| `tank` | 7 | 1200 → **100** | 3 → 0.2 | 200 → **195** (0.70) | 36 → **58** (29) | 4.3 → 4 | 43 → **4** (2) | 5.6 % | 30 → **19** (37) |
| `troll` | 7 | 650 → **125** | 3 → 0.6 | 235 → **225** (0.80) | 26 → **64** (32) | 3.8 → 4 | 19 → **4** (2) | 6.2 % | 41 → **17** (33) |
| `summoner` | 7 | 350 → **60** | 0.5 → 0.1 | 240 → **210** (0.75) | 12 → **46** (23) | 1.9 → 2 | 9 → **2** (1) | 4.4 % | 88 → **23** (46) |
| `crusher` | 7 | 1000 → **110** | 2 → 0.2 | 210 → **210** (0.75) | 30 → **62** (31) | 3.1 → 4 | 33 → **4** (2) | 6.0 % | 35 → **17** (34) |
| `imp` | 7 | 120 → **25** | 0 | 300 → **265** (0.95) | 8 → **20** (10) | 0.5 → 1 | 3 → **1** (1) | 2.0 % | 131 → **53** (105) |
| `brute` | 9 | 700 → **85** | 1.5 → 0.2 | 230 → **225** (0.80) | 28 → **46** (23) | 2.6 → 3 | 21 → **3** (2) | 3.8 % | 44 → **27** (53) |

Health falls to 8 to 25 % of what it was. Damage rises from 20 % (the archer) to nearly four times (the summoner), since per swing a Diablo II monster takes a larger share of its hero's life than this game's did once the miss is gone. Speed falls up to 35 %. The tank's identity moves from a sponge to "armour 8 is the most 42 can lose to": 4 hits, each landing 28.

## The tiers

| Tunable | Was | Now | What it gives |
| --- | --- | --- | --- |
| `elite_health_multiplier` | 3 | **3** (a Diablo II champion's 3, inside the 2 to 4 band) | Elites take 5 to 11 hits: the elite grunt 285 (8), archer 300 (8), lancer 165 (5), frost raider 180 (5), summoner 180 (5) |
| `boss_health_multiplier` | 10 | **4** (Diablo II superuniques at about 4.0 times their base) | The boss grunt 380 (11 hits), frost raider 240 (7), skirmisher 260 (7), troll 500 (15), **the last boss, a brute, 340 (11)** |
| `elite_damage_multiplier` | none | **1.5** | A champion's +90 % at normal, trimmed because an elite here also gains an ability and comes without minions. The elite grunt hits for 39, the hero at level 1 dead in 16 |
| `boss_damage_multiplier` | none | **1.5** | The regional uniques are Extra Strong, about +50 %. The last boss hits for 69, the hero at level 9 dead in 18 |
| `elite_experience_multiplier`, `boss_experience_multiplier` | 3, 10 | unchanged | The levelling budget does not move |
| `self_heal`, a second | 40 | **10** | Five seconds heal 50, not 200, which was more than a normal troll's 125 and outhealed the hero's attack at level 7 on the boss troll |

**The last boss's gap.** Andariel is about 17 times a Catacombs normal and takes about 59 Diablo II hits. At 4 times, the last boss is a 340-health brute taking 11 of the hero's hits, which a Zenith and a Bolide nearly remove. Holding Andariel's ratio, 17 × 85, about **1450 health, about 43 hits, about 55 seconds of attack at level 10**, cannot be done through a boss multiplier all five bosses share. Her landed share per swing, 12.5 over 154.5 (**estimate**), 8.1 % with no miss, is 2.1 times the brute's 3.8 %, so her own damage would be about 95 to 100 against the shared multiplier's 69, about 70 % of hers. The maintainer left the last boss a boss-tier brute for now; a dedicated last-boss definition, content only, is the Deferred row "A dedicated last boss", revisited after the clean run.

## Flagged for the clean playtest, not changed

- **Spells overkill early enemies and the last boss.** At orb level 1: Updraft's drop (70 magical) kills the runner and the imp, and nearly kills the lancer, frost raider, hexer, and summoner after magic resistance. Zenith's 100 pure removes any single normal up to region 3. Clarion's 40 (Quartz 1), 80 at Quartz 2, clears cones of region 1 to 3 packs. Bolide's 50 a second kills most normals it rolls over. Siphon at Whorl 1 burns 100 mana for 50 damage, which kills no caster: the archer has 100 health, the hexer 65, and the summoner 60. The three keep their mana, 550, 400, and 500, so from Whorl 2 (175 burned, 87.5 damage) Siphon removes a hexer or a summoner in one cast, and from Whorl 3 (250, 125) an archer; cutting enemy mana to about 20 % would keep it proportional, if wanted. The Emberling's 22 a hit kills a runner or an imp a swing.
- **Enemy ability numbers are fixed and did not shrink.** `slam` 50 and `arrow` 60 are now 1 to 3 basic hits, 6 to 10 % of the hero's health; acceptable as telegraphed specials, left. `self_heal` is the one changed.
- **Pressure.** With packs of 1 to 3, 17 to 33 enemy hits kill the hero, half the draft's. Diablo II's pressure comes from packs of 4 to 8, which the experience budget does not allow here; if the clean run still feels empty, the next lever is larger packs at less experience each, a bet of its own.
- **Roles that change.** The runner (250) and the skirmisher (265) no longer outrun the hero; the catalogue's lines saying they do are rewritten. The runner dies in one hit and needs no kiting. The skirmisher (range 450) is outranged by the hero's 600. The grunt at 155 is very slow, so kiting it is easy by design, as a Zombie is.
- **Nothing impossible.** The hardest normal takes 4 hits. The slowest enemy stays above `ms_min` 100 under Glacier's 20 % slow (124). The boss troll, 500 health and 15 hits, is the hardest regional fight.
- **Re-recording.** Health and speed move every balance log, the boss encounter, and the corridor and stress replays; the corridor case is sensitive to speed (Q59).
- **The level budget holds.** No experience value and neither experience multiplier moves: 5408 before the last boss, 6308 after, level 10 on its kill. Only the clock changes: the road is cleared several times faster.

---

## The Diablo II figures

Transcribed from the raw HTML of **The Arreat Summit** (`classic.battle.net/diablo2exp/monsters/...`), Blizzard's own archived Diablo II compendium, fetched and parsed as plain text, high confidence. A value found only on a secondary wiki (`diablo2.wiki.fextralife.com`) is marked **[fextralife]**, lower confidence. `n/a` means no reachable source had it; nothing was guessed.

Superunique base types and modifiers are checked against a datamined `SuperUniques.txt`; their level, health, and damage are [fextralife], since The Arreat Summit's superunique page lists only type, modifiers, and location.

### Regular monsters, normal difficulty

Walk and run speed and attack speed are `n/a` for every row; see the sourcing notes.

**Blood Hawk** (Animal), `act1-bloodhawk.shtml`

| Variant | Level | Health | Attack 1 damage | Attack 1 rating | Attack 2 damage | Attack 2 rating | Defence | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Foul Crow | 4 | 2–6 | 1–2 | 23 | 1–2 | 23 | 3 | n/a | 22 | Stony Field, Black Marsh |
| Blood Hawk | 6 | 4–8 | 2–3 | 41 | 2–3 | 41 | 5 | n/a | 29 | Stony Field, Black Marsh |
| Black Raptor | 16 | 11–25 | 4–7 | 145 | 4–7 | 145 | 12 | n/a | 75 | Act 1 nest spawns |
| Cloud Stalker | 22 | 18–36 | 5–10 | 207 | 5–10 | 207 | 17 | n/a | 130 | Act 1 nest spawns |

Retreats quickly after attacking; spawns from Blood Hawk Nests until the nest is destroyed, nest-spawned hawks giving no experience and dropping nothing (secondary sources).

**Corrupt Rogue** (Demon), `act1-corruptrogue.shtml`

| Variant | Level | Health | Attack 1 damage | Attack 1 rating | Attack 2 damage | Attack 2 rating | Defence | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dark Hunter | 2 | 5–9 | 1–3 | 12 | 1–3 | 12 | 10 | n/a | 31 | Dark Wood, Tamoe Highland |
| Vile Hunter | 5 | 10–17 | 2–5 | 31 | 2–5 | 31 | 25 | n/a | 54 | Barracks, Underground Passage |
| Dark Stalker | 8 | 18–30 | 3–7 | 63 | 3–7 | 63 | 40 | n/a | 79 | as above |
| Black Rogue | 9 | 20–34 | 3–8 | 74 | 3–8 | 74 | 45 | n/a | 86 | as above |
| Flesh Hunter | 23 | 57–95 | 7–18 | 213 | 7–18 | 213 | 117 | n/a | 311 | as above |

Corrupted Sisters of the Sightless Eye who "blindly melee with whatever weapon is at hand".

**Corrupt Rogue Archer** (Demon), `act1-corruptrogue-archer.shtml`

| Variant | Level | Health | Attack 1 damage | Attack 1 rating | Attack 2 damage | Attack 2 rating | Defence | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dark Ranger | 4 | 13–19 | 2–3 | 66 | 2–3 | 66 | 20 | n/a | 54 | Stony Field, Black Marsh |
| Vile Archer | 5 | 15–22 | 2–3 | 89 | 2–3 | 89 | 25 | n/a | 63 | Inner Cloister, Cave |
| Dark Archer | 7 | 21–31 | 3–4 | 142 | 3–4 | 142 | 35 | n/a | 81 | Forgotten Tower, Pit |
| Black Archer | 10 | 33–49 | 4–6 | 225 | 4–6 | 225 | 50 | n/a | 109 | as above |
| Flesh Archer | 24 | 91–128 | 9–14 | 612 | 9–14 | 612 | 122 | n/a | 399 | as above |

A bow attacker; the later variants gain an elemental chance in Nightmare and Hell only.

**Corrupt Rogue Spearwoman** (Demon), `act1-corruptrogue-spearwoman.shtml`

| Variant | Level | Health | Attack 1 damage | Attack 1 rating | Attack 2 damage | Attack 2 rating | Defence | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dark Spearwoman | 2 | 7–11 | 2–4 | 12 | 2–4 | 12 | 10 | n/a | 36 | Cold Plains, Dark Wood |
| Vile Lancer | 5 | 14–21 | 3–6 | 31 | 3–6 | 31 | 25 | n/a | 63 | Tamoe Highland, Matron's Den |
| Dark Lancer | 8 | 24–36 | 4–9 | 63 | 4–9 | 63 | 40 | n/a | 91 | as above |
| Black Lancer (unused in game) | 9 | 26–40 | 4–10 | 74 | 4–10 | 74 | 45 | n/a | 100 | none |
| Flesh Lancer (unused in game) | 24 | 81–123 | 9–23 | 223 | 9–23 | 223 | 122 | n/a | 395 | none |

Jab and Power Strike (Vile Lancer), a cold jab (Dark Lancer). Black and Flesh Lancers are in the game data but never spawn.

**Fallen** (Demon), `act1-fallen.shtml`

| Variant | Level | Health | Attack 1 damage | Attack 1 rating | Attack 2 damage | Attack 2 rating | Defence | Block | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fallen | 1 | 1–4 | 1–2 | 8 | 1–2 | 8 | 5 | 9 % | n/a | 18 | Blood Moor, Cold Plains |
| Carver | 5 | 4–9 | 2–4 | 31 | 2–4 | 31 | 25 | 16 % | n/a | 42 | Tristram (secret area) |
| Devilkin | 7 | 4–12 | 2–5 | 52 | 2–5 | 52 | 35 | 25 % | n/a | 53 | as above |
| Dark One | 10 | 8–19 | 3–7 | 80 | 3–7 | 80 | 50 | 36 % | n/a | 72 | as above |
| Warped One | 40 | 45–118 | 11–23 | 389 | 11–24 | 389 | 201 | 49 % | n/a | 1206 | as above |

Flee when one of their pack falls; a Fallen Shaman may raise them, and a raised Fallen gives no experience.

**Fallen Shaman** (Demon), `act1-fallenshaman.shtml`

| Variant | Level | Health | Attack 1 damage | Attack 1 rating | Attack 2 damage | Attack 2 rating | Defence | Block | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Fallen Shaman | 2 | 5–9 | 1–3 | 12 | 1–3 | 12 | 10 | 4 % | n/a | 32 | Cold Plains |
| Carver Shaman | 6 | 12–20 | 2–6 | 41 | 2–6 | 41 | 30 | 7 % | n/a | 64 | as above |
| Devilkin Shaman | 9 | 20–34 | 3–8 | 74 | 3–8 | 74 | 45 | 10 % | n/a | 89 | as above |
| Dark Shaman | 11 | 24–39 | 4–9 | 92 | 4–9 | 92 | 55 | 12 % | n/a | 105 | as above |
| Warped Shaman | 40 | 139–230 | 13–30 | 389 | 13–30 | 389 | 201 | 39 % | n/a | 1621 | as above |

Casts Firebolt at range and raises dead Fallen nearby: kill it first.

**Giant Spider** (Animal), `act1-giantspider.shtml`

| Variant | Level | Health | Attack 1 damage | Attack 1 rating | Attack 2 damage | Attack 2 rating | Defence | Speed | Experience | Act 1 areas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Arach | 11 | 55–69 | 7–11 | 92 | 7–11 | 92 | 55 | n/a | 148 | Catacombs |
| Poison Spinner | 21 | 117–148 | 12–20 | 197 | 12–20 | 197 | 107 | n/a | 372 | Catacombs |
| Flame Spider | 22 | 126–161 | 13–21 | 207 | 13–21 | 207 | 112 | n/a | 410 | Catacombs |
| Spider Magus | 23 | 134–169 | 14–22 | 213 | 14–22 | 213 | 117 | n/a | 454 | Catacombs |

Spins webs that slow pursuers; regenerates health half again as fast as other monsters; poison or fire damage at normal on the later variants.

**Goatman** (Demon), `act1-goatman.shtml`

| Variant | Level | Health | Attack 1 damage | Attack 1 rating | Attack 2 damage | Attack 2 rating | Defence | Block | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Moon Clan | 4 | 16–20 | 3–5 | 23 | 3–5 | 23 | 12 | 5 % | n/a | 54 | Stony Field, Black Marsh |
| Night Clan | 6 | 22–28 | 4–7 | 41 | 4–7 | 41 | 18 | 7 % | n/a | 72 | Barracks, Forgotten Tower |
| Blood Clan | 7 | 25–31 | 4–8 | 52 | 4–8 | 52 | 21 | 8 % | n/a | 81 | Jail |
| Death Clan | 10 | 41–51 | 5–11 | 80 | 5–11 | 80 | 30 | 11 % | n/a | 109 | as above |
| Hell Clan | 19 | 78–97 | 9–19 | 174 | 9–19 | 174 | 58 | 19 % | n/a | 245 | as above |

A first fextralife read gave 2470 to 5204 experience, the Nightmare column; corrected against The Arreat Summit's table.

**Skeleton** (Undead), `act1-skeleton.shtml`

| Variant | Level | Health | Attack 1 damage | Attack 1 rating | Attack 2 damage | Attack 2 rating | Defence | Block | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Skeleton | 2 | 7–11 | 1–3 | 12 | 1–3 | 12 | 10 | 10 % | n/a | 34 | Burial Grounds, Stony Field, Cave, Crypt |
| Returned | 6 | 17–25 | 2–5 | 41 | 2–5 | 41 | 30 | 15 % | n/a | 68 | as above |
| Bone Warrior | 14 | 45–62 | 4–10 | 125 | 3–10 | 125 | 70 | 30 % | n/a | 143 | as above |
| Burning Dead | 13 | 40–58 | 4–9 | 113 | 3–9 | 113 | 65 | 25 % | n/a | 130 | as above |
| Horror | 14 | 45–62 | 4–10 | 125 | 3–10 | 125 | 70 | 30 % | n/a | 143 | as above |

Undead: no life or mana steal from them; elemental chances in Nightmare and Hell only.

**Skeleton Archer** (Undead), `act1-skeleton-archer.shtml`

| Variant | Level | Health | Ranged damage | Rating | Defence | Block | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Skeleton Archer | 5 | 11–24 | 2–3 | 89 | 25 | 15 % | n/a | 62 | Dark Wood, Tamoe Highland, Barracks |
| Returned Archer | 8 | 21–42 | 3–5 | 169 | 40 | 23 % | n/a | 90 | as above |
| Bone Warrior Archer | 9 | 23–48 | 4–6 | 197 | 45 | 25 % | n/a | 99 | as above |
| Burning Dead Archer | 13 | 33–66 | 4–6 | 307 | 65 | 35 % | n/a | 137 | shoots Fire Arrows |
| Horror Archer | 18 | 47–96 | 5–8 | 446 | 90 | 45 % | n/a | 223 | shoots Lightning Arrows |

**Skeleton Mage** (Undead), `act1-skeleton-mage.shtml`

| Variant | Level | Health | Damage | Rating | Defence | Block | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Returned Mage | 8 | 15–22 | n/a (elemental bolt caster) | n/a | 40 | 9 % | n/a | 56 | Tamoe Highland, Monastery Gate, Jail |
| Bone Mage | 10 | 19–28 | n/a | n/a | 50 | 11 % | n/a | 67 | as above |
| Burning Dead Mage | 14 | 27–38 | n/a | n/a | 70 | 15 % | n/a | 94 | as above |
| Horror Mage | 14 | 33–48 | n/a | n/a | 85 | 30 % | n/a | 123 | as above |

Casts poison, cold, fire, or lightning bolts by sub-type; no spell damage or rating is published, so the hexer's damage share rests on an estimate more than any other row's.

**Spike Fiend** (Animal), `act1-spikefiend.shtml`

| Variant | Level | Health | Melee damage | Melee rating | Quill damage | Quill rating | Defence | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Quill Rat | 1 | 1–5 | 1–2 | 8 | 0–0 | 10 | 5 | n/a | 21 | Blood Moor, Dark Wood |
| Spike Fiend | 5 | 4–14 | 1–5 | 31 | 0–1 | 44 | 25 | n/a | 49 | Tamoe Highland, Outer Cloister |
| Thorn Beast | 8 | 6–24 | 2–7 | 63 | 0–1 | 83 | 40 | n/a | 71 | as above |
| Razor Spine | 9 | 6–26 | 2–8 | 74 | 1–1 | 99 | 45 | n/a | 78 | as above |

Melee and a quill volley at range; the later variants fire faster and in volleys.

**Wendigo** (Animal), `act1-wendigo.shtml`

| Variant | Level | Health | Attack 1 damage | Attack 1 rating | Attack 2 damage | Attack 2 rating | Defence | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Gargantuan Beast | 2 | 11–19 | 2–3 | 12 | 3–4 | 12 | 10 | n/a | 48 | Cold Plains, Dark Wood |
| Brute | 5 | 23–38 | 3–4 | 31 | 5–6 | 31 | 25 | n/a | 84 | as above |
| Yeti | 9 | 45–73 | 4–7 | 74 | 8–9 | 74 | 45 | n/a | 133 | as above |
| Crusher | 19 | 97–157 | 8–13 | 174 | 14–18 | 174 | 95 | n/a | 327 | as above |
| Wailing Beast | 23 | 126–204 | 9–16 | 213 | 17–21 | 213 | 117 | n/a | 482 | as above |

"Quick to anger and attack with huge, sweeping blows."

**Zombie** (Undead), `act1-zombie.shtml`

| Variant | Level | Health | Attack 1 damage | Attack 1 rating | Attack 2 damage | Attack 2 rating | Defence | Block | Speed | Experience | Act 1 areas [fextralife] |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Zombie | 1 | 7–12 | 1–3 | 8 | 2–3 | 8 | 5 | 3 % | n/a | 33 | Blood Moor, Burial Grounds, Cave, Crypt |
| Hungry Dead | 2 | 9–16 | 1–3 | 12 | 3–4 | 12 | 10 | 4 % | n/a | 44 | as above |
| Ghoul | 12 | 43–78 | 4–11 | 103 | 9–13 | 103 | 60 | 13 % | n/a | 152 | Catacombs |
| Plague Bearer | 17 | 65–115 | 6–15 | 152 | 11–18 | 152 | 85 | 17 % | n/a | 245 | Catacombs |
| Drowned Carcass | 22 | 89–161 | 7–19 | 207 | 15–23 | 207 | 112 | 22 % | n/a | 395 | Catacombs |

"Move slowly, but with relentless determination."

### Bosses and superuniques, normal difficulty

Figures [fextralife] but Andariel's, from The Arreat Summit's act boss page, high confidence.

| Boss | Base type, modifiers | Level | Health | Melee damage | Rating | Defence | Speed | Experience | Minions | Where |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Corpsefire | Zombie, Spectral Hit | 4 | 28–48 | n/a | n/a | n/a | n/a | 165 | none noted | Den of Evil, the first superunique |
| Bishibosh | Fallen Shaman, Magic Resistant, Fire Enchanted | 5 | 20–36 | n/a | n/a | n/a | n/a | 160 | Fallen and Shamans, which it revives | Cold Plains |
| Coldcrow | Corrupt Rogue Archer (Dark Ranger), Cold Enchanted | n/a (base 4) | n/a | n/a | n/a | n/a | n/a | n/a | four, Cold Enchanted | The Cave, level 1 |
| Blood Raven | Corrupt Rogue Archer, Fire Arrow | 10 | 113 | n/a | n/a | n/a | n/a | 181 | summons Zombies (Hungry Dead) | Burial Grounds |
| Bonebreaker | Skeleton, Extra Strong, Magic Resistant | 5 | 28–44 | n/a | n/a | n/a | n/a | 170 | none noted | The Crypt |
| Rakanishu | Fallen (Carver), Lightning Enchanted, Extra Fast | 8 | 16–36 | n/a | n/a | n/a | n/a | 210 | none noted | Stony Field |
| Treehead Woodfist | Wendigo (Brute), Extra Strong, Extra Fast | 8 | 92–152 | n/a | n/a | n/a | n/a | 420 | none noted | Dark Wood |
| **Andariel** (the act boss) | Demon, Poison Strike, Poison Cloud | 12 | 1024 | 6–19 (two attacks) | 169 (two) | 60 | n/a | 1282 | none | Catacombs level 4 |

Andariel's resistances at normal: physical 0, magic 0, fire −50 %, cold 50 %, lightning 50 %, poison 80 %.

### A Diablo II hero, levels 1 to 10, normal, Act 1

| Class | Strength | Dexterity | Vitality | Energy | Life at level 1 | Life a level | Life at level 10, no points in Vitality | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Amazon | 20 | 25 | 20 | 15 | 50 | +2, and +3 a Vitality point | 68 | [fextralife] |
| Sorceress | 10 | 25 | 10 | 35 | 40 | +1 by most sources (one says +2), and +2 a Vitality point | about 49 | [fextralife], conflicting |
| Barbarian | 30 | 20 | 25 | 10 | 55 | +2, and +4 a Vitality point | 73 | [fextralife] |

A real level-10 hero with points in Vitality has more; the life curve above, 50 + 9.5 a level, is an estimate on that basis. Starting weapons: the Amazon's Javelin 1–5 (6–14 thrown), the Barbarian's Hand Axe 3–6; the Sorceress's not confirmed. Movement: 6 yards a second walking, 9 running, for every class; the floor under slows is 1.5.

### Champion and unique modifiers, normal difficulty

From The Arreat Summit's Monster Bonuses page, high confidence.

- **Health:** minions 2 times, champions 3, uniques 4 at normal (3 in Nightmare, 2 in Hell).
- **Level:** champions +2, uniques and their minions +3.
- **Experience:** champions 3 times, Berserker champions 5, uniques and their minions 5.
- **Damage:** champions +90 % at normal (+75 % Nightmare, +66 % Hell); Berserker +270 % damage and rating at 75 % of a champion's life; Ghostly +90 %.
- **Attack rating:** champions +67 % at normal.
- **Movement:** champions +20, Fanatic +100, Possessed +20.
- Superuniques (Corpsefire, Andariel, and the rest) are authored one by one, not made from these multipliers.

### Sourcing notes

- The URLs first given returned 402 or 403; `diablo2.wiki.fextralife.com` was reachable and is cited [fextralife]. The Arreat Summit, fetched with `curl` and stripped to text, was the most reliable, and every row from it was checked column by column against its Normal, Nightmare, and Hell triples.
- Two summarising passes over the fextralife Goatman and Spearwoman pages returned the Nightmare column's experience; the raw Arreat Summit tables confirm the low numbers. A single-pass summary of a dense stat table is not trusted without a second read.
- **Monster speed** is published nowhere reachable. The Arreat Summit gives words ("move slowly"); the numbers live in `MonStats.txt`. A copy found on GitHub gave Andariel 2562 health at level 8 against the confirmed 1024 at 12, so it is a mod's file and was discarded. Every speed fraction above is an estimate.
- **Attack speed** is not published; `n/a` throughout.
- **Superunique figures** are [fextralife]; Coldcrow's are published nowhere reachable.
- **The Sorceress's life a level** conflicts between sources, +1 or +2; both are recorded.
