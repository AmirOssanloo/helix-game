# Status effects

> **Entry point:** [Features](./README.md)

## Overview

A status is a lasting condition on a unit: it slows, stuns, burns, silences, heals, or empowers for a duration. Spells put statuses on enemies, and some on the hero itself; enemy abilities put them on the hero, and the self-heal and the charge on the enemy that casts them. Some archetypes carry a status for their whole life, such as the brute's bash. The same rules apply to all of them.

Each status kind has a definition file under `src/content/statuses/` holding its stack rule and numbers; a spell whose status needs numbers of its own has its own definition of the kind, named in the [spell catalogue](../specs/spell-catalogue.md). The applier gives the duration. This page says what each one does and what it blocks.

## The statuses

| Status | Effect on the unit | Blocks |
| --- | --- | --- |
| Stun | Frozen in place, order cleared, cast cancelled | Everything: movement, turning, attacks, Q W E R D F, and the six active-item keys |
| Silence | Cannot cast: the hero's spells, an enemy's abilities | Q, W, E, R, D, F. Movement, attacks, and the hero's active items continue, so Gyre Sceptre can shed it |
| Root | Cannot move | Movement, attack-move, turning toward a path, and Slipknife's blink. Attacks, spells, and other active items in range continue |
| Disarm | Cannot attack | Attacks and attack-move acquisition. Spells continue |
| Slow | Movement speed reduced by a percentage | Nothing; stacks into the speed formula |
| Damage over time | Loses health every tick for the duration | Nothing |
| Mana burn | Loses mana every tick for the duration; a tick that finds too little mana deals what it could not take as magical damage instead | Nothing |
| Heal over time | Regains health every tick for the duration, never past its maximum | Nothing |
| Knockback | Displaced along a direction at a speed, for as long as the distance takes | Movement while displaced; the order is kept |
| Lift | Raised into the air, stunned and untargetable, with its order put aside until it lands | Everything, as stun; and the unit cannot be hit |
| Self-lift | The hero raised by its own Gyre Sceptre: untargetable and invulnerable, taking no damage and no new hostile status from any source, a zone or an area included, with its order put aside until it lands. On the tick it is lifted it sheds every status an enemy put on it | D, F, orders, and the six active-item keys. Q, W, E, and R still work, so orbs are set and a spell invoked in the air |
| Ethereal | Veilblade's: immune to physical damage, taking 40% more magical damage, and unable to attack | Attacks, as disarm. Spells and active items continue |
| Charge | Carries itself toward its target at speed, until it reaches the target's edge, its distance, or a wall | Movement while carried; the order is kept |
| Damage hook | Each time the unit takes damage, or deals it, runs an effect list at the unit damaged, at most once per the hook's internal cooldown: Hoarfrost on taking, the bash and the frost attack on dealing | Nothing itself; a status the hook applies blocks as that status does |

Stun and lift are **disables**. Silence, root, and disarm are disables of one thing each, and ethereal disarms. Slow, damage over time, mana burn, heal over time, knockback, charge, and a damage hook are not disables. The self-lift is the hero's own and is not a disable.

## Dispel

A **dispel** removes statuses before they end. There is one, and it is the hero's: Gyre Sceptre cast on the hero lifts it and, on that tick, removes every status an enemy applied to it, the disables and the rest alike: silence, root, disarm, slow, damage over time, mana burn, and any status an enemy's damage hook put on it. It removes nothing the hero put on itself, such as Quicken or Wane, and nothing on any other unit. A stun cannot be dispelled this way, because a stunned hero cannot activate an item: a stun is answered before it lands. Nothing else in the game removes a status early.

## Disjoint

A projectile aimed at a unit follows it. It is **disjointed** when its target blinks, by Slipknife, or is lifted, by any lift: it stops following, flies on to where its target stood on that tick, and ends there, hitting nothing and applying nothing. So a net, an arrow, a hook, or a stun bolt in flight at the hero is answered by blinking away or lifting itself before it lands. A projectile aimed at a point, and a zone, are not disjointed; they are dodged by being elsewhere when they land. A melee swing whose target blinks out of its reach during its attack point lands on nothing.

A status an archetype carries is on the unit from the tick it spawns until it dies. An archetype carries at most two, and none of them may be a disable or anything else that raises a flag, since one held until death would leave a unit that never acts.

## One status table per unit

Every unit holds one table of active statuses. When a status is applied to a unit that already has it, the definition's stack rule decides:

- **Refresh** — the one entry keeps whichever duration has longer left, and takes the new applier's numbers; the effect does not grow. Every status the ignore rule below does not name.
- **Stack** — the one entry gains a stack, and its effect is multiplied by its stacks. No status uses it: every damage over time refreshes.
- **Ignore** — the existing one wins; the new application is dropped. Lift, knockback, charge, and the carried bash and frost attack.

