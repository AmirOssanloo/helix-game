# The long road's feedback triage

**Written:** 2026-09-26 · **By:** the P6-S29-T02 run; filled the same day by the delivery strategist from the triage with the maintainer, again from the clean run, and again from the maintainer's answers to Q57 and Q59 to Q67 · **Updated when:** Q58 is answered

The triage of the maintainer's playtest of the long road. It lists every feedback note and its outcome, the questions the playtest was to settle, and what the bucket committed.

---

## Where the triage stands

The maintainer played the long road on 2026-09-26, on seed 3727497116, and killed the last boss on tick 13413 of a 13691-tick session, at level 22. The first three enemies could not be passed by play, so the run leaned on the panel: the log holds 19 `level_up`, `toggle_no_cooldowns`, `toggle_infinite_mana`, 5 `restore_mana`, and 2 `heal` commands.

**The log is discarded.** A run carried by 19 panel level-ups cannot answer the gate's question, about level 10 at the last boss by play, and its fights say nothing about the push share at a choke. The maintainer chose not to keep it, so it is not stored as `tests/simulation/replays/long-road-playtest.json`, and the playtest spec still skips. No F9 feedback file was filed; the five notes came in chat, dated 2026-09-26, and were triaged there with the maintainer, who approved each outcome.

A clean playtest, the panel closed but for the checkpoint jump, runs again after the five tickets below, P6-S30-T03 last. Its session is the one stored and replayed, and its notes are triaged in a section added to this note.

