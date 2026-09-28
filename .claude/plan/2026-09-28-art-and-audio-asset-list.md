# Art and audio: when they are needed, and the list to order

**Written:** 2026-09-28 · **Author:** the delivery strategist, on the maintainer's request of that day · **For:** the maintainer, who orders the assets (Q132, Q133); phase 16's tickets, whose content test reads this list
**Status of this document:** a dated plan. The list is frozen against content by P15's gate walk (`pnpm roster`, P15-S99-T04), and the order is placed from the frozen list.

---

## 1. When exactly sound and art are needed

**Short answer: not before phase 16.** On 2026-09-28 the maintainer moved every sound and every sourced asset to phase 16, and the plan was re-cut to match:

| Phase | What it shows or plays | Needs a sourced asset? |
| --- | --- | --- |
| 10, the first stratum | Portal and waypoint rings, the Nave's floor tint, the fade, the waypoint screen: all painted in code by the shape painter (`src/presentation/atlas/shape-painter.ts`), as every frame is today | No |
| 11, saves | The stash, start screen, and penalty line: flat shapes and the bitmap font. **The audio adapter and the enemy cast tells moved out of this phase to phase 16.** Every cast is read by its visual tell, as today | No |
| 12, the Undercroft and the Ossuary | A silhouette per family and ten aspect icons, **painted in code** into the one atlas page. These are for readability, since fifteen families can't be told apart as tinted squares; they are not art. **ADR 0021, the sprite-sheet format, moved out to phase 16** | No |
| 13, loot at depth | New item bases drawn as today's per-slot silhouettes | No |
| 14 and 15, strata 4 to 10 | Each new family's silhouette, the fear, mute, and tether glyphs, and the burning-ground and null-field looks, all painted in code. The run-won screen in plain text | No |
| **16, art and audio** | Everything in sections A and S below | **Yes, but only from sprint 109** |

**Inside phase 16, the assets are needed late.** Sprints 104 to 108 are about 20 of its 28 ticket days. They build the whole pipeline on **placeholders in the final format**, so none of that work waits on a delivery:
- a script renders placeholder sheets in ADR 0021's format from the painted frames;
- a synthesiser writes every sound on the list.

Only four tickets are drop-ins that need delivered files:

| Ticket | Needs in hand |
| --- | --- |
| [P16-S109-T02](./implementation/phase-16-art-and-audio/sprint-109-the-labels-and-the-first-deliveries.md) | The hero, the UI and loot art, the town, and strata 1 to 4 (families, bosses, environment) |
| [P16-S109-T03](./implementation/phase-16-art-and-audio/sprint-109-the-labels-and-the-first-deliveries.md) | Strata 5 to 7 |
| [P16-S109-T04](./implementation/phase-16-art-and-audio/sprint-109-the-labels-and-the-first-deliveries.md) | Every sound |
| [P16-S110-T01](./implementation/phase-16-art-and-audio/sprint-110-the-last-strata-the-bench-and-the-playtest.md) | Strata 8 to 10 and the Unwound |

### What moving everything to phase 16 costs

- **No sound in five playtests (phases 11 to 15).** The Gaolmaster's `stun_bolt`, the Ossuary's bolts and mana burns, and every later disable are judged by eye alone. The design's condition that "nothing heard is not also shown" means the screen already carries every tell, so this is a lost second channel, not a lost rule. If a playtest finds a tell unreadable, the fix is a visual one, in that phase's bucket.
- **The sheet format is decided late.** ADR 0021 now opens phase 16 (P16-S104-T01, 2 days). A bought pack arrives in its own format and the ADR is written against it, so that costs nothing. **Art made to order needs the format before the artist starts.** In that case, run P16-S104-T01 alone, early, at the order date. It is a record and a bench with no gameplay change, and it is the one piece of phase 16 worth pulling forward.
- **Phase 16's calendar is the later of its engineering and the deliveries.** The engineering is sized (31 days, about 15 engineer-days expected). The deliveries are not.

### The order dates, which are the only thing before phase 16 that anyone has to do

| If the source is | Place the order by | Why |
| --- | --- | --- |
| A bought isometric asset pack and a bought sound library | **Phase 15's start** (sprint 96) | Short lead time; the pack is chosen against this list, and ADR 0021 is written against the pack |
| Art or sound made to order | **Phase 13's start** (sprint 81), in three batches as each roster settles | Lead time runs beside phases 13 to 15 instead of after them ([R44](./implementation/02-risks-and-hidden-work.md)) |

Made-to-order batches follow the roster. A batch is ordered when the game designer's tickets have fixed what it draws:

| Batch | Contents | Its roster is fixed at |
| --- | --- | --- |
| A | The hero and orbs, UI, cursors, font, loot icons, the travel objects, the town, the Nave, the Undercroft, and the Ossuary: 15 families, 3 stratum bosses, 3 environment sets. **All sounds by kind**, since the tell kinds do not grow with the roster | End of phase 12 (its roster tickets in sprints 72 and 73) |
| B | Strata 4 to 7: 8 families, 4 bosses, 4 sets | Phase 14's design tickets, sprints 86 and 87 |
| C | Strata 8 to 10 and the Unwound: 6 families, 3 bosses, 3 sets | Phase 15's design tickets, sprints 96 to 98; frozen at the phase 15 gate |

**Decisions wanted from the maintainer, and when:** Q132 (sounds) and Q133 (art), pack or made to order and a budget, by **phase 13's start** at the latest. That is the date after which only the pack route is still on time.

---

## 2. How to read the list

- **Doc:** decided by a page under `docs/` or an accepted plan answer (a Q row). The source is named.
- **Rec:** a recommendation where the docs do not decide. It can be changed freely; it is not a fact of the game.
- **TBD (Pn):** named in the docs, with details set by the game designer's ticket in phase *n*. It goes on the order now, and its brief follows.
- **Names are the game's own:** hero, unit, enemy, archetype, family, variant, tier, spell, ability, active item, status, zone, projectile, summon, add, ground item, label, tooltip, screen. The game is **Helix**; **Skein** is the hero's kit, never the game.
- **Ids in `code font`** are the ids content uses, or will use; an id from phase 9 or later comes from the plan.
- **Counts marked Rec** move the totals when they move.

### The binding style rules (Q133, Q132; roadmap phase 16)

| Rule | Consequence for the order |
|---|---|
| Isometric at the view's one fixed angle: a 2:1 diamond floor, each 32-unit walkability cell a 40 × 20 px diamond, the floor art diamond 160 × 80 px over 4 × 4 cells; no zoom (map-and-camera) | Every sprite is drawn for that one angle and one scale; no zoom levels needed |
| Dark and grounded, Diablo I / II; low colour on floor and walls so units, casts, labels read above | Environment palettes desaturated; VFX and units carry the colour |
| Each family readable by silhouette alone at on-screen size, before colour | 29 distinct silhouettes, tested at game scale |
| A variant = its family's sprite with its own palette and one detail, not a new sprite (also phase 16 cut-line) | 104 palette + detail rows, no new sheets |
| Elites and bosses keep an outline (enemies page: elite outline, boss thicker) | An outline treatment, ideally drawn by the engine, over every enemy sprite |
| Every unit shows facing | Directional sprites for every unit |
| An enemy's cast is a pose held through its cast point | A held cast pose per family and boss |
| One tell per KIND of cast, heard as the cast point begins; projectile tells loop in flight; stratum bosses lower and louder; hero and item confirmations short and dry, never masking a tell; nothing heard the screen does not show | Sound list below is built by kind, not per ability |
| Out of scope for the plan: voice, music beyond ambience, cutscenes | None ordered |

### Global recommendations the docs leave open

| Item | Recommendation | Why |
|---|---|---|
| Directions | **8 directions (Rec)**. The deferred list names "eight or sixteen"; 8 reads the facing a 0.6 rad per 0.03 s turn rate needs, and 16 doubles every directional sheet. Hero at 16 is the one upgrade worth pricing as an option | backlog/deferred.md row "What the isometric view needs once art is tall" |
| On-screen size | Rec: a unit's footprint ellipse is about 0.88 px per world unit of radius across. Bound radius 14 (small) ≈ 25 px wide, 24 (medium, the hero) ≈ 42 px, 44 (large) ≈ 78 px. Frame cells Rec: small 48 × 64, medium 64 × 96, large 128 × 128, stratum bosses 192 × 192 to 256 × 256 | enemy catalogue section 2.1 radius classes 20 / 32 / 64 collision, 14 / 24 / 44 bound; map-and-camera diamond size |
| Frame rates and counts | Rec: idle 6–8 frames, walk 8, attack 8–10 with the release on the frame matching the attack point, cast 4-frame wind-up + held loop + 3-frame release, death 8–10 ending on a held corpse frame. 12–15 fps | none decided |
| Sheet format | One atlas page per stratum (ADR 0021, written, benched, and accepted in P16-S104-T01); hero, items, icons, and font on every page or a second texture. Deliver layered sources so palettes and details can be re-cut | architecture outline; phase 16 README |
| Resolution | The logical canvas is 1920 × 1080; device pixel ratio is ignored "until real art arrives" (map-and-camera). Rec: deliver at 1× and 2× | map-and-camera |

---

# ART

## A1 — The hero: Skein's body, its orbs, and its states

The hero is one unit, a ranged caster (hero page). Collision radius 27, bound radius 24, speed 280, turn rate 0.6 rad per 0.03 s (hero page, mechanics spec). Placeholder today: a white disc with a triangle for facing (`disc`, tint `0xffffff`, `src/content/hero.ts`).

