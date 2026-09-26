# Dependency map

**Written:** 2026-09-20 · **For:** anyone re-cutting a sprint or asking why something is not earlier

What has to exist before what. Every arrow here is a reason a ticket sits where it does. If a re-cut moves a ticket earlier than something it depends on, the re-cut is wrong.

---

## The spine

The chain that cannot be reordered. Everything else hangs off it.

```text
toolchain and layers (S00)
  → pools, ids, world, command buffer, event ring, tick, driver (S01)
    → order machine and command union (S02) → movement and turn rate (S02)
      → spatial hash → push-out → grid and A* (S03)
        → hero definition, stats, orb buffer, Invoke, slots, cooldown clocks (S04)
          → input mapper, views, camera, HUD (S05)
            → debug commands, panel, replay, stress test (S06)  ══ phase 1 gate
              → definition types, registry, content tier, pipeline stages, combat rules (S07)
                → statuses and disable flags, primitives, zones (S08)
                  → projectiles, summons, auto-attack, hit feedback (S09)
                    → spells (S10, S11)  ══ phase 2 gate
                      → enemy definitions, AI state machine, packs, behaviours (S12)
                        → death, experience, dormancy, enemy views (S13)
                          → readability and damage-type matrix (S14)
                            → 200 enemies and profiling (S15)  ══ phase 3 gate
                              → displacement and death edges (S16) → tuning surface (S17) → profile and headroom (S18)  ══ phase 4 gate
                                → enemy abilities (S19) → disable matrix (S20) → tiers, roster, boss (S21) → gate and handover (S22)  ══ phase 5 gate
                                  → map spec, hero push share, tier experience, bounded placement (S25)
                                    → map choice, checkpoints, packs that sleep again (S26)
                                      → enemies home while the hero is dead, checkpoint jump and marker, feedback file, replace-a-spell (S27)
                                        → the long road, obstacle views by camera, the cap on the road (S28)
                                          → the maintainer's playtest, triage, bucket (S29) → bucket, gate (S30)  ══ phase 6 gate
```

---

## Why each link holds

| This waits for | Because |
| --- | --- |
| Movement (S02) waits for the order machine (S02, first ticket) | A move is an order; the state machine decides whether the unit is Turning or Moving before the movement system integrates anything |
| The render benchmark (S02) waits for the shape atlas (S02) | The benchmark drives atlas quads. It is placed this early on purpose: ADR 0001 is gated on it, and finding out in sprint 05 that the quad batch does not hold would waste three sprints of views |
| Push-out (S03) waits for the spatial hash (S03) | Unit-versus-unit separation over 300 units without the hash is 45,000 distance checks per pass |
| A* (S03) waits for the map definition and the walkability grid (S03) | A* searches the inflated grid; there is no grid before the arena exists as data |
| The orb buffer's Whorl passive (S04) waits for the stats modifier stack (S04, first ticket) | The spec's AT-M4 asserts +1.8% speed from three Whorl instances; that is a modifier source, not a special case in movement |
| The cast-point skeleton (S04) waits for the cooldown pipeline (S04) | AT-I6 and AT-I7 assert clocks that start at commit and survive eviction |
| The HUD (S05) waits for the kit descriptors in the world view (S04) | The HUD draws six slot descriptors from the active kit; it never names Invoke |
| The input mapper (S05) waits for the command union (S02) | It emits commands; it cannot be tested until the union exists |
| The developer panel (S06) waits for the debug command union (S06, first ticket) and the instrumentation rings (S01) | Every control is a command; every readout is a ring |
| The replay determinism test (S06) waits for the input log (S01) and every phase-1 system | It replays a real session; it only proves anything once there is a session worth replaying |
| The stress test (S06) waits for movement, push-out, pathing, and a spawn debug command | Three hundred units with random orders need all four |
| The content registry (S07) waits for the definition types (S07, same ticket) and precedes every spell | A definition written before its schema is a definition rewritten |
| The spell catalogue (S07, first ticket) precedes the pipeline (S07) | The catalogue decides which primitives exist. Building primitives first and then discovering Updraft needs "carry units along a path" is a rewrite |
| Damage and mitigation (S07) precede the damage-area primitive (S08) | A primitive that applies damage needs the rule for what armour does |
| Statuses and disable flags (S08) precede the validator's refusals for silence, stun, root, disarm | The validator reads flags the status system computes early in the tick |
| The zone entity (S08) precedes Glacier, Siphon, Updraft, Zenith, Bolide (S10, S11) | Five of the ten spells are zones |
| Projectiles (S09) precede the auto-attack (S09) and Emberling's attacks (S11) | Both fire homing projectiles |
| The training dummy (S09) precedes every spell test in the arena (S10, S11) | A spell needs something to hit; the dummy is the first enemy definition, with the stationary behaviour and nothing else |
| The on-damage status hook (S10) precedes Hoarfrost (S10) and the stun bash (S19) | Both are "when this unit takes damage, do X" |
| Enemy definitions (S12) precede the AI state machine tests (S12) | A behaviour is tested by spawning an archetype |
| The AI state machine (S12) precedes enemy death and experience (S13) | Dead is a state |
| Enemy views (S13) precede the 200-enemy measurement (S15) | The render half of the bar needs 200 bound views |
| The damage-type matrix (S14) precedes tuning (S17) | Tuning numbers whose mitigation is wrong is wasted |
| The tuning surface (S17) precedes the balance pass (S17, next ticket) and phase 5's numbers | Phase 5 archetypes are tuned through the same surface |
| Enemy abilities (S19) precede the disable matrix (S20) | The matrix tests the hero suffering every status; the abilities are how it suffers them |
| The disable matrix (S20) precedes tiers and the roster (S21) | A boss that silences is only correct once the matrix says what silence does |
| The long road's spec (S25) precedes its definition (S28) | Regions, packs, checkpoints, and the experience budget are decided and approved on paper before 150 rectangles and fifty packs are typed; a budget found wrong in data is a map rewritten |
| The tier experience multiplier (S25) precedes the spec's approval and the map (S28) | The budget's arithmetic reads elite and boss kills at 3 and 10; without it an elite pays a grunt's experience and the road cannot reach level 10 at the numbers the spec shows |
| The hero's push share (S25) precedes everything after it in the phase | It records five stored logs again; every later ticket that moves the content version re-stamps on top of it rather than under it, and the maintainer tests it in the playtest |
| The bounded placement search (S25) precedes sleeping packs (S26) and the map (S28) | A pack that cannot place retries every tick; on a 4000 by 24000 map an unbounded search is some 440 rings a tick, and the map's placement test needs a radius to test against |
| Packs that sleep again (S26) precede the map (S28) | With activation one way, live enemies ratchet to 200 along the road and a region's boss is refused with `enemy_cap_reached`; the map's live-near-point test reads the sleep radius |
| Map choice as a driver operation (S26) precedes the feedback file (S27) and the map (S28) | A feedback file and the playtest log load on their own map; the panel is how the long road is chosen |
| Checkpoints (S26) precede the jump, the marker (S27), and the map (S28) | The jump and the marker read the map's checkpoint list; the map's path test runs through the checkpoints in order |
| Enemies going home while the hero is dead (S27) precedes the playtest (S29) | Without it every chaser paths the length of the map to the respawn point after a death, which is R4's cost at once and a crowd waiting at the checkpoint |
| Every playtest tool (S27) and the map (S28) precede the playtest (S29) | The maintainer plays once, thoroughly; a tool missing on that day is feedback lost |
| The triage (S29) precedes every bucket ticket (S29, S30) | Tickets are sized after the notes are read, not before |

