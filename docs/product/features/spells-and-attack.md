# Spells and attack

> **Entry point:** [Features](./README.md)

## Overview

The ten spells the hero can invoke, the auto-attack, and the three damage types. Every spell has a targeting kind, cast point, cooldown, and mana cost, all scaling with orb levels.

Numbers are not on this page. Each spell owns a definition file under `src/content/spells/`, one per spell, and that file holds the tables by orb level. This page says what each spell is and how it behaves at the edges.

## The ten spells

| Orbs | Spell | Targeting | What it does |
| --- | --- | --- | --- |
| QQQ | Hoarfrost | Unit | A status on one enemy: every hit it takes for the duration also stuns it briefly and deals bonus damage. Scales with Quartz |
| QQW | Wane | None, self | The hero turns invisible to enemy aggro for the duration and is slowed; enemies near the hero are slowed. Scales with Quartz and Whorl |
| QQE | Glacier | Point, placed | A zone: a line of wall segments placed in front of the hero, facing the cast direction. Enemies inside the wall's aura are heavily slowed and take damage over time. Scales with Quartz and Ember |
| WWW | Siphon | Point, delayed | A zone that charges for a moment, then burns mana from every enemy in the area and deals damage for mana burned. Scales with Whorl |
| WWQ | Updraft | Point, line | A zone that travels in a line, lifting every enemy it touches into the air for a duration, then dropping them with damage. Lifted units are stunned and untargetable. Scales with Whorl and Quartz |
| WWE | Quicken | None, self | A self buff: bonus attack speed and attack damage for the duration. Scales with Whorl and Ember |
| EEE | Zenith | Point, delayed | A ground strike: after a delay, pure damage in a small area, split among everything inside. Scales with Ember |
| EEQ | Emberling | None, self | A summon: one player-owned unit next to the hero that auto-attacks nearby enemies for its lifetime and cannot be ordered. Scales with Ember and Quartz |
| EEW | Bolide | Point, line | A zone: a meteor lands after a delay and rolls in a line, damaging what it passes and leaving a burn status on them. Scales with Ember and Whorl |
| QWE | Clarion | Point, cone | A wave in a cone: damage, knockback, and a disarm status on everything hit. Scales with all three |

Effect words — status, zone, summon, buff — are the [vocabulary's](../vocabulary.md). A zone has rules and lives in the world; a status lives on a unit.

## Adaptations

Where a spell's role depends on something Helix does not have, it keeps the role and loses the dependency.

- **Wane** hides the hero from enemy aggro and drops existing aggro, since there is no fog of war or team vision to hide from. Enemies already touching the hero keep attacking.
- **Quicken** targets self only. There is no ally to buff.
- **Emberling** summons are enemy targets, follow the hero when idle, and expire on their timer. They cannot be selected or ordered.
- **Updraft and Clarion** apply their displacement to enemies only.

No spell damages or displaces the hero or a summon. Friendly fire does not exist.

## Casting

A spell is thrown from slot D or F ([Orbs and Invoke](./orbs-and-invoke.md)). A no-target spell fires on key-down. A targeted spell opens the cursor, showing a range ring and the spell's area, line, or cone preview under the pointer; left click commits, the hero turns to face the point, the cast point runs, and then mana is spent and the cooldown starts. A cast interrupted before the end of its cast point costs nothing.

Every spell has a cast point, and the numbers per spell are in its definition file. The hero cannot move during a cast point and can cancel it with S.

## The auto-attack

A ranged projectile attack. Range 600, acquire radius 800, projectile speed 900, base attack time 1.7 seconds, attack point 0.4 seconds, backswing 0.7 seconds; the hero's attack damage includes the bonus from each Ember instance out. The [mechanics spec](../specs/character-movement-and-mechanics.md) section 3 owns these and `src/content/hero.ts` holds them.

- **Attack-target** (right click an enemy) paths into range, turns to face, fires, and repeats until the target dies or the order changes.
- **Attack-move** (A then left click) walks to the point and attacks any enemy acquired within 800 units on the way, then resumes the walk when the target is lost, without backtracking.
- **Backswing** can be cancelled by a move, a stop, or a cast, so attack-orb-attack weaving is possible.

Projectiles are homing: once fired, an attack projectile follows its target and lands unless the target dies first.

## Damage types

| Type | Reduced by | Used by |
| --- | --- | --- |
| Physical | Armour | Auto-attacks, Emberling attacks |
| Magical | Magic resistance | Hoarfrost, Glacier, Siphon, Updraft, Bolide, Clarion |
| Pure | Nothing | Zenith |

The formulas are in [Hero](./hero.md#damage-and-mitigation). Floating damage numbers are white for now and take a colour per type later ([HUD](./hud.md)).

## States and edge cases

| State | What happens |
| --- | --- |
| Target dies during the cast point of a unit-target spell | The cast is cancelled at no cost |
| Target leaves cast range during the cast point | The cast completes; range is checked at commit, not at the end of the cast point |
| Target out of range at commit | The hero paths toward the target and casts on arrival, like an attack. S cancels |
| Cast while rooted | Allowed for spells in range. Out-of-range targets are refused, since the hero cannot walk |
| Cast while disarmed | Allowed. Disarm blocks attacks, not spells |
| Two spells thrown in the same tick | Applied in key order; the second waits for the first cast point, then runs if still legal |
| Zenith or Siphon delay with no enemy left | The spell resolves on empty ground; mana and cooldown were already spent |
| Updraft lifts a unit with Hoarfrost | Hoarfrost's duration keeps counting while lifted |
| Emberling out when the hero dies | The summon expires immediately |
| Attack-target on a unit that becomes invisible | The order drops to idle |
| Insufficient mana at key-down | Refused with a HUD flash; the targeting cursor does not open |

## Deferred

- **Kit upgrades and talents.** The kit is the base kit.
- **Ally targeting** for Quicken and Hoarfrost. There are no allies.
- **Spell-lifesteal, spell amplification, and other item-driven multipliers.** The damage pipeline accepts modifier sources; none exist.
- **Enemy summons stealing Emberling aggro.** Summons target enemies only.
- **Named-spell art and sound.** Each spell is a colour and a shape until real art arrives.

---

## Related documentation

- [Orbs and Invoke](./orbs-and-invoke.md) — which multiset becomes which spell, and how throwing works
- [Status effects](./status-effects.md) — the statuses these spells apply
- [Hero](./hero.md) — the attack damage and damage mitigation the numbers pass through
- [Ability pipeline](../../architecture/ability-pipeline.md) — how a definition becomes targeting, cast point, effects, and cooldown
- [Adding a spell](../../workflows/adding-a-spell.md) — the runbook for a new or changed spell
