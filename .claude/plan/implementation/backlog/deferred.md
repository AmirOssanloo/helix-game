# Deferred

**Written:** 2026-09-20 · **Reviewed:** 2026-09-25, at the phase 4 close; updated at P5-S22-T01 and on 2026-09-25 from the delivery lead's walk; on 2026-09-26 at the phase 6 plan, the Q31 row moved into P6-S25-T02, at the phase 6 gate, at the long road's triage, at Q71's answer, and at the clean run; at the loot and active-items plan, the loot rows taken into them; on 2026-09-27 at the answers to Q58 and Q84, then to Q87 to Q93 and the standing instructions, and at the phase 7 plan, when the foundation was inserted and loot and active items became phases 8 and 9; on 2026-09-28 at the phase 8 gate, its person rows; and the same day at the maintainer's approval of the outline of phases 9 to 16 and phase 9's sprint files, when the rows those phases take moved to Taken · **Kept current by:** whoever cuts something

Everything the plan deliberately leaves out, with the phase it was cut from and the door it waits behind. A missing capability that is a decision reads differently from one that is an oversight; this page is what makes the difference visible.

Sources: the "Deferred" section of every feature page under `docs/product/features/`, the roadmap's undecided and "Not at any point" lists, and cuts made while writing the sprints.

---

## Cut from a phase