---

## What can run in parallel

Only relevant if a second engineer appears. With one engineer the order above is the order.

| Track A | Track B | From |
| --- | --- | --- |
| Domain: movement, collision, pathing, Invoke (S02–S04) | Presentation: atlas, benchmark, views, camera, HUD shell (S02, S05) | Sprint 02 |
| Pipeline and primitives (S07–S09) | Spell catalogue, spell definitions, previews, atlas frames (S07, S10) | Sprint 07 |
| AI state machine and behaviours (S12) | Enemy views, overlays, damage numbers at scale (S13, S14) | Sprint 12 |
| AI, death, and experience (S12, S13) | The isometric view (S23, S24) | Sprint 12 |
| Enemy abilities (S19) | Roster definitions and catalogue (S21) | Sprint 19 |
| Map choice, checkpoints, sleeping packs (S26) | The feedback file and obstacle views by camera (S27, S28) | Sprint 26 |

A second engineer does not shorten phase 0, phase 4, or any gate sprint.

---

## Things that look like dependencies and are not

- **Enemies do not depend on all ten spells.** Phase 3 could start after three spells, one per damage type. The plan keeps phase 2 whole because the roadmap does and because the pipeline is cheapest to finish while it is in one head. The re-cut is in [Deferred](./backlog/deferred.md).
- **The HUD does not depend on spells.** It draws slot descriptors. Phase 1 stubs fill them.
- **The developer panel does not depend on enemies.** Sprint 06 ships a generic spawn-unit debug command for the stress test; the archetype dropdown arrives with archetypes in sprint 12.
- **Replay does not depend on the panel.** The log is recorded from sprint 01. The panel adds a save and load button.
- **The playtest tools do not depend on the long road.** Checkpoints, sleeping packs, the jump, and the feedback file are built and tested on fixture maps and the arena; the long road is only their first real user.
- **Spell swaps do not depend on refactoring the shared specs.** A swap moves only the named spells' fixture uses; nothing is refactored ahead of the feedback that names them.
- **The obstacle views do not depend on the map.** Binding by the camera is tested on a fixture with more obstacles than the pool.
