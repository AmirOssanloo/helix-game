# Character Movement and Mechanics

> **Entry point:** [Product](../README.md)

**Skein — Player Controls, Locomotion, Orb Buffer, and Invoke FIFO**

| Field | Value |
|---|---|
| Document type | Systems / controls specification |
| Reference title | Skein-class player-control model |
| Audience | Gameplay programming, animation, input, combat design |
| Product context | Web-based single-player game. No multiplayer, no lockstep netcode. |
| Classification | Mechanism only. Individual invoked spells are out of scope. |
| Casting mode | Normal cast only. No quick-cast. |
| Omitted orders | Follow, hold position, shift-queue, quick-cast |
| Simulation | Local 30 Hz simulation tick (Δt = 1/30 s); turn rate expressed in 0.03 s steps |
| Status | Approved outline with input and platform revisions applied |

---

## 1. Purpose

This brief specifies how a player controls a Skein-class caster in a web-based single-player game: pointer and keyboard issuance of orders, continuous locomotion with facing constraints, collision and pathing, the three-orb reagent buffer, the Invoke composer, and the two-slot prepared-spell FIFO.

This is a single-player design, not a multiplayer replica, and not a catalogue of named invoked spells. Where the product deliberately drops an order (follow, hold, shift-queue, quick-cast), the brief states the omission and specifies the remaining behaviour so it cannot be re-imported by habit.

The engineering goal is that the character faces the direction of a move command over a measurable turn interval, that a fourth orb press evicts the oldest instance, and that composing a spell and throwing a spell are two different keys.

---

## 2. Scope and Explicit Exclusions

### 2.1 In scope

- Pointer and keyboard mapping under normal cast: select, move, attack-target, attack-move, stop, enter targeting cursor, confirm target, cancel targeting, compose orbs, invoke, throw prepared spells.
- Locomotion: base speed, modifier stack, optional night bonus, min/max clamps, path following, collision hull, bound radius.
- Facing: turn-rate units, 180-degree turn time, forward action cone, turn-then-act coupling to move, attack, and targeted casts.
- Orb buffer: Q / W / E instance spawn, hard cap of three active instances, oldest-instance replacement, visual and HUD ordering.
- Invoke composer: R reads the current three-instance multiset, ignores permutation, writes a prepared ability identity into the slot machine.
- Prepared-spell slots D and F: insert, shift, evict, swap-on-reinvoke, independent per-spell cooldowns.
- Timing: per-ability cooldowns, Invoke cooldown as a function of total orb levels, when a cooldown starts, absence of a global cooldown.
- Single-player web runtime: local simulation, input sampling, no replication layer.

### 2.2 Out of scope

- The ten invoked spell identities and their combat effects. Combinations are referred to only as `spell-qqq`, `spell-qqw`, `spell-qwe`, and so on.
- Quick-cast, quick-cast on key-up, self-cast double-tap as a product requirement.
- Shift-queue and any other order queue. The unit holds at most one current order.
- Follow (right-click ally) and hold position.
- Multiplayer, spectating, lockstep, client-side prediction against a remote server, and lag compensation.
- Item inventory, shop, and talent trees as content, except where they would change orb count, orb level, or slot count.
- Team vision, fog of war as a networking problem, and map geometry except as they constrain pathing.

---

## 3. Character Identity and Baseline Stats

The character is a ranged caster hero: a ground unit, player-owned, single-selection primary actor, projectile attacker, with three reagent abilities, one composer, and two runtime-generated ability slots.

### 3.1 Authoritative locomotion and body numbers

These are the body numbers the product starts from. Use 280 base movement speed unless design changes it.

| Property | Value | Notes |
|---|---|---|
| Attack type | Ranged | Projectile speed 900 |
| Attack range / acquire | 600 / 800 | Acquire is attack search radius |
| Attack point + backswing | 0.4 + 0.7 s | Base attack time 1.7 s |
| Base movement speed | 280 | World units per second |
| Night hero bonus (optional) | +30 | Omit if the product has no day/night clock |
| Turn rate \(T\) | 0.6 | Radians per 0.03 s step |
| Collision size | 27 | Impassable body radius |
| Bound radius | 24 | Range / radius buffer |
| Default min / max MS | 100 / 550 | Global clamps unless a haste-like rule exists |

### 3.2 Body versus selection versus model

Three sizes exist and must not be collapsed into one radius.

- **Collision size 27** is the impassable body used by pathing and unit-unit blocking. Minimum center distance between two non-phased units is the sum of their collision sizes.
- **Bound radius 24** is the coordinate buffer added to attack range, unit-targeted cast range, and many effect radii. Actual attack reach ≈ attack range + attacker bound + target bound.
- **Selection size** is the clickable box in screen space. It may scale with the rendered model. It is not a physics value.

