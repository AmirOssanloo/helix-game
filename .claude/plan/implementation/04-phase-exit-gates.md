# Phase exit gates

**Written:** 2026-09-20 · **For:** whoever closes a phase

The roadmap's "done when" for each phase, turned into rows a person can tick with a named test or a recorded number. A phase closes when every row holds. "Not yet" is an honest answer; "we'll fix it in the next phase" closes nothing. The one exception on record: the reference-laptop half of the bar for phases 1 and 2, which the maintainer deferred to the phase 5 gate on 2026-09-23 for want of the machine, and which that gate carries as a row of its own.

Every gate includes the bar. It is repeated once here so no gate can forget a row. Since the maintainer's standing instruction of 2026-09-27, every row of it is an agent's: headless in Node, or in Chrome on the development machine, an Apple M1 laptop, through browser automation. Firefox, Safari, Edge, and a reference laptop are not measured, and no gate from phase 6 on asks for them.

---

## The bar, every phase

| Row | Holds when | Evidence |
| --- | --- | --- |
| Frame rate | 60 fps stable in Chrome on the development machine, an Apple M1 laptop; changed 2026-09-27 from the reference laptop in four browsers | Panel readouts read by an agent through browser automation, 30 seconds at the phase's live cap |
| Simulation tick | Under 4 ms worst case at the phase's live cap | Panel tick max readout; stress test green in CI |
| Presentation sync | Under 1 ms | Panel sync readout |
| Phaser render | Under 6 ms, under 5 world draw calls | Panel render and draw-call readouts; the draw-call readout checked against the WebGL inspector on one frame |
| Allocations | Zero in tick and sync after warm-up; pool misses zero; heap flat | Panel pool-miss and heap readouts; 30-second allocation sampler recording |
| Determinism | Same seed and input log give the same state | `pnpm test -t "replay"` green; one session recorded during the gate replays identically |
| Tests in Node | Domain, simulation, content, architecture tiers green with no canvas | `pnpm check:ci` green |
| Stress test | 300 units (phase 1) or 200 enemies plus 100 projectiles (phase 3 on) hold the tick budget | `pnpm test -t "stress"` green |
| Render benchmark | Passes per ADR 0001, in Chrome | `pnpm bench` run by an agent through browser automation, numbers recorded in the phase README |

The live cap per phase: phase 0 none; phase 1, 300 units with random orders; phase 2, the hero, 20 concurrent zones and effects, 100 projectiles, one dummy; phases 3 to 5, 200 enemies and 100 projectiles; phases 6 and 7, the same 200 on the long road, woken and put to sleep by the hero's walk; phases 8 and 9, the same, with the ground-item pool at its capacity; phases 10 to 16, the same 200 on a generated map, read on the densest map of each recipe's seed sweep with the ground-item pool full, the kept map standing, and a screen open.

---

## Phase 0 gate

| Row | Holds when |
| --- | --- |
| `pnpm check` green on an empty world | Lint, typecheck, every tier, build |
| A wrong-direction import fails lint and the architecture test | Add one on a branch, watch both fail, delete it |
| `Math.random`, `Date.now`, `performance.now` under `src/domain` or `src/simulation` fail lint | Same |
| A Shape or Graphics factory call under `src/presentation` fails lint | Same |
| A blank Phaser game boots with `maxTextures: 1` and no `physics` key; the architecture test asserts the key is absent | Browser console shows the WebGL banner |
| Canvas fallback shows the warning banner | `window.FORCE_CANVAS = true` then reload |
| A world is created, ticks in Node, records commands into the input log, and disposes with pools empty | `tests/simulation/world.spec.ts` green |
| Pools refuse past capacity and count the miss; a stale id resolves to null | `tests/domain/entities/*.spec.ts` green |
| The driver runs at most three ticks per frame and drops the rest; a hidden tab runs none | `tests/app/fixed-step-driver.spec.ts` green |
| Instrumentation rings exist and are written by the driver | Readable from `window.DevApi.rings` in the console |

---

## Phase 1 gate

