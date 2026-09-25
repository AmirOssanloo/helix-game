# Disable matrix

> **Entry point:** [Product](../README.md)
> **See also:** [Status effects](../features/status-effects.md) · [Controls and orders](../features/controls-and-orders.md)

**Helix — What every status does to every key, order, and cast state, one cell at a time**

| Field | Value |
|---|---|
| Document type | Content specification |
| Audience | Gameplay programming, combat design, test |
| Product context | Single-player. The hero and every enemy obey the same matrix |
| Classification | Which command a status refuses, which running order or cast it ends, and which cursor it closes. What each status does and how it stacks is the [status effects page](../features/status-effects.md) |
| Simulation | 30 Hz tick. A status blocks from the tick after it lands, as the [status effects page](../features/status-effects.md#the-disable-matrix) says |

---

## 1. Purpose

This page fills in every cell of the disable matrix: every status against Q, W, E, R, D, F, the four orders, a cast point in progress, and the two cursors. The status effects page says what each status blocks in a line; this page says it for every pair, and where the two disagree this page wins.

The matrix is data in `src/content/statuses/disable-matrix.ts`, which mirrors the table in [section 3](#3-the-matrix) cell for cell. Its rows run in the order [section 2.4](#24-two-statuses-at-once) chooses a refusal's reason by, stun and lift first, where the table here keeps lift beside the other rows that move a unit. One test per cell holds the two together, so a changed cell is a change to both.

---

## 2. How to read a cell

### 2.1 The five answers

Every cell is exactly one of five words.

| Answer | Meaning |
|---|---|
| **Refused** | A command of this kind is dropped with the row's reason. Nothing about the unit changes, and the HUD flashes the square |
| **Allowed** | The command applies as it would with no status |
| **Cancelled** | Refused, as above; and an order or cast of this kind already running when the status lands ends at no cost. The unit does not take it up again when the status ends. In the cast point column: the cast ends with no mana spent and no clock started |
| **Closed** | The cursor closes at no cost on the first frame the hero wears the status, and nothing is sent |
| **Continues** | The cast point or the cursor carries on as it would with no status |

The ten key and order columns answer refused, allowed, or cancelled. The cast point column answers cancelled or continues. The two cursor columns answer closed or continues.

### 2.2 The columns

| Column | What it covers |
|---|---|
| Q, W, E | Adding an orb. Instant, with no cast point |
| R | Invoke. Instant, with no cast point |
| D, F | Throwing the spell in the slot: a no-target spell on the key, a targeted one on the click that commits the cursor. An enemy's cast of any ability reads these two cells |
| Move | A move order, by right click, or a walk an enemy's behaviour orders |
| Attack-target | An attack on one unit, by right click on an enemy, or an enemy's attack on the hero |
| Attack-move | A move that attacks whatever it acquires on the way |
| Stop | S: clear the order and cancel a cast point that has not finished |
| Cast point in progress | A cast already under way when the status lands: turning to face, walking into range, or in its cast point. A cast past its cast point is committed, and no status reaches it |
| Targeting cursor open | The hero's cursor for a targeted spell in D or F, including a press held on a spell aimed by press and drag |
| Attack-move cursor open | The hero's cursor after A, waiting for the left click |

Both cursors are the hero's alone: an enemy never has one open.

### 2.3 The rows

A row is a group of statuses that answer alike. Every status definition under `src/content/statuses/` belongs to exactly one row, named in its second column. A status is placed by the flags it raises; one that raises none is placed by what it does. A status whose damage-taken or damage-dealt hook applies another status, as `hoarfrost`, `bash`, and `frost_attack` do, blocks nothing itself; the status its hook applies lands and answers by its own row.

A refusal carries the row's reason, the flag the validator names in the refused-command event. Lift carries `stunned`, since lift raises the stunned flag.

### 2.4 Two statuses at once

A unit wearing two statuses answers each cell with the stricter of the two rows: cancelled over refused, refused over allowed, closed over continues, cancelled over continues. A rooted and silenced hero is refused Q through F and cancelled on a move; a lifted and rooted one answers as lift, and root keeps counting in the air.

A unit is placed in a row by the flags it wears, not by the statuses behind them. Lift raises the stunned flag, so a lifted unit wears every flag the stun row is worn by and more: the lift row covers the stun row, and a lifted unit answers as lift, not as the stricter stun. A move put aside by a lift is not cancelled in the air; if a stun or a root outlasts the lift, it cancels the move on landing.

When two rows refuse one command, the refusal names the reason of the first in the order stun, lift, silence, root, disarm. A stunned and silenced hero is refused Q with `stunned`; a lifted and rooted one is refused a move with `stunned`.

---

## 3. The matrix

A number in brackets points at a note in [section 4](#4-notes).

| Status | Definitions | Flags raised | Reason | Q | W | E | R | D | F | Move | Attack-target | Attack-move | Stop | Cast point in progress | Targeting cursor open | Attack-move cursor open |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Stun | `stun` | `stunned` | `stunned` | refused | refused | refused | refused | refused | refused | cancelled | cancelled | cancelled | refused (1) | cancelled | closed | closed |
| Silence | `silence` | `silenced` | `silenced` | refused | refused | refused | refused | refused | refused | allowed | allowed | allowed | allowed | continues (2) | closed | continues |
| Root | `root` | `rooted` | `rooted` | allowed | allowed | allowed | allowed | allowed (3) | allowed (3) | cancelled (4) | allowed (5) | cancelled (4) | allowed | continues (6) | continues | continues (7) |
| Disarm | `disarm` | `disarmed` | `disarmed` | allowed | allowed | allowed | allowed | allowed | allowed | allowed | refused (8) | allowed (9) | allowed | continues | continues | continues |
| Slow | `slow`, `wane_chill`, `wane` | none, and `aggro_hidden` for `wane` (10) | none | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | continues | continues | continues |
| Damage over time | `burn`, `glacier_chill` | none | none | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | continues | continues | continues |
| Knockback | `knockback`, `charge` | `displaced` | none | allowed | allowed | allowed | allowed | allowed | allowed | allowed (11) | allowed (11) | allowed (11) | allowed | continues (12) | continues | continues |
| Lift | `lift`, `updraft_lift` | `lifted`, `stunned`, `untargetable` | `stunned` | refused | refused | refused | refused | refused | refused | refused (13) | refused (13) | refused (13) | refused (14) | cancelled | closed | closed |
| No disable | `quicken`, `self_heal`, `hoarfrost`, `bash`, `frost_attack` | none | none | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | allowed | continues | continues | continues |

A death is not a status and is not a row: a dead unit refuses every command until it respawns, and every cursor closes when the hero dies. A skill point is not a column: no status refuses spending one, since a level is not an action the unit takes.

---

## 4. Notes

1. **Stun and Stop.** The stun already cleared the order and cancelled the cast, so a stop has nothing left to do and is refused with the rest.
2. **Silence and a cast under way.** Silence refuses a new cast, not one already under way: a cast whose key was accepted before the silence landed turns, walks, and finishes its cast point, and commits. Only a stun or a lift cancels a cast in progress.
3. **Root and D or F.** Allowed while the target is in range. A target out of range is refused at request by the cast pipeline with `out_of_range`, not by this matrix, because a rooted unit cannot walk to it.
4. **Root and a walk.** A running move or attack-move is cleared when the root lands, and the unit stands until the root ends without taking it up again. A rooted unit takes no step at all, whoever orders the walk: the hero's right click is refused, and an enemy's behaviour does not walk it in Chase or on the way home, even on the tick its walk is issued.
5. **Root and Attack-target.** An attack on a target in range fires as usual. A target out of range is not walked to: the order stands, and fires once the target comes into range or the root ends.
6. **Root and a cast under way.** A cast in range carries on and commits. A cast still walking into range stands where the root caught it and is cancelled at no cost, as an approach that ends short of range is.
7. **Root and the attack-move cursor.** The cursor stays open; the click it commits is refused with `rooted` and flashes, as a right click would be. Only a stun or a lift closes it.
8. **Disarm and Attack-target.** A new attack is refused. An attack already running is held, not cleared: an attack point in progress ends at no cost, the unit keeps the order and does not fire, and it fires again when the disarm ends.
9. **Disarm and Attack-move.** The move is walked; nothing is acquired or fired at along the way until the disarm ends.
10. **Wane.** Its movement modifier is a slow, so it reads as the slow row. The `aggro_hidden` flag it raises takes the hero out of enemy sight and refuses no command.
11. **Knockback and an order.** The command lands as the order, and the unit walks it once the push ends; the push carries it meanwhile and it takes no step of its own. The same holds for an order running when the push lands: it is kept. A charge is the caster carrying itself, and answers the same way.
12. **Knockback and a cast under way.** The cast point keeps counting while the unit is carried, and the cast commits from wherever the push has it on the tick the point ends. A cast still walking into range waits for the push to end, then walks on.
13. **Lift and an order.** A new order is refused, as under stun. An order running when the lift lands is neither cancelled nor kept running: it is put aside, and the unit takes it up again from where it lands. A cast is not put aside; the cast point column cancels it.
14. **Lift and Stop.** Refused, as under stun, so a stop in the air does not drop the order put aside; the unit walks it on landing.

---

## 5. What the player sees

A square on the ability bar greys while the hero wears a status whose cell for that key says refused or cancelled, so stun, silence, and lift grey six squares and root, disarm, and knockback grey none. Death is not a row, but it refuses every key, so all six grey while the hero is dead. The HUD reads the same cells the validator refuses by, so a grey square is always a refused key and a lit one never is.

An open cursor closes on the first frame its column says closed, at no cost and with no flash.

---

## Related documentation

- [Status effects](../features/status-effects.md) — what each status does, how it stacks, and the edge cases this page's notes settle
- [Controls and orders](../features/controls-and-orders.md) — the keys, orders, and cursors the columns name
- [Spell catalogue](./spell-catalogue.md) — the statuses each spell applies and the flags each raises
- [Enemies](../features/enemies.md) — the enemy abilities that put these statuses on the hero
- [Ability pipeline](../../architecture/ability-pipeline.md) — where the validator and the status pass sit in the tick
