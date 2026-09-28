# Sprint 101 — The splitter, the bulwark, and the Pit

**Phase:** 15 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 to 14 left, and edit a ticket in place with a one-line note if it moved.

> **Phase 14's bucket runs first.** If the maintainer's phase 14 run is triaged while this sprint is open, its accepted tickets run before this sprint's next planned ticket, and this sprint's last planned ticket, T04, moves to the top of the next sprint ([R41](../02-risks-and-hidden-work.md)).

## Goal

The Pit's two problems exist and its maps stand: bodies that split twice and join their pack, and a shield that turns away what comes at its front, read from the source point sprint 96 laid in. The live cap holds with every splitter dying at once.

## Playable outcome

Jump by the panel to map 95: kill a splitter with Bolide and two smaller bodies step out of it, and four from those; Rimeward's ring takes the whole brood at once. Walk at a bulwark's face and throw Bolide: nothing lands; step to its side and the same throw lands.

---

## Tickets

### P15-S101-T01 — `split` under ADR 0020, and the splitter

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | P15-S96-T02, P15-S96-T03, P15-S97-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **`split`,** an on-death hook (ADR 0019) that spawns two smaller units at the dying unit's point, each of the child row the designer named. The first generation carries `split` and splits once more; the second carries none. Under ADR 0020, as phase 12 decided it, the children have no owner, so ADR 0007's expiry does not end them, and they join the dying unit's pack.
- **The pack's record** counts them by archetype in its member list, so a pack that sleeps and wakes with children in it keeps them whole.
- **The live cap:** a child refused by the cap is counted and announced as any spawn is; the near-point bound in `domain/map/map-checks.ts` counts four children per splitter placed ([R21](../02-risks-and-hidden-work.md)).
- **The splitter family:** a chaser carrying `split`, its variant I row.

A split caused by a death on this tick spawns on the next tick's death pass, as a burst's chain does, so one tick's work stays bounded.

**Acceptance:**
- One splitter makes two children and four grandchildren, each a member of its pack, and no more.
- Its pack sleeps and wakes with every surviving child; the pack's boss dying does not end them.
- Experience and drops from the whole family sum to the designer's table.
- It plays: a pack of eight splitters killed at once by Zenith in a simulation spec; the brood walks as one pack.
- The bar: the eight splitters' sixteen children and thirty-two grandchildren, each generation spawned on one tick, under the budget tier; nothing allocates.

**Tests:**
- `tests/simulation/enemies/splitter.spec.ts`: two generations, the pack membership, sleep and wake, the cap's refusal counted.
- `tests/domain/map/map-checks.spec.ts`: four children counted per splitter against the bound.

**Pages:** [entities and pools](../../../../docs/architecture/entities-and-pools.md), children as members, checked against P15-S96-T03; [enemies](../../../../docs/product/features/enemies.md), a split; [vocabulary](../../../../docs/product/vocabulary.md), **split**.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A new enemy or behaviour · A documentation change.

---

### P15-S101-T02 — `front_shield` and the bulwark

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P15-S96-T01, P15-S96-T03, P15-S97-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **`front_shield`,** a carried status whose flag the one damage function reads: a damage instance whose source point lies within the designer's arc of the holder's facing is turned away, dealing nothing and running no hook, by the answer P15-S97-T02 gave for disables and pure damage. A source at the holder's own point is from no side and lands.
- **The bulwark family:** a chaser carrying it, its variant I row.

The angle is read against the facing on the tick the damage lands, so a bulwark still turning toward the hero is open on its side.

**Acceptance:**
- A projectile, an area, and a swing from the front deal nothing; from the side or behind, full damage; the arc's edge by the spec.
- A burn or a hook on the bulwark lands, being from no side.
- It plays: in Chrome by an agent, a bulwark spawned by the panel, Bolide thrown at its face and then at its side; Slipknife behind it and the attack lands.
- The bar: one angle read per hit on a holder of the flag, none on any other unit; the stress tier green.