Every hero form shares the same hull (collision 27, bound 24). Phased or flying movement, if the product later adds it, ignores collision against other units but not against buildings or trees. Until then, treat every ground unit as a solid disc.

---

## 4. Input Model and Control Mapping

The control surface is an RTS hybrid: the pointer issues spatial orders; the left hand issues ability identities. This product uses **normal cast only**. Ability keys are the default QWERDF layout because the kit is designed around it.

### 4.1 Pointer primitives

| Input | Context | Order produced |
|---|---|---|
| Left click | World or unit, no targeting mode | Select. Drag-box may multi-select owned units if the product has any. |
| Left click | Ability targeting mode | Commit the target (unit or ground point) and begin the cast. |
| Left click | Empty ground while not targeting | Select nothing / clear selection policy is a UI choice. It must not issue a move. |
| Right click | Walkable ground | Replace the current order with a move to that point. No attack en route. |
| Right click | Enemy unit | Replace the current order with attack-target. |
| Right click | Allied or neutral non-enemy | No follow order. Ignore, or treat as ground-move to that point. Do not start a follow leash. |
| Middle drag / edge pan | Camera | Camera only. Does not issue unit orders. |
| Scroll wheel | Nothing | The view has one scale; there is no zoom. Not a unit command. |

### 4.2 Keyboard primitives

| Default key | Action | Skein-specific meaning |
|---|---|---|
| Q | Ability 1 | Add one Quartz instance immediately |
| W | Ability 2 | Add one Whorl instance immediately |
| E | Ability 3 | Add one Ember instance immediately |
| R | Composer | Invoke: compile current orb multiset into a slot |
| D | Prepared slot 4 | If D is a no-target stub, cast it. If D needs a target, enter targeting mode. |
| F | Prepared slot 5 | Same rules as D for slot F |
| A then left click | Attack-move | Move to point; acquire enemies along the way |
| S | Stop | Clear the current order and cancel targeting or an abortable cast |
| Esc | Cancel targeting | Drop targeting mode. Do not clear an existing move unless S is also pressed |
| Select Hero (optional F1) | Select the player unit | Does not move the unit |

Omitted keys and modes, by design: hold position, follow, shift-queue, quick-cast. Do not implement hidden aliases that restore them.

### 4.3 Normal cast only

Every targeted ability uses a two-step commit.

1. Press the ability key. If the ability is no-target (Q, W, E, R, and any no-target stub on D or F), it commits on key-down.
2. If the ability needs a unit or a point, the client enters targeting mode: the cursor becomes a target reticle, and no spell is spent yet. Left click commits. Esc or S cancels targeting without spending mana or starting cooldown.

There is no quick-cast. Hovering a unit and tapping D must not fire D until a confirming left click, unless D’s current stub is no-target. This is slower than a quick-cast setup and is an accepted product constraint.

There is no global cooldown. Q, W, E, R, D, and F may be legally processed on consecutive ticks subject only to each ability’s own cooldown, mana, disable state, and turn-to-face rules.

### 4.4 Input state machine

The unit holds exactly one current order. There is no order queue. A newly issued legal order replaces the current one on the tick it is consumed, before the unit moves, so its first step lands on that tick (AT-M1).

**States:** Idle, Turning, Moving, AttackWindup, AttackBackswing, AbilityCastPoint, AbilityBackswing, Channeling, TargetingCursor (local UI only).

`TargetingCursor` is not an order. Opening or cancelling it must not stop an existing move.

---

## 5. Command Semantics

### 5.1 Move

A move order stores a world-space destination. The unit pathfinds on the navigation mesh, avoiding static blockers and the collision hulls of other solid units. Player-controlled units attempt to path around other units.

Move does not arm attack. Right-clicking ground repositions the unit without committing an attack animation. That distinction is load-bearing for weaving orbs while kiting.

A new move replaces the previous order immediately. The unit does not finish the old path first. There is no waypoint list.

### 5.2 Attack-target and attack-move

**Attack-target** locks a unit id. If the target is beyond attack range, the attacker pathfinds toward it, turns to face, then starts the attack point. If the target dies or otherwise becomes invalid, the unit goes Idle.

**Attack-move** stores a destination and a policy: while travelling, acquire a valid enemy in acquisition range (800 for this hero) and temporarily switch to attack-target; when that target is lost, resume the original destination. Attack-move must not backtrack the already-travelled path solely to re-engage a dropped target.

### 5.3 Stop

Stop (S) clears the current order, aborts targeting mode, and aborts a cast if the cast point has not completed. The unit returns to Idle. If a turn was already in progress, freeze yaw on Stop so the player can immediately issue a new facing.

