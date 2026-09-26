# Enemies

> **Entry point:** [Features](./README.md)

## Overview

Enemies are the units the hero fights. Each enemy is an instance of an archetype — a definition holding its numbers, its behaviour, its abilities, and its tier. Enemies come in packs, aggro together, chase, attack, and leash back. When they die they give experience.

Every archetype owns a definition file under `src/content/enemies/`, one per archetype. Numbers live there, not here; the [enemy catalogue](../specs/enemy-catalogue.md) holds each one's starting values and the reasoning behind them.

## Archetypes

The first four cover the four things a spell has to deal with: something slow that hits hard, something fast, something at range, and something that does not die quickly. The other nine each bring one enemy ability to the fight, so every status the hero can suffer has an archetype that causes it. Those thirteen are the roster; the training dummy and the imp stand outside it.

| Archetype | Role | Shape |
| --- | --- | --- |
| Melee grunt | Slow, medium health, walks up and hits | Square |
| Fast runner | Low health, fast, reaches the hero before the grunt does | Small square |
| Ranged archer | Stays at range, fires a projectile | Square with a dot |
| Tank | High health, high armour, slow | Large square |
| Training dummy | Never moves, never attacks, never dies. Takes and shows damage | Square with an outline |
| Brute | Heavy melee; its swing stuns on a rhythm | Square, dark red |
| Frost raider | Quick melee; every hit slows the hero | Small square, ice blue |
| Hexer | Stands off and silences the hero | Square with a dot, indigo |
| Trapper | Throws a net that roots the hero | Square with a dot, teal |
| Skirmisher | Light and fast; looses a heavy arrow from beyond the hero's reach | Small square with a dot, orange |
| Crusher | Slow and armoured; slams the ground beside it | Large square, slate |
| Summoner | Stays back and brings imps until it dies | Square with a dot, dark violet |
| Lancer | Charges across the gap to the hero | Square, steel blue |
| Troll | Heals itself once it is hurt | Square, moss green |
| Imp | What the summoner brings: small, quick, frail, worth no experience. Never placed in a pack of its own | Small square, violet |

