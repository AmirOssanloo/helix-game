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

## Exit record

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | | |
| Headroom table (budget, measured, margin per row) | | |
| Sized versus actual | | |
| Largest miss | | |