| Item | Cut from | Waits on | Why |
| --- | --- | --- | --- |
| Damage-number crit styling | Sprint 16 | No crit exists | Colour per type is enough for the balance pass |
| Non-numeric definition fields on the tuning surface | Sprint 17 | A designer asks for one | Numeric covers every number the roadmap wants retuned |
| What the isometric view needs once art is tall: sorting by screen position inside the units and obstacles bands, obstacles split per tile so they hide the right things, picking a unit by its sprite, walls that fade near the hero, and sprites drawn in eight or sixteen directions | Sprint 23 | Sprite art: phase 16, sketched, under ADR 0021 | While the art is flat geometry nothing is tall, so the fixed depth bands hold. ADR 0006 names what changes when it is not |
| The elite and boss outline in a colour that reads on a red body: the thick red outline barely shows on a grunt | Sprint 22, from Q45 on 2026-09-25 | The art pass | Cosmetic; the boss's wider outline reads, and health and behaviour tell an elite apart in play |
| A summoner turning to the hero before its first summon, so the imps stand between them rather than behind it | Sprint 22, from Q42 on 2026-09-25 | The next pass on enemy behaviours | Cosmetic, first cast only; the imps run at the hero either way |
| The hero's attack growing with level, a new attribute conversion rather than a number | Sprint 22, from Q38 on 2026-09-25 | The next bet's balance pass; the long road's triage may take it into the bucket if the playtest asks | The balance pass's four goals hold without it; a pack of five is a fight for spells at every level by design until then |
| A map editor | Phase 6 | A second hand-authored map | One map is typed from its spec and held by content tests |
| An eleventh spell | Phase 6 | A kit redesign by the engineering architect | Three orbs give exactly ten recipes; a new spell takes over a recipe through the replace-a-spell runbook |
| The hero's side toward Diablo II curves: hero health from strength, the attribute gains per level, the Dota experience table, spell scaling, and the long road's levelling budget moved with them | Phase 6, the long road's triage, 2026-09-26 | A decision to take it as a bet; the clean run of 2026-09-26 reached level 10 at the last boss on the enemy retune alone, and named no hero-side gap | A bet of its own, a week or more: it moves every balance log, the level table, and the spec's budget (Q58). The triage retuned the enemy side only, so the clean run shows how far that alone goes |
| A dedicated last boss: its own archetype definition with the brute's kit and about 1450 health, Andariel's ratio to a Catacombs normal (about 17 times) on the retuned brute's 85, experience 90 so that 10 times still pays 900; the registry, the enemy catalogue, the long road spec's pack 32, and the content version move with it | Phase 6, P6-S30-T03, by the maintainer's answer to Q71 on 2026-09-26 | The next bet's choice; the clean run of 2026-09-26 killed the last boss with no note on it | The five bosses share `boss_health_multiplier`, so the last boss, a boss-tier brute, lands at 340 health and about 11 of the hero's basic attacks; the gap is written in the ratios note, and the clean run says whether it matters. Content only, about 0.5 to 1 |
| Two-handed weapons | Phase 8, by the maintainer's decision of 2026-09-26 (Q75) | A design for what a two-handed item does to the off-hand, and a reason to want it | One-handed bases keep the ten armory slots independent: no equip ever empties a second slot |
| Items or experience lost on death, or a corpse to run back to | Phase 8, by the maintainer's decision of 2026-09-26 (Q79); narrowed 2026-09-28 when phase 11 took the gold penalty | A playtest after phase 11 that finds 10% of gold toothless | Phase 11's penalty is 10% of the gold carried and nothing else; the design leans against losing experience, since experience lost is time lost twice |
| Rearranging the inventory to make room for an item | Phase 8, Q88 | A playtest that asks | Placement is first fit in reading order; a refusal by fit leaves the player to move items by hand |
| A store that sells back what it bought, and a checkpoint store that restocks | Phase 8, Q90; narrowed 2026-09-28 when phase 10 took the town store's restock (Q120) | A playtest that asks | A checkpoint stock rolled once is deterministic on one key and needs no clock; the town's store restocks on a new waypoint in phase 10 |
| Comparing an item with the one worn, in its tooltip | Phase 8, sprint 36 | A playtest that asks | The tooltip reads one item; a comparison reads two and their difference on the stack |
| Sets, sockets, runewords, and item lifesteal | Phase 8; cut again from phase 13's sketch, 2026-09-28 | A loot bet after the descent | Seven rarities, rolled affixes, and the catalogue at depth are the loot the descent needs |
| Active items beyond the eight; charges and upgrades on an active item; passives on one other than Rimeward's armour and Slipknife's lockout; a second kit | Phase 9, at its sprint files, 2026-09-28 | A disable in the descent's roster that none of the eight answers, or a design for a second form | The eight answer every disable the descent's families bring, by [the descent](../../../../docs/product/specs/the-descent.md)'s section 3.1 |
| A guard on Space or G against a press by accident | Phase 9, at its sprint files, 2026-09-28 | The phase 9 playtest asking for one; then key rebinding, below | The keys are Q82's, G provisional; a guard is a rule the design has not asked for |
| A sound for an activation, a dispel, a disjoint, or anything else phase 9 adds | Phase 9, at its sprint files, 2026-09-28 | Phase 11's audio adapter, then phase 16's sounds for the active items | Phase 11 hears the enemies' casts; the hero's and the items' own sounds are phase 16's |
| An ECS rewrite of the world, or a split of the Phaser-free layers into workspace packages | Phase 7, by the maintainer's scope of 2026-09-27 | For packages, ADR 0003's revisit condition, a second consumer of the simulation; for an ECS, ADR 0003's typed-array fallback, a stress tier the object layout cannot hold | Phase 7 fixes what loot grows. Neither is a verified violation or a seam a phase 8 or 9 ticket names, and each would move every system at once |
| Behaviour trees in place of the AI's behaviour flags | Phase 7, by the maintainer's scope of 2026-09-27 | The descent's shaping, if its roster (R34) needs behaviours the flags cannot compose | P7-S47-T03 splits the machine by state and keeps the flags; no phase 8 or 9 feature adds an AI behaviour |
| The inventory screen in phase 7 | Phase 7, by the maintainer's scope of 2026-09-27 | Phase 8: P8-S34-T03, on the capture layer P7-S50-T01 builds | Phase 7 builds the capture layer with one small consumer, the pause screen; the inventory is loot's |
| Performance work beyond the debug overlays | Phase 7, by the maintainer's scope of 2026-09-27 | A bar row that fails, or a stress tier whose margin closes | The phase holds the bar as phase 6 left it; the overlays are fixed because they are built and walked every frame in a production build, a verified violation |
| The rest of an effect list's rates at load: a zone's travel speed and a projectile's speed, divided by the step rate when the zone or the projectile is spawned (`spawn-zone.ts`, `spawn-projectile.ts`), and an entry's seconds, read at the cast's orb levels through `ticksOfSeconds` | Phase 7, P7-S46-T03, found 2026-09-27 | A ticket that touches those primitives, or the bucket in sprint 50 | The ticket named the damage rate only, which is now converted when the world builds its spell and status records. A speed is one division per spawn, not per tick, and an entry's seconds depend on the cast's levels; each is converted in one place and replays exactly, so it is a consistency cut, not a violation that moves a log |
| Tuning-as-state at item scale: whether item bases and affixes are tunable from the panel | Phase 7, by the maintainer's scope of 2026-09-27 | P8-S31-T02, which decides it | ADR 0009's precedent of untunable maps may apply to items; the placement ticket that knows their shape decides it |
| Splitting `domain/movement/spatial-hash.ts`, 654 lines | Phase 7, P7-S45-T03 | A phase that grows the spatial hash | One cohesive structure that no phase 8 or 9 feature grows; listed as a `max-lines` exception with that reason |
| The event record's typed readers, if P7-S47-T04 decides to build them and the bucket is spent | Phase 7, conditionally | The first phase 8 ticket that adds event fields, P8-S32-T02 | Written here only if it happens; the decision is recorded in the commands and events page either way |
| An item source kind on the unit's modifier table: `ModifierKind` in `src/domain/entities/unit.ts` still lists `"item"`, and a form's armory is `null`, where the entities and pools page states the target of ADR 0011, items as run-scope values reaching the hero as totals with no item row | Phase 7, P7-S50-T02, found 2026-09-27 | P8-S34-T01, which builds the totals and drops the kind | The code is behind a Proposed record's target, not against a built rule; no item exists yet, so nothing reads the kind |
| The test tier of specs that build a world: the testing standards say a spec that needs a world is a simulation test, but `vitest.config.ts` puts all of `tests/domain/` in the unit project, where 19 specs call `makeWorld`, and `tests/domain/definitions/toy-kind.spec.ts` reads the real content | Phase 7, P7-S50-T02, found 2026-09-27 | A ticket that re-cuts the test projects, or the maintainer choosing whether the rule or the folders move | Older than phase 7, and every tier runs in `pnpm check` either way, so no test goes unrun; which side is wrong is a decision, not a sync |
| A runbook for adding a definition kind under `docs/workflows/` | Phase 7, P7-S50-T02, found 2026-09-27 | The first phase 8 ticket that adds a kind, P8-S31-T02 or its successors | The three files a kind touches are stated on the content and registries page and proved by the toy kind's spec; the task table and the placeholder legend point there |
| Two small page tensions older than phase 7: the content and registries page says a key is its file name, while effect and behaviour keys are snake_case in kebab-case files; and the agents and skills standards say a rule restates nothing, while every file under `.claude/rules/` lists its constraints | Phase 7, P7-S50-T02, found 2026-09-27 | The next documentation pass that touches either page | Neither is a phase 7 drift nor a rule a change breaks; each wants a wording decision rather than a fact from the code |
| The phase 8 gate's person rows: the maintainer's session of the long road with loot and the store, holding no `heal`, `restore_mana`, `level_up`, toggle, or grant and reaching the last boss's kill with the level recorded; at least one take in it of gold, a health globe, a mana globe, and an item by `pick_up`; an `equip_item`, a `buy_item`, and a `sell_item` in it; its replay into two worlds agreeing at every tick as the long road's reference log; and its feedback filed and triaged, the bucket's days recorded | Phase 8 gate, P8-S38-T01, 2026-09-28 | The maintainer's playtest, deferred until phase 8 is done by the maintainer's standing instruction of 2026-09-24; its box under Waiting on a person in STATUS.md has the steps | Only a person can play the session; every other part of those rows holds on the driver's `balance-loot.json` and the specs, and the phase closed on them |
| The stats system's steady-state allocation spec, `tests/domain/stats/stats-system.spec.ts`, failing now and then under the full suite: once in three runs of `pnpm check` on 2026-09-28 its heap growth read 73 704 bytes against its 65 536 bound, and it passed five runs alone | Phase 8 gate, P8-S38-T01, found 2026-09-28 | A ticket that touches the allocation specs' heap measure, or a second failure | The system allocates nothing when the spec runs alone; the heap reading is shared with the workers the full suite runs beside it |

