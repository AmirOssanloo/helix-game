# Commands and events

> **Entry point:** [Architecture](./README.md)
> **See also:** [Simulation loop](./simulation-loop.md) · [Developer tools and instrumentation](./devtools-and-instrumentation.md) · [Presentation](./presentation.md)

The only two doors in the simulation: commands go in, events come out. Everything that changes world state is a command, and everything the screen reacts to is an event or a read of the world view. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each to its real shape and folder.

---

## The shape in one line

```text
DOM and Phaser input ──► input mapper ──► Command ─┐
a click on the HUD ─────► HUD ─────────► Command ───┼──► command buffer ──► tick ──► event ring ──► presentation sync
developer panel ────────► DevApi ──────► Command ───┘                        │
                                                                             └──► input log
```

Three producers, the HUD's one command counted, one buffer, one log. The tick consumes the buffer; nothing else writes to the world.

---

## Commands

A command is a plain value: a variant of one union, carrying the tick it applies to and whatever the variant needs — a target point, a unit id, a key.

**The input mapper** in `presentation/input/` turns DOM and Phaser events into commands. It knows about keys and pointers; it knows nothing about rules. Three things it must get right:

- **Ability keys are edge-triggered.** A key held across several frames produces one command, on key-down. Key repeat never reaches the buffer.
- **A pointer pick stores the world position at event time.** The mapper converts screen to world through the camera when the event arrives, not when the tick runs, so a camera move in the same frame cannot retarget the click. A command aimed by a press and a drag carries two picks, each resolved at its own event: the press when the button goes down, held by the mapper until the release, and the release when the button comes up. The command is submitted at the release.
- **Every command carries a tick timestamp.** The mapper stamps it with the tick the command will apply to.
- **A slot key names a slot, not a mechanic.** Q, W, E, R, D, F become one command variant carrying a slot index from 1 to 6. The active form's kit decides what that index means — an orb, the composer, a prepared spell, or a plain ability — so the mapper and the command union never know which kit the hero is wearing.

**The HUD** issues one command of its own: a left click on an orb square while a skill point is unspent submits a spend-skill-point command naming the slot, and the active kit decides which orb that is. It goes through the same door as a key press.

**The developer panel** issues commands through `DevApi`. Player-shaped things — spawn, damage, heal — are `DebugCommand` variants. A tuning change is a `SetTuning` command. Both land in the same buffer as a right click and are recorded in the same input log. There is no second path into the world, and there is no method on the world that mutates state from outside a tick. [ADR 0004](../adr/0004-all-mutation-enters-as-commands.md) says why.

```typescript
// the panel and the mouse use the same door
world.submit({ kind: 'foo-bar', tick: nextTick, /* … */ })
```

### Ordering

The buffer is consumed at the start of the tick, sorted by timestamp. Commands on the same tick with the same timestamp apply in a fixed key priority: **Q, W, E, R, D, F**, then everything else in arrival order. A frame that delivers Q and R in the same millisecond composes the orb before invoking.

### Validation

A command is a request. The validator in `domain/orders/` decides whether the unit may act on it this tick: is it stunned, silenced, rooted, mid-cast. The validator reads disable flags the status pass of the previous tick derived from the status table, so a status that lands mid-tick blocks from the next tick on. A dead unit refuses every command until it respawns. What a slot key or a cast needs beyond that, the ability, its clock, its cost, its target, is the active kit's or the ability pipeline's to refuse when the command is applied. A skill-point spend is checked for its slot alone; no disable refuses it, since a level is not something the unit does, and the kit and the level rule refuse a slot that holds no orb, a missing point, or an orb at its cap. A refused command is dropped and, where the player would want to know, an event says why.

### Application

The command system beside the validator runs first in the system order. It walks the commands the tick consumed, validates each against the hero as it is at that moment, and applies the ones that pass: an order command replaces the current order through the state machine, and the last legal order in a tick wins. A tuning change is validated against the tuning state instead and applied to run scope, hero or no hero. A world with no hero drops every other command. Nothing else reads the consumed commands to change state.

---

## Events

An event is a plain value announcing something that happened inside a tick: a unit was damaged, a unit died, a spell was invoked, a projectile spawned, an orb was added.

