# Sprint 52 — The last actives, the stun bolt, and the playtest

**Phase:** 9 · **Sized days:** 4 · **Buffer:** 1
**Cut:** 2026-09-28 by the delivery strategist, from the [phase 9 README](./README.md)'s sketch

> **Phase 8's bucket runs first.** If the maintainer's phase 8 run is triaged while this sprint is open, P8-S37-T03 onward run before this sprint's next planned ticket, and this sprint's last planned ticket moves to the top of the next sprint ([Q118](../backlog/open-questions.md)). Here that ticket is the playtest, T04, which then waits for the bucket, and sprint 53 waits with it.

## Goal

All eight active items exist; the long road throws a stun in flight, so Slipknife's answer can be played, and the recording driver still finishes it; the maintainer plays the long road with the bank.

## Playable outcome

The long road from the spawn with one 12 000-gold grant: buy six active items, reach pack 21, and blink or lift away from the boss skirmisher's stun bolt; reach the last boss and answer its bolt the same way; turn a pack ethereal with Veilblade and burn it with Scorchglass; drop Skyfall Maul on a crowd held by Fetter Bolas.

---

## Tickets

### P9-S52-T01 — Skyfall Maul

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1 |
| Depends on | P9-S43-T03, P9-S44-T01, P9-S42-T04 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** edits none of the placement's pages and moves no stored checksum, but the burn's `25 + 2.5 × L` a second is a status definition's amount, which reads the level the status entry records when it lands; that field is P9-S44-T01's, so it joins this ticket's dependencies (the sprint order already met it). **Size holds at 1.**

**Build:** Skyfall Maul at the catalogue's numbers: a point within 600, a cast point of 2 s, then a meteor landing at the point 0.5 s later, `100 + 10 × L` magical damage to each enemy within 300 and `burn` for 3 s at `25 + 2.5 × L` a second; 28 s, 125 mana, 2200 gold. The existing `burn` status and a delayed zone, as Zenith's; the targeting preview shows the 300 radius.

**Acceptance:**
- The cast point is broken by what breaks any cast point, and the clock and the mana spent as the pipeline says.
- The damage and the burn at two hero levels.
- It plays: dropped on a pack held by Fetter Bolas in a simulation spec.
- The bar: one zone from the pool; nothing allocates.

**Tests:** `tests/simulation/actives/skyfall-maul.spec.ts`: the cast point, the delay, the radius, the damage and the burn at two levels.

**Pages:** the item catalogue, by the content test.

**Definition of done:** Every change · A new spell, effect, or enemy ability · A documentation change.

---

### P9-S52-T02 — Veilblade and `ethereal`

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 1.5 |
| Depends on | P9-S44-T01, P9-S43-T01, P9-S43-T03, P9-S42-T03 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** `physical_immune` and magical damage taken are written in the [ability pipeline](../../../../docs/architecture/ability-pipeline.md) ("The exceptions, and where each is read"); this ticket checks them against the build. Three readings to build to: a physical instance on a `physical_immune` unit deals nothing **and runs no hooks**, so an ethereal hero is not bashed; magical damage taken is a modifier stat read at the hit off the damaged unit through the one pipeline over a base of nothing, as magic damage is, not a derived value, and scales a magical instance after its mitigation; and Veilblade's target is the **unit or self** kind P9-S42-T03 builds. The [disable matrix](../../../../docs/product/specs/disable-matrix.md) now names the flag `physical_immune` where it said `ethereal`; the status's id is `veilblade_ethereal` there and `ethereal` above, and the content file settles it. No stored checksum should move, since the stat is not a derived value; if the hero's totals are hashed by stat, adding one moves their shape, re-recorded with `--checksums` after the replay proves play unchanged. **Size holds at 1.5.**

**Build:**
- **The flag `physical_immune`,** read in the one damage function beside `invulnerable`: physical damage is zeroed.
- **A stat, magical damage taken,** in the stat key list, which the damage function scales magical damage by.
- **`ethereal`,** a status raising `physical_immune` and `disarmed` with a modifier row of +40% magical damage taken, and its disable-matrix row.
- **Veilblade** at the catalogue's numbers: the hero or an enemy within 800, a blade at 1275 a second, `ethereal` for 3 s; an enemy also takes `60 + 6 × L` magical damage, raised by the 40%, and is slowed 50% for the 3 s; 20 s, 100 mana, 2000 gold.
- The content test of P9-S44-T01 lists `ethereal` as the one status carrying `physical_immune`.

**Acceptance:**
- An ethereal unit takes no physical damage, cannot attack, and takes 40% more magical damage; on the hero, the attack refused and the kit working.
- The blade's damage raised by the 40% it applies, at two hero levels.
- It plays: an ethereal pack burned by Scorchglass in a simulation spec; the hero ethereal in a brute's swing.
- The bar: one more read in the damage function; the stress tier green.

**Tests:**
- `tests/simulation/actives/veilblade.spec.ts`: both targets, the flight, the damage with its own amplification, the slow.
- `tests/domain/combat/damage.spec.ts`: `physical_immune` and the magical damage taken stat.
- `tests/domain/orders/disable-matrix.spec.ts`: the `ethereal` row's cells.

