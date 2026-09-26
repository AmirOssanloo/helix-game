# Running and debugging

> **Entry point:** [Onboarding](./README.md)

**Purpose:** use the developer panel, the overlays, the input log, the benchmark, and the stress test to see what the game is doing and prove a change holds its budget. Assumes [Getting started](./01-getting-started.md) is done and `pnpm dev` is running.

---

## The developer panel

The panel is a pane beside the canvas, mounted in the development build and in the playtest build that is published for people to play with, and in no production build. Every control that changes the world sends a `DebugCommand` through the same buffer as the keyboard and mouse, so a panel session records into the input log and replays like any other. Nothing in the panel reaches world state by another route.

Each group is a folder you can collapse, and what you leave open is remembered. A number is typed into its field and committed by leaving it or pressing enter, or dragged; a slider sends its command when you let go, so one drag is one command and not a hundred.

| Group        | Controls                                                                                                                                                  | What it does |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| Hero         | Apply damage, Heal, Drain mana, Restore mana, Level up, Set orb levels (Quartz, Whorl, Ember), Infinite mana, No cooldowns, Apply status (stun, slow, silence, root), Jump to checkpoint | Puts the hero in any state without a fight |
| Tuning       | One slider per tunable: `base_ms`, `turn_rate_T`, `turn_ramp_ticks`, `action_cone_deg`, `collision_radius`, `bound_radius`, `hash_cell_size`, `orb_capacity`, `prepared_slots`, `invoke_cd_base`, `invoke_cd_per_orb_level`, `invoke_mana`, `whorl_ms_per_instance`, and every number a definition exposes, plus Reset tunables | Retunes the live world; each change is a `SetTuning` command in the log, and the reset sends one per slider that moved |
| Enemies      | Archetype dropdown, Tier, Group size, Spawn at click, Clear all, Kill all                                                                                       | Spawns a pack of the chosen archetype where you next click; the dropdown lists the content registry, so a new definition appears without a code change |
| Simulation   | Pause, Single-step, Catch-up cap, Seed, Map, Save input log, Load input log, Feedback, Note, Reset map                                                                      | Freezes and steps the world; records and replays a session. Pause, step, and the cap act on the driver and are not in the log |
| Overlays     | Collision discs, Bound radii, Facing and action cone, Attack and aggro ranges, Path lines, Spell areas, Unit state labels, Spatial hash cells, Walkability grid | Draws diagnostics over the world from a separate quad pool; a toggle is remembered between reloads |
| Readouts     | Frame rate, Tick time (mean and max over the last second), Render time, Draw calls, Live units, Live projectiles, Live zones, Pool misses, Heap           | Live numbers from the instrumentation rings; draw calls are counted by wrapping the renderer's draw methods |
| Atlas        | Download atlas PNG                                                                                                                                        | Saves the shape atlas generated at boot so you can inspect the frames |

---

## Reading the readouts

The budgets are rules, not aspirations. A number over its line is a bug in the change that moved it there.

| Readout       | Healthy                        | Over the line means |
| ------------- | ------------------------------ | ------------------- |
| Frame rate    | 60, steady                     | Something below is over budget, or the tab is throttled |
| Tick time     | Mean well under 4 ms, max under 4 ms | A system is doing too much work per tick: a re-path every tick, a query without the spatial hash, an allocation storm |
| Render time   | Under 6 ms, usually 2 to 3     | A batch break, a `Text` updated in sync, or too many views bound |
| Draw calls    | Under 5 for the world          | Something broke the one-texture batch: a second texture, a blend mode, a mask, a Shape or Graphics object |
| Pool misses   | 0                              | A pool ran out and something allocated, or a pool was sized too small for the scene |
| Heap          | Flat after the first few seconds | An allocation on the hot path. Record the performance panel and look at the allocation timeline |

A tick over 4 ms with a flat heap is a work problem. A tick over 4 ms with a rising heap is an allocation problem. Fix the allocation first; it is usually the cause of both.

---

## Overlays

Each overlay is a toggle. They draw from their own quad pool at depth 90, above everything else, and cost nothing when off.

- **Collision discs** — the solid body of every unit, radius 27 for the hero. Two discs overlapping after a tick is a push-out bug.
- **Bound radii** — the range buffer added to attack and cast range. Shows why an attack lands from further than the number suggests.
- **Facing and action cone** — the hero's heading and the 11.5 degree cone. The hero translates only when the target bearing is inside it.
- **Attack and aggro ranges** — the hero's attack range to a target's edge and its acquire radius; each enemy's aggro radius around it and leash radius around its spawn point.
- **Path lines** — the polyline each moving unit follows, after smoothing.
- **Spell areas** — the circle, rectangle, or cone of every zone on screen, as the simulation tests it, faint through the zone's delay.
- **Unit state labels** — the order state of the hero and the AI state of every enemy, as text above the unit.
- **Spatial hash cells** — the 128-unit grid, each occupied cell outlined with the count of units in it.
- **Walkability grid** — every cell the hero's radius class may not stand in, shaded.

---

## Recording and replaying a session

The simulation is a function of a seed and the commands it receives, so any session can be replayed exactly.

1. Note the **Seed** shown in the Simulation group. Recording is always on; every session is a log from its first tick.
2. Play. Every keyboard, mouse, and panel command goes into the input log with its tick.
3. Click **Save input log**. You get a JSON file: the seed, the content registry version, and the ordered commands.
4. Reload the page, click **Load input log**, pick the file. The world resets to the seed on the map the log was recorded on and consumes the commands tick by tick. What you saw happens again, at the same ticks. A log saved on another content version is refused, and the status line names both versions. So is a log saved after a content edit was hot-reloaded into the session, since it ran on two versions; recreate the session after the edit and record again.

