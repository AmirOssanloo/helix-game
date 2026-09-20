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

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | | |
| Tick at 20 zones and effects | | |
| Bench numbers | | |
| Sized versus actual | | |
| Largest miss | | |