Stop is not hold. After Stop the unit may acquire if the product’s idle policy allows attack. If idle attack is unwanted during orb composition, idle policy should be “no acquire” rather than introducing a hold key.

### 5.4 Explicitly not present

- **Follow.** Right-clicking an ally does not leash the hero to that unit.
- **Hold position.** There is no order that plants the unit and suppresses acquire as a distinct command.
- **Queue.** Shift plus click does not enqueue. If the web client uses Shift for camera or UI, that binding must not create a waypoint queue.

### 5.5 How orbs and Invoke interact with the current order

Q, W, E, and R are instantaneous no-target actions. Issued without a disable, they execute on the current tick and do not replace a move or attack order. The unit keeps walking. They do interrupt a channel. They do not create queued follow-up orders.

---

## 6. Movement System

### 6.1 Speed composition

Movement speed is distance per second in world units.

\[
\mathrm{MS} = \mathrm{clamp}\bigl((\mathrm{Base} + \sum \mathrm{flat}) \times (1 + \sum \mathrm{percentage}),\ \mathrm{MS}_{min},\ \mathrm{MS}_{max}\bigr)
\]

unless a higher-priority rule is later added (set-speed, absolute-speed, or haste). Flat modifiers apply before percentages. Percentage modifiers sum inside the multiplier. Default clamps are 100 and 550.

Skein-specific percentage speed comes from each active Whorl instance. Documented values at Whorl levels 1–7 are **+0.6% / 1.2% / 1.8% / 2.4% / 3.0% / 3.6% / 4.2%** movement speed per instance. Three Whorl instances apply three copies of the per-instance value at the current Whorl level. This bonus is a live stance effect: changing the orb buffer immediately changes MS. It is not snapshotted at Invoke time.

### 6.2 Time of day

If the product has no day/night clock, omit this subsection. In the source game all units receive +15 MS at night and heroes receive a total of +30. The extra hero portion breaks for 5 seconds after the hero’s attack point or after taking player-sourced damage. A single-player web game may keep a simple always-on +0 or a scripted haste zone instead.

### 6.3 Integration

Speed is constant along the path. There is no Newtonian acceleration, no momentum off the end of the path, and no sideways strafe. Each simulation tick, if state is Moving and facing is inside the action cone toward the next path vertex, advance \(\min(\mathrm{MS} \times \Delta t,\ \text{remaining polyline length})\).

The unit does not slide while yawing. Translation waits on facing (Section 7).

### 6.4 Path following

> **Amendment 2026-09-19** ([ADR 0002](../../adr/0002-custom-fixed-step-simulation.md)): through phase 5 the implementation uses grid A* on 32-unit cells with a binary heap, line-of-sight path smoothing, and obstacle inflation per unit radius class. Unit-versus-unit blocking is hard push-out, not steering. A navigation mesh is out of scope. The original guidance is kept below for the record.

Use a navigation mesh with local steering around hulls. Recalculate when a blocker appears in the corridor or when the destination is replaced. Arrival epsilon should be small (a few world units) so micro-clicks feel crisp. If the destination sits inside another unit’s hull, steer to the nearest legal point on the inflated obstacle.

---

## 7. Facing and Turn Rate

This section is the difference between a twin-stick mage and an Skein-class replica. The model never instant-snaps from one facing to the opposite facing in a single frame unless the required yaw is already inside the action cone.

### 7.1 Units and formula

Turn rate \(T\) is published in radians per 0.03 seconds, not in revolutions per second. Skein \(T = 0.6\).

Time to rotate 180° at constant max rate:

\[
t_{180} = \frac{0.03\pi}{T}
\]

For \(T = 0.6\), \(t_{180} \approx 0.157\,\mathrm{s}\) (about 5 ticks at 30 Hz). Some public tables list 0.175 s for the same \(T\). Implement the closed-form 0.157 s and add the optional ramp below if the about-face feels too sharp.

Instantaneous yaw speed at max rate: \(\omega_{max} = T / 0.03 \approx 20\,\mathrm{rad/s} \approx 1146^\circ/\mathrm{s}\). If the simulation tick is \(1/30\) s rather than 0.03 s, scale the per-tick max step by \(\Delta t / 0.03\) so wall-clock turn time stays 0.157 s.

### 7.2 Ramp

A unit does not start turning at \(\omega_{max}\) on the first tick; turn rate ramps over a short interval. Implement a short ease-in of 2–4 ticks to \(\omega_{max}\). Do not ease-out in a way that overshoots. Clamp the last tick so facing equals the target when remaining angle ≤ max step.

### 7.3 Action cone (the 11.5° rule)

