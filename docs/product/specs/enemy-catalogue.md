# Enemy catalogue

> **Entry point:** [Product](../README.md)

**Helix — The archetypes as data: every number an enemy definition carries, and why it starts there**

| Field | Value |
|---|---|
| Document type | Content specification |
| Audience | Gameplay programming, combat design |
| Product context | Single-player. One hero against packs of enemies on a map |
| Classification | The enemy archetypes and the numbers each definition carries. How enemies behave, the state machine, tiers, and the edge cases are the [enemies page](../features/enemies.md) |
| Simulation | 30 Hz tick. Every duration here is seconds and becomes whole ticks at load |
| Reference | The hero's starting values, so every enemy number is set against what the hero can do at level 1 |

---

## 1. Purpose

This page fixes the archetypes, the training dummy, and the imp as data: every field of an enemy definition, a starting value for each, and one line saying why the value is where it is. The definitions under `src/content/enemies/` are written from it.

Every number is a starting value. The definition file owns it once the file exists, and the file wins when this page disagrees: one file per archetype under `src/content/enemies/`, the file name the id. The tuning surface changes any of them at no code cost. What this page owns is the reasoning: how many of the hero's attacks each archetype takes and how many of its hits the hero takes, how far under the hero's pace it walks, which one out-ranges which, and what a pack is worth in experience.

Those ratios are Diablo II's first act at normal difficulty. Every fighting archetype is set against one of its monsters, named in its entry, and dies to one to four of the hero's basic attacks, as a first-act monster dies to one to four of a Diablo II hero's hits. Every one walks slower than the hero. How each number was reached, and the Diablo II figures behind it, are in [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md).