| Row | Holds when |
| --- | --- |
| Every acceptance test in the mechanics spec section 16 is green by name | `pnpm test -t "AT-"` shows AT-M1 to AT-M5, AT-C1 to AT-C5, AT-O1 to AT-O5, AT-I1 to AT-I9 |
| No feel requirement in section 15 fails | Walk the thirteen rows of section 15 in the arena by hand, as each row says; record each as pass |
| The 300-unit stress test holds the tick budget | `pnpm test -t "stress"` green |
| The render benchmark passes | Numbers recorded |
| A recorded session replays identically | Record five minutes with the panel open, including a tuning change and a spawn; load it; state matches at every tick |
| Every phase 1 tunable in spec section 17 is a slider that applies on the next tick and lands in the log | Move each, save the log, find it |
| The HUD shows bars, three orb squares in age order, six slot squares from kit descriptors, wedges, mana costs, level and XP | By eye against the HUD page |
| Death and respawn: kill hero from the panel, respawn at the spawn point with full resources and every cooldown cleared, orbs and slots kept | `tests/simulation/hero/death.spec.ts` green |
| The bar | Every row above, at 300 units |

---

## Phase 2 gate

| Row | Holds when |
| --- | --- |
| Each of the ten spells has a definition file under `src/content/spells/` registered in the index | `ls`; the content tier green |
| Each spell has a simulation test per effect at orb levels 1 and 7 | `pnpm test tests/simulation/spells/` shows twenty or more named tests |
| Each spell casts correctly at every orb level | A content test walks levels 1 to 7 for every table; the level-1 and level-7 tests assert numbers |
| Auto-attack and attack-move work against the dummy | `tests/simulation/attack/*.spec.ts` green; by hand in the arena |
| Every status can be applied to the hero from the panel and blocks what the status page says | `tests/domain/orders/validator.spec.ts` covers every disable against every blocked action |
| Domain events drive hit and cast feedback; the HUD sums nothing | Review of `presentation/` shows no health arithmetic |
| The tick holds with 20 concurrent zones and effects | `tests/simulation/stress-zones.spec.ts` green; panel readout with twenty Glaciers and Bolides live |
| The bar | Every row, at the phase 2 live cap |

---

## Phase 3 gate

| Row | Holds when |
| --- | --- |
| Four archetypes plus the dummy exist as definitions and appear in the panel dropdown with no code change | `ls src/content/enemies/`; dropdown by eye |
| Each archetype passes the six standard enemy tests: aggro on sight, aggro on damage, pack sharing, range holding or closing, leash, death with experience | `pnpm test tests/simulation/enemies/` |
| 200 live enemies chase and attack the hero within budget | Spawn 200 from the panel, run for 60 seconds, panel readouts within every row of the bar, in four browsers |
| Spells kill enemies correctly by damage type | `tests/simulation/combat/damage-types.spec.ts` covers physical, magical, pure against each archetype's armour and resistance |
| Experience levels the hero from 1 to 30 | `tests/simulation/hero/experience.spec.ts` |
| Damage numbers, hit flashes, status icons, and every overlay on the developer panel page exist | By eye, each toggle |
| The view is the 2:1 isometric projection at the one chosen scale, with no zoom and the maintainer's floor tile, and the simulation is unchanged by it | By eye; the phase 2 gate session replays identically; `grep -rni zoom src/` |
| The bar | Every row, at 200 enemies and 100 projectiles |

---

## Phase 4 gate

| Row | Holds when |
| --- | --- |
| A designer retunes any exposed number without a code change | Pick three at random: a hero stat, a spell number, an archetype number; change each from the panel; the next cast or spawn reads it; the log holds the change |
| The profile shows headroom on every row of the bar | A headroom table in the phase README: per row, the budget, the measured value at the cap, the margin |
| Hit feedback, knockback, displacement, death handling, experience flow each have their edge-case tests | `tests/simulation/feel/*.spec.ts` |
| A balance pass was run and its input logs are kept | `tests/simulation/replays/balance-*.json` exist and replay |
| Content hot-reload works for a definition edit, and a replay against a changed content version is refused with a message | By hand |
| The bar | Every row, with the margin recorded |

---

## Phase 5 gate

