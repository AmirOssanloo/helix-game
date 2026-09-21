# Developer panel

> **Entry point:** [Features](./README.md)

## Overview

An HTML panel beside the game canvas, present in development builds only, for anyone testing or tuning: spawn enemies, push the hero's numbers around, change any tunable, toggle overlays, and read the instrumentation. It is a tool, not a surface the player sees.

Every action on the panel that changes the world is a command that goes through the same door as a key press, so a session with the panel open replays exactly. There is no back door into the world. The rule is [ADR 0004](../../adr/0004-all-mutation-enters-as-commands.md). Pause, single-step, and the catch-up cap change nothing in the world; they only decide whether the next tick runs, so they are not commands and are not in the log.

## Controls

### The hero

| Control | Does |
| --- | --- |
| Apply damage | Removes the entered amount of health, as a chosen damage type |
| Drain mana | Removes the entered amount of mana |
| Heal, restore mana | Sets health or mana to maximum |
| Level up | Grants one level, with its skill point |
| Set orb levels | Sets Quartz, Whorl, and Ember to chosen levels, 0 to 7 |
| Infinite mana | Casts never spend mana |
| No cooldowns | Every cooldown reads as ready |
| Apply status | Puts a chosen disable on the hero for a chosen duration, as a row of its status table |
| Kill hero | Health to zero, to test death and respawn |
| Begin channel | Puts the hero into the channeling state for a chosen duration, to test what interrupts a channel |

### Tunables

Every parameter the [mechanics spec](../specs/character-movement-and-mechanics.md) section 17 exposes is a slider with its default beside it: base movement speed, turn rate, turn ramp ticks, action cone, collision radius, bound radius, simulation rate, orb capacity, prepared slots, Invoke cooldown base and per-level reduction, Invoke mana, Whorl speed and cooldown reduction per instance, and the respawn delay. Spell and enemy numbers appear here as content grows. A change applies on the next tick and is recorded in the input log.

### The simulation

| Control | Does |
| --- | --- |
| Pause | Stops the clock; the picture stays. Not a command: nothing in the world changes and nothing is logged |
| Single-step | Runs exactly one tick while paused. Not a command, for the same reason |
| Catch-up cap | How many ticks one frame may run after a stall; default 3. A driver setting, not a command |
| Seed | The seed this session's world was created under, shown so a log can be named after it. Choosing another recreates the world under it: a driver operation, not a command |
| Save input log | Downloads the session's seed and commands |
| Load input log | Replays a saved log from the start |
| Reset map | Reloads the current map; the hero keeps run scope |

### Enemies

A dropdown of every archetype, a tier selector, a group size, and a spawn mode: at the pointer on click, or at a chosen distance from the hero. Plus clear all, which removes every enemy without deaths, and kill all, which kills them with experience. Beside the archetypes, a generic spawn: a count of plain units at a world position, for the stress test.

### The atlas

A button that downloads the generated shape atlas as a PNG, so anyone can see what every frame looks like.

## Readouts

Updated a few times per second, from preallocated sample rings.

| Readout | Shows |
| --- | --- |
| Tick time | Mean and worst over the last second, against the 4 ms budget |
| Render time | Mean and worst, against the 6 ms budget |
| Frame rate | Current |
| Draw calls | Per frame, the total and the world's share without the HUD, against the budget of 5 for the world. A dash under the Canvas renderer |
| Live counts | Units, projectiles, zones, effects, views |
| Pool misses | How many times a pool was asked for more than it holds |
| Tick number | The simulation's clock |

## Overlays

Each is a toggle and draws over the world in its own colour at low alpha.

- Collision discs and bound radii, as two separate circles, because tuning the wrong one is the classic mistake
- Facing and the action cone
- Attack range and acquire radius on the hero; aggro and leash radius on enemies
- Path lines, from each moving unit to its destination through its waypoints
- Spell areas as the simulation sees them, not as the HUD draws them
- Unit state labels: Idle, Chase, Attack, and the rest, above each enemy
- Spatial hash cells, with the count of units in each
- The walkability grid

## Persistence

The panel remembers its own layout, which overlays are on, and the last-used spawn settings in the browser's local storage. Nothing about the game is stored; a reload is a fresh world.

## States and edge cases

| State | What happens |
| --- | --- |
| Spawn on a blocked cell | The pack is placed at the nearest free cells; nothing spawns inside an obstacle |
| Spawn past the live cap | Refused with a message naming the cap |
| Tunable changed mid-cast | The running cast keeps the old value; the next cast reads the new one |
| Pause with the targeting cursor open | The cursor stays open; the click commits when unpaused |
| Load a log recorded on a different content version | Refused with a message; a replay is only valid against the definitions it was recorded with |
| Panel closed | Every readout keeps sampling; only the display stops |
| Production build | The panel and its API do not exist; the game has no trace of them |

## Deferred

- **Production access** or a hidden key combination. The panel is stripped from production builds.
- **Remote profiling** and uploading logs anywhere. Save and load are local files.
- **Scripted scenarios** — spawn this, cast that, assert the outcome. Tests do that in Node.
- **A spell picker** that puts any spell into a slot without invoking it. Testing the kit means using the kit.

---

## Related documentation

- [Enemies](./enemies.md) — what the dropdown spawns
- [Hero](./hero.md) — the numbers the hero controls push around
- [Developer tools and instrumentation](../../architecture/devtools-and-instrumentation.md) — how the panel and its readouts are built
- [Running and debugging](../../onboarding/03-running-and-debugging.md) — how to open the panel and replay a log
- [Performance standards](../../standards/performance.md) — the budgets the readouts are measured against
