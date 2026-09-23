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

| Row | Result | Recorded by |
| --- | --- | --- |
| Gate rows | | |
| Readouts at 200 enemies, per browser | | |
| Stress test mean tick at 200 enemies and 100 projectiles | | |
| Sized versus actual | | |
| Largest miss | | |
