# Hero

> **Entry point:** [Features](./README.md)

## Overview

There is one hero: Skein, a ranged caster. This page covers the hero as a unit — attributes, resources, levels, the passives each orb instance carries, and what happens on death. How the hero is controlled is in [Controls and orders](./controls-and-orders.md); the kit is in [Orbs and Invoke](./orbs-and-invoke.md) and [Spells and attack](./spells-and-attack.md).

Every number on this page is a starting value. The files that own them are `src/content/hero.ts` for levels and `src/content/forms/skein.def.ts` for the body, attributes, and their conversions, and they win when this page disagrees.

## Attributes

The hero has three attributes. Each drives two derived values, and every derived value is a modifier pipeline: base, plus flat sources, times percentage sources, so that orb passives now and items later are the same kind of thing.

| Attribute | Drives | How |
| --- | --- | --- |
| Strength | Health, health regeneration | Each point adds maximum health and a little regeneration per second |
| Agility | Armour, attack speed | Each point adds a fraction of armour and a fraction of attack speed |
| Intelligence | Mana, mana regeneration | Each point adds maximum mana and a little regeneration per second |

Starting values, level 1: roughly 120 base health plus strength, 75 base mana plus intelligence, 25% base magic resistance, and 0 base armour plus what agility gives. The per-point conversions and per-level gains follow the source game and live in `src/content/forms/skein.def.ts`.

## Resources

- **Health.** Reaching zero kills the hero. Regenerates every tick from strength and any Quartz instances out.
- **Mana.** Spent by Invoke and by throwing a prepared spell. Orb presses cost nothing. A cast with insufficient mana is refused at key-down, with a HUD flash, and nothing is spent. Regenerates every tick from intelligence.

Both are shown as bars with numbers on the [HUD](./hud.md), and both can be pushed around from the [developer panel](./developer-panel.md) for testing.

## Levels and experience

Levels run 1 to 30 on the experience table in `src/content/hero.ts`. Experience comes from enemy deaths; each archetype carries its reward in its definition ([Enemies](./enemies.md)). The hero starts at level 1 with one skill point and every orb at level 0; an orb with no level cannot be pressed. Reaching a level grants the per-level attribute gains and **one skill point**, spent on Quartz, Whorl, or Ember. Each orb caps at level 7. Skill points are spent by clicking the orb's square on the HUD and can also be granted or assigned from the developer panel.

Orb level and orb instance are different things: a level-7 Whorl with one instance out is not a level-1 Whorl with three instances out. Level scales the size of each instance's passive; instance count is how many copies are applied ([mechanics spec](../specs/character-movement-and-mechanics.md) section 9.4).

## Orb passives

Every orb instance the hero holds applies its passive while it is held. Swapping an instance out removes its passive on the same tick.

| Orb | Each instance grants | Scales with |
| --- | --- | --- |
| Quartz | Health regeneration | Quartz level |
| Whorl | Movement speed, as a percentage, and a percentage off every cooldown that starts while it is held | Whorl level; +0.6% movement speed per instance at level 1, rising 0.6% per level. The cooldown percentage is read when a clock starts and never rewrites a running one |
| Ember | Attack damage | Ember level |

The Whorl movement value is quoted because it is the one the spec insists players must feel: three Whorl out is visibly faster than three Quartz out. Every table lives in the tuning table, `src/content/tuning.ts`, one entry per orb level.

## Body and movement

The hero's body numbers are the spec's and are not repeated here: collision radius 27, bound radius 24, base movement speed 280, turn rate 0.6 radians per 0.03 seconds, action cone 11.5 degrees. [Mechanics spec](../specs/character-movement-and-mechanics.md) sections 3, 6, 7, and 8 own them and their meaning.

## Damage and mitigation

Every hit has one damage type, and the type decides what reduces it.

| Type | Reduced by | Typical source |
| --- | --- | --- |
| Physical | Armour | Every attack, the hero's, a summon's, and an enemy's |
| Magical | Magic resistance | Most spells |
| Pure | Nothing | Rare, deliberate |

The formulas follow the source game and live in `src/domain/combat/`. Armour runs through a curve, so each point is worth less than the one before it and no amount of it reaches immunity; magic resistance is a fraction of one taken off the hit. The curve's constant is a tunable in `src/content/tuning.ts`, and the starting armour and resistance values live in `src/content/forms/skein.def.ts`.

## Death and respawn

When health reaches zero the hero enters a death state at the end of that tick: the order is cleared, the status table is emptied, targeting closes, cooldowns keep counting, health and mana regenerate nothing, and nothing responds to input. After the `respawn_delay` tunable, three seconds by default, the hero respawns at the map's spawn point with full health and mana and every cooldown cleared, including hidden cooldowns on evicted prepared spells. Held orb instances, the prepared spells in D and F, the orb levels, and the level survive death. There is no experience penalty and no drop.

## States and edge cases

| State | What happens |
| --- | --- |
| Level cap reached | Experience stops accumulating; the XP bar shows full and stops |
| Zero mana and R pressed | Invoke is refused at key-down; a HUD flash on the R square; nothing is spent, the orb buffer is untouched |
| Killed during a cast point | The cast is cancelled; no mana spent, no cooldown started, because both happen at the end of the cast point |
| Killed while a projectile is in flight | The projectile still lands; damage credited to the hero for experience |
| Respawn while enemies are aggroed | Enemies keep their aggro and path to the spawn point; the hero gets no grace period. The spawn point is placed so this is survivable on the arena |
| Skill point unspent | Kept until spent; the HUD shows a marker beside the level number |
| Regeneration while at full | Nothing; values clamp at maximum |

## Deferred

- **Forms.** The hero may later swap between forms mid-fight, each with its own body, kit, health, mana, cooldowns, and armory, sharing level, experience, and item slots. The [overview](../overview.md) states the intent; the architecture already treats the hero as one unit pointing at an active form.
- **Talents and kit upgrades.** Out of scope; the kit is the base kit.
- **Items as modifier sources.** The stat pipeline is built for them, but no item exists.
- **Real death rules** — experience loss, corpse runs, difficulty penalties. Respawn is free until the dungeon loop exists.
- **Stat growth beyond level 30**, and any prestige or rebirth.
- **Health and mana potions.** The developer panel is the only heal.

---

## Related documentation

- [Orbs and Invoke](./orbs-and-invoke.md) — where skill points and orb instances go to work
- [Spells and attack](./spells-and-attack.md) — what the hero does with mana
- [Status effects](./status-effects.md) — what can be done to the hero
- [Character movement and mechanics](../specs/character-movement-and-mechanics.md) — the body and movement numbers
- [Ability pipeline](../../architecture/ability-pipeline.md) — how the modifier-driven stats and casts are built
