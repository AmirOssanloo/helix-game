# Sprint 29 — The playtest and the triage

**Phase:** 6 · **Sized days:** 1.5 in tickets, 2.5 of bucket appetite, committed on 2026-09-26 to T03 to T06, plus T07 and T08, 0.5 each, unplanned and approved by the maintainer the same day · **Buffer:** 1, taken whole by T07 and T08

## Goal

The maintainer plays the long road from the spawn to the last boss with the feedback key, the notes are triaged with the delivery strategist into tickets sized after triage, and the first of them are built.

## Playable outcome

The maintainer's session, saved whole, replays identically; every feedback note is a ticket, a Deferred row, an open question, or a recorded "no change".

---

## Tickets

### P6-S29-T01 — The playtest build and the maintainer's run

| Field | Value |
| --- | --- |
| Layer | app, tests, tooling |
| Size | 0.5 |
| Depends on | every ticket of sprints 25 to 28 |
| Status | done |

**Build:** The published playtest build boots on the long road; the panel's map list still reaches the arena. The engineer publishes it and opens a box under Waiting on a person. The maintainer plays from the spawn at level 1 to the last boss, in one sitting or several, with the panel closed but for jumping to a checkpoint after a break, and presses the feedback key whenever something feels wrong or right: the push in a choke (Q31), the early regions, each archetype, each spell. At the end, **Save input log** saves the whole session. The engineer stores the feedback files under `.claude/plan/implementation/notes/`, dated, and the whole session as `tests/simulation/replays/long-road-playtest.json` with a spec.

**Acceptance:**
- The maintainer reached the last boss from level 1 and filed feedback; the level at the last boss's kill is read from the log.
- The session replays identically, and every feedback file loads and stops at its tick on the playtest's commit.

**Tests:**
- `tests/simulation/replays/long-road-playtest.spec.ts`: two replays agree at every tick; the level at the last boss's death is read and recorded.

**Definition of done:** Every change.

Closed 2026-09-26 on what an agent can verify: a fresh session starts on `startingMap`, the long road, named in the maps index apart from the order of `maps`, because that order is part of the content version and reordering it refused every recorded log (Q67); the spec replays the session and every long-road feedback file under `notes/`, and is skipped with its owner and condition until the maintainer's log is saved. The maintainer's run, the files, and the level at the kill wait on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24, in STATUS.md.

> **Note, 2026-09-26, the first run:** the maintainer played seed 3727497116 to the last boss's kill on tick 13413 of 13691, at level 22, but could not pass the first three enemies without the panel: the log holds 19 `level_up`, `toggle_no_cooldowns`, `toggle_infinite_mana`, 5 `restore_mana`, and 2 `heal`. It cannot answer "about level 10 at the last boss by play", so the maintainer discarded it and it is not stored as `tests/simulation/replays/long-road-playtest.json`. No F9 file was filed; the notes came in chat and were triaged under T02. The first acceptance row waits on a clean run after P6-S30-T03, in STATUS.md.

> **Note, 2026-09-26, the clean run:** the maintainer played again on the build with P6-S29-T03 to T08 and P6-S30-T03 in the tree, content version `08d1c2e4`, seed 3742014961, a session of 13164 ticks, stored as `tests/simulation/replays/long-road-playtest.json`. `tests/simulation/replays/long-road-playtest.spec.ts` passes: two replays agree at every tick, and it prints "the last boss killed on tick 12961 at hero level 10". The panel commands in the log are 2 `heal` and 8 `restore_mana`; no `level_up`, no cooldown or mana toggle, so the level is the road's by play. Heal and restore add no experience and leave the level row standing, but the hero's survival leaned on them; the maintainer accepted that pending health and mana from loot, a row of [Deferred](../backlog/deferred.md). No F9 file was filed, so no feedback file loads at a tick and that half of the second row holds with nothing to load; the maintainer's feedback came in chat: "All of the feedback given feels much better now - I still needed to use heal and mana to finish the game but it is fine. Because later we will have loot that will drop health and mana." Both acceptance rows hold.

---

### P6-S29-T02 — Feedback triage

| Field | Value |
| --- | --- |
| Layer | docs (plan) |
| Size | 1 |
| Depends on | T01 |
| Status | done |