---

## Taken into a planned phase

A row of the tables on this page moves here when a phase's plan takes it, with the ticket that builds it. It moves on to "Cut and since built" when that ticket is done.

| Item | Cut from | Planned in |
| --- | --- | --- |
| Health and mana from loot drops: enemies dropping health and mana the hero picks up, so the long road is finished without the panel's **Heal** and **Restore mana**. On the clean run, seed 3742014961, the maintainer needed 2 `heal` and 8 `restore_mana` and accepted it "because later we will have loot that will drop health and mana": the first measured sustain gap, the evidence the drop rates are tuned against | Phase 6, the long road's clean run, 2026-09-26 | Phase 8: globes, P8-S33-T02; the rates, P8-S37-T01; the gate's first row |
| Loot and drops | The enemies page | Phase 8: P8-S32-T02, rarity P8-S35-T01 |
| Items as modifier sources | The hero page | Phase 8: P8-S34-T01 |
| Item slots, inventory, equipment | The HUD page | Phase 8: P8-S33-T01, the screen P8-S34-T03 |
| Spell amplification (lifesteal stays below) | The spells page | Phase 8: magic damage %, P8-S34-T01, amplifying all magical damage the hero deals (Q93) |
| A pickup order: click an item to walk to it and take it | Phase 8, Q74 | Phase 8: P8-S40-T01, by Q87's answer of 2026-09-27; items are picked up only this way, gold and globes still on walk-over |
| A sized inventory grid, where an item takes more than one cell | Phase 8, Q88 | Phase 8: P8-S33-T01 and P8-S35-T04, by Q88's answer of 2026-09-27 |
| Usable items as abilities | The retrospective's items sizing | Phase 9: the active item kind and the activation through the pipeline, P9-S42-T02; the eight active items, P9-S43-T04 to P9-S52-T02 |
| The eight active items in the store: no rarity, never dropped, in no loot table (Q84) | Phase 8, Q84 | Phase 9: the store's Misc tab, P9-S42-T04 |
| Dispels: the one the game has, the self-lift shedding what enemies put on the hero; nothing else dispels (Q121) | The status effects page | Phase 9: `dispel`, P9-S44-T01; the self-lift, P9-S44-T02 |
| Immunity, as two scoped exceptions and a number: the self-lift's `invulnerable` and Veilblade's `ethereal`; a magic resistance of 1 is a number every archetype has (Q121) | The status effects page | Phase 9: `invulnerable`, P9-S44-T01; `ethereal`, P9-S52-T02. A magic resistance of 1 on named variants is phase 15's, sketched |
| **The descent**: about a hundred generated maps in Diablo I's style in ten strata, walked portal to portal from a town, with a waypoint on every map and a town portal, harder with depth through deeper and different families, variants, aspects, bosses, and density, never by scaling an enemy's stats (Q55). Was "one floor" and "procedural dungeons with acts and biomes"; its hidden cost, the roster's width, is R34 | Phase 6, by the maintainer's choice on 2026-09-26; split (Q73) and reshaped (Q89), then set by [the descent](../../../../docs/product/specs/the-descent.md) on 2026-09-28 | Phases 10 to 15, sketched: the town, travel, the generator, and the Nave in [phase 10](../phase-10-the-first-stratum/README.md); strata 2 and 3 in phase 12; 4 to 7 in phase 14; 8 to 10 and the Unwound in phase 15 |
| The descent's generator, ported or written | Phase 7, by the maintainer's scope of 2026-09-27 | Phase 10, sketched, under ADR 0016 |
| The town, and exits, portals, and transitions between maps | Phase 6, and the map and camera page | Phase 10, sketched: the town, the portal down, waypoints, and the town portal (Q120) |
| Saves, a stash, and a death penalty of 10% of the gold carried | Phase 6 (saves), phase 8 (Q79, Q88) | Phase 11, sketched |
| Audio: a tell for every enemy cast, then the hero's, the items', the interface's, and ambience | Phase 6, and the HUD, Orbs and Invoke, and spells pages | Phase 11, sketched, for the tells; phase 16, sketched, for the rest. Where the sounds come from is Q132, the maintainer's |
| Sprite art with animation, tile and obstacle art, and what the view needs once art is tall | Phase 6, sprint 23, and the HUD and map and camera pages | Phase 12, sketched, for flat silhouettes per family; phase 16, sketched, for the art and the view. Where the art comes from is Q133, the maintainer's |
| Enemy affixes | The enemies page | Phase 12, sketched: aspects, on elites and map bosses |
| The item catalogue at scale: bases and affixes to level 100, Diablo II style, after research into treasure classes, quality levels, affix levels, and the quality roll | Phase 8, by Q84's answer, 2026-09-27 | Phase 13, sketched, the research note its first ticket |
| More packs on the long road, the row "Q58" pointed at if the road felt empty | Phase 6, Q58 | Phase 8: P8-S39-T01, the long road at Diablo II density, by Q58's answer of 2026-09-27 |

