# Enemies

> **Entry point:** [Features](./README.md)

## Overview

Enemies are the units the hero fights. Each enemy is an instance of an archetype — a definition holding its numbers, its behaviour, its abilities, and its tier. Enemies come in packs, aggro together, chase, attack, and leash back. When they die they give experience.

Every archetype owns a definition file under `src/content/enemies/`, one per archetype. Numbers live there, not here; the [enemy catalogue](../specs/enemy-catalogue.md) holds each one's starting values and the reasoning behind them.

## Archetypes

The first set is small and covers the four things a spell has to deal with: something slow that hits hard, something fast, something at range, and something that does not die quickly.

| Archetype | Role | Shape |
| --- | --- | --- |
| Melee grunt | Slow, medium health, walks up and hits | Square |
| Fast runner | Low health, fast, reaches the hero before the grunt does | Small square |
| Ranged archer | Stays at range, fires a projectile | Square with a dot |
| Tank | High health, high armour, slow | Large square |
| Training dummy | Never moves, never attacks, never dies. Takes and shows damage | Square with an outline |

Each archetype has a colour, its tint in the [enemy catalogue](../specs/enemy-catalogue.md#3-the-archetypes), and elites take a thicker outline.

## What a definition holds

Every archetype carries the same fields. A field an archetype does not use is set to its neutral value, not left out.

- Health, health regeneration, armour, magic resistance
- Mana, mana regeneration, zero for an archetype that has none, so a spell that burns mana finds a number
- Movement speed, turn rate, collision radius
- An attack: damage, range, acquire radius, attack point, backswing, base attack time, and the projectile it fires, or none for a melee attack, which lands at the end of its attack point
- Aggro radius, leash radius
- Experience reward
- Tier: normal, elite, or boss
- An ability list, by name, each with the condition it is chosen under — always, below a fraction of the enemy's health, or with the hero within a distance — which may be empty
- A list of the statuses it carries for its life, by name, which may be empty: at most two, none of them a disable
- A behaviour, by name

## Behaviour

Every enemy runs the same state machine. The behaviour name in its definition picks how it chooses a target and where it wants to stand; the states are shared.

| State | What the enemy does | Leaves when |
| --- | --- | --- |
| Idle | Stands at its spawn point, or wanders a few units around it | The hero enters its aggro radius, or it takes damage |
| Aggro | Alerts its pack, and turns toward the hero as it sets off | Immediately, into Chase |
| Chase | Paths toward the hero, re-pathing on a budget | In attack range, into Attack; or past its leash radius, or the hero untargetable or hidden from aggro, into Return |
| Attack | Turns to face, runs its attack point, hits, repeats | Target out of range, or the hero dead, into Chase; or target lost, hidden, or past its leash radius, into Return |
| Return | Paths back to its spawn point, ignoring the hero, regenerating | Arrives, into Idle |
| Dead | Gives experience, clears statuses, releases its slot after a short delay | Never |

**Aggro is shared across a pack.** One enemy seeing or being hit by the hero puts its whole pack into Aggro on the same tick. A pack is whatever was spawned together.

**Leash** is measured from each enemy's own spawn point. An enemy past its leash radius returns regardless of what the rest of its pack does.

Enemies path with the same grid A* the hero uses and push each other apart rather than steering around one another, so a pack in a corridor forms a queue, not a line.

## Tiers

| Tier | Health | Abilities | Look |
| --- | --- | --- | --- |
| Normal | The definition's | The definition's list | Plain square |
| Elite | 3 times the definition's | One extra ability | Thicker outline |
| Boss | 10 times the definition's | Several abilities | Largest square, thickest outline |

A tier multiplies; it does not change the rules. A boss is stunned by Hoarfrost like a grunt is.

## Enemy abilities

Enemy abilities go through the same cast pipeline as the hero's spells: a targeting kind, a cast point, a cooldown, and effects. The set is chosen to exercise every status the hero can suffer.

Stun (a bash on hit), slow (a frost attack), silence (a caster's curse), root (a net), a ranged projectile, an area slam around the enemy, summoning adds, a self-heal, and a charge or leap that closes distance. Each is a definition an archetype references by name; the [ability pipeline](../../architecture/ability-pipeline.md) explains how.

The bash and the frost attack are not cast. Each is a status the archetype carries from the moment it spawns until it dies, whose damage-dealt hook stuns or slows whatever its swing or shot lands on, at most once per the hook's internal cooldown. Its icon shows above the enemy for as long as it lives, so the player can tell a basher from a plain grunt. The curse is cast at the hero and silences it once its cast point ends. The net is thrown from the enemy at the hero, flies to it, and roots it where it lands.

The arrow is loosed from the enemy at the hero, homes on it, and deals physical damage where it lands, so armour takes its share. The slam strikes a circle around the enemy, damaging every unit on the hero's side inside and pushing each one straight away from the enemy; a wall stops the push. It is cast only once the hero is inside the circle, and its long cast point is the tell. The self-heal is cast on the enemy itself only once its health is below a fraction of its maximum, and restores health for a few seconds, never past the maximum; a stun in its cast point cancels it. It is the only way an enemy regains health in a fight, since its regeneration runs only while it walks home.

An enemy chooses an ability when it is off cooldown, in range, and the enemy's state is Attack or Chase. It takes the first ability its definition lists whose condition holds, that is off cooldown, reaches the hero, and is aimed at the hero, at the ground the hero stands on, or at itself; an ability aimed along a line is never chosen. It chooses nothing while silenced or in its own attack point, and never interrupts its own cast point; a stun during the cast point cancels the cast, spends nothing, and starts no clock. After the cast it goes back to attacking.

## Experience

An enemy that dies grants its definition's experience reward to the hero, whoever landed the last hit — a summon's kill counts. A pack does not share or pool experience. The dummy grants none.

## Dormant packs

On a map larger than the arena, packs far from the hero do not exist as units. They sit as spawn data until the hero comes within an activation radius, then spawn in Idle. This keeps the live enemy count bounded by what is near the hero, not by the map. The arena holds no packs of its own; every pack on it is spawned from the panel, live from that tick.

A pack spawns once per map load: one the hero kills does not come back when the hero walks near its point again. Resetting the map puts every pack back as it was at load.

## States and edge cases

| State | What happens |
| --- | --- |
| Leashed mid-attack | The attack point is cancelled and the enemy returns; a projectile already fired still lands |
| Pack partially in aggro radius | The whole pack aggroes on the first member that sees or is hit |
| Hero uses Wane | Aggro drops; enemies return unless already adjacent and attacking |
| Summon owner dies | The summon expires on the same tick |
| Enemy summons adds when the live cap is reached | The ability is refused this cast; cooldown is not spent |
| Dummy takes lethal damage | Health clamps at 1; damage numbers still show the full amount |
| Enemy killed while returning | Dies normally, grants experience |
| Spawn point occupied on Return | The enemy stops at the nearest free spot and idles there |
| Hero dies with enemies chasing | They keep chasing to the spawn point; nothing resets them |
| Enemy blocked by a pack in a corridor | Pushes, waits, re-paths on its budget; never walks through |

## Deferred

- **Loot and drops.** Enemies grant experience only.
- **Kiting and flanking behaviour** for the archer beyond standing at range.
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