A unit's table holds eight statuses; an application past that is refused. Statuses expire on their own tick. A unit's death clears its table. A hook's internal cooldown belongs to the entry, so a refresh never hands the hook back early.

## What the hero sees

Every status on a unit shows as an icon above it ([HUD](./hud.md)), one glyph per status. A disable on the hero also greys the keys it blocks on the ability bar, so silence greys six squares, stun greys six, and disarm greys none.

## The disable matrix

Which status blocks which key, order, and cast state is one table with a cell per pair: every status against Q, W, E, R, D, F, move, attack-target, attack-move, stop, a cast point in progress, a targeting cursor open, and an attack-move cursor open. The [disable matrix](../specs/disable-matrix.md) fills in every cell and says why where the answer is not obvious; where it and the table above disagree, the matrix wins. The matrix is data in `src/content/statuses/disable-matrix.ts`, and each cell is a test: the validator refuses by it, the status pass ends a running order or cast by it, and the HUD greys and the mapper closes a cursor by it.

## States and edge cases

| State | What happens |
| --- | --- |
| Stunned during a cast point | The cast is cancelled at no cost. Mana and cooldown are spent at the end of the cast point, so nothing was spent |
| Stunned after the cast point | The spell was committed; it resolves normally |
| Silenced or stunned while the targeting cursor is open | The cursor closes at no cost. An attack-move cursor closes on a stun and survives a silence |
| Silenced with a move running | The move continues; silence blocks abilities only |
| Stunned or silenced with a skill point unspent | The point can still be spent from the HUD. A level is not an action the unit takes |
| Rooted while lifted by Updraft | Lift wins; the unit comes down on the spot it was lifted from, and root keeps counting |
| Lifted with a move running | The move is put aside, not cleared: the unit takes it up again where it lands and walks there from the drop |
| Rooted during a move | The move is cleared; the hero stands until root expires and does not resume |
| Knocked back into an obstacle | The displacement stops at the obstacle edge |
| Knocked back while lifted, or lifted while knocked back | Lift wins: the unit moves nowhere in the air and comes down on the spot it was lifted from; the rest of the push is spent in the air |
| A unit walks into a lifted unit | The lifted unit is not moved; the walker is pushed round it |
| Pushed into another unit | Both are pushed apart by the collision rule: the hero takes its push share of the overlap and the other unit the rest, and of two units that are not the hero, the one nearer the hero in a crowd pressed against it takes the same share and the other the rest, and otherwise each half; the push itself carries the hero whatever the share |
| Two pushes in the same tick | The first one applied takes hold; the second is ignored |
| Slowed below the minimum speed | Speed clamps at the spec's minimum of 100 |
| Two stuns at once | Refresh: the longer remaining duration wins |
| Status on a dying unit | Cleared with the death |
| Status on a unit that becomes untargetable | Existing statuses keep counting; new ones cannot land. The hero's self-lift is the exception: it sheds every status an enemy applied as it lifts |
| Mana burn on a unit with no mana | Every tick of it is magical damage, reduced by magic resistance |
| Ethereal on a unit an attack projectile is flying at | The projectile lands and deals nothing; a physical hit on an ethereal unit is zero |
| Hero self-lifted with enemies attacking | They neither attack nor cast at it; each stands where it is, facing it, and takes it up again the tick it lands ([enemies](./enemies.md#states-and-edge-cases)) |
| Damage dealt by a damage hook | Runs no hooks, so a hook never triggers itself or another |

## Deferred

- **A dispel on anything but the hero's self-lift**, and a dispel of the hero's own statuses.
- **Status resistance** and duration reduction as a stat.
- **Immunity** — spell immunity, stun immunity for bosses. A boss is a lot of health, not an exception to the rules. The three exceptions are scoped and named: the hero's self-lift is invulnerable, ethereal is immune to physical damage, and a magic resistance of 1 takes all of a magical hit, which is a number and not a rule.
- **The descent's statuses** — fear, mute, a tether, and the rest [the descent](../specs/the-descent.md#31-the-sixteen-families-below-the-long-road) names — each written here, with its disable-matrix row, when its family is.
- **Status icons with timers.** Icons show presence; durations show later.

---

## Related documentation

- [Disable matrix](../specs/disable-matrix.md) — every status against every key, order, and cast state, cell by cell
- [Spells and attack](./spells-and-attack.md) — the spells that apply these
- [Enemies](./enemies.md) — the enemy abilities that apply them to the hero
- [Hero](./hero.md) — the speed and health values slows and damage over time act on
- [Ability pipeline](../../architecture/ability-pipeline.md) — how a status is one of the effect primitives