---

## Cut and since built

A row of the table above moves here when the sprint it waited on builds it, with where it landed.

| Item | Cut from | Built in |
| --- | --- | --- |
| The bar on the reference laptop for phase 1: four browsers at 300 units, the 30-second allocation sampler, and the stress test there | Phase 1 gate | Run by the maintainer on the reference laptop in four browsers, 2026-09-25, and approved as matching the Apple M1 figures; no per-browser figures written down |
| The bar on the reference laptop for phase 2: four browsers with twenty zones live, the 30-second allocation sampler, and both stress tests there | Phase 2 gate | Run by the maintainer on the reference laptop in four browsers, 2026-09-25, and approved as matching the Apple M1 figures; no per-browser figures written down |
| The render benchmark after the archer's `square_dot` frame: `pnpm bench` in Chrome on this branch and on `772369c`, the four figures for each | Sprint 12 | Run by the maintainer on the reference laptop in four browsers, 2026-09-25, and approved as matching the Apple M1 figures; no per-browser figures written down |
| The render benchmark after the enemy views: the definition's frame and tint at bind, the outline pool, and the range and state-label overlays; `pnpm bench` in Chrome on the P3-S13-T04 commit and on `13833f9`, the four figures for each | Sprint 13 | Run by the maintainer on the reference laptop in four browsers, 2026-09-25, and approved as matching the Apple M1 figures; no per-browser figures written down |
| Milestone M1's numbers on the reference laptop: `pnpm bench` in Chrome and Safari, as configured and with `?textures=default` | Sprint 02 | Run by the maintainer on the reference laptop in four browsers, 2026-09-25, and approved as matching the Apple M1 figures; no per-browser figures written down |
| The phase 3 gate's browser rows: two hundred spawned from the panel and fought for 60 seconds in Chrome, Firefox, Safari, and Edge on the reference laptop, every readout of the bar per browser at two hundred enemies and a hundred projectiles; and the render benchmark at the phase 3 close, `pnpm bench` in Chrome, the four figures | Phase 3 gate, sprint 15 | Run by the maintainer on the reference laptop in four browsers, 2026-09-25, and approved as matching the Apple M1 figures; no per-browser figures written down |
| The phase 4 gate's browser and by-hand rows: every readout of the bar per browser in Chrome, Firefox, Safari, and Edge on the reference laptop at two hundred enemies, twenty zones, and a hundred projectiles, written into the headroom table's frame rate, sync, render, and draw-call rows with their margins; the render benchmark at the phase 4 close; three random keys retuned from the panel by hand; and content hot-reload and the version refusal by hand | Phase 4 gate, sprint 18 | Run by the maintainer on the reference laptop in four browsers, 2026-09-25, and approved as matching the Apple M1 figures; no per-browser figures written down |
| The phase 5 gate's person rows: the boss encounter with adds among two hundred enemies in Chrome, Firefox, Safari, and Edge on the reference laptop, every readout of the bar per browser; the render benchmark at the phase 5 close; and the reference-laptop row, which is every row above that waits on the phase 5 gate | Phase 5 gate, sprint 22 | Run by the maintainer on the reference laptop in four browsers, 2026-09-25, and approved as matching the Apple M1 figures; no per-browser figures written down |
| Content hot-reload | Phase 0, sprint 00 | Sprint 17, P4-S17-T02, with the version refusal in P4-S17-T03 |
| The `Readonly` cast ban, if its lint selector runs over | Sprint 00 | The lint rule `no-world-view-cast` under `eslint/rules/` |
| Replay loader and determinism test | Sprint 01 | Sprint 06; `tests/simulation/replay-determinism.spec.ts` |
| Real enemy definitions for the stress test | Sprint 06 | Sprint 12; the stress test spawns grunt and runner packs |
| Wane's aggro-drop behaviour test | Sprint 10 | Sprint 12; `tests/simulation/ai/transitions.spec.ts` reads `aggro_hidden` |
| The disable matrix's draft | Sprint 18 | P4-S18-T04: the row and column headings are in the P5-S20-T01 ticket; the cells are that ticket's |
| Enemy summon adds at the live cap | Sprint 16 | P5-S19-T04: the pending case in `tests/simulation/enemies/edges.spec.ts` is real, and `tests/simulation/abilities/summon-adds.spec.ts` covers the refusal at request and at commit |
| A unit's own movement speed and turn rate | Sprint 09 | P3-S12-T05 |
| A melee attack | Sprint 09 | Sprint 12; `src/domain/attack/attack.ts` lands an attack with no projectile at the end of its attack point |
| Tooltips, for items | The HUD page | P8-S36-T01: `src/presentation/screens/tooltip.ts`, over an item on the inventory screen or a ground label, its price line waiting on the store screen, P8-S36-T03. Tooltips on spells and statuses stay deferred below |

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
| Key rebinding | Controls and orders | A settings menu, in no planned phase; phase 11's and phase 16's cut-lines leave it out. Phase 9's six active-item keys, T, X, V, C, G, and Space (Q82), are more a rebind must cover, and G is provisional until then |
| Gamepad | Controls and orders | A design for a pointer-free scheme |
| Touch and mobile | Controls and orders | Never |
| Camera panning | Controls and orders, Map and camera | Never in the five phases; the camera is locked |
| Selection of anything but the hero | Controls and orders | Summons or items that make it useful |
| Production access to the panel | Developer panel | Never |
| Remote profiling, log upload | Developer panel | Never in the five phases |
| Scripted scenarios in the panel | Developer panel | Never; tests do that |
| A spell picker that skips Invoke | Developer panel | Never; testing the kit means using the kit |
| Kiting archer beyond standing at range | Enemies | Sprint 21 adds `ranged_kiter` for the roster |
| Formations, patrols, scripted encounters | Enemies | Encounter design |
| Bosses with phases | Enemies | Encounter design |
| Enemy affixes | Enemies | Taken above: aspects, phase 12 |
| Forms as playable content | Hero | Design of a second form; the architecture is ready and tested by a door test in sprint 22 |
| Talents and kit upgrades | Hero, Spells | Never in the five phases |
| Real death rules | Hero | Taken above: the gold penalty, phase 11; items or experience lost stay cut, above |
| Stat growth past 30, prestige | Hero | Never in the five phases |
| Potions | Hero | A belt, which needs the retrospective's Kit fix; phase 8's globes stand in for them |
| A second kit's HUD layout | HUD | A second form; tested by a door test |
| Minimap | HUD, Map and camera | A map larger than the arena. The long road is one, and it is cut from phase 6: the road is one direction, so progress reads without it. The first item above the line if the playtest shows the maintainer lost |
| Tooltips on spells and statuses | HUD | A settings or polish pass; item tooltips are phase 8's |
| Sound cues | HUD, Orbs and Invoke, Spells | Taken above: phases 11 and 16 |
| Animated art | HUD | Taken above: phase 16 |
| The descent, about a hundred generated levels (was "procedural dungeons, acts, biomes") | Map and camera | Taken above: phases 10 to 15 |
| Exits, portals, transitions | Map and camera | Taken above: phase 10 |
| Tile art | Map and camera | Taken above: phase 16; the tile-layer view kind is tested by a door test |
| Fog of war | Map and camera | A map larger than the arena. Cut from phase 6: the long road hides nothing worth finding |
| A day-night clock | Map and camera | Never in the five phases |
| A third slot | Orbs and Invoke | Never |
| Levelling Invoke | Orbs and Invoke | Never |
| A last-invoked indicator | Orbs and Invoke | Never |
| Ally targeting | Spells | There are no allies |
| Spell lifesteal | Spells | A later loot bet; amplification is phase 8's magic damage % |
| Enemy summons stealing Emberling aggro | Spells | Never in the five phases |
| Named-spell art and sound | Spells | Art, audio |
| Dispels | Status effects | Taken above: the self-lift's, phase 9. Any other waits on a design that needs it |
| Status resistance | Status effects | Items or difficulty |
| Immunity | Status effects | Never as a rule: a boss is health, not an exception. The two scoped exceptions are taken above, phase 9 |
| Status icons with timers | Status effects | A polish pass |

---

## Never

Multiplayer, hero selection, quick-cast, order queues, mobile. The overview and the mechanics spec each state why.

Crafting, by the maintainer's word of 2026-09-26: "No crafting in the game" (Q80). The roadmap's "Not at any point" says so.

By the maintainer's word of 2026-09-27:

- **Measuring the bar in Firefox, Safari, Edge, or on a reference laptop.** The maintainer has no reference laptop and will never run a per-browser check; the bar is measured by an agent in Chrome on the development machine. Every such row that stood open, the phase 6 gate's bar per browser last, is dropped rather than deferred.
- **A benchmark run by hand.** The render benchmark is an agent's, in Chrome through browser automation.
- **A +1 to an orb on any item** (Q92).
- **An enemy's stats scaled by a level**, of the map or of the hero (Q55, confirmed for the whole game): a level drives only loot. This row stood above as "enemy strength scaled per pack or by the hero's level", waiting on a difficulty design.