**The event ring is preallocated.** Systems write into the next free slot; nothing is constructed per event. There is no emitter, no listener registration, no closure. A full ring overwrites the oldest entry, and the instrumentation counts the overwrite so it is visible.

**The presentation drains the ring once per render frame**, after the driver has run its ticks. It reads every event since its last read, reacts — spawn a floating number, flash a view, bump a HUD wedge — and moves its cursor. The developer panel reads the same ring with its own cursor.

Events are for reactions, not for state. A view that needs to know a unit's health reads the world view; it does not sum damage events.

---

## The world view

The presentation reads world state through a `Readonly` type exported from `simulation/public.ts`. It is a compile-time view over the live pools: no copy, no snapshot, no allocation. Two rules keep that safe:

- The presentation reads only during its sync, after the ticks for this frame are done.
- The presentation never writes through the view. Lint sees a `Readonly` type; the architecture test sees no import past the door.

---

## Anti-patterns

### A back door for the panel

A `world.setHealth()` method "just for debugging". The next engineer uses it from a test, then from a scene, and now the replay of a panel session diverges from what the player saw. Add a `DebugCommand` variant instead.

### Reacting to state by polling events

A HUD that tracks the hero's mana by adding every mana event. One dropped event and the bar is wrong for the rest of the session. Read the world view for state; use events for moments.

### An event with a callback

An event carrying a function to call when handled. It allocates a closure per event, can't be recorded, and can't be replayed. An event is data.

---

## Quick reference

| Rule | Do |
| --- | --- |
| Changing world state | Only a command, consumed by a tick |
| Command producers | The input mapper, the HUD's orb squares, and `DevApi`, into the same buffer |
| Command shape | A plain value: one union variant, a tick timestamp, its payload |
| Ability keys | Edge-triggered on key-down; key repeat never reaches the buffer |
| Slot keys | One command variant carrying a slot index 1 to 6; the active kit resolves it, the mapper and the union never name a mechanic |
| Pointer picks | World position resolved at event time, stored on the command; a press-and-drag aim resolves the press at the button going down and the release at the button coming up, and submits at the release |
| Ordering | By timestamp; ties by Q, W, E, R, D, F, a skill-point spend sorting as the slot it names, then arrival order |
| Validation | `domain/orders/` decides per tick from the unit's state and its disable flags, derived by the previous tick's status pass; the active kit and the ability pipeline refuse a slot key or a cast over its ability, clock, cost, and target when it is applied; a tuning change is checked against the tuning state in `domain/definitions/`; a skill-point spend is checked for its slot alone and refused by no disable; a debug command is checked for its shape in `domain/orders/` and refused by its handler in `domain/debug/` over what the world can take; a refusal is dropped and announced as a refused-command event with its reason |
| Application | The command system in `domain/orders/`, first in the system order, applies each consumed command that passes validation in the one order the buffer gave them: a tuning change to run scope, a debug command to its handler, every other to the hero; the last legal order in a tick wins |
| Debug operations | `DebugCommand` variants, recorded in the input log |
| Tuning changes | A `SetTuning` command carrying a key of the tuning table and a value in the designer's units, recorded in the input log, converted once when applied |
| A mutating method on the world | Never |
| Events | Plain values in a preallocated ring; no emitter, no listeners, no closures |
| Draining events | Once per render frame by the presentation, with its own cursor; the panel keeps its own |
| A full ring | Overwrites the oldest entry and counts the overwrite |
| State versus moments | Read the world view for state; use events for reactions |
| The world view | A `Readonly` type over live pools, read by reference during sync, never written, never copied |

---

## Related documentation

- [Simulation loop](./simulation-loop.md) — when the buffer is consumed and the ring is written
- [Developer tools and instrumentation](./devtools-and-instrumentation.md) — how `DevApi` builds its commands
- [Presentation](./presentation.md) — how the sync reads the view and drains the ring
- [ADR 0004 — All mutation enters as commands](../adr/0004-all-mutation-enters-as-commands.md) — why there is no back door
- [Controls and orders](../product/features/controls-and-orders.md) — the player-facing side of the command union
