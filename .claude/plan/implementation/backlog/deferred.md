# Deferred

**Written:** 2026-09-20 · **Reviewed:** 2026-09-25, at the phase 4 close; updated at P5-S22-T01 · **Kept current by:** whoever cuts something

Everything the plan deliberately leaves out, with the phase it was cut from and the door it waits behind. A missing capability that is a decision reads differently from one that is an oversight; this page is what makes the difference visible.

Sources: the "Deferred" section of every feature page under `docs/product/features/`, the roadmap's "Beyond phase 5" and "Not at any point" lists, and cuts made while writing the sprints.

---

## Cut from a phase

| Item | Cut from | Waits on | Why |
| --- | --- | --- | --- |
| Damage-number crit styling | Sprint 16 | No crit exists | Colour per type is enough for the balance pass |
| Non-numeric definition fields on the tuning surface | Sprint 17 | A designer asks for one | Numeric covers every number the roadmap wants retuned |
| The bar on the reference laptop for phase 1: four browsers at 300 units, the 30-second allocation sampler, and the stress test there | Phase 1 gate | The phase 5 gate, sprint 22 | The maintainer has no access to the reference laptop until then, 2026-09-23. The bar holds in Chrome on the Apple M1 laptop, recorded in the sprint 06 gate walk; phase 1 closed on that with this row carried |
| The bar on the reference laptop for phase 2: four browsers with twenty zones live, the 30-second allocation sampler, and both stress tests there | Phase 2 gate | The phase 5 gate, sprint 22 | The same, 2026-09-23. The bar holds in Chrome on the Apple M1 laptop, recorded in the sprint 11 gate walk; phase 2 closed on that with this row carried |
| What the isometric view needs once art is tall: sorting by screen position inside the units and obstacles bands, obstacles split per tile so they hide the right things, picking a unit by its sprite, walls that fade near the hero, and sprites drawn in eight or sixteen directions | Sprint 23 | Sprite art, beyond phase 5 | While the art is flat geometry nothing is tall, so the fixed depth bands hold. ADR 0006 names what changes when it is not |
| The render benchmark after the archer's `square_dot` frame: `pnpm bench` in Chrome on this branch and on `772369c`, the four figures for each | Sprint 12 | The phase 5 gate, sprint 22 | The maintainer deferred it, 2026-09-23. The atlas grew by one frame and no view changed; the bench is run there with the rest |
| The render benchmark after the enemy views: the definition's frame and tint at bind, the outline pool, and the range and state-label overlays; `pnpm bench` in Chrome on the P3-S13-T04 commit and on `13833f9`, the four figures for each | Sprint 13 | The phase 5 gate, sprint 22 | The maintainer deferred every benchmark until phase 5 is finished, 2026-09-23. No frame was added; one view kind and two overlays were, all from the one atlas |
| Milestone M1's numbers on the reference laptop: `pnpm bench` in Chrome and Safari, as configured and with `?textures=default` | Sprint 02 | The phase 5 gate, sprint 22 | The same, 2026-09-23. The bench holds on the Apple M1 laptop in Chrome in every run recorded since sprint 02 |
| The phase 3 gate's browser rows: two hundred spawned from the panel and fought for 60 seconds in Chrome, Firefox, Safari, and Edge on the reference laptop, every readout of the bar per browser at two hundred enemies and a hundred projectiles; and the render benchmark at the phase 3 close, `pnpm bench` in Chrome, the four figures | Phase 3 gate, sprint 15 | The phase 5 gate, sprint 22 | The maintainer deferred every validation by a person until phase 5 is done, 2026-09-24. The rows hold headless: the stress spec at two hundred chasing and a hundred projectiles, the tick at 0.5 ms mean in the bundle, sync at 0.77 ms with 201 bound, and the gate session replaying identically; recorded in the sprint 15 gate walk |
| The phase 4 gate's browser and by-hand rows: every readout of the bar per browser in Chrome, Firefox, Safari, and Edge on the reference laptop at two hundred enemies, twenty zones, and a hundred projectiles, written into the headroom table's frame rate, sync, render, and draw-call rows with their margins; the render benchmark at the phase 4 close; three random keys retuned from the panel by hand; and content hot-reload and the version refusal by hand | Phase 4 gate, sprint 18 | The phase 5 gate, sprint 22 | The maintainer deferred every validation by a person until phase 5 is done, 2026-09-24. The rows hold headless and by test, recorded in the sprint 18 gate walk: the tick at 200 enemies 2.33 ms worst with 1.67 ms of margin, pool misses and overwrites zero, heap flat |
| The phase 5 gate's person rows: the boss encounter with adds among two hundred enemies in Chrome, Firefox, Safari, and Edge on the reference laptop, every readout of the bar per browser; the render benchmark at the phase 5 close; and the reference-laptop row, which is every row above that waits on the phase 5 gate | Phase 5 gate, sprint 22 | Phase 5 done, by the maintainer's standing instruction | The maintainer deferred every validation by a person until phase 5 is done, 2026-09-24. The rows hold headless and by test, recorded in the sprint 22 gate walk: the boss variant of the stress test green, the gate session with two bosses among the cap replaying identically, `pnpm check:ci` green |

