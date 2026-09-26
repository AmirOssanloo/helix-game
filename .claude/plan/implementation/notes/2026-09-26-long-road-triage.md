# The long road's feedback triage

**Written:** 2026-09-26 · **By:** the P6-S29-T02 run · **Updated when:** the maintainer's feedback files are stored and triaged

The triage of the maintainer's playtest of the long road. It lists every feedback note and its outcome, the questions the playtest was to settle, and what the bucket committed.

---

## Where the triage stands

The maintainer has not played yet. The playtest waits on a person, deferred until phase 6 is done by the maintainer's standing instruction of 2026-09-24, in the box "the maintainer's playtest of the long road" in [STATUS.md](../STATUS.md#waiting-on-a-person). On 2026-09-26 there is no file matching `*-long-road-feedback-*.json` under `notes/`, and no `tests/simulation/replays/long-road-playtest.json`.

So this note lists no feedback note, writes no bucket ticket, and commits no day of the appetite. The sprint 29 file says none is invented to fill it (Q68).

## Notes and their outcomes

| Feedback file | Tick | Note | Outcome | Ticket, Deferred row, or question |
| --- | --- | --- | --- | --- |
| none filed yet | | | | |

Each outcome is one of: a bug, a tuning change, a spell swap, a map edit, or no change. A note that asks for a new system goes to [Deferred](../backlog/deferred.md) as "the long road, after triage".

## Questions the playtest was to settle

Each stays as its row in [Open questions](../backlog/open-questions.md) says until the maintainer triages with the notes in hand.

| Question | What the playtest decides | Standing on 2026-09-26 |
| --- | --- | --- |
| Q31, Q57 | The hero's push share, from how the chokes felt | Answered: the share starts at 0 and stays a tunable. The final value is recorded in Q57's row at the triage |
| Q59 | The share's default if the corridor's overlap bar fails at 0 | Open, decided provisionally at 0.5 |
| Q60 | The checkpoint reach radius | Open, decided provisionally |
| Q61, Q62 | The sleep radius, and where a hurt enemy heals on the way to sleeping | Open, decided provisionally |
| Q63 | Whether the jump to a checkpoint may move a dead hero | Open, decided provisionally |
| Q64 | The checkpoint's look on the floor and the word | Open, decided provisionally |
| Q65 | How a feedback file loads and runs to its tick | Open, decided provisionally |
| Q66 | Whether the long road calls for an A* expansion cap | Open, decided provisionally |
| Q67 | Which map a fresh session starts on | Open, decided provisionally: every build starts on the long road |

## The bucket

| Sprint | Appetite | Committed | Unspent |
| --- | --- | --- | --- |
| 29 | 2.5 | 0 | 2.5, waiting on the triage |
| 30 | 1.5 | 0 | 1.5, waiting on the triage |

## When the files arrive

1. Store each feedback file as `notes/<date filed>-long-road-feedback-<seed>-<tick>.json` and the session as `tests/simulation/replays/long-road-playtest.json`, and run `tests/simulation/replays/long-road-playtest.spec.ts`.
2. With the maintainer, load each file in the panel with **Load input log**, read the note at its tick, and give it one outcome in the table above.
3. Write each accepted item as a ticket, P6-S29-T03 onward and then P6-S30-T03 onward, with a note saying it came from triage, sized on the plan's scale, in [the bucket's order](../phase-6-the-long-road/README.md#the-triage-bucket) until the four days are spent. A spell named for a swap has its replacement shaped in the spell catalogue and approved by the maintainer before its ticket starts.
4. Put what does not fit in [Deferred](../backlog/deferred.md) or [Open questions](../backlog/open-questions.md), answer the questions above, and fill the bucket table.
