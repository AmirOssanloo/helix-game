# Sprint 78 — The Hollow Abbess and Marrowleech

**Phase:** 12 · **Sized days:** 3 · **Buffer:** 2
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 and 11 left, and edit a ticket in place with a one-line note if it moved.

## Goal

Each new stratum ends in a boss of its own, each built around one demand: shed the Abbess's silence or fight her adds on the attack and items alone; spend the mana before Marrowleech burns it and finish it inside a window. Each drops its Legendary piece.

## Playable outcome

From the panel, jump to map 20, walk to the chamber, and fight the Hollow Abbess: silenced, lift out with Gyre Sceptre; rooted under her net among her summoner's adds. Kill her and step through the portal she opened. Jump to map 30 and fight Marrowleech as the mana bar drains; its drop is its Legendary piece.

---

## Tickets

### P12-S78-T01 — The Hollow Abbess and her Legendary piece

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | P12-S77-T01, P12-S72-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:** the Hollow Abbess on map 20, at P12-S72-T04's numbers: an archetype written once, casting `silence_curse`, a root net, and summoner adds by the existing abilities' keys, with what she casts changing below three quarters, a half, and a quarter of her health by the conditions an ability already carries. She stands in the Undercroft's chamber in place of the fixture; the portal opens on her death. She rolls no aspect. Her Legendary piece is a definition under `src/content/items/legendaries/`, dropped at the catalogue's named-boss rate beside her boss drops.

**Acceptance:**
- Her casts by health fraction as the descent says; her adds owned and ended with her (ADR 0007).
- The portal on map 20 opens only on her death.
- Her piece drops at its rate over rolls, and holds its catalogue row.
- It plays: in a simulation spec, the hero silenced by her curse, lifted by Gyre Sceptre, and her killed; in Chrome by an agent, the fight on map 20 from the panel's jump.
- The bar: the chamber's peak of units and projectiles printed; the stress tier green.

**Tests:**
- `tests/simulation/bosses/hollow-abbess.spec.ts`: the casts by fraction, the adds, the portal, the drop.
- `tests/content/items.spec.ts`: the piece's row.

**Pages:** [the descent](../../../../docs/product/specs/the-descent.md#52-stratum-bosses), checked; [item catalogue](../../../../docs/product/specs/item-catalogue.md#6-the-legendary-pieces), the piece.

**Definition of done:** Every change · A new enemy or behaviour · A documentation change.

---

### P12-S78-T02 — Marrowleech and its Legendary piece

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | P12-S77-T01, P12-S73-T01, P12-S74-T02 |
| Owner | The game engineer |
| Status | planned |

**Build:** Marrowleech on map 30, at P12-S73-T01's numbers: `mana_burn` on a clock, a leech's drain, and mana-burning adds, which are leeches it summons and owns; what it casts changes at each quarter of its health; the window it is finished inside is the designer's, made of those numbers and nothing scripted. It stands in the Ossuary's chamber; the portal opens on its death. It rolls no aspect. Its Legendary piece as the Abbess's is.

**Acceptance:**
- Its casts by health fraction; its adds owned and ended with it.
- A hero that spends its mana before a burn lands takes the burn's shortfall as damage; the self-lift sheds it.
- The portal on map 30 opens only on its death; its piece drops at its rate.
- It plays: in a simulation spec, the fight won inside the window by a scripted hero, and lost outside it; in Chrome by an agent, the fight on map 30 from the panel's jump.
- The bar: the chamber's peak printed; the stress tier green.

**Tests:**
- `tests/simulation/bosses/marrowleech.spec.ts`: the casts, the adds, the window, the portal, the drop.
- `tests/content/items.spec.ts`: the piece's row.

**Pages:** [the descent](../../../../docs/product/specs/the-descent.md#52-stratum-bosses), checked; [item catalogue](../../../../docs/product/specs/item-catalogue.md#6-the-legendary-pieces), the piece.

**Definition of done:** Every change · A new enemy or behaviour · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The Hollow Abbess by her spec; the portal on map 20 | |
| Marrowleech by its spec, the window; the portal on map 30 | |
| Both pieces at their rate | |
| The render benchmark, by an agent, in each chamber | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **A boss's demand is not met by its kit.** The fight is read in the spec by a scripted hero that answers and one that does not; a kit that neither wins nor loses by the answer goes back to the designer in this sprint's buffer, not to the playtest.
- **Adds and the live cap in a chamber.** The chamber's peak is printed in each ticket; the near-point bound already counts the adds (ADR 0020).