| Row | Holds when |
| --- | --- |
| Every enemy ability is an ability definition cast through the pipeline; nothing enemy-specific was added to the pipeline | Review of `domain/abilities/` diff since phase 2; content tier green |
| The disable matrix exists as data, and every cell is a test | `pnpm test tests/domain/orders/disable-matrix.spec.ts` shows one test per cell |
| Elite and boss tiers multiply health and add abilities; a boss is stunned like a grunt | `tests/simulation/enemies/tiers.spec.ts` |
| The roster is complete per the enemy catalogue | `ls src/content/enemies/` matches the catalogue |
| A boss encounter with adds runs within budget alongside 200 enemies | Panel readouts, four browsers |
| The docs are in sync: world model rows, where-to-look pointers, feature pages, any ADR taken during the phases | The docs-sync ticket's checklist |
| The reference-laptop rows carried from phases 1 to 4 hold | Every row under [Deferred](./backlog/deferred.md) that waits on this gate is recorded with numbers: the phase 1 and phase 2 bars, the phase 3 and phase 4 browser and by-hand rows, M1's bench, and the benches deferred since sprint 12 |
| The bar | Every row |

---

## Phase 6 gate

Added 2026-09-26. The long road is a playtest map, so the gate holds the map, the cap on it, the push rule the maintainer asked to test, and the playtest itself. The bar's browser rows are the maintainer's, with the figures written down this time rather than approved in words, as the retrospective's governance change asks.

| Row | Holds when |
| --- | --- |
| The hero can walk the long road from the spawn at level 1 to the last boss and reach about level 10 | `tests/content/maps.spec.ts`: a path for the hero's radius class through every checkpoint in order to the last boss; `tests/content/catalogues.spec.ts`: the map's experience at each tier's multiplier reaches 5550 at the last boss's kill and stays under 6520; the maintainer's session in `tests/simulation/replays/long-road-playtest.json` reached the last boss, with the level at its kill recorded |
| Every pack on the long road places | `tests/content/maps.spec.ts`: every pack places on the empty map within the placement radius |
| Live enemies never pass the cap, and no pack is refused silently | The long-road case of `tests/simulation/stress.spec.ts` green under `pnpm test:budget`: at or under 200 at every tick of a full walk, no `enemy_cap_reached`, the packs behind asleep; `tests/content/maps.spec.ts`: no point on the road has more enemies within the sleep radius than the spec's bound |
| The hero takes the smaller share of push-out (Q31) | `tests/domain/movement/collision.spec.ts` green, the even split pinned at 0.5; `tests/simulation/corridor-200.spec.ts`: at the default share of 0 the press carries the hero less than 20 units in fifteen seconds (Q57), with the overlap bar kept |
| Death comes back at the furthest checkpoint; packs sleep and wake with their survivors | `tests/domain/map/checkpoint.spec.ts`, `tests/simulation/hero/death.spec.ts`, `tests/simulation/enemies/dormancy.spec.ts` green |
| The playtest session replays identically | `tests/simulation/replays/long-road-playtest.spec.ts` green on the final content version; every feedback file loads and stops at its tick on the playtest's commit |
| The maintainer has played the long road and filed feedback, and it is triaged | The dated feedback files and the triage note under `notes/`; every note has an outcome; the bucket's days spent and what went to Deferred are in the phase README |
| The docs are in sync | P6-S30-T02's checklist |
| The bar | Every row, at 200 enemies on the long road: the tick headless from the long-road stress case in a production build; frame rate, sync, render, and world draw calls at the densest choke in Chrome, written as figures in the phase README. The Firefox, Safari, and Edge half on the reference laptop was dropped for good by the maintainer's standing instruction of 2026-09-27 |

---

## Phase 7 gate

Added 2026-09-27, when the maintainer inserted the foundation phase before loot. Behaviour is unchanged by construction, so the gate holds the build to what it did before, not to anything new. The one new behaviour is the pause screen. There is no playtest row: the stored logs and their checksums judge what play would, and an agent checks the pause screen in Chrome.