**Pages:** [ability pipeline](../../../../docs/architecture/ability-pipeline.md), the flag and the stat; [status effects](../../../../docs/product/features/status-effects.md) and the disable matrix, checked; [hero](../../../../docs/product/features/hero.md#derived-values), the new stat if it is shown.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A new spell, effect, or enemy ability · A documentation change.

---

### P9-S52-T03 — `stun_bolt` on the long road

| Field | Value |
| --- | --- |
| Layer | content, tests, docs |
| Size | 1 |
| Depends on | P9-S51-T02, P9-S41-T03 |
| Owner | The game engineer |
| Status | planned |

> **Note, 2026-09-28, from P9-S41-T01:** edits none of the placement's pages, and **moves stored checksums on purpose**, as its build says: the long road plays differently, so `balance-loot.json` is recorded again and every other moved log is named and traced. The bolt is a homing projectile aimed at a unit, so it records the disjoint count at launch as any such projectile does, with nothing added for it. **Size holds at 1.**

**Build:** the enemy ability `stun_bolt`, as [the design outline](../../2026-09-28-design-outline-next-phases.md) sets it: a homing projectile at 700 a second, range 900, cast point 0.6 s, a 1.5 s stun and 30 physical damage, 8 s cooldown. It joins the boss abilities of the skirmisher and the brute, so pack 21 and pack 37, the last boss, throw it on the long road. The enemy catalogue and the long road spec gain it. The content version moves: `pnpm restamp` re-stamps the stored logs; `balance-loot.json` is recorded again by the driver, since the road now plays differently; every other stored log whose play moves is named and traced ([R36](../02-risks-and-hidden-work.md)).

**Acceptance:**
- Pack 21's and pack 37's boss throws the bolt; no other pack's unit does.
- The bolt is disjointed by Slipknife and by the self-lift, in a simulation spec.
- The driver still finishes the road with no panel help, `balance-loot.json` recorded again and green, and the margin written in the sprint exit.
- It plays: in Chrome by an agent, the bolt seen in flight from pack 21's boss and dodged by a blink.
- The bar: the long-road stress case under the budget tier green with the bolt.

**Tests:**
- `tests/simulation/abilities/stun-bolt.spec.ts`: the flight, the stun, the damage, the disjoint.
- `tests/simulation/replays/balance-loot.spec.ts`: green on the new recording.
- `tests/content/enemies.spec.ts`: the two archetypes' boss abilities.

**Pages:** [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md), `stun_bolt`; [the long road](../../../../docs/product/specs/the-long-road.md), packs 21 and 37; the disable matrix, checked.

**Definition of done:** Every change · A new spell, effect, or enemy ability · A documentation change.

---

### P9-S52-T04 — The maintainer's playtest and the triage

| Field | Value |
| --- | --- |
| Layer | tests, docs |
| Size | 0.5 |
| Depends on | every ticket of sprints 41 to 44 and 51, and T01 to T03 |
| Owner | The game engineer, with the maintainer; the triage in the delivery strategist's role |
| Status | planned |

**Build:** the maintainer plays the published build from the spawn at level 1 to the last boss's kill, in one tab with no reload (R30), with one panel command: a grant of 12 000 gold at the spawn (Q103), recorded in the log. Otherwise the panel stays closed but for **Jump to checkpoint**. F9 for each note; **Save input log** at the end. A box under Waiting on a person in STATUS.md holds the steps and asks the design outline's three questions: whether the self-lift's 2.5 s window is too strong, whether Slipknife's 1200 reads right on the isometric view, and whether the lockout makes Slipknife a tool or a trap in the last boss's chamber. If the phase 8 run is still outstanding, the box offers both in one sitting: the pinned phase 8 build first, then this one.

An agent stores the session as `tests/simulation/replays/long-road-actives-playtest.json`, the long road's reference log, and each feedback file under `notes/`, and a spec replays it. The triage is held with the maintainer by the phase 6 method in `notes/<date>-actives-triage.md`: each note one outcome, a bug, a tuning change, a screen fix, or no change, with a new system to Deferred. Accepted items are written as P9-S53-T03 onward, in the bucket's order until two days are spent; a design answer the triage needs is the game designer's.

**Acceptance:**
- The session holds the one grant and no other panel command but the jump, at least one `activate_item` of each item bought, and the last boss's kill.
- Two replays agree at every tick; every feedback file loads and stops at its tick.
- Every note has an outcome; the bucket's committed and unspent days are written.
- It plays: this is the phase's play.
- The bar: not applicable; the gate reads it.

**Tests:** `tests/simulation/replays/long-road-actives-playtest.spec.ts`: skips until the log exists; then the replay, the one grant, the commands it must not hold, the activations, the kill, and the level at the kill printed.

**Pages:** the triage note; the sprint exit.

**Definition of done:** Every change · A documentation change.

---

## Sprint exit

| Check | Result |
| --- | --- |
| Skyfall Maul and Veilblade at their catalogue numbers | |
| `stun_bolt` on packs 21 and 37; `balance-loot.json` recorded again, the driver's margin | |
| Every other stored log unchanged, or named and traced | |
| The maintainer's run | |
| Triage and the bucket | |
| The render benchmark, by an agent | |
| Phase 8's bucket tickets run in this sprint, if any | |
| Actual days per ticket | |
| Sprint total | |

## Risks in this sprint

- **The stun bolt on the last boss makes the road harder than the balance allowed.** The driver's margin is read before the playtest; a margin under the catalogue's is a tuning change in this ticket, not the bucket's.
- **The playtest is the calendar** ([R41](../02-risks-and-hidden-work.md)). Sprint 53 waits on it; phase 10 does not start while phase 8's and phase 9's runs are both outstanding.
