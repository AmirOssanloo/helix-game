# Phase 3 — Enemies

**Sprints:** 12–15 and 23–24 · **Sized days:** 22.5 · **Gate:** [Phase 3 gate](../04-phase-exit-gates.md#phase-3-gate)

## Goal

Fight groups. Four archetypes plus the dummy spawn in packs from the panel, aggro together, chase, attack, leash, die, and give experience, and two hundred of them chase the hero within budget in four browsers, in a 2:1 isometric view at one fixed scale.

## The order inside the phase

The enemy catalogue and the AI state machine first, because every behaviour is tested by spawning an archetype and every archetype is defined by its behaviour. Death and experience second, because that is the first complete loop: spawn, fight, kill, level. Readability third, because two hundred squares without numbers, flashes, labels, and overlays cannot be judged. Load last, because the number that matters is measured with everything above present.

The isometric view, sprints 23 and 24, sits between death and readability. It was added on 2026-09-23 after the phase 2 close and takes the next free sprint numbers, so the order the sprints run in is 12, 13, 23, 24, 14, 15. It goes before readability because every overlay, label, and view pool sprint 14 sizes is sized for the view the game keeps, and before load because the two-hundred-enemy measurement should be of that view. It touches no domain or simulation code, so it may also run beside 12 and 13.

## Cut-line

**In:** the enemy catalogue for the four archetypes and the dummy, the AI state machine with its six states, three behaviours (`melee_chaser`, `ranged_holder`, `stationary`), pack ids and shared aggro, leash from each spawn point, the re-path budget under real load, enemy attacks through the same attack code as the hero's, death with experience and delayed release, dormant packs as a rule with a test, elite outlines as a second quad pool, archetype colours, state labels, every overlay on the developer panel page, damage numbers at scale, the damage-type matrix, view binding by camera rectangle at two hundred, and the profile.

The isometric view is in: a 2:1 diamond projection in presentation over the unchanged square world, flat placeholder geometry, one fixed scale chosen by walking three, no zoom, and the maintainer's floor tile.

**Out:** enemy abilities, tiers as anything but a field and an outline, loot, patrols, formations, kiting archers, boss phases, affixes, and anything the isometric view needs only once art is tall: sorting by position, obstacles split per tile, picking by sprite, walls that fade near the hero. The elite outline exists so the view pool is two pools from the start; nothing multiplies health until phase 5.

## What the engineer can do at the end

Spawn five grunts on the far side of the arena, walk in, watch the labels flip to chase, watch them queue through the corridor, throw Updraft into the queue, count the numbers, and level up. Spawn two hundred and read every panel row inside the bar.

## Sprints

| Sprint | Title | Sized days |
| --- | --- | --- |
| [12](./sprint-12-ai-state-machine-and-packs.md) | Enemy catalogue, the AI state machine, behaviours, and packs | 4 |
| [13](./sprint-13-death-experience-and-pack-behaviour.md) | Death, experience, dormancy, and enemy views | 4 |
| [23](./sprint-23-the-isometric-view-and-its-scale.md) | The isometric view and its scale | 3.5 |
| [24](./sprint-24-the-floor-tile-and-the-isometric-walk.md) | The floor tile and the isometric walk | 3 |
| [14](./sprint-14-combat-readability-and-overlays.md) | Readability, overlays, and the damage-type matrix | 4 |
| [15](./sprint-15-two-hundred-enemies-and-phase-gate.md) | Two hundred enemies, profiling, and the phase gate | 4 |

## Exit record

Closed 2026-09-24 on the rows an agent can verify. The browser half of two rows is deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24: four browsers on the reference laptop, and the bench. The browser rows were run by the maintainer on the reference laptop on 2026-09-25 and approved: the performance matched the Apple M1 figures, with no per-browser figures written down.

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | Walked 2026-09-24; the evidence per row is in the [sprint 15 gate walk](./sprint-15-two-hundred-enemies-and-phase-gate.md#phase-3-gate-walk). Six of eight rows hold. The two-hundred row and the bar hold headless; their browser half, four browsers on the reference laptop, and the bench are deferred until phase 5 is done by the maintainer's standing instruction of 2026-09-24, and are a row of [Deferred](../backlog/deferred.md). Closed 2026-09-24 with P3-S15-T04, the sprint's last ticket, which also added the corridor pile-up at two hundred: no disc ever in a wall, and the worst pair 0.68 of its summed radii after the push-out cap moved from three passes to four | the engineer running the plan |
| Readouts at 200 enemies, per browser | Approved by the maintainer, 2026-09-25, after the reference-laptop session in Chrome, Firefox, Safari, and Edge: the performance matched the Apple M1 figures. No per-browser figures were written down Headless in V8: tick 0.5 ms mean, 3.0 ms worst under load, pool misses zero; sync 0.77 ms mean with 201 bound | the engineer running the plan |
| Stress test mean tick at 200 enemies and 100 projectiles | 1.89 to 1.98 ms under Vitest on the Apple M1 laptop, quiet, five runs; 0.33 ms as a bundle. The 300-unit case beside it 1.75 to 1.98 ms. After P3-S15-T04 moved the push-out cap from three passes to four, the chase case reads 1.85 to 2.25 ms under Vitest, three runs. CI and the reference laptop wait on a person | the engineer running the plan |
| Sized versus actual | Sized 23.25 days: 22.5 planned and 0.75 unplanned (P3-S12-T05 0.5, P3-S24-T04 0.25). Actual 8.1: sprint 12 took 2.6 against 4.5, sprint 13 1.1 against 4, sprint 23 0.9 against 3.5, sprint 24 1.1 against 3.25, sprint 14 1.0 against 4, and sprint 15 1.4 against 4. Ratio 0.35. Across phases 1 to 3, 46.8 actual against 70.1 sized, 0.67, well under the 1.3 that would re-cut phases 4 and 5 | the engineer running the plan |
| Largest miss | No ticket went over its size. The widest were a day and a half under: P3-S15-T01, the profile at two hundred, sized 2 against R2 and R4 and done in 0.5 because neither bit; and P3-S23-T01, the three scales, sized 2 and done in 0.5. The widest sprint gap is sprint 14, sized 4 and done in 1.0. Of the three risks the phase was sized against, R2 and R4 did not bite. R3 bit mildly and took a tuning, not the sprint's buffer. The days the phase did not use are estimate, not scope: the only unplanned work was 0.75 days | the engineer running the plan |

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |
| 3 | 23.25 | 8.1 | 0.35 | Sprint 14: sized 4, actual 1.0 |