| Row | Holds when |
| --- | --- |
| The stored logs replay unchanged with no re-stamp | The seven logs under `tests/simulation/replays/` (the six, and the phase 6 `long-road-playtest.json`, which P8-S39-T01 retires after this phase) keep the stamp P7-S45-T01 wrote; `git log` on them shows no stamp change after that ticket; each checksum re-record names the ticket and the intended change that made it |
| The per-tick state checksum holds | `tests/simulation/replay-determinism.spec.ts` green: every stored log matches its checksums at every stored tick; `tests/simulation/replay/state-checksum.spec.ts`: a one-step change to any field of any pool, run scope, or map scope moves it; `tests/simulation/replay/map-change.spec.ts`: a log with map changes replays identically |
| `pnpm check` green | Lint, both typechecks (the DOM-free one for domain, simulation, and shared included), every test tier, the stress tier, and the build |
| No file under `src/` over about 500 lines but a listed exception | `max-lines` at 500 in the lint config; each exception listed there with its reason and copied into the phase README's exit record; expected: `domain/movement/spatial-hash.ts` and the map definitions under `src/content/maps/` |
| A new definition kind touches three files or fewer | `tests/domain/definitions/toy-kind.spec.ts` green, the files counted in the sprint 47 exit |
| Every finding of the proposal of 2026-09-27 is closed or deferred | The phase README's exit record lists each finding with the ticket that closed it, or its row in [Deferred](./backlog/deferred.md) with a reason |
| The docs are in sync | P7-S50-T02's checklist |
| The bar | Every row at 200 enemies on the long road, as phase 6's. The tick headless from the long-road stress case. Zero allocations in the tick and the sync after warm-up, by the allocation sampler over thirty seconds. World draw calls unchanged from phase 6's figures. Frame rate, sync, render, and heap at the densest choke in Chrome on the development machine. All read by an agent through browser automation and written as figures in the phase README, with the render benchmark the same way (standing instructions of 2026-09-27) |

---

## Phase 8 gate

Added 2026-09-26. Loot is measured against the one number the clean run gave: 2 `heal` and 8 `restore_mana` to finish the road. The gate holds the road finished without them, by play and headless, and holds the rest of loot to its tests. A rarity is proved at its weight by rolls, not by one run, since even the grown road of Q58 holds only 100 to 130 kills. Edited 2026-09-27 for the new road and the retired phase 6 log, and again for the later answers: items picked up by a right click, a sized inventory, magic damage %, no +1 to an orb, and the bar in Chrome by an agent.

| Row | Holds when |
| --- | --- |
| The hero walks the long road from level 1 to the last boss's kill with no panel heal or mana | `tests/simulation/replays/long-road-loot-playtest.spec.ts`: the maintainer's session holds no `heal`, `restore_mana`, `level_up`, toggle, or grant, and reaches the last boss's kill, the level at the kill recorded; `tests/simulation/replays/balance-loot.spec.ts`: the driver's walk of the new road does the same with the catalogue's margin; `tests/content/catalogues.spec.ts`: the new road's budget lands the last boss's kill at about level 11 to 13 |
| Every drop kind appears and is taken: gold and globes by walking over or past them, items by a right click (Q87, 2026-09-27) | Both sessions hold at least one pickup each of gold, a health globe, a mana globe, and an item, the item by a `pick_up` order; `tests/simulation/loot/pickup.spec.ts` and `tests/simulation/items/pick-up-order.spec.ts` green; `tests/domain/loot/roll.spec.ts` and `tests/domain/loot/rarity.spec.ts`: every rarity from Common to Mythical at its weight over 10 000 rolls per enemy tier, elites always and bosses Rare or better, each Legendary only from its named boss, no active item in any table |
| Items equip and change derived stats | `tests/simulation/items/armory-commands.spec.ts`, `tests/simulation/items/armory-stats.spec.ts`, `tests/domain/combat/magic-damage.spec.ts`, and `tests/domain/items/inventory.spec.ts` (items placed by their size in cells) green; the maintainer's session holds an `equip_item` |
| The store buys and sells at a checkpoint | `tests/simulation/store/store.spec.ts` and `tests/presentation/store-screen.spec.ts` green, the stock at the hero's level in its three tabs; the maintainer's session holds a `buy_item` and a `sell_item` |
| A recorded session with loot replays identically, and loot never moves a fight | The maintainer's session and `balance-loot.json` each replay into two worlds that agree at every tick; `tests/simulation/loot/drop-on-death.spec.ts`: phase 7's full-state comparison, extended to ground items, the inventory, and gold, finds every pool and every run-scope and map-scope field but the ground items equal at every tick with every loot table on and emptied, the walk-over take held off in the test world since a globe taken moves a fight by design (edited 2026-09-27: was the xorshift stream reading the same, which proves nothing, since nothing in `src/` draws from that stream); every stored log green on the final content version; the phase 6 `long-road-playtest.json` retired by P8-S39-T01 with its note, the maintainer's phase 8 session the long road's reference log in its place |
| The bar holds with drops on the ground | The long-road case of `tests/simulation/stress.spec.ts` under `pnpm test:budget` with the ground-item pool full; `tests/presentation/doors/view-pools-sized-to-the-screen.spec.ts` with a full pool and no view or label miss |
| The maintainer has played it and filed feedback, and it is triaged | The dated feedback files and the triage note under `notes/`; every note has an outcome; the bucket's days spent and what went to Deferred in the phase README |
| The docs are in sync | P8-S38-T02's checklist |
| The bar | Every row, at 200 enemies on the long road with the ground-item pool full: the tick headless; frame rate, sync, render, and world draw calls at the densest choke with drops on the ground and a screen open, in Chrome on the development machine, read by an agent through browser automation and written as figures in the phase README; the render benchmark the same way |