---

## Cut and since built

A row of the table above moves here when the sprint it waited on builds it, with where it landed.

| Item | Cut from | Built in |
| --- | --- | --- |
| Content hot-reload | Phase 0, sprint 00 | Sprint 17, P4-S17-T02, with the version refusal in P4-S17-T03 |
| The `Readonly` cast ban, if its lint selector runs over | Sprint 00 | The lint rule `no-world-view-cast` under `eslint/rules/` |
| Replay loader and determinism test | Sprint 01 | Sprint 06; `tests/simulation/replay-determinism.spec.ts` |
| Real enemy definitions for the stress test | Sprint 06 | Sprint 12; the stress test spawns grunt and runner packs |
| Wane's aggro-drop behaviour test | Sprint 10 | Sprint 12; `tests/simulation/ai/transitions.spec.ts` reads `aggro_hidden` |
| The disable matrix's draft | Sprint 18 | P4-S18-T04: the row and column headings are in the P5-S20-T01 ticket; the cells are that ticket's |
| Enemy summon adds at the live cap | Sprint 16 | P5-S19-T04: the pending case in `tests/simulation/enemies/edges.spec.ts` is real, and `tests/simulation/abilities/summon-adds.spec.ts` covers the refusal at request and at commit |
| A unit's own movement speed and turn rate | Sprint 09 | P3-S12-T05 |
| A melee attack | Sprint 09 | Sprint 12; `src/domain/attack/attack.ts` lands an attack with no projectile at the end of its attack point |

---

## A legitimate re-cut, if leadership wants a fight sooner

The first fight is the end of sprint 13. To move it earlier by about three weeks:

1. After sprint 09, build only three spells: Hoarfrost (magical, unit, status hook), Zenith (pure, zone, delay), and Clarion (magical, cone, displace, disarm). Two sprints become one.
2. Run phase 3 sprints 12 to 15 as planned.
3. Return for the remaining seven spells as two sprints after phase 3, then run phase 4.

Cost: the pipeline is finished across a phase boundary while the AI module is in the same head, and the phase 2 gate's twenty-zone test moves after phase 3. Gain: a fight three weeks earlier. The plan does not recommend it, and records it so the choice is visible.

---

## Deferred by the product pages

| Item | Page | Waits on |
| --- | --- | --- |
| Key rebinding | Controls and orders | A settings menu |
| Gamepad | Controls and orders | A design for a pointer-free scheme |
| Touch and mobile | Controls and orders | Never |
| Camera panning | Controls and orders, Map and camera | Never in the five phases; the camera is locked |
| Selection of anything but the hero | Controls and orders | Summons or items that make it useful |
| Production access to the panel | Developer panel | Never |
| Remote profiling, log upload | Developer panel | Never in the five phases |
| Scripted scenarios in the panel | Developer panel | Never; tests do that |
| A spell picker that skips Invoke | Developer panel | Never; testing the kit means using the kit |
| Loot and drops | Enemies | Items |
| Kiting archer beyond standing at range | Enemies | Sprint 21 adds `ranged_kiter` for the roster |
| Formations, patrols, scripted encounters | Enemies | Encounter design |
| Bosses with phases | Enemies | Encounter design |
| Enemy affixes | Enemies | Items or a difficulty design |
| Forms as playable content | Hero | Design of a second form; the architecture is ready and tested by a door test in sprint 22 |
| Talents and kit upgrades | Hero, Spells | Never in the five phases |
| Items as modifier sources | Hero | Items; the stack is ready and tested by a door test |
| Real death rules | Hero | The dungeon loop |
| Stat growth past 30, prestige | Hero | Never in the five phases |
| Potions | Hero | Items |
| A second kit's HUD layout | HUD | A second form; tested by a door test |
| Minimap | HUD, Map and camera | A map larger than the arena |
| Item slots, inventory, equipment | HUD | Items |
| Tooltips | HUD | A settings or polish pass |
| Sound cues | HUD, Orbs and Invoke, Spells | Audio |
| Animated art | HUD | The sprite atlas |
| Procedural dungeons, acts, biomes | Map and camera | The generator; the map format is ready |
| Exits, portals, transitions | Map and camera | The dungeon loop; run and map scope are ready and tested by a door test |
| Tile art | Map and camera | Art; the tile-layer view kind is tested by a door test |
| Fog of war | Map and camera | A map larger than the arena |
| A day-night clock | Map and camera | Never in the five phases |
| A third slot | Orbs and Invoke | Never |
| Levelling Invoke | Orbs and Invoke | Never |
| A last-invoked indicator | Orbs and Invoke | Never |
| Ally targeting | Spells | There are no allies |
| Spell lifesteal, amplification | Spells | Items |
| Enemy summons stealing Emberling aggro | Spells | Never in the five phases |
| Named-spell art and sound | Spells | Art, audio |
| Dispels | Status effects | A design that needs them |
| Status resistance | Status effects | Items or difficulty |
| Immunity | Status effects | Never in the five phases; a boss is health, not an exception |
| Status icons with timers | Status effects | A polish pass |

---

## Never

Multiplayer, hero selection, quick-cast, order queues, mobile. The overview and the mechanics spec each state why.