Movement, attacks, and targeted spells do not begin until the target bearing is within **11.5°** of current facing. Equivalently there is a 23° forward cone in which those actions are legal immediately. If the required yaw is larger, the unit enters Turning and withholds translation and cast point.

Consequences:

- A 180° about-face is never a one-frame pop. The unit stands and yaws for ~0.16 s plus ramp, then the first translation step occurs.
- Clicks slightly beside the current facing start walking on the same tick. Clicks behind the unit always pay turn time.
- Kiting is a sequence of paid yaws, not an instant strafe.
- Use shortest-arc turning through ±180°.

### 7.4 What facing is tied to

| Order | Must face before start? | Translates while turning? |
|---|---|---|
| Move / attack-move | Yes. Destination or next path vertex within 11.5° | No |
| Attack-target | Yes. Target within 11.5° | No |
| Point or unit targeted D / F spell | Yes | No |
| Q / W / E orb add | No. Cast point 0 + 0 | May continue an existing move |
| R Invoke | No. Cast point 0 + 0 | May continue an existing move |
| Stop | N/A | N/A |

Orb presses and Invoke are self / no-target with a 0.00 + 0.00 cast animation. They must not force a re-face. They do interrupt channels.

### 7.5 Turn-rate modification

If a slow later mentions turn rate, stack multiplicatively against base \(T\):

\[
T_{eff} = T_{base} \times \prod_i (1 - \mathrm{slow}_i) \times \prod_j (1 + \mathrm{bonus}_j)
\]

Skein has no innate turn-rate overwrite. Do not couple Whorl movement speed into turn rate.

---

## 8. Collision, Blocking, and Occupancy

The hero occupies a 27-unit collision disc. Two such heroes cannot have centers closer than 54 units. Buildings and unwalkable cells are not passable. Trees, if present, are grid blockers rather than discs.

Selection priority when click boxes overlap: the box under the cursor closest to the camera wins. Skein’s rendered model may look larger than 27 units; clicks still resolve against the selection box, movement still resolves against the hull.

Recommended debug draws: collision radius, bound radius, and selection box as three separate overlays. Designers will otherwise tune the wrong circle.

---

## 9. Orb System — Q, W, E

### 9.1 Identity

Quartz (Q), Whorl (W), and Ember (E) are no-target, instant, self-affecting abilities. Each successful press appends one instance of that element to a capacity-3 buffer. Instances are an ordered list of at most three tokens drawn from `{Q, W, E}`.

### 9.2 Buffer contract

- **Capacity:** 3 instances total across all elements. Not 3 per element. Legal buffers include QQQ, WWW, EEE, QQW, QWE, and every other 3-multiset. Four tokens is illegal and must evict.
- **Append:** a press pushes one new instance onto the newest end.
- **Eviction:** if size would exceed 3, pop the oldest instance, then push. FIFO replacement on the instance list.
- **HUD order:** oldest on the left, newest on the right, matching three floating orbs over the unit.
- Permutation of the same multiset is irrelevant to Invoke. It is relevant to eviction: the oldest token is the one that dies on overflow.
- One instance per press. There is no hold-to-fill.

### 9.3 Worked eviction traces

Empty buffer. Press Q, Q, W → buffer `[Q, Q, W]`. Invoke compiles `spell-qqw`.

From `[Q, Q, W]`, press E → evict oldest Q → `[Q, W, E]`. Invoke compiles `spell-qwe`.

From `[Q, W, E]`, press E → evict Q → `[W, E, E]`. Invoke compiles `spell-wee`.

From `[W, E, E]`, press W → evict W → `[E, E, W]`. Same multiset as `[W, E, E]`. Invoke compiles `spell-wee` and then follows the re-invoke rules in Section 11.

### 9.4 Level versus instance

Each orb ability has its own skill level. The level scales the magnitude of each instance’s stance bonus. The instance count is independent: a level-7 Whorl with one instance is not equal to a level-1 Whorl with three instances.

Stance bonuses that matter to this brief:

- Whorl instances add percentage movement speed and percentage cooldown reduction while they persist. CDR from Whorl is stored at the moment an ability starts its cooldown and does not retcon mid-clock if the player then swaps orbs.
- Quartz and Ember instances add durability and damage-related stance stats. They do not change turn rate or the control scheme.

The prototype must implement Whorl movement speed so that filling WWW is viscerally faster than filling QQQ. That feedback teaches the buffer. The rest of the stance block can wait.

### 9.5 Timing

| Property | Value |
|---|---|
| Cast point + backswing | 0.00 + 0.00 s |
| Targeting | None (self). Commits on key-down. |
| Mana cost of an orb press | 0 |
| Cooldown of an orb press | None |
| Interrupts channels | Yes |
| Forces facing | No |
| Visible on the unit | Yes — three floating orbs |

