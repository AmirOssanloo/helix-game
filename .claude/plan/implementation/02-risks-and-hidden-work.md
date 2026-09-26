# Risks and hidden work

**Written:** 2026-09-20 · **For:** leadership deciding what to watch, and the engineer deciding what to test first

Each row names the thing that could go wrong, the earliest sprint where we find out, what we do about it, and the ticket that carries the mitigation. Rows are ordered by how much of the plan they can move, not by how likely they are.

---

## Risk register

| # | Risk | Found in | Blast radius if it lands | Mitigation | Ticket |
| --- | --- | --- | --- | --- | --- |
| R1 | The Phaser 4 quad batch does not hold 60 fps at 500 quads on the reference laptop | S02 | Every presentation sprint; ADR 0001 reopens | Benchmark scene is the fourth ticket of the plan's third sprint, before a single view exists. First failure gets the sprint buffer; second failure is an ADR conversation, not a code change | P1-S02-T04 |
| R2 | The tick is over 4 ms at 300 units with pooled plain objects | S06 | Two sprints for a typed-array rewrite of every unit system, before phase 2 | Stress test in CI from sprint 06; profile before rewrite; pool object shape kept flat and field-stable from sprint 01 so the rewrite is mechanical | P1-S06-T03 |
| R3 | Disc push-out jitters or tunnels at a 50-unit pile-up in the corridor | S03, again S15 | Packs in corridors look broken; ADR 0002 names this as owned code | Capped passes starting at three; a corridor pile-up simulation test; half a day of buffer in S15 for it. Bit mildly in S15, 2026-09-24: no disc ever entered a wall, but at three passes the press put two runners 99% into each other; the cap moved to four, and the push rule itself is [Q31](./backlog/open-questions.md) | P1-S03-T02, P3-S15-T04 |
| R4 | Re-pathing 200 chasers blows the tick the moment the hero moves | S15 | Phase 3 gate | Re-path budget as a tunable from S03; hero served first; profile in S15 with the budget as the first knob | P1-S03-T04, P3-S15-T01 |
| R5 | Determinism leaks: a `Map` iterated in history order, a sort without a tie-break, a clock read | Any sprint from S06 | A replay diverges and every bug report becomes a guess | Lint bans the obvious; the replay test runs in CI from S06 and on every domain or simulation change; flaky test policy treats a flake as a determinism bug | P1-S06-T03 |
| R6 | Allocation on the hot path that lint cannot see: a closure, a spread, an array literal in a system | Any sprint | Collector pauses under load; the heap row of the bar fails | Pool-miss counter and heap readout in the panel from S06; allocation sampler pass at every gate; index loops as a review habit | P1-S06-T02, gates |
| R7 | The definition schema changes after several spells are written | S10 | Rewriting definitions and tests | Spell catalogue first (S07 T01), schema second (S07 T02), then all primitives (S08), then spells (S10). No spell is written before the primitive it needs exists | P2-S07-T01 |
| R8 | Named effects with rich per-cast state are larger than a day each (Updraft carrying units, Glacier segments, Bolide rolling) | S11 | Phase 2 slips a sprint | These three are sized 1.5 days together and sit in their own sprint with the gate; the gate ticket is the buffer | P2-S11-T01 |
| R9 | The "status reacts to damage" hook needed by Hoarfrost and the stun bash is a new pipeline capability nobody designed | S10 | Hoarfrost ships as a special case | Designed in the spell catalogue (S07), implemented once as a status hook in S10, reused in S19 | P2-S10-T01 |
| R10 | Draw calls cannot be read from the Phaser 4 renderer without touching internals | S06 | The draw-call readout lies or does not exist; ADR 0001's gate is unverifiable from the panel | Retired 2026-09-20 (Q4): every draw in Phaser 4.2.1 goes through two public renderer methods, `drawElements` and `drawInstancedArrays`, which a presentation module wraps and counts between the renderer's pre-render and post-render events. Reopens only if a Phaser release adds a draw path that bypasses them; the bench frame is checked against the WebGL inspector at each gate | P1-S06-T02 |
| R11 | Phase 1 acceptance test AT-O4 needs a channel to interrupt, and nothing channels until phase 2 | S04 | A gate row cannot go green | A `begin_channel` debug command puts the hero into Channeling for N ticks; it is the only way to channel until an ability does | P1-S06-T01 |
| R12 | Summon expiry contradicts between pages: the ability pipeline page says a summon keeps its lifetime when the owner dies; the spells and enemies pages say it expires | S09 | One wrong test, one wrong page | Retired 2026-09-20 (Q1): the summon expires on the same tick, and the architecture page was corrected with the answer | P2-S09-T02 |
| R13 | The generic tuning surface for definition fields (every number in every definition as a slider) is bigger than a sprint | S17 | Phase 4's "no code change" gate | Scope is numeric fields only, with a key of definition id, field, and index; the panel generates sliders from the registry. Non-numeric fields are out | P4-S17-T01 |
| R14 | Content hot-reload that swaps the registry in a running world diverges from the replay log | S17 | Replays recorded across a reload are invalid | The log carries a content version; a replay against a different version is refused with a message; hot reload is a development convenience, never a replay feature | P4-S17-T03, T04 |
| R15 | Four-browser verification needs a person and the reference laptop | Every gate | A gate row unverifiable | Gate tickets carry the browser matrix as manual steps with a place to record numbers; Safari's WebGL differences are the known unknown | Gate tickets |
| R16 | One engineer. Illness or a week away moves everything | Any | Calendar, not scope | The plan is in sized tickets with acceptance criteria so a second person or a delegated role can pick one up; nothing is in one head | This folder |
| R17 | Documentation obligations in the definition of done (world model, where to look, feature pages) are forgotten under pressure | Any | Docs drift from code within a phase | Each phase's last sprint carries a docs-sync ticket; the DoD row is on every ticket that adds a kind or a definition | Each gate sprint |
| R18 | The Phaser 4.2.1 pin meets a bug we need fixed upstream | Any | A `pnpm patch` or a wait | ADR 0001 names the patch route; the benchmark is rerun after any upgrade, which is a ticket, not a habit | Gate tickets |
| R19 | The isometric ground layer, two nested containers, breaks the quad batch in Phaser 4.2.1 or composes rotation and non-uniform scale in the wrong order | S23 | About 1.5 days: every view projected by hand, rectangles baked as diamond frames | Found on the first day of the ticket by counting draws and checking a projected cell's corners against the projection module; stop and hand to the engineering architect before working around it | P3-S23-T01 |
| R20 | The isometric view changes how spells feel with no number moved: a range reads longer across the screen than down it | S24 | Retunes of ranges and pushes the phase 2 walk had approved | The maintainer walks all ten spells in the view; each retune is a ticket of its own so the view and the numbers never change in one commit | P3-S24-T03 |
| R21 | Added 2026-09-26. On a long map a woken pack never sleeps, so live enemies ratchet to 200 and a later pack, a region's boss, is refused with `enemy_cap_reached` and nobody sees it | S26, again S28 | The long road cannot be played to its end; the playtest reads wrong difficulty | Packs sleep again once idle at home at full health and the hero is past a sleep radius, keeping their survivors; a content check bounds the enemies near any point; the long-road stress case asserts no refusal on a full walk | P6-S26-T03, P6-S28-T03 |
| R22 | Added 2026-09-26. A pack's placement search is unbounded, about 440 rings on the long road, and retried every tick while the pack waits | S25 | A tick spike wherever a pack is walled in | A placement-radius tunable and a content test that every pack places on its empty map | P6-S25-T04 |
| R23 | Added 2026-09-26. R4 reopens at map size: chasers path to a respawn point the length of the map, and A* searches up to about 94 000 cells | S27, S28 | The tick budget on the long road | Enemies go home while the hero is dead; the long-road stress case prints the most A* expansions a tick; an expansion cap only if that profile says so, handed to the engineering architect first | P6-S27-T01, P6-S28-T03 |
| R24 | Added 2026-09-26. The playtest finds more than the plan can absorb: sprint 11's one thorough walk found 5.75 unplanned days | S29 | Phase 6 grows without a cut-line | A bucket with an appetite of four sized days in a stated priority order; the surplus goes to Deferred; the gate needs feedback filed and triaged, not every note built | P6-S29-T02 |
| R25 | Added 2026-09-26. A spell swap reaches far into the tests: 347 references in 38 files, shared specs using real spells as fixtures, and `balance-spells.json` recorded again | S29, S30 | A swap sized at a day and a half takes three | The replace-a-spell runbook and the recipe check before the playtest; a swap moves only its named spells onto fixture spells; at most two swaps fit the bucket | P6-S27-T05, bucket tickets |
| R26 | Added 2026-09-26. Hand-authoring 150 rectangles and fifty packs by coordinate: a walled pack, a broken path, a crowd too dense at one point, a budget off | S28 | The map ticket runs over, or the playtest finds a broken road | The spec's tables first; content tests for placement, the path through the checkpoints, live enemies near any point, and the experience budget; no map editor | P6-S25-T01, P6-S28-T01 |