---

## Phase 9 gate

Added 2026-09-26 as an outline. Amended 2026-09-28 for Q98 and Q121, and written in full the same day with phase 9's sprint files, when the maintainer approved the outline.

| Row | Holds when |
| --- | --- |
| Every active item is an ability cast through the pipeline; nothing item-specific was added to it | Review of `domain/abilities/` since phase 8: the activation is a cast whose source is a bank place, and nothing else; `tests/simulation/actives/*.spec.ts`, one per active item at its catalogue numbers, the damaging ones at two hero levels; `tests/simulation/items/activation.spec.ts`; `tests/content/actives.spec.ts` |
| The bank holds by the catalogue's section 7.2 | `tests/domain/items/bank.spec.ts`: the first free place, the full bank to the inventory, one copy, the clock kept across a move and a resale; `tests/simulation/items/bank-passives.spec.ts`; `tests/presentation/inventory-screen.spec.ts`: an item moved between the bank and the grid |
| Q121's rules hold, each read in one place | The self-lift dispels only what enemies applied, and lets Q to R through (`tests/simulation/actives/gyre-sceptre.spec.ts`, `tests/domain/abilities/primitives/dispel.spec.ts`); `invulnerable` takes no damage, no hook, and no hostile status, and `ethereal` takes no physical damage and 40% more magical (`tests/domain/combat/damage.spec.ts`, `tests/simulation/statuses/applying.spec.ts`); a projectile aimed at a blinked or lifted unit hits nothing (`tests/simulation/projectiles/disjoint.spec.ts`); Slipknife is refused while rooted and for 3 s after elite or boss damage (`tests/simulation/actives/slipknife.spec.ts`); enemies hold under a self-lifted hero and take it up on landing (`tests/simulation/ai/transitions.spec.ts`); `tests/content/statuses.spec.ts`: only the named statuses carry `invulnerable` or `physical_immune`, and only `gyre_lift` uses `dispel` |
| The disable matrix covers the six keys, the self-lift, and `ethereal` | `tests/domain/orders/disable-matrix.spec.ts`: one test per cell of the active-item column and of the self-lift and `ethereal` rows |
| The six keys resolve in the extended tie-break order, and Space never scrolls the page | `tests/presentation/input-mapper.spec.ts`; in Chrome by an agent through browser automation, recorded in sprint 42's exit |
| A right click picks a unit before an item, and an item first while Alt is held | `tests/presentation/pick-order.spec.ts` and `tests/presentation/input-mapper.spec.ts` |
| Active items are bought in the store's Misc tab at their price and never drop | `tests/simulation/store/store.spec.ts`; `tests/domain/loot/roll.spec.ts` over 10 000 rolls per tier finding none in any table |
| The long road throws `stun_bolt` and is still finished by the driver | `tests/simulation/abilities/stun-bolt.spec.ts`; `balance-loot.json` recorded again with the bolt and green, the margin recorded; every other stored log unchanged, or re-recorded by a named ticket whose moved checksums were traced |
| Phase 8's build is served at its own address | `https://amirossanloo.github.io/helix-game/playtest-phase-8/` serves the build stamped `19fd7dc`, checked by an agent |
| The maintainer has played the long road with active items, the session replays identically, and the feedback is triaged | `tests/simulation/replays/long-road-actives-playtest.spec.ts` on the stored session, holding the one 12 000-gold grant and no other panel help but the jump; the triage note, with the design outline's three questions answered; the bucket's days in the phase README |
| The docs are in sync | P9-S53-T01's checklist |
| The bar | Every row, as phase 8's, at 200 enemies on the long road with the ground-item pool full, six items in the bank, and a screen open; the render benchmark by an agent |

