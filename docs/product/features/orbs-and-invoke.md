# Orbs and Invoke

> **Entry point:** [Features](./README.md)

## Overview

The hero's kit in three parts: a buffer of three orb instances filled by Q, W, and E; the Invoke composer on R that turns the buffer into a prepared spell; and two slots, D and F, that hold prepared spells until they are thrown. Composing and throwing are different keys, and that gap is the skill ceiling of the game.

The [mechanics spec](../specs/character-movement-and-mechanics.md) sections 9 to 12 own the contract, the numbers, and the acceptance traces. This page is the player's view of the same rules.

## The orb buffer

Q adds a Quartz instance, W a Whorl instance, E an Ember instance. Each press appends one instance to a buffer that holds three. When a fourth arrives, the oldest leaves. Holding a key adds one instance, not three.

The buffer is shown twice: as three orbs floating around the hero and as three squares on the HUD, oldest on the left, newest on the right. Every instance applies its passive while it is held ([Hero](./hero.md#orb-passives)), so filling WWW is visibly faster than filling QQQ.

Orb presses cost no mana, have no cooldown, have no cast time, and never force the hero to turn. They interrupt a channel and nothing else. The hero keeps walking.

## Invoke

R reads the three instances as a multiset — how many of each, ignoring order — and maps that to one of ten spells. QQW, QWQ, and WQQ are one spell.

On a **first invoke**, when the spell is not already in a slot: R spends 7 mana, starts the Invoke cooldown, and writes the spell into slot D. The cooldown is 7.0 seconds minus 0.3 seconds per total orb level, so a hero with all three orbs at level 7 invokes every 0.7 seconds. Whorl's percentage reduction applies on top, like any other clock. Both numbers are tunables in `src/content/tuning.ts`; the table is in spec section 10.3.

On a **re-invoke**, when the spell is already in D or F: nothing is spent and no cooldown starts. If it is in F, D and F swap so the spell is on the primary key. If it is already in D, nothing changes. The player can promote F to D as fast as they can press R.

R never casts the spell. It has no cast time and does not stop a move.

## Slots D and F

Two slots. D is the newest spell, F the one before it. Both start empty and show empty sockets until the first Invoke.

A first invoke of spell X: if D is empty, X goes into D. If D holds Y and F is empty, Y moves to F and X goes into D. If both are full, F's spell is evicted, Y moves to F, and X goes into D.

Order is set by Invoke, not by use. Throwing D fifty times never promotes F. Only a new Invoke or a swap changes what is where.

## Cooldowns

Every spell has its own cooldown, and it starts when the spell is thrown, after its cast point — not when it is invoked. Putting a spell into a slot does not start its clock. D and F are independent: throwing D does not touch F.

An evicted spell keeps its cooldown. If it is invoked again while the clock is still running, it comes back with the time remaining, not reset. Whorl's cooldown reduction is applied when a clock starts and does not change a clock already running. Spec section 12 has the formula.

## How it behaves

The spec's acceptance traces, in prose. Each is a test.

| Do this | Result |
| --- | --- |
| Press Q, Q, Q | Buffer QQQ. A fourth Q evicts the oldest Q and adds a Q: still QQQ |
| Press Q, Q, W, E | Buffer QWE. The first Q was evicted by the E |
| Press an orb while moving | The move continues |
| Press an orb while channelling | The channel is aborted |
| Hold Q | One instance. Only the key-down counts |
| Buffer QWE, press R | D holds the QWE spell, F is empty |
| Then buffer QQQ, press R | D holds the QQQ spell, F holds the QWE spell |
| Then buffer WWW, press R | D holds WWW, F holds QQQ, and QWE is evicted |
| Buffer QQQ, press R while D already holds QQQ | No mana, no cooldown, slots unchanged |
| Buffer QQQ, press R while F holds QQQ and D holds WWW | D and F swap. No mana, no cooldown |
| Evict a spell mid-cooldown, invoke it again later | It returns with the remaining cooldown |
| Press D | Only D's spell is thrown; F's clock is untouched |
| Press D on a point-target spell, move the cursor, press Esc | No mana, no cooldown, nothing thrown |
| Press D on a point-target spell, left click | The cast starts only after the hero faces the point |

## States and edge cases

| State | What happens |
| --- | --- |
| Q, W, or E before that orb has a level | Refused. An instance carries its orb's passive at the orb's level, and an orb with no level has none. The starting skill point buys the first orb's level |
| R before three instances are out | Refused. The buffer fills on the first three presses of a session and never empties after, so this only happens at the very start and after nothing else |
| R with the buffer full but too little mana | Refused with a HUD flash; the buffer is untouched |
| R while the Invoke cooldown is running | Refused with a cooldown flash, unless it would be a swap, which is always free |
| R while silenced | Refused. Silence blocks Q, W, E, R, D, and F ([Status effects](./status-effects.md)) |
| R during a move | The move continues |
| D on an empty slot | Nothing is thrown; the square blinks white |
| D on a spell whose cooldown is running | Refused with a cooldown flash |
| The hero dies | The buffer and both slots survive; all cooldowns, including hidden ones, clear on respawn |
| Orb level raised while instances are out | Their passives update on the same tick |

## Deferred

- **A third slot.** The kit has two, always.
- **Levelling Invoke** and its talents. Invoke's cooldown scales with total orb levels and Whorl's percentage, and nothing else.
- **A "last invoked" indicator** beyond D and F being ordered. The two slots are the memory.
- **Sound cues** for compose and throw. Nothing has audio yet.

---

## Related documentation

- [Character movement and mechanics](../specs/character-movement-and-mechanics.md) — sections 9 to 12: the buffer contract, the composer, the slot algorithm, the cooldown pipeline
- [Spells and attack](./spells-and-attack.md) — what each multiset becomes
- [Hero](./hero.md) — the passives each instance carries
- [HUD](./hud.md) — where the buffer, the slots, and the cooldown sweeps are shown
- [Casting a spell](../../architecture/casting-a-spell-flow.md) — the same sequence traced through the simulation
