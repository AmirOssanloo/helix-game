# Phase exit gates

**Written:** 2026-09-20 · **For:** whoever closes a phase

The roadmap's "done when" for each phase, turned into rows a person can tick with a named test or a recorded number. A phase closes when every row holds. "Not yet" is an honest answer; "we'll fix it in the next phase" closes nothing. The one exception on record: the reference-laptop half of the bar for phases 1 and 2, which the maintainer deferred to the phase 5 gate on 2026-09-23 for want of the machine, and which that gate carries as a row of its own.

Every gate includes the bar. It is repeated once here so no gate can forget a row.

---

## The bar, every phase

| Row | Holds when | Evidence |
| --- | --- | --- |
| Frame rate | 60 fps stable on the reference laptop in Chrome, Firefox, Safari, Edge | Panel readout screenshot per browser, 30 seconds at the phase's live cap |
| Simulation tick | Under 4 ms worst case at the phase's live cap | Panel tick max readout; stress test green in CI |
| Presentation sync | Under 1 ms | Panel sync readout |
| Phaser render | Under 6 ms, under 5 world draw calls | Panel render and draw-call readouts; the draw-call readout checked against the WebGL inspector on one frame |
| Allocations | Zero in tick and sync after warm-up; pool misses zero; heap flat | Panel pool-miss and heap readouts; 30-second allocation sampler recording |
| Determinism | Same seed and input log give the same state | `pnpm test -t "replay"` green; one session recorded during the gate replays identically |
| Tests in Node | Domain, simulation, content, architecture tiers green with no canvas | `pnpm check:ci` green |
| Stress test | 300 units (phase 1) or 200 enemies plus 100 projectiles (phase 3 on) hold the tick budget | `pnpm test -t "stress"` green |
| Render benchmark | Passes per ADR 0001 | `pnpm bench` numbers recorded in the phase README |

The live cap per phase: phase 0 none; phase 1, 300 units with random orders; phase 2, the hero, 20 concurrent zones and effects, 100 projectiles, one dummy; phases 3 to 5, 200 enemies and 100 projectiles; phase 6, the same 200 on the long road, woken and put to sleep by the hero's walk; phases 7 and 8, the same, with the ground-item pool at its capacity.

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
| The bar | Every row, at 200 enemies on the long road: the tick headless from the long-road stress case in a production build; frame rate, sync, render, and world draw calls at the densest choke in Chrome, and in Firefox, Safari, and Edge on the reference laptop, written as figures in the phase README |

---

## Phase 7 gate

Added 2026-09-26. Loot is measured against the one number the clean run gave: 2 `heal` and 8 `restore_mana` to finish the road. The gate holds the road finished without them, by play and headless, and holds the rest of loot to its tests. A rarity is proved at its weight by rolls, not by one run, since the road holds 54 kills (Q95).

| Row | Holds when |
| --- | --- |
| The hero walks the long road from level 1 to the last boss's kill with no panel heal or mana | `tests/simulation/replays/long-road-loot-playtest.spec.ts`: the maintainer's session holds no `heal`, `restore_mana`, `level_up`, toggle, or grant, and reaches the last boss's kill, the level at the kill recorded; `tests/simulation/replays/balance-loot.spec.ts`: the driver's walk on seed 3742014961 does the same with the catalogue's margin |
| Every drop kind appears and is taken by walking over it | Both sessions hold at least one pickup each of gold, a health globe, a mana globe, and an item; `tests/simulation/loot/pickup.spec.ts` green; `tests/domain/loot/roll.spec.ts` and `tests/domain/loot/rarity.spec.ts`: every rarity at its weight over 10 000 rolls per enemy tier, elites always and bosses Rare or better, no active item |
| Items equip and change derived stats | `tests/simulation/items/armory-commands.spec.ts`, `tests/simulation/items/armory-stats.spec.ts`, `tests/domain/combat/spell-damage.spec.ts`, and `tests/simulation/items/orb-bonus.spec.ts` green; the maintainer's session holds an `equip_item` |
| The store buys and sells at a checkpoint | `tests/simulation/store/store.spec.ts` green; the maintainer's session holds a `buy_item` and a `sell_item` |
| A recorded session with loot replays identically, and loot never moves a fight | The maintainer's session and `balance-loot.json` each replay into two worlds that agree at every tick; `tests/simulation/loot/drop-on-death.spec.ts`: the xorshift stream reads the same at every tick with every loot table on and emptied; every stored log green on the final content version, `long-road-playtest.json` included |
| The bar holds with drops on the ground | The long-road case of `tests/simulation/stress.spec.ts` under `pnpm test:budget` with the ground-item pool full; `tests/presentation/doors/view-pools-sized-to-the-screen.spec.ts` with a full pool and no view or label miss |
| The maintainer has played it and filed feedback, and it is triaged | The dated feedback files and the triage note under `notes/`; every note has an outcome; the bucket's days spent and what went to Deferred in the phase README |
| The docs are in sync | P7-S38-T02's checklist |
| The bar | Every row, at 200 enemies on the long road with the ground-item pool full: the tick headless; frame rate, sync, render, and world draw calls at the densest choke with drops on the ground and a screen open, in Chrome, Firefox, Safari, and Edge on the reference laptop, written as figures in the phase README |

---

## Phase 8 gate

Added 2026-09-26 as an outline; its rows are written in full with phase 8's sprint files.

| Row | Holds when |
| --- | --- |
| Every active item is an ability cast through the pipeline; nothing item-specific was added to it | Review of `domain/abilities/` since phase 7; a simulation test per active at its catalogue numbers |
| The disable matrix covers the six keys | One test per cell of the new column |
| The six keys resolve in the extended tie-break order, and Space never scrolls the page | Mapper tests; by hand in four browsers |
| Active items drop at their weight and sell at their price | Roll tests over 10 000 rolls; the store test |
| The maintainer has played the long road with active items, the session replays identically, and the feedback is triaged | The stored session and its spec; the triage note |
| The docs are in sync | The docs-sync ticket's checklist |
| The bar | Every row, as phase 7's |
