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
                                            → restamp, full-state comparison and checksum, lint and type holes, exhaustiveness (S45)
                                              → stats for every unit, the modifier table, orders by the state machine, presentation stops deciding (S46)
                                                → unit sub-records, registry descriptors, AI split and world scratch, the event record's decision (S47)
                                                  → overlays split and gated, view syncers, branded ids, two decision records, the draw index (S48)
                                                    → narrow doors, the map change as a command (S49)
                                                      → the capture layer and pause screen, docs, bucket, gate (S50)  ══ phase 7 gate
                                            → the long road at Diablo II density, a level on every map, the crowd's push at 0.1 (S39, run first)
                                            → checkpoint reach at 256, item catalogue, the architect's placement and first-screen decision, item schema (S31)
                                              → ground item kind and pool, loot on death on a draw of its own, item level from the map level, font (S32)
                                                → run-scope inventory of sized items and armory commands, gold and globes on walk-over, ground views and labels (S33)
                                                  → the pick-up order by a right click (S40)
                                                    → armory as a modifier source with magic damage %, the first screen, the inventory and armory screen (S34)
                                                      → rarity and affixes, the bases, moving an item on the grid (S35)
                                                        → tooltips, the store and its screen, panel loot controls (S36)
                                                          → drop-rate balance, the maintainer's playtest, bucket (S37) → docs, gate (S38)  ══ phase 8 gate
                                                            → the active-item bank and keys, the disable column, the eight actives (S41–S44, sketched)  ══ phase 9 gate
                                                              → the descent: about a hundred generated levels, a bet of its own
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
| The safety net (S45) precedes every other phase 7 ticket | A refactor is judged by the full-state comparison and the checksum; one done before them is a refactor nobody can prove left behaviour alone |
| Stats for every unit and the modifier table (S46) precede the unit's sub-records (S47) | The sub-records and the one stat key list are cut around the table's final shape; cut first, they are cut twice |
| The unit's sub-records (S47) precede branded ids (S48) | The ids are branded on the fields the sub-records hold |
| Module-level state moved to world scratch (S47) and branded ids (S48) precede the narrow doors (S49) | The doors export the scratch-taking signatures and the branded types; narrowed first, they are narrowed twice |
| The first-screen decision record (S48) precedes the capture layer (S50) | Phaser or DOM decides what the layer claims across |
| The phase 7 gate precedes phase 8, sprint 39 first | The maintainer's decision of 2026-09-27: loot lands on a foundation it does not have to reshape as it grows. Sprint 39's re-stamps and re-recordings are the first to run through `pnpm restamp` and the checksum |
| `pnpm restamp` and the narrow stamp (P7-S45-T01) precede every loot re-stamp, and P8-S32-T04 above all | The narrowed stamp is what lets the atlas grow without re-stamping; every re-stamp in phase 8 is the script's |
| The full-state comparison (P7-S45-T02) precedes P8-S32-T02 and P8-S35-T01 | Their proof that loot never moves a fight is that comparison with the tables on and emptied, extended to ground items, the inventory, and gold |
| The modifier table (P7-S46-T02), stats for every unit (P7-S46-T01), the one stat key list (P7-S47-T01), and the item-placement record (P7-S48-T04 (a)) precede P8-S34-T01 | The armory's rows go where record (a) puts them, a run-scope table or every unit's table with a source identity, and P8-S34-T01 builds that; magic damage % is one more key and the attacker-side read (architect review, 2026-09-27) |
| The checksum's canonical sequence (P7-S45-T02) precedes the unit's regrouping (P7-S47-T01) and the order's tagged target (P7-S48-T03), and the walk goal named apart from the target (P7-S46-T03) precedes the tagged target | Each layout change updates the checksum's accessors and keeps its sequence, since a layout change that moved a stored checksum would be indistinguishable from a behaviour change; and no tag has to hold both a unit and a point (architect review, 2026-09-27) |
| The syncer list (P7-S48-T02) precedes the overlay split and gate (P7-S48-T01) | The overlays are gated by being registered on the list only in the panel build (architect review, 2026-09-27) |
| The map change as a command and the session's move (P7-S49-T02) precede the narrow doors (P7-S49-T01) | The simulation's door is narrowed once, around the session it ends with (architect review, 2026-09-27) |
| The registry descriptors (P7-S47-T02) precede P8-S31-T03 | Four item kinds at three files each, rather than about forty edits |
| The event record's decision (P7-S47-T04) precedes P8-S31-T02 and P8-S32-T02 | The architect places loot's events on the record as decided |
| Shared quad runs, pool sizes in one place, and view syncers (P7-S48-T01, T02) precede P8-S33-T03 | Ground views and labels register as syncers and draw from the shared pool |
| Branded ids and the tagged order target (P7-S48-T03) precede P8-S32-T01 and P8-S40-T01 | A ground item has its own brand, and `pick_up`'s target can never resolve as a unit |
| The two decision records (P7-S48-T04) precede P8-S31-T02, P8-S33-T01, and phase 9's sprint 41 | Where items live and item identity, including what phase 9's item cooldowns need, and the first screen, are decided before placement builds on them |
| The draw index (P7-S48-T05) precedes P8-S32-T02, P8-S35-T01, and P8-S36-T02 | A drop, its affixes, and a store's stock draw many numbers at one key |
| The narrow doors (P7-S49-T01) precede every loot screen (S34, S36) | A screen reads items through the queries door and cannot reach a mutator |
| The map change as a command (P7-S49-T02) precedes P8-S33-T01 | The run-scope inventory survives a map change only once the production path keeps run scope |
| The capture layer (P7-S50-T01) precedes P8-S34-T02 | The inventory's frame is the layer's second consumer |
| The long road at Diablo II density (S39) precedes the catalogue (S31) and every loot ticket | The catalogue's economy, the three Legendary bosses, the map level an item level reads, and the balance are all the new road's; tuned on the old road they would be tuned twice |
| A level on every map (S39) precedes item level (S32) | An item's level is its map's level (Q89) |
| The crowd's push at 0.1 (S39) precedes the loot tickets' re-stamps | It records the crowd logs again; every later content-version move re-stamps on top of it |
| The inventory (S33) and the ground views (S33) precede the pick-up order (S40), which precedes the inventory screen (S34) | The order takes an item into a cell where it fits and resolves a right click against an item's icon and label; the screen needs items in the inventory to show |
| The item catalogue (S31) precedes the schema (S31) and every item ticket | The catalogue decides which slots, stats, affixes, and drop rules exist; a schema written first is a schema rewritten, R7's lesson |
| The architect's placement and first-screen decision (S31) precede the schema, the ground item, and every screen | Where an item lives across run and map scope, how the loot draw is keyed, and whether a screen is Phaser or DOM each change three or more tickets downstream |
| The ground item (S32) precedes the loot roll (S32) | A drop is a ground item; the roll has nowhere to put what it rolls without the pool |
| Loot on death on its own draw (S32) precedes pickup (S33) | Determinism is proved while no stored log can pick anything up, so a replay failure in S32 is the draw and never a fight moved by a globe |
| Item level from the map level (S32) precedes the armory commands (S33) | An equip is refused on the requirement, which reads the item level |
| The font's space (S32) precedes the labels (S33) | A label is the item's name, and every base's name has a space |
| The inventory and the armory commands (S33) precede the pick-up order (S40) | An item taken from the ground goes into the inventory where it fits |
| The armory commands (S33) precede the armory as a modifier source (S34) | A source is added by an equip and removed by an unequip |
| The first screen's frame (S34) precedes the inventory screen (S34), tooltips, and the store's screen (S36) | Each is drawn in the frame and relies on its click claim |
| The armory's modifier source (S34) precedes affixes (S35) | An affix is a row the source adds; testing one needs the source |
| The inventory screen (S34) precedes moving an item on the grid by its size (S35) | The move is a gesture drawn in the screen |
| The catalogue's approval (S31) precedes the bases (S35) | Twenty bases are typed from the approved page |
| Rarity (S35) precedes the store (S36) | A price is a base's value by its rarity's multiplier |
| Every loot ticket (S39, S31–S36, S40) precedes the balance (S37), and the balance precedes the playtest (S37) | The maintainer plays once, thoroughly, on rates already tuned headless on the new road |
| Phase 8's gate precedes phase 9 | An active item is bought in the store, sits in the inventory, and is equipped through what phase 8 builds. Corrected 2026-09-27: it read "a Legendary item: it drops", which Q84's answer overturned |

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
| Rules and god objects in the domain (S46, S47) | The overlays, view syncers, and the capture layer (S48, S50, presentation) | Sprint 46, once sprint 45's net holds |
| Loot, inventory, armory stats, rarity, the store's rules (S32–S36, domain) | The font, ground views and labels, the first screen, the inventory, tooltips, the store's screen (S32–S36, presentation) | Sprint 32, once the architect's decision holds |

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
- **Loot does not depend on the descent.** Drops, pickup, and the store run on the long road; each generated level, when it comes, is one more map with packs and a level.
- **The store does not depend on a town.** It is a rule on a checkpoint the map already has.
- **Phase 8 does not depend on the Kit fix.** Nothing it builds is cast from a key; phase 9's bank beside the kit is how that phase avoids it too, and its architect ticket says if it cannot.
- **Loot does not depend on an ECS, packages, or behaviour trees.** Phase 7 fixes what loot grows and stops there; each of those is a Deferred row behind its own door.
- **The descent's generator does not depend on phase 7.** The map change as a command is all the descent needs from it now; the generator's port is the descent's.
- **Rarity does not depend on the bases.** Affixes are rolled and tested on the fixture bases; the twenty real ones come after, from the approved page.
