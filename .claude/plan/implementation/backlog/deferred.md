# Deferred

**Written:** 2026-09-20 · **Reviewed:** 2026-09-25, at the phase 4 close; updated at P5-S22-T01 and on 2026-09-25 from the delivery lead's walk; on 2026-09-26 at the phase 6 plan, the Q31 row moved into P6-S25-T02, at the phase 6 gate, at the long road's triage, at Q71's answer, and at the clean run; at the phase 7 and 8 plan, the loot rows taken into them · **Kept current by:** whoever cuts something

Everything the plan deliberately leaves out, with the phase it was cut from and the door it waits behind. A missing capability that is a decision reads differently from one that is an oversight; this page is what makes the difference visible.

Sources: the "Deferred" section of every feature page under `docs/product/features/`, the roadmap's "Beyond phase 8" and "Not at any point" lists, and cuts made while writing the sprints.

---

## Cut from a phase

| Item | Cut from | Waits on | Why |
| --- | --- | --- | --- |
| Damage-number crit styling | Sprint 16 | No crit exists | Colour per type is enough for the balance pass |
| Non-numeric definition fields on the tuning surface | Sprint 17 | A designer asks for one | Numeric covers every number the roadmap wants retuned |
| What the isometric view needs once art is tall: sorting by screen position inside the units and obstacles bands, obstacles split per tile so they hide the right things, picking a unit by its sprite, walls that fade near the hero, and sprites drawn in eight or sixteen directions | Sprint 23 | Sprite art, beyond phase 5 | While the art is flat geometry nothing is tall, so the fixed depth bands hold. ADR 0006 names what changes when it is not |
| The elite and boss outline in a colour that reads on a red body: the thick red outline barely shows on a grunt | Sprint 22, from Q45 on 2026-09-25 | The art pass | Cosmetic; the boss's wider outline reads, and health and behaviour tell an elite apart in play |
| A summoner turning to the hero before its first summon, so the imps stand between them rather than behind it | Sprint 22, from Q42 on 2026-09-25 | The next pass on enemy behaviours | Cosmetic, first cast only; the imps run at the hero either way |
| The phase 6 gate's person row left: the bar at the densest choke in Chrome, Firefox, Safari, and Edge on the reference laptop, written as figures in the phase README | Phase 6 gate, sprint 30 | The maintainer, once phase 6 is done, by the standing instruction of 2026-09-24 | An agent cannot read a GPU browser; an open box in STATUS.md with its steps. The playtest, its replay, and its triage held on the clean run of 2026-09-26: level 10 at the last boss's kill, the session replaying identically, every note given an outcome |
| The hero's attack growing with level, a new attribute conversion rather than a number | Sprint 22, from Q38 on 2026-09-25 | The next bet's balance pass; the long road's triage may take it into the bucket if the playtest asks | The balance pass's four goals hold without it; a pack of five is a fight for spells at every level by design until then |
| *One floor*: a generated floor, loot, equipment, and stairs down, the bet the [retrospective](../../2026-09-25-retrospective-and-account.md#8-the-recommended-next-bet-one-floor) recommended | Phase 6, by the maintainer's choice on 2026-09-26; split on 2026-09-26 (Q73) | The generated floor and stairs: phases 7 and 8, then a bet of their own, phase 9 or later. Its loot and equipment half is [phase 7](../phase-7-loot-and-the-store/README.md), below | The maintainer chose a hand-authored playtest map first, then split the bet: loot and the store, then active items, both on the long road, before a generator |
| Enemy strength scaled per pack or by the hero's level | Phase 6, Q55 | A difficulty design | A region's difficulty is its archetypes, tiers, and counts; scaling would hide what the playtest is meant to measure |
| A map editor | Phase 6 | A second hand-authored map | One map is typed from its spec and held by content tests |
| An eleventh spell | Phase 6 | A kit redesign by the engineering architect | Three orbs give exactly ten recipes; a new spell takes over a recipe through the replace-a-spell runbook |
| The town, sprite art, audio, and saves on the long road | Phase 6 | The list after phase 8 | The long road is a playtest of fighting and progression; each of these is its own bet. Loot and items were on this row until the maintainer took them as phase 7 (Q73) |
| The hero's side toward Diablo II curves: hero health from strength, the attribute gains per level, the Dota experience table, spell scaling, and the long road's levelling budget moved with them | Phase 6, the long road's triage, 2026-09-26 | A decision to take it as a bet; the clean run of 2026-09-26 reached level 10 at the last boss on the enemy retune alone, and named no hero-side gap | A bet of its own, a week or more: it moves every balance log, the level table, and the spec's budget (Q58). The triage retuned the enemy side only, so the clean run shows how far that alone goes |
| A dedicated last boss: its own archetype definition with the brute's kit and about 1450 health, Andariel's ratio to a Catacombs normal (about 17 times) on the retuned brute's 85, experience 90 so that 10 times still pays 900; the registry, the enemy catalogue, the long road spec's pack 32, and the content version move with it | Phase 6, P6-S30-T03, by the maintainer's answer to Q71 on 2026-09-26 | The next bet's choice; the clean run of 2026-09-26 killed the last boss with no note on it | The five bosses share `boss_health_multiplier`, so the last boss, a boss-tier brute, lands at 340 health and about 11 of the hero's basic attacks; the gap is written in the ratios note, and the clean run says whether it matters. Content only, about 0.5 to 1 |
| Two-handed weapons | Phase 7, by the maintainer's decision of 2026-09-26 (Q75) | A design for what a two-handed item does to the off-hand, and a reason to want it | One-handed bases keep the ten armory slots independent: no equip ever empties a second slot |
| A pickup order: click an item to walk to it and take it | Phase 7, by the maintainer's decision of 2026-09-26 (Q74) | A playtest that finds walk-over pickup wrong | Walk-over pickup needs no new order kind and no disable-matrix column for one; a click-to-pick-up would |
| A death penalty: gold or items lost on death, or a corpse to run back to | Phase 7, by the maintainer's decision of 2026-09-26 (Q79) | Saves, since a penalty on a run that a reload ends means little | A hero who dies keeps everything and comes back at the furthest checkpoint, as today |
| A sized inventory grid, where an item takes more than one cell, and a stash | Phase 7, Q88 | A playtest that finds forty equal cells too few or too flat; the stash waits on saves and a town | One item a cell is a list; a sized grid is a packing problem and a screen of its own |
| A store that restocks, or that sells back what it bought | Phase 7, Q90 | A town, or a playtest that asks | A stock rolled once per checkpoint is deterministic on one key and needs no clock |
| Comparing an item with the one worn, in its tooltip | Phase 7, sprint 36 | A playtest that asks | The tooltip reads one item; a comparison reads two and their difference on the stack |
| Sets, sockets, and item lifesteal | Phase 7 | A second loot bet, after phase 8 | Seven rarities and rolled affixes are the loot depth this bet tests |
| The eight active items dropping and in the store | Phase 7, Q84 | [Phase 8](../phase-8-active-items/README.md), which turns their drop weight and store listing on | They are Legendary items with a weight of zero until they can be used |

---

## Taken into a planned phase

A row of the tables on this page moves here when a phase's plan takes it, with the ticket that builds it. It moves on to "Cut and since built" when that ticket is done.

| Item | Cut from | Planned in |
| --- | --- | --- |
| Health and mana from loot drops: enemies dropping health and mana the hero picks up, so the long road is finished without the panel's **Heal** and **Restore mana**. On the clean run, seed 3742014961, the maintainer needed 2 `heal` and 8 `restore_mana` and accepted it "because later we will have loot that will drop health and mana": the first measured sustain gap, the evidence the drop rates are tuned against | Phase 6, the long road's clean run, 2026-09-26 | Phase 7: globes, P7-S33-T02; the rates, P7-S37-T01; the gate's first row |
| Loot and drops | The enemies page | Phase 7: P7-S32-T02, rarity P7-S35-T01 |
| Items as modifier sources | The hero page | Phase 7: P7-S34-T01 |
| Item slots, inventory, equipment | The HUD page | Phase 7: P7-S33-T01, the screen P7-S34-T03 |
| Spell amplification (lifesteal stays below) | The spells page | Phase 7: spell damage %, P7-S34-T01 |
| Tooltips, for items | The HUD page | Phase 7: P7-S36-T01. Tooltips on spells and statuses stay below |
| Usable items as abilities | The retrospective's items sizing | Phase 8, sketched |

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
| Key rebinding | Controls and orders | A settings menu. Phase 8's six active-item keys, T, X, V, C, G, and Space (Q82), are more a rebind must cover, and G is provisional until then |
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
| Enemy affixes | Enemies | Items or a difficulty design |
| Forms as playable content | Hero | Design of a second form; the architecture is ready and tested by a door test in sprint 22 |
| Talents and kit upgrades | Hero, Spells | Never in the five phases |
| Real death rules | Hero | The dungeon loop; a death penalty waits on saves, above |
| Stat growth past 30, prestige | Hero | Never in the five phases |
| Potions | Hero | A belt, which needs the retrospective's Kit fix; phase 7's globes stand in for them |
| A second kit's HUD layout | HUD | A second form; tested by a door test |
| Minimap | HUD, Map and camera | A map larger than the arena. The long road is one, and it is cut from phase 6: the road is one direction, so progress reads without it. The first item above the line if the playtest shows the maintainer lost |
| Tooltips on spells and statuses | HUD | A settings or polish pass; item tooltips are phase 7's |
| Sound cues | HUD, Orbs and Invoke, Spells | Audio |
| Animated art | HUD | The sprite atlas |
| Procedural dungeons, acts, biomes | Map and camera | The generator; the map format is ready |
| Exits, portals, transitions | Map and camera | The dungeon loop; run and map scope are ready and tested by a door test |
| Tile art | Map and camera | Art; the tile-layer view kind is tested by a door test |
| Fog of war | Map and camera | A map larger than the arena. Cut from phase 6: the long road hides nothing worth finding |
| A day-night clock | Map and camera | Never in the five phases |
| A third slot | Orbs and Invoke | Never |
| Levelling Invoke | Orbs and Invoke | Never |
| A last-invoked indicator | Orbs and Invoke | Never |
| Ally targeting | Spells | There are no allies |
| Spell lifesteal | Spells | A later loot bet; amplification is phase 7's spell damage % |
| Enemy summons stealing Emberling aggro | Spells | Never in the five phases |
| Named-spell art and sound | Spells | Art, audio |
| Dispels | Status effects | A design that needs them |
| Status resistance | Status effects | Items or difficulty |
| Immunity | Status effects | Never in the five phases; a boss is health, not an exception. Phase 8 takes two scoped exceptions from active items, Gyre Sceptre's invulnerable lift on the hero and Veilblade's `ethereal` (Q81), decided by its architect ticket first |
| Status icons with timers | Status effects | A polish pass |

---

## Never

Multiplayer, hero selection, quick-cast, order queues, mobile. The overview and the mechanics spec each state why.

Crafting, by the maintainer's word of 2026-09-26: "No crafting in the game" (Q80). The roadmap's "Not at any point" says so.
