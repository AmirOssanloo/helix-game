# Deferred

**Written:** 2026-09-20 · **Kept current by:** whoever cuts something

Everything the plan deliberately leaves out, with the phase it was cut from and the door it waits behind. A missing capability that is a decision reads differently from one that is an oversight; this page is what makes the difference visible.

Sources: the "Deferred" section of every feature page under `docs/product/features/`, the roadmap's "Beyond phase 5" and "Not at any point" lists, and cuts made while writing the sprints.

---

## Cut from a phase

| Item | Cut from | Waits on | Why |
| --- | --- | --- | --- |
| Content hot-reload | Phase 0, sprint 00 | Sprint 17 | A convenience with a replay-validity cost; built once the version stamp exists to refuse a cross-version replay |
| The `Readonly` cast ban, if its lint selector runs over | Sprint 00 | Sprint 01 | The rule is load-bearing; the sprint is not. Move the ticket, not the rule |
| Replay loader and determinism test | Sprint 01 | Sprint 06 | Recording is in sprint 01; replaying proves nothing until there is a session worth replaying |
| Real enemy definitions for the stress test | Sprint 06 | Sprint 12 | A generic unit with random orders is enough to load movement, push-out, and pathing |
| Wane's aggro-drop behaviour test | Sprint 10 | Sprint 12 | The flag is set and tested in phase 2; the behaviour that reads it needs the AI module |
| Enemy summon adds at the live cap | Sprint 16 | Sprint 19 | Stubbed in the death-edge tests; real when summon adds exist |
| Damage-number crit styling | Sprint 16 | No crit exists | Colour per type is enough for the balance pass |
| Non-numeric definition fields on the tuning surface | Sprint 17 | A designer asks for one | Numeric covers every number the roadmap wants retuned |
| The disable matrix's draft | Sprint 18 | Sprint 20 | Only the headings are drafted early so sprint 20 starts on content |

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

Multiplayer, isometric projection, hero selection, quick-cast, order queues, mobile. The overview and the mechanics spec each state why.
