# The loot playtest's triage

**Written:** 2026-09-28 · **By:** the P8-S37-T02 run · **Updated when:** the maintainer has played the long road with loot and the store, and again when the triage is held

The triage of the maintainer's playtest of the long road with loot and the store. It lists every feedback note and its outcome, the questions the playtest is to settle, and what the bucket committed.

---

## Where the triage stands

The maintainer has not played yet. The run is a person's, and by the maintainer's standing instruction of 2026-09-24 for unattended runs it is deferred until phase 8 is done, as a box under Waiting on a person in [STATUS.md](../STATUS.md). No session is stored as `tests/simulation/replays/long-road-loot-playtest.json`, so its spec skips, and no feedback file is filed under this folder. This note therefore lists no note, writes no ticket, and commits no day of the bucket ([Q118](../backlog/open-questions.md), decided provisionally).

**When the run comes in**, an agent:

1. Stores the saved input log as `tests/simulation/replays/long-road-loot-playtest.json`, and each F9 file here as `<date>-long-road-loot-feedback-<seed>-<tick>.json`, then runs `pnpm vitest run tests/simulation/replays/long-road-loot-playtest.spec.ts`. It must pass, not skip; it prints the tick and level of the last boss's kill and the pickups by kind, and those go into the sprint 37 exit row "The maintainer's run".
2. Writes each note, from a file or from chat, as a row of the table below, and holds the triage with the maintainer: one outcome each.
3. Writes each accepted row as P8-S37-T03 onward in [sprint 37](../phase-8-loot-and-the-store/sprint-37-the-balance-and-the-playtest.md) in the [phase README's order](../phase-8-loot-and-the-store/README.md#the-triage-bucket) until the two days are spent, and fills the bucket table below. Sprint 38's two tickets depend on every bucket ticket, so the docs sync and the gate read what the bucket moved.

## Notes and their outcomes

| Feedback file | Tick | Note | Outcome | Ticket, Deferred row, or question |
| --- | --- | --- | --- | --- |
| none yet | | | | |

Each outcome is one of: a bug, a tuning change, a screen fix, or no change. A note that asks for a new system, a new item kind, or a map edit that moves the levelling budget goes to [Deferred](../backlog/deferred.md) as "loot, after triage", never into the bucket; a decision goes to [Open questions](../backlog/open-questions.md).

## Questions the playtest is to settle

| Question | What the playtest decides | Standing on 2026-09-28 |
| --- | --- | --- |
| Q117 | Whether the loot walk's margin holds for a player, not only the driver's seed: a run that needs the panel early in region 1 is a tuning change, first in the bucket after anything that stops the road | Decided provisionally; the run |
| Q115 | The store screen's choices, from using it | Decided provisionally; the run, and its own box under Waiting on a person |
| R30 | Whether one tab with no reload is enough, or a lost inventory colours the verdict | Open; the run |

## The bucket

| Sprint | Appetite | Committed | Unspent |
| --- | --- | --- | --- |
| 37 | 2 | 0, the triage waits on the maintainer's run | 2, uncommitted until the triage |