Each archetype has a colour, its tint in the [enemy catalogue](../specs/enemy-catalogue.md#3-the-archetypes). Elites and bosses keep their archetype's body and take a thick outline around it in the same colour.

## What a definition holds

Every archetype carries the same fields. A field an archetype does not use is set to its neutral value, not left out.

- Health, health regeneration, armour, magic resistance
- Mana, mana regeneration, zero for an archetype that has none, so a spell that burns mana finds a number
- Movement speed, turn rate, collision radius
- An attack: damage, range, acquire radius, attack point, backswing, base attack time, and the projectile it fires, or none for a melee attack, which lands at the end of its attack point
- Aggro radius, leash radius
- Experience reward
- Tier: normal in every definition; elite and boss are what a spawn asks for
- An ability list, by name, each with the condition it is chosen under — always, below a fraction of the enemy's health, or with the hero within a distance — which may be empty
- The one ability an elite casts after that list, which may be none, and the abilities a boss casts after it, which may be empty
- A list of the statuses it carries for its life, by name, which may be empty: at most two, none of them a disable
- A behaviour, by name

## Behaviour

Every enemy runs the same state machine. The behaviour name in its definition picks how it chooses a target and where it wants to stand; the states are shared.

| Behaviour | Where it stands to fight |
| --- | --- |
| Chaser | On the hero: it closes to contact |
| Holder | At its attack range, less a margin, and fires |
| Kiter | Where the holder does; when the hero closes on it, it backs away along a path while its attack is on its clock and turns to fire each time the clock allows |
| Charger | While its charge is on its clock, at the charge's range less a margin; a hero a margin nearer than that it closes on and fights, as the chaser does, pathing round walls; once the charge is ready, it closes and throws it |
| Stationary | Where it spawned; it never leaves Idle |

| State | What the enemy does | Leaves when |
| --- | --- | --- |
| Idle | Stands at its spawn point, or wanders 64 units from it every few seconds, regenerating | The hero enters its aggro radius, or it takes damage |
| Aggro | Alerts its pack, and turns toward the hero as it sets off | Immediately, into Chase |
| Chase | Paths toward the hero, re-pathing on a budget | In attack range, into Attack; or past its leash radius, or the hero dead, untargetable, or hidden from aggro, into Return |
| Attack | Turns to face, runs its attack point, hits, repeats | Target out of range, into Chase; or the hero dead, target lost, hidden, or past its leash radius, into Return |
| Return | Paths back to its spawn point, ignoring the hero, regenerating | Arrives, into Idle |
| Dead | Gives experience, clears statuses, releases its slot after a short delay | Never |

**Aggro is shared across a pack.** One enemy seeing or being hit by the hero puts its whole pack into Aggro on the same tick. A pack is whatever was spawned together.

**Leash** is measured from each enemy's own spawn point. An enemy past its leash radius returns regardless of what the rest of its pack does.

Enemies path with the same grid A* the hero uses and push each other apart rather than steering around one another, so a pack in a corridor forms a queue, not a line.

## Tiers

| Tier | Health | Experience | Abilities | Look |
| --- | --- | --- | --- | --- |
| Normal | The definition's | The definition's | The definition's list | Its archetype's shape, no outline |
| Elite | 3 times the definition's | 3 times the definition's | The definition's list, then its one elite ability | An outline around the body |
| Boss | 10 times the definition's | 10 times the definition's | The definition's list, then its boss abilities | A larger outline, so its line reads thicker |

A tier is chosen when a pack spawns, from the panel or from a map's pack; any archetype spawns at any of the three. An imp a summoner brings is always normal, whatever its summoner's tier. A tier multiplies health and experience, so an elite pays for the time it takes to kill; an archetype worth nothing is worth nothing at any tier. It does not change the rules. A boss is stunned by Hoarfrost like a grunt is. The four multipliers are tunables. The health multipliers are read when a unit spawns, so a retune reaches the next spawn and leaves a unit already standing as it was; the experience multipliers are read when a unit dies, so a retune reaches the next death, a unit already standing included. The tier's abilities come after the definition's own in the order the selection rule tries them.

## Enemy abilities

Enemy abilities go through the same cast pipeline as the hero's spells: a targeting kind, a cast point, a cooldown, and effects. The set is chosen to exercise every status the hero can suffer.

Stun (a bash on hit), slow (a frost attack), silence (a caster's curse), root (a net), a ranged projectile, an area slam around the enemy, summoning adds, a self-heal, and a charge or leap that closes distance. Each is a definition an archetype references by name; the [ability pipeline](../../architecture/ability-pipeline.md) explains how.

The bash and the frost attack are not cast. Each is a status the archetype carries from the moment it spawns until it dies, whose damage-dealt hook stuns or slows whatever its swing or shot lands on, at most once per the hook's internal cooldown. Its icon shows above the enemy for as long as it lives, so the player can tell a basher from a plain grunt. The curse is cast at the hero and silences it once its cast point ends. The net is thrown from the enemy at the hero, flies to it, and roots it where it lands.

The arrow is loosed from the enemy at the hero, homes on it, and deals physical damage where it lands, so armour takes its share. The slam strikes a circle around the enemy, damaging every unit on the hero's side inside and pushing each one straight away from the enemy; a wall stops the push. It is cast only once the hero is inside the circle, and its long cast point is the tell. The self-heal is cast on the enemy itself only once its health is below a fraction of its maximum, and restores health for a few seconds, never past the maximum; a stun in its cast point cancels it. It is the only way an enemy regains health in a fight, since its regeneration runs only while it walks home and rests there.

The call for adds brings two imps beside the enemy: small, quick, and frail enemies of its pack that go for the hero, worth no experience, gone when their lifetime runs out or on the tick their summoner dies. They count against the live cap, so a call that would pass the cap is refused whole, spending nothing and starting no clock, and the enemy attacks instead. The charge carries the enemy itself at the hero, fast, up to its distance or until it meets the hero's edge, whichever is nearer; a wall stops it where it stands, and the enemy attacks from wherever the charge left it. Nothing else moves it while it charges, and its icon says so.

An enemy chooses an ability when it is off cooldown, in range, and the enemy's state is Attack or Chase. It takes the first ability its definition lists whose condition holds, that is off cooldown, reaches the hero, and is aimed at the hero, at the ground the hero stands on, or at itself; an ability aimed along a line is never chosen. It chooses nothing while silenced or in its own attack point, and never interrupts its own cast point; a stun during the cast point cancels the cast, spends nothing, and starts no clock. After the cast it goes back to attacking.

## Experience

An enemy that dies grants its definition's experience reward, times its tier's multiplier, to the hero, whoever landed the last hit — a summon's kill counts. A pack does not share or pool experience. The dummy and the imp grant none.

## Dormant packs

A map marks each of its packs dormant or live. A dormant pack does not exist as units: it sits as spawn data until the hero comes within 1600 units of its point (`pack_activation_radius`), then wakes, placed in Idle on the free cells nearest its point and no further than 1024 units from it (`pack_placement_radius`). This keeps the live enemy count bounded by what is near the hero, not by the map. Whatever the map, at most 200 enemies hold a slot at once, imps included, and a corpse keeps its slot until it is cleared: the budget performance is measured at, a constant beside the unit pool in `src/domain/entities/unit.ts`, not a tunable. A pack or a cast of adds that would pass it is refused whole. The arena holds no packs of its own; every pack on it is spawned from the panel, live from that tick.

A pack left behind sleeps again, so the live count follows the hero rather than the map. Once the hero is farther from its point than the sleep radius, 2000 units (`pack_sleep_radius`) and never less than the activation radius whatever the tuning, so a hero at the edge does not wake and sleep it every tick, and every living member rests in Idle at full health, its units go back to the pool and it waits as spawn data again, keeping how many survived. There is no leash heal: a member comes home no healthier than its walk home and its rest made it, and a pack with one still fighting, walking home, or hurt stays awake. Walking back wakes the survivors, whole, in Idle. A summoner's adds go with it and are not survivors. A pack spawned from the panel is not map data and never sleeps.

A pack the hero kills to the last member is dead for the map load: it does not come back when the hero walks near its point again, and the hero's death does not bring it back. Resetting the map puts every pack back as it was at load, every member alive.

## States and edge cases

| State | What happens |
| --- | --- |
| Leashed mid-attack | The attack point is cancelled and the enemy returns; a projectile already fired still lands |
| Pack partially in aggro radius | The whole pack aggroes on the first member that sees or is hit |
| Hero uses Wane | Aggro drops; enemies return unless already adjacent and attacking |
| A summoner dies, or the hero with a summon out | Its adds or summons go on the same tick, with no corpse and no experience |
| Enemy calls adds when the live cap is reached | The ability is refused this cast; cooldown is not spent |
| Hero nears a dormant pack with the live cap reached, or too few free cells within the placement radius | The pack keeps waiting, and is placed on a later tick the hero is near and there is room |
| Hero leaves a pack that is still walking home, or hurt | It stays awake, and sleeps once every living member is home in Idle at full health and the hero is still past the sleep radius |
| A pack that lost members sleeps | It keeps its survivors; walking back wakes that many, whole |
| A summoner's pack sleeps with its adds out | The adds go with it, with no corpse and no experience, and do not come back on waking |
| Dummy takes lethal damage | Health clamps at 1; damage numbers still show the full amount |
| Enemy killed while returning | Dies normally, grants experience |
| Spawn point occupied on Return | The enemy stops where it meets the unit standing on its spawn point, and idles there |
| Hero dies with enemies chasing | They turn for home on the next tick, as a leashed enemy does, and none paths toward where the hero will stand up, which on a long map can be a map away. Once it stands up, aggro is read as it always is: a pack home within its aggro radius of the hero takes it up again |
| Enemy blocked by a pack in a corridor | Pushes, waits, re-paths on its budget; never walks through |

## Deferred

- **Loot and drops.** Enemies grant experience only.
- **Flanking behaviour**, and kiting for the archer, which holds at range; the roster's kiters are the hexer and the skirmisher.
- **Formations, patrols, and scripted encounters.** Packs stand where spawned.
- **Bosses with phases** or scripted mechanics. A boss is numbers plus abilities.
- **Enemy affixes** — an elite is a multiplier and one extra ability, not a random modifier set.

---

## Related documentation

- [Status effects](./status-effects.md) — what enemy abilities do to the hero
- [Spells and attack](./spells-and-attack.md) — what kills them
- [Hero](./hero.md) — where the experience goes
- [Movement, collision, and pathing](../../architecture/movement-collision-pathing.md) — how chasing and pushing are built
- [Adding an enemy](../../workflows/adding-an-enemy.md) — the runbook for a new archetype