---

## Phase 10 gate

Added 2026-09-28 as an outline; its rows are written in full with phase 10's sprint files.

| Row | Holds when |
| --- | --- |
| Travel works and the kept map is frozen | Specs for the portal down, the waypoint and the travel command, the town portal's channel and its ends, one portal at a time; a replay spec walks to town and back with the kept map's checksum unchanged, and a one-field change to the kept scope by a test door moves the checksum |
| A generated map is a pure function of the seed, its level, and its recipe | A spec generates every map of a seed before and after a played session and finds them equal; the golden hash of a sampled sweep green |
| Every generated map passes the map checks, or falls back and is counted | A 1000-seed sweep of the Nave: every map's packs place, the walk from arrival to waypoint to portal is open to every radius class, at most 60 enemies near any point, expected drops at most half the ground-item capacity; fallbacks at most 2% ([R42](./02-risks-and-hidden-work.md)) |
| The recipe's figures land in their bands | The sweep's figures recorded in the phase README: enemies per map 90 to 110, the waypoint a third to a half along the walk, minutes per map at the driver's pace, the most A* expansions a tick under the re-path budget; generation under 50 ms headless for the largest map |
| The stratum is walked from the town to the Gaolmaster's kill | The driver on a seed sweep reaches map 10 at about level 12 and kills the Gaolmaster with no panel help, using the town portal and a waypoint; the portal on map 10 opens only after the kill |
| The live cap holds on generated maps | The Nave's stress case under `pnpm test:budget`: no `enemy_cap_reached` on a sampled sweep |
| The Nave's families are rows of the family kind, and the long road did not move | Content tests hold the six families at variant I to the designer's table; the long road's stored logs unchanged, unless the level table's answer moved them by a named ticket |
| Two map scopes fit the heap | The heap readout on the transition to town, against ADR 0015's revisit point |
| The maintainer has played the town and the Nave's first maps, the session replays identically, and the feedback is triaged | The stored session, the portal and a waypoint used, and its spec; the triage note |
| The docs are in sync | The docs-sync ticket's checklist |
| The bar | Every row at 200 enemies on the densest map of the Nave's sweep, with a screen open and the kept map standing; the transition's frame read in Chrome |

---

## Phase 11 gate

Added 2026-09-28 as an outline.

| Row | Holds when |
| --- | --- |
| A run survives a save and a resume | A spec saves, plays, saves, resumes, and finds run scope equal by the checksum's run-scope lists; clocks as ticks remaining |
| Every run-scope field is saved or named with its reason | The typed save list fails the typecheck on an unlisted field |
| Every earlier save still loads | A stored save of each format version under `tests/` loads through the migrations; an id content no longer has costs that item and says so |
| A resumed run starts in town, and a log can begin from a save | The resume spec; a feedback file taken after a resume replays |
| The stash, the start screen, and the death penalty | Their specs: the stash refused outside town and saved; a new run only after the confirmation; 10% of carried gold lost on death, a tunable |
| Every enemy cast is heard as its cast point begins | A content test that every enemy ability id is in the sound list; the adapter's spec with no allocation in steady state |
| The maintainer has played the first stratum to the Gaolmaster's kill across at least two sittings, each log replays from its save, and the feedback is triaged | The stored logs and their specs; the triage note |
| The docs are in sync | The docs-sync ticket's checklist |
| The bar | Every row, as phase 10's, with sound on |

---

## Phase 12 gate

Added 2026-09-28 as an outline.

