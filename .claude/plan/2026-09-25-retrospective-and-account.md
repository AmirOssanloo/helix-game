# Retrospective and the account for leadership

**Written:** 2026-09-25 · **Author:** delivery strategist role · **Ticket:** P5-S22-T04 · **For:** leadership deciding what to fund next, and the engineer who runs it
**Status of this document:** a dated note. It records where the build stands at milestone M8 and recommends the next bet. The sizing of work beyond phase 5 is **direction, not commitment**.

---

## The decision on one screen

**What exists.** The five phases of the [roadmap](../../docs/product/roadmap.md) are built and their gates hold on everything a machine can verify. The hero moves, composes orbs, and invokes ten spells. Thirteen enemy archetypes fight with abilities cast through the hero's own pipeline, at three tiers, under a disable matrix of 117 tested cells. A boss with adds fights among 200 enemies, and the whole session replays tick for tick. `pnpm check` is green at 3397 tests in 194 files.

**What is not proven yet.** The game has never been measured on the reference laptop, in four browsers, or in CI under load. Every gate's frame-rate, render, draw-call, and browser-allocation row is still open. On 2026-09-25 the delivery lead, on the maintainer's delegation, played through every row that needs a person at the keyboard, in Chrome on the Apple M1 laptop, and confirmed the behaviour of each. The reference-laptop rows still need someone with the reference laptop. Until that session happens, the 200-enemy cap is a simulation number and not a frame-rate number ([section 5](#5-headroom-as-it-stands-and-what-it-means-for-the-200-cap)).

**What it cost.** 61.0 recorded engineer-days against 107.6 sized, a ratio of 0.57. The dated records show every phase closing between 20 and 25 September 2026, against a plan of about six calendar months. Engineering days are no longer what limits the calendar. Person time is: by-hand play, the reference laptop, and the maintainer's rulings on 21 provisional decisions.

**What to fund next.** One bet of about **24 sized days in six sprints**, called *one floor*: move, fight, loot, descend. It covers a generated dungeon floor, enemies placed in dormant packs, drops, equipment that changes the hero's stats, and stairs to a deeper floor. It builds only on doors that have been tested. The reference-laptop session comes first. The cut-line is in [section 8](#8-the-recommended-next-bet-one-floor).

---

## 1. Sized versus actual, per phase

From each phase README's exit record and each sprint's exit table. Sizes are engineer-days on the plan's scale. Sized totals include unplanned tickets. P5-S22-T04 is recorded at 0.3.

| Phase | Sized | Actual | Ratio | Widest sprint gap | Unplanned days |
| --- | --- | --- | --- | --- | --- |
| 0 · Foundation | 9 | 4.25 | 0.47 | Sprint 00: 5 sized, 2.75 actual | 1 |
| 1 · Hero mechanics | 21.1 | 18.6 | 0.88 | Sprint 05: 4.6 sized, 3.1 actual | 1.1 |
| 2 · Spells and attack | 25.75 | 20.1 | 0.78 | Sprint 08: 4 sized, 2 actual | 5.75 |
| 3 · Enemies | 23.25 | 8.1 | 0.35 | Sprint 14: 4 sized, 1.0 actual | 0.75 |
| 4 · Feel and tuning | 12.1 | 4.2 | 0.35 | Sprint 16/17/18: 4 sized, 1.4 actual each | 0.1 |
| 5 · Full roster | 16.4 | 5.75 | 0.35 | Sprint 20: 4 sized, 1.1 actual | 0.4 |
| **Total** | **107.6** | **61.0** | **0.57** | | **9.1** |

**How to read it.**

- **The ratio falls into two groups.** Phases 1 and 2 ran at 0.83 combined. They were new work: the first view, the first system, the first named effect. Phases 3 to 5 ran at 0.35, because each one copied a shape that already existed: an enemy is a definition, an enemy ability is a spell, and a tier is a multiplier. Any sizing of new work should expect the first group's ratio, not the second's.
- **No ticket in the plan went over its size.** The plan's only re-cut trigger was an overrun above 1.3. It had no rule for running under, so the 25-week calendar stayed on the books long after it stopped meaning anything.
- **Part of the underrun is deferred work, not speed.** Several gate tickets were sized to include four browsers and the reference laptop, and that half was moved to a person. P4-S18-T01, sized 2, took 0.4 for that reason. The honest phase 3 to 5 ratio is somewhat above 0.35, and the reference-laptop session is where the rest of those days get spent.
- **Engineer-days are the effort unit, not calendar days.** The recorded actuals add up to 61.0. The calendar ran six days. Use the unit to compare pieces of work with each other. Do not read it as a forecast of weeks.

---

## 2. The three largest misses, and why

None of the three is a ticket running over its size. That never happened. Each is a place where the plan's model of the work was wrong.

1. **The reference laptop never arrived, so every gate's browser half is open (R15, and the capacity assumptions).** The plan assumed "the reference laptop exists and has four browsers", and four gates depended on it. It was not available at any gate. The maintainer carried the bar for phases 1 and 2 forward on 2026-09-23, and then deferred every check that needs a person until phase 5 was done, on 2026-09-24. So all five phases closed on headless evidence plus Chrome on an Apple M1. The miss here is proof, not code: a performance claim for the roadmap's target hardware has never been measured on it. Why: the plan listed the machine as an assumption instead of making it a ticket with an owner and a date.
2. **Sprint 11's unplanned 5.75 days (phase 2).** This is the only sprint where the maintainer played the build thoroughly by hand. The play found 3.5 days of corrections plus 2.25 days of requests, which added about a quarter to the phase. Phases 3 to 5 carried 0.9 unplanned days in total, and they also had almost no by-hand play. Why it matters now: in this project, playing by hand finds work that tests do not. The walk under way today should be expected to turn up tickets, and the next bet sets aside a buffer for it.
3. **Estimation ran a third under from phase 3 on, and nothing re-cut it.** The largest single gaps were P4-S18-T01 (the profile, 2 sized, 0.4 actual), P3-S15-T01 (the 200-enemy profile, 2 sized, 0.5 actual, because R2 and R4 did not bite), and P5-S20-T02 (the matrix as data, 2 sized, 0.5 actual). The sizes were fair for the risks known when they were written. They stayed fixed after those risks failed to land. Why it matters: a plan that overstates cost as badly as it could understate it leads to wrong funding decisions. The calibration in [section 7](#7-beyond-phase-5-first-order-sizing) corrects for it.

Also worth noting, though not a miss in days: sprint 18 sized the event ring for a heaviest tick of 430 events, and measurement found 714. It was caught at the gate and fixed in 0.05 days (P4-S18-T06). That is how the gate is supposed to work.

---

## 3. Every risk in the register, and what happened

From [Risks and hidden work](./implementation/02-risks-and-hidden-work.md).

| # | Risk | What happened |
| --- | --- | --- |
| R1 | The quad batch does not hold 60 fps at 500 quads | **Held where it was measured.** Chrome on the M1: 60 fps, 0.6 to 1.5 ms render, 1 draw call, heap flat, at every bench since sprint 02. Not yet measured on the reference laptop or in Safari |
| R2 | Tick over 4 ms at 300 units forces a typed-array rewrite | **Did not bite.** 1.67 to 1.80 ms mean at 300 in phase 1. No rewrite was needed |
| R3 | Push-out jitters or tunnels in a corridor pile-up | **Bit mildly** in sprint 15. No disc entered a wall, but two runners overlapped 99 %. The pass cap went from three to four. The push rule itself is [Q31](./implementation/backlog/open-questions.md), still provisional |
| R4 | Re-pathing 200 chasers blows the tick | **Did not bite.** The profile ticket took 0.5 of its 2 days |
| R5 | Determinism leaks | **Did not bite.** Every gate session replayed identically. The phase 5 session matches its per-tick SHA-256 chain on all 3600 ticks |
| R6 | Hidden allocation on the hot path | **Partly.** The code allocates nothing. V8 boxing leaves 6.8 KB a tick of young-generation garbage at 200 enemies, and the heap stays flat. Read under [Q30](./implementation/backlog/open-questions.md), provisional. The browser allocation sampler still needs a person |
| R7 | The definition schema changes after spells are written | **Did not bite in phase 2.** Phase 5 extended the schema (ability entries with conditions, carried statuses, projectile origin) inside tickets of 0.4 to 0.5 days, with the content tier catching every definition |
| R8 | Named effects with rich state run over a day | **Held on size.** Glacier and Updraft took their 1.5 days. Sprint 11 overran on scope instead, as described in miss 2 |
| R9 | The on-damage hook nobody designed | **Retired.** Built once in sprint 10 and reused in sprint 19. Now [ADR 0008](../../docs/adr/0008-damage-hooks-are-status-capabilities.md) |
| R10 | Draw calls unreadable from Phaser 4 | **Retired** on 2026-09-20 (Q4). The counter wraps two public renderer methods |
| R11 | AT-O4 needs a channel before anything channels | **Retired** by the `begin_channel` debug command (Q2) |
| R12 | Summon expiry contradicts between pages | **Retired** (Q1). Now [ADR 0007](../../docs/adr/0007-a-spawned-unit-ends-with-its-owner.md) |
| R13 | The generic tuning surface is bigger than a sprint | **Did not bite.** Numeric fields only, with the key format in [ADR 0009](../../docs/adr/0009-definition-tuning-key-is-the-field-path.md) |
| R14 | Hot reload diverges from the replay log | **Mitigated as planned.** The log carries its content version, and a log that spans versions is refused (Q37). The by-hand check is in today's walk |
| R15 | Four-browser verification needs a person and the reference laptop | **Landed in full.** See miss 1 |
| R16 | One engineer; a week away moves everything | **Did not bite.** The calendar compressed instead |
| R17 | Docs drift under pressure | **Bit, and was caught as designed.** The sprint 22 docs sync corrected nine feature pages and three catalogues. One example: the hero page gave Whorl a passive it does not have |
| R18 | The Phaser 4.2.1 pin needs an upstream fix | **Did not bite.** No patch was ever applied |
| R19 | Isometric containers break the batch | **Did not bite.** Still 1 draw call, and the ticket took 0.5 of 2 days |
| R20 | The isometric view changes how spells feel | **Did not bite.** The maintainer played all ten spells in the view on 2026-09-23 and asked for no change |

**The pattern.** Every technical risk either did not bite or cost less than its buffer. The one risk that landed in full is organisational: a person and a machine. Seventeen rows are retired or did not bite. R3 and R6 bit mildly and hang on provisional rulings. R15 is open.

---

## 4. The doors kept open, verified by test

The roadmap lists seven "doors kept open". Sprint 22 gave six of them a test, and all six pass ([P5-S22-T03](./implementation/phase-5-full-enemy-roster/sprint-22-phase-gate-and-handover.md)).

| Door | Result | What it buys later |
| --- | --- | --- |
| Run scope outlives map scope | Green. The hero keeps its id, level, orbs, slots, and clocks across a map load | Dungeon floors, a town, and exits without recreating the hero |
| View pools sized to the screen | Green. Eight views draw 400 units with no miss | Large maps cost nothing at render time for what is off screen |
| Map geometry as a tile layer | Green, with a stub. There is no view-kind registry, so a real tile layer is an edit to `PlayScene`, which is expected | Tile art and generated floors |
| Dormant packs by proximity | Green. 320 enemies on a long strip, and only the pack near the hero wakes | Maps holding more than the 200 live cap |
| Items as a modifier source | Green. An item's rows combine with a status's on the same stack and leave cleanly | Equipment. Usable items as abilities are not covered by this test |
| A second kit fills the HUD | **The HUD half passes. The domain half does not** | See the finding below |
| Phaser-free layers to a workspace package | No test of its own. The architecture test's import rules keep it open | A server or a tool that runs the simulation |

**Finding for leadership.** A kit (Invoke today, a hotbar tomorrow) receives only Invoke's kind of state. It is never handed the definition of the form it serves. So a real hotbar kit cannot read its own list of abilities, and the test only passes because a fixture reads the form directly. Fixing it is a **structural change for the engineering architect**: either pass the form definition to the kit's calls, or let each kit own its state. It costs little today, about a day once decided, and more once a second kit exists. **It does not block the recommended next bet**, which adds no second kit. It does block potions on a hotbar and any second form.

---

## 5. Headroom as it stands, and what it means for the 200 cap

From the [phase 4 headroom table](./implementation/phase-4-combat-feel-and-tuning/README.md#headroom-table) and the [phase 5 boss reading](./implementation/phase-5-full-enemy-roster/README.md#live-cap-for-the-boss-encounter). All figures come from a production build in plain Node on the Apple M1, unless marked otherwise.

| Row of the bar | Budget | Measured | Margin |
| --- | --- | --- | --- |
| Tick at 200 enemies, phase 4 cap | Under 4 ms worst | Worst 0.80 to 2.33 ms, median 1.38; mean about 0.52 | 1.67 ms on the highest reading |
| Tick, boss and adds among 200 | Under 4 ms worst | Mean 0.58 to 0.69. Worst 1.33 to 3.19 ms over 19 runs, median 1.35. Two runs each held one stall of 26.7 and 55.9 ms, read as scheduler stalls | 0.81 ms on the single worst reading, 2.65 on the median |
| Per-enemy slope | | 0.0036 ms of worst tick per enemy | Projected 1 ms margin up to about 380 enemies |
| Presentation sync | Under 1 ms | 0.77 ms mean with 201 bound, Chrome on the M1, phase 3 | 0.23 ms, one old reading |
| Render and draw calls | Under 6 ms, under 5 | **Needs the reference laptop**, per browser | Unknown |
| Frame rate | 60 fps in four browsers | **Needs the reference laptop** | Unknown |
| Allocations in tick | Zero | About 6.8 KB a tick of young garbage (Q30). Browser sampler needs a person | Heap flat |
| Pool misses, event overwrites | Zero | Zero in every run. The boss's heaviest tick is 209 events in a 16384-slot ring | Large |
| Heap | Flat | 25.62 to 25.72 MB over five minutes | 0.10 MB |
| Determinism, stress, tests in Node | Green | Green, `pnpm check:ci` included | Holds |

**What was done about the person-only rows.** The by-hand play rows were played through on 2026-09-25 by the delivery lead, on the maintainer's delegation, in Chrome on the Apple M1: the retune from the panel, hot reload and the version refusal, the roster, tiers, behaviours, and enemy abilities, the disable matrix's playable outcome, the HUD by eye, and the boss fight. Two small fixes came out of it and were built the same day (the HUD greying while the hero is dead, and a charger no longer pinned behind a wall); a third, the crowd carrying the hero out of the corridor, is the first ticket of the next bet. The reference-laptop, four-browser, and CI performance rows still need someone with the reference laptop. Those are the phase 3, 4, and 5 gates' browser readouts, sprint 15's stress run on the reference laptop, sprint 18's per-browser profiles, the render benchmarks (M1's and those carried from sprints 12 and 13), and the Q9 worst-browser max tick that decides the cap.

**Plainly, what this means for the 200-enemy cap.** The simulation side of 200 is well supported. The tick has 1.67 ms of worst-case margin on a fast laptop, the slope suggests room for about 380 enemies, and nothing allocates or overflows. The frame side of 200 is **not evidenced at all** on the target hardware. Nobody has measured frame rate, render time, or draw calls at 200 enemies on a mid-range laptop with integrated graphics, or in Firefox, Safari, or Edge. Two outcomes are plausible:

- **Likely:** the tick on the reference laptop reads somewhat slower than on the M1. If the worst browser's max tick comes in over 3 ms, the rule already written in Q9 lowers the cap by arithmetic. The single 3.19 ms headless reading, taken as the worst case, would give 140. That is a constant change and a stress rerun, about half a day, with no design change.
- **Less likely, but expensive:** render or frame rate fails on the reference laptop. That reopens [ADR 0001](../../docs/adr/0001-phaser-renderer-and-quad-atlas.md), with its fix inside Phaser. It is also the thing any sprite-art decision depends on.

Leadership should treat "200 enemies at 60 fps" as **a target not yet demonstrated**, and not fund anything that multiplies draw cost (art, larger maps with a tile layer) until the reference-laptop session is recorded.

---

## 6. Decisions the maintainer still owes

Twenty-one questions in [Open questions](./implementation/backlog/open-questions.md) were decided provisionally on the most conservative reading so that work could continue, and five more were open. On 2026-09-25 the delivery lead, on the maintainer's delegation, answered all of them but Q9, which waits on the worst browser's max tick. Three affect how the game feels, and the maintainer may want to overturn them:

- **Q31:** a crowd shoves the hero too far, so the hero will take a smaller share of push-out: the first ticket of the next bet, about a day with the replays recorded again
- **Q43:** silence does not cancel a cast already under way, and a stop in the air is refused; the disable matrix is approved as written
- **Q48:** the cap stays 200 until the worst browser's max tick is read, when the Q9 formula applies

---

## 7. Beyond phase 5: first-order sizing

The roadmap's "beyond phase 5" list, sized **in the plan's unit** (engineer-days on the 0.5 to 3 scale, sprints of at most 4 sized days) and **with the plan's anchors**:

- A definition-backed piece of content is half a day with its tests.
- A first-of-kind system or view gets an extra half day.
- Anything touching Phaser gets an extra half day.
- A catalogue or spec is written before its schema.
- A new order kind costs a column in the disable matrix and its tests.

**This is direction, not commitment.** Each line needs shaping before it can be scheduled. Sizes cover engineering only. Art and sound *production* are a separate budget that this unit does not measure.

| Item | Sized days | Sprints | Main pieces (days) | Waits on | Hidden work |
| --- | --- | --- | --- | --- | --- |
| **Items, inventory, equipment** | 11 | 3 | Item catalogue 1 · schema and registry 1 · run-scope inventory, equip and drop commands 1.5 · equipment as modifier source 0.5 · usable items as abilities 1.5 · inventory screen 2 + tooltips 1 · panel controls 0.5 · twenty bases 1 · gate 1 | Nothing. The modifier door is tested | The first real UI screen. Usable items on a belt need the Kit fix from section 4 |
| **Loot tables and drops** | 8.5 | 2–3 | Seeded loot tables 1 · ground item as a new entity kind and pool 1.5 · pickup order 1.5 · ground item views and labels 1 · rarity and rolled affixes 2 · gold 0.5 · gate 1 | Items | A new entity kind needs world-model rows. A new order kind adds a disable-matrix column |
| **Procedural dungeons, acts, biomes** | 20 | 5 | Generator spec 1 · generator into the grid format 2 · validation over a thousand seeds 1 · pathing at dungeon size 2 · real tile layer 2 · spawn tables and dormant packs per room 1.5 · stairs and transitions 1.5 · minimap 1.5 · fog of war 2 · two biomes 2 · acts 1.5 · performance at the cap on the largest map, plus gate, 2 | Three tested doors | R4 reopens: A* on a grid many times the arena. Map size also reaches the obstacle overlay pools |
| **A town with vendors** | 8.5 | 2–3 | Town map with no combat 1 · NPC kind and an interact order 1.5 · buy and sell 1.5 · vendor screen 1.5 · stash 1 · town portal 1 · gate 1 | Items, loot (gold), transitions | Another order kind and matrix column. A safe zone is a rule on the map |
| **Difficulty tiers** | 7 | 2 | Difficulty multipliers through the existing tier path 1 · enemy affixes 2 · status resistance 1.5 · selection and unlock 1 · balance pass 1.5 | Loot to reward it, saves to remember it | Status resistance touches the status pipeline, which is a Deferred row |
| **Isometric sprite art and animation** (engineering) | 11 | 3 | Disk atlas and more than one texture 1.5 · animation driven by events and unit state 2 · eight or sixteen facings 1 · sorting by screen position 1.5 · obstacles split per tile 1.5 · picking by sprite 1 · walls fading near the hero 1 · four-browser bench re-baseline 1.5 | **The reference-laptop session, and an ADR** | ADR 0001 fixes `maxTextures: 1` and one atlas. Animated sprites for thirteen archetypes will not fit in one texture, so that is a superseding ADR for the engineering architect before any art ticket. ADR 0006 already lists the rest |
| **Audio** (engineering) | 4 | 1 | Event-driven cue adapter keyed by string 1.5 · mixer, volume, autoplay unlock 1 · voice limiting under 200 enemies 1 · four-browser check 0.5 | Nothing | 200 enemies can land 200 hits in a tick. Without voice limiting, audio is a frame-time problem |
| **Saves** | 6.5 | 2 | What is saved (run state only, never a world mid-map) 0.5 · run-scope serialiser with versioned migration 2 · storage adapter with quota and corruption handling 1 · content-version handling for ids and removed definitions 1 · continue screen 1 · round-trip and corruption tests 1 | Items (to have something to save) | A save outlives content versions, which a replay never has to do (R14). Needs a migration rule |
| **All eight** | **76.5** | **~19–20** | | | Plus art and sound production, which is outside this unit and is the long pole |

**Calibrating for leadership.** Most of this list is new ground: a UI screen, a generator, an art pipeline, persistence. So expect phase 1 and 2's ratio (about 0.8) rather than phase 3 to 5's (about 0.35). Read 76.5 sized days as roughly 55 to 65 engineer-days of effort. On the evidence of this plan, calendar time will be set by play-testing, the maintainer's rulings, and art and sound production, not by engineering.

---

## 8. The recommended next bet: one floor

**The bet.** One generated dungeon floor that the hero fights through, picks up equipment on, and leaves by stairs for a deeper floor generated from the next seed. It is the smallest loop that turns an arena into a game: **move, fight, loot, descend**. It spends four of the six tested doors (run and map scope, tile layer, dormant packs, modifier source) exactly where they were built to pay off. It needs no Kit fix, no ADR change, no art, no audio, and no saves.

**Appetite:** 24 sized days, six sprints, plus each sprint's buffer. At the plan's recorded ratios that is 8 to 20 engineer-days of effort. The calendar depends on the playtests.

| Order | Work | Sized days |
| --- | --- | --- |
| Before the first sprint | **The reference-laptop session**: every row carried from phases 1 to 5, and the Q9 cap read on the worst browser. The rulings on Q31, Q43, and Q48 were made on 2026-09-25 by the delivery lead on delegation; the maintainer confirms or overturns them. Neither counts in engineer-days, and the laptop session is a precondition | — |
| Shape | Item and loot catalogue 1 · floor generator spec 1 | 2 |
| Floor | Generator 2 · validation over a thousand seeds 1 · pathing and re-path budget at floor size 2 · real tile layer 2 · spawn tables with dormant packs per room, deeper floors spawning more elites 1.5 · stairs to the next seeded floor 1.5 | 10 |
| Loot | Item schema and registry 1 · run-scope inventory and equip commands 1.5 · equipment as modifier source 0.5 · loot tables, ground items, drop on death 2.5 · walk-over pickup in a system, with no new order kind 0.5 · ground item views 1 · minimal inventory and equipment screen 2 · twelve bases 0.5 | 9.5 |
| Close | Panel controls: generate by seed, grant an item 0.5 · the cap on a generated floor, plus the gate 2 | 2.5 |
| **Total** | | **24** |

**Explicit cut-line. The one-floor build deliberately does not include:**

- **Out, next in line:** a minimap, if the playtest shows people getting lost on a floor with a locked camera. It is 1.5 days and the first item above the line.
- **Out:** the town, vendors, gold, and stash. Usable items, potions, and a hotbar, which wait on the Kit fix. Named affixes and rarity tiers: an item rolls numbers within its base's range and nothing more. Difficulty tiers. Acts, and any second biome. Fog of war. A pickup order that you click. Sprite art, audio, and saves: a run ends when the page reloads.
- **Decide while shaping, not during the build:** what death does on a floor. The proposal is the rule the game has today, respawn at the entrance with items kept. Once the bet is funded this should be entered in Open questions against the generator-spec ticket.

**What comes after, in order, if the floor proves fun:**

1. Saves and the town, about 15 days. Persistence and a hub make a run into a game.
2. The art pipeline ADR and its engineering, about 11 days. Start art production in parallel once the ADR holds.
3. Loot depth and difficulty tiers, about 10 days.
4. Audio, about 4 days, whenever sound assets exist.

**What not to fund next:** the town or difficulty tiers before loot and saves exist, since both only mean something on top of them. Sprite art before the reference-laptop session, because art multiplies exactly the cost nobody has measured yet.

**Governance change for the next plan.** The reference laptop becomes a ticket with an owner and a date, not an assumption. Every phase gets at least one by-hand walk by the maintainer before its gate, since that is where sprint 11's unplanned days came from. The re-cut rule applies in both directions: a ratio under 0.6 for two sprints triggers a re-cut of the remaining calendar, not just a ratio over 1.3.

---

## Sources

[Overview](./implementation/00-overview.md) · [Risks and hidden work](./implementation/02-risks-and-hidden-work.md) · [Estimation and capacity](./implementation/03-estimation-and-capacity.md) · [Phase exit gates](./implementation/04-phase-exit-gates.md) · the phase READMEs' exit records · each sprint's exit table · [Deferred](./implementation/backlog/deferred.md) · [Open questions](./implementation/backlog/open-questions.md) · [Roadmap](../../docs/product/roadmap.md)
