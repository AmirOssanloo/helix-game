# Spell catalogue

> **Entry point:** [Product](../README.md)

**Skein — The ten spells as data, and the pieces the cast pipeline needs to cast them**

| Field | Value |
|---|---|
| Document type | Content specification |
| Audience | Gameplay programming, combat design |
| Product context | Single-player. No allies, no fog of war, no team vision |
| Classification | The ten hero spells and the statuses they apply. The control model, the orb buffer, Invoke, and the slots are the [mechanics spec](./character-movement-and-mechanics.md) |
| Simulation | 30 Hz tick. Every duration here is seconds and becomes whole ticks at load |
| Reference | The source game at patch 7.35 where a spell has a direct counterpart, adapted where an entry says so |

---

## 1. Purpose

This page fixes the ten spells as data before any is built: what each one asks the cast pipeline for, in the fields its definition file carries, and which pieces the pipeline must have so that every spell is a definition plus at most one bespoke function. [Section 7](#7-the-pieces-the-pipeline-needs) is the list of those pieces, and it is what the definition schemas, the effect primitives, the zone, the summon, and the status definitions are built to.

Every number is a starting value. The definition file owns it once the file exists, and the file wins when this page disagrees: spells under `src/content/spells/`, statuses under `src/content/statuses/`, the summon under `src/content/summons/`. The tuning surface changes any of them at no code cost. What this page owns is the shape: which effects a spell lists, which orb scales which number, and which capability a status needs.

---

## 2. How to read a spell entry

### 2.1 The fields

Every spell carries the same fields, and a field a spell does not use holds its neutral value rather than being left out.

| Field | Meaning |
|---|---|
| Id | The snake_case string every command, event, and log line uses. It never renames |
| Recipe | The three orbs that compose it. Order is irrelevant; the composer counts |
| Targeting | None, unit, point, or direction ([section 2.4](#24-the-cast-context)) |
| Cast point | The hold before commit. Cancelled at no cost by a stop, a new order, a stun, or death |
| Backswing | The hold after commit. A new order cancels it; the cast already landed |
| Cast range | World units, for unit and point spells. Zero for none and direction |
| Cooldown | A table by level, seconds, started at commit |
| Mana | A table by level, refused at key-down when short |
| Effects | The list the pipeline runs at commit, in order |
| Preview | The shape the targeting cursor draws, or none |
| Frame and tint | The atlas frame the spell's presence in the world is drawn with, and its colour on the D and F squares, on its zone, and on its preview |

### 2.2 Level tables

A level table is seven values, one per orb level from 1 to 7, and it names the orb whose level indexes it. This page writes one as `Quartz [3, 3.5, 4, 4.5, 5, 5.5, 6]`. The pipeline snapshots the hero's three orb levels at commit, and every effect, zone, summon, and status that came from that cast reads those levels, never the hero's current ones.

Cooldown and mana are indexed differently: by the **lowest level among the orbs in the recipe**. Hoarfrost reads Quartz. Clarion, with all three orbs, reads whichever is lowest, so a spell whose weak half barely acts pays the weak half's price. An orb level is monotone, so no arithmetic is needed and the three-orb spell scales last.

A number written without an orb is the same at every level.

### 2.3 Units and rounding

Seconds, world units, world units per second, degrees, fractions of one for percentages, and damage in points before mitigation. The registry converts to ticks and radians once at load, rounding to whole ticks. Every duration on this page is a whole number of ticks at 30 Hz except the 0.05 s cast point, which rounds to 2 ticks.

### 2.4 The cast context

Every effect runs with the same context: the caster, the definition, the three orb levels at commit, an anchor point with a facing, a target unit or none, the world, and the zone that ran it or none. Where the anchor and the target come from depends on what ran the effect.

| Run from | Anchor and facing | Target unit |
|---|---|---|
| A none spell | The hero, facing as it stands | The hero |
| A unit spell | The target's position; facing from the hero to it | The target |
| A point spell | The click; facing from the hero to the click | None |
| A direction spell | The hero; facing toward the click | None |
| A zone's activation list or each-tick list | The zone's position and facing | Each enemy inside the zone, in turn |
| A status hook or expiry list | The holder's position | The unit that took the damage, or the holder on expiry |

A direction spell turns the hero toward the click, commits, and is never out of range. A unit or point spell out of range walks toward its target first, as the [ability pipeline](../../architecture/ability-pipeline.md) says.

An effect's `target` says whom it touches: `target` is the context's target unit, `zone` is every unit inside the zone that runs it, and a shape is every unit inside that shape at the anchor. A shape or a zone collects units hostile to the caster only. For the hero that means enemies, never a summon, and never the hero, so friendly fire does not exist. An enemy casting through the same pipeline collects the hero and its summons.

### 2.5 Shapes

Three shapes, each placed at the anchor and turned to the facing.

| Shape | Parameters | Drawn with |
|---|---|---|
| Circle | Radius | `disc`, `ring_thin`, or `ring_thick`, scaled to the radius |
| Rectangle | Length along the facing, width across it, centred on the anchor | `square` or `square_outline`, scaled and rotated |
| Cone | Full angle in degrees and length, apex at the anchor | A cone frame baked per angle |

---

## 3. The ten spells

The table is the whole catalogue at a glance; the entries below hold the effect lists.

| Recipe | Spell | Targeting | Cast point | Range | Cooldown 1 → 7 | Mana 1 → 7 | Effects | Bespoke |
|---|---|---|---|---|---|---|---|---|
| QQQ | Hoarfrost | Unit | 0.05 | 1000 | 20 → 14 | 100 → 130 | Apply status | none |
| QQW | Wane | None | 0.05 | 0 | 35 → 23 | 200 → 230 | Apply status, spawn zone | none |
| QQE | Glacier | Direction | 0.1 | 0 | 25 → 19 | 175 → 205 | Named | `glacier_place` |
| WWW | Siphon | Point | 0.1 | 950 | 30 → 18 | 125 → 155 | Spawn zone | `siphon_burn` |
| WWQ | Updraft | Direction | 0.1 | 0 | 30 → 18 | 150 → 180 | Spawn zone | `updraft_carry` |
| WWE | Quicken | None | 0.05 | 0 | 15 → 9 | 45 → 75 | Apply status | none |
| EEE | Zenith | Point | 0.1 | 1200 | 25 → 19 | 175 → 205 | Spawn zone | none |
| EEQ | Emberling | None | 0.05 | 0 | 30 → 18 | 75 → 105 | Spawn unit | none |
| EEW | Bolide | Point | 0.1 | 700 | 55 → 31 | 200 → 230 | Spawn zone | none |
| QWE | Clarion | Direction | 0.1 | 0 | 40 → 22 | 300 → 330 | Damage area, displace, apply status | none |

Every backswing is 0.1 s. Every cooldown table falls by the same step each level and every mana table rises by 5 per level; the full tables are in each entry.

### 3.1 Hoarfrost — QQQ

A status on one enemy. Every hit it takes while the status lasts also stuns it briefly and deals bonus damage.

| Field | Value |
|---|---|
| Id | `hoarfrost` |
| Targeting | Unit, an enemy |
| Cast point · backswing | 0.05 s · 0.1 s |
| Cast range | 1000 |
| Cooldown | Quartz [20, 19, 18, 17, 16, 15, 14] s |
| Mana | Quartz [100, 105, 110, 115, 120, 125, 130] |
| Preview | A ring on the unit under the pointer, `ring_thick` |
| Frame · tint | `disc` · `0x9be7ff` |

**Effects:**

1. Apply status — target `target`; status `hoarfrost`; seconds Quartz [3, 3.5, 4, 4.5, 5, 5.5, 6].

**Statuses:** `hoarfrost` ([section 4](#4-the-statuses-the-spells-apply)). Its damage-taken hook fires at most once per 0.8 s, and each time applies `stun` for 0.4 s and magical damage Quartz [8, 16, 24, 32, 40, 48, 56] to the holder.

**Edges:** the bonus damage runs no hook, so Hoarfrost never triggers itself. The duration keeps counting while the unit is lifted. The target dying during the cast point cancels the cast at no cost.

### 3.2 Wane — QQW

The hero drops out of enemy aggro and is slowed. Enemies near the hero are slowed too.

| Field | Value |
|---|---|
| Id | `wane` |
| Targeting | None |
| Cast point · backswing | 0.05 s · 0.1 s |
| Cast range | 0 |
| Cooldown | Quartz or Whorl, whichever is lower, [35, 33, 31, 29, 27, 25, 23] s |
| Mana | Same index, [200, 205, 210, 215, 220, 225, 230] |
| Preview | None |
| Frame · tint | `ring_thin` · `0xc9d6ff` |

**Effects:**

1. Apply status — target `target`, which is the hero; status `wane`; seconds Quartz [4, 5, 6, 7, 8, 9, 10].
2. Spawn zone — circle, radius 400; anchored to the hero, so it moves with the hero; delay 0; lifetime Quartz [4, 5, 6, 7, 8, 9, 10]; still. Each tick: apply status — target `zone`; status `wane_chill`; seconds 0.5.

**Statuses:** `wane` sets the aggro-hidden flag and slows the hero by Whorl [0.30, 0.25, 0.20, 0.15, 0.10, 0.05, 0] of movement speed. `wane_chill` slows an enemy by Quartz [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50], and because it is reapplied every tick inside the circle it lasts 0.5 s after the enemy leaves.

**Adapted:** there is nothing to be invisible from, so Wane hides the hero from aggro by sight and drops existing aggro; what an enemy does with damage taken from a hidden hero is the aggro behaviour's rule on the [enemies page](../features/enemies.md). The source's speed bonus at high Whorl is dropped so Wane never outruns a walk; Whorl 7 only removes the slow. A move in progress continues; Wane has no target and stops nothing.

### 3.3 Glacier — QQE

A line of wall segments placed in front of the hero, across the cast direction. Enemies inside a segment are heavily slowed and burn.

| Field | Value |
|---|---|
| Id | `glacier` |
| Targeting | Direction |
| Cast point · backswing | 0.1 s · 0.1 s |
| Cast range | 0 |
| Cooldown | Quartz or Ember, whichever is lower, [25, 24, 23, 22, 21, 20, 19] s |
| Mana | Same index, [175, 180, 185, 190, 195, 200, 205] |
| Preview | A rectangle 1120 across and 80 deep, its centre 200 in front of the hero, turning with the pointer; `square_outline` |
| Frame · tint | `square` · `0x6fb7ff` |

**Effects:**

1. Named `glacier_place` — segments 7; spacing 160; distance 200 in front of the anchor. Each segment is a zone: rectangle 160 across the cast direction and 80 along it; anchored at the segment's centre; delay 0; lifetime Quartz [3, 4.5, 6, 7.5, 9, 10.5, 12]; still. Each tick: apply status — target `zone`; status `glacier_chill`; seconds 1.

**Statuses:** `glacier_chill` slows by Quartz [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80] and deals magical damage per second Ember [6, 12, 18, 24, 30, 36, 42]. It lasts 1 s after the enemy leaves the segment.

**Why bespoke:** a row of zones laid out from the hero's facing is not one shape. The named effect computes seven anchors and spawns the same zone at each; nothing else about it is special.

**Adapted:** the source places its wall from the caster's facing with no click; Helix reads the direction from the click so the player aims it. Segments block nothing, since the walkability grid is static; they slow and burn. A slow below the minimum speed clamps at 100, as the [status page](../features/status-effects.md) says.

### 3.4 Siphon — WWW

A zone that charges, then burns mana from every enemy inside and deals damage for the mana burned.

| Field | Value |
|---|---|
| Id | `siphon` |
| Targeting | Point |
| Cast point · backswing | 0.1 s · 0.1 s |
| Cast range | 950 |
| Cooldown | Whorl [30, 28, 26, 24, 22, 20, 18] s |
| Mana | Whorl [125, 130, 135, 140, 145, 150, 155] |
| Preview | A circle of radius 500 under the pointer, `ring_thin` |
| Frame · tint | `ring_thin` · `0xb388ff` |

**Effects:**

1. Spawn zone — circle, radius 500; anchored at the click; delay 2.9 s; lifetime 0, so it expires on the tick it activates; still. On activation: named `siphon_burn` — burn Whorl [100, 175, 250, 325, 400, 475, 550] mana from each enemy in the zone, at most what it has, and deal magical damage of 0.5 per point burned.

**Statuses:** none.

**Adapted:** the source returns some of the burned mana to the caster; Helix does not. An enemy with no mana takes no damage. Every enemy definition carries mana and mana regeneration so there is something to burn, and the training dummy has some. On empty ground the zone resolves on nothing; mana and cooldown were spent at commit.

### 3.5 Updraft — WWQ

A zone that travels in a line from the hero, lifting every enemy it touches, carrying it along, then dropping it with damage.

| Field | Value |
|---|---|
| Id | `updraft` |
| Targeting | Direction |
| Cast point · backswing | 0.1 s · 0.1 s |
| Cast range | 0 |
| Cooldown | Whorl or Quartz, whichever is lower, [30, 28, 26, 24, 22, 20, 18] s |
| Mana | Same index, [150, 155, 160, 165, 170, 175, 180] |
| Preview | A rectangle from the hero along the pointer, length Whorl [800, 1000, 1200, 1400, 1600, 1800, 2000] and width 400; `square_outline` |
| Frame · tint | `disc` · `0xd7b3ff` |

**Effects:**

1. Spawn zone — circle, radius 200; anchored at the hero; delay 0; motion: a line along the facing at 1000 per second for Whorl [800, 1000, 1200, 1400, 1600, 1800, 2000]; lifetime: the motion, so the zone expires when the distance is covered. Each tick: named `updraft_carry` — lift seconds Quartz [0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.6].

**Statuses:** `updraft_lift` sets the lifted, stunned, and untargetable flags, suspends the unit's order, and on expiry drops the unit where it is, resumes the order, and deals magical damage Whorl [70, 100, 130, 160, 190, 220, 250] to it.

**What `updraft_carry` does:** each tick, every enemy inside the zone that is not on the zone's hit list is lifted for the lift seconds and added to the list, so nothing is lifted twice by one updraft. Every unit on the list that is still lifted moves with the zone. When the zone expires, the units it carried stay lifted where it left them until their own lift ends. The drop and its damage are the status's expiry, so they happen on time whether or not the zone still exists.

**Edges:** a lifted unit cannot be hit by a projectile or a shape. Hoarfrost and every other status on it keep counting. A rooted unit is lifted, dropped where the updraft leaves it, and root keeps counting. A second updraft ignores a unit already lifted.

**Adapted:** the source aims at a point in range; Helix reads only the direction, so the funnel always launches. Enemies only.

### 3.6 Quicken — WWE

A self buff: bonus attack speed and attack damage for the duration.

| Field | Value |
|---|---|
| Id | `quicken` |
| Targeting | None |
| Cast point · backswing | 0.05 s · 0.1 s |
| Cast range | 0 |
| Cooldown | Whorl or Ember, whichever is lower, [15, 14, 13, 12, 11, 10, 9] s |
| Mana | Same index, [45, 50, 55, 60, 65, 70, 75] |
| Preview | None |
| Frame · tint | `disc` · `0xff9de2` |

**Effects:**

1. Apply status — target `target`, which is the hero; status `quicken`; seconds 9.

**Statuses:** `quicken` adds attack speed Whorl [10, 25, 40, 55, 70, 85, 100] and attack damage Ember [12, 24, 36, 48, 60, 72, 84], both flat. A second cast refreshes the duration and never stacks.

**Adapted:** self only; there is no ally.

### 3.7 Zenith — EEE

A ground strike: after a delay, pure damage in a small circle, split among everything inside.

| Field | Value |
|---|---|
| Id | `zenith` |
| Targeting | Point |
| Cast point · backswing | 0.1 s · 0.1 s |
| Cast range | 1200 |
| Cooldown | Ember [25, 24, 23, 22, 21, 20, 19] s |
| Mana | Ember [175, 180, 185, 190, 195, 200, 205] |
| Preview | A circle of radius 175 under the pointer, `ring_thin` |
| Frame · tint | `ring_thick` · `0xffb347` |

**Effects:**

1. Spawn zone — circle, radius 175; anchored at the click; delay 1.7 s; lifetime 0; still. On activation: damage area — target `zone`; pure; Ember [100, 162, 225, 287, 350, 412, 475]; split evenly among the units hit.

**Statuses:** none.

**Adapted:** the source has global range; Helix gives it 1200, since the arena is 4000 across and a strike with no aim teaches nothing. The marker is drawn for the whole delay. Two units in the circle take half each; none, and the strike lands on nothing with the clock already running.

### 3.8 Emberling — EEQ

A summon beside the hero that follows it, attacks nearby enemies for its lifetime, and cannot be ordered.

| Field | Value |
|---|---|
| Id | `emberling` |
| Targeting | None |
| Cast point · backswing | 0.05 s · 0.1 s |
| Cast range | 0 |
| Cooldown | Ember or Quartz, whichever is lower, [30, 28, 26, 24, 22, 20, 18] s |
| Mana | Same index, [75, 80, 85, 90, 95, 100, 105] |
| Preview | None |
| Frame · tint | `disc` · `0xff7a45` |

**Effects:**

1. Spawn unit — unit `emberling`; count 1; offset 0 forward and 80 to the right of the hero's facing; lifetime Quartz [20, 30, 40, 50, 60, 70, 80]; bonuses: maximum health flat Quartz [0, 100, 200, 300, 400, 500, 600], attack damage flat Ember [0, 10, 20, 30, 40, 50, 60].

**Statuses:** none.

**The summon:** the `emberling` definition in [section 5](#5-the-emberling-summon) owns the body and the base numbers; the bonuses are modifier rows the spell writes on the summon when it spawns, so the definition and the spell each own their half.

**Adapted:** one summon at every level. It is an enemy target, follows the hero when idle, expires on its timer and on the same tick the hero dies, and can be neither selected nor ordered.

### 3.9 Bolide — EEW

A meteor lands after a delay and rolls in a line, damaging what it passes and leaving a burn on it.

| Field | Value |
|---|---|
| Id | `bolide` |
| Targeting | Point |
| Cast point · backswing | 0.1 s · 0.1 s |
| Cast range | 700 |
| Cooldown | Ember or Whorl, whichever is lower, [55, 51, 47, 43, 39, 35, 31] s |
| Mana | Same index, [200, 205, 210, 215, 220, 225, 230] |
| Preview | A circle of radius 200 under the pointer, `ring_thin` |
| Frame · tint | `disc` · `0xff5533` |

**Effects:**

1. Spawn zone — circle, radius 200; anchored at the click; delay 1.3 s; motion after the delay: a line along the facing, which runs from the hero through the click, at 300 per second for Whorl [500, 650, 800, 950, 1100, 1250, 1400]; lifetime: the motion. Each tick: damage area — target `zone`; magical; per second Ember [50, 75, 100, 125, 150, 175, 200]. Then apply status — target `zone`; status `burn`; seconds 3.

**Statuses:** `burn` deals magical damage per second Ember [10, 15, 20, 25, 30, 35, 40]. It is reapplied every tick of contact, so it lasts 3 s after the meteor passes.

**Adapted:** none. The marker is drawn during the fall. The roll line is not in the preview; only the landing circle is.

### 3.10 Clarion — QWE

A cone from the hero: damage, a push away from the hero, and a disarm on everything hit.

| Field | Value |
|---|---|
| Id | `clarion` |
| Targeting | Direction |
| Cast point · backswing | 0.1 s · 0.1 s |
| Cast range | 0 |
| Cooldown | The lowest of the three, [40, 37, 34, 31, 28, 25, 22] s |
| Mana | Same index, [300, 305, 310, 315, 320, 325, 330] |
| Preview | The cone on the hero, turning with the pointer; `cone_60` |
| Frame · tint | `cone_60` · `0xffe066` |

**Effects:**

1. Damage area — target: cone 60 degrees, length 900; magical; Quartz [40, 80, 120, 160, 200, 240, 280]; not split.
2. Displace — target: the same cone; push away from the hero; distance Whorl [100, 150, 200, 250, 300, 350, 400] over 0.3 s.
3. Apply status — target: the same cone; status `disarm`; seconds Ember [1, 1.5, 2, 2.5, 3, 3.5, 4].

**Statuses:** `disarm`, and `knockback` for the 0.3 s of the push.

**Edges:** the three entries run in order on the units in the cone on the commit tick; a push moves a unit over the following ticks, so a unit hit by the first entry is still there for the third. A push into an obstacle stops at its edge. Enemies only.

**Adapted:** the source's travelling wave is an instant cone. The push is away from the hero rather than along one line, so a unit at the cone's edge is thrown outward.

---

## 4. The statuses the spells apply

A status definition says what the status does; the applier says how long. A spell's apply-status entry, a hook, and the developer panel each give a duration, so one `stun` definition serves Hoarfrost's 0.4 s and an enemy's longer bash. Every table on a status definition names its orb, and the status entry snapshots the three orb levels at application. A status the developer panel or an enemy applies reads level 1.

| Status | Applied by | Flags | Modifiers and damage | Hook or expiry | Stack | Icon |
|---|---|---|---|---|---|---|
| `hoarfrost` | Hoarfrost | none | none | Damage taken, cooldown Quartz [0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8]: apply `stun` 0.4 s to the holder, then magical damage Quartz [8, 16, 24, 32, 40, 48, 56] to the holder | Refresh | `icon_hoarfrost` |
| `stun` | The Hoarfrost hook, the panel | stunned | none | none | Refresh, the longer remaining wins | `icon_stun` |
| `wane` | Wane | aggro hidden | Movement speed −Whorl [0.30, 0.25, 0.20, 0.15, 0.10, 0.05, 0] | none | Refresh | `icon_wane` |
| `wane_chill` | Wane's circle | none | Movement speed −Quartz [0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50] | none | Refresh | `icon_slow` |
| `glacier_chill` | Glacier's segments | none | Movement speed −Quartz [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80]; magical damage per second Ember [6, 12, 18, 24, 30, 36, 42] | none | Refresh | `icon_slow` |
| `updraft_lift` | Updraft's carry | lifted, stunned, untargetable | none | On expiry: magical damage Whorl [70, 100, 130, 160, 190, 220, 250] to the holder | Ignore | `icon_lift` |
| `quicken` | Quicken | none | Attack speed +Whorl [10, 25, 40, 55, 70, 85, 100]; attack damage +Ember [12, 24, 36, 48, 60, 72, 84] | none | Refresh | `icon_quicken` |
| `burn` | Bolide | none | Magical damage per second Ember [10, 15, 20, 25, 30, 35, 40] | none | Refresh | `icon_damage_over_time` |
| `disarm` | Clarion, the panel | disarmed | none | none | Refresh | `icon_disarm` |
| `knockback` | Clarion's push, the panel | displaced | none | none | Ignore | `icon_knockback` |

Damage per second is taken from health every tick, magical, credited to the unit that applied the status. The other four generic definitions, `silence`, `root`, `slow`, and `lift`, exist for the panel and for enemy abilities with flat tables; no hero spell applies them. `lift` sets the same flags as `updraft_lift` and has no expiry list.

---

## 5. The Emberling summon

An enemy-shaped definition under `src/content/summons/`, holding every field an [enemy definition](../features/enemies.md#what-a-definition-holds) holds. Health and attack damage are the level-1 values; the spell's bonuses add the rest.

| Field | Value |
|---|---|
| Id | `emberling` |
| Health · regeneration | 300 · 0 |
| Mana · regeneration | 0 · 0 |
| Armour · magic resistance | 0 · 0 |
| Movement speed · turn rate | 380 · the hero's 0.6 |
| Collision radius | 16 |
| Attack damage · range | 22 · 300 |
| Attack point · backswing · base attack time | 0.3 s · 0.4 s · 1.35 s |
| Projectile speed | 900 |
| Acquire radius | 600, the nearest enemy inside it |
| Follow distance | 250, beyond which it walks back to the hero |
| Experience · tier | 0 · normal |
| Abilities · behaviour | none · `summon_follow` |
| Frame · tint | `disc` · `0xbbbbbb`, hero white, dimmer |

The summon lives in the unit pool with an owner and a lifetime. It is hit by enemy abilities and by nothing of the hero's, and it takes statuses like any unit.

---

## 6. Atlas frames

Frames the ten spells and their statuses draw with. Every name is in the frame list under `src/content/atlas-frames.ts` or is added to it by the spell that needs it.

| Frame | Used by | Exists |
|---|---|---|
| `disc` | Hoarfrost, Updraft, Quicken, Emberling, Bolide, the summon | Yes |
| `ring_thin` | Wane's circle, Siphon, and every circle preview | Yes |
| `ring_thick` | Zenith's marker, the unit reticle | Yes |
| `square` | Glacier's segments | Yes |
| `square_outline` | The rectangle previews | Yes |
| `cone_60` | Clarion, its preview | New: a cone of 60 degrees, apex at the origin |
| `icon_hoarfrost`, `icon_wane`, `icon_quicken` | The three spell-specific status icons | New |
| `icon_stun`, `icon_slow`, `icon_damage_over_time`, `icon_lift`, `icon_disarm`, `icon_knockback` | The generic status icons the spells reuse | New, with `icon_silence` and `icon_root` beside them |

---

## 7. The pieces the pipeline needs

Everything the ten spells ask for, and nothing else. A piece with no user among the ten is named as such so it is not built early.

### 7.1 Primitives and their parameters

Every entry has a `kind`. A `target` is `target`, `zone`, or a shape from [section 2.5](#25-shapes). A table is a level table with its orb.

| Primitive | Parameters | Used by |
|---|---|---|
| Damage area | `target`; damage type physical, magical, or pure; `amount`, a table; `rate`, once or per second, per second being legal only in a zone's each-tick list and converted to per tick at load; `split`, whether the amount is divided evenly among the units hit | Zenith, Bolide, Clarion, the Hoarfrost hook |
| Apply status | `target`; the status id; `seconds`, a number or a table. Applying the same status every tick with a short duration is how a zone's slow lingers after a unit leaves | Hoarfrost, Wane, Glacier, Quicken, Bolide, Clarion, the Hoarfrost hook |
| Spawn zone | The shape; `anchor`, the context's anchor or the caster, a caster-anchored zone moving with the caster; `delaySeconds` before it activates; `lifetimeSeconds`, a number, a table, or the motion; `motion`, still or a line along the facing with a speed and a distance table; `onActivate`, an effect list run once when the delay ends; `eachTick`, an effect list run every tick while active; the frame and tint it is drawn with | Wane, Glacier through its named effect, Siphon, Updraft, Zenith, Bolide |
| Spawn unit | The summon definition id; `count`; `offset`, forward and right of the caster's facing; `lifetimeSeconds`, a table; `bonuses`, a list of stat and flat table written as modifier rows on the summon for its life | Emberling |
| Displace | `target`; `mode`, push or lift; for push, `direction`, away from the caster or along the facing, `distance`, a table, and `seconds`; for lift, the status it applies and `seconds`, a table. A push moves the unit through the movement step each tick so it stops at an obstacle edge, and applies `knockback` for its duration. A lift applies its status, suspends the order, and resumes it on expiry | Clarion pushes; `updraft_carry` lifts through the same function. Pull has no user and is not built until one exists |
| Spawn projectile | A speed, a radius, homing on the target or not, a maximum range, an on-hit effect list, a frame and tint | No spell. The auto-attack and the summon's attack fire one |
| Named | A key resolved from `src/domain/abilities/effects/`, and the effect's own fields, declared beside the function and validated by its schema | Glacier, Siphon, Updraft |

A zone keeps, besides what its entry says: the caster, the ability, the orb levels at commit, its position and facing, its start and end ticks, its travel vector, and a hit list for once-per-unit rules. A zone with a delay is drawn for the whole delay. A zone's each-tick list runs with the zone as context, so a primitive in it with `target: zone` touches every enemy inside and a named effect in it runs once per tick.

### 7.2 Named effects

Three functions, one file each under `src/domain/abilities/effects/`, each taking the world and the cast context and nothing else.

| Key | Fields | Does |
|---|---|---|
| `glacier_place` | `segments`, `spacing`, `distance`, and the segment zone as a spawn-zone entry | Computes `segments` anchors on a line across the facing, `distance` in front of the anchor, `spacing` apart and centred, and spawns the zone at each with the facing turned across the cast direction |
| `siphon_burn` | `burn`, a table; `damagePerMana` | For each enemy in the zone: takes the lesser of `burn` and the unit's mana, and deals that times `damagePerMana` as magical damage |
| `updraft_carry` | `liftSeconds`, a table; the lift status id | Runs each tick from the zone: lifts every enemy inside not yet on the hit list and records it; moves every recorded unit that is still lifted with the zone |

### 7.3 Status-definition capabilities

What a status definition must be able to say, each with the status that needs it first.

1. **Level tables that name their orb**, with the three orb levels snapshotted on the status entry at application. Every spell status; the panel applies at level 1.
2. **No duration of its own.** The applier gives the duration. Every status.
3. **Flags**: stunned, silenced, rooted, and disarmed exist; add **lifted**, **untargetable**, **aggro hidden**, and **displaced**. `updraft_lift`, `wane`, `knockback`.
4. **Stat modifiers as tables**, flat or a fraction: movement speed for `wane`, `wane_chill`, `glacier_chill`; attack speed and attack damage for `quicken`.
5. **Damage per second**, magical, taken every tick and credited to the applier. `glacier_chill`, `burn`.
6. **A damage-taken hook**: an internal cooldown table and an effect list run on the unit that took the damage, at most once per cooldown, with hook damage running no hooks. The list is the whole hook; it needs no key of its own. `hoarfrost`. The damage-dealt hook has the same shape and no user among the ten.
7. **An expiry effect list** run on the holder when the status ends. `updraft_lift`.
8. **A stack rule**: refresh, stack, or ignore. Every status; `updraft_lift` and `knockback` ignore.
9. **An icon frame.** Every status.

### 7.4 Other definition capabilities

- A spell's **preview**: none, a unit reticle, a circle with a radius, a rectangle with a length and width and an offset in front of the hero, or a cone with an angle and length. A rectangle's length may be a table, read at the hero's current level.
- **Mana and mana regeneration on every enemy definition**, neutral at zero, so Siphon has something to burn.
- **A summon definition kind**, enemy-shaped with a follow distance, under `src/content/summons/`, and modifier rows written on a summon at spawn as their own source kind.
- **A direction targeting kind** with no range, used by Glacier, Updraft, and Clarion.
- **Cooldown and mana indexed by the lowest orb level in the recipe.**

### 7.5 What the ten do not need

A projectile fired by a spell, a pull, a damage-dealt hook, a silence, a root, a status that stacks, a zone that runs an effect once per unit on contact other than through `updraft_carry`, and any number a system holds. Each waits for the first ability that needs it.

---

## Related documentation

- [Spells and attack](../features/spells-and-attack.md) — what each spell is for the player, and the edge cases every entry above inherits
- [Status effects](../features/status-effects.md) — the eight status kinds, the stack rules, and what each disable blocks
- [Ability pipeline](../../architecture/ability-pipeline.md) — the stages, the targeting kinds, and the primitives this page parameterises
- [Content authoring standards](../../standards/content-authoring.md) — how a definition file writes these numbers
- [Adding a spell](../../workflows/adding-a-spell.md) — the runbook that turns an entry here into a file and a test