| Row | Holds when |
| --- | --- |
| Strata 2 and 3 hold the families the descent's table names | Content tests hold the Undercroft's seven at I, the Nave's six at II and III, and the leech and the bolter at I to the designer's tables |
| Aspects are data | Each aspect's spec; a check that no rule branches on an aspect's id; the status table's fill under its capacity for the worst boss with two aspects |
| Mana burn and the on-death hook | `mana_burn`'s spec, the shortfall dealt as magical damage; Burning's hook resolving a death it causes on the next tick |
| Every family has a silhouette | A content test; world draw calls unchanged; the bench |
| Items reach level 30 | The catalogue's tables held to the files; every rarity at its weight over rolls |
| The Hollow Abbess and Marrowleech, each with its piece | Their specs |
| Strata 2 and 3 are walked | The driver's sweeps reach about level 21 by map 30; each recipe's stress case with no refusal |
| ADR 0021's bench is recorded | Its figures in the phase README |
| The maintainer has played strata 2 and 3 from saves, the sessions replay, and the feedback is triaged | The stored logs and their specs; the triage note |
| The docs are in sync | The docs-sync ticket's checklist |
| The bar | Every row, on the densest map of each new recipe's sweep |

---

## Phase 13 gate

Added 2026-09-28 as an outline.

| Row | Holds when |
| --- | --- |
| The catalogue reaches level 100 | The content test holds the catalogue's bases and affix tiers to the files; every rarity at its weight over rolls at item levels 10 to 100 |
| Cooldown reduction from items stops at 40% | Its spec; the cap a tunable |
| The hero's power keeps growing | The driver's rolls put the offence and defence index within the designer's band of the descent's section 8.1 at item levels 30, 50, 70, and 100 |
| Earlier saves still load | A stored save of each earlier version loads |
| The maintainer has read deep drops, and the feedback is triaged | The stored session and its spec; the triage note |
| The docs are in sync | The docs-sync ticket's checklist |
| The bar | Every row, as phase 12's |

---

## Phase 14 gate

Added 2026-09-28 as an outline.

| Row | Holds when |
| --- | --- |
| The eight families do what the descent says | A spec per ability: the hook disjointed by a blink or a lift, bursts chained on the next tick and bounded, the mend's target, fear with the active-item keys working under it, a raise once each, the brood leaving with its nest, the blink away, the trail |
| Fear has its disable-matrix row | One test per cell |
| The live cap holds with nests and raises | Each recipe's stress case with no refusal; the zone pool with no miss on the worst Mirrorhalls map |
| The four stratum bosses, each with its piece | Their specs |
| Strata 4 to 7 are walked | The driver's sweeps, the hero at about level 25 by map 50 |
| The maintainer has played strata 4 to 7 from saves, the sessions replay, and the feedback is triaged | The stored logs and their specs; the triage note |
| The docs are in sync | The docs-sync ticket's checklist |
| The bar | Every row, on the densest map of each new recipe's sweep |

---

## Phase 15 gate

Added 2026-09-28 as an outline.

| Row | Holds when |
| --- | --- |
| The damage function's source point changed nothing | Every stored log's checksum unchanged by its ticket |
| The six families do what the descent says | A spec per ability: mute, thorns, the tether's stun on leaving, the silence field, splits joining the pack, the shield by angle |
| Mute and the tether have their disable-matrix rows | One test per cell |
| The live cap holds with splits at their worst | The Pit's stress case with no refusal |
| The Unwound casts four sets by its health, and the run is won | Its spec; the won run saved and resumed |
| The descent is walked to its bottom | The driver from the town to the Unwound's kill on a sweep, the hero at about level 30 near map 100 |
| The maintainer has played strata 8 to 10 and the Unwound from saves, the sessions replay, and the feedback is triaged | The stored logs and their specs; the triage note |
| The docs are in sync | The docs-sync ticket's checklist |
| The bar | Every row, on the densest map of each new recipe's sweep and in the Unwound's chamber |

---

## Phase 16 gate

Added 2026-09-28 as an outline.

| Row | Holds when |
| --- | --- |
| Every family, boss, floor, obstacle, and the hero has its frames | The content test |
| Tall art sorts, occludes, and picks by its sprite | Their specs |
| The simulation did not change | No diff under `src/domain/` or `src/simulation/` across the phase; every stored log's checksum unchanged |
| Each stratum's page holds the budget | `pnpm bench` on each page by an agent, under 5 world draw calls; ADR 0021's criteria |
| Every sound on the list plays with nothing allocated | The adapter's spec; the allocation sampler |
| The maintainer has played from saves, looking and listening, and the feedback is triaged | The stored logs; the triage note |
| The docs are in sync | The docs-sync ticket's checklist |
| The bar | Every row, on each stratum's densest map with its page loaded |