**Build:** The delivery strategist and the maintainer read each note at its tick, by loading its file, and give it one of five outcomes: a bug, a tuning change, a spell swap, a map edit, or no change; anything that asks for a new system goes to Deferred. Q31's share is settled from what the chokes felt like, and Q57 answered. Each accepted item is written as a ticket in this sprint or the next with the next free number and a note saying it came from triage, sized on the plan's scale, in [the bucket's order](./README.md#the-triage-bucket) until the appetite is spent. The rest goes to [Deferred](../backlog/deferred.md) or [Open questions](../backlog/open-questions.md). A dated triage note under `notes/` lists every feedback note and its outcome.

**Acceptance:**
- Every note has an outcome, and the tickets written add to no more than the four days of the bucket.
- A spell named for a swap has its replacement shaped in the spell catalogue, approved by the maintainer, before its ticket starts.

**Tests:** none.

**Definition of done:** Every change.

Closed 2026-09-26 on what an agent can verify: no feedback file exists yet, so [the triage note](../notes/2026-09-26-long-road-triage.md) lists no note, writes no ticket, and commits no day of the appetite, and carries Q57's final value and Q59 to Q67 to the triage with the steps for when the files arrive (Q68, provisional). The triage with the maintainer, the notes read at their ticks, and any spell swap's approval wait on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24, in STATUS.md.

> **Note, 2026-09-26, the triage:** held with the maintainer in chat on the five notes of the first run, each approved by the maintainer, in [the triage note](../notes/2026-09-26-long-road-triage.md): two bugs and three tuning or behaviour changes, written as T03 to T06 here and P6-S30-T03, 4 of the 4 days committed. No spell swap. The hero's side toward Diablo II curves went to [Deferred](../backlog/deferred.md). Q57's final value was not settled, since no clean choke was played; it waits on the clean run, with Q59 to Q67.

---

### The bucket — 2.5 days of appetite

Tickets P6-S29-T03 onward are written by T02. None exists before the triage, and none is invented to fill the appetite. An unspent day is recorded as unspent in the sprint exit.

Written 2026-09-26 from the triage with the maintainer, recorded in [the triage note](../notes/2026-09-26-long-road-triage.md): T03 to T06 spend the sprint's 2.5 days, and the enemy retune, sized 1.5, is P6-S30-T03 in sprint 30's bucket. The maintainer set the order: the whole swing first, then the bodies, the halts, the hit on a returning enemy, and the retune last, since the four before it change the pressure it is tuned against. Each of the five moves how enemies fight, so the maintainer's clean playtest runs again after P6-S30-T03.

> **Note, 2026-09-26:** T07, a cast does not cut a melee enemy's backswing short, sized 0.5, is unplanned work the T03 engineer found and the maintainer approved; it runs after T06 and before the retune, and takes the bucket to 4.5 of its 4 days, the half day over drawn on the buffer. Nothing is cut.

> **Note, 2026-09-26, Q71 answered:** T08, the tier damage multiplier, sized 0.5, is unplanned work from triage: the maintainer answered Q71 with a damage multiplier for elites and bosses and approved it as a ticket before the retune. It runs after T07 and before P6-S30-T03, which depends on it, and takes the bucket to 5 of its 4 days, the second half day over drawn on the rest of the buffer. Nothing is cut.

---

### P6-S29-T03 — A melee enemy finishes its whole swing before it moves

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 0.5 |
| Depends on | T02 |
| Status | done |

> **Note, 2026-09-26:** came from triage, a bug. The maintainer's note: "Enemies hit and run at the same time; impossible to kite." The suspected cause is in `fight()` in `src/domain/ai/machine.ts`: once the hero leaves reach, the unit re-enters Chase unless its order is in `attack_windup`, so the backswing is cancelled and the unit runs on the tick its hit lands.

**Build:** A melee enemy that begins a swing stands for the whole swing, attack point and backswing, before it moves again: in `fight()`, a melee unit whose order is in `attack_windup` or `attack_backswing` stays in Attack when the hero leaves reach, and re-enters Chase on the first tick after its backswing ends. What already interrupts a swing still does: a lost, dead, or hidden hero or a leash passed sends it to Return as today, and a stun or any disable the disable matrix names cancels it as today. A ranged unit that kites keeps its back-away rule, which leaves in its backswing on purpose. The [enemies](../../../../docs/product/features/enemies.md) page's Attack row and edge cases say a melee enemy finishes its backswing before it follows.

**Acceptance:**
- The failing test is written first and fails on the build as it stands: a melee grunt whose hit lands as the hero walks out of reach moves on that tick.
- With the fix, the grunt's position does not change from the tick its hit lands to the tick its backswing ends, and it chases from the tick after.
- A kiter, the skirmisher and the hexer, still backs away in its backswing; a stun in the backswing ends the swing as before.
- The stored logs replay: those whose specs read enemy positions or kills recorded again, the rest re-stamped. A number in section 5 of the enemy catalogue that moves with the recording moves on the page in the same change.
- `pnpm check` green, the budget project included.

**Tests:**
- `tests/simulation/ai/whole-swing.spec.ts`, new: a melee grunt and a brute each stand through point and backswing with the hero walking away, then chase; a skirmisher backs away in its backswing; a stun mid-backswing lets the unit act on the tick the stun ends, as today.
- `tests/simulation/ai/transitions.spec.ts`: the Attack to Chase case moved to the new rule.
- `tests/simulation/replays/balance.spec.ts`, `tests/simulation/boss-encounter.spec.ts`, `tests/simulation/corridor-200.spec.ts`: moved to the new logs where they read positions or kills.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

Built 2026-09-26. The cause was as suspected: in `fight()`, a unit out of reach re-entered Chase unless it was in `attack_windup`, and the chase's move order cancelled the backswing through the order state machine, which lets any new order cut a backswing short. The attack system itself never moves a unit in its backswing. The failing test came first: a grunt stood 4 of its 15 backswing ticks, and a brute 1. A melee unit now stays in Attack through its backswing; its attack order walks it at the hero on the tick the backswing ends, and the machine takes it into Chase on the tick after. `tests/simulation/corridor-200.spec.ts` read the corridor's column at the press's end, which fell from 18 to 8 on the same log, so the session was recorded again with its lift at tick 450, where the column is 20; every other bar in it holds unchanged. The balance, boss-encounter, and phase 1 logs replay unchanged, and no content moved, so none is re-stamped and section 5 of the enemy catalogue does not move. The docs-link check collapsed a run of spaces into one hyphen where GitHub gives one hyphen per space, so it refused the sprint's `T03 — …` anchors; it now slugs as GitHub does, and every existing link still resolves. Waits on a green `pnpm check`: all but the stress tier's wall-clock budget is green, and that fails the same way on the build before the change while another program holds the machine.

Closed 2026-09-26: `pnpm check` exit 0 on a quiet machine over T03 and T04 together, 3635 tests passed, 2 skipped, 1 todo, the stress tier included. The T03 engineer found that ability selection in `fight()` runs before the swing is held, so a melee elite, boss, or lancer can still cast in its backswing and a charge moves it; approved by the maintainer the same day as T07.

---

### P6-S29-T04 — Enemy bodies wider than they are drawn

| Field | Value |
| --- | --- |
| Layer | content, presentation, tests, docs |
| Size | 0.5 |
| Depends on | T03 |
| Status | done |

> **Note, 2026-09-26:** came from triage, a tuning change. The maintainer's note: "Enemies are too tight and sticky; the non-visual size should grow so they collide before visuals touch." It touches the push share, Q57 and Q59: wider discs press the hero and each other sooner, so the corridor's overlap bar is measured again here and neither question's value moves in this ticket.

> **Note, 2026-09-26, amended by the maintainer's decision:** the ticket was wrong on two counts. Units were drawn at their collision radius, not their bound radius, so a content-only change would have grown the drawings with the bodies; and the three pathing radius classes equal the enemies' collision radii, so the classes move with them. A walkability cell is open only where a disc of the class radius fits anywhere in it, so on cells of 32 the arena's 96-unit corridor is open to a radius of at most 32: a grunt-sized body of 35 could not path through it, and a hero class of 35 would have closed it to the hero. The maintainer chose classes of 20, 32, and 64, the grunt-sized bodies at 32, 1.33 times their bound radius and below the 1.4 floor, accepted as the widest a grunt-class body can be and still path through the arena's corridor; the hero's body stays at 27 and paths on the class of 32. Presentation draws every unit at its bound radius, the hero at 24. A runner no longer passes a grunt in the corridor, and two imps no longer stand beside their summoner there; both accepted.

**Build:** Every enemy definition's `body.collisionRadius` wider than its `boundRadius`, the drawn size: 14 to 20, 24 to 32, and 44 to 64, the imp and the training dummy included, with the radius classes at 20, 32, and 64. The bound radii do not move, so picking and melee reach do not either, since `isInAttackRange` in `src/domain/attack/attack.ts` measures reach edge to edge on the bound radii. The [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md)'s fields and entries, and [the long road spec](../../../../docs/product/specs/the-long-road.md)'s choke paragraph (a large unit is 64 in radius and has 96 units of play in the narrowest choke), say the new radii. Presentation draws a unit's body, its outline, and what stands above it at the bound radius.

**Acceptance:**
- Every enemy's collision radius lies between 1.33 and 1.5 times its bound radius, 1.4 to 1.5 for the small and large classes and 1.33 for the grunt-sized, and two enemies side by side separate before their drawn shapes touch.
- A melee enemy pressed against the hero at collision contact is still inside its reach, for every melee archetype.
- The long road's content tests hold: every choke open to all three radius classes, every pack placing clear of obstacles and checkpoints, no point waking more than the spec's bound.
- The corridor's overlap bar holds at the default share. If it does not, the ticket reports the largest radius ratio that holds it rather than loosening the bar, and the maintainer chooses, as P6-S25-T02 did.
- The stored logs recorded again where their specs read the crowd, the rest re-stamped; the stress tier green.

**Tests:**
- `tests/content/enemies.spec.ts`: the ratio bound per definition; melee contact inside reach per melee archetype.
- `tests/content/maps.spec.ts`: run again, unchanged, green.
- `tests/simulation/corridor-200.spec.ts`: the overlap bar and the carry bound at the default share on the recorded log.
- `tests/simulation/stress.spec.ts`: green under `pnpm test:budget`, the long-road case included.

**Definition of done:** Every change · A documentation change · Anything under `src/presentation`.

Built 2026-09-26, on the maintainer's radii. Small bodies 14 to 20, grunt-sized 24 to 32, large 44 to 64; the radius classes 20, 32, and 64. The body, the elite and boss outline, the status icons, the hit numbers, the checkpoint word, the orbs, and the debug state label are placed at the bound radius, the hero drawn at 24. `tests/content/enemies.spec.ts` holds the share per definition, every enemy on a class, and melee contact inside reach for every swinging archetype; `tests/content/maps.spec.ts` passes unchanged. The hero's class of 32 moves a click past a wall or the bounds 5 units further in, so `tests/simulation/at-commands.spec.ts` reads the class radius there. The six stored logs are re-stamped. The balance hero session moved: a hero standing against five grunts kills none at level 10, not one, and two at level 20, not three, and section 5 of the enemy catalogue says so. The corridor session was recorded again with its pack points moved: on the old ones, with bodies wider, the last grunt pack placed south of the lower block, out of aggro range of the hero, and never woke. The grunts now stand at `x` 2300 and the runners at 2420, from `y` 1520 every 80; of 54 layouts tried, this one alone met every bar in the spec unchanged, and its column at the press's end is 15, on the bar. On it the deepest press is 0.68 of a pair's summed radii against the bar of 0.75, the carry at no share is 0, the pile is under a world unit in 7 ticks of passes and touching in 32, and the two hundred are home by tick 851. Several of the other layouts left a pile that settled well past the bar, one not within 300 ticks, so the settling bars hold on this pile rather than on every pile wider bodies make. The hero is pushed out of the corridor's east end at the default share, as on the log before the change. `pnpm check` green, the stress tier included. The render benchmark rerun waits on a person, in [STATUS](../STATUS.md).

---

### P6-S29-T05 — Chasing enemies halt now and then

| Field | Value |
| --- | --- |
| Layer | shared, domain, content, tests, docs |
| Size | 1 |
| Depends on | T04, Q69 (answered: ADR 0010) |
| Status | done |

> **Note, 2026-09-26:** came from triage, a behaviour change. The maintainer's note: "Chasers should sporadically stop for a while like Diablo II, not a bee swarm." The bucket's rule sends a new system to Deferred; the maintainer ruled this in explicitly on 2026-09-26 as a change to the existing Chase state, not a new system, and overruled that rule for it. The triage put it at 0.75; sized 1 on the plan's scale, which has no 0.75, and because the draw needs the engineering architect's placement first (Q69). "Halt" is proposed as the word, since hold is the kiter's and the charger's, pause is the world's, and stop is an order.

**Build:** In `chase()` in `src/domain/ai/machine.ts`, at each re-path a unit that would walk draws once; with chance `chase_halt_chance` it halts instead, clearing its move order and standing for a halt drawn between half and all of `chase_halt_seconds`, converted to ticks once, held as a tick on the AI record. A halt replaces only the walk: while halted, a lost, dead, or hidden hero or a leash passed still sends the unit to Return, a cast of its own runs, an ability the selection rule takes is cast, and a hero in reach turns it to Attack, which ends the halt. The draw is per unit and deterministic from the run's seed, placed as Q69 decided in [ADR 0010](../../../../docs/adr/0010-a-rules-random-draw-is-a-keyed-hash.md), so a replay holds and a pack's members halt on their own draws rather than together: an integer hash of four integers in `src/shared/hash.ts`, exported through `src/shared/public.ts`, with no game knowledge and a result below 2^24; and the keyed draw in `src/domain/random/keyed-draw.ts`, domain-internal, which hashes `world.run.random.seed`, a key, `world.tick`, and a purpose from the one `DRAW_PURPOSE` list beside it, writes nothing, and returns that integer. The halt keys on the unit's id and takes two purposes, one for whether it halts and one for its length; `chase()` compares and scales the integer with local arithmetic, so no fraction crosses a call. `src/simulation/random.ts` is not touched and nothing advances its stream. Both tunables in `src/content/tuning.ts` at Q70's defaults, retuned from the panel through `set_tuning` on the next tick. Nothing allocates. The [enemies](../../../../docs/product/features/enemies.md) page's Chase row and the [vocabulary](../../../../docs/product/vocabulary.md) state the halt.

**Acceptance:**
- At a chance of 0, every unit chases exactly as it does today, to the bit.
- At the default, a pack of five chasing a hero who walks away for thirty seconds halts, each member on its own ticks, and on no tick do all five halt together.
- A halted unit with the hero in reach attacks on that tick; one past its leash turns for home on that tick.
- Two runs from one seed and one log agree at every tick; a retune from the panel lands in the log and applies on the next tick.
- The stored logs recorded again where their specs read positions or kills, the rest re-stamped; the stress tier green with no allocation in the chase.

**Tests:**
- `tests/simulation/ai/chase-halts.spec.ts`, new: a chance of 0 matches today; the pack of five halts apart; a halt broken by reach and by the leash; two runs agree; the halt length inside its bounds.
- `tests/shared/hash.spec.ts`, new: the same inputs give the same integer; every result is an integer in [0, 2^24); inputs differing in one argument give different results across a sample.
- `tests/domain/random/keyed-draw.spec.ts`, new: the draw is a function of the seed, the key, the tick, and the purpose; it leaves `world.run.random` unchanged; the `DRAW_PURPOSE` values are distinct.
- `tests/simulation/tuning.spec.ts`: both tunables retune on the next tick and land in the log.
- `tests/simulation/stress.spec.ts`: green, allocation-free.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

Built 2026-09-26. `hash4` in `src/shared/hash.ts` is murmur3's 32-bit mixing over four integers, keeping the top 24 bits. `keyedDraw` in `src/domain/random/keyed-draw.ts` hashes the run's seed, a key, the tick, and a purpose from `DRAW_PURPOSE`, which holds `chaseHalt` and `chaseHaltLength`. Both go out through their layer's `public.ts`, the draw so its spec can reach it. In `chase()`, at a re-path where the unit would walk, `startsHalt` draws on the unit's generational id. With `chase_halt_chance` it clears the order and sets `haltUntilTick` on the AI record to between half and all of `chase_halt_seconds` ahead, the length a second draw. A unit already where it wants to stand draws nothing, and a kiter backing away never halts. The checks for leash, lost hero, cast, ability, and reach come before the halt, so each still acts on its tick, and entering Chase clears the halt. A chance or a length of 0 never halts, and a draw writes nothing, so at 0 the chase is as it was. The tunables are `chase_halt_chance` 0.08, a fraction, and `chase_halt_seconds` 1, in seconds. The enemies page's Chase row and a new edge case, the vocabulary's **Halt**, the developer panel page, and the adding-an-enemy runbook say so.

The halt is held at 0 in the fixtures of five specs that measure something else and read a stop as an arrival or a chase as a walk: `transitions.spec.ts` (the charger waits), `lancer.spec.ts`, `unit-speed.spec.ts`, `damage-types.spec.ts`, and `wane.spec.ts`. On the maintainer's decision of 2026-09-26 the stress tier's live-cap chase retunes it to 0 by command in that case alone, since a timing budget measures the worst case and a halted enemy costs less than a walking one; with halts on, a west grunt passed its leash inside the measured window.

The six logs are on content version `9c256307`. The phase 1, boss-encounter, and spells sessions are re-stamped. `corridor-200` is recorded again with its lift at tick 405, the hold clicks stopping before it, and `PRESS_END_TICK` 405; every bar holds unchanged, with the column 17, the deepest press 0.558, settling in 25 and 63 ticks of passes, and all two hundred home by tick 878.

The balance hero and archetypes sessions are recorded again by drivers kept in `tests/helpers/recording/balance-sessions.ts`, run by `tests/simulation/replays/record-balance.spec.ts` only under `HELIX_RECORD=balance`. The testing standard gains the recording helper kind, the one that simulates, and the development page the command. The hero session's fights now end on the hero's death, the pack's, or 45 s, which moves only the grunts: one killed at level 10, not none, and three at level 20, not two. The kite shoots when the gap is 300, walking at least 3 s between shots: the grunt dies in 45 s, not 68, and the hero is still never hit. The runner lands five hits in 20 s, not ten. The walking archer takes about five health a second, not four, against about nine standing, still over the spec's 1.5 times. The rotation throws each spell once the one before has landed: the four take 1160 of the tank's 1200, one attack finishes it, and it is dead 6.8 s after the first. Zenith alone still takes the most of any single, 475. Section 5 of the enemy catalogue and its four measured reasons move with them.

`pnpm check` is green but for the stress tier's wall-clock budget, which fails in three cases while another program holds two cores, one of them the 300 units on random orders that runs no enemy AI. It closes on a green `pnpm check` on a quiet machine.

Closed 2026-09-26: T07's run was the quiet-machine check this ticket waited on, `pnpm check` exit 0 over T05, T06, and T07 together, 3687 tests passed, 4 skipped, 1 todo, the stress tier included, at a load average of about 7.

---

### P6-S29-T06 — A hit wakes a returning enemy

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 0.5 |
| Depends on | T05 |
| Status | done |

> **Note, 2026-09-26:** came from triage, a behaviour change of the bug class. The maintainer's note: "Enemies that are returning should get their aggro back if they are attacked." Today `goHome` clears `provoked` every tick and the enemies page says Return ignores the hero and whatever hits it, so the rule changes and the page changes with it. Depends on T05 only because both edit `src/domain/ai/machine.ts`.

**Build:** In `goHome()`, a provoke with a source, read on the unit's next driving tick while the hero can be seen, sends the unit through Aggro into Chase and alerts its pack, returning members as well as idle ones. The unit's leash anchor, a new point on the AI record, moves to where it stood when it woke, and `isPastLeash` measures from the anchor, so the unit does not turn for home on the next tick and no unit flips between Chase and Return tick by tick. The anchor is the spawn point otherwise: set there on spawn, on entering Idle, and on a wake from Idle. It lies at most the leash radius from the spawn point, the wake point brought onto that circle if it is further, so pulling a returning pack again and again carries it no further than twice its leash from home and the long road's bound on enemies near a point holds. Regeneration does not change: only in Return and Idle, with no leash heal (Q28, Q53). A lost, dead, or hidden hero still sends it home, and a hit from nobody wakes nothing, as the damage door already provokes nothing for it. The [enemies](../../../../docs/product/features/enemies.md) page's state table and edge cases say a hit wakes a returning enemy.

**Acceptance:**
- A returning grunt hit by the hero is in Chase on the next driving tick, and its returning and idle pack members with it.
- With the hero standing just beyond the old leash from the spawn point, the woken unit stays in Chase or Attack for sixty ticks with no Return between.
- A hit from nobody, and a hit while the hero is dead or hidden, leaves the unit returning.
- A woken unit has gained no health but what Return's regeneration gave it; a pack woken on its way home sleeps again once it is home and whole.
- The anchor never lies further than the leash radius from the spawn point.
- The stored logs replay, recorded again only where a spec reads a return; `pnpm check` green.

**Tests:**
- `tests/simulation/ai/transitions.spec.ts`: Return to Chase on a hit with the pack alerted; no flip over sixty ticks; a hit from nobody and a lost hero leave it returning; the anchor's bound.
- `tests/simulation/enemies/dormancy.spec.ts`: a pack woken on its way home sleeps again whole, with no leash heal.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

Built 2026-09-26, on T05's tree. The AI record holds `leashAnchor`, a point set with the spawn point when a unit is placed, cleared with the record, and put back on the spawn point on entering Idle and on a wake from Idle; `isPastLeash` measures from it. In `goHome()` a provoke, read before regeneration, wakes a unit whose behaviour engages and which can see the hero: its anchor goes to where it stands, brought onto the leash circle round the spawn point if further, and it and its pack go through Aggro into Chase on that tick, so the wake tick regenerates nothing. `alertPack` now takes returning members as well as idle ones, a returning member anchored where it stands and an idle one at its spawn point, so a pack whose resting member notices the hero brings back those still walking home. A unit woken beyond twice its leash turns for home on the same tick, which is the bound holding. The debug overlay rings the leash round the anchor. Nothing allocates: the anchor is one point per record, made with it.

Four specs forced a leash by moving the spawn point and now move the anchor with it: `transitions.spec.ts`, `chase-halts.spec.ts`, `enemies/edges.spec.ts`, and `presentation/overlays.spec.ts`; `unit-pool.spec.ts` checks the anchor is cleared on release. `transitions.spec.ts` replaces "ignores a hit on the way home" with six cases per fighting behaviour: the wake with the pack, returning and idle; sixty ticks with no Return with the hero just past the old leash; a hit from nobody, with the hero hidden, and with the hero dead; and the anchor's bound over repeated pulls. `dormancy.spec.ts` gains the pack woken on its way home that fights, gains no more than a tick's regeneration on any tick, and sleeps whole.

No stored log moves: the six replay unchanged, the balance hero and archetypes sessions recorded again under the new rule came out byte for byte the same, and no content changed, so none is re-stamped and section 5 of the enemy catalogue does not move. The enemies page's Return row, pack and leash paragraphs, and a new edge case, the catalogue's leash field, and the onboarding page's overlay line say the new rule.

`pnpm check`: lint, typecheck, build, and every tier green but the stress tier's wall-clock budget, which fails in two to four cases while another program holds the machine (load average 13), the 300 units on random orders that runs no enemy AI among them; with the wake turned off the same cases run no faster. It closes on a green `pnpm check` on a quiet machine, with T05.

Closed 2026-09-26, with T05, on T07's run: `pnpm check` exit 0 over T05, T06, and T07 together, 3687 tests passed, 4 skipped, 1 todo, the stress tier included, at a load average of about 7.

---

### P6-S29-T07 — A cast does not cut a melee enemy's backswing short

| Field | Value |
| --- | --- |
| Layer | domain, tests, docs |
| Size | 0.5 |
| Depends on | T03, T06 |
| Status | done |

> **Note, 2026-09-26:** unplanned, from triage: found by the T03 engineer and approved by the maintainer on 2026-09-26, so it adds 0.5 to a bucket already committed to its 4 days, drawn on sprint 29's buffer day, nothing cut. In `fight()` in `src/domain/ai/machine.ts`, ability selection runs before the `isMidSwing` check T03 added, so a melee elite or boss (slam, charge) or a lancer can take an ability in its backswing; the new order cuts the backswing through the order state machine, and a charge moves the unit on that tick, the hit-and-run feel of the maintainer's first note. Depends on T06 only because both edit `src/domain/ai/machine.ts`; it runs before P6-S30-T03, since the retune is tuned against how enemies swing.

**Build:** In `fight()`, a melee unit whose order is in `attack_backswing` does not select an ability until its backswing ends; it selects on its first driving tick after, as it chases then. The hold is the same melee test `isMidSwing` uses, so a ranged unit, the kiters included, selects in its backswing as today. A cast of its own already under way is untouched, and what already ends a swing still does: a lost, dead, or hidden hero or a leash passed sends it to Return, and a stun or any disable the disable matrix names cancels it. The wind-up is not changed. The [enemies](../../../../docs/product/features/enemies.md) page's Attack row or edge cases say a melee enemy finishes its backswing before it casts as well as before it follows.

**Acceptance:**
- The failing test is written first and fails on the build as it stands: an elite melee grunt whose slam is ready casts in its backswing.
- With the fix, an elite grunt (slam), a boss brute (charge), and a lancer (charge), each with its ability ready, hold position and order through the whole backswing and cast no earlier than the first tick after it ends.
- A hexer or skirmisher still selects and casts in its backswing as before; a melee unit's cast already under way runs to its end as before.
- The stored logs replay: those whose specs read enemy positions, casts, or kills recorded again, the rest unchanged; a number in section 5 of the enemy catalogue that moves with the recording moves on the page in the same change.
- `pnpm check` green, the stress tier included.

**Tests:**
- `tests/simulation/ai/whole-swing.spec.ts`, extended: the elite grunt, the boss brute, and the lancer each stand through the backswing with an ability ready and cast on the tick after; a kiter casts in its backswing; a cast under way is untouched.
- `tests/simulation/replays/balance.spec.ts`, `tests/simulation/boss-encounter.spec.ts`: moved to the new logs where they read positions, casts, or kills.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

Built 2026-09-26, on T06's tree. The failing test came first: an elite grunt, a boss brute, and a lancer, each with its ability made ready on the tick its hit landed, stood 1 of 15 backswing ticks and cast on the first. In `fight()`, ability selection is skipped while `isInMeleeBackswing` holds, the melee half of `isMidSwing`, which now calls it, so the two cannot drift apart; a ranged unit, the kiters included, selects in its backswing as before, and the wind-up is unchanged. `tests/simulation/ai/whole-swing.spec.ts` gains the three melee units holding place, order, and cast through the whole backswing and casting on the tick after it ends, an elite grunt's slam begun before the swing running to its end, and the skirmisher's arrow and the hexer's curse cast in their backswing. An in-reach melee unit still has a tick to cast between swings, since the backswing ends in the attack system after the machine has run, and a new wind-up waits on the attack clock.

No stored log moves: the six replay unchanged, and the balance hero and archetypes sessions recorded again under the new rule came out byte for byte the same, so `balance.spec.ts` and `boss-encounter.spec.ts` needed no change and section 5 of the enemy catalogue does not move. No content changed, so none is re-stamped. The enemies page's Attack row and edge cases, and the ability pipeline's quick reference on an enemy's cast, say a melee enemy casts only once its backswing ends.

`pnpm check` exit 0, 2026-09-26, 3687 tests passed, 4 skipped, 1 todo, the stress tier included, with the load average down to 7. Once, at load 18, `replay-format.spec.ts`'s content-stamp case timed out and passed alone.

---

### P6-S29-T08 — Elites and bosses hit harder by a tier damage multiplier

| Field | Value |
| --- | --- |
| Layer | domain, content, tests, docs |
| Size | 0.5 |
| Depends on | T07, Q71 (answered) |
| Status | done |

> **Note, 2026-09-26:** unplanned, from triage: the maintainer answered Q71 on 2026-09-26 with a tier damage multiplier, 1.5 for elites and 1.5 for bosses, and approved it as a ticket of its own before the retune, since it adds two tunables and a read at spawn under `src/domain/`, outside P6-S30-T03's content, tests, and docs. It adds 0.5 to a bucket already at 4.5 of its 4 days, drawn on the rest of sprint 29's buffer: 5 of 4, nothing cut. It runs after T07 and before P6-S30-T03, which depends on it. Without it an elite or a boss is a health sponge that hits like a normal.

**Build:** Two tunables in `src/content/tuning.ts` and the `TuningDef` key list in `src/domain/definitions/tuning-def.ts`, `elite_damage_multiplier` and `boss_damage_multiplier`, fractions applied as written, beside the tier health multipliers. They land at 1 here, so no fight moves in this ticket and no log is recorded again; P6-S30-T03 sets both to the maintainer's 1.5 with the rest of its numbers, so the balance logs are recorded once, not twice. A pack's spawn reads the damage multiplier for its tier as it reads the health one, 1 for a normal unit, and the spawn holds it on the unit, set at spawn and cleared with the unit, so a retune reaches the units spawned after it and leaves a unit already standing as it was. `attackDamageOf` in `src/domain/attack/attack.ts` multiplies the attack definition's damage by it before the modifier rows, so a melee hit and a shot fired both carry it; the hero's is 1. An ability's damage, the slam, the charge, the arrow, is its effect's and does not move. Nothing allocates. The [enemies](../../../../docs/product/features/enemies.md) page's tiers table and the [enemy catalogue](../../../../docs/product/specs/enemy-catalogue.md)'s tier fields say a tier multiplies attack damage as well as health and experience. If holding the number reaches past the unit record and the spawn, the placement is the engineering architect's before the build.

**Acceptance:**
- An elite's and a boss's attack damage are the definition's times their tier's multiplier, a normal's the definition's; a modifier row applies on top as it does today.
- A retune of either multiplier lands in the log and is read at the next spawn, leaving a unit already standing as it was, as the health multipliers are.
- At the defaults of 1, every stored log replays unchanged; the content version moves with the tuning table, so the six logs are re-stamped.
- `pnpm check` green, the stress tier included.

**Tests:**
- `tests/simulation/enemies/tiers.spec.ts`: a normal, an elite, and a boss grunt, and an elite and a boss archer whose shot carries it, each land the definition's damage times its tier's multiplier on the hero, at a multiplier retuned off 1 so the case is not vacuous; a retune read at the next spawn with the standing unit unchanged.
- `tests/simulation/tuning.spec.ts`: both tunables retune through `set_tuning` and land in the log.

**Definition of done:** Every change · A change under `src/domain` or `src/simulation` · A documentation change.

Built 2026-09-26, on T07's tree, inside the unit and the spawn. The unit carries `attackDamageMultiplier`, 1 at creation and on release, so the hero, a normal unit, and a summon hold 1; `placePack` reads the tier's damage multiplier beside the health one and writes it on each member, and `attackDamageOf` multiplies the attack definition's damage by it before the modifier rows, so a melee swing and a shot fired both carry it and an ability's effect does not. Nothing allocates. `elite_damage_multiplier` and `boss_damage_multiplier` are in the tuning table at 1, read as written. `tests/simulation/enemies/tiers.spec.ts` gains a normal, an elite, and a boss grunt, silenced and provoked so only the swing lands, and an elite and a boss archer's shot, each landing the definition's damage times its tier's multiplier, retuned to 2 and 3, after the hero's armour; a modifier row on top; the defaults of 1; and a retune read at the next spawn with the standing unit unchanged. With the multiply taken out, six of those cases fail. `tests/simulation/tuning.spec.ts` retunes both keys through `set_tuning` and finds them in the log.

No stored log moves at the defaults of 1: the six differ from their copies before the change only in the content version, `9c256307` to `b3b78c53`, re-stamped. The enemies page's tiers table and paragraph, the enemy catalogue's tier and attack damage fields, the developer panel's list of tunables, and the adding-an-enemy runbook say a tier multiplies attack damage too.

`pnpm check` exit 0, 2026-09-26, 3698 tests passed, 4 skipped, 1 todo, the stress tier included, at a load average of about 5.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The maintainer's run: reached the last boss, level at its kill, notes filed | **Clean run 2026-09-26**, seed 3742014961, content version `08d1c2e4`, 13164 ticks, stored as `tests/simulation/replays/long-road-playtest.json`: the last boss killed on tick 12961 at **level 10**, read from the log by `tests/simulation/replays/long-road-playtest.spec.ts`, which passes with two replays agreeing at every tick. Panel use: 2 `heal` and 8 `restore_mana`, no `level_up`, no cooldown or mana toggle. No F9 file; the maintainer's verdict in chat, that the five notes of the first run all feel much better now, and that the heal and mana from the panel were needed to finish but are accepted, since loot will later drop health and mana. Triaged in the [triage note](../notes/2026-09-26-long-road-triage.md#the-clean-run): no new ticket, the heal and mana use to Deferred's loot row. Was: first run 2026-09-26, seed 3727497116: the last boss killed on tick 13413 at level 22, but only after 19 `level_up` commands from the panel, with no cooldowns, infinite mana, 5 mana restores, and 2 heals, since the first three enemies could not be passed by play. The log was discarded by the maintainer and not stored; five notes were given in chat, no F9 file. A clean run, with the panel closed, follows P6-S30-T03 |
| Triage: notes by outcome, tickets written, days committed against the appetite | Five notes triaged with the maintainer on 2026-09-26, all accepted: one bug (T03), one bug-class behaviour change (T06), one behaviour change the maintainer ruled in (T05), two tuning changes (T04, P6-S30-T03); no spell swap, no map edit. Written as the triage gave them, 3.75 days; sized on the plan's scale, 4 of 4 committed, 2.5 here and 1.5 in sprint 30. One Deferred row, the hero's side toward Diablo II curves. Then two unplanned tickets approved by the maintainer the same day, 0.5 each: T07 from the T03 engineer's finding, and T08 from Q71's answer, with a second Deferred row, a dedicated last boss. The clean run of 2026-09-26 brought no F9 file and two points in chat, each given an outcome: the five fixes feel much better, no change; the 2 heals and 8 mana restores from the panel, accepted by the maintainer, evidence on Deferred's loot row, no ticket. No day spent. Q57's final value was not settled by it, since no note spoke to the chokes; it stays with Q59 to Q67 for the maintainer to answer, in STATUS.md. In the [triage note](../notes/2026-09-26-long-road-triage.md) |
| Actual days per ticket, and the bucket spent | T01: sized 0.5, 0.25 of agent work; the maintainer's run is calendar time outside it. T02: sized 1, 0.25 of agent work; the triage with the maintainer is outside it. Bucket: 2.5 of 2.5 committed to T03 to T06, and T07 and T08, 0.5 each, unplanned and approved by the maintainer on 2026-09-26, on the buffer day: the sprint holds 5 sized days, the phase's bucket 5 of 4, the whole buffer spent and nothing cut. T03: sized 0.5, 0.5 of agent work, done 2026-09-26 on a green `pnpm check` on a quiet machine. T04: sized 0.5, 0.75 of agent work, done on what an agent can verify; the render benchmark waits on a person. T05: sized 1, about 1 of agent work, done 2026-09-26; its build note records no figure, so the day is read from what it holds: the hash and the keyed draw, the halt, five fixtures held at 0, the recording drivers, and the six logs. T06: sized 0.5, about 0.5 of agent work, done 2026-09-26, read the same way; no log moved. T07: sized 0.5, 0.5 of agent work, done 2026-09-26; its `pnpm check` closed T05 and T06 as well. T08: sized 0.5, 0.5 of agent work, done 2026-09-26; no log moved but for the content stamp. The sprint closed 2026-09-26 on what an agent can verify, opened again for its bucket, and closed again the same day with T03 to T08 done |

## Risks in this sprint

- The playtest is calendar time the plan does not control. The sprint does not start its bucket until the triage is done; if the maintainer's run slips, sprint 29 waits, and nothing else is pulled forward into it.
- Sprint 11 found 5.75 days in one walk. If the triage finds more than the appetite, the surplus is cut to Deferred, not added to the phase; the phase gate needs the maintainer to have played and filed, not every note built.