---

## Hidden work, surfaced

Work that no roadmap bullet names but that must happen, with the sprint that carries it. Most of it is why a "small" phase has five sprints.

| Hidden work | Why it is easy to miss | Sprint |
| --- | --- | --- |
| Lint allow-list, restricted globals, Shape and Graphics bans, Readonly cast ban, optional-property and non-null bans | "Just ESLint" is five custom rule blocks and an architecture test that reads the source tree | S00 |
| Seconds-to-ticks conversion at registry load, once | Every definition number passes through it; forgetting it once puts a tick rate in a rule | S07 |
| Generational id packing and stale-id resolution | Every cross-entity reference in every system uses it; it is on the first day, not when the first bug appears | S01 |
| The event ring's overwrite counter | Without it a dropped floating number is invisible; with it the panel shows a bug | S01 |
| Previous-position copy at the top of every tick | Interpolation needs it; a freshly bound view needs it to not pop | S01 |
| Command ordering by timestamp then Q W E R D F | Two keys in one frame must resolve the same way on replay | S01 |
| Input received while the tab was hidden must be discarded, not replayed | Otherwise a resumed tab dumps thirty orb presses | S01 |
| The kit registry and slot descriptors, before any HUD | The HUD draws descriptors; Invoke is a kit resolved by key; building the HUD first hard-codes Invoke | S04 |
| Hidden cooldown map for evicted spells | AT-I6 asserts it; it is state on the hero that survives death only by being cleared on purpose | S04 |
| Hero death and respawn with cooldown clearing | The developer panel's "kill hero" needs a death state in phase 1 | S06 |
| Content version stamp in the input log | A replay against changed definitions must refuse, not diverge | S06, S17 |
| The training dummy as the first enemy definition and the stationary behaviour | Phase 2 needs a target; the enemy definition type arrives two sprints before enemies | S09 |
| Cone atlas frames baked per angle | Clarion needs one; a new cone angle is a new frame, never a parameter | S10 |
| A second quad pool for elite outlines | ADR 0001 says an outline is a second quad; the enemy view pool is two pools | S13 |
| Dormant pack activation on the arena, where every pack is live | The door is kept open by a rule with a test, so a larger map later costs no rewrite | S13 |
| View pool sized to the screen, bound by camera rectangle | 200 enemies with 512 views bound is a render-time failure; binding by rectangle is the fix and must exist before 200 are measured | S14 |
| Damage numbers recycled early when the pool is full, never dropped silently | HUD page's edge case; a one-line rule that is a bug if forgotten | S14 |
| Replay tests from every bug found at a gate | The DoD demands it; the gate sprint has to carry the time | Gate sprints |
| World model and where-to-look rows for every new entity kind or definition kind | The obligation is attached to the edit; the docs-sync ticket catches the misses | Gate sprints |
| ADRs for decisions taken during the phases | Summon expiry, the on-damage hook, the tuning key format each qualify | S22 |
| Every new tunable and the new map move the content version, and the six stored logs are re-stamped each time; Q31 records five of them again | "Add a tunable" reads as one line; the log rule in the testing standard makes it seven files | S25 to S28, S30 |
| `resetMapScope` restoring the map's spawn point and clearing the checkpoint | Checkpoints write the hero's spawn point, which is run scope; without the reset a map load starts at the last map's checkpoint | S26 |
| A sleeping summoner's adds | ADR 0007 ends them with their owner; a sleep must end them without a death or experience, and not count them as survivors | S26 |
| The build's commit in the feedback file | A log replays only on its commit; a note with no commit is a note nobody can reopen | S27 |
| The mapper ignoring keys while the note field has focus | Typing a note would otherwise press orbs and move the hero | S27 |
| Obstacle views, the walkability overlay, and the floor at map size | 64 obstacle views bind every obstacle at load; an overlay drawn per cell of a 94 000-cell grid is a render failure only a long map shows | S28 |
| The playtest build booting on the long road | The published build boots on the arena; the maintainer should not need the panel to start | S29 |