Use **Pause** and **Single-step** during a replay to stop at the tick that went wrong and read the overlays.

**Filing feedback.** Press **F9**, or **Feedback** in the Simulation group, write what you think, and **Save**. The world is paused while you write and no key you type reaches the hero. The feedback file holds the note, the tick, the build's commit, and the log to that tick; **Load input log** takes it back, runs to the tick, pauses, and shows the note. [Development workflow](../workflows/development.md#filing-and-reading-feedback) has the whole round.

**Turning a replay into a test.** Copy the JSON into `tests/simulation/replays/<name>.json` and add a spec under `tests/simulation/` that loads it, runs the world to the final tick, and asserts the state you expect — the hero's health, an enemy's position, which spell sits in slot D. The `loadInputLog` helper from `tests/helpers/` reads it, and `beginReplay` from the simulation's public door runs it. A bug that came with a replay ships with a test that replays it.

---

## Pausing and stepping

**Pause** stops the driver from calling `tick`. The renderer keeps drawing, so overlays stay readable and the camera still moves. **Single-step** runs exactly one tick while paused. **Catch-up cap** sets how many ticks the driver may run in one frame after a stall; the default is 3, and the cap is why a tab-resume does not dump two seconds of orbs at once.

Hiding the tab pauses the clock automatically. Cooldowns freeze, and input that arrives while hidden is discarded rather than replayed on resume.

---

## The render benchmark

```bash
pnpm bench
```

This serves the throwaway scene under `bench/`: 300 tinted unit quads moving and rotating every frame with a tenth of them flashing, 100 projectile quads spawning and despawning through the pool at 20 per second, 30 rings, discs, cones, and lines scaling and fading, 6 cooldown wedges changing frame, 50 `BitmapText` numbers changing text and position, 50 static obstacles, and a camera following a moving target at 1920 by 1080 with `Scale.FIT`. It draws the way the play scene does: what lies on the ground through the isometric ground layer, over the floor tile, with the numbers standing where their points project.

Open the address it prints, open the browser's performance panel, and record 30 seconds. The readout in the corner shows the frame rate, the mean render time, the most draw calls a frame took, the used heap where the browser exposes it, and the texture units per batch. Run it twice: once as the game is configured, with one texture per batch, and once with `?textures=default` on the address, which lets Phaser pick its multi-texture batch. Then read:

| Measure       | Pass                          |
| ------------- | ----------------------------- |
| Frame rate    | 60, steady, in Chrome and Safari |
| Render time   | Under 6 ms                    |
| Draw calls    | Under 5 per frame, from the readout |
| Heap          | Flat after warm-up            |

Run it after every Phaser upgrade, and after any change to the atlas or the views. Put the before and after numbers in the change description.

If it fails, the fix is inside Phaser, never a different engine: draw calls over 5 means something broke the batch; render over budget with draw calls fine means an allocation in the sync layer or a stray `Text` update.

---

## The stress test

```bash
pnpm test -t "stress"
```

This ticks two hundred grunts and runners chasing the hero round the 4000 by 4000 arena with a hundred projectiles in flight, then a boss and its adds among them, then 300 units with random orders on it, in Node with no renderer, and asserts a mean tick under 4 ms for each. It is part of `pnpm test`, so it runs before every push; run it alone when you have touched movement, pathing, collision, or AI and want the number quickly.

The replay determinism test runs the same way:

```bash
pnpm test -t "replay"
```

---

## Seeing the Canvas fallback

To see what an unsupported machine sees, force the Canvas renderer in the console before the game boots:

```javascript
window.FORCE_CANVAS = true
```

Then reload. The warning banner appears over the arena. Nothing else is expected to work well, and nothing is tested this way. The matching `window.FORCE_WEBGL` exists but is never needed.

---

## Common problems

| Symptom                                          | Cause                                                         | Fix |
| ------------------------------------------------ | ------------------------------------------------------------- | --- |
| Warning banner "Canvas renderer"                 | WebGL unavailable                                             | Hardware acceleration, another browser, or another machine |
| The world froze while you were in another tab    | Hidden tabs pause the clock                                   | By design. Nothing was lost; cooldowns froze with it |
| Holding Q gives one orb                          | Q, W, E, R are edge-triggered; key repeat is ignored          | By design. Press again |
| A replay diverges from what you saw              | The content registry changed since the recording, or something read the clock | Check the registry version in the log; then run the determinism test to find the offending system |
| Tick time spikes when many enemies chase         | Every enemy re-pathing every tick                             | The re-path budget in `src/domain/pathing/` is being bypassed; check the change |
| Draw calls jumped to double digits              | A Shape, Graphics, or second texture                          | Lint should have caught the factory call; if it is a texture, find the sprite not using the atlas |

---

## Related documentation

- [Developer panel](../product/features/developer-panel.md) — every control, as the player of the panel sees it
- [Development workflow](../workflows/development.md) — the commands behind `pnpm test` and `pnpm bench`
- [Performance standards](../standards/performance.md) — the budgets these readouts are held to
- [Developer tools and instrumentation](../architecture/devtools-and-instrumentation.md) — how the panel reaches the simulation
- [Simulation loop](../architecture/simulation-loop.md) — the driver, the accumulator, and the cap
