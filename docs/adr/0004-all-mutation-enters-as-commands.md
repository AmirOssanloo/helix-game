# ADR 0004 — Every change to world state is a command in one buffer, the developer panel included

> **Entry point:** [Architecture decision records](./README.md)

| Field             | Value                                                  |
| ----------------- | ------------------------------------------------------ |
| **Status**        | Accepted                                               |
| **Date**          | 2026-09-20                                             |
| **Deciders**      | Amir Ossanloo, with the engineering architect          |
| **Supersedes**    | None                                                   |
| **Superseded by** | None                                                   |

## Context

Four things want to change the world. The player's keys and pointer. The developer panel, which spawns a pack, drains mana, levels the hero up, or kills everything on screen. The tuning sliders, which change the turn rate or a cooldown while the game runs. And tests, which set up a situation and ask what happens.

The first of these is obviously a stream of intents entering the simulation. The other three are tempting to wire as direct writes: a `setMana` on the world, a slider bound to a field, a test poking a pool. Each is a few lines and each looks harmless, because it is "just debugging".

The cost shows up later, in the one property the simulation exists to have. [ADR 0002](./0002-custom-fixed-step-simulation.md) commits to determinism: same seed, same input log, same state. A direct write is a change the input log did not see. The first time a designer reports "it went wrong after I spawned a pack and turned the turn rate down", the replay diverges at the moment the panel was used, and the engineer is back to guessing. The same back door lets the presentation, one day, correct a position "just for this frame", and the rule that Phaser never owns a position dies quietly.

The people who feel this are the designer whose tuning session cannot be reproduced, the engineer who cannot trust a replay, and the next engineer who finds two ways to change mana and does not know which one the tests exercise.

## Decision

**Nothing outside the simulation mutates world state. Every change enters as a command in one buffer, and the buffer is the input log.**

Player input becomes `Command` variants — move, attack, stop, orb, invoke, throw — with a tick timestamp. Developer-panel operations become `DebugCommand` variants: spawn, kill, damage, drain, heal, level up, set orb level, toggle infinite mana, toggle no cooldowns, pause, single-step. A tuning change becomes a `SetTuning` command carrying the parameter key and the new value; tunables are world state, initialised from content and changed no other way. All of these land in the same buffer, in the same log, and are consumed at the start of the next tick.

The command buffer is the only door. There is no exception for debugging, for tests, or for the presentation. The developer panel's power comes from the width of the `DebugCommand` union, not from a back door. Only reads are out of band: the presentation and the panel read the `Readonly` world view and the instrumentation rings, and neither can write through them.

Inside the tick, commands are applied in timestamp order, then by the fixed priority Q, W, E, R, D, F on ties, so several key presses landing in one tick resolve the same way every time. The validator checks each command against the current order, the disable flags, mana, and cooldowns, refuses with a reason, and emits nothing on refusal. A refused command is still in the log.

```typescript
// the panel has exactly the power the union gives it
type DebugCommand =
  | { kind: 'spawn-foo'; fooDefId: string; count: number; at: Point }
  | { kind: 'set-tuning'; key: TuningKey; value: number }
  /* … */
```

## Consequences

### What this makes easy

**A developer-panel session replays.** The designer spawns a pack, halves the turn rate, dies, and sends the input log. The engineer replays it and watches the same fight, including the spawn and the slider move, to the tick.

**Tests read like play.** A test that wants a stunned hero with no mana submits the commands that produce one and ticks. It exercises the same validator and the same systems the game does, so there is no second code path that only tests use.

**The panel and the presentation are provably read-only.** They hold a `Readonly` view and a way to submit commands, and nothing else. A review question of "can this write to the world?" is answered by the import list.

**Adding a debug operation is adding a variant.** The union, the validator case, and the system that applies it. No new API surface, no new door.

### What this makes hard

**Every debug operation is a variant, not a one-liner.** Wanting to nudge one number during a session means a `SetTuning` key or a new `DebugCommand`, not a console call. The friction is the point, and it is real friction.

**There is no quick-hack path.** An engineer chasing a bug at midnight cannot poke a pool from the console and see what happens. The remedy is a wide enough `DebugCommand` union that the poke is never needed, which has to be kept wide on purpose.

**The log grows with the session.** Tuning changes and debug spawns are in it alongside every key press. Replay files for a long session are larger than they would be with a debug back door, and the log format has to survive a `DebugCommand` variant being renamed.

## Alternatives considered

**A direct debug setter API on the world**, used by the panel and by tests, kept out of production by a build flag. The obvious design and the one first proposed. It lost because a replay cannot reproduce a panel session, tests would exercise code paths the game does not, and the flag is one misconfiguration away from shipping a back door.

**Events as the mutation path** — the panel emits an event, a listener writes. It lost because it is the same back door with an extra hop, and because domain events are what the simulation announces after the fact, not what it accepts before it. Mixing the two directions in one mechanism is how an event handler ends up mutating state that another handler is reading.

**A mutable world view for the presentation, trusted by convention.** It lost the moment "Phaser never owns a position" was decided. A view that can write will, eventually, correct a position for a frame, and the rule dies without a test failing.

## Revisit when

- **A debug operation genuinely cannot be expressed as a command.** None is known. If one appears, the answer is probably a wider command, and only failing that a second, logged door.
- **Replay size becomes a problem** for long tuning sessions. Then the log gains a compact encoding or a checkpoint format; the rule that everything is in it does not change.
- **A second input source appears** — a scripted encounter runner, a replay-driven benchmark — and wants the same door. It should get it; this record already allows for it.

## References

Enforced by:

- The layer allow-list in the ESLint flat config: `presentation` and `devtools` import `simulation/public` only, which exports the command submission function and the `Readonly` world view and nothing mutable.
- The lint rule banning casts away from the `Readonly` world view outside `src/simulation`.
- The command and debug-command unions under `src/domain/commands/`, which are the complete list of ways the world can change; a `SetTuning` key outside the tuning table is a type error.
- The replay determinism test under `tests/simulation/`, which fails if any write reaches the world without passing through the log.

---

## Related documentation

- [Commands and events](../architecture/commands-and-events.md) — the buffer, the ordering rule, and the event ring on the way out
- [Developer tools and instrumentation](../architecture/devtools-and-instrumentation.md) — how the panel issues debug commands and reads the rings
- [Simulation coding standards](../standards/simulation-coding.md) — the rules a command handler follows
- [ADR 0002 — Custom fixed-step simulation](./0002-custom-fixed-step-simulation.md) — the determinism this record protects
- [Running and debugging](../onboarding/03-running-and-debugging.md) — how to record and replay an input log
