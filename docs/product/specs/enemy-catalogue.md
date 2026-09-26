# Enemy catalogue

> **Entry point:** [Product](../README.md)

**Helix — The archetypes as data: every number an enemy definition carries, and why it starts there**

| Field | Value |
|---|---|
| Document type | Content specification |
| Audience | Gameplay programming, combat design |
| Product context | Single-player. One hero against packs of enemies in the arena |
| Classification | The enemy archetypes and the numbers each definition carries. How enemies behave, the state machine, tiers, and the edge cases are the [enemies page](../features/enemies.md) |
| Simulation | 30 Hz tick. Every duration here is seconds and becomes whole ticks at load |
| Reference | The hero's starting values, so every enemy number is set against what the hero can do at level 1 |

---

## 1. Purpose

This page fixes the archetypes, the training dummy, and the imp as data: every field of an enemy definition, a starting value for each, and one line saying why the value is where it is. The definitions under `src/content/enemies/` are written from it.

Every number is a starting value. The definition file owns it once the file exists, and the file wins when this page disagrees: one file per archetype under `src/content/enemies/`, the file name the id. The tuning surface changes any of them at no code cost. What this page owns is the reasoning: which archetype is faster than the hero and which is slower, which one out-ranges which, and what a pack is worth in experience. A reason measured in a recorded session cites it, as "balance pass 1", and [section 5](#5-what-the-numbers-do-in-a-fight) holds what those sessions measured.

---

## 2. How to read an entry

### 2.1 The fields

Every archetype carries the same fields, the ones the [enemies page](../features/enemies.md#what-a-definition-holds) lists. A field an archetype does not use holds its neutral value rather than being left out.

| Field | Meaning |
|---|---|
| Id | The snake_case string every command, event, and log line uses. It never renames |
| Health · regeneration | Points, and points per second |
| Mana · regeneration | Points, and points per second. Zero for an archetype with no mana, so a spell that burns mana finds a number |
| Armour · magic resistance | Armour points, reduced through the armour curve like the hero's; magic resistance a fraction of one off magical damage |
| Movement speed · turn rate | World units per second; radians per 0.03 s, as the [mechanics spec](./character-movement-and-mechanics.md) publishes the hero's |
| Collision · bound · selection radius | World units. The collision radius is one of the three radius classes pathing plans for, 16, 27, or 50, and sets how large the square is drawn |
| Attack damage · range | Physical damage before armour; range centre to centre before both bound radii are added |
| Acquire radius | How far the behaviour looks for the hero to attack |
| Attack point · backswing · base attack time | Seconds. An enemy has no attack speed of its own, so one attack every base attack time |
| Projectile speed · radius | World units per second, and world units. A speed of zero is a melee attack that lands at the attack point |
| Aggro · leash radius | World units. Aggro from where the enemy stands; leash from its own spawn point |
| Experience | What the hero gains when it dies, against the level table in [section 4](#4-experience-against-the-level-table) |
| Indestructible | Whether damage leaves it at one health. Only the dummy |
| Tier | Normal for every archetype here. Elite and boss are what a spawn asks for, and multiply as the [enemies page](../features/enemies.md#tiers) says |
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

---

## 3. The archetypes

The table is the whole catalogue at a glance; the entries below hold every field and the reasons.

| Archetype | Id | Health | Armour | Speed | Radius | Attack | Aggro · leash | Experience | Behaviour | Frame · tint |
|---|---|---|---|---|---|---|---|---|---|---|
| Melee grunt | `melee_grunt` | 400 | 2 | 240 | 27 | 20 melee every 1.4 s | 700 · 1500 | 46 | `melee_chaser` | `square` · `0xe05a4f` |
| Fast runner | `fast_runner` | 220 | 0 | 340 | 16 | 10 melee every 1.0 s | 800 · 2000 | 30 | `melee_chaser` | `square` · `0xf2c14e` |
| Ranged archer | `ranged_archer` | 300 | 1 | 260 | 27 | 20 at 500 every 1.8 s | 800 · 1500 | 50 | `ranged_holder` | `square_dot` · `0x5cb85c` |
| Tank | `tank` | 1200 | 8 | 200 | 50 | 36 melee every 2.0 s | 600 · 1200 | 120 | `melee_chaser` | `square` · `0xa9743b` |
| Training dummy | `training_dummy` | 1000 | 0 | 0 | 27 | none | 0 · 0 | 0 | `stationary` | `square_outline` · `0xffffff` |
| Imp | `imp` | 120 | 0 | 300 | 16 | 8 melee every 1.0 s | 800 · 2000 | 0 | `melee_chaser` | `square` · `0x9b6fd1` |

The grunt, the tank, and the imp share the `square` frame with the runner and read apart by size and colour: the square is drawn at the collision radius, so the runner's is small, the grunt's is the hero's size, and the tank's is large.

### 3.1 Melee grunt

The baseline. Slow, medium health, walks up and hits.

| Field | Value | Why |
|---|---|---|
| Id | `melee_grunt` | |
| Health · regeneration | 400 · 1 | Eleven of the hero's attacks after armour, or a level-1 Zenith and eight, so a grunt dies to a rotation, not to one spell |
| Mana · regeneration | 0 · 0 | It casts nothing |
| Armour · magic resistance | 2 · 0 | The hero's armour, near enough, so physical damage lands about as it does on the hero; spells land in full |
| Movement speed · turn rate | 240 · 0.5 | Slower than the hero's 280, so the hero gains 40 units a second walking away and kiting works: a level-1 hero walking a wide circle is never reached, and one that shoots only when the gap is 300 kills a grunt without being hit, in about seventy seconds (balance pass 1) |
| Collision · bound · selection radius | 27 · 24 · 32 | The hero's body, so a grunt fits the arena's 96-unit corridor one at a time and a pack queues through it |
| Attack damage · range | 20 · 100 | 17.5 after the hero's armour; five grunts on the hero kill it in about eight seconds, long enough to react, short enough to matter |
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

Low health, fast, reaches the hero before the grunt does.

| Field | Value | Why |
|---|---|---|
| Id | `fast_runner` | |
| Health · regeneration | 220 · 0.5 | Six of the hero's attacks, the fewest of the four, so a runner that arrives first dies first |
| Mana · regeneration | 0 · 0 | It casts nothing |
| Armour · magic resistance | 0 · 0 | Nothing to slow its death; its speed is its defence |
| Movement speed · turn rate | 340 · 0.8 | Faster than the hero by 60 a second, so it cannot be kited forever and has to be stopped: a hero walking the same circle that sheds a grunt is caught and hit ten times in twenty seconds (balance pass 1). It turns quickest |
| Collision · bound · selection radius | 16 · 14 · 20 | The smallest radius class: it can pass a grunt in the corridor and is drawn as the small square |
| Attack damage · range | 10 · 100 | 8.8 after armour; a nuisance alone, dangerous only with the pack behind it |
| Acquire radius | 800 | The aggro radius |
| Attack point · backswing · base attack time | 0.3 s · 0.3 s · 1.0 s | Quick, light hits |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0xf2c14e` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 800 · 2000 | It notices the hero as far as the hero looks for it, and follows furthest, so walking away from a runner does not shed it |
| Experience | 30 | Less than a grunt for less health, more per point of health for the speed |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | none · `melee_chaser` | Closes to contact |
| Frame · tint | `square` · `0xf2c14e` | The square, drawn small at its radius, in yellow |

### 3.3 Ranged archer

Stays at range and fires a projectile.

| Field | Value | Why |
|---|---|---|
| Id | `ranged_archer` | |
| Health · regeneration | 300 · 0.5 | Eight of the hero's attacks: between the runner and the grunt, because it is harder to reach |
| Mana · regeneration | 550 · 1 | It casts nothing, but a mana pool gives Siphon something to take from a real enemy. As deep as Siphon's largest burn, so every level of its table takes more: at 200, Whorl 3 to 7 burned no more than Whorl 2 from the one archetype that carries mana (balance pass 1) |
| Armour · magic resistance | 1 · 0 | Light |
| Movement speed · turn rate | 260 · 0.6 | Slower than the hero, faster than the grunt, so it keeps its distance from a grunt's pace but not from the hero's; the hero's turn rate |
| Collision · bound · selection radius | 27 · 24 · 32 | The hero's body |
| Attack damage · range | 20 · 500 | 17.5 after armour. A hundred short of the hero's 600, so the hero out-ranges an archer standing still and wins the trade by stepping back. It punishes standing still: a level-1 hero that stands and trades takes about nine health a second from one archer, and one that walks away takes under half that, its arrows landing only when it stops within range (balance pass 1) |
| Acquire radius | 800 | The aggro radius |
| Attack point · backswing · base attack time | 0.5 s · 0.5 s · 1.8 s | Slower than the hero's attack, so its arrows can be counted |
| Projectile speed · radius | 900 · 10 | The hero's projectile speed, a homing arrow a little smaller than the hero's |
| Projectile frame · tint | `disc` · `0x5cb85c` | Its own colour, as every projectile is its caster's |
| Aggro · leash radius | 800 · 1500 | It sees the hero before the hero is in range of it |
| Experience | 50 | Slightly more than a grunt for less health, because it hits from where the hero is not |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | none · `ranged_holder` | Holds at its attack range less a margin and fires |
| Frame · tint | `square_dot` · `0x5cb85c` | A square with a dot, in green |

### 3.4 Tank

High health, high armour, slow. Something that does not die quickly.

| Field | Value | Why |
|---|---|---|
| Id | `tank` | |
| Health · regeneration | 1200 · 3 | Three grunts' health; forty-three of the hero's attacks after armour, so it is a target for spells, not for the attack. It takes a combo: at orb level 7 no spell alone takes half of it, and Updraft, Zenith, Bolide, and Clarion thrown in turn take all of it (balance pass 1) |
| Mana · regeneration | 0 · 0 | It casts nothing |
| Armour · magic resistance | 8 · 0.25 | Armour takes 32 % off physical damage, magic resistance a quarter off magical, and pure damage lands in full, so the damage types read apart on it |
| Movement speed · turn rate | 200 · 0.3 | The slowest: easy to walk away from, and turning half a circle takes it a third of a second |
| Collision · bound · selection radius | 50 · 44 · 56 | The largest radius class: the arena's 96-unit corridor is closed to it, so it paths round while the rest of its pack queues through |
| Attack damage · range | 36 · 100 | 31.6 after armour, the hardest hit of the four |
| Acquire radius | 600 | The aggro radius |
| Attack point · backswing · base attack time | 0.6 s · 0.6 s · 2.0 s | A slow, heavy swing the hero can see coming |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0xa9743b` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 600 · 1200 | It notices late and gives up early, so it guards its ground rather than following |
| Experience | 120 | A little under three grunts for three grunts' health; the armour is the hero's cost to spend spells on it |
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
| Collision · bound · selection radius | 27 · 24 · 32 | The hero's body |
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
| Health · regeneration | 120 · 0 | Two of the hero's attacks after armour, so a pair of adds is a nuisance cleared in a breath, not a second pack |
| Mana · regeneration | 0 · 0 | It casts nothing |
| Armour · magic resistance | 0 · 0 | Nothing to slow its death |
| Movement speed · turn rate | 300 · 0.8 | A little faster than the hero, so the adds reach it before their summoner does and are not simply walked away from |
| Collision · bound · selection radius | 16 · 14 · 20 | The smallest radius class, the runner's body, so two fit beside their summoner in the corridor |
| Attack damage · range | 8 · 100 | Lighter than a runner's; the harm is in the number of bodies, not in any one |
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

The numbers here are a normal unit's. An elite grants 3 times its archetype's experience and a boss 10 times, the `elite_experience_multiplier` and `boss_experience_multiplier` tunables, as its health is multiplied: an elite grunt grants 138 and a boss grunt 460, two levels' worth at level 1. The imp and the dummy grant nothing at any tier.

---

## 5. What the numbers do in a fight

What the definitions above do against the hero, measured in three sessions recorded with the developer panel and kept as input logs under `tests/simulation/replays/balance-*.json`, which `tests/simulation/replays/balance.spec.ts` replays and checks. A log is valid only on the content version it was recorded on, so a change to any definition number means recording the three again and moving this section with them.

**The hero session.** The hero stands and attacks, with no spell, against a pack of five of each archetype, at levels 1, 10, and 20. The attack does not grow with level: the hero's level buys health, mana, armour, and attack speed, and its damage grows through the orbs. So a pack of five is a fight for spells at every level, and the attack alone clears only runners, from level 10.

| Pack of five | Level 1 | Level 10 | Level 20 |
|---|---|---|---|
| Grunts | Hero falls; none killed | Hero falls; one killed | Hero stands; three killed in 45 s |
| Runners | Hero falls; one killed | All five killed | All five killed |
| Archers | Hero falls; one killed | Hero falls; three killed | Hero stands; four killed in 45 s |
| Tanks | Hero falls; none killed | Hero falls; none killed | Hero falls; none killed |

**The archetypes session.** One of each against a level-1 hero on open ground, and a tank against a hero with every orb at 7.

| Archetype | What the hero does | What happens |
|---|---|---|
| Grunt | Walks a circle 800 across away from it, and shoots when the gap is 300 | Killed in about 68 s; the hero is never hit. The grunt is kited |
| Runner | Walks the same circle for 20 s | It catches the hero and lands ten hits. The runner is not kited |
| Archer | Stands and trades | Killed in about 12 s, the hero taking about nine health a second |
| Archer | Walks the same circle for 20 s | About four health a second: under half. The archer punishes standing still |
| Tank | Throws Updraft, Zenith, Bolide, and Clarion in turn, at 7 | Dead within 7 s of the first, having taken all of its 1200 |
| Tank | Throws one of Updraft, Zenith, Bolide, Clarion, or Glacier, at 7 | Standing; the most any one takes is Zenith's 475. The tank takes a combo |

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

An entry carries every field in [section 2.1](#21-the-fields) and reads as the entries in section 3 do, with four rows more: its role in one line, its ability list by key, with the condition each is chosen under, the tiers it may spawn at, and the abilities an elite and a boss of it add. Every number is set against the hero in [section 2.2](#22-the-hero-they-are-set-against), and against the four archetypes above.

Every roster archetype may spawn at all three tiers. An elite adds one ability the archetype does not already cast, and a boss adds the ones that make a single unit of it a fight: a heal where it has none, a way to close the gap or to hold the hero, adds where it has a pack to protect. A tier's entries come after the archetype's own, so a tier adds to what a plain unit does and never shadows it.

Two behaviours are the roster's own. A kiter, `ranged_kiter`, holds at its attack range less the margin and fires as the holder does; when the hero comes nearer than a second margin inside that, it backs away along a path while its attack is on its clock and turns to fire each time the clock allows. A charger, `charger`, closes as the chaser does while its charge is ready; while the charge is on its clock it waits at the charge's range less the margin, and if the hero comes a margin nearer than that it closes as the chaser does and fights, pathing round whatever stands between them, so a wall never pins it. A hero farther than that point is waited for, not followed into melee, so the charge is thrown the moment its clock allows. Its charge is the first entry of its list at its tier. The hexer and the skirmisher are kiters, and the lancer a charger.

### 7.2 The roster at a glance

| Archetype | Id | Health | Armour | Speed | Radius | Attack | Aggro · leash | Experience | Behaviour | Frame · tint | Abilities | Tiers | Elite · boss adds |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Brute | `brute` | 700 | 4 | 230 | 27 | 28 melee every 1.6 s | 650 · 1400 | 90 | `melee_chaser` | `square` · `0x8c2f39` | `bash` carried | Normal · elite · boss | `slam` · `slam`, `summon_adds`, `charge` |
| Frost raider | `frost_raider` | 280 | 1 | 290 | 16 | 12 melee every 1.1 s | 800 · 1800 | 38 | `melee_chaser` | `square` · `0x7fd3e8` | `frost_attack` carried | Normal · elite · boss | `charge` · `self_heal`, `charge` |
| Hexer | `hexer` | 260 | 0 | 250 | 27 | 14 at 450 every 2.0 s | 800 · 1500 | 60 | `ranged_kiter` | `square_dot` · `0x3f51b5` | `silence_curse` | Normal · elite · boss | `root_net` · `root_net`, `summon_adds` |
| Trapper | `trapper` | 320 | 2 | 260 | 27 | 16 at 500 every 1.8 s | 800 · 1500 | 55 | `ranged_holder` | `square_dot` · `0x2e8b7a` | `root_net` | Normal · elite · boss | `arrow` · `arrow`, `summon_adds` |
| Skirmisher | `skirmisher` | 240 | 0 | 290 | 16 | 14 at 450 every 1.5 s | 850 · 1800 | 55 | `ranged_kiter` | `square_dot` · `0xe07b39` | `arrow` | Normal · elite · boss | `root_net` · `self_heal`, `root_net` |
| Crusher | `crusher` | 1000 | 6 | 210 | 50 | 30 melee every 1.9 s | 600 · 1200 | 110 | `melee_chaser` | `square` · `0x7a7a8c` | `slam` | Normal · elite · boss | `charge` · `self_heal`, `charge` |
| Summoner | `summoner` | 350 | 1 | 240 | 27 | 12 at 550 every 2.0 s | 800 · 1500 | 70 | `ranged_holder` | `square_dot` · `0x5e3a8c` | `summon_adds` | Normal · elite · boss | `silence_curse` · `silence_curse`, `self_heal` |
| Lancer | `lancer` | 450 | 3 | 250 | 27 | 24 melee every 1.5 s | 750 · 1600 | 65 | `charger` | `square` · `0x4a90d9` | `charge` | Normal · elite · boss | `slam` · `root_net`, `slam` |
| Troll | `troll` | 650 | 3 | 235 | 27 | 26 melee every 1.6 s | 650 · 1400 | 85 | `melee_chaser` | `square` · `0x9aa33b` | `self_heal` | Normal · elite · boss | `slam` · `slam`, `charge` |

The frames stay the four's: a filled square for what closes to contact, a square with a dot for what fights from range, drawn at the collision radius, so size and colour tell the nine apart from each other and from the four.

### 7.3 The entries

#### 7.3.1 Brute

A heavy melee enemy whose swing stuns the hero on a rhythm.

| Field | Value | Why |
|---|---|---|
| Id | `brute` | |
| Role | Stands on the hero and takes its kit away for a moment every few seconds | The bash is the only disable that lands on a swing, so the answer is to not be beside it |
| Health · regeneration | 700 · 1.5 | Twenty-one of the hero's attacks after armour, a little under two grunts, so it outlasts the grunts it walks with |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 4 · 0 | Armour takes 19 % off physical damage, between the grunt and the tank; spells land in full, so it is a target for them |
| Movement speed · turn rate | 230 · 0.4 | Slower than the grunt, so a hero that walks away is not bashed |
| Collision · bound · selection radius | 27 · 24 · 32 | The hero's body; the corridor is open to it |
| Attack damage · range | 28 · 100 | 24.6 after the hero's armour, and the bash's stun every four seconds on top |
| Acquire radius | 650 | The aggro radius |
| Attack point · backswing · base attack time | 0.5 s · 0.5 s · 1.6 s | A slower swing than the grunt's, so the stun it carries can be seen coming |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0x8c2f39` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 650 · 1400 | It notices late and follows about two aggro radii from home |
| Experience | 90 | Nearly two grunts for nearly two grunts' health; the stun is the rest |
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
| Role | Catches a hero that is walking away, by slowing it with each hit | The runner's threat made about the walk, not the damage |
| Health · regeneration | 280 · 0.5 | Eight of the hero's attacks after armour, a little over a runner |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 1 · 0.25 | Light armour, and a quarter off magical damage, so frost reads as its own |
| Movement speed · turn rate | 290 · 0.7 | Ten faster than the hero, so on its own it gains slowly; once a hit slows the hero it closes fast |
| Collision · bound · selection radius | 16 · 14 · 20 | The smallest radius class, drawn as the small square |
| Attack damage · range | 12 · 100 | 10.6 after the hero's armour; the harm is the slow |
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
| Role | Greys the hero's kit while its pack closes | Silence is the answer to a hero that wins by spells; the hexer is the one to kill first |
| Health · regeneration | 260 · 0.5 | Seven of the hero's attacks, so reaching it is the cost, not killing it |
| Mana · regeneration | 400 · 1 | Its abilities cost nothing; a pool for Siphon to take from a caster |
| Armour · magic resistance | 0 · 0.35 | No armour, and a third off magical damage, so the attack is the better answer to it |
| Movement speed · turn rate | 250 · 0.6 | Slower than the hero, so a hero that goes for it reaches it |
| Collision · bound · selection radius | 27 · 24 · 32 | The hero's body |
| Attack damage · range | 14 · 450 | 12.3 after the hero's armour; its shot is a nuisance, the curse is its harm. The curse's 600 reaches past its own shot, so it curses first |
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
| Role | Holds the hero still for the rest of its pack | The root answers a hero that kites; a netted hero cannot walk out of a grunt's reach |
| Health · regeneration | 320 · 0.5 | Nine of the hero's attacks, a little over an archer |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 2 · 0 | The grunt's armour |
| Movement speed · turn rate | 260 · 0.6 | The archer's pace |
| Collision · bound · selection radius | 27 · 24 · 32 | The hero's body |
| Attack damage · range | 16 · 500 | 14.1 after the hero's armour, under the archer's; the net's 700 reaches past its shot |
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
| Role | Punishes a hero that chases it | Faster than the hero and backing away, it is caught by a spell, not by walking |
| Health · regeneration | 240 · 0.5 | Six of the hero's attacks, the runner's count |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 0 · 0 | Nothing to slow its death; its speed is its defence |
| Movement speed · turn rate | 290 · 0.7 | Ten faster than the hero, so walking after it does not close the gap |
| Collision · bound · selection radius | 16 · 14 · 20 | The smallest radius class, drawn as the small square with a dot |
| Attack damage · range | 14 · 450 | 12.3 after the hero's armour; the arrow's 60 at 700 is its harm, from beyond the hero's 600 |
| Acquire radius | 850 | The aggro radius |
| Attack point · backswing · base attack time | 0.4 s · 0.4 s · 1.5 s | Quick shots between arrows |
| Projectile speed · radius | 1000 · 8 | The fastest shot, and the smallest |
| Projectile frame · tint | `disc` · `0xe07b39` | Its own colour |
| Aggro · leash radius | 850 · 1800 | It sees the hero first and follows far |
| Experience | 55 | More than a runner for the same health, because it is hard to reach |
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
| Role | Throws the hero clear of whatever it was standing in | The tank made to answer a hero that fights in melee reach |
| Health · regeneration | 1000 · 2 | Thirty-three of the hero's attacks after armour, a little under a tank |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 6 · 0.1 | Armour takes 26 % off physical damage, under the tank's 32 % |
| Movement speed · turn rate | 210 · 0.35 | A little quicker than the tank, still the easiest to walk away from after it |
| Collision · bound · selection radius | 50 · 44 · 56 | The largest radius class: the corridor is closed to it, as to the tank |
| Attack damage · range | 30 · 100 | 26.4 after the hero's armour; the slam's 50 and push are its harm beside the hero |
| Acquire radius | 600 | The aggro radius |
| Attack point · backswing · base attack time | 0.6 s · 0.6 s · 1.9 s | The tank's heavy swing |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0x7a7a8c` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 600 · 1200 | The tank's: it guards its ground |
| Experience | 110 | A little under the tank, for a little less health |
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
| Role | Makes a small pack a large one if it is left standing | Its imps leave with it, so killing it is the answer to them |
| Health · regeneration | 350 · 0.5 | Nine of the hero's attacks after armour |
| Mana · regeneration | 500 · 1 | Its abilities cost nothing; a pool for Siphon to take |
| Armour · magic resistance | 1 · 0.25 | Light armour, and a quarter off magical damage |
| Movement speed · turn rate | 240 · 0.5 | The grunt's pace, behind its imps' |
| Collision · bound · selection radius | 27 · 24 · 32 | The hero's body |
| Attack damage · range | 12 · 550 | 10.6 after the hero's armour; its imps are its harm. The longest range of the roster's shots, still short of the hero's 600 |
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
| Role | Makes distance unsafe | The charge answers a hero that kites a grunt, from 600 away |
| Health · regeneration | 450 · 1 | Thirteen of the hero's attacks after armour, a little over a grunt |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 3 · 0 | Armour takes 15 % off physical damage |
| Movement speed · turn rate | 250 · 0.5 | Slower than the hero on foot; the charge is its speed |
| Collision · bound · selection radius | 27 · 24 · 32 | The hero's body |
| Attack damage · range | 24 · 120 | 21.1 after the hero's armour, a little longer than a grunt's reach |
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
| Role | Has to be finished, not worn down | The heal's cast point is the counterplay: a stun in it spends nothing and starts no clock |
| Health · regeneration | 650 · 3 | Nineteen of the hero's attacks after armour, and the tank's regeneration |
| Mana · regeneration | 0 · 0 | Its abilities cost nothing |
| Armour · magic resistance | 3 · 0.1 | Armour takes 15 % off physical damage |
| Movement speed · turn rate | 235 · 0.45 | A little slower than the grunt |
| Collision · bound · selection radius | 27 · 24 · 32 | The hero's body |
| Attack damage · range | 26 · 100 | 22.9 after the hero's armour |
| Acquire radius | 650 | The aggro radius |
| Attack point · backswing · base attack time | 0.5 s · 0.5 s · 1.6 s | The brute's swing |
| Projectile speed · radius | 0 · 0 | Melee |
| Projectile frame · tint | `disc` · `0x9aa33b` | Unused; the neutral frame and its own colour |
| Aggro · leash radius | 650 · 1400 | The brute's |
| Experience | 85 | Nearly two grunts, for the heal |
| Indestructible · tier | false · normal | |
| Abilities · behaviour | `self_heal` below half its health · `melee_chaser` | Heals 40 a second for five seconds once it is below half, then closes to contact |
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
