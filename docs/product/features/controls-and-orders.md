# Controls and orders

> **Entry point:** [Features](./README.md)

## Overview

How the player drives the hero: the pointer issues spatial orders, the left hand issues ability keys, and the hero holds exactly one order at a time. This page is the player-facing summary. The [mechanics spec](../specs/character-movement-and-mechanics.md) sections 4, 5, 7, and 14 own the state machine, the turn-rate numbers, and the input sampling rules, and it wins when the two disagree.

The scheme is the click-to-move action-RPG standard, with normal cast only and four common orders deliberately removed.

## The pointer

| Input | Where | What happens |
| --- | --- | --- |
| Right click | Walkable ground | Replaces the current order with a move to that point. No auto-attack on the way |
| Right click | Enemy | Replaces the current order with attack-target |
| Right click | Summon or neutral | Nothing. No follow order starts |
| Left click | World, no targeting cursor open | Selects. Never issues a move |
| Left click | Targeting cursor open | Commits the target and starts the cast |
| Left click | An orb square on the bottom bar, with a skill point unspent | Spends the point on that orb ([HUD](./hud.md)) |
| Any click | The bottom bar | Belongs to the HUD and never reaches the world: a right click there is not a move |
| Scroll wheel | Anywhere | Nothing. The view has one scale and no zoom |

A click resolves against the world at the moment of the click, so a camera move during the same tick cannot retarget it.

## The keys

| Key | Action | What it means for Skein |
| --- | --- | --- |
| Q | Ability 1 | Add one Quartz instance, instantly, no target |
| W | Ability 2 | Add one Whorl instance |
| E | Ability 3 | Add one Ember instance |
| R | Invoke | Turn the current three instances into a prepared spell in slot D |
| D | Slot D | Throw the prepared spell in D. No-target spells fire on key-down; targeted spells open the cursor |
| F | Slot F | Same, for slot F |
| A then left click | Attack-move | Move to the point, attacking any enemy acquired on the way |
| S | Stop | Clear the order, close the cursor, cancel a cast whose cast point has not finished |
| Esc | Cancel targeting | Close the cursor. A running move continues |

Q, W, E, and R fire on key-down and never repeat while held. Several keys landing in the same tick apply in the order they were pressed, with Q W E R D F breaking ties.

## One order at a time

The hero holds one current order: move, attack-target, attack-move, or none. A new order replaces the old one at the end of the tick; the hero never finishes the old path first. There is no queue.

Q, W, E, and R are not orders. They execute on the current tick without replacing a move or attack, so the player weaves orbs while walking. They do interrupt a channel.

## Turning first

The hero faces before it acts. A move, an attack, or a targeted spell starts only when the target bearing is within 11.5 degrees of the current facing; otherwise the hero stands and turns, then acts. A full about-face costs about 0.16 seconds. Orb presses and Invoke never force a turn. The numbers and the ramp are in spec section 7.

## Normal cast

Every targeted spell takes two steps: press the key, then left click. Pressing D opens a targeting cursor with a range ring and an area preview, or for Glacier the ring alone until its press is dragged; nothing is spent yet. Left click commits, the hero turns to face the point, the cast point runs, and then mana is spent and the cooldown starts. Esc or S before the click closes the cursor at no cost.

There is no quick-cast. Hovering an enemy and tapping D never fires a targeted spell.

There is no global cooldown. Q, W, E, R, D, and F can be processed on consecutive ticks, limited only by each ability's own cooldown, mana, and disables.

## Deliberately absent

Four common orders are removed on purpose, and the spec says so in section 5.4 so they cannot be re-imported by habit.

- **Quick-cast**, including quick-cast on key-up and double-tap self-cast
- **Shift-queue** and any other order queue
- **Follow** — right-clicking a friendly unit does nothing
- **Hold position** — Stop is the only way to stand still, and it does not suppress acquiring

## A build fails if

Copied from spec section 15, because it is the shortest test of whether the controls are right.

- The unit translates while its back is still more than 11.5° off the move bearing
- A 180° order completes in one rendered frame
- Right click on empty ground auto-attacks something
- Right click on an ally starts a follow leash
- Shift plus click creates a waypoint queue
- A targeted D or F spell fires on key-down without a confirming left click
- Q, W, or E requires a target click
- A fourth orb press does not evict the oldest instance
- QQW and WQQ compile different prepared identities
- A third prepared spell appears, or D and F share one cooldown
- Throwing a spell is the same key as composing it
- Collision, bound, and selection radii are a single number
- Turn speed scales with the monitor refresh rate

## States and edge cases

| State | What happens |
| --- | --- |
| Order issued while stunned | Refused; the hero keeps whatever it was doing when stunned. Nothing is queued for after |
| Skill point spent while stunned or silenced | Allowed. A level is not an action of the hero, so no disable refuses it |
| Right click while the targeting cursor is open | The click is a move order; the cursor closes at no cost |
| Right click while the button is held on a spell aimed by press and drag | The cursor closes at no cost, and nothing is ordered: no cast and no move |
| The window loses focus while the button is held on a spell aimed by press and drag | The cursor closes at no cost |
| Esc with a move running | The cursor closes; the move continues |
| D or F pressed on a targeted spell that is on cooldown, unaffordable, or blocked by a disable | The cursor does not open and nothing is sent; the square flashes with the reason |
| Q, W, E, R, D, or F pressed while the targeting cursor is open | The cursor closes first, then the key applies as it would with no cursor |
| Left click on empty ground with a unit-targeted cursor open | Nothing. The cursor stays open until a unit is clicked, or Esc or S closes it |
| Left click on a unit with a point-targeted cursor open | The cast aims at the ground under the unit; the unit itself is not the target |
| S with a move running | The move stops, the cursor closes, and yaw freezes where it is |
| Left click during a cast point | Ignored; the cast is already committed to its target |
| S during a cast point | The cast is cancelled at no cost. After the cast point, S cannot take it back |
| Move, attack, or targeted spell issued during an attack point or a cast point | The point is cancelled and the new order starts on the same tick. Nothing was spent and no clock started, because both happen at the end of the point. Nothing is queued |
| Move or attack issued during a backswing | The backswing is cancelled and the new order starts. The attack or cast it followed already landed |
| Q held down | One instance. Repeats are ignored |
| Q, W, E pressed in one tick | Applied in press order; the buffer ends with the last three |
| Attack-move loses its target | The hero resumes the original destination without backtracking |
| Click on a unit the hero cannot reach | The hero paths as close as it can and waits; the order stays |
| Tab hidden | The simulation pauses; keys pressed while hidden are discarded on return |

## Deferred

- **Key rebinding.** The layout is QWERDF because the kit is built around it. A rebinding screen comes with the settings menu.
- **Gamepad.** The scheme needs a pointer; a controller layout is a design question, not a port.
- **Touch and mobile.** Desktop browsers only.
- **Camera panning** by edge or middle drag. The camera is locked on the hero ([Map and camera](./map-and-camera.md)).
- **Selection of anything but the hero.** Left click selects, but there is nothing else to select until summons or items make it useful.

---

## Related documentation

- [Character movement and mechanics](../specs/character-movement-and-mechanics.md) — the state machine, numbers, and acceptance tests behind this page
- [Orbs and Invoke](./orbs-and-invoke.md) — what Q, W, E, and R do in detail
- [Spells and attack](./spells-and-attack.md) — what D, F, and A throw
- [Status effects](./status-effects.md) — which disables block which keys
- [Commands and events](../../architecture/commands-and-events.md) — how a key press becomes a command inside the simulation
