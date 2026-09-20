# Casting a spell

> **Entry point:** [Architecture](./README.md)
> **See also:** [Ability pipeline](./ability-pipeline.md) · [Commands and events](./commands-and-events.md) · [Orbs and Invoke](../product/features/orbs-and-invoke.md)

How three key presses, an Invoke, a slot key, and a click become damage on the screen. This is the reference flow, so it uses the game's own words — orb, Invoke, slot, tick, event — instead of placeholders. Read it as the worked example of the other pages: commands in, one tick at a time, events out, the screen reacting. It names no file. The numbers are in the [mechanics spec](../product/specs/character-movement-and-mechanics.md).

---

## The shape in one line

**Compose, invoke, throw, land.** Q, Q, W fill the orb buffer. R turns the buffer into a spell in slot D. D opens a cursor; a click throws it. The tick faces, waits, commits, and the effects run. Events tell the screen what happened.

```text
Q Q W ──► three orb commands ──► buffer [Q,Q,W] ──► R ──► Invoke ──► slot D = the QQW spell
    ──► D ──► targeting cursor (screen only) ──► click ──► cast command with a world point
    ──► validate ──► face ──► cast point ──► commit: mana, cooldown, effects ──► damage, status
    ──► events ──► floating number, flash, HUD wedge
```

---

## The steps

1. **The player presses Q.** The input mapper sees a key-down, not a key held, and submits one orb command stamped with the next tick. Q again, then W: three commands, three ticks or one, in press order.
2. **Each tick applies its orb commands.** The validator checks that the hero is not stunned or silenced. The Invoke module appends an instance to the buffer. The buffer holds at most three; these three fit. An orb-added event goes on the ring, and the orb's passive joins the hero's modifier stack.
3. **The player presses R.** One command. The Invoke module reads the buffer as a count of each orb — two Quartz, one Whorl, order ignored — and looks up the spell that recipe names. It is not in a slot, so this is a first invoke: mana is spent, the composer's cooldown starts, and the spell's identity is written into slot D. Whatever was in D moves to F; whatever was in F leaves, keeping its cooldown clock in the hidden map. A spell-invoked event goes on the ring.
4. **The screen reacts.** The sync drains the ring: the HUD's D square shows the spell's glyph, the F square shows the old D, the composer square starts its wedge sweep.
5. **The player presses D.** The spell in D is point-targeted, so nothing is sent. The input mapper opens the targeting cursor and draws the range ring and the area preview from the atlas. The hero keeps walking if it was walking; the simulation does not know the cursor exists.
6. **The player clicks.** The mapper resolves the click to a world point through the camera at that moment, closes the cursor, and submits a cast command naming the spell and the point.
7. **The tick validates.** Not silenced, not stunned, the spell's clock is ready, the mana is there. The command replaces the hero's current order.
8. **The hero faces the point.** Each tick the movement system turns the hero along the shortest arc at its turn rate. Nothing else happens until the bearing is inside the action cone.
9. **The cast point runs.** The hero holds for the spell's cast point, counted in ticks. A stun now cancels it: nothing spent, no clock.
10. **Commit.** On the tick the cast point ends, the pipeline spends the mana, starts the spell's cooldown clock on the hero, and runs the definition's effects in order. Say the first is a damage area: the spatial hash returns the units near the point, the combat rules apply each one's magic resistance, and every unit's health drops. Say the second applies a status: each unit's status table gains an entry, and its stack rule decides whether a unit already carrying it refreshes or ignores. Events go on the ring for each damage and each status.
11. **Backswing.** The hero is busy for the backswing. A move order cancels it; the spell already landed.
12. **Death resolves.** At the end of the tick, one system checks every unit whose health reached zero, emits one death event each, and releases them. Experience goes to the hero.
13. **The screen reacts.** The sync drains the ring: a floating damage number over each hit unit, a fill-tint flash on their views, a status icon above the ones still standing, a released view for the ones that died, the D square's wedge starting its sweep. The HUD bars read the hero's mana from the world view, not from the events.

---

## The moments that catch people

**The fourth orb.** With the buffer holding three, pressing E evicts the oldest — the first Q — and appends E. The buffer is now Q, W, E in age order. The next R names a different spell. Nothing else changes; the spell already in D keeps its identity and its clock.

**Re-invoking a spell that is already out.** The buffer names the spell sitting in F. R swaps D and F, spends no mana, and starts no composer cooldown. If the spell is already in D, nothing happens at all. The player can promote F as fast as they can press R.

**Pressing D while silenced.** The command is submitted; the validator reads the silence flag the status system set earlier in the tick and drops it. The cursor does not open, because the mapper checks the same flag on the world view before opening. A refused-command event tells the HUD to flash the square.

**Escape with the cursor open.** The mapper closes the cursor and submits nothing. No mana, no clock, no order change. The hero keeps whatever order it had.

**A stun during the cast point.** The cast is cancelled at that tick. Mana was not spent, the clock never started, and the spell stays in its slot.

**The click lands off the map.** The mapper clamps to the map bounds before submitting; a point outside walkable ground is still a valid target for a point spell.

---

## What the flow shows

- Every change came through a command, including the three orb presses.
- The cursor never touched the simulation. Opening and cancelling it cost nothing.
- The simulation did the same arithmetic it would do for an enemy's ability, from the validator onward. Only the Invoke module knew this was the hero.
- The screen never decided anything. It read the view for state and the ring for moments.
- The whole sequence is in the input log, and replaying it lands the same damage on the same tick.

---

## Anti-patterns

### Spending on key-down

Charging mana when D opens the cursor, to be refunded on Escape. The refund is the bug. Nothing is spent until the tick that sees the click.

### The HUD summing damage events

A health bar that subtracts each damage event. One overwritten ring entry and the bar lies for the rest of the session. Bars read the view; numbers come from events.

### A cursor that stops the hero

Opening the targeting cursor by issuing a stop order "so the cast is ready". The simulation now knows about a screen state, and the player's walk is cut short by a key they may cancel. The cursor is screen-only.

---

## Quick reference

| Rule | Do |
| --- | --- |
| Orb presses | One command each, on key-down; the buffer holds three and evicts the oldest |
| R with a new recipe | Spend mana, start the composer cooldown, write D, shift D to F, evict F keeping its clock |
| R with a recipe already in F | Swap D and F; no mana, no cooldown |
| R with a recipe already in D | Nothing |
| A targeted slot key | Opens the cursor on screen; sends nothing |
| The click | A cast command with the world point resolved at click time |
| Escape | Closes the cursor; sends nothing |
| Validation | Disable flags, cooldown, mana; a refusal drops the command and emits an event |
| Before the cast point | The hero turns until the bearing is inside the action cone |
| During the cast point | An interrupt cancels; nothing spent, no clock |
| At commit | Mana, cooldown, then effects in definition order |
| Damage | Through the combat rules by damage type; death resolved once at the end of the tick |
| Statuses | Into the target's table under the definition's stack rule |
| The screen | Reads the view for state, drains the ring for moments |
| The log | Holds every command above; replay reproduces the tick |

---

## Related documentation

- [Ability pipeline](./ability-pipeline.md) — the stages this flow walks, stated as rules
- [Commands and events](./commands-and-events.md) — the buffer and the ring the flow passes through
- [Orbs and Invoke](../product/features/orbs-and-invoke.md) — the buffer and the slots from the player's side
- [Character movement and mechanics](../product/specs/character-movement-and-mechanics.md) — the acceptance tests this flow must pass
- [Presentation](./presentation.md) — how the screen reacts at the end
