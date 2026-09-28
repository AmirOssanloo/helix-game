# Sprint 75 — The reflected hit, the ten aspects, and the Undercroft

**Phase:** 12 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, ahead of the phases before it at the maintainer's request; re-read at the phase's start against what phases 10 and 11 left, and edit a ticket in place with a one-line note if it moved.

## Goal

The last capability an aspect needs, a hit turned back on its source, is built; the ten aspects of [the descent](../../../../docs/product/specs/the-descent.md#4-aspects)'s section 4 exist as data, each drawn as an icon over the unit that carries it; and the Undercroft's seven families stand as rows at variants I and II.

## Playable outcome

From the panel, spawn an elite troll with Vengeful and Stoneskin: two icons over it, and each of the hero's attacks takes a fifth of its damage back off the hero's health. Spawn a Volley archer: three shots in a fan. Spawn an Undercroft hexer at variant I beside a long-road hexer: the same behaviour and silence, its own name, tint, and numbers.

---

## Tickets

### P12-S75-T01 — The reflected hit

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1 |
| Depends on | P12-S72-T02 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** unplanned in the sketch, added by the delivery strategist when the phase was cut. Vengeful turns a fifth of the damage it takes back on the hero, and a damage-taken hook today aims at its own holder and knows nothing of the hit that fired it (`src/domain/combat/damage-hooks.ts`). Built once here; phase 15's `thorns` reuses it.

**Build:**
- **The hook's context carries the triggering hit:** its amount after mitigation, its damage type, and its source, written by the damage function when it runs the hooks, on the hook pass's scratch.
- **An amount "a fraction of the triggering hit",** and **a target "the hit's source"**, each read only in a hook's list; a list outside a hook that names either is refused by validation.
- **`vengeful`,** carried, a damage-taken hook with no internal cooldown whose list deals a fifth of the hit, of the hit's own type, to its source.

The reflected damage is hook damage, so it runs no hooks ([ADR 0008](../../../../docs/adr/0008-damage-hooks-are-status-capabilities.md)): two Vengeful units never pass a hit back and forth. An invulnerable or ethereal source takes what the damage function lets through, as any damage.

**Acceptance:**
- A hero hitting a `vengeful` unit for 100 physical takes 20 physical, reduced by its armour; a Bolide hit comes back magical.
- A summon's hit comes back on the summon, as P12-S72-T04 decided.
- A self-lifted hero takes nothing back; two `vengeful` units in a zone pass nothing between them.
- It plays: in a simulation spec, the hero's combo on a `vengeful` boss and the health it costs, printed.
- The bar: no allocation in the hook pass; the stress tier green.

**Tests:**
- `tests/domain/combat/on-damage-hook.spec.ts`: the context's hit, the fraction, the source target, and the refusal outside a hook.
- `tests/simulation/statuses/vengeful.spec.ts`: both damage types, the summon, the self-lift, two holders.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the hook's context, checked against P12-S72-T02's placement; [status effects](../../../../docs/product/features/status-effects.md), `vengeful`.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

### P12-S75-T02 — The ten aspects as data, and their icons

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 1.5 |
| Depends on | P12-S73-T02, P12-S73-T03, P12-S74-T01, P12-S74-T02, P12-S74-T03, T01, P12-S72-T04 |
| Owner | The game engineer |
| Status | planned |

**Build:**
- **Ten aspect definitions,** each made of statuses that exist or are data alone: Swift (movement and attack speed up a third), Stoneskin (armour doubled), Warded (magic resistance up 0.3), Frostbound (`frost_attack`, carried), Leeching (a damage-dealt hook applying a short `mana_burn`), Burning (`burning`), Rallying (`rallying`), Blinking (`blinking`), Volley (`volley`, eligible only on a family with a ranged attack), and Vengeful (`vengeful`), at P12-S72-T04's numbers.
- **Warded's "to at most 0.75"** held as P12-S72-T02 placed it: proposed, a content test that no family row Warded can roll on carries more than 0.45 magic resistance.
- **Ten icons,** each an `icon` frame with its own glyph, painted by the existing shape painter into the one atlas page as the status icons are; no drawn or sourced asset.
- **An aspect icon over every member that carries one,** drawn from the status-icon view's pool in a row of its own above the status icons, so a pack's aspects read before its statuses.
- **A check that no rule branches on an aspect's id:** a test that no file under `src/domain` or `src/simulation` names an aspect's id, and none reads the aspect kind but the roll and the spawn.

**Acceptance:**
- Each aspect's spec shows what the descent says it does, on a unit spawned by the panel's command with it.
- No aspect's status raises a flag; Volley never rolls on a melee family.
- Every recipe's counts are still zero, so every generated map is unchanged; the Nave's one aspect is P12-S76-T04.
- It plays: in Chrome by an agent, an elite spawned from the panel with two aspects wears two icons, and a pack of five with one wears five.
- The bar: the icons from the existing pool, no new view; world draw calls unchanged; the render benchmark by an agent, before and after.

**Tests:**
- `tests/simulation/aspects/each-aspect.spec.ts`: one case per aspect, what it changes.
- `tests/content/aspects.spec.ts`: ten aspects, their statuses, eligibility, no flag, Warded's ceiling over the rows.
- `tests/architecture.spec.ts`: no aspect id named under `src/domain` or `src/simulation`.
- `tests/presentation/status-icon-view.spec.ts`: the aspect row over a member, and a unit with none.

**Pages:** [the descent](../../../../docs/product/specs/the-descent.md#4-aspects), checked; [enemies](../../../../docs/product/features/enemies.md), aspects on elites and bosses; [presentation](../../../../docs/architecture/presentation.md), the aspect row; [HUD](../../../../docs/product/features/hud.md), if the icons are listed there.

**Definition of done:** Every change · A new spell, effect, or enemy ability · Anything under `src/presentation` · A documentation change.

---

### P12-S75-T03 — The Undercroft's seven families at variants I and II

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1.5 |
| Depends on | P12-S72-T04, P12-S73-T01 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28:** grown from the sketch's 1 day for variant I alone. [The descent](../../../../docs/product/specs/the-descent.md#3-families-and-variants)'s section 3 stands these seven at variant II in the Ossuary; the sketch and the gate's outline counted only I.

**Build:** the hexer, trapper, skirmisher, crusher, summoner, troll, and brute as families of the family kind (ADR 0018), each with two rows, I and II, at P12-S72-T04's and P12-S73-T01's numbers: own name, tint, numbers, and experience, and the ability more where the rows give one. Each shares its long-road archetype's behaviour and abilities by key only. The long road's thirteen archetypes are untouched: no row, no number, no key of theirs changes.

**Acceptance:**
- Fourteen rows expand through the registry into the archetype records the domain reads, and each holds the catalogue's numbers.
- The long road's stored logs replay after `pnpm restamp` with no re-record.
- It plays: in Chrome by an agent, a variant I hexer and a variant II hexer spawned from the panel on a Nave map, told apart by name and tint, each silencing the hero.
- The bar: the stress tier green.

**Tests:** `tests/content/families.spec.ts`: the fourteen rows against the catalogue; each family's behaviour and ability keys equal to its long-road archetype's.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), checked against the content test.

**Definition of done:** Every change · A new enemy or behaviour · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The reflected hit by its spec | |
| The ten aspects, each by its spec; no id branched on | |
| Aspect icons over members; draw calls; the render benchmark | |
| The Undercroft's fourteen rows | |
| Every stored log after the re-stamp | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **An aspect needs code nobody placed.** It waits for its capability as a ticket of its own with a size, never an `if` in T02 ([R37](../02-risks-and-hidden-work.md)).
- **Two icon rows over a dense pack** crowd the view. The agent's check reads a pack of five at the densest choke; a spacing fix is in T02, a new layout is the designer's.