---

## 10. Invoke Composer — R

### 10.1 Read

Invoke is a no-target innate. On commit it snapshots the current three-instance multiset and maps that multiset onto a prepared-spell identity. Arrangement does not matter: QQE, QEQ, and EQQ are one key. The composer needs a stable hash of counts, for example \((n_Q,\ n_W,\ n_E)\) where \(n_Q + n_W + n_E = 3\).

If the buffer has fewer than three instances, refuse the input. The hero is expected to keep three orbs after the opening presses.

### 10.2 Write

The composer does not cast the compiled spell. It writes the spell identity into the prepared-slot machine in Section 11. The player later spends D or F to throw it. Compose versus throw is the skill ceiling of the control scheme.

### 10.3 Cost and cooldown of the composer

Invoke has a small mana cost (7 in current public data; treat as tunable). It has no cast point (0.00 + 0.00) and does interrupt channels.

Cooldown is a function of the sum of Quartz, Whorl, and Ember skill levels, not of how many instances are currently active. The model: base 7.0 s minus 0.3 s per total orb level.

\[
\mathrm{CD}(n) = 7.0 - 0.3n
\]

| Total orb levels | Invoke CD (s) | Total orb levels | Invoke CD (s) |
|---|---|---|---|
| 1 | 6.7 | 12 | 3.4 |
| 2 | 6.4 | 13 | 3.1 |
| 3 | 6.1 | 14 | 2.8 |
| 4 | 5.8 | 15 | 2.5 |
| 5 | 5.5 | 16 | 2.2 |
| 6 | 5.2 | 17 | 1.9 |
| 7 | 4.9 | 18 | 1.6 |
| 8 | 4.6 | 19 | 1.3 |
| 9 | 4.3 | 20 | 1.0 |
| 10 | 4.0 | 21 | 0.7 |
| 11 | 3.7 | — | — |

Percentage cooldown reduction from Whorl instances applies on top using Section 12.

### 10.4 Re-invoke versus first invoke

If the compiled identity is not in D or F, this is a **first invoke**: pay mana, start Invoke’s cooldown, run the slot insert in Section 11.

If the compiled identity is already in D or F, this is a **re-invoke / swap**:

- Re-invoking does not create a third slot.
- If the identity is in F, swap D and F so the identity becomes the primary throw key.
- If the identity is already in D, the slot machine is unchanged.
- A swap-only Invoke spends no mana and does not start the composer cooldown. The player can promote F to D as fast as they can press R.

---

## 11. Prepared-Spell FIFO — Slots D and F

### 11.1 Capacity

Exactly two prepared identities. Default keys: **D** = slot 4 (primary / newest), **F** = slot 5 (secondary / older). The ability panel shows empty sockets until the first successful Invoke.

### 11.2 Insert algorithm

On a first invoke of identity \(X\):

- If D is empty: write \(X\) into D. F stays empty.
- If D is occupied by \(Y\) and F is empty: move \(Y\) to F, write \(X\) into D.
- If D is \(Y\) and F is \(Z\): evict \(Z\) entirely, move \(Y\) to F, write \(X\) into D.

Evicted identities leave the hotbar. Their cooldown clocks persist in a map keyed by identity so that invoking them later restores remaining cooldown rather than resetting it.

### 11.3 Throw

Pressing D or F uses whatever identity currently occupies that slot. No-target stubs commit on key-down. Point-target and unit-target stubs enter targeting mode and wait for a left click. Facing rules in Section 7 apply at commit, not at key-down of a targeted stub.

D and F are independent. Casting D does not put F on cooldown. Putting a new identity into a slot does not start that identity’s cooldown. Cooldown starts when the spell is actually thrown, after its cast point.

### 11.4 FIFO, not LRU

Recency is determined by Invoke order, not by which slot was last thrown. Throwing D many times never promotes F. Only a new Invoke or a swap-reinvoke changes occupancy.

### 11.5 Naming in this milestone

Until the spell catalogue lands, bind each multiset to a stub: `spell-qqq`, `spell-qqw`, `spell-qwe`, `spell-www`, `spell-wwe`, `spell-wee`, `spell-eee`, `spell-eeq`, `spell-eqq`, `spell-qww`. Each stub should log, flash a colour-coded glyph, and apply a harmless placeholder so QA can verify compose, shift, evict, and swap.

> **Amendment 2026-09-20:** the names above are how QA refers to a multiset, not definition ids. An id never renames once shipped, and a rename would invalidate every replay recorded before it, so a stub definition carries the final id of the spell its recipe composes, `hoarfrost` for QQQ and so on, with a placeholder effect list until the catalogue fills it in. The recipe-to-name table is in [Spells and attack](../features/spells-and-attack.md).