**Tests:**
- `tests/domain/combat/damage.spec.ts`: the filter by angle, the edge, the holder's own point, pure damage by the designer's answer.
- `tests/simulation/enemies/bulwark.spec.ts`: a projectile, an area, a swing, from each side.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the filter in the damage function, checked; [status effects](../../../../docs/product/features/status-effects.md), the shield; [vocabulary](../../../../docs/product/vocabulary.md), **front shield**.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A new enemy or behaviour · A documentation change.

---

### P15-S101-T03 — The Pit's rows and silhouettes

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 1 |
| Depends on | P15-S97-T02, T01, T02 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **The rows:** stratum 10's ten families at the designer's variants: the splitter and the bulwark at I, the child rows of the split, and the eight above at their next variant, with a magic resistance of 1 on the variants named.
- **Two silhouette frames,** the splitter's and the bulwark's, painted by the shape painter into the one atlas page; the splitter's children drawn from its frame at a smaller scale, not a frame of their own, unless the designer asked for one. The page's fill printed.
- The shield's facing shown on the bulwark's view, since the answer is to come at it from the side: the facing cone phase 1 draws, or a mark on the silhouette.

**Acceptance:**
- The content test holds every row, the children's included, to the table.
- Every family of stratum 10 draws with its own frame; a bulwark's front reads at the default zoom.
- It plays: in Chrome by an agent, each of the ten spawned by the panel and told apart; a bulwark's front seen before a throw.
- The bar: world draw calls unchanged; the render benchmark by an agent after the frames.

**Tests:** `tests/content/enemies.spec.ts`: the Pit's rows, a frame per family, resistance 1 only where named; `tests/presentation/unit-view.spec.ts`: a child drawn at its scale, the bulwark's facing mark.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), checked by the content test.

**Definition of done:** Every change · A new enemy or behaviour · Anything under `src/presentation` · A documentation change.

---

### P15-S101-T04 — The Pit's recipe and its stress case, splits at their worst

| Field | Value |
| --- | --- |
| Layer | content, tests |
| Size | 0.5 |
| Depends on | T03, P15-S100-T03 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Pit's recipe under `src/content/strata/`, at the designer's shape and the density of strata 8 to 10, with the splitter and the bulwark always in the later regions and the near-point bound counting four children per splitter. Map 100's recipe leaves the Unwound's chamber for P15-S102-T01. Its stress case walks a sampled sweep and kills every splitter pack at once where the driver meets it, so the cap is read at the splits' worst.

**Acceptance:**
- A 1000-seed sweep: every map passes the checks, fallbacks at most 2% ([R42](../02-risks-and-hidden-work.md)), the figures printed; the most live enemies at any tick printed beside the cap.
- It plays: the driver walks maps 91 to 99 on one seed from a save at map 91.
- The bar: the Pit's stress case under `pnpm test:budget` with no `enemy_cap_reached`.

**Tests:** the Pit's stress case in `tests/simulation/stress.spec.ts`; the recipe's sweep, sampled.

**Pages:** none beyond the descent's figures, checked.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Splits: two generations, pack membership, sleep and wake | |
| The shield by angle, and the designer's answer on disables | |
| The Pit's rows and silhouettes; the atlas page's fill | |
| The Pit's sweep; the most live enemies against the cap | |
| The render benchmark, by an agent | |
| Phase 14's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **Splits at their worst against the live cap** (R21): the near-point bound counts four children per splitter, and a refusal in the stress case is a recipe fixed as content, fewer splitters to a pack, never a raised cap.
- **The shield reads a facing the view does not show.** A player who cannot see which way a bulwark faces cannot answer it; its mark is in T03, and a playtest note that the shield is unreadable is a pillar bent, first in the triage.
- **The atlas page does not hold the Pit's frames.** Raised in sprint 98 if the fill said so; here it is a smaller frame for every silhouette, not a second page, which is phase 16's (ADR 0021).
