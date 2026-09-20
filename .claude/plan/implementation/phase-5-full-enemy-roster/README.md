# Phase 5 — The full enemy roster

**Sprints:** 19–22 · **Sized days:** 16 · **Gate:** [Phase 5 gate](../04-phase-exit-gates.md#phase-5-gate)

## Goal

Enemies use abilities and tiers. Every enemy ability is a definition cast through the hero's pipeline, the disable matrix exists as data with a test per cell, elites and bosses multiply and add abilities, and a boss encounter with adds runs within budget.

## The order inside the phase

Abilities first, because the disable matrix tests the hero suffering every status and the abilities are how it suffers them. The matrix second, because a boss that silences is only correct once silence is fully specified. Tiers and the roster third, because a roster is archetypes composed from behaviours and abilities that now exist. The gate and handover last, with the docs brought fully in sync and the "beyond phase 5" doors verified by test.

## Cut-line

**In:** the ability-definition folder and the enemy's ability-selection rule, the nine ability kinds the enemies page names, the disable matrix as data and tests, elite and boss multipliers, the roster per the enemy catalogue, new behaviours the roster needs, one boss encounter, the full docs sync, and ADRs for decisions taken during the phases.

**Out:** boss phases, affixes, immunity, dispels, status resistance, loot, items, dungeons, art, audio, save. Each is in [Deferred](../backlog/deferred.md) with the door it waits behind.

## Live cap for the boss encounter

Written in at the end of phase 4 from the headroom table: two hundred enemies plus one boss plus its adds, unless the tick margin is under 1 ms, in which case the encounter is planned at the number the margin supports and the ticket says so.

| Decided cap | Recorded by |
| --- | --- |
| | |

## What the engineer can do at the end

Spawn a boss with a stun, a slam, and adds among two hundred grunts, fight it with the full kit, get silenced and see six squares grey, get rooted and cast in place, and read every panel row inside the bar.

## Sprints

| Sprint | Title | Sized days |
| --- | --- | --- |
| [19](./sprint-19-enemy-abilities-through-the-pipeline.md) | Enemy abilities through the pipeline | 4 |
| [20](./sprint-20-the-disable-matrix.md) | The disable matrix | 4 |
| [21](./sprint-21-tiers-roster-and-boss-encounter.md) | Tiers, the roster, and the boss encounter | 4 |
| [22](./sprint-22-phase-gate-and-handover.md) | The phase gate and handover | 4 |

## Exit record

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | | |
| Boss encounter readouts, per browser | | |
| Sized versus actual | | |
| Largest miss | | |