---

## 12. Cooldown Pipeline

There is no global cooldown. Each ability id has its own clock.

\[
\mathrm{CD}_{final} = (\mathrm{CD}_{base} - \sum \mathrm{flat}) \times \prod_i (1 - \mathrm{pct}_i) - \sum \mathrm{current\_flat}
\]

- Invoke’s 0.3 s per orb level is a flat reduction on the composer only.
- Whorl instance CDR is a percentage source. It is snapshotted when the ability starts its cooldown, not live-updated every time the orb buffer changes.
- Percentage CDR does not rewrite a clock that already started.
- Leveling an ability does not rewrite an already running clock.
- Cooldown begins after cast point. Instant orbs never start a clock.
- Hidden clocks on evicted prepared spells continue to tick.

---

## 13. Animation, Cast Point, and Cancellation

Attack: 0.4 s point, 0.7 s backswing, 1.7 s base attack time, projectile 900. Backswing is cancelable by a new move, stop, or cast.

> **Amendment 2026-09-21:** an attack point or a cast point is cancelable the same way. A new move, attack, or cast issued during the point cancels it with nothing spent and no clock started, and lands as the order on that tick; nothing is queued for after the point. This is the source game's behaviour and the one kiting depends on.

Once a targeted spell’s cast point has elapsed, the spell is committed: mana is spent and cooldown starts even if the player slams S afterward.

Orbs and Invoke have zero point and zero backswing, so they never lock locomotion. Players can weave QWE while walking.

Targeted D/F stubs in this milestone should use a short cast point (0.05–0.3 s) so programmers feel the facing gate. Final values belong to the excluded spell list.

---

## 14. Tick Model for a Web Single-Player Runtime

This product is local. There is no remote peer, no server reconciliation, and no reason to run client-side prediction against an authority that lives on another machine. There is still a fixed simulation tick, because turn rate, cast points, and cooldowns are time values, not frame counts.

### 14.1 Clock

- Simulation tick: 30 Hz (\(\Delta t = 1/30\) s). Render may run at display refresh and interpolate pose.
- Do not step gameplay with raw `requestAnimationFrame` delta. A 144 Hz display must not make the hero turn three times faster than a 60 Hz display.
- Accumulate unused render time and consume it in 1/30 s chunks. Cap catch-up (for example 3 ticks per frame) so a tab-resume does not dump two seconds of orbs at once.
- Cooldowns, turn integration, and movement all read the same simulation clock.

### 14.2 Input sampling

Browser input arrives as DOM events, not as a gamepad poll. Bind `keydown` / `keyup` / pointer events to an input buffer consumed at the start of each sim tick.

- A key held across several ticks does not repeat Q, W, E, or R. Those are edge-triggered. Repeat would flood the orb buffer.
- If several ability keydowns land in the same tick, apply them in timestamp order, then by default priority Q, W, E, R, D, F on ties.
- Pointer world-picks use the camera ray at event time, stored on the command, so a camera pan during the same tick cannot retarget the click.
- Targeting mode is UI state. It can update the reticle every render frame. The spell does not commit until the sim tick that sees the confirming left click.

### 14.3 Authority

The local simulation is authoritative. HUD, floating orbs, and slot icons are views of that simulation, not a second copy of the rules. After each tick the view reads: facing, position, orb list, D identity, F identity, remaining clocks.

Do not implement a network prediction layer “for later multiplayer”. It will fight the turn-rate feel and is out of scope.

### 14.4 Tabbing out and frame spikes

When the document is hidden, pause the simulation clock or keep consuming ticks with input ignored. On resume, do not replay buffered keydowns that occurred while hidden. Cooldowns may either freeze with the pause or keep elapsing; freeze is the clearer single-player default. Decided 2026-09-19 ([ADR 0002](../../adr/0002-custom-fixed-step-simulation.md)): pause the clock, freeze cooldowns, discard input received while hidden, cap catch-up at 3 ticks per render frame.

---

## 15. Player-Facing Feel Requirements

Thirteen things a person checks by hand in the arena, with the game running under `pnpm dev`. Each row says what to do, what you should see, and what counts as a fail. Where the exact number is beyond what an eye can judge, the row says which acceptance test in section 16 proves it; the walk-through checks only what is visible. Any fail fails the build.

Six rows need the developer panel: row 3 a spawned unit, rows 8 to 11 every orb at level one or more, which only the panel's orb-level control can give a fresh hero, and row 12 the tunable sliders and the overlays. Until the panel exists, record them as waiting on it, not as pass. The panel's facing overlay and its pause and single-step also make rows 1 and 2 sharper once they exist; until then, judge those by eye.

