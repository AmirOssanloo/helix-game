# Status effects

> **Entry point:** [Features](./README.md)

## Overview

A status is a lasting condition on a unit: it slows, stuns, burns, silences, or empowers for a duration. Spells put statuses on enemies; enemy abilities put them on the hero. The same rules apply to both.

Each status kind has a definition file under `src/content/statuses/` holding its duration rules and numbers. This page says what each one does and what it blocks.

## The statuses

| Status | Effect on the unit | Blocks |
| --- | --- | --- |
| Stun | Frozen in place, order cleared, cast cancelled | Everything: movement, turning, attacks, Q W E R D F |
| Silence | Cannot use abilities | Q, W, E, R, D, F. Movement and attacks continue |
| Root | Cannot move | Movement and turning toward a path. Attacks and spells in range continue |
| Disarm | Cannot attack | Auto-attacks and attack-move acquisition. Spells continue |
| Slow | Movement speed reduced by a percentage | Nothing; stacks into the speed formula |
| Damage over time | Loses health every tick for the duration | Nothing |
| Knockback | Displaced along a direction over a few ticks | Movement while displaced; the order is kept |
| Lift | Raised into the air, stunned and untargetable | Everything, as stun; and the unit cannot be hit |

Stun and lift are **disables**. Silence, root, and disarm are disables of one thing each. Slow and damage over time are not disables.

## One status table per unit

Every unit holds one table of active statuses. When a status is applied to a unit that already has it, the definition's stack rule decides:

- **Refresh** — the duration restarts at the new value; the effect does not grow. Most disables.
- **Stack** — a new instance is added; the effects combine. Damage over time from different sources.
- **Ignore** — the existing one wins; the new application is dropped.

Statuses expire on their own tick. A unit's death clears its table.

## What the hero sees

Every status on a unit shows as an icon above it ([HUD](./hud.md)). A disable on the hero also greys the keys it blocks on the ability bar, so silence greys six squares and disarm greys none.

## The disable matrix

Which status blocks which key, order, and cast state is written as one table: every status against Q, W, E, R, D, F, move, attack-target, attack-move, stop, a cast point in progress, and a targeting cursor open. Each cell is a test. The matrix lives with the status definitions under `src/content/statuses/` and the rules that read it live in the hero's order validation. Until it is written, the table above is the contract.

## States and edge cases

| State | What happens |
| --- | --- |
| Stunned during a cast point | The cast is cancelled at no cost. Mana and cooldown are spent at the end of the cast point, so nothing was spent |
| Stunned after the cast point | The spell was committed; it resolves normally |
| Silenced while the targeting cursor is open | The cursor closes at no cost |
| Silenced with a move running | The move continues; silence blocks abilities only |
| Rooted while lifted by Updraft | Lift wins; the unit drops where the updraft leaves it, and root keeps counting |
| Rooted during a move | The move is cleared; the hero stands until root expires and does not resume |
| Knocked back into an obstacle | The displacement stops at the obstacle edge |
| Slowed below the minimum speed | Speed clamps at the spec's minimum of 100 |
| Two stuns at once | Refresh: the longer remaining duration wins |
| Status on a dying unit | Cleared with the death |
| Status on a unit that becomes untargetable | Existing statuses keep counting; new ones cannot land |

## Deferred

- **Dispels.** Nothing removes a status early.
- **Status resistance** and duration reduction as a stat.
- **Immunity** — spell immunity, stun immunity for bosses. A boss is a lot of health, not an exception to the rules.
- **Status icons with timers.** Icons show presence; durations show later.

---

## Related documentation

- [Spells and attack](./spells-and-attack.md) — the spells that apply these
- [Enemies](./enemies.md) — the enemy abilities that apply them to the hero
- [Controls and orders](./controls-and-orders.md) — the keys and orders the disables block
- [Hero](./hero.md) — the speed and health values slows and damage over time act on
- [Ability pipeline](../../architecture/ability-pipeline.md) — how a status is one of the effect primitives
