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

Written in at the end of phase 4 from the headroom table, read on the worst browser's max tick because the budget is a ceiling: two hundred enemies, the value of `ENEMY_LIVE_CAP`, the boss and its adds counted inside that number because they are enemies, unless the margin is under 1 ms, in which case the constant is lowered to the largest multiple of ten whose projected max tick leaves 1 ms, projected from the table's second row at 100 enemies, and the ticket says so. See [Open questions](../backlog/open-questions.md) Q9.

| Decided cap | Recorded by |
| --- | --- |
| **200**, `ENEMY_LIVE_CAP` as it stands in `src/domain/entities/unit.ts`, the boss and its adds inside it. Read on the [phase 4 headroom table](../phase-4-combat-feel-and-tuning/README.md#headroom-table), 2026-09-25: the worst tick at 200 enemies is 2.33 ms on its highest quiet reading, a margin of 1.67 ms against the 4 ms budget, over the 1 ms the rule asks for, so the cap is not lowered. Projected on the worst-tick slope of 0.0036 ms an enemy, the tick leaves 1 ms up to about 380 enemies. Provisional: the reading is headless in V8, and the worst browser's max tick waits on a person on the reference laptop, deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24. When it is read, the rule applies to it as written: if the worst browser's max tick at 200, M, is over 3 ms, the cap is the largest multiple of ten not above 200 + (3 − M) ÷ 0.0036, P5-S21-T04's stress variant is run at that number, and this row is rewritten. See [Q9](../backlog/open-questions.md) | the engineer running the plan, P4-S18-T04 |

**The sprints against the table.** Sprints 19 to 22 stand as written. The boss encounter and the phase 5 gate row "alongside 200 enemies" both run at the cap above. What the roster adds per tick is ability selection in Chase and Attack, casts through the pipeline, and statuses on the hero, against 1.67 ms of worst-tick margin; P5-S21-T04's stress variant measures it before the gate. The event ring holds twenty-two of phase 4's heaviest ticks, so an enemy cast's events have room; if the boss variant's heaviest tick announces more than 714 events, the ring is resized in that ticket.

**Measured by P5-S21-T04, 2026-09-25.** The boss variant, a brute at boss tier among 197 grunts and runners chasing the hero with a hundred shots in flight, its two adds filling the cap, read as the headroom table was, in a production build in plain Node on the Apple M1 laptop over 21 runs: mean 0.58 to 0.69 ms against the chase case's 0.52 to 0.56, worst 1.33 to 3.19 ms on nineteen runs, and one stalled tick on each of two, 26.7 and 55.9 ms, with no collection over 1.3 ms under `--trace-gc`, read as scheduler stalls. The heaviest tick announces 209 events, so the ring is not resized. The cap stays 200. The rule above reads the worst browser's max tick, which still waits on a person, so the headless reading does not apply it. Under the rule's arithmetic the single 3.19 ms reading would put the cap at 140, and the median worst, 1.35 ms, leaves it at 200; Q48 records the reading as provisional. The browser reading on the reference laptop settles it, with the rule applied as written.

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

Closed 2026-09-25 on every row an agent can verify. P5-S22-T01 walked the gate, and P5-S22-T02's docs sync made the docs row hold. The rows that need a person, the boss encounter and the bar per browser and the reference-laptop row, are deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24, as open boxes in STATUS.md and a row of [Deferred](../backlog/deferred.md). Milestone M8 is reached on the same terms. Sprint 22's door tests and the account for leadership, T03 and T04, follow the gate and do not hold it open. Sized versus actual is complete as of P5-S22-T04, 2026-09-25; the account is [`2026-09-25-retrospective-and-account.md`](../../2026-09-25-retrospective-and-account.md).

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | Walked 2026-09-25; the evidence per row is in the [sprint 22 gate walk](./sprint-22-phase-gate-and-handover.md#phase-5-gate-walk). Five of eight hold outright: the pipeline diff, the disable matrix, the tiers, the roster, and the bar's headless half. The boss encounter holds headless. The docs row holds since P5-S22-T02, on its checklist. The reference-laptop row, the boss encounter per browser, and the bar per browser wait on a person, as open boxes in STATUS.md and rows of [Deferred](../backlog/deferred.md). One gate bug: `pnpm check:ci` timed out two corridor replay cases under coverage, fixed as P5-S22-T05 | the engineer running the plan |
| Boss encounter readouts, per browser | Waiting on a person, deferred until phase 5 is done. Headless: the stress spec's boss case green, and P5-S21-T04's production-build reading of a mean of 0.58 to 0.69 ms, worst 1.33 to 3.19 ms, [above](#live-cap-for-the-boss-encounter). The gate session with two bosses among the cap replays identically | the engineer running the plan |
| Sized versus actual | Sized 16.4 days, 16 planned and 0.4 unplanned (P5-S22-T05, and T06 and T07 from the delivery lead's walk of 2026-09-25). Actual 5.75: sprints 19 to 21 took 1.6, 1.1, and 1.4 against 4 each, and sprint 22 1.65 against 4.4 (T01 0.3, T02 0.4, T03 0.3, T04 0.3, T05 0.05, T06 0.1, T07 0.2). Ratio 0.35. Across phases 1 to 5, 56.75 actual against 98.6 sized, 0.58; with phase 0, 61.0 against 107.6, 0.57 | the engineer running the plan |
| Largest miss | No ticket went over its size. The widest gaps were P5-S20-T02, the matrix as data and the validator, sized 2 and done in 0.5, and P5-S21-T02, the roster, sized 2 and done in 0.6. The one number that moved was the boss variant's single worst tick of 3.19 ms, which Q48 holds provisional against the cap rule | the engineer running the plan |

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |
| 5 | 16.4 | 5.75 | 0.35 | Sprint 20: sized 4, actual 1.1 |