**The clean run, 2026-09-26**, is stored and replayed, and triaged in [The clean run](#the-clean-run) below: the last boss killed at level 10 by play, with 2 heals and 8 mana restores from the panel.

## Notes and their outcomes

| Feedback file | Tick | Note | Outcome | Ticket, Deferred row, or question |
| --- | --- | --- | --- | --- |
| none, in chat | none | "Enemies hit and run at the same time; impossible to kite." | A bug. A melee enemy leaves its swing as its hit lands: once the hero leaves reach, `fight()` returns to Chase unless the order is in its wind-up, so the backswing is cancelled. A melee enemy now stands through the whole swing; kiters keep their rule. A failing test first. First in the order | [P6-S29-T03](../phase-6-the-long-road/sprint-29-the-playtest-and-the-triage.md#p6-s29-t03--a-melee-enemy-finishes-its-whole-swing-before-it-moves), 0.5 |
| none, in chat | none | "Enemies are too tight and sticky; the non-visual size should grow so they collide before visuals touch." | A tuning change, content only. Each enemy's collision radius at about 1.45 times its drawn bound radius; melee reach is measured on the bound radii, edge to edge, so it does not move. The corridor's overlap bar and the map's clearance tests must hold. Touches the push share, Q57 and Q59 | [P6-S29-T04](../phase-6-the-long-road/sprint-29-the-playtest-and-the-triage.md#p6-s29-t04--enemy-bodies-wider-than-they-are-drawn), 0.5 |
| none, in chat | none | "Chasers should sporadically stop for a while like Diablo II, not a bee swarm." | A behaviour change to the existing Chase state. The bucket's rule sends a new system to Deferred; the maintainer ruled this in explicitly as a change to Chase, not a new system, overruling that rule for it. At each re-path a unit may halt a short while, drawn deterministically from the seed per unit so replays hold and a pack does not halt together. Triaged at 0.75, sized 1 on the plan's scale | [P6-S29-T05](../phase-6-the-long-road/sprint-29-the-playtest-and-the-triage.md#p6-s29-t05--chasing-enemies-halt-now-and-then), 1; [Q69](../backlog/open-questions.md), [Q70](../backlog/open-questions.md), both answered |
| none, in chat | none | "Enemies that are returning should get their aggro back if they are attacked." | A behaviour change of the bug class, and a rule change: the enemies page says Return ignores whatever hits it. A hit with a source puts a returning enemy back in Chase with its pack; its leash anchor moves to where it was hit so it does not flip home the next tick; no leash heal (Q28, Q53 stand); a lost or dead hero still sends it home | [P6-S29-T06](../phase-6-the-long-road/sprint-29-the-playtest-and-the-triage.md#p6-s29-t06--a-hit-wakes-a-returning-enemy), 0.5 |
| none, in chat | none | "Enemies too quick and far too much health; in Diablo II Act 1 normal, enemies die in 1–4 hits." | A tuning change, enemy side only. The hero's basic attack is 42 at 1.7 seconds: a grunt at 400 takes 10 to 11 hits, a runner at 220 about 6, a tank at 1200 about 29. Health, damage, and speed of every archetype retuned by Diablo II Act 1 normal ratios, each archetype mapped to its nearest monster; elites 2 to 4 times a normal; bosses from the uniques, the last boss from Andariel. Experience per kill unchanged, so Q58's budget does not move. Spells will overkill early: flagged, no spell change. Last in the order. The maintainer approved the numbers on 2026-09-26 with damage twice the draft, since the game has no miss, bosses at 4 times health, and `self_heal` 40 a second to 10, in [the ratios note](./2026-09-26-diablo-ii-act-1-ratios.md) | [P6-S30-T03](../phase-6-the-long-road/sprint-30-the-bucket-and-the-phase-gate.md#p6-s30-t03--enemies-retuned-to-diablo-iis-first-act), 1.5; [Q71](../backlog/open-questions.md), answered; the hero's side and a dedicated last boss to [Deferred](../backlog/deferred.md) |
| none, the T03 engineer's finding | none | Not a feedback note: found while building T03, and the same hit-and-run feel as the first note. Ability selection in `fight()` runs before the swing is held, so a melee elite or boss (slam, charge) or a lancer can cast in its backswing, and a charge moves it | A bug, approved by the maintainer on 2026-09-26 as unplanned work. A melee unit in its backswing takes no ability until the backswing ends; a cast under way and the kiters unchanged. After T06, before the retune | [P6-S29-T07](../phase-6-the-long-road/sprint-29-the-playtest-and-the-triage.md#p6-s29-t07--a-cast-does-not-cut-a-melee-enemys-backswing-short), 0.5 |
| none, Q71's answer | none | Not a feedback note: the maintainer's answer to Q71 on the retune's draft. A tier multiplies only health, so an elite or a boss hits like a normal | A tuning change needing a small domain read, approved by the maintainer on 2026-09-26 as unplanned work. `elite_damage_multiplier` and `boss_damage_multiplier`, read at spawn as the health multipliers are, landing at 1; the retune sets both to 1.5. After T07, before the retune, which depends on it | [P6-S29-T08](../phase-6-the-long-road/sprint-29-the-playtest-and-the-triage.md#p6-s29-t08--elites-and-bosses-hit-harder-by-a-tier-damage-multiplier), 0.5 |

Each outcome is one of: a bug, a tuning change, a spell swap, a map edit, or no change. A note that asks for a new system goes to [Deferred](../backlog/deferred.md) as "the long road, after triage", unless the maintainer rules it in, as the third note was.

The order is the maintainer's: the whole swing, the bodies, the halts, the hit on a returning enemy, then the retune, since the four before it change the pressure the retune is set against.

## Questions the playtest was to settle

The first run was carried by the panel, so it settles none of them. Each stays as its row in [Open questions](../backlog/open-questions.md) says until the clean run is triaged.

| Question | What the playtest decides | Standing on 2026-09-26 |
| --- | --- | --- |
| Q31, Q57 | The hero's push share, from how the chokes felt | Answered: the share starts at 0 and stays a tunable. **The final value is not settled**: no choke was played cleanly, and P6-S29-T04's wider bodies change the press. It waits on the clean run |
| Q59 | The share's default if the corridor's overlap bar fails at 0 | Open, decided provisionally at 0.5; P6-S29-T04 measures the bar again at the new radii |
| Q60 | The checkpoint reach radius | Open, decided provisionally; the clean run |
| Q61, Q62 | The sleep radius, and where a hurt enemy heals on the way to sleeping | Open, decided provisionally; the clean run |
| Q63 | Whether the jump to a checkpoint may move a dead hero | Open, decided provisionally; the clean run |
| Q64 | The checkpoint's look on the floor and the word | Open, decided provisionally; the clean run |
| Q65 | How a feedback file loads and runs to its tick | Open, decided provisionally; the clean run, if a file is filed |
| Q66 | Whether the long road calls for an A* expansion cap | Open, decided provisionally; the clean run's panel |
| Q67 | Which map a fresh session starts on | Open, decided provisionally: every build starts on the long road |
| Q68 | Whether the triage closes before the maintainer has played | Overtaken: the maintainer played and triaged on 2026-09-26 |

## The bucket

| Sprint | Appetite | Committed | Unspent |
| --- | --- | --- | --- |
| 29 | 2.5 | 3.5: T03 0.5, T04 0.5, T05 1, T06 0.5, and T07 and T08 0.5 each, unplanned, approved by the maintainer, on the buffer | 0, 1 over |
| 30 | 1.5 | 1.5: T03 1.5 | 0 |

The triage gave 3.75 days, the halts at 0.75. The plan's scale has no 0.75, so the halts are sized 1, and the bucket is spent to its 4 days with nothing over. The retune does not fit sprint 29's 2.5 behind the four before it, so it is P6-S30-T03 rather than P6-S29-T07, still last.

P6-S29-T07, the backswing held against a cast, came after the triage from the T03 engineer's finding. The maintainer approved it on 2026-09-26 as unplanned work over the spent bucket, so the bucket stood at 4.5 of 4, the half day drawn on sprint 29's buffer and nothing cut.

P6-S29-T08, the tier damage multiplier, came from the maintainer's answer to Q71 on the retune's draft, the same day, and was approved as unplanned work: the bucket stands at **5 of 4**, sprint 29's buffer day spent whole, nothing cut. Both overruns are data for [Estimation and capacity](../03-estimation-and-capacity.md): the triage sized what the notes asked for, and a day more came from building and shaping them. T03 to T07 are done. The order is now T08, then the retune.

## What the triage did not take

- **The hero's side toward Diablo II curves**: hero health from strength, the attribute gains, the Dota experience table, spell scaling, and the long road's levelling budget. A bet of its own, a week or more, decided after the clean run, in [Deferred](../backlog/deferred.md).
- **Spells overkilling early enemies** once they are retuned: flagged in the enemy catalogue by P6-S30-T03 and in [the ratios note](./2026-09-26-diablo-ii-act-1-ratios.md), no spell change. The clean run says whether it matters.
- **A dedicated last boss** at Andariel's ratio, about 1450 health: the five bosses share one health multiplier, so the last boss stays a 340-health boss brute, in [Deferred](../backlog/deferred.md), revisited after the clean run.

## The clean run

The maintainer played the long road again on 2026-09-26, on the build with P6-S29-T03 to T08 and P6-S30-T03 in the tree, content version `08d1c2e4`, seed 3742014961, a session of 13164 ticks. It is stored as `tests/simulation/replays/long-road-playtest.json`, and `tests/simulation/replays/long-road-playtest.spec.ts` passes: two replays agree at every tick, and the last boss was killed on tick 12961 at **hero level 10**. The panel commands in the log are 2 `heal` and 8 `restore_mana`; no `level_up`, and no cooldown or mana toggle. Neither command grants experience, so level 10 is the road's by play and answers the gate's level row. No F9 feedback file was filed; the maintainer's verdict came in chat: "All of the feedback given feels much better now - I still needed to use heal and mana to finish the game but it is fine. Because later we will have loot that will drop health and mana."

| Feedback file | Tick | Note | Outcome | Ticket, Deferred row, or question |
| --- | --- | --- | --- | --- |
| none, in chat | none | The five notes of the first run all feel much better now | No change. The whole swing, the wider bodies, the halts, the hit on a returning enemy, and the retune stand as built | P6-S29-T03 to T08, P6-S30-T03, done |
| none, in chat; and the log | none | The hero needed 2 heals and 8 mana restores from the panel to finish, and "it is fine", since loot will later drop health and mana | No change, accepted by the maintainer. Not a new ticket: health and mana from drops is loot, a bet of its own. The panel use is the first measured evidence of the sustain the road lacks without drops | [Deferred](../backlog/deferred.md)'s "Health and mana from loot drops" row |

The bucket is spent and nothing new was accepted into it: no day committed. Nothing the clean run said moves the level budget of Q58, the hero's side (its Deferred row), or the dedicated last boss (its Deferred row); each stays deferred to the next bet's choice.

### What the clean run did not settle

No note spoke to the chokes, the checkpoints, the sleeping packs, the feedback file, or the halts' length, so the questions below are not answered by the run. The plan has no rule that settles a question on silence: Q57 says the playtest's chokes settle its value, recorded at triage, and its rows elsewhere wait on the maintainer's word. Each stays as its row in [Open questions](../backlog/open-questions.md) says, with its provisional value in the build.

| Question | Standing after the clean run |
| --- | --- |
| Q31, Q57 | **Not settled.** The recorded answer is a share of 0, but the build plays at Q59's provisional 0.5, so the clean run was played at 0.5 and drew no complaint about the chokes. Proposed: the maintainer settles Q57 and Q59 together at 0.5, the build as played, which holds the corridor's overlap bar; or names another value and it is a one-line tuning ticket with a re-stamp. The gate's push row holds at the default either way |
| Q59 | Open, 0.5 provisional, played on the clean run with no note |
| Q60, Q61, Q62, Q63, Q64 | Open, provisional values played on the clean run with no note |
| Q65 | Open; no feedback file was filed, so the load at a tick was not exercised by the maintainer |
| Q66 | Open; no panel reading of the tick was taken during the run |
| Q67 | Open; the session started on the long road as provisionally decided, with no note |
| Q70 | The halts at 0.08 and 1 s, answered; the five notes "feel much better", which reads as no retune wanted, but the maintainer did not name the halts |

### The maintainer's answers, 2026-09-26

The maintainer answered every question above but Q58 the same day, after phase 7 was planned. Each row is moved to Answered in [Open questions](../backlog/open-questions.md). One changes the build.

| Question | Answer | Outcome |
| --- | --- | --- |
| Q57, Q59 | `hero_push_share` settled at 0.5, the value played on the clean run; Q57's recorded 0 is superseded | No change: the build is at 0.5 |
| Q60 | `checkpoint_reach_radius` from 512 to 256: the ring sits on the path out of the choke's gap, the checkpoint 480 past the wall, and is a sensible size to click for phase 7's store | A tuning change, written as the unplanned ticket [P7-S31-T04](../phase-7-loot-and-the-store/sprint-31-the-item-catalogue-and-where-it-lives.md#p7-s31-t04--the-checkpoint-reach-radius-at-256), 0.5, first in sprint 31: one line in `src/content/tuning.ts`, the ring following, the stored logs re-stamped, the checkpoint tests checked. The phase 6 bucket is spent, so it is phase 7's unplanned work |
| Q61 | Kept, 2000 | No change |
| Q62 | Kept, regenerating in Idle as well as in Return | No change |
| Q63 | Kept, the jump refused while the hero is dead | No change |
| Q64 | Kept, the thin ring and the word CHECKPOINT; the ring's width follows the reach, so 256 after P7-S31-T04 | No change beyond T04 |
| Q65 | Kept as built: the maintainer loaded a feedback file by hand, and it fast-forwards quickly, pauses at the exact F9 moment, and shows the status line and the note as documented | No change; the feedback-file box by hand is walked |
| Q66 | Kept, no A* expansion cap | No change |
| Q67 | Kept, every build starts on the long road | No change |

Q58, the long road's 32 packs and the spec's approval, was not in the answers and stays open; its box is folded into the phase 6 bar box in STATUS.md.

## When the clean run's files arrive

1. Store each feedback file as `notes/<date filed>-long-road-feedback-<seed>-<tick>.json` and the session as `tests/simulation/replays/long-road-playtest.json`, and run `tests/simulation/replays/long-road-playtest.spec.ts`. A session with a `level_up` in it does not answer the gate's level row.
2. With the maintainer, load each file in the panel with **Load input log**, read the note at its tick, and give it one outcome in a new table here.
3. Settle Q57's final value from the chokes, and answer Q59 to Q67.
4. The bucket is spent. A new accepted item is unplanned work for the next bet, or goes to [Deferred](../backlog/deferred.md) or [Open questions](../backlog/open-questions.md).