| | Do | You should see | Fail if |
| --- | --- | --- | --- |
| 1 | Right-click a point directly behind the hero | The hero pivots on the spot until it faces the point, then starts walking | The hero slides, curves, or walks off while still visibly facing away from where it is going. The exact threshold, walking begins within 11.5° of the direction of travel, is AT-M2's to prove |
| 2 | Same click as row 1 | The turn is a visible rotation over a few frames, about a sixth of a second | The hero snaps to face the point instantly. The exact tick count is AT-M2's to prove |
| 3 | Needs the panel. Spawn a unit from it, then right-click the empty ground beside the unit | The hero walks to the ground point and ignores the unit | The hero attacks the unit, or walks to it instead of the point |
| 4 | Right-click the hero itself, the one unit that is not an enemy | Nothing happens; the hero stands or keeps its current order | The hero starts following or walking to the clicked unit |
| 5 | Hold Shift and right-click two different ground points | Each click is an ordinary move, as if Shift were not held: the hero heads for the first point, then abandons it for the second | The hero walks to the first point and then on to the second |
| 6 | With a targeted spell in D, press D and then press Esc | The targeting cursor opens on the key, nothing fires, and Esc closes it with no mana spent and no cooldown started | The spell fires on the key press, before any left click |
| 7 | Press Q, W, or E with the mouse anywhere | The orb square lights on the key alone | A click is needed before the orb counts |
| 8 | Needs the panel: set every orb to level 1 first. Press Q, Q, Q, then W | The three orb squares read Q, Q, W in age order: the oldest Q is gone | The fourth press is ignored, or a fourth orb appears |
| 9 | Needs the panel: orbs at level 1. Buffer Q, Q, W and press R; note the spell in D. Then buffer W, Q, Q and press R | D holds the same spell as before; the order of the presses does not matter | A different spell appears, or the slots change |
| 10 | Needs the panel: orbs at level 1. Invoke three different spells in a row, then throw D | Only D and F ever hold a spell, the oldest leaving when the third arrives; throwing D starts D's cooldown sweep and F's square stays ready | A third prepared square appears, or F's square shows a cooldown when D was thrown |
| 11 | Needs the panel: orbs at level 1. Buffer three orbs and press R, then press D | R puts the spell into D and fires nothing; D throws it | Pressing R fires the spell, or D composes one |
| 12 | Needs the panel. Open its tunables and find the collision, bound, and selection radii, then turn the collision and bound overlays on | Three separate sliders, and two circles of different sizes around the hero | One slider stands for all three, or the two circles are always the same size |
| 13 | If a 144 Hz monitor is at hand, do row 2 on it and on a 60 Hz one | The about-face takes the same time on both | The turn is faster on the faster monitor. Without two monitors this row is AT-M3's to prove, which runs the same turn at both rates |

---

## 16. Acceptance Tests

### 16.1 Locomotion

- **AT-M1.** From facing +X, right-click a point at +X. First translation occurs on the same tick as the order.
- **AT-M2.** From facing +X, right-click a point at −X. No translation for ≈0.16 s; yaw follows shortest arc; translation begins once bearing ≤ 11.5°.
- **AT-M3.** Measure 280 units of travel on a straight unobstructed path in 1.00 s ± 1% with no modifiers, at both 60 Hz and 144 Hz display refresh.
- **AT-M4.** Three Whorl instances at Whorl level 1 produce +1.8% MS (three × 0.6%), i.e. 285.04 before clamps.
- **AT-M5.** Two heroes cannot rest with centers 40 units apart; they can at 54+.

### 16.2 Commands

- **AT-C1.** Right-click ground, then right-click a different ground point before arrival. The first destination is abandoned.
- **AT-C2.** Shift plus two ground clicks does not produce two waypoints.
- **AT-C3.** Right-click an allied unit does not start follow.
- **AT-C4.** S clears a move and cancels targeting mode.
- **AT-C5.** Opening targeting mode for D does not stop an existing move. Esc leaves the move running.

### 16.3 Orbs

- **AT-O1.** Q, Q, Q → buffer QQQ. Fourth Q leaves QQQ (evict Q, push Q).
- **AT-O2.** Q, Q, W, E → buffer QWE.
- **AT-O3.** Orb press during a move does not stop the move.
- **AT-O4.** Orb press during a channel aborts the channel.
- **AT-O5.** Holding Q does not fill three Quartz. Only edges count.

### 16.4 Invoke and slots

