# Phase 2 — Spells and attack

**Sprints:** 07–11 · **Sized days:** 20 · **Gate:** [Phase 2 gate](../04-phase-exit-gates.md#phase-2-gate)

## Goal

Every spell and the auto-attack are castable in an empty arena against a training dummy, with the cast pipeline general enough that phase 5's enemy abilities add definitions and nothing else.

## The order inside the phase

Catalogue, then schema, then pipeline, then primitives, then the spells. That order is the phase's whole risk strategy. The spell catalogue is written first because it decides which primitives exist; a Updraft discovered after the primitives are built is a rewrite. The schema is second so that no definition is written twice. The primitives and the entities they spawn come next, in the order zones, projectiles, summons, because five spells are zones, two fire projectiles, and one summons. Only then are spells written, primitive-heavy ones first so the pipeline is exercised by simple cases before the three hard named effects.

## Cut-line

**In:** the spell catalogue with adapted numbers, definition types and schemas for spells, abilities, statuses, and maps, the content registry with validation and the content test tier, seconds-to-ticks at load, the full pipeline stage machine replacing the phase 1 skeleton, the six primitives, the zone and projectile entities and systems, summons, the eight status kinds as definitions with the stack rules and disable flags, damage types and mitigation, death resolution once per tick, the auto-attack and attack-move, the training dummy, hit flashes, damage numbers, status icons, every spell's targeting preview, and the ten spells with tests at orb levels 1 and 7.

**Out:** any enemy that moves or attacks. The AI module lands in phase 3; the dummy uses a `stationary` behaviour that does nothing. Wane's aggro drop is implemented as a flag on the hero and tested for the flag; the aggro behaviour that reads it is tested in phase 3. Displacement into obstacles, knockback edge cases, and damage-number colours wait for phase 4.

## Decisions taken here

- **Summons expire on the owner's death.** The product pages say so twice; the ability pipeline page says the opposite once. Product wins; the architecture page is corrected in sprint 09. See [Open questions](../backlog/open-questions.md) Q1.
- **A status may carry an on-damage hook.** Hoarfrost needs it in this phase and the stun bash needs it in phase 5. It is one capability on the status definition, designed in the catalogue and built once. See Q3.

## What the engineer can do at the end

Spawn a dummy, turn on infinite mana and no cooldowns, and throw all ten spells at it with previews, projectiles, walls, updrafts, bolides, a emberling, floating numbers, flashes, and icons. Right-click the dummy and watch the hero auto-attack. Apply every status to the hero from the panel and watch the right keys grey out.

## Sprints

| Sprint | Title | Sized days |
| --- | --- | --- |
| [07](./sprint-07-spell-catalogue-and-the-ability-pipeline.md) | Spell catalogue, definition schemas, the registry, and the pipeline | 4 |
| [08](./sprint-08-statuses-combat-and-the-primitives.md) | Statuses, disable flags, zones, and the primitives | 4 |
| [09](./sprint-09-projectiles-summons-and-the-auto-attack.md) | Projectiles, summons, the dummy, and the auto-attack | 4 |
| [10](./sprint-10-the-ten-spells-part-one.md) | The ten spells, part one | 4 |
| [11](./sprint-11-the-ten-spells-part-two-and-phase-gate.md) | The ten spells, part two, and the phase gate | 4 |

## Exit record

Closed 2026-09-23, with the reference-laptop half of the bar carried to the phase 5 gate.

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | Walked 2026-09-23; the evidence per row is in the [sprint 11 gate walk](./sprint-11-the-ten-spells-part-two-and-phase-gate.md#phase-2-gate-walk). Eight of nine rows hold. The ninth, the bar, holds in Chrome on the Apple M1 laptop; its reference-laptop half — four browsers and the allocation sampler — was deferred by the maintainer to the phase 5 gate on 2026-09-23, for want of the machine, and is a row of that gate and of [Deferred](../backlog/deferred.md). Closed 2026-09-23 on that decision | the engineer running the plan |
| Tick at 20 zones and effects | `stress-zones.spec.ts`, Apple M1 laptop, five runs of 300 measured ticks with twenty zones, a hundred projectiles, and one dummy: 0.10 to 0.11 ms mean, 0.28 to 0.82 ms max, no pool miss. In Chrome with 19 to 20 Glacier and Bolide zones live for 30 s: tick mean 0.07 to 0.14 ms, max 0.3 ms | the engineer running the plan |
| Bench numbers | Chrome on the Apple M1 laptop, 90 s as configured, after every view this phase added: 60 fps, render 0.7 to 0.8 ms, 1 draw call, 1 texture, heap 60.9 to 72.5 MB with no climb. The before-and-after pairs for the three view changes of the phase, run on the same machine on 2026-09-23, are in the sprint 08, 09, and 11 exit tables; none moved the render time past a millisecond or the heap off flat. Safari and the reference laptop are deferred with the bar | the engineer running the plan |
| Sized versus actual | Sized 25.75 days: 20 planned and 5.75 unplanned, all in sprint 11 (P2-S11-T05 0.5, T06 0.5, T07 0.5, T08 1, T09 0.25, T10 0.5, T11 0.5, T12 1.5, T13 0.25, T14 0.25). Actual 20.1: sprint 07 took 2.5 against 4, sprint 08 2 against 4, sprint 09 4 against 4, sprint 10 4 against 4, sprint 11 7.6 against 9.75. Ratio 0.78. Across phases 1 and 2, 38.7 actual against 46.85 sized, 0.83, under the 1.3 that would re-cut phases 3 to 5 | the engineer running the plan |
| Largest miss | No ticket went over its size. The widest were a day under: P2-S07-T03, the effect runner and the pipeline suite, sized 1.5 and done in 0.5, and P2-S08-T01, the status table and the disable flags, sized 1.5 and done in 0.5. The widest sprint gap is sprint 08, sized 4 and done in 2. The overrun the phase did carry was scope, not estimate: 5.75 unplanned days in sprint 11, of which 3.5 corrected what the maintainer saw in the arena and 2.25 were asked for | the engineer running the plan |

| Phase | Sized | Actual | Ratio | Largest miss |
| --- | --- | --- | --- | --- |
| 2 | 25.75 | 20.1 | 0.78 | Sprint 08: sized 4, actual 2 |