| Id | What | Animations / states (8 directions each, Rec) | Count | Source |
|---|---|---|---|---|
| A1-01 | Hero body sprite | one sheet, the animations below | 1 sprite | hero.md; hud.md placeholder table |
| A1-02 | Idle | loop | 1 anim | Rec |
| A1-03 | Walk | loop; playback scaled by movement speed (Whorl instances, boots, slows move it; minimum 100) | 1 | hero.md orb passives; status-effects slow |
| A1-04 | Attack | ranged projectile attack: attack point 0.4 s, backswing 0.7 s; the release frame at the attack point; the backswing cancellable, so the loop must cut cleanly | 1 | spells-and-attack "The attack" |
| A1-05 | Cast | spell cast point 0.05–0.1 s, backswing 0.1 s (a short flick); one generic cast serves all ten spells and the active items with a target (Rec) | 1 | spell catalogue section 3 |
| A1-06 | Cast, held | Skyfall Maul's 2 s cast point: a held wind-up | 1 | item catalogue 7.1 |
| A1-07 | Channel | the town portal on B: a 3 s channel loop | 1 | map-and-camera "The town portal"; vocabulary "Channel" |
| A1-08 | Stunned | loop (stun, and the self-lift's companion rows) | 1 | disable matrix |
| A1-09 | Self-lift | Gyre Sceptre on the hero: rise, 2.5 s airborne spin loop, land. The hero may press Q W E R in the air, so the orbs stay visible | 1 (3 segments) | status-effects "Self-lift"; item catalogue 7.1 |
| A1-10 | Knocked back | carried by a slam's push; stagger loop | 1 | enemy ability `slam` |
| A1-11 | Death | one-shot, ending on a held body frame; lies 3 s (`respawn_delay`) | 1 | hero.md "Death and respawn" |
| A1-12 | Respawn | one-shot at the checkpoint (Rec) | 1 | Rec |
| A1-13 | Hit react | optional; the game's hit flash is a white tint and needs no frames | 0 (optional 1) | hud.md "Hit flash" |
| A1-14 | Feared | TBD (P14): fear walks the hero away from the caster; reuse Walk (Rec) | 0 | design outline phase 14 |
| A1-15 | Rooted, disarmed, silenced, muted | no body animation; idle plus the status VFX (A6) | 0 | disable matrix |
| A1-16 | Wane (hidden from aggro) | a translucency / veil treatment on the body, engine-drawn (Rec) | treatment | spell catalogue 3.2 |
| A1-17 | Ethereal (Veilblade on the hero) | a ghostly treatment, engine-drawn (Rec) | treatment | item catalogue 7.1 |
| A1-18 | Blink (Slipknife) | VFX only (A5), no body frames | 0 | item catalogue 7.1 |

**Orbs.** The three orb instances orbit the hero, oldest to newest matching the bar (hud.md "Floating orbs"; orbs-and-invoke). Colours Doc: Quartz blue, Whorl purple, Ember orange.

| Id | What | Animations | Count | Source |
|---|---|---|---|---|
| A1-19 | Quartz orb instance | idle orbit loop; appear pop; evict fade | 1 sprite, 1 loop | orbs-and-invoke; hud.md |
| A1-20 | Whorl orb instance | same | 1 sprite, 1 loop | same |
| A1-21 | Ember orb instance | same | 1 sprite, 1 loop | same |

**Hero subtotal:** 1 body sprite, 11 animations (A1-02 to A1-12), 8 directions → 88 directional strips; 3 orb sprites with 3 loops; 2 engine treatments.

---

## A2 — Enemy families, by stratum

**Doc** (the-descent section 2.2, 3): 29 families. A family = one behaviour, one body shape, one kit, one silhouette. The 13 archetypes of the long road are the first 13 families; the long road keeps its 13 archetypes as they are, drawn with the family sprite (Rec, see open decisions). Tiers: normal, elite (outline), boss (thicker outline) — every family can spawn at every tier, so its sprite must carry the boss-tier casts too.

**Base animation set per family (Rec, from Q133 and the disable matrix):** idle, walk, attack, cast (wind-up, held loop through the cast point, release), stunned, lifted (by Updraft, Gyre Sceptre), knocked back (Clarion), death ending on a corpse frame (corpses hold a slot, and the raiser stands them up again) = **8 animations**. **+ charge** (a dash loop) for families that cast `charge` at any tier. Rooted, disarmed, slowed, ethereal need no frames (idle / playback speed / engine treatment). A raise is the death played backwards plus a raised treatment (A4), no new frames.

### A2.1 The long road's thirteen, the first thirteen families

Frames today: `square` (closes to contact), `square_dot` (fights from range), drawn at the bound radius, tinted (enemy catalogue section 3, 7.2).

| Id | Family (archetype id) | Stratum introduced | Behaviour | Size class (bound radius) | Attack | Casts at any tier (own · elite · boss) | Carried statuses | Long road tint | Animations | Source |
|---|---|---|---|---|---|---|---|---|---|---|
| A2-01 | Grunt (`melee_grunt`) | 1 The Nave | `melee_chaser` | medium (24) | melee 26, 0.4 s point | none · `slam` · `self_heal`, `slam`, `charge` | — | `0xe05a4f` red | 8 + charge = 9 | enemy catalogue 3.1 |
| A2-02 | Runner (`fast_runner`) | 1 | `melee_chaser` | small (14) | melee, quick 0.3 s | none | — | `0xf2c14e` yellow | 8 | 3.2 |
| A2-03 | Archer (`ranged_archer`) | 1 | `ranged_holder` | medium (24) | arrow 900/s, r 10, range 500 | none | — | `0x5cb85c` green | 8 | 3.3 |
| A2-04 | Tank (`tank`) | 1 | `melee_chaser` | large (44) | melee heavy, 0.6 s point | none | — | `0xa9743b` brown | 8 | 3.4 |
| A2-05 | Frost raider (`frost_raider`) | 1 | `melee_chaser` | small (14) | melee, 0.3 s | none · `charge` · `self_heal`, `charge` | `frost_attack` | `0x7fd3e8` ice blue | 9 | 7.3.2 |
| A2-06 | Lancer (`lancer`) | 1 | `charger` | medium (24) | melee reach 120 | `charge` · `slam` · `root_net`, `slam` | — | `0x4a90d9` steel blue | 9 | 7.3.8 |
| A2-07 | Hexer (`hexer`) | 2 The Undercroft | `ranged_kiter` | medium (24) | bolt 800/s, range 450 | `silence_curse` · `root_net` · `root_net`, `summon_adds` | — | `0x3f51b5` indigo | 8 | 7.3.3 |
| A2-08 | Trapper (`trapper`) | 2 | `ranged_holder` | medium (24) | arrow 900/s, range 500 | `root_net` · `arrow` · `arrow`, `summon_adds` | — | `0x2e8b7a` teal | 8 | 7.3.4 |
| A2-09 | Skirmisher (`skirmisher`) | 2 | `ranged_kiter` | small (14) | dart 1000/s, r 8, range 450 | `arrow` · `root_net` · `self_heal`, `root_net`; `stun_bolt` on the long road's pack 21 | — | `0xe07b39` orange | 8 | 7.3.5; design outline phase 9 |
| A2-10 | Crusher (`crusher`) | 2 | `melee_chaser` | large (44) | melee heavy, 0.6 s | `slam` · `charge` · `self_heal`, `charge` | — | `0x7a7a8c` slate | 9 | 7.3.6 |
| A2-11 | Summoner (`summoner`) | 2 | `ranged_holder` | medium (24) | bolt 800/s, range 550 | `summon_adds` · `silence_curse` · `silence_curse`, `self_heal` | — | `0x5e3a8c` dark violet | 8 | 7.3.7 |
| A2-12 | Troll (`troll`) | 2 | `melee_chaser` | medium (24) | melee 64, 0.5 s | `self_heal` · `slam` · `slam`, `charge` | — | `0x9aa33b` moss green | 9 | 7.3.9 |
| A2-13 | Brute (`brute`) | 2 | `melee_chaser` | medium (24) | melee 46, 0.5 s | none · `slam` · `slam`, `summon_adds`, `charge`; `stun_bolt` on the long road's last boss, pack 37 | `bash` | `0x8c2f39` dark red | 9 | 7.3.1; design outline phase 9 |

Note (Doc, the-descent 2.2): stratum 1 introduces grunt, runner, archer, tank, frost raider, lancer; stratum 2 the other seven.

### A2.2 The sixteen families below the long road

Behaviour, problem, and ability are Doc (the-descent 3.1). Size, attack projectile, variant III's extra ability, and the boss-tier casts are **TBD** in the phase design tickets named. Attack column is Rec from the behaviour: a holder or kiter fires from range, a chaser closes to contact.

| Id | Family | Stratum | Behaviour | Ability (Doc) | Attack (Rec from behaviour) | Details set in | Animations (Rec) | Source |
|---|---|---|---|---|---|---|---|---|
| A2-14 | Leech | 3 The Ossuary | Kiter | `mana_burn`, cast at range | ranged | TBD (P12, sprint 73) | 8 | the-descent 3.1 |
| A2-15 | Bolter | 3 | Holder | `stun_bolt` (homing projectile, 700/s, range 900, cast point 0.6 s) | ranged | TBD (P12) | 8 | 3.1; design outline phase 9 |
| A2-16 | Dragger | 4 The Cisterns | Holder | `drag_hook`, a homing projectile, then a pull | ranged | TBD (P14, sprint 86) | 8 | 3.1 |
| A2-17 | Bloater | 4 | Chaser | `death_burst` on death, chains one link a tick, harms enemies too | melee | TBD (P14) | 8 (+ a swell/burst death, Rec) | 3.1; Q129 |
| A2-18 | Mender | 5 The Warrens | Holder | `mend` the most hurt member of its pack | ranged | TBD (P14) | 8 | 3.1 |
| A2-19 | Dreadcaller | 5 | Kiter | `fear` | ranged | TBD (P14) | 8 | 3.1 |
| A2-20 | Raiser | 6 The Furnace | Holder | `raise` its pack's dead, once each | ranged | TBD (P14, sprint 87) | 8 | 3.1 |
| A2-21 | Nest | 6 | Stationary | `spawn_brood` every few seconds until broken | none (Rec) | TBD (P14) | 7: idle, spawn (cast), stunned, lifted?, knocked back?, hit, break (death); no walk. Rec: idle, cast, hit, death only, if the designer rules it cannot be lifted or pushed | 3.1 |
| A2-22 | Flicker | 7 The Mirrorhalls | Kiter | `blink_away` when the hero closes | ranged | TBD (P14) | 8 (+ blink out/in, VFX) | 3.1 |
| A2-23 | Kindler | 7 | Chaser | `ember_trail`, burning ground where it walks | melee | TBD (P14) | 8 | 3.1 |
| A2-24 | Hush | 8 The Hushed Choir | Kiter | `mute`: the six active-item keys refused for 3 s | ranged | TBD (P15, sprint 96) | 8 | 3.1; design outline phase 15 |
| A2-25 | Thornback | 8 | Chaser | `thorns`, carried | melee | TBD (P15) | 8 | 3.1 |
| A2-26 | Binder | 9 The Rift | Holder | `tether`: leaving its circle before it ends stuns | ranged | TBD (P15, sprint 97) | 8 | 3.1 |
| A2-27 | Nullifier | 9 | Holder | `null_field`, a field that silences | ranged | TBD (P15) | 8 | 3.1 |
| A2-28 | Splitter | 10 The Pit | Chaser | `split` into two smaller on death, twice | melee | TBD (P15, sprint 97) | 8 (+ split death, Rec) | 3.1 |
| A2-29 | Bulwark | 10 | Chaser | `front_shield`: turns away projectiles and spells from its front | melee | TBD (P15) | 8 (shield must read in every facing) | 3.1 |

**Family subtotal (Rec):** 29 sprites. 28 × 8 + nest 7 = 231, + charge on grunt, frost raider, lancer, crusher, troll, brute = 6 → **237 animations**, 8 directions → 1896 directional strips. The descent families' boss-tier and variant III abilities are TBD; a new movement ability (a leap, a charge) adds one animation each.

### A2.3 Variants I–IV: palette + one detail each

**Doc:** each variant is a whole archetype with its own name, tint, and numbers; "its family's sprite with its own palette and one detail" (Q133; phase 16 cut-line). A family lives five strata: I, II, III, IV, then IV again as the crowd; a family introduced in stratum 8 or deeper stops where it stands (the-descent 3). **Every variant name is TBD** in the phase named per cell. Variant III and IV add "one ability more, or a stronger version of the family's own" (the-descent 3; phase 12 README: one ability more at III).

Cells read: *stratum where the variant stands* · *phase whose designer ticket names it*.

| Family | I | II | III | IV | IV again as the crowd | Rows |
|---|---|---|---|---|---|---|
| Grunt | 1 · P10 (s55) | 2 · P12 (s73) | 3 · P12 | 4 · P14 (s86) | 5 | 4 |
| Runner | 1 · P10 | 2 · P12 | 3 · P12 | 4 · P14 | 5 | 4 |
| Archer | 1 · P10 | 2 · P12 | 3 · P12 | 4 · P14 | 5 | 4 |
| Tank | 1 · P10 | 2 · P12 | 3 · P12 | 4 · P14 | 5 | 4 |
| Frost raider | 1 · P10 | 2 · P12 | 3 · P12 | 4 · P14 | 5 | 4 |
| Lancer | 1 · P10 | 2 · P12 | 3 · P12 | 4 · P14 | 5 | 4 |
| Hexer | 2 · P12 | 3 · P12 | 4 · P14 | 5 · P14 | 6 | 4 |
| Trapper | 2 · P12 | 3 · P12 | 4 · P14 | 5 · P14 | 6 | 4 |
| Skirmisher | 2 · P12 | 3 · P12 | 4 · P14 | 5 · P14 | 6 | 4 |
| Crusher | 2 · P12 | 3 · P12 | 4 · P14 | 5 · P14 | 6 | 4 |
| Summoner | 2 · P12 | 3 · P12 | 4 · P14 | 5 · P14 | 6 | 4 |
| Troll | 2 · P12 | 3 · P12 | 4 · P14 | 5 · P14 | 6 | 4 |
| Brute | 2 · P12 | 3 · P12 | 4 · P14 | 5 · P14 | 6 | 4 |
| Leech | 3 · P12 | 4 · P14 | 5 · P14 | 6 · P14 | 7 | 4 |
| Bolter | 3 · P12 | 4 · P14 | 5 · P14 | 6 · P14 | 7 | 4 |
| Dragger | 4 · P14 | 5 · P14 | 6 · P14 | 7 · P14 | 8 | 4 |
| Bloater | 4 · P14 | 5 · P14 | 6 · P14 | 7 · P14 | 8 | 4 |
| Mender | 5 · P14 | 6 · P14 | 7 · P14 | 8 · P15 | 9 | 4 |
| Dreadcaller | 5 · P14 | 6 · P14 | 7 · P14 | 8 · P15 | 9 | 4 |
| Raiser | 6 · P14 | 7 · P14 | 8 · P15 | 9 · P15 | 10 | 4 |
| Nest | 6 · P14 | 7 · P14 | 8 · P15 | 9 · P15 | 10 | 4 |
| Flicker | 7 · P14 | 8 · P15 | 9 · P15 | 10 · P15 | — | 4 |
| Kindler | 7 · P14 | 8 · P15 | 9 · P15 | 10 · P15 | — | 4 |
| Hush | 8 · P15 | 9 · P15 | 10 · P15 | — | — | 3 |
| Thornback | 8 · P15 | 9 · P15 | 10 · P15 | — | — | 3 |
| Binder | 9 · P15 | 10 · P15 | — | — | — | 2 |
| Nullifier | 9 · P15 | 10 · P15 | — | — | — | 2 |
| Splitter | 10 · P15 | — | — | — | — | 1 |
| Bulwark | 10 · P15 | — | — | — | — | 1 |
| **Total** | | | | | | **104** (the descent's "about a hundred") |

Each row delivers: a palette (the variant's tint, which its attack projectile also carries: enemy catalogue 2.1 "Frame · tint") and one detail (Rec: a separable overlay layer — a helm, horns, a banner, a glow — so the detail is not re-drawn on every frame of every direction). The long road's 13 archetypes keep their catalogue tints above: Rec, 13 palette rows more, or reuse variant I's.

---

## A3 — Bosses

### A3.1 Tier outlines (elites and map bosses)

| Id | What | States | Count | Source |
|---|---|---|---|---|
| A3-01 | Elite outline | a thick outline in the family colour around the body, every frame, every direction | 1 treatment | enemies.md "Tiers"; enemy catalogue 6 `square_outline_thick` |
| A3-02 | Boss outline | a larger outline "so its line reads thicker" | 1 treatment | enemies.md "Tiers" |
| A3-03 | Outline colour | Deferred: the red outline barely shows on a red body; the art pass picks a colour that reads on every palette | decision | backlog/deferred.md row 18 |

Rec: drawn by the engine as a filter or silhouette pass, not baked into sheets, or it doubles every family sheet.

### A3.2 The long road's bosses (no sprite of their own)

A region boss is a boss-tier archetype with its guard; it wears the family sprite and the boss outline (the-long-road section 3, 4).

| Id | Pack | Boss | Casts | Legendary piece it may drop | Source |
|---|---|---|---|---|---|
| A3-04 | 7 | Boss grunt, closing region 1 "The approach" | `self_heal`, `slam`, `charge` | — | the-long-road 3–4 |
| A3-05 | 14 | Boss frost raider, region 2 "The line" | `self_heal`, `charge`, carried `frost_attack` | Rimecoil (`rimecoil`) | same; item catalogue 6 |
| A3-06 | 21 | Boss skirmisher, region 3 "The hexes" | `arrow`, `self_heal`, `root_net`, `stun_bolt` | — | same; design outline phase 9 |
| A3-07 | 28 | Boss troll, region 4 "The heavies" | `self_heal`, `slam`, `charge` | Trollhide (`trollhide`) | same |
| A3-08 | 37 | Boss brute, the last boss, region 5 "The hall" | carried `bash`, `slam`, `summon_adds`, `charge`, `stun_bolt` | Hallcrown (`hallcrown`) | same |

### A3.3 Map bosses of the descent (no sprite of their own)

Every map but a stratum's tenth: a boss-tier unit of one of the stratum's families, with its tier's boss abilities, 1 to 3 aspects (by stratum: 1; 2 in strata 2–7; 3 in 8–10), and a guard of two or three of its family, before the portal (the-descent 4, 5.1). Art: the family sprite + variant palette + boss outline + aspect icons over it (A6.3). **No new sprites.**

### A3.4 The ten stratum bosses (a sprite each)

**Doc** (the-descent 5.2): each an archetype written once, in a chamber on its stratum's tenth map; the portal opens on its death; it changes what it casts below 3/4, 1/2, 1/4 of its health; it rolls no aspects; each drops a Legendary piece of its own. Kits in numbers are TBD in the phase named. A stratum boss can be stunned, lifted, and pushed like any unit (enemies.md "a boss is stunned by Hoarfrost like a grunt is").

Animations per boss (Rec): idle, walk, attack, stunned, lifted, knocked back, death = 7, **plus one held cast pose per ability kind in its kit** (Q133), plus Rec a health-threshold transition (optional).

| Id | Stratum boss | Map | What it casts (Doc) | Cast poses (Rec) | Adds it brings | Animations | Kit in numbers | Source |
|---|---|---|---|---|---|---|---|---|
| A3-09 | The Gaolmaster | 10 | `stun_bolt` every 6 s, grunt adds, a slam | 3 (bolt throw, summon, slam) | grunts (grunt family) | 10 | TBD (P10, sprint 55) | the-descent 5.2; phase 10 README |
| A3-10 | The Hollow Abbess | 20 | `silence_curse`, a root net, summoner adds | 3 (curse, net throw, summon) | "summoner adds" — imps (Rec, the summoner's adds) | 10 | TBD (P12, sprint 73) | 5.2 |
| A3-11 | Marrowleech | 30 | `mana_burn` on a clock, a leech's drain, mana-burning adds | 3 (burn, drain, summon) | mana-burning adds: TBD (leech family, Rec) | 10 | TBD (P12) | 5.2 |
| A3-12 | The Drowned Hook | 40 | `drag_hook` into a ring of bloaters | 2 (hook throw, summon ring) | bloaters (bloater family) | 9 | TBD (P14, sprint 86) | 5.2 |
| A3-13 | The Brood Queen | 50 | `fear`, and nests that must be broken | 2 (fear, nest-laying) | nests (nest family) and their brood | 9 | TBD (P14) | 5.2 |
| A3-14 | The Kindled King | 60 | burning ground in rings, `thorns` (carried) | 1 (ring of fire) | — | 8 | TBD (P14, sprint 87) | 5.2 |
| A3-15 | The Glass Twins | 70 | two flickers that blink apart; damage either takes is dealt to the other, so they die together | 1 (blink) | — (they are two units) | 8; one sheet used twice, 2 palettes (Rec) | TBD (P14) | 5.2; Q130 |
| A3-16 | The Choirmaster | 80 | `mute` and `silence_curse` in turn | 2 (mute, curse) — must read apart at a glance | — | 9 | TBD (P15, sprint 96) | 5.2 |
| A3-17 | The Binder Below | 90 | `tether` and `stun_bolt` together | 2 (tether, bolt throw) | — | 9 | TBD (P15, sprint 97) | 5.2 |
| A3-18 | The Unwound, the last boss | 100 | every disable the descent has taught, one set a quarter of its health: four ability sets by health fraction | 4 (Rec: one per set) | whether fought alone or with a crowd: TBD (P15, sprint 98) | 11 + 4 phase states (Rec: a palette/detail change per quarter so the set on is read) | TBD (P15, sprint 98) | 5.2; phase 15 README |

**Boss subtotal:** 10 sprites (the Twins one sheet, two palettes), **93 animations** (70 base + 23 cast poses), 8 directions → 744 directional strips; 4 Unwound phase states; Rec 10 optional threshold transitions.

Also per stratum boss: its **chamber** dressing (A7) and its **Legendary piece icon** (A9).

---

## A4 — Summons, adds, brood, and what deaths make

| Id | What | Id in content | Animations (8 dirs, Rec) | Count | Source |
|---|---|---|---|---|---|
| A4-01 | Emberling, the hero's summon | `emberling` | spawn, idle, walk, attack (ranged, 300 range, 900/s projectile, 0.3 s point), stunned, knocked back, expire (on its timer, and the tick the hero dies) — 7 | 1 sprite. Doc look: "hero white, dimmer", `0xbbbbbb` | spell catalogue 5; summons/emberling.def.ts |
| A4-02 | Imp, the add `summon_adds` brings (two at a time) | `imp` | idle, walk, attack (melee, 0.3 s), stunned, lifted, knocked back, death (no corpse: it leaves on its summoner's death) — 7 | 1 sprite, small (14), violet `0x9b6fd1` | enemy catalogue 3.6 |
| A4-03 | Nest brood, "runners of its stratum" | TBD (P14) | Rec: the runner family sprite in a brood palette; else a sprite of its own | 0–1 sprite, TBD | the-descent 3.1 |
| A4-04 | Splitter children, two smaller on death, twice | TBD (P15) | Rec: the splitter sprite at about 75% and 55% scale, two palettes or none | 0 sprites, 2 scale states | the-descent 3.1; ADR 0020 (phase 12 paper) |
| A4-05 | Raised dead (the raiser stands a corpse up once) | TBD (P14) | the family's death played backwards + a raised treatment (glow/tint), engine-drawn | 1 treatment | the-descent 3.1 |
| A4-06 | Boss adds | — | Gaolmaster: grunts; Hollow Abbess: imps (Rec); Marrowleech: TBD; Drowned Hook: bloaters; Brood Queen: nests + brood — all family or add sprites above | 0 new | the-descent 5.2 |
| A4-07 | Training dummy (arena, spawned from the developer panel only) | `training_dummy` | static, hit-react; never moves, never dies | 1 sprite, **optional** (developer use) | enemy catalogue 3.5 |

**Summons subtotal:** 2 sprites (+1 optional, +1 TBD brood), **14 animations**, 8 directions → 112 strips.

---

## A5 — Spell and ability VFX

Every row is one effect with its states. "Zone" = a ground presence with rules; "effect" = no rules (vocabulary). Placeholder frames today are `disc`, `ring_thin`, `ring_thick`, `square`, `square_outline`, `cone_60` tinted per spell (spell catalogue 6). Zones are drawn on the floor under units (hud.md depth order 1); air effects and lifted units above projectiles (depth order 6).

### A5.1 The hero's attack, Invoke, and generic hero effects

| Id | Effect | States | Size / numbers (Doc) | Source |
|---|---|---|---|---|
| A5-01 | Hero attack projectile | flight loop (homing), with facing | 900/s, range 600 | spells-and-attack "The attack" |
| A5-02 | Hero attack impact | one-shot | physical | same |
| A5-03 | Orb press | a pop on the new orb instance, tinted Quartz / Whorl / Ember | 3 tints of one effect | orbs-and-invoke |
| A5-04 | Invoke | the three orbs flare and fuse; the D square fills | on R, first invoke | orbs-and-invoke |
| A5-05 | Level up | one-shot on the hero | — | hero.md |
| A5-06 | Respawn | one-shot at the checkpoint | — | hero.md |

### A5.2 The ten spells

| Id | Spell (id, recipe) | Effect | States | Size / numbers (Doc) | Tint today | Source |
|---|---|---|---|---|---|---|
| A5-07 | Hoarfrost (`hoarfrost`, QQQ) | cast on the target | one-shot | unit, range 1000 | `0x9be7ff` | spell catalogue 3.1 |
| A5-08 | Hoarfrost | proc: each hit stuns 0.4 s and deals bonus damage, at most every 0.8 s | one-shot burst | — | same | 3.1 |
| A5-09 | Wane (`wane`, QQW) | the chill circle anchored to the hero | spawn, loop, fade | radius 400, 4–10 s | `0xc9d6ff` | 3.2 |
| A5-10 | Glacier (`glacier`, QQE) | one wall segment zone | rise, loop, melt | 7 segments, each 160 along × 80 across, 160 apart; 3–12 s | `0x6fb7ff` | 3.3 |
| A5-11 | Siphon (`siphon`, WWW) | charging zone | 2.9 s charge loop, then burst | radius 500 | `0xb388ff` | 3.4 |
| A5-12 | Siphon | mana drawn out of each enemy on the burst | one-shot per unit | — | same | 3.4 |
| A5-13 | Updraft (`updraft`, WWQ) | a travelling funnel | launch, loop, end | radius 200, 1000/s for 800–2000 | `0xd7b3ff` | 3.5 |
| A5-14 | Updraft | the drop on landing (damage) | one-shot | — | same | 3.5 |
| A5-15 | Quicken (`quicken`, WWE) | cast flare on the hero (the buff itself is A6) | one-shot | 9 s buff | `0xff9de2` | 3.6 |
| A5-16 | Zenith (`zenith`, EEE) | marker drawn for the whole delay | 1.7 s telegraph loop | radius 175, range 1200 | `0xffb347` | 3.7 |
| A5-17 | Zenith | the strike | one-shot | pure damage | same | 3.7 |
| A5-18 | Emberling (`emberling`, EEQ) | summon arrival | one-shot | 80 to the hero's right | `0xff7a45` | 3.8 |
| A5-19 | Emberling | its attack projectile | flight, impact | 900/s | `0xbbbbbb` | 5 |
| A5-20 | Bolide (`bolide`, EEW) | falling-meteor marker | 1.3 s telegraph | radius 200, range 700 | `0xff5533` | 3.9 |
| A5-21 | Bolide | landing | one-shot | — | same | 3.9 |
| A5-22 | Bolide | rolling meteor zone | roll loop, end | 300/s for 500–1400 | same | 3.9 |
| A5-23 | Clarion (`clarion`, QWE) | cone blast | one-shot | 60°, length 900 | `0xffe066` | 3.10 |
| A5-24 | Push (Clarion, slam) | knockback dust trail on the pushed unit | loop while displaced | — | — | status-effects "Knockback" |

### A5.3 The eight active items

Numbers Doc (item catalogue 7.1). Label colour emerald `0x2ecc71` (item catalogue 4).

| Id | Active item (id) | Effect | States | Numbers | Source |
|---|---|---|---|---|---|
| A5-25 | Gyre Sceptre (`gyre_sceptre`) on an enemy | cyclone lifting it (`gyre_lift`) | rise, 2.5 s loop | range 600 | item catalogue 7.1 |
| A5-26 | Gyre Sceptre | landing impact | one-shot | 60 + 5 × L magical | same |
| A5-27 | Gyre Sceptre on the hero | the self-lift cyclone (`gyre_self_lift`) | rise, 2.5 s loop, land | untargetable, invulnerable | same; status-effects |
| A5-28 | Gyre Sceptre self-lift | dispel burst: every enemy status shed on the rising tick | one-shot | — | status-effects "Dispel" |
| A5-29 | Scorchglass (`scorchglass`) | instant beam hero → enemy | one-shot | range 700, 120 + 12 × L | 7.1 |
| A5-30 | Slipknife (`slipknife`) | blink out | one-shot | range 1200 | 7.1 |
| A5-31 | Slipknife | blink in | one-shot | — | 7.1 |
| A5-32 | Rimeward (`rimeward`) | ring growing from the hero | 1.5 s expansion | to 900; slow 40% 4 s | 7.1 |
| A5-33 | Skyfall Maul (`skyfall_maul`) | wind-up and target marker through the 2 s cast point, then 0.5 s fall | telegraph loop | radius 300, range 600 | 7.1 |
| A5-34 | Skyfall Maul | meteor landing | one-shot | 100 + 10 × L; burn 3 s | 7.1 |
| A5-35 | Mainspring (`mainspring`) | refresh flare on the hero (clocks end) | one-shot | — | 7.1 |
| A5-36 | Fetter Bolas (`fetter_bolas`) | bolas projectile | flight loop | 1500/s, range 1100 | 7.1 |
| A5-37 | Fetter Bolas | snare burst at the point | one-shot | radius 250, root 2 s | 7.1 |
| A5-38 | Veilblade (`veilblade`) | blade projectile | flight loop | 1275/s, range 800 | 7.1 |
| A5-39 | Veilblade | impact on hero or enemy (ethereal look is A6) | one-shot | — | 7.1 |

### A5.4 Enemy abilities

Tint today in brackets (src/content/abilities/*.def.ts).

| Id | Ability id | Effect | States | Numbers | Source |
|---|---|---|---|---|---|
| A5-40 | `arrow` | heavy arrow projectile | flight loop (homing) | 900/s, r 12 (`0x8fd18f`) | abilities/arrow.def.ts |
| A5-41 | `arrow` | impact | one-shot | physical | same |
| A5-42 | `charge` | charge trail on the caster | loop while carried | 1200/s (`0xd9534f`) | charge.def.ts |
| A5-43 | `charge` | arrival impact | one-shot | — | same |
| A5-44 | `root_net` | net projectile | flight loop | 900/s, r 24 (`0xc9b27c`) | root-net.def.ts |
| A5-45 | `self_heal` | cast glow (the heal-over-time itself is A6) | one-shot | 0.5 s cast point (`0x7cffa0`) | self-heal.def.ts |
| A5-46 | `silence_curse` | curse landing on the hero | one-shot | 0.5 s cast point (`0xb07cff`) | silence-curse.def.ts |
| A5-47 | `slam` | ground shock | wind-up ring through the 0.6 s cast point, then shock | radius 250 (`0xc08a4a`) | slam.def.ts |
| A5-48 | `summon_adds` | summoning circle where the imps arrive | one-shot | 0.8 s cast point (`0x9b6fd1`) | summon-adds.def.ts |
| A5-49 | `stun_bolt` | stun bolt projectile | flight loop (slow, visible, homing) | 700/s, range 900, cast point 0.6 s | design outline phase 9 |
| A5-50 | `stun_bolt` | stun impact | one-shot | 1.5 s stun | same |
| A5-51 | Disjoint | a projectile that lost its target flies on and ends on nothing: fizzle | one-shot, shared by every homing projectile | — | status-effects "Disjoint" |
| A5-52 | `mana_burn` | the burn's delivery (projectile or direct: TBD P12) | TBD | cast point 0.5 s, range 700, 10 mana/s for 5 s | design outline phase 12 |
| A5-53 | `drag_hook` | hook and chain projectile | flight loop | homing; numbers TBD (P14) | the-descent 3.1 |
| A5-54 | `drag_hook` | the pull (chain reeling the hero in) | loop while pulled | pull distance TBD (P14 open question) | design outline phase 14 |
| A5-55 | `death_burst` | the burst on death; a chain runs one link a tick | one-shot, readable per link | TBD (P14) | the-descent 3.1; Q129 |
| A5-56 | `mend` | heal beam / pulse to the most hurt pack member | one-shot | TBD (P14) | 3.1 |
| A5-57 | `fear` | fear cast on the hero | one-shot | 1.5 s | design outline phase 14 |
| A5-58 | `raise` | a corpse standing up | one-shot | TBD (P14) | 3.1 |
| A5-59 | `spawn_brood` | brood emerging from the nest | one-shot | every few seconds | 3.1 |
| A5-60 | Nest broken | the nest's break, its brood leaving with it | one-shot | — | 3.1 |
| A5-61 | `blink_away` | enemy blink out / in (also the Blinking aspect) | 2 one-shots | TBD (P14) | 3.1; aspects |
| A5-62 | `ember_trail` | burning ground segment zone (also the Burning aspect's ground and the Kindled King's rings, recoloured if wanted) | ignite, loop, die out | trail of fixed segments (phase 14 README) | 3.1 |
| A5-63 | `mute` | mute cast landing on the hero, reading unlike the silence curse | one-shot | 3 s | design outline phase 15 |
| A5-64 | `thorns` | damage turned back on the hero | one-shot per reflect | carried | 3.1 |
| A5-65 | `tether` | the tether's circle zone around the hero, and the link to the binder | spawn, loop, break | radius TBD (P15) | 3.1; phase 15 README |
| A5-66 | `tether` | the stun on leaving the circle | one-shot | — | same |
| A5-67 | `null_field` | a silencing field zone | spawn, loop, fade | TBD (P15) | 3.1 |
| A5-68 | `split` | the body splitting into two | one-shot | twice per splitter | 3.1 |
| A5-69 | `front_shield` | the shield arc on the bulwark's front | loop, readable from every facing | angle TBD (P15) | 3.1 |
| A5-70 | `front_shield` | a projectile or spell turned away | one-shot | — | 3.1 |

### A5.5 Enemy attack projectiles (not abilities)

Today every archetype's shot is a `disc` in the archetype's tint (enemy catalogue 2.1). Rec: one projectile per ranged family, recoloured per variant.

| Id | Family | Projectile | Numbers | Source |
|---|---|---|---|---|
| A5-71 | Archer | arrow | 900/s, r 10 | enemy catalogue 3.3 |
| A5-72 | Hexer | bolt | 800/s, r 10 | 7.3.3 |
| A5-73 | Trapper | arrow | 900/s, r 10 | 7.3.4 |
| A5-74 | Skirmisher | dart | 1000/s, r 8 | 7.3.5 |
| A5-75 | Summoner | bolt | 800/s, r 10 | 7.3.7 |
| A5-76 | Leech | TBD (P12) | Rec from Kiter behaviour | the-descent 3.1 |
| A5-77 | Bolter | TBD (P12) | Rec from Holder | same |
| A5-78 | Dragger | TBD (P14) | Rec from Holder | same |
| A5-79 | Mender | TBD (P14) | Rec | same |
| A5-80 | Dreadcaller | TBD (P14) | Rec | same |
| A5-81 | Raiser | TBD (P14) | Rec | same |
| A5-82 | Flicker | TBD (P14) | Rec | same |
| A5-83 | Hush | TBD (P15) | Rec | same |
| A5-84 | Binder | TBD (P15) | Rec | same |
| A5-85 | Nullifier | TBD (P15) | Rec | same |

### A5.6 Aspects and stratum-boss mechanics

| Id | What | Effect | Source |
|---|---|---|---|
| A5-86 | Rallying aspect | an aura on the pack within 600 | the-descent 4 |
| A5-87 | Volley aspect | three shots in a fan: reuses the family projectile | the-descent 4; phase 12 README |
| A5-88 | Kindled King | burning ground in rings (Rec: A5-62's ground in a ring layout, plus a ring telegraph) | the-descent 5.2 |
| A5-89 | The Glass Twins | the damage link between the two (a flash on the twin that did not take the hit) | the-descent 5.2; Q130 |
| A5-90 | Stratum boss health threshold | Rec: a flare when the boss changes what it casts at 3/4, 1/2, 1/4 | the-descent 5.2 |
| A5-91 | The Unwound's set change | TBD (P15 sprint 98): Rec, a transformation effect per quarter | phase 15 README |

Reused, no new row: Blinking (A5-61), Burning's ground (A5-62), Vengeful (A5-64), Leeching (A6 mana burn), Frostbound (A6 `frost_attack`), Swift / Stoneskin / Warded (icon only).

### A5.7 Generic combat

| Id | Effect | States | Source |
|---|---|---|---|
| A5-92 | Hit spark, physical | one-shot; the damage number is red | hud.md "Damage numbers" |
| A5-93 | Hit spark, magical | one-shot; blue | same |
| A5-94 | Hit spark, pure | one-shot; gold | same |
| A5-95 | Vanish (an add or a summon leaving with no corpse) | one-shot | enemies.md; spell catalogue 3.8 |
| A5-96 | Invulnerable / physical-immune absorb (a hit on a self-lifted or ethereal unit that does nothing) | one-shot | status-effects; disable matrix note 19–20 |

**VFX subtotal:** 96 rows (A5-01 to A5-96); about 20 wait on design detail (A5-52 to A5-70 in part, the ten projectiles A5-76 to A5-85, A5-91).

---

## A6 — Status VFX, status icons, aspect icons

**Doc:** every status on a unit shows as an icon above it, one glyph per status, an outlined square today (`icon_<status id>`, 32 × 32, `src/content/atlas-frames.ts`); icons show presence, no timer (hud.md; status-effects "Deferred": timers later). A status names the icon frame of its own id, so every new status brings one.

### A6.1 Statuses: on-unit VFX and icon

| Id | Status id | What it does | On-unit VFX (Rec) | Icon | Exists today | Source |
|---|---|---|---|---|---|---|
| A6-01 | `stun` | stunned | circling stars / daze loop | 1 | yes, glyph T | statuses/stun.def.ts |
| A6-02 | `silence` | refuses Q W E R D F | seal over the head | 1 | yes, S | silence.def.ts |
| A6-03 | `root` | cannot move | net / roots at the feet | 1 | yes, R | root.def.ts |
| A6-04 | `disarm` | cannot attack | weapon-broken glyph | 1 | yes, D | disarm.def.ts |
| A6-05 | `slow` | slowed (also Rimeward's 40%, Veilblade's 50% unless they get ids of their own) | frost at the feet | 1 | yes, O | slow.def.ts |
| A6-06 | `burn` | magical DoT (Bolide; Skyfall Maul's burn, Rec, same id) | flames on the body | 1 | yes, B | burn.def.ts |
| A6-07 | `glacier_chill` | slow + DoT in Glacier | frost + cold burn | 1 | yes, G | glacier-chill.def.ts |
| A6-08 | `wane` | the hero hidden from aggro and slowed | veil (A1-16) | 1 | yes, W | wane.def.ts |
| A6-09 | `wane_chill` | enemy slowed in Wane's circle | light frost | 1 | yes, C | wane-chill.def.ts |
| A6-10 | `hoarfrost` | damage-taken hook: stun and bonus damage | frost aura | 1 | yes, H | hoarfrost.def.ts |
| A6-11 | `updraft_lift` | lifted, stunned, untargetable | the unit raised and turning in the funnel | 1 | yes, U | updraft-lift.def.ts |
| A6-12 | `lift` | the generic lift (panel, enemy abilities) | as A6-11 | 1 | yes, L | lift.def.ts |
| A6-13 | `quicken` | attack speed and damage up | hand / weapon glow | 1 | yes, Q | quicken.def.ts |
| A6-14 | `knockback` | displaced | dust trail (A5-24) | 1 | yes, K | knockback.def.ts |
| A6-15 | `charge` | the caster carrying itself | trail (A5-42) | 1 | yes, V | charge.def.ts |
| A6-16 | `self_heal` | heal over time, 10/s | green rising motes | 1 | yes, E | self-heal.def.ts |
| A6-17 | `bash` | carried: a hit may stun | icon only (Doc: "its icon shows above the enemy for as long as it lives") | 1 | yes, A | bash.def.ts; enemies.md |
| A6-18 | `frost_attack` | carried: a hit may slow (also the Frostbound aspect) | icon only | 1 | yes, F | frost-attack.def.ts |
| A6-19 | `gyre_lift` | Gyre Sceptre on an enemy | cyclone (A5-25) | 1 | phase 9 | disable matrix Lift row |
| A6-20 | `gyre_self_lift` | the self-lift | cyclone (A5-27) + invulnerable shimmer | 1 | phase 9 | disable matrix Self-lift row |
| A6-21 | `veilblade_ethereal` | ethereal: physical-immune, disarmed, +40% magical taken | ghostly translucency, engine-drawn | 1 | phase 9 | disable matrix Disarm row |
| A6-22 | `mana_burn` | drains mana, shortfall as magical damage (also Leeching aspect, Marrowleech) | blue motes drained off the body | 1 | phase 12 | status-effects; the-descent 3.1 |
| A6-23 | `fear` | the hero runs from the caster, takes no order | dread aura | 1 | phase 14 | design outline phase 14 |
| A6-24 | `mute` | the six active-item keys refused | a lock / seal distinct from silence | 1 | phase 15 | the-descent 3.1 |
| A6-25 | `tether` | stun if the circle is left before it ends | link (A5-65) | 1 | phase 15 | 3.1 |
| A6-26 | `thorns` | carried damage reflect (thornback, Kindled King, Vengeful aspect) | spikes / thorn sheen | 1 | phase 14 | 3.1 |
| A6-27 | Statuses the descent's families may carry, if the designer makes them statuses: `front_shield`, `death_burst`, `split`, `ember_trail`, the mend's heal, the Rallying aura | TBD (P14, P15) | as in A5 | up to 6 | — | the-descent 3.1, 4 |

**Status icons:** 26 firm (18 exist as placeholders, 8 new) + up to 6 TBD. **Status VFX:** 16 on-unit effects that are not already an A5 row, an engine treatment, or icon-only: `stun`, `silence`, `root`, `disarm`, `slow`, `burn`, `glacier_chill`, `wane_chill`, `hoarfrost`, the lifted-unit whirl (`updraft_lift` and `lift`), `quicken`, `self_heal`, `mana_burn`, `fear`, `mute`, `thorns`. The rest reuse A5 rows (`knockback`, `charge`, `gyre_lift`, `gyre_self_lift`, `tether`), are engine treatments (`wane`, `veilblade_ethereal`, invulnerable), or show an icon only (`bash`, `frost_attack`).

### A6.2 The icon frame

| Id | What | Source |
|---|---|---|
| A6-28 | Status icon frame (the outlined square the glyph sits in), 32 × 32, readable over every floor | hud.md placeholder table |

### A6.3 Aspect icons

**Doc:** an elite or boss pack of the descent rolls aspects, "shown as an icon over each" member (the-descent 4; phase 12: "their icons over elites from the status-icon view's pool").

| Id | Aspect | What it does | Icon | Source |
|---|---|---|---|---|
| A6-29 | Swift | move and attack speed up a third | 1 | the-descent 4 |
| A6-30 | Stoneskin | armour doubled | 1 | same |
| A6-31 | Warded | magic resistance +0.3 | 1 | same |
| A6-32 | Frostbound | every hit may slow (`frost_attack`) | 1 | same |
| A6-33 | Leeching | every hit applies a short `mana_burn` | 1 | same |
| A6-34 | Burning | leaves burning ground where it dies | 1 | same |
| A6-35 | Rallying | pack within 600 attacks a quarter faster | 1 | same |
| A6-36 | Blinking | blinks to the hero's side every 8 s | 1 | same |
| A6-37 | Volley | a ranged attack looses three shots in a fan | 1 | same |
| A6-38 | Vengeful | a fifth of damage taken turned back | 1 | same |

Rec: an aspect icon style distinct from status icons (a different frame shape), since both sit over the same unit.

---

## A7 — Environment, per stratum

**Doc:** the floor is one painted tile repeated, each art diamond 160 × 80 px over 4 × 4 walkability cells, drawn unscaled (map-and-camera; atlas-frames `floor`). Obstacles are axis-aligned rectangles on the 32-unit grid of any size; today grey parallelograms. Every map sits in dark void past its walls. A stratum "shares a look" (the-descent 2.2); "a map deep in the descent does not look like one near the top" (pillar 5). The Nave is rooms and corridors, Diablo I's Cathedral, with doorways one to three bodies wide (Q131); other strata's layout style is each recipe's, TBD (P12, P14, P15). Tall obstacles fade over the hero (phase 16), so walls need to take an alpha fade.

**Kit per set (all counts Rec):**

| Piece | Count per set (Rec) | Why |
|---|---|---|
| Floor tile, 160 × 80 diamond, seamless | 6 (4 plain, 2 with detail: cracks, grates, bones) | one tile repeated reads as wallpaper over a 10-minute map |
| Floor edge to void | 4 (one per diamond edge direction) + 4 corners = 8 | the map's walls stand against void |
| Wall kit on the 32-unit grid (one cell = a 40 × 20 diamond footprint) | 20: straight along each world axis ×2, outer corners ×4, inner corners ×4, T-junctions ×4, cross ×1, end caps ×4, plus wall-top fill ×1 | obstacles are rectangles of any size, so walls must tile per cell |
| Doorway frames | 6: 1, 2, and 3 bodies wide × 2 axes | Q131 doorways; the long road's chokes (416 to 224 wide) |
| Freestanding blocks / pillars (blocking) | 4 | open-ground strata, the long road's 127 blocks |
| Props (non-blocking decor) | 10 | Rec |
| Stratum boss chamber dressing | 2 (a floor inlay + a chamber prop) | the chamber before the portal (the-descent 2.1) |
| **Per set** | **56** | |

| Id | Set | Maps | Look (Doc where given; else Rec from the name) | Pieces | Source |
|---|---|---|---|---|---|
| A7-01 | The town | above map 1 | Doc: no enemies; holds the store, its waypoint, the town's end of a portal, the stash. Layout "small enough to cross in a few seconds": TBD (P10, sprint 54). No boss chamber | 54 | map-and-camera "The town"; phase 10 README |
| A7-02 | The Nave | 1–10 | Doc: rooms and corridors as Diablo I's Cathedral; a floor tint "that reads as the Nave" | 56 | Q131; phase 10 README |
| A7-03 | The Undercroft | 11–20 | Rec: crypt vaults | 56 | the-descent 2.2 |
| A7-04 | The Ossuary | 21–30 | Rec: bone-lined halls | 56 | same |
| A7-05 | The Cisterns | 31–40 | Rec: flooded stone, water channels (non-walkable water is an obstacle) | 56 | same |
| A7-06 | The Warrens | 41–50 | Rec: burrowed earth tunnels | 56 | same |
| A7-07 | The Furnace | 51–60 | Rec: forges, embers, heat | 56 | same |
| A7-08 | The Mirrorhalls | 61–70 | Rec: glass and mirrored stone | 56 | same |
| A7-09 | The Hushed Choir | 71–80 | Rec: silent chapel, choir stalls | 56 | same |
| A7-10 | The Rift | 81–90 | Rec: broken ground, chasms | 56 | same |
| A7-11 | The Pit | 91–100 | Rec: the bottom; the Unwound's chamber on map 100 | 56 | same |
| A7-12 | The long road (`long_road`) and the arena (`arena`) | playtest and test maps outside the descent | Rec: reuse the Nave's set; no new art | 0 | map-and-camera; the-long-road |

**Environment subtotal (Rec):** 11 sets; 66 floor tiles, 88 void edges, 220 wall pieces, 66 doorways, 44 blocks, 110 props, 20 chamber pieces = **614 tiles and props**.

---

## A8 — Travel and world objects

| Id | Object | States | Where | Source |
|---|---|---|---|---|
| A8-01 | Portal down | shut (a stratum's tenth map until its boss dies), opening, open idle loop, hover highlight (it takes a right click), step-through | every descent map, behind the map boss | map-and-camera "The portal down"; the-descent 2.1 |
| A8-02 | Town portal, map end | channel on the hero (3 s, A8-03), opening, idle loop, hover, step-through, closing (another opened, or left by portal down or waypoint) | where the hero stood | map-and-camera "The town portal" |
| A8-03 | Town portal channel | 3 s channel effect on the hero; broken early | on B | same |
| A8-04 | Town portal, town end | idle loop, hover, step-through | beside the hero's arrival in town | same |
| A8-05 | Waypoint | unreached, reached (ring lit; reached by walking within 256), hover, travel out, travel in | one per descent map, a third to a half along; one in town | map-and-camera "Waypoints"; Q120 |
| A8-06 | Checkpoint ring (long road) | pale grey ahead, green once reached; the store opens from the ring the hero stands in | 6 on the long road | map-and-camera; hud.md |
| A8-07 | Arrival point marker | Rec: a floor inlay where the hero arrives; it is a checkpoint | every descent map | map-and-camera "Checkpoints on a map of the descent" |
| A8-08 | Town store | Rec: a stall or merchant prop the store screen opens from (the docs name no merchant) | town | item catalogue 9; map-and-camera "The town" |
| A8-09 | Stash | Rec: a chest prop the stash screen opens from | town | phase 11 README |
| A8-10 | CHECKPOINT word | rising text in green (bitmap font) | over the hero | hud.md |
| A8-11 | Travel fade | engine fade between maps, no art | — | phase 10 README "the fade" |

**Travel subtotal:** 9 objects with art (A8-01 to A8-09).

---

## A9 — Loot

### A9.1 Item icons

Today: one white silhouette per armory slot (`item_helm`, `item_amulet`, `item_body`, `item_main_hand`, `item_off_hand`, `item_gloves`, `item_belt`, `item_boots`, `item_ring`), 128 × 128, drawn in the rarity's tint; a base names a frame and no tint (item catalogue 3.1; atlas-frames). Rec: one icon per base, painted neutral so the rarity tint (or a rarity border) still reads. Sizes are inventory cells (10 × 4 grid).

| Id | Base (id) | Armory slot | Size in cells | Source |
|---|---|---|---|---|
| A9-01 | Cap (`cap`) | Helm | 2 × 2 | item catalogue 3.2 |
| A9-02 | Circlet (`circlet`) | Helm | 2 × 2 | same |
| A9-03 | Pendant (`pendant`) | Amulet | 1 × 1 | same |
| A9-04 | Quilted armour (`quilted_armour`) | Armour (`body`) | 2 × 3 | same |
| A9-05 | Robe (`robe`) | Armour | 2 × 3 | same |
| A9-06 | Chain mail (`chain_mail`) | Armour | 2 × 3 | same |
| A9-07 | Staff (`staff`) | Main hand | 1 × 3 | same |
| A9-08 | Wand (`wand`) | Main hand | 1 × 2 | same |
| A9-09 | Dagger (`dagger`) | Main hand | 1 × 2 | same |
| A9-10 | Sceptre (`sceptre`) | Main hand | 1 × 3 | same |
| A9-11 | Tome (`tome`) | Off-hand | 2 × 2 | same |
| A9-12 | Buckler (`buckler`) | Off-hand | 2 × 2 | same |
| A9-13 | Focus (`focus`) | Off-hand | 1 × 2 | same |
| A9-14 | Leather gloves (`leather_gloves`) | Gloves | 2 × 2 | same |
| A9-15 | Gauntlets (`gauntlets`) | Gloves | 2 × 2 | same |
| A9-16 | Sash (`sash`) | Belt | 2 × 1 | same |
| A9-17 | Heavy belt (`heavy_belt`) | Belt | 2 × 1 | same |
| A9-18 | Leather boots (`leather_boots`) | Boots | 2 × 2 | same |
| A9-19 | Greaves (`greaves`) | Boots | 2 × 2 | same |
| A9-20 | Band (`band`) | Ring | 1 × 1 | same |
| A9-21 | Bases to item level 30 | — | TBD (P12, sprint 72) | phase 12 README |
| A9-22 | Bases to quality level 100 ("how many bases" is an open question) | — | TBD (P13, sprint 81) | phase 13 README |

### A9.2 Legendary pieces (13; Rec a unique icon each, on its base's size)

| Id | Piece | Base | Dropped by | Source |
|---|---|---|---|---|
| A9-23 | Rimecoil (`rimecoil`) | Band | pack 14, boss frost raider (long road) | item catalogue 6 |
| A9-24 | Trollhide (`trollhide`) | Sash | pack 28, boss troll | same |
| A9-25 | Hallcrown (`hallcrown`) | Cap | pack 37, the long road's last boss | same |
| A9-26 | The Gaolmaster's piece | TBD (P10 sprint 55) | the Gaolmaster | the-descent 5.2; phase 10 README |
| A9-27 | The Hollow Abbess's piece | TBD (P12 sprint 73) | the Hollow Abbess | phase 12 README |
| A9-28 | Marrowleech's piece | TBD (P12) | Marrowleech | same |
| A9-29 | The Drowned Hook's piece | TBD (P13 sprint 82) | the Drowned Hook | phase 13 README |
| A9-30 | The Brood Queen's piece | TBD (P13) | the Brood Queen | same |
| A9-31 | The Kindled King's piece | TBD (P13) | the Kindled King | same |
| A9-32 | The Glass Twins' piece | TBD (P13) | the Glass Twins | same |
| A9-33 | The Choirmaster's piece | TBD (P13) | the Choirmaster | same |
| A9-34 | The Binder Below's piece | TBD (P13) | the Binder Below | same |
| A9-35 | The Unwound's piece | TBD (P13) | the Unwound | same |

### A9.3 Active item icons (8; each 1 × 2 cells, no rarity, emerald label)

| Id | Active item | Model | Source |
|---|---|---|---|
| A9-36 | Gyre Sceptre (`gyre_sceptre`) | Eul's Scepter | item catalogue 7 |
| A9-37 | Scorchglass (`scorchglass`) | Dagon | same |
| A9-38 | Slipknife (`slipknife`) | Blink Dagger | same |
| A9-39 | Rimeward (`rimeward`) | Shiva's Guard | same |
| A9-40 | Skyfall Maul (`skyfall_maul`) | Meteor Hammer | same |
| A9-41 | Mainspring (`mainspring`) | Refresher Orb | same |
| A9-42 | Fetter Bolas (`fetter_bolas`) | Gleipnir | same |
| A9-43 | Veilblade (`veilblade`) | Ethereal Blade | same |

### A9.4 Ground items and rarity treatments

| Id | What | States | Source |
|---|---|---|---|
| A9-44 | Item on the ground: "the silhouette of the armory slot the item is worn in, lying flat", in its rarity's tint | Rec: the base icon drawn flat, plus a short drop (fall and settle) animation | hud.md placeholder table; items-and-loot "Where it lands" |
| A9-45 | Gold pile (`item_gold`) | Rec: 3 sizes by amount (small, medium, large); drop animation | item catalogue 3.2; atlas-frames |
| A9-46 | Health globe (`item_globe`, green) | idle pulse loop (Rec); waits on the ground while the pool is full | item catalogue 8 |
| A9-47 | Mana globe (`item_globe`, blue) | idle pulse loop (Rec) | same |
| A9-48 | Rarity tints (7): Common `0x9d9d9d`, Uncommon `0xf2f2f2`, Rare `0x5a7dff`, Epic `0xff8a1f`, Imperial `0xe8c547`, Mythical `0xa855f7`, Legendary `0xe53935`; active items emerald `0x2ecc71` | Rec: a rarity border / glow set of 8 for icons, and a ground shimmer for Rare and better (which show a label by default) | item catalogue 4 |
| A9-49 | Unmet-requirement backing (red) on an inventory or store cell | 1 | items-and-loot |
| A9-50 | Label backing (a ground item's name over it, moved apart; Alt shows all) | Rec: a dark plate behind label text | items-and-loot "Labels and Alt" |

**Loot subtotal:** icons 20 bases (+TBD) + 13 Legendary + 8 active = 41 icons; 4 ground sprites (gold ×3 sizes counts as 3 → 5 sprites: 3 gold, 2 globes); 8 rarity treatments.

---

## A10 — UI and HUD

Today everything is flat shapes from the one atlas and a bitmap font; screens draw in the HUD scene behind one input claim (hud.md; ADR 0012). Rows are the art each needs.

| Id | Element | Parts / states | Source |
|---|---|---|---|
| A10-01 | Bottom bar frame | the panel behind bars, orbs, squares, level | hud.md "The bottom bar" |
| A10-02 | Health bar | frame, fill (red), numbers | same |
| A10-03 | Mana bar | frame, fill (blue), numbers | same |
| A10-04 | Level display | level number, experience bar beneath, unspent-skill-point marker | same |
| A10-05 | Orb buffer squares ×3 | empty outline, Quartz, Whorl, Ember fill; greyed while dead | same |
| A10-06 | Orb level numbers and the Q / W / E squares' "spend a point" state | clickable highlight while a point is unspent; white flash at the cap | same |
| A10-07 | Ability squares ×6: Q, W, E, R, D, F | key letter, cooldown sweep (64 wedge steps, `wedge_N`), mana cost on R D F, greyed (disabled), empty socket (no key label) | same; atlas-frames `WEDGE_STEPS` |
| A10-08 | Refusal flashes on a square | red (mana), grey (cooldown), striped (disable or death, `stripes`), white (other) | hud.md "States and edge cases" |
| A10-09 | Spell icons ×10 for D and F | Doc today: "the prepared spell's colour and a short label"; Rec: an icon per spell (Hoarfrost, Wane, Glacier, Siphon, Updraft, Quicken, Zenith, Emberling, Bolide, Clarion) | hud.md; spell catalogue |
| A10-10 | Invoke (R) icon | Rec | orbs-and-invoke |
| A10-11 | Orb icons ×3 (Quartz, Whorl, Ember) for the Q W E squares | Rec | same |
| A10-12 | Bank row: 6 squares T, X, V (top), C, G, Space (bottom) | key label, active item icon, cooldown sweep, mana cost, greyed under stun, lift, self-lift, mute; Slipknife's square greyed under root and its 3 s lockout | item catalogue 7.2; disable matrix section 5 |
| A10-13 | Town portal key B indicator | Rec: its 60 s clock shown (the docs do not say where) | map-and-camera |
| A10-14 | Death-penalty HUD line (10% of carried gold lost) | text line | phase 11 README |
| A10-15 | Damage numbers | bitmap text, physical red, magical blue, pure gold; rise and fade | hud.md |
| A10-16 | Targeting preview decals | range ring (`ring_thin`), circle, rectangle (`square_outline`), cone (`cone_60`), unit reticle (`ring_thick`), Glacier's drag line; in the spell's colour, red out of range | hud.md "Targeting preview"; spell catalogue 7.4 |
| A10-17 | Cursors | Rec: default pointer; unit-target; point-target; direction; vector (press-drag); attack-move (after A); hover-enemy (attack); hover-item or label (pick up); hover-portal / waypoint / store ring = 9 | controls-and-orders |
| A10-18 | Pause screen | full-canvas shade, panel, PAUSED, RESUME button (normal, hover, pressed) | hud.md "The pause screen" |
| A10-19 | Inventory and armory screen | panel; 10 × 4 grid of cells (empty, free, blocked while lifting); the armory figure with 10 slot frames (helm, amulet, armour, main hand, off-hand, gloves, belt, boots, two rings) laid out as items-and-loot says; gold line; a lifted item drawn at its size | items-and-loot "The inventory and armory" |
| A10-20 | Store screen | panel on the left; tabs Armour / Weapons / Misc (normal, selected, hover); a grid of 12 stocked items; the active items listed in Misc; gold line | items-and-loot "The store"; item catalogue 9 |
| A10-21 | Stash screen | panel beside the inventory; 10 × 8 grid | phase 11 README |
| A10-22 | Waypoint screen | panel on the left; one row per reached waypoint by map level and the town (TOWN, MAP N); row hover and selected | map-and-camera "Waypoints"; phase 10 README |
| A10-23 | Start screen | Resume; New run; a confirmation panel (giving up the saved run) | phase 11 README |
| A10-24 | Run-won screen | "the run is won, the game says so"; wording and layout TBD (P15 sprint 98) | design outline phase 15 |
| A10-25 | Tooltip frame | dark box of text lines: name in rarity tint, rarity, base, item level, REQUIRED LEVEL (red when unmet), implicit, affix lines, price in gold | hud.md; items-and-loot; vocabulary |
| A10-26 | Item box / cell highlight and refusal flash on screens | flash on a refused gesture | items-and-loot |
| A10-27 | Status icon frame, aspect icon frame | see A6 | hud.md |
| A10-28 | Stratum and map name strings (TOWN, MAP N, THE NAVE, …) | text; Rec: an arrival banner | phase 10 README "the new strings" |
| A10-29 | Font | Doc today: a bitmap font of 41 glyphs, `0-9 - . % / +`, `A-Z`, space; every string in capitals; cells 20 × 32. Rec: one licensed display face in Diablo's register, rendered as a bitmap font at 2 sizes (HUD numbers, screen text) | atlas-frames `GLYPH_CHARACTERS` |
| A10-30 | Stratum boss health bar | **not in the docs**; Rec, since a boss "changes what it casts below 3/4, 1/2, 1/4" and the player must read it | open decision |
| A10-31 | Developer panel | HTML, no art needed | developer-panel.md |

**UI subtotal:** 30 elements with art (A10-01 to A10-30), 10 spell icons + 1 Invoke + 3 orb icons (Rec) = 14 kit icons, 9 cursors (Rec), 1 font.

---

# SOUND

## S1 — Enemy cast tells, by kind, and projectile flight loops

**Doc (Q132):** one tell per kind of cast, heard as the cast point begins; stun, silence, root, pull, mana burn, and heavy blow each unlike the others; a projectile's tell keeps sounding while it flies. The six kinds are Doc; the others are **Rec**, so every enemy ability id has a kind (the phase 16 gate tests "every enemy ability id is in the sound list").

### S1.1 The tell sounds

| Id | Kind | Status | Count |
|---|---|---|---|
| S1-01 | Stun | Doc | 1 |
| S1-02 | Silence | Doc | 1 |
| S1-03 | Root | Doc | 1 |
| S1-04 | Pull | Doc | 1 |
| S1-05 | Mana burn | Doc | 1 |
| S1-06 | Heavy blow | Doc | 1 |
| S1-07 | Shot (a heavy aimed projectile that only damages) | Rec | 1 |
| S1-08 | Charge (a rush that closes the gap) | Rec | 1 |
| S1-09 | Summon (adds, brood, nests) | Rec | 1 |
| S1-10 | Heal (self or pack) | Rec | 1 |
| S1-11 | Fear | Rec | 1 |
| S1-12 | Mute (must sound unlike silence: the Choirmaster alternates them) | Rec | 1 |
| S1-13 | Tether | Rec | 1 |
| S1-14 | Raise | Rec | 1 |
| S1-15 | Blink | Rec | 1 |
| S1-16 | Burning ground | Rec | 1 |

### S1.2 Projectile flight loops

| Id | Loop | Ability | Count |
|---|---|---|---|
| S1-17 | Stun bolt in flight | `stun_bolt` | 1 |
| S1-18 | Net in flight | `root_net` | 1 |
| S1-19 | Hook in flight | `drag_hook` | 1 |
| S1-20 | Heavy arrow in flight | `arrow` | 1 |
| S1-21 | Mana burn in flight | `mana_burn`, only if it is a projectile: TBD (P12) | 0–1 |

### S1.3 Every enemy ability id and its tell kind

| Ability id | Who casts it | Tell kind | Loop | Note | Source |
|---|---|---|---|---|---|
| `arrow` | skirmisher; trapper elite/boss | Shot | S1-20 | homing projectile, physical | abilities/arrow.def.ts |
| `charge` | lancer; grunt boss, brute boss, frost raider elite/boss, crusher elite/boss, troll boss | Charge | — | | charge.def.ts |
| `root_net` | trapper; hexer elite/boss, skirmisher elite/boss, lancer boss; the Hollow Abbess | Root | S1-18 | | root-net.def.ts |
| `self_heal` | troll; grunt, frost raider, skirmisher, crusher, summoner bosses | Heal | — | a stun in its cast point cancels it | self-heal.def.ts |
| `silence_curse` | hexer; summoner elite/boss; the Hollow Abbess; the Choirmaster | Silence | — | unit-targeted, no projectile | silence-curse.def.ts |
| `slam` | crusher; grunt, brute, lancer, troll elite/boss; the Gaolmaster | Heavy blow | — | 0.6 s cast point is "the tell" (enemies.md) | slam.def.ts |
| `summon_adds` | summoner; hexer, trapper, brute bosses; the Gaolmaster (grunts), the Hollow Abbess | Summon | — | | summon-adds.def.ts |
| `stun_bolt` | bolter; long road packs 21 and 37; the Gaolmaster; the Binder Below | Stun | S1-17 | 0.6 s cast point | design outline phase 9 |
| `mana_burn` | leech; Marrowleech; the Leeching aspect (on hit) | Mana burn | S1-21 TBD | cast point 0.5 s | design outline phase 12 |
| `drag_hook` | dragger; the Drowned Hook | Pull | S1-19 | homing, so disjointed | the-descent 3.1 |
| `death_burst` | bloater (on death) | none: not cast. A burst in S5 | — | chains one link a tick | 3.1; Q129 |
| `mend` | mender | Heal | — | | 3.1 |
| `fear` | dreadcaller; the Brood Queen | Fear | — | | 3.1 |
| `raise` | raiser | Raise | — | | 3.1 |
| `spawn_brood` | nest | Summon | — | | 3.1 |
| `blink_away` | flicker; the Glass Twins; the Blinking aspect | Blink | — | | 3.1; aspects |
| `ember_trail` | kindler | Burning ground if cast; none if carried: TBD (P14) | — | | 3.1 |
| `mute` | hush; the Choirmaster | Mute | — | | 3.1 |
| `thorns` | thornback; the Kindled King; the Vengeful aspect (carried) | none: carried. A reflect in S5 | — | | 3.1 |
| `tether` | binder; the Binder Below | Tether | — | | 3.1 |
| `null_field` | nullifier | Silence (it silences) | — | a field; Rec a field loop is optional | 3.1 |
| `split` | splitter (on death) | none: not cast. A split in S5 | — | | 3.1 |
| `front_shield` | bulwark (carried) | none. A block in S5 | — | | 3.1 |
| `bash` (carried status) | brute | none: not cast. The stun landing in S5 | — | | enemies.md |
| `frost_attack` (carried status) | frost raider; the Frostbound aspect | none. The slow landing in S5 | — | | enemies.md |
| The Kindled King's burning rings | the Kindled King | Burning ground | — | ability id TBD (P14) | the-descent 5.2 |
| Variant III / IV extra abilities (one per family) | 22 families reach III | by the kind each turns out to be | — | TBD (P12, P14, P15) | the-descent 3 |
| The Unwound's four sets | the Unwound | the kinds of the disables it casts | — | TBD (P15 sprint 98) | 5.2 |

**S1 subtotal:** 20 firm (16 tells + 4 loops) + 1 TBD.

## S2 — Stratum boss tells (lower and louder)

**Doc (Q132):** a stratum boss's casts are lower and louder than any other unit's. Rec: separate recordings rather than a pitch/gain shift, so they read as heavier and not as a slowed copy (open decision). Long-road region bosses and map bosses are not stratum bosses and use S1.

| Id | Boss tell | Used by | Count |
|---|---|---|---|
| S2-01 | Stun | the Gaolmaster, the Binder Below, the Unwound | 1 |
| S2-02 | Silence | the Hollow Abbess, the Choirmaster, the Unwound | 1 |
| S2-03 | Root | the Hollow Abbess, the Unwound | 1 |
| S2-04 | Pull | the Drowned Hook, the Unwound | 1 |
| S2-05 | Mana burn | Marrowleech, the Unwound | 1 |
| S2-06 | Heavy blow | the Gaolmaster | 1 |
| S2-07 | Summon | the Gaolmaster, the Hollow Abbess, Marrowleech, the Drowned Hook (bloater ring), the Brood Queen (nests) | 1 |
| S2-08 | Fear | the Brood Queen, the Unwound | 1 |
| S2-09 | Mute | the Choirmaster, the Unwound | 1 |
| S2-10 | Tether | the Binder Below, the Unwound | 1 |
| S2-11 | Blink | the Glass Twins | 1 |
| S2-12 | Burning ground | the Kindled King | 1 |
| S2-13 | Boss stun bolt in flight | `stun_bolt` from a stratum boss | 1 |
| S2-14 | Boss net in flight | `root_net` from the Hollow Abbess | 1 |
| S2-15 | Boss hook in flight | `drag_hook` from the Drowned Hook | 1 |
| S2-16 | Health threshold (Rec): the boss changes what it casts at 3/4, 1/2, 1/4 | every stratum boss | 1 |
| S2-17 | Stratum boss death, and the portal unsealing | every stratum boss | 1 |

**S2 subtotal:** 17 (15 Doc-implied, 2 Rec).

## S3 — The hero

**Doc (Q132):** the hero's spells have short, dry confirmations that never mask a tell.

| Id | Sound | When | Source |
|---|---|---|---|
| S3-01 | Quartz orb press (Q) | key-down | orbs-and-invoke |
| S3-02 | Whorl orb press (W) | key-down | same |
| S3-03 | Ember orb press (E) | key-down | same |
| S3-04 | Invoke, first invoke (spends mana, starts the clock) | R | same |
| S3-05 | Invoke, re-invoke / swap (free) | R | same |
| S3-06 | Hoarfrost cast | commit | spell catalogue 3.1 |
| S3-07 | Hoarfrost proc (stun + bonus damage) | on hit, at most every 0.8 s | 3.1 |
| S3-08 | Wane cast | commit | 3.2 |
| S3-09 | Glacier cast (the wall rises) | commit | 3.3 |
| S3-10 | Siphon cast | commit | 3.4 |
| S3-11 | Siphon charge loop | the 2.9 s delay | 3.4 |
| S3-12 | Siphon burst | activation | 3.4 |
| S3-13 | Updraft cast | commit | 3.5 |
| S3-14 | Updraft funnel loop | while it travels | 3.5 |
| S3-15 | Updraft drop (damage on landing) | lift expiry | 3.5 |
| S3-16 | Quicken cast | commit | 3.6 |
| S3-17 | Zenith cast | commit | 3.7 |
| S3-18 | Zenith strike | after 1.7 s | 3.7 |
| S3-19 | Emberling cast (summon arrives) | commit | 3.8 |
| S3-20 | Emberling attack shot | each attack | 5 |
| S3-21 | Emberling expire | timer, or the hero's death | 3.8 |
| S3-22 | Bolide cast | commit | 3.9 |
| S3-23 | Bolide landing | after 1.3 s | 3.9 |
| S3-24 | Bolide roll loop | while rolling | 3.9 |
| S3-25 | Clarion cast (cone blast) | commit | 3.10 |
| S3-26 | Hero attack release | attack point | spells-and-attack |
| S3-27 | Level up | a level reached | hero.md |
| S3-28 | Hero death | health reaches zero | hero.md |
| S3-29 | Hero respawn | after `respawn_delay` | hero.md |
| S3-30 | Footsteps | **Rec, optional**: not implied by the docs; if ordered, one set per floor type | — |

**S3 subtotal:** 29 + 1 optional.

## S4 — Active items

**Doc (Q132):** short, dry confirmations. Backlog: "a sound for an activation, a dispel, a disjoint" is phase 16's.

| Id | Sound | Active item | Source |
|---|---|---|---|
| S4-01 | Lift an enemy | Gyre Sceptre | item catalogue 7.1 |
| S4-02 | Enemy lands (damage) | Gyre Sceptre | same |
| S4-03 | Self-lift with its dispel | Gyre Sceptre on the hero | same; status-effects "Dispel" |
| S4-04 | Beam | Scorchglass | same |
| S4-05 | Blink | Slipknife | same |
| S4-06 | Ring | Rimeward | same |
| S4-07 | Wind-up through the 2 s cast point (quiet; must not mask a tell) | Skyfall Maul | same |
| S4-08 | Meteor landing | Skyfall Maul | same |
| S4-09 | Refresh | Mainspring | same |
| S4-10 | Bolas thrown | Fetter Bolas | same |
| S4-11 | Bolas snares (root) | Fetter Bolas | same |
| S4-12 | Blade thrown | Veilblade | same |
| S4-13 | Ethereal takes hold | Veilblade | same |

**S4 subtotal:** 13.

## S5 — Combat feedback

| Id | Sound | When | Status | Source |
|---|---|---|---|---|
| S5-01 | Hit, physical | any physical hit landing | Rec | hero.md damage types |
| S5-02 | Hit, magical | | Rec | same |
| S5-03 | Hit, pure | | Rec | same |
| S5-04 | Hero hurt | the hero takes a hit (throttled) | Rec | — |
| S5-05 | Enemy death, small body | radius class 20 | Rec (else one per family: 29) | enemy catalogue 2.1 |
| S5-06 | Enemy death, medium body | radius class 32 | Rec | same |
| S5-07 | Enemy death, large body | radius class 64 | Rec | same |
| S5-08 | Add or summon vanishes (no corpse) | an imp on its summoner's death; brood on the nest's break | Rec | enemies.md |
| S5-09 | Enemy melee swing | an enemy attack point, by body | Rec | — |
| S5-10 | Enemy ranged shot | an enemy attack release | Rec | — |
| S5-11 | Stun lands on the hero (also the brute's `bash`) | status applied | Rec | status-effects |
| S5-12 | Silence lands on the hero | status applied | Rec | same |
| S5-13 | Root lands (net closes) | status applied | Rec | same |
| S5-14 | Mute lands | status applied | Rec | the-descent 3.1 |
| S5-15 | Fear lands | status applied | Rec | same |
| S5-16 | Mana burn draining (tick, throttled) | while it lasts | Rec | status-effects |
| S5-17 | Slow lands (frost hit, `frost_attack`, Frostbound) | on hit | Rec | enemies.md |
| S5-18 | Tether bound | the circle forms on the hero | Rec | the-descent 3.1 |
| S5-19 | Tether snaps (the stun on leaving) | leaving the circle early | Rec | same |
| S5-20 | Freed (a disable on the hero ends) | status expired | Rec | status-effects |
| S5-21 | Disjoint (a homing projectile loses its target) | the tick of a blink or lift | Doc-listed for phase 16 (backlog) | status-effects "Disjoint"; backlog/deferred.md |
| S5-22 | Immune thud (a hit on an invulnerable or ethereal unit that does nothing) | | Rec | status-effects |
| S5-23 | Shield block (`front_shield` turns a projectile or spell away) | | Rec | the-descent 3.1 |
| S5-24 | Thorns reflect (thornback, Kindled King, Vengeful) | | Rec | same |
| S5-25 | Death burst (bloater; one per link of a chain) | on the bloater's death | Rec | same; Q129 |
| S5-26 | Split (splitter becomes two) | on death | Rec | same |
| S5-27 | Raised (a corpse stands up) | `raise` resolves | Rec | same |
| S5-28 | Nest breaks | the nest's death | Rec | same |
| S5-29 | Knockback impact (pushed unit, or stopped at a wall) | push | Rec | status-effects |
| S5-30 | Charge impact | the charge arrives | Rec | enemies.md |
| S5-31 | Mend lands (heal on a pack member) | `mend` resolves | Rec | the-descent 3.1 |

**S5 subtotal:** 31 (all Rec in detail; each shown on screen, so allowed by Q132).

## S6 — Loot and economy

| Id | Sound | When | Source |
|---|---|---|---|
| S6-01 | Drop, Common | an item hits the ground | item catalogue 4 |
| S6-02 | Drop, Uncommon | | same |
| S6-03 | Drop, Rare | | same |
| S6-04 | Drop, Epic | | same |
| S6-05 | Drop, Imperial | | same |
| S6-06 | Drop, Mythical | | same |
| S6-07 | Drop, Legendary | | same |
| S6-08 | Gold drops | | item catalogue 8 |
| S6-09 | Gold taken | walked over | items-and-loot |
| S6-10 | Globe drops | | item catalogue 8 |
| S6-11 | Health globe taken | | items-and-loot |
| S6-12 | Mana globe taken | | same |
| S6-13 | Item picked up (into the inventory) | `pick_up` arrives | same |
| S6-14 | Pick up refused: no room | | items-and-loot "States and edge cases" |
| S6-15 | Buy | `buy_item` | items-and-loot "The store" |
| S6-16 | Sell | `sell_item` | same |
| S6-17 | Buy refused (not enough gold, no room, already held) | | same; item catalogue 7.2 |
| S6-18 | Gold lost on death (the 10% penalty) | respawn | phase 11 README |

**S6 subtotal:** 18.

## S7 — Travel

| Id | Sound | When | Source |
|---|---|---|---|
| S7-01 | Town portal channel loop | the 3 s channel on B | map-and-camera "The town portal" |
| S7-02 | Channel broken | any order, orb press, throw, activation, stun, or lift ends it | same |
| S7-03 | Town portal opens | channel complete | same |
| S7-04 | Portal idle loop (positional; town portal both ends) | while it stands | same |
| S7-05 | Step through a portal (town portal either way, or the portal down) | | map-and-camera "Travel" |
| S7-06 | Portal down idle loop | on every descent map | map-and-camera "The portal down" |
| S7-07 | Portal down unseals (the stratum boss is dead) | map 10, 20, … 100 | same; the-descent 2.1 |
| S7-08 | Waypoint reached | walking within 256 | map-and-camera "Waypoints" |
| S7-09 | Waypoint travel | a click on the waypoint screen | same |
| S7-10 | Checkpoint reached (the CHECKPOINT word; long road) | a new furthest checkpoint | hud.md |

**S7 subtotal:** 10.

## S8 — Interface

| Id | Sound | When | Source |
|---|---|---|---|
| S8-01 | Screen opens (inventory, store, stash, waypoint, start, pause) | | hud.md; ADR 0012 |
| S8-02 | Screen closes | | same |
| S8-03 | Button click (RESUME, New run, confirmation, row on the waypoint screen) | | hud.md |
| S8-04 | Store tab switch | | items-and-loot |
| S8-05 | Key refused: mana | the red flash | hud.md "Refused cast" |
| S8-06 | Key refused: cooldown | the grey flash | same |
| S8-07 | Key refused: disable or death | the striped flash | same |
| S8-08 | Key refused: other (empty slot, cap reached) | the white flash | same |
| S8-09 | Item lifted onto the pointer | press and move | items-and-loot |
| S8-10 | Item set down | release where it fits | same |
| S8-11 | Item swapped | release over one item | same |
| S8-12 | Set-down blocked / gesture refused | the item flashes | same |
| S8-13 | Equip | | same |
| S8-14 | Unequip | | same |
| S8-15 | Drop to the ground from the inventory | right click | same |
| S8-16 | Skill point spent | click on Q, W, or E | hud.md |
| S8-17 | Run won | **TBD**: a short sting borders on "music beyond ambience"; the maintainer's call (P15 sprint 98 decides what the won run shows) | design outline phase 15 |

**S8 subtotal:** 16 + 1 TBD.

## S9 — Ambience

**Doc:** "an ambience for each stratum" (roadmap phase 16); music beyond ambience is out.

| Id | Loop | Source |
|---|---|---|
| S9-01 | The town | roadmap phase 16; Rec, since the town is a map |
| S9-02 | The Nave | roadmap phase 16 |
| S9-03 | The Undercroft | same |
| S9-04 | The Ossuary | same |
| S9-05 | The Cisterns | same |
| S9-06 | The Warrens | same |
| S9-07 | The Furnace | same |
| S9-08 | The Mirrorhalls | same |
| S9-09 | The Hushed Choir | same |
| S9-10 | The Rift | same |
| S9-11 | The Pit | same |
| — | The long road and the arena | Rec: reuse the Nave's |
| — | A stratum boss chamber bed | Rec, optional |

**S9 subtotal:** 11.

---

# TOTALS

Rec counts are the recommendations above; move them and the totals move.

## Art

| Category | Count |
|---|---|
| **Character sprites** (unique sheets) | **42**: hero 1, families 29, stratum bosses 10 (the Twins one sheet), summons and adds 2 (Emberling, imp). +1 optional (training dummy), +1 TBD (nest brood) |
| Orb sprites | 3 (Quartz, Whorl, Ember), 3 loops |
| **Animations** | **358**: hero 11, families 237, stratum bosses 93, summons 14, orbs 3 |
| Directional strips at 8 directions | 2840 ((11 + 237 + 93 + 14) × 8); orbs non-directional |
| Palette + detail rows | 104 variants; + 13 long-road palettes (decision); + 2 Glass Twins palettes; + 4 Unwound phase states |
| Engine treatments | elite outline, boss outline, raised, wane veil, ethereal, invulnerable shimmer = 6 |
| **VFX** | **112**: 96 ability, spell, item, and combat effects (A5-01 to A5-96, about 20 of them detailed later) + 16 status on-unit effects (A6) |
| **Icons** | status 26 (+ up to 6 TBD), aspect 10, item bases 20 (+ TBD to quality level 100), Legendary pieces 13, active items 8, spell 10, Invoke 1, orb 3 = **91** (+ TBD); plus 2 icon frames |
| **Tiles and props** | **614** over 11 environment sets (66 floor tiles, 88 void edges, 220 wall pieces, 66 doorways, 44 blocks, 110 props, 20 chamber pieces) |
| Travel and world objects | 9 |
| Ground loot sprites | 5 (gold × 3 sizes, 2 globes) + 8 rarity treatments + 2 backings |
| UI | 30 elements, 9 cursors, 1 bitmap font (41 glyphs, 2 sizes) |

## Sound

| Category | Count |
|---|---|
| S1 Enemy tells (16 kinds) and flight loops (4) | 20 (+1 TBD) |
| S2 Stratum boss tells and loops | 17 |
| S3 Hero | 29 (+1 optional footsteps) |
| S4 Active items | 13 |
| S5 Combat feedback | 31 |
| S6 Loot and economy | 18 |
| S7 Travel | 10 |
| S8 Interface | 16 (+1 TBD run won) |
| S9 Ambience loops | 11 |
| **Total sounds** | **165** (+3 TBD or optional), of which 25 are loops |

Loop count by row: S1-17 to S1-20 (4), S2-13 to S2-15 (3), S3-11, S3-14, S3-24 (3), S7-01, S7-04, S7-06 (3), S9 (11), S5-16 (1) = **25 loops**.

---

# OPEN DECISIONS THE ORDER DEPENDS ON

| # | Decision | Owner | Blocks | Source |
|---|---|---|---|---|
| 1 | **Sourcing:** art bought as an isometric pack where one fits, the rest to order; sounds synthesised placeholders then bought or made. Order dates: a bought pack or library by phase 15's start; made to order by phase 13's start | maintainer | the whole order | Q132, Q133; R44 |
| 2 | 8 or 16 directions (8 Rec; hero at 16 as an option) | game designer / maintainer | every directional sheet | backlog/deferred.md |
| 3 | Frame counts, fps, and frame-cell sizes per size class | engineering architect with the artist | sheet sizes, ADR 0021 page budget | none decided |
| 4 | Atlas format: one page per stratum, whether `maxTextures` rises, where the hero, items, icons, and font live | engineering architect (ADR 0021, P16-S104-T01; run early if art is made to order) | delivery format | architecture outline; phase 16 README |
| 5 | A variant's "one detail": a separate overlay layer (Rec) or baked into every frame | engineering architect with the artist | whether 104 variants cost 104 small overlays or 104 × 8 directions × ~8 animations | Q133 |
| 6 | Elite and boss outline: engine-drawn (Rec) or baked, and a colour that reads on a red body | game designer / architect | every enemy sheet | backlog/deferred.md row 18 |
| 7 | The long road's 13 archetypes: their own palette rows or variant I's | game designer | 13 palette rows | ADR 0018 recommendation (long road untouched) |
| 8 | Variant names (104), variant III / IV extra abilities, boss-tier casts of the 16 new families, their size classes | game designer, phases 10, 12, 14, 15 | cast poses, detail briefs, projectile briefs | the-descent 3; phase READMEs |
| 9 | Stratum boss kits in numbers, their adds (Marrowleech's "mana-burning adds", the Abbess's "summoner adds"), the Kindled King's ring ability id | game designer, phases 10, 12, 14, 15 | boss cast poses, add sprites | the-descent 5.2 |
| 10 | The Unwound: how the four ability sets look (Rec: 4 phase states), fought alone or with a crowd | game designer, phase 15 sprint 98 | its sheet | phase 15 README |
| 11 | The Glass Twins: one sheet with two palettes (Rec) or two sprites | game designer | 1 sprite | Q130 |
| 12 | Nest brood ("runners of its stratum" while the runner family has retired by the Furnace): the runner sprite in a brood palette (Rec) or a sprite of its own | game designer, phase 14 | 0–1 sprite | the-descent 3.1 |
| 13 | Splitter children: scaled copies (Rec) or drawn smaller | game designer, phase 15 | 0–2 sprites | the-descent 3.1 |
| 14 | Whether the nest can be lifted or pushed (its animation set) | game designer, phase 14 | 3 animations | — |
| 15 | `mana_burn`: a projectile or not; `ember_trail`: cast or carried | game designer, phases 12, 14 | a loop, a tell | the-descent 3.1 |
| 16 | Each stratum's layout style (rooms and corridors, or open ground with blocks) after the Nave | game designer, phases 12, 14, 15 | the wall and doorway kit per set | Q131 |
| 17 | The town's layout, and whether the store and stash are props, a merchant, or rings | game designer, phase 10 sprint 54 | A7-01, A8-08, A8-09 | phase 10 README |
| 18 | Bases to item level 30 and to quality level 100: how many | game designer, phases 12 and 13 | item icon count | phase 12, 13 READMEs |
| 19 | The ten stratum bosses' Legendary pieces and their bases | game designer, phases 10, 12, 13 | 10 icons | the-descent 5.2 |
| 20 | Spell icons for D and F, and an icon per base (both Rec; the docs today use colour + label and one silhouette per armory slot) | game designer | 10 + 20 icons | hud.md; item catalogue 3.1 |
| 21 | A stratum boss health bar (not in the docs) | game designer | 1 UI element | — |
| 22 | The extra tell kinds beyond Q132's six (shot, charge, summon, heal, fear, mute, tether, raise, blink, burning ground) | game designer | 10 + 7 boss tells | Q132 |
| 23 | Boss tells lower and louder: separate recordings (Rec) or a pitch/gain shift of the normal set | game designer / architect | 17 sounds | Q132 |
| 24 | Enemy attack and death sounds by body class (Rec) or per family (29 each) | game designer | up to 55 more sounds | — |
| 25 | Footsteps; a run-won sting against "music beyond ambience" | maintainer | 2 sounds | design outline phase 16 |
| 26 | Font: licensed face and glyph set (the bitmap font holds capitals, digits, and five signs today) | maintainer | the font | atlas-frames |
| 27 | *Settled 2026-09-28:* every sound, placeholder and final, is phase 16's; phase 11 has none | — | — | phase 11 and 16 READMEs |
| 28 | This list is frozen against content when phase 15's gate runs `pnpm roster` (P15-S99-T04, P15-S103-T01); the order is placed from the frozen list | delivery strategist | the gate's content test | 04-phase-exit-gates.md; R44 |
| 29 | Q122, difficulty tiers: if the maintainer wants them, a tier that changes the roster and aspects may need palettes of its own | maintainer | unknown | Q122 |