- **AT-I1.** Buffer QWE, press R → D = `spell-qwe`, F empty.
- **AT-I2.** Then buffer QQQ, press R → D = `spell-qqq`, F = `spell-qwe`.
- **AT-I3.** Then buffer WWW, press R → D = `spell-www`, F = `spell-qqq`, `spell-qwe` evicted.
- **AT-I4.** Buffer QQQ, press R while D is already `spell-qqq` → no mana spend, no composer CD, slots unchanged.
- **AT-I5.** Buffer QQQ, press R while F is `spell-qqq` and D is `spell-www` → slots swap, no mana, no composer CD.
- **AT-I6.** Evicted `spell-qwe`, later re-invoked while its stub CD still running, returns with remaining CD.
- **AT-I7.** Pressing D casts only D’s identity and does not start F’s clock.
- **AT-I8.** A point-target stub on D: press D, move the cursor, press Esc. No mana, no CD, no projectile.
- **AT-I9.** A point-target stub on D: press D, left-click ground. Cast starts only after facing the point.

---

## 17. Parameters to Expose

Do not bury these in code. Designers will retune these.

| Parameter | Default | Why exposed |
|---|---|---|
| `base_ms` | 280 | Patch-sensitive |
| `turn_rate_T` | 0.6 | Feel of every kite |
| `turn_ramp_ticks` | 3 | Undocumented in the source game |
| `action_cone_deg` | 11.5 | Source constant |
| `collision_radius` | 27 | Body blocking |
| `bound_radius` | 24 | Range buffer |
| `sim_hz` | 30 | Decouple from display refresh |
| `orb_capacity` | 3 | Defines the hero |
| `prepared_slots` | 2 | D and F |
| `invoke_cd_base` | 7.0 | Composer pacing |
| `invoke_cd_per_orb_level` | 0.3 | Composer pacing |
| `invoke_mana` | 7 | Composer tax |
| `whorl_ms_per_instance[]` | 0.6% × level | Stance feedback |
| `whorl_cdr_per_instance[]` | 1% × level | Section 12's percentage source; placeholder until a balance pass |

---

## 18. Suggested Document Map for Later Briefs

This file is only the control and locomotion layer. Later briefs, not amendments that smuggle spells into this one:

- Prepared-spell catalogue (the excluded ten identities).
- Disable matrix (what silence, stun, and similar states do to Q/W/E versus R versus D/F): the [disable matrix](./disable-matrix.md).
- Animation set and orb VFX readability standard for a web renderer.
- Encounter scripting that assumes this control surface.

---

## 19. Resolved Conflicts

Open points settled during the design of this brief:

- Base MS 285 versus 280 across sources. **Resolution: 280.**
- \(t_{180}\) at \(T = 0.6\) equals 0.157 s by formula versus 0.175 s in some tables. **Resolution: formula plus optional ramp.**
- “Max 3 instances per orb” wording in some extracts versus the live 3-total buffer. **Resolution: 3 total.**
- Whether swap-only Invoke starts composer cooldown. **Resolution: it does not.**

Product deviations, restated so they are not treated as omissions by accident: normal cast only; no follow; no hold; no shift-queue; local single-player simulation rather than a networked client.

---

## 20. One-Page Control Summary

Left click selects and, in targeting mode, confirms a target. Right click on ground moves. Right click on an enemy attacks. There is no follow, no hold, and no queued waypoints. A-click then left-click attack-moves. S stops and cancels targeting. Targeted spells always wait for that second click.

Q, W, and E each push one element into a three-deep FIFO. Overflow drops the oldest. The three tokens are a visible stance and the only input to the composer.

R hashes the multiset and writes that stub into D, shifting the old D to F and evicting the old F. Re-hashing a stub already on F swaps the two keys for free. D and F throw. R never throws.

The body is a 27-radius disc that yaws at \(T = 0.6\) rad / 0.03 s and refuses to walk or fire a targeted action until the target sits inside an 11.5° forward cone. It does not change facing in a single frame when ordered to the opposite hemisphere. Simulation runs at 30 Hz on a local web clock so that turn time is independent of display refresh. That constraint, plus the compose/throw split, is the player control model.

---

## Related documentation

- [Controls and orders](../features/controls-and-orders.md) — the player-facing summary of sections 4, 5, and 15
- [Orbs and Invoke](../features/orbs-and-invoke.md) — the player-facing summary of sections 9 to 12
- [Movement, collision, and pathing](../../architecture/movement-collision-pathing.md) — where sections 6 to 8 are implemented
- [Simulation loop](../../architecture/simulation-loop.md) — where section 14 is implemented
- [ADR 0002 — Custom fixed-step simulation](../../adr/0002-custom-fixed-step-simulation.md) — the decisions behind the amendments