A reason measured in a recorded session cites it, as "balance pass 1", and [section 5](#5-what-the-numbers-do-in-a-fight) holds what those sessions measured.

---

## 2. How to read an entry

### 2.1 The fields

Every archetype carries the same fields, the ones the [enemies page](../features/enemies.md#what-a-definition-holds) lists. A field an archetype does not use holds its neutral value rather than being left out.

| Field | Meaning |
|---|---|
| Id | The snake_case string every command, event, and log line uses. It never renames |
| Diablo II monster | The first-act monster at normal difficulty whose ratios the archetype is set against, at the variant a player meets at the matching point of the act |
| Health · regeneration | Points, and points per second |
| Mana · regeneration | Points, and points per second. Zero for an archetype with no mana, so a spell that burns mana finds a number |
| Armour · magic resistance | Armour points, reduced through the armour curve like the hero's; magic resistance a fraction of one off magical damage |
| Movement speed · turn rate | World units per second; radians per 0.03 s, as the [mechanics spec](./character-movement-and-mechanics.md) publishes the hero's |
| Collision · bound · selection radius | World units. The collision radius is one of the three radius classes pathing plans for, 20, 32, or 64, and is wider than the bound radius, so two enemies side by side part before their drawn shapes touch. The bound radius is the drawn size and sets how large the square is drawn; melee reach is measured on it |
| Attack damage · range | Physical damage before armour, a normal unit's: a tier multiplies it, an ability's damage not; range centre to centre before both bound radii are added |
| Acquire radius | How far the behaviour looks for the hero to attack |
| Attack point · backswing · base attack time | Seconds. An enemy has no attack speed of its own, so one attack every base attack time |
| Projectile speed · radius | World units per second, and world units. A speed of zero is a melee attack that lands at the attack point |
| Aggro · leash radius | World units. Aggro from where the enemy stands; leash from its own spawn point, or, for one a hit woke on its way home, from where it woke, as the [enemies page](../features/enemies.md) says |
| Experience | What the hero gains when it dies, against the level table in [section 4](#4-experience-against-the-level-table) |
| Indestructible | Whether damage leaves it at one health. Only the dummy |
| Tier | Normal for every archetype here. Elite and boss are what a spawn asks for, and multiply health, attack damage, and experience as the [enemies page](../features/enemies.md#tiers) says |
| Abilities · behaviour | Ability ids, each with the condition it is chosen under, empty for the four of section 3; the behaviour by key |
| Elite ability · boss abilities | The one ability an elite casts after its list, and the ones a boss casts after it, each with its condition; none for every archetype here but the grunt |
| Statuses | Status ids the archetype carries from spawn until it dies, such as a bash; empty for the four of section 3 |
| Frame · tint | The atlas frame the body is drawn with, and its colour. The attack's projectile carries the same tint |

### 2.2 The hero they are set against

Every "why" below compares an enemy to the hero at level 1. These are the hero's starting values from `src/content/hero.ts`, `src/content/forms/skein.def.ts`, and `src/content/tuning.ts`, worked through the attribute conversions.

| The hero at level 1 | Value |
|---|---|
| Movement speed | 280 |
| Health | 516, from 120 and 18 strength at 22 each |
| Armour | 2.33, from 14 agility, so 12 % off physical damage at an armour constant of 0.06 |
| Attack | 42 damage, range 600, one attack every 1.49 s at 114 attack speed |
| Experience to level 2 | 230 |

The hero's basic attack does not grow with its level: level buys health, armour, and attack speed, and damage comes only from the orbs. So an archetype's hits to kill hold at every level. Its hits to kill the hero are counted at the entry level of the first region it walks on the long road, 1, 3, 5, 7, or 9, where the hero has 516, 622, 727, 833, or 938 health behind armour taking 12 to 23 % off.

---

## 3. The archetypes

The table is the whole catalogue at a glance; the entries below hold every field and the reasons.

| Archetype | Id | Health | Armour | Speed | Radius | Attack | Aggro · leash | Experience | Behaviour | Frame · tint |
|---|---|---|---|---|---|---|---|---|---|---|
| Melee grunt | `melee_grunt` | 95 | 2 | 155 | 32 | 26 melee every 1.4 s | 700 · 1500 | 46 | `melee_chaser` | `square` · `0xe05a4f` |
| Fast runner | `fast_runner` | 25 | 0 | 250 | 20 | 18 melee every 1.0 s | 800 · 2000 | 30 | `melee_chaser` | `square` · `0xf2c14e` |
| Ranged archer | `ranged_archer` | 100 | 1 | 225 | 32 | 24 at 500 every 1.8 s | 800 · 1500 | 50 | `ranged_holder` | `square_dot` · `0x5cb85c` |
| Tank | `tank` | 100 | 8 | 195 | 64 | 58 melee every 2.0 s | 600 · 1200 | 120 | `melee_chaser` | `square` · `0xa9743b` |
| Training dummy | `training_dummy` | 1000 | 0 | 0 | 32 | none | 0 · 0 | 0 | `stationary` | `square_outline` · `0xffffff` |
| Imp | `imp` | 25 | 0 | 265 | 20 | 20 melee every 1.0 s | 800 · 2000 | 0 | `melee_chaser` | `square` · `0x9b6fd1` |

The grunt, the tank, and the imp share the `square` frame with the runner and read apart by size and colour: the square is drawn at the bound radius, so the runner's is small, the grunt's is the hero's size, and the tank's is large. Each body is a third to a half again as wide as it is drawn, so a crowd keeps space between its shapes.

### 3.1 Melee grunt

The baseline. The slowest, three hits to kill, walks up and hits.

| Field | Value | Why |
|---|---|---|
| Id | `melee_grunt` | |
| Diablo II monster | Zombie, level 1 | The Blood Moor's slow, relentless melee, kited; Corpsefire, the first unique, is a Zombie, as the first region's boss is a grunt. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Health · regeneration | 95 · 0.2 | Three of the hero's attacks after armour, 37.5 each, as a Zombie takes a level-1 Diablo II hero about three. The regeneration is scaled with the health |
| Mana · regeneration | 0 · 0 | It casts nothing |
| Armour · magic resistance | 2 · 0 | The hero's armour, near enough, so physical damage lands about as it does on the hero; spells land in full |
| Movement speed · turn rate | 155 · 0.5 | The slowest archetype, 125 a second under the hero's 280, as a Zombie moves slowly, so kiting it is easy by design: a level-1 hero that shoots only when the gap is 300 kills a grunt with three shots in about eight seconds without being hit (balance pass 1) |
| Collision · bound · selection radius | 32 · 24 · 32 | Drawn at the hero's size; the medium radius class, the widest body that paths through the arena's 96-unit corridor on cells of 32, so a grunt fits it one at a time and a pack queues through it |
| Attack damage · range | 26 · 100 | 22.8 after the hero's armour, 4.4 % of a level-1 hero, so twenty-three kill it. Five grunts on a level-1 hero that stands and attacks kill it after it takes two of them (balance pass 1) |
| Acquire radius | 700 | The aggro radius, so what it notices it goes for |
| Attack point · backswing · base attack time | 0.4 s · 0.5 s · 1.4 s | The hero's attack point, so a grunt's swing is as readable as the hero's |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0xe05a4f` | Unused by a melee attack; the neutral frame and its own colour |
| Aggro · leash radius | 700 · 1500 | Short of the hero's 800 acquire radius, so an attack-move finds a grunt before the grunt notices the hero; leash about two aggro radii from home |
| Experience | 46 | Five grunts are 230, exactly level 1 to level 2 |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | none · `melee_chaser` | Closes to contact |
| Elite ability | `slam` with the hero within 250 | The slam's own radius, so an elite grunt slams only what it would strike; the one tell a plain grunt lacks |
| Boss abilities | `self_heal` below half its health · `slam` with the hero within 250 · `charge` always | The heal first, so a hurt boss mends before it presses; the slam next, beside the hero; the charge last, so a boss the hero walks away from closes the gap |
| Frame · tint | `square` · `0xe05a4f` | A plain square in red |

### 3.2 Fast runner

One hit to kill, quick, reaches the hero before the grunt does.

| Field | Value | Why |
|---|---|---|
| Id | `fast_runner` | |
| Diablo II monster | Fallen, level 1 | The weakest and quickest of the Blood Moor's pack fodder, dead to one hit. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Health · regeneration | 25 · 0.1 | One of the hero's attacks, the fewest of any, so a runner that arrives first dies first: a level-1 hero standing against five kills each with one attack (balance pass 1) |
| Mana · regeneration | 0 · 0 | It casts nothing |
| Armour · magic resistance | 0 · 0 | Nothing to slow its death |
| Movement speed · turn rate | 250 · 0.8 | The quickest of the four, 30 a second under the hero's 280: a hero walking the circle that sheds a grunt is not reached in twenty seconds (balance pass 1). It dies to one attack, so it is met, not kited. It turns quickest |
| Collision · bound · selection radius | 20 · 14 · 20 | The smallest radius class, drawn as the small square; two stand abreast in the corridor, but not beside a grunt, so a runner behind a grunt there waits for it |
| Attack damage · range | 18 · 100 | 15.8 after armour, 3 % of a level-1 hero; a nuisance alone, dangerous only with the pack behind it |
| Acquire radius | 800 | The aggro radius |
| Attack point · backswing · base attack time | 0.3 s · 0.3 s · 1.0 s | Quick, light hits |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0xf2c14e` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 800 · 2000 | It notices the hero as far as the hero looks for it, and follows furthest, so walking away from a runner is slow to shed it |
| Experience | 30 | Less than a grunt for less health, more per point of health for the speed |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | none · `melee_chaser` | Closes to contact |
| Frame · tint | `square` · `0xf2c14e` | The square, drawn small at its radius, in yellow |

### 3.3 Ranged archer

Stays at range and fires a projectile.

| Field | Value | Why |
|---|---|---|
| Id | `ranged_archer` | |
| Diablo II monster | Corrupt Rogue Archer, Dark Ranger, level 4 | The Stony Field archer that holds range and punishes standing still. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Health · regeneration | 100 · 0.2 | Three of the hero's attacks after armour, 39.6 each, the grunt's count, though it is harder to reach |
| Mana · regeneration | 550 · 1 | It casts nothing, but a mana pool gives Siphon something to take from a real enemy. As deep as Siphon's largest burn, so every level of its table takes more: at 200, Whorl 3 to 7 burned no more than Whorl 2 from the one archetype that carries mana (balance pass 1) |
| Armour · magic resistance | 1 · 0 | Light |
| Movement speed · turn rate | 225 · 0.6 | Slower than the hero, faster than the grunt, so it keeps its distance from a grunt's pace but not from the hero's; the hero's turn rate |
| Collision · bound · selection radius | 32 · 24 · 32 | Drawn at the hero's size, on the medium class |
| Attack damage · range | 24 · 500 | 21.1 after armour, 3.2 % of a level-3 hero, so thirty-one kill it. A hundred short of the hero's 600, so the hero out-ranges an archer standing still and wins the trade by stepping back. It punishes standing still: a level-1 hero that stands and trades takes about ten health a second from one archer, and one that walks away takes about three, under a third of that, its arrows landing only when it stops within range (balance pass 1) |
| Acquire radius | 800 | The aggro radius |
| Attack point · backswing · base attack time | 0.5 s · 0.5 s · 1.8 s | Slower than the hero's attack, so its arrows can be counted |
| Projectile speed · radius | 900 · 10 | The hero's projectile speed, a homing arrow a little smaller than the hero's |
| Projectile frame · tint | `disc` · `0x5cb85c` | Its own colour, as every projectile is its caster's |
| Aggro · leash radius | 800 · 1500 | It sees the hero before the hero is in range of it |
| Experience | 50 | Slightly more than a grunt for about its health, because it hits from where the hero is not |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | none · `ranged_holder` | Holds at its attack range less a margin and fires |
| Frame · tint | `square_dot` · `0x5cb85c` | A square with a dot, in green |

### 3.4 Tank

Heavy armour, heavy hits, slow. The most of the hero's attacks to kill.

| Field | Value | Why |
|---|---|---|
| Id | `tank` | |
| Diablo II monster | Wendigo, Yeti, level 9 | The act's biggest, slowest-to-kill normal, with huge sweeping blows; Treehead Woodfist is one. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Health · regeneration | 100 · 0.2 | Four of the hero's attacks, each landing 28.4 through its armour, the most any archetype takes: a level-1 hero that stands against one kills it with four and takes two of its hits. At orb level 7 any one of Updraft, Zenith, Bolide, Clarion, or Glacier kills it alone (balance pass 1) |
| Mana · regeneration | 0 · 0 | It casts nothing |
| Armour · magic resistance | 8 · 0.25 | Armour takes 32 % off physical damage, the most of any, magic resistance a quarter off magical, and pure damage lands in full, so the damage types read apart on it |
| Movement speed · turn rate | 195 · 0.3 | Slow, second only to the grunt: easy to walk away from, and turning half a circle takes it a third of a second |
| Collision · bound · selection radius | 64 · 44 · 56 | The largest radius class: the arena's 96-unit corridor is closed to it, so it paths round while the rest of its pack queues through |
| Attack damage · range | 58 · 100 | 50.9 after a level-1 hero's armour, the hardest hit of the four; 46.3 after a level-7 hero's, 5.6 % of it, so nineteen kill it |
| Acquire radius | 600 | The aggro radius |
| Attack point · backswing · base attack time | 0.6 s · 0.6 s · 2.0 s | A slow, heavy swing the hero can see coming |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0xa9743b` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 600 · 1200 | It notices late and gives up early, so it guards its ground rather than following |
| Experience | 120 | A little under three grunts, for the four attacks its armour costs and the hardest hit of the four |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | none · `melee_chaser` | Closes to contact |
| Frame · tint | `square` · `0xa9743b` | The square, drawn large at its radius, in brown |

### 3.5 Training dummy

Never moves, never attacks, never dies. Takes and shows damage.

| Field | Value | Why |
|---|---|---|
| Id | `training_dummy` | |
| Health · regeneration | 1000 · 0 | Enough to read a whole spell off; no regeneration, so what a hit took stays readable |
| Mana · regeneration | 1000 · 0 | Deep enough for Siphon at any orb level to take its whole table, and it stays taken |
| Armour · magic resistance | 0 · 0 | Every number it shows is the spell's own |
| Movement speed · turn rate | 0 · 0 | It never moves |
| Collision · bound · selection radius | 32 · 24 · 32 | Drawn at the hero's size, on the medium class |
| Attack | All zero, `disc` · `0xffffff` | It never attacks |
| Aggro · leash radius | 0 · 0 | It never aggroes |
| Experience | 0 | It never dies, and grants nothing |
| Indestructible · tier | true · normal | Damage leaves it at one health; the number still shows the full hit |
| Abilities · behaviour | none · `stationary` | Never leaves Idle |
| Frame · tint | `square_outline` · `0xffffff` | An outlined square in white, apart from every archetype's filled one |

### 3.6 Imp

The add a summoner brings. Never placed in a pack of its own; it joins its summoner's.

| Field | Value | Why |
|---|---|---|
| Id | `imp` | |
| Diablo II monster | Blood Hawk, Foul Crow, level 4 | Brought by something else, fragile and quick, and worth no experience, as a hawk from a nest is. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Health · regeneration | 25 · 0 | One of the hero's attacks, having no armour, so a pair of adds is a nuisance cleared in a breath, not a second pack |
| Mana · regeneration | 0 · 0 | It casts nothing |
| Armour · magic resistance | 0 · 0 | Nothing to slow its death |
| Movement speed · turn rate | 265 · 0.8 | Quicker than its summoner and 15 under the hero's 280, so the adds reach the hero before their summoner does, and a hero walking away gains on them slowly |
| Collision · bound · selection radius | 20 · 14 · 20 | The smallest radius class, the runner's body; in the corridor they file behind their summoner, since one beside it does not fit |
| Attack damage · range | 20 · 100 | 17.5 after a level-1 hero's armour, 16.0 after a level-7 one's, so fifty-three kill it, the most of any; the harm is in the number of bodies, not in any one |
| Acquire radius | 800 | The aggro radius |
| Attack point · backswing · base attack time | 0.3 s · 0.3 s · 1.0 s | The runner's quick, light hits |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0x9b6fd1` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 800 · 2000 | It notices a hero its summoner is already fighting, and follows as far as a runner does |
| Experience | 0 | A summoner brings adds on a clock, so an add that granted experience would make a summoner a farm |
| Indestructible · tier | false · normal | It spawns at the normal tier whatever its summoner's |
| Abilities · behaviour | none · `melee_chaser` | Closes to contact |
| Frame · tint | `square` · `0x9b6fd1` | The square, drawn small at its radius, in violet, apart from the runner's yellow |

It lives for the lifetime the summoning ability gives and leaves on the tick its summoner dies, with no corpse and nothing granted; one killed first dies as any enemy does. It counts against the live cap, so a summon that would pass the cap is refused whole.

---

## 4. Experience against the level table

The hero's level table is `experienceThresholds` in `src/content/hero.ts`: the total experience reached at each level. The first steps are 230 to level 2, 600 to level 3, and 1080 to level 4.

| Pack | Experience | At level 1 |
|---|---|---|
| Five grunts | 230 | Level 2, exactly |
| Two grunts, two runners, one archer | 202 | Just short of level 2 |
| Three grunts and a tank | 258 | Level 2 and a little over |
| Eight grunts | 368 | Level 2 and over a third of the way to 3 |

A grunt is the unit of account: 46, a fifth of the first level. The others are priced against it by how long each takes to kill and how much harm it does in that time. Experience is not shared or pooled across a pack; each enemy grants its own on death, as the [enemies page](../features/enemies.md#experience) says.

The numbers here are a normal unit's. An elite grants 3 times its archetype's experience and a boss 10 times, the `elite_experience_multiplier` and `boss_experience_multiplier` tunables, apart from the tiers' health and damage multipliers: an elite grunt grants 138 and a boss grunt 460, the whole first level twice over.

An elite has 3 times its archetype's health and a boss 4 times, the `elite_health_multiplier` and `boss_health_multiplier` tunables, as a Diablo II champion has 3 times its monster's life and a first-act unique about 4. Both land 1.5 times its hit, the `elite_damage_multiplier` and `boss_damage_multiplier` tunables. So an elite grunt has 285 and hits for 39, and on the long road the region bosses are a grunt of 380, a frost raider of 240, a skirmisher of 260, and a troll of 500, and the last boss a brute of 340 that hits for 69. Each boss is set against its Diablo II unique in [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md); the last boss is a brute at boss tier, well short of Andariel, as the note says. The imp and the dummy grant nothing at any tier.

---

## 5. What the numbers do in a fight

What the definitions above do against the hero, measured in three sessions kept as input logs under `tests/simulation/replays/balance-*.json`, which `tests/simulation/replays/balance.spec.ts` replays and checks. All three are played by the drivers in `tests/helpers/recording/balance-sessions.ts`, which send only what the panel and a player send. A log is valid only on the content version it was recorded on, so a change that moves what they show means recording them again and moving this section with them; the drivers' file says how.

**The hero session.** The hero stands and attacks the nearest, with no spell, against a pack of five of each archetype, from levels 1, 10, and 20, until it falls, the pack does, or 45 seconds pass. The session levels the hero only between the three blocks, so kills inside the first carry it to level 2 before the archers. The attack does not grow with level: the hero's level buys health, mana, armour, and attack speed, and its damage grows through the orbs. Every archetype dies to one to four attacks, so a pack of five is a fight of numbers: the attack alone clears runners from level 1, grunts and archers from level 10, and tanks at 20.

| Pack of five | Level 1 | Level 10 | Level 20 |
|---|---|---|---|
| Grunts | Hero falls; two killed | All five killed | All five killed |
| Runners | All five killed, one attack each | All five killed | All five killed |
| Archers | Hero falls; two killed | All five killed | All five killed |
| Tanks | Hero falls; one killed | Hero falls; three killed | All five killed |

**The archetypes session.** One of each against a level-1 hero on open ground, and a tank against a hero with every orb at 7.

| Archetype | What the hero does | What happens |
|---|---|---|
| Grunt | Walks a circle of radius 800 away from it, and shoots when the gap is 300, walking at least 3 s between shots | Killed by three shots in about 8 s; the hero is never hit. The grunt is kited |
| Runner | Walks the same circle for 20 s | It never reaches the hero. It is slower than the hero and dies to one attack: it is met, not kited |
| Archer | Stands and trades | Killed by three attacks in about 4 s, the hero taking about ten health a second |
| Archer | Walks the same circle for 20 s | About three health a second: under a third. The archer punishes standing still |
| Tank | Stands and attacks | Killed by four attacks; the hero takes two of its hits, about 100 |
| Tank | Throws one of Updraft, Zenith, Bolide, Clarion, or Glacier, at 7 | Killed by each alone |

**What the spells do to these numbers.** The spells are set against the hero's kit, not against these enemies, so they overkill the early archetypes and the last boss. At orb level 1 Updraft's drop kills a runner or an imp outright, and Zenith's 100 pure removes any single normal of the first three regions. The archer, the hexer, and the summoner keep deep mana pools, so Siphon removes a hexer or a summoner in one cast from Whorl 2 and an archer from Whorl 3. Each of Updraft, Zenith, Bolide, Clarion, and Glacier alone kills a tank at orb level 7. The ratios note lists more.

The spells session is the [spell catalogue's](./spell-catalogue.md#8-what-the-spells-do-to-a-pack).

---

## 6. Atlas frames

Frames the archetypes draw with. Every name is in the frame list under `src/content/atlas-frames.ts` or is added to it by the definitions that need it.

| Frame | Used by | Exists |
|---|---|---|
| `square` | The grunt, the runner, the tank, the imp | Yes |
| `square_outline` | The training dummy | Yes |
| `square_outline_thick` | The outline every elite and boss is drawn with over its body | Yes |
| `square_dot` | The archer, the hexer, the trapper, the skirmisher, the summoner | Yes: a square with a round hole at its centre a third of its width across, so the dot reads in the floor's colour under the square's one tint |
| `disc` | Every archetype's projectile | Yes |

---

## 7. The long roster

The archetypes beyond the four above: composed from the behaviours above and the enemy abilities the [enemies page](../features/enemies.md#enemy-abilities) lists, each with its role, its numbers, its frame and colour, the tiers it may spawn at, and the abilities an elite or a boss of it adds. The four above and these nine are the roster, thirteen archetypes; the dummy and the imp stand outside it. Every one of the nine enemy abilities is in at least one archetype's own list or statuses, so each is met without asking for a tier.

### 7.1 How a roster entry reads

An entry carries every field in [section 2.1](#21-the-fields) and reads as the entries in section 3 do, with four rows more: its role in one line, its ability list by key, with the condition each is chosen under, the tiers it may spawn at, and the abilities an elite and a boss of it add. Every number is set against the hero in [section 2.2](#22-the-hero-they-are-set-against), against the four archetypes above, and against the Diablo II monster its entry names.

Every roster archetype may spawn at all three tiers. An elite adds one ability the archetype does not already cast, and a boss adds the ones that make a single unit of it a fight: a heal where it has none, a way to close the gap or to hold the hero, adds where it has a pack to protect. A tier's entries come after the archetype's own, so a tier adds to what a plain unit does and never shadows it.

Two behaviours are the roster's own. A kiter, `ranged_kiter`, holds at its attack range less the margin and fires as the holder does; when the hero comes nearer than a second margin inside that, it backs away along a path while its attack is on its clock and turns to fire each time the clock allows. A charger, `charger`, closes as the chaser does while its charge is ready; while the charge is on its clock it waits at the charge's range less the margin, and if the hero comes a margin nearer than that it closes as the chaser does and fights, pathing round whatever stands between them, so a wall never pins it. A hero farther than that point is waited for, not followed into melee, so the charge is thrown the moment its clock allows. Its charge is the first entry of its list at its tier. The hexer and the skirmisher are kiters, and the lancer a charger.

### 7.2 The roster at a glance

| Archetype | Id | Health | Armour | Speed | Radius | Attack | Aggro · leash | Experience | Behaviour | Frame · tint | Abilities | Tiers | Elite · boss adds |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Brute | `brute` | 85 | 4 | 225 | 32 | 46 melee every 1.6 s | 650 · 1400 | 90 | `melee_chaser` | `square` · `0x8c2f39` | `bash` carried | Normal · elite · boss | `slam` · `slam`, `summon_adds`, `charge` |
| Frost raider | `frost_raider` | 60 | 1 | 240 | 20 | 30 melee every 1.1 s | 800 · 1800 | 38 | `melee_chaser` | `square` · `0x7fd3e8` | `frost_attack` carried | Normal · elite · boss | `charge` · `self_heal`, `charge` |
| Hexer | `hexer` | 65 | 0 | 210 | 32 | 30 at 450 every 2.0 s | 800 · 1500 | 60 | `ranged_kiter` | `square_dot` · `0x3f51b5` | `silence_curse` | Normal · elite · boss | `root_net` · `root_net`, `summon_adds` |
| Trapper | `trapper` | 95 | 2 | 210 | 32 | 30 at 500 every 1.8 s | 800 · 1500 | 55 | `ranged_holder` | `square_dot` · `0x2e8b7a` | `root_net` | Normal · elite · boss | `arrow` · `arrow`, `summon_adds` |
| Skirmisher | `skirmisher` | 65 | 0 | 265 | 20 | 34 at 450 every 1.5 s | 850 · 1800 | 55 | `ranged_kiter` | `square_dot` · `0xe07b39` | `arrow` | Normal · elite · boss | `root_net` · `self_heal`, `root_net` |
| Crusher | `crusher` | 110 | 6 | 210 | 64 | 62 melee every 1.9 s | 600 · 1200 | 110 | `melee_chaser` | `square` · `0x7a7a8c` | `slam` | Normal · elite · boss | `charge` · `self_heal`, `charge` |
| Summoner | `summoner` | 60 | 1 | 210 | 32 | 46 at 550 every 2.0 s | 800 · 1500 | 70 | `ranged_holder` | `square_dot` · `0x5e3a8c` | `summon_adds` | Normal · elite · boss | `silence_curse` · `silence_curse`, `self_heal` |
| Lancer | `lancer` | 55 | 3 | 225 | 32 | 38 melee every 1.5 s | 750 · 1600 | 65 | `charger` | `square` · `0x4a90d9` | `charge` | Normal · elite · boss | `slam` · `root_net`, `slam` |
| Troll | `troll` | 125 | 3 | 225 | 32 | 64 melee every 1.6 s | 650 · 1400 | 85 | `melee_chaser` | `square` · `0x9aa33b` | `self_heal` | Normal · elite · boss | `slam` · `slam`, `charge` |

The frames stay the four's: a filled square for what closes to contact, a square with a dot for what fights from range, drawn at the bound radius, so size and colour tell the nine apart from each other and from the four.

### 7.3 The entries

#### 7.3.1 Brute

A heavy melee enemy whose swing stuns the hero on a rhythm.

| Field | Value | Why |
|---|---|---|
| Id | `brute` | |
| Diablo II monster | Skeleton, Burning Dead, level 13 | The fifth region is the Catacombs' tier; Bonebreaker, the skeleton unique, is Extra Strong. The last boss is a brute at boss tier. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Role | Stands on the hero and takes its kit away for a moment every few seconds | The bash is the only disable that lands on a swing, so the answer is to not be beside it |
| Health · regeneration | 85 · 0.2 | Three of the hero's attacks after armour, 33.9 each, the grunt's count |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 4 · 0 | Armour takes 19 % off physical damage, between the grunt and the tank; spells land in full, so it is a target for them |
| Movement speed · turn rate | 225 · 0.4 | Slower than the hero, so a hero that walks away is not bashed |
| Collision · bound · selection radius | 32 · 24 · 32 | Drawn at the hero's size, on the medium class; the corridor is open to it |
| Attack damage · range | 46 · 100 | 40.4 after a level-1 hero's armour, 35.6 after a level-9 one's, 3.8 % of it, so twenty-seven kill it; the bash's stun every four seconds on top |
| Acquire radius | 650 | The aggro radius |
| Attack point · backswing · base attack time | 0.5 s · 0.5 s · 1.6 s | A slower swing than the grunt's, so the stun it carries can be seen coming |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0x8c2f39` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 650 · 1400 | It notices late and follows about two aggro radii from home |
| Experience | 90 | Nearly two grunts, for a heavier hit and the stun |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | none · `melee_chaser` | Closes to contact |
| Statuses | `bash` | Every hit may stun the hero, at most once per the bash's four-second clock |
| Tiers | Normal · elite · boss | |
| Elite ability | `slam` with the hero within 250 | The slam's own radius; an elite brute throws the hero clear after stunning it |
| Boss abilities | `slam` with the hero within 250 · `summon_adds` always · `charge` always | A bash, a slam, adds, and a charge: the boss that has an answer at every distance |
| Frame · tint | `square` · `0x8c2f39` | The square in a darker red than the grunt's |

#### 7.3.2 Frost raider

A quick melee enemy whose every hit slows the hero.

| Field | Value | Why |
|---|---|---|
| Id | `frost_raider` | |
| Diablo II monster | Corrupt Rogue, Vile Hunter, level 5 | Plain, quick melee that chases a hero walking away; the slow on its hit is its own. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Role | Catches a hero that is walking away, by slowing it with each hit | The runner's threat made about the walk, not the damage |
| Health · regeneration | 60 · 0.1 | Two of the hero's attacks after armour, 39.6 each |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 1 · 0.25 | Light armour, and a quarter off magical damage, so frost reads as its own |
| Movement speed · turn rate | 240 · 0.7 | Forty under the hero's 280, so a hero walking away gains on it until a hit lands; the slow leaves the hero at 196, and the raider closes |
| Collision · bound · selection radius | 20 · 14 · 20 | The smallest radius class, drawn as the small square |
| Attack damage · range | 30 · 100 | 26.3 after a level-1 hero's armour, 25.5 after a level-3 one's, 4 % of it, so twenty-five kill it; the slow is the rest of its harm |
| Acquire radius | 800 | The aggro radius |
| Attack point · backswing · base attack time | 0.3 s · 0.3 s · 1.1 s | Quick hits, so the slow is refreshed as soon as its clock allows |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0x7fd3e8` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 800 · 1800 | The runner's reach: walking away from it does not shed it |
| Experience | 38 | Between a runner and a grunt, for health between them |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | none · `melee_chaser` | Closes to contact |
| Statuses | `frost_attack` | Every hit may slow the hero, at most once a second |
| Tiers | Normal · elite · boss | |
| Elite ability | `charge` always | An elite closes the gap before its first hit, not after |
| Boss abilities | `self_heal` below half its health · `charge` always | The heal first, so a boss is not a runner with more health; the charge next |
| Frame · tint | `square` · `0x7fd3e8` | The small square in ice blue |

#### 7.3.3 Hexer

A caster that stands off and silences the hero.

| Field | Value | Why |
|---|---|---|
| Id | `hexer` | |
| Diablo II monster | Skeleton Mage, Returned Mage, level 8 | A caster at range with magic resistance, the one to kill first. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Role | Greys the hero's kit while its pack closes | Silence is the answer to a hero that wins by spells; the hexer is the one to kill first |
| Health · regeneration | 65 · 0.1 | Two of the hero's attacks, so reaching it is the cost, not killing it |
| Mana · regeneration | 400 · 1 | Its abilities cost nothing; a pool for Siphon to take from a caster |
| Armour · magic resistance | 0 · 0.35 | No armour, and a third off magical damage, so the attack is the better answer to it |
| Movement speed · turn rate | 210 · 0.6 | Slower than the hero, so a hero that goes for it reaches it |
| Collision · bound · selection radius | 32 · 24 · 32 | Drawn at the hero's size, on the medium class |
| Attack damage · range | 30 · 450 | 26.3 after a level-1 hero's armour, 24.7 after a level-5 one's, 3.4 % of it, so thirty kill it; the curse is its harm. The curse's 600 reaches past its own shot, so it curses first |
| Acquire radius | 800 | The aggro radius |
| Attack point · backswing · base attack time | 0.5 s · 0.5 s · 2.0 s | Slow shots |
| Projectile speed · radius | 800 · 10 | A little slower than the archer's arrow |
| Projectile frame · tint | `disc` · `0x3f51b5` | Its own colour |
| Aggro · leash radius | 800 · 1500 | The archer's |
| Experience | 60 | More than an archer for less health, because it takes the kit away |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | `silence_curse` always · `ranged_kiter` | Curses whenever the clock allows. It is a kiter: it backs away when the hero closes and keeps firing |
| Statuses | none | |
| Tiers | Normal · elite · boss | |
| Elite ability | `root_net` always | A silenced hero that is also held cannot walk to it |
| Boss abilities | `root_net` always · `summon_adds` always | The net, then imps to stand between it and the hero |
| Frame · tint | `square_dot` · `0x3f51b5` | The ranged square in indigo |

#### 7.3.4 Trapper

A ranged enemy that roots the hero where it stands.

| Field | Value | Why |
|---|---|---|
| Id | `trapper` | |
| Diablo II monster | Skeleton Archer, Returned Archer, level 8 | A ranged holder; the net is its ability on top. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Role | Holds the hero still for the rest of its pack | The root answers a hero that kites; a netted hero cannot walk out of a grunt's reach |
| Health · regeneration | 95 · 0.1 | Three of the hero's attacks after armour, the archer's count |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 2 · 0 | The grunt's armour |
| Movement speed · turn rate | 210 · 0.6 | The hexer's pace, a little under the archer's |
| Collision · bound · selection radius | 32 · 24 · 32 | Drawn at the hero's size, on the medium class |
| Attack damage · range | 30 · 500 | 26.3 after a level-1 hero's armour, over the archer's; 24.7 after a level-5 one's, so thirty kill it. The net's 700 reaches past its shot |
| Acquire radius | 800 | The aggro radius |
| Attack point · backswing · base attack time | 0.5 s · 0.5 s · 1.8 s | The archer's cadence |
| Projectile speed · radius | 900 · 10 | The archer's arrow |
| Projectile frame · tint | `disc` · `0x2e8b7a` | Its own colour |
| Aggro · leash radius | 800 · 1500 | The archer's |
| Experience | 55 | A little over an archer, for the net |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | `root_net` always · `ranged_holder` | Nets whenever the clock allows, and holds at its range less the margin |
| Statuses | none | |
| Tiers | Normal · elite · boss | |
| Elite ability | `arrow` always | A heavy arrow into the hero it has just held |
| Boss abilities | `arrow` always · `summon_adds` always | The arrow, then imps to reach the held hero |
| Frame · tint | `square_dot` · `0x2e8b7a` | The ranged square in teal |

#### 7.3.5 Skirmisher

A light ranged enemy that looses a heavy arrow from beyond the hero's reach.

| Field | Value | Why |
|---|---|---|
| Id | `skirmisher` | |
| Diablo II monster | Spike Fiend, Thorn Beast, level 8 | Small, quick, and fires volleys at range. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Role | Punishes a hero that chases it | It backs away at nearly the hero's pace and looses its arrow from 700, but its own shot reaches 450, so the hero's 600 outranges it and shoots it down |
| Health · regeneration | 65 · 0.1 | Two of the hero's attacks, the hexer's count |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 0 · 0 | Nothing to slow its death |
| Movement speed · turn rate | 265 · 0.7 | The quickest of the roster, 15 under the hero's 280, so walking after it closes the gap only slowly; the hero's reach closes it instead |
| Collision · bound · selection radius | 20 · 14 · 20 | The smallest radius class, drawn as the small square with a dot |
| Attack damage · range | 34 · 450 | 29.8 after a level-1 hero's armour, 28.0 after a level-5 one's, so twenty-seven kill it; the arrow's 60 at 700 is its harm from beyond the hero's 600 |
| Acquire radius | 850 | The aggro radius |
| Attack point · backswing · base attack time | 0.4 s · 0.4 s · 1.5 s | Quick shots between arrows |
| Projectile speed · radius | 1000 · 8 | The fastest shot, and the smallest |
| Projectile frame · tint | `disc` · `0xe07b39` | Its own colour |
| Aggro · leash radius | 850 · 1800 | It sees the hero first and follows far |
| Experience | 55 | More than a runner, for more health and the arrow from beyond the hero's reach |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | `arrow` always · `ranged_kiter` | Looses the arrow whenever the clock allows. It is a kiter: it backs away when the hero closes and keeps firing |
| Statuses | none | |
| Tiers | Normal · elite · boss | |
| Elite ability | `root_net` always | Holds the hero out of its own reach |
| Boss abilities | `self_heal` below half its health · `root_net` always | The heal first, so a boss caught once is not dead; the net next |
| Frame · tint | `square_dot` · `0xe07b39` | The small ranged square in orange |

#### 7.3.6 Crusher

A slow, armoured enemy that slams the ground when the hero stands beside it.

| Field | Value | Why |
|---|---|---|
| Id | `crusher` | |
| Diablo II monster | Goatman, Death Clan, level 10 | An armoured clan warrior that blocks and hits hard in melee. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Role | Throws the hero clear of whatever it was standing in | The tank made to answer a hero that fights in melee reach |
| Health · regeneration | 110 · 0.2 | Four of the hero's attacks after armour, 30.9 each, the tank's count |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 6 · 0.1 | Armour takes 26 % off physical damage, under the tank's 32 % |
| Movement speed · turn rate | 210 · 0.35 | A little quicker than the tank, among the easiest to walk away from |
| Collision · bound · selection radius | 64 · 44 · 56 | The largest radius class: the corridor is closed to it, as to the tank |
| Attack damage · range | 62 · 100 | 54.4 after a level-1 hero's armour, 49.4 after a level-7 one's, 6 % of it, so seventeen kill it; the slam's 50 and push are its harm beside the hero |
| Acquire radius | 600 | The aggro radius |
| Attack point · backswing · base attack time | 0.6 s · 0.6 s · 1.9 s | The tank's heavy swing |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0x7a7a8c` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 600 · 1200 | The tank's: it guards its ground |
| Experience | 110 | A little under the tank, for the same four attacks and a lighter hit |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | `slam` with the hero within 250 · `melee_chaser` | The slam's own radius, so it slams only what it would strike |
| Statuses | none | |
| Tiers | Normal · elite · boss | |
| Elite ability | `charge` always | An elite crusher is not walked away from |
| Boss abilities | `self_heal` below half its health · `charge` always | The heal first, then the charge |
| Frame · tint | `square` · `0x7a7a8c` | The large square in slate |

#### 7.3.7 Summoner

A caster that stays back and brings imps on a clock.

| Field | Value | Why |
|---|---|---|
| Id | `summoner` | |
| Diablo II monster | Fallen Shaman, Dark Shaman, level 11 | Raises its pack, dies fast, and throws a bolt at range. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Role | Makes a small pack a large one if it is left standing | Its imps leave with it, so killing it is the answer to them |
| Health · regeneration | 60 · 0.1 | Two of the hero's attacks after armour |
| Mana · regeneration | 500 · 1 | Its abilities cost nothing; a pool for Siphon to take |
| Armour · magic resistance | 1 · 0.25 | Light armour, and a quarter off magical damage |
| Movement speed · turn rate | 210 · 0.5 | Slower than its imps, so they arrive first |
| Collision · bound · selection radius | 32 · 24 · 32 | Drawn at the hero's size, on the medium class |
| Attack damage · range | 46 · 550 | 40.4 after a level-1 hero's armour, 36.7 after a level-7 one's, so twenty-three kill it, and its imps add to that. The longest range of the roster's shots, still short of the hero's 600 |
| Acquire radius | 800 | The aggro radius |
| Attack point · backswing · base attack time | 0.5 s · 0.5 s · 2.0 s | Slow shots |
| Projectile speed · radius | 800 · 10 | The hexer's shot |
| Projectile frame · tint | `disc` · `0x5e3a8c` | Its own colour |
| Aggro · leash radius | 800 · 1500 | The archer's |
| Experience | 70 | A grunt and a half; its imps grant nothing, so it cannot be farmed |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | `summon_adds` always · `ranged_holder` | Brings two imps whenever the clock and the live cap allow, and holds at its range less the margin |
| Statuses | none | |
| Tiers | Normal · elite · boss | |
| Elite ability | `silence_curse` always | The imps arrive at a hero with no kit |
| Boss abilities | `silence_curse` always · `self_heal` below half its health | The curse, then the heal |
| Frame · tint | `square_dot` · `0x5e3a8c` | The ranged square in a darker violet than its imps |

#### 7.3.8 Lancer

A melee enemy that charges across the gap to the hero.

| Field | Value | Why |
|---|---|---|
| Id | `lancer` | |
| Diablo II monster | Corrupt Spearwoman, Vile Lancer, level 5 | Diablo II calls her variants Lancers; reach melee with a Power Strike, the charge. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Role | Makes distance unsafe | The charge answers a hero that kites a grunt, from 600 away |
| Health · regeneration | 55 · 0.1 | Two of the hero's attacks after armour, 35.6 each |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 3 · 0 | Armour takes 15 % off physical damage |
| Movement speed · turn rate | 225 · 0.5 | Slower than the hero on foot; the charge is its speed |
| Collision · bound · selection radius | 32 · 24 · 32 | Drawn at the hero's size, on the medium class |
| Attack damage · range | 38 · 120 | 33.3 after a level-1 hero's armour, 32.3 after a level-3 one's, 5.2 % of it, so twenty kill it; a little longer than a grunt's reach |
| Acquire radius | 750 | The aggro radius |
| Attack point · backswing · base attack time | 0.4 s · 0.5 s · 1.5 s | The grunt's swing |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0x4a90d9` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 750 · 1600 | A little past the grunt's |
| Experience | 65 | Over a grunt, for the charge |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | `charge` always · `charger` | Charges whenever the clock allows and the hero is within its 600. It is a charger: it waits at range for its charge, then closes, and closes at once on a hero that comes inside that range |
| Statuses | none | |
| Tiers | Normal · elite · boss | |
| Elite ability | `slam` with the hero within 250 | The charge lands it beside the hero, where the slam reaches |
| Boss abilities | `root_net` always · `slam` with the hero within 250 | The net holds the hero for the next charge, the slam throws it clear |
| Frame · tint | `square` · `0x4a90d9` | The square in steel blue |

#### 7.3.9 Troll

A hardy melee enemy that heals itself once it is hurt.

| Field | Value | Why |
|---|---|---|
| Id | `troll` | |
| Diablo II monster | Giant Spider, Arach, level 11 | Regenerates half again as fast as other monsters: finished, not worn down. See [the ratios note](../../../.claude/plan/implementation/notes/2026-09-26-diablo-ii-act-1-ratios.md) |
| Role | Has to be finished, not worn down | The heal's cast point is the counterplay: a stun in it spends nothing and starts no clock |
| Health · regeneration | 125 · 0.6 | Four of the hero's attacks after armour, 35.6 each, and three times the others' regeneration |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 3 · 0.1 | Armour takes 15 % off physical damage |
| Movement speed · turn rate | 225 · 0.45 | Quicker than the grunt, at the brute's pace |
| Collision · bound · selection radius | 32 · 24 · 32 | Drawn at the hero's size, on the medium class |
| Attack damage · range | 64 · 100 | 56.1 after a level-1 hero's armour, 51.0 after a level-7 one's, 6.2 % of it, so seventeen kill it: the hardest hit of a normal |
| Acquire radius | 650 | The aggro radius |
| Attack point · backswing · base attack time | 0.5 s · 0.5 s · 1.6 s | The brute's swing |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0x9aa33b` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 650 · 1400 | The brute's |
| Experience | 85 | Nearly two grunts, for the heal |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | `self_heal` below half its health · `melee_chaser` | Heals 10 a second for five seconds once it is below half, 50 in all, under half its health, so it is finished rather than outhealed; then closes to contact |
| Statuses | none | |
| Tiers | Normal · elite · boss | |
| Elite ability | `slam` with the hero within 250 | |
| Boss abilities | `slam` with the hero within 250 · `charge` always | The slam beside the hero, the charge when it walks away |
| Frame · tint | `square` · `0x9aa33b` | The square in moss green |

### 7.4 Experience across the roster

| Archetype | Experience | Against a grunt's 46 |
|---|---|---|
| Brute | 90 | Nearly two |
| Frost raider | 38 | A little under one |
| Hexer | 60 | One and a third |
| Trapper | 55 | A little over one |
| Skirmisher | 55 | A little over one |
| Crusher | 110 | Nearly two and a half |
| Summoner | 70 | One and a half; its imps add nothing |
| Lancer | 65 | One and a half, near enough |
| Troll | 85 | Nearly two |

| Pack | Experience | At level 1 |
|---|---|---|
| A brute, a hexer, and two grunts | 242 | Level 2 and a little over |
| A summoner and three grunts, with whatever imps it brings | 208 | Just short of level 2 |
| A crusher, a troll, and a trapper | 250 | Level 2 and a little over |
| A lancer, two frost raiders, and a skirmisher | 196 | Short of level 2 |

A roster archetype is priced as the four are: by how long it takes to kill and how much harm it does in that time, and a disable counts as harm. The table is a normal unit's; an elite grants 3 times its archetype's experience and a boss 10 times, as section 4 says, so an elite brute grants 270 and a boss troll 850.

### 7.5 Frames the roster adds

None. Every entry draws its body with `square` or `square_dot` and its shot with `disc`, all in [section 6](#6-atlas-frames).

---

## Related documentation

- [Enemies](../features/enemies.md) — how enemies behave for the player: the state machine, packs, leash, tiers, and the edge cases every entry above inherits
- [Hero](../features/hero.md) — the level-1 hero every number here is set against, and where the experience goes
- [Content authoring standards](../../standards/content-authoring.md) — how a definition file writes these numbers
- [Adding an enemy](../../workflows/adding-an-enemy.md) — the runbook that turns an entry here into a file and its six tests
- [Spell catalogue](./spell-catalogue.md) — the spells these archetypes are built to be thrown at
