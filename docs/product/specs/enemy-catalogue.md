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

This page fixes the first four archetypes and the training dummy as data before any of the four is built: every field of an enemy definition, a starting value for each, and one line saying why the value is where it is. The definitions under `src/content/enemies/` are written from it.

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
| Abilities · behaviour | Ability ids, empty for every archetype here; the behaviour by key |
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

The grunt and the tank share the `square` frame with the runner and read apart by size: the square is drawn at the collision radius, so the runner's is small, the grunt's is the hero's size, and the tank's is large.

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
| `square` | The grunt, the runner, the tank | Yes |
| `square_outline` | The training dummy | Yes |
| `square_outline_thick` | The outline every elite and boss is drawn with over its body | Yes |
| `square_dot` | The archer | New: a square with a round hole at its centre a third of its width across, so the dot reads in the floor's colour under the square's one tint |
| `disc` | Every archetype's projectile | Yes |

---

## 7. The long roster

The archetypes beyond these four: composed from the behaviours above and the enemy abilities the [enemies page](../features/enemies.md#enemy-abilities) lists, each with its role, its numbers, its frame and colour, the tiers it may spawn at, and the abilities an elite or a boss of it adds. Until this section holds an entry, the four above and the dummy are the whole roster.

---

## Related documentation

- [Enemies](../features/enemies.md) — how enemies behave for the player: the state machine, packs, leash, tiers, and the edge cases every entry above inherits
- [Hero](../features/hero.md) — the level-1 hero every number here is set against, and where the experience goes
- [Content authoring standards](../../standards/content-authoring.md) — how a definition file writes these numbers
- [Adding an enemy](../../workflows/adding-an-enemy.md) — the runbook that turns an entry here into a file and its six tests
- [Spell catalogue](./spell-catalogue.md) — the spells these archetypes are built to be thrown at
