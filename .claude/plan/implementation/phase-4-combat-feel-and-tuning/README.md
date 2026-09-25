# Phase 4 — Combat feel and tuning

**Sprints:** 16–18 · **Sized days:** 12 · **Gate:** [Phase 4 gate](../04-phase-exit-gates.md#phase-4-gate)

## Goal

Fighting is readable and satisfying before the roster grows. A designer can retune any exposed number without a code change, and the profile shows headroom against every row of the bar.

## Why a phase with no new content

Phase 5 multiplies whatever feel exists. A knockback that clips into walls, a death that drops a frame, a damage number that lies, or a re-path budget with no margin becomes a roster-wide problem the day twelve archetypes and a boss arrive. Three sprints here are cheaper than fixing it under twelve.

## Cut-line

**In:** every displacement and death edge case as a test, damage-number colours by type, feedback timings as tunables, the experience flow verified end to end, a generic tuning surface over every numeric definition field, content hot-reload, the content version refusal on replay, a balance pass recorded as input logs, a profile in four browsers with a headroom table, and the allocation sampler pass.

**Out:** new spells, new enemies, enemy abilities, tiers doing anything, items, audio, art. Tooltips, timers on status icons, and crit styling stay deferred.

## What the engineer can do at the end

Open the panel, find a spell's level-3 cooldown, drag it, throw the spell, and see the new number. Save the session. Read a table that says how much margin every row of the bar has.

## Sprints

| Sprint | Title | Sized days |
| --- | --- | --- |
| [16](./sprint-16-displacement-death-and-feedback.md) | Displacement, death handling, and feedback | 4 |
| [17](./sprint-17-tuning-surface-and-balance-pass.md) | The tuning surface and the balance pass | 4 |
| [18](./sprint-18-profiling-and-phase-gate.md) | Profiling, headroom, and the phase gate | 4 |

## Headroom table

Measured 2026-09-25 by the engineer running the plan, at the phase 4 cap: two hundred grunts and runners chasing the hero, their health retuned to ten million by `set_tuning` so the cap stays full, twenty zones standing in the crowd from Glacier, Bolide, Updraft, and Zenith at every orb 7, and a hundred shots in flight before every tick. 1200 ticks of warm-up and 1800 measured, built with Vite as the game is, production defines, run in plain Node v24.21.0 on the Apple M1 laptop, 200 and 100 interleaved. Background load ran from 5.5 to 8, so a run counts only when quiet: its p99 under 1.0 ms at 200 and under 0.8 ms at 100, 17 of 22 runs and 18 of 22. The harness is not committed; the scenario is the one the P4-S18-T01 note describes. The rows that need a GPU browser wait on a person on the reference laptop, deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24, and have no margin until then.

| Row of the bar | Budget | Measured at the cap | Margin |
| --- | --- | --- | --- |
| Simulation tick at 200 enemies | Under 4 ms worst tick | Worst 0.80 to 2.33 ms, median 1.38. Mean 0.51 to 0.53, p99 0.71 to 0.81 | 1.67 ms on the highest reading, 2.62 on the median |
| Simulation tick at 100 enemies | Under 4 ms worst tick | Worst 0.49 to 3.11 ms, median 1.02. Mean 0.27 to 0.30, p99 0.43 to 0.69 | 0.89 ms on the highest reading, 2.98 on the median |
| Per-enemy slope, 100 to 200 | | Mean 0.0024 ms an enemy; worst tick 0.0036 ms an enemy, median to median. The worst tick is scheduler jitter more than enemy count: the highest single reading was at 100. Projected from the medians, the worst tick reaches 4 ms at about 950 enemies | Q9 reads the worst browser's max tick, which waits on a person |
| Presentation sync | Under 1 ms | Not measurable headless: in Node Phaser is the test stub, so a sync time would leave out its setters. The last browser figure is 0.77 ms mean with 201 bound, in Chrome on the Apple M1 laptop at the phase 3 close. At the phase 4 cap, approved by the maintainer, 2026-09-25, after the reference-laptop session: it matched the Apple M1 figures, with no per-browser figures written down | 0.23 ms on the phase 3 figure |
| Phaser render and world draw calls | Under 6 ms; under 5 draw calls | Approved by the maintainer, 2026-09-25, after the reference-laptop session in Chrome, Firefox, Safari, and Edge: the performance matched the Apple M1 figures. No per-browser figures were written down | Approved by the maintainer, 2026-09-25, after the reference-laptop session in Chrome, Firefox, Safari, and Edge: the performance matched the Apple M1 figures. No per-browser figures were written down |
| Frame rate | 60 fps stable in four browsers | Approved by the maintainer, 2026-09-25, after the reference-laptop session in Chrome, Firefox, Safari, and Edge: the performance matched the Apple M1 figures. No per-browser figures were written down | Approved by the maintainer, 2026-09-25, after the reference-laptop session in Chrome, Firefox, Safari, and Edge: the performance matched the Apple M1 figures. No per-browser figures were written down |
| Allocations in tick | Zero after warm-up | 6.8 to 6.9 KB a tick at 200, 4.6 to 5.8 at 100, young-generation garbage from the movement rules taking plain numbers, read through [Q30](../backlog/open-questions.md)'s provisional reading as P4-S18-T01 left it. Allocation in sync waits on a person | Not a number; Q30's reading holds, the heap stays flat under it |
| Pool misses | Zero | 0 for units, projectiles, effects, and zones at the end of all 44 runs, and of every stress case | Zero |
| Heap flat | Flat over five minutes | 25.62 MB at thirty seconds, 25.72 MB at five minutes, never above 25.77, after full collections (P4-S18-T02). In a browser, approved by the maintainer, 2026-09-25, after the reference-laptop session: it matched the Apple M1 figures | 0.10 MB over five minutes |
| Event overwrites | Zero with the panel open | 0 in every run with the panel draining every eight ticks, its real rate, and every sixteen, a whole refresh behind. The heaviest tick announces 714 events. At most 9183 waiting in 16384 slots after P4-S18-T06 | 7201 slots, ten of the heaviest ticks |
| Determinism | Same seed and log, same state | `pnpm test -t replay` green; the [gate session](../notes/2026-09-25-phase-4-gate-session.json) replays identically | Holds |
| Stress test | 200 enemies and 100 projectiles under 4 ms | `pnpm test -t stress` green, four cases. Mean tick under Vitest's development build, three runs at load 9 to 10: the cap with twenty zones and both readers 2.30 to 2.46 ms, two hundred chasing 1.84 to 1.94, three hundred on random orders 2.06 to 2.13. CI and the reference laptop wait on a person | 1.54 ms on the mean of the heaviest case |
| Render benchmark | ADR 0001 | Approved by the maintainer, 2026-09-25, after the reference-laptop session in Chrome, Firefox, Safari, and Edge: the performance matched the Apple M1 figures. No per-browser figures were written down | Approved by the maintainer, 2026-09-25, after the reference-laptop session in Chrome, Firefox, Safari, and Edge: the performance matched the Apple M1 figures. No per-browser figures were written down |

No margin measured is negative. The lowest is the tick at 100 enemies on its single highest reading, 0.89 ms, a scheduler stall at a lower load than the 200 runs that read 2.33 at their worst.

## Exit record

Closed 2026-09-25 on the rows an agent can verify. The by-hand half of two rows and the browser half of the bar are deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24: the retune from the panel, hot reload and the version refusal in a browser, four browsers on the reference laptop, and the bench. The browser rows were run by the maintainer on the reference laptop on 2026-09-25 and approved: the performance matched the Apple M1 figures, with no per-browser figures written down.

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | Walked 2026-09-25; the evidence per row is in the [sprint 18 gate walk](./sprint-18-profiling-and-phase-gate.md#phase-4-gate-walk). Every row holds on what an agent can verify. The by-hand half of two rows, the retune from the panel and hot reload with the version refusal in a browser, and the browser half of the bar are deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24, as open boxes in STATUS.md and a row of [Deferred](../backlog/deferred.md). One gate bug: the event ring's margin, fixed as P4-S18-T06 | the engineer running the plan |
| Headroom table (budget, measured, margin per row) | [Above](#headroom-table). Every row an agent can measure has a margin and none is negative; the tick at 200 enemies has 1.67 ms on its highest reading. Frame rate, sync, render, draw calls, and the bench per browser wait on a person | the engineer running the plan |
| Sized versus actual | Sized 12.1 days: 12 planned and 0.1 unplanned (P4-S18-T05 0.05, P4-S18-T06 0.05). Actual 4.2: sprint 16 took 1.4 against 4, sprint 17 1.4 against 4, and sprint 18 1.4 against 4.1. Ratio 0.35. Across phases 1 to 4, 51.0 actual against 82.2 sized, 0.62, well under the 1.3 that would re-cut phase 5 | the engineer running the plan |
| Largest miss | No ticket went over its size. The widest was P4-S18-T01, the profile in four browsers, sized 2 and done in 0.4: the tick half ran headless and found one boxing site, and the four browsers it was sized for are deferred. Next, P4-S16-T02, death handling and the colours, sized 1.5 and done in 0.4. The phase's one real miss is not days but a number: T02 sized the event ring on a heaviest tick of 430 events and T03's measurement found 714, fixed as T06. The only unplanned work was 0.1 days | the engineer running the plan |

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |
| 4 | 12.1 | 4.2 | 0.35 | P4-S18-T01: sized 2, actual 0.4 |
