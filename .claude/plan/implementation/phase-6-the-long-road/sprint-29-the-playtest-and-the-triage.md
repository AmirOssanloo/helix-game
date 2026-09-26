# Sprint 29 — The playtest and the triage

**Phase:** 6 · **Sized days:** 1.5 in tickets, 2.5 of bucket appetite · **Buffer:** 1

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
| Status | planned |

**Build:** The published playtest build boots on the long road; the panel's map list still reaches the arena. The engineer publishes it and opens a box under Waiting on a person. The maintainer plays from the spawn at level 1 to the last boss, in one sitting or several, with the panel closed but for jumping to a checkpoint after a break, and presses the feedback key whenever something feels wrong or right: the push in a choke (Q31), the early regions, each archetype, each spell. At the end, **Save input log** saves the whole session. The engineer stores the feedback files under `.claude/plan/implementation/notes/`, dated, and the whole session as `tests/simulation/replays/long-road-playtest.json` with a spec.

**Acceptance:**
- The maintainer reached the last boss from level 1 and filed feedback; the level at the last boss's kill is read from the log.
- The session replays identically, and every feedback file loads and stops at its tick on the playtest's commit.

**Tests:**
- `tests/simulation/replays/long-road-playtest.spec.ts`: two replays agree at every tick; the level at the last boss's death is read and recorded.

**Definition of done:** Every change.

---

### P6-S29-T02 — Feedback triage

| Field | Value |
| --- | --- |
| Layer | docs (plan) |
| Size | 1 |
| Depends on | T01 |
| Status | planned |

**Build:** The delivery strategist and the maintainer read each note at its tick, by loading its file, and give it one of five outcomes: a bug, a tuning change, a spell swap, a map edit, or no change; anything that asks for a new system goes to Deferred. Q31's share is settled from what the chokes felt like, and Q57 answered. Each accepted item is written as a ticket in this sprint or the next with the next free number and a note saying it came from triage, sized on the plan's scale, in [the bucket's order](./README.md#the-triage-bucket) until the appetite is spent. The rest goes to [Deferred](../backlog/deferred.md) or [Open questions](../backlog/open-questions.md). A dated triage note under `notes/` lists every feedback note and its outcome.

**Acceptance:**
- Every note has an outcome, and the tickets written add to no more than the four days of the bucket.
- A spell named for a swap has its replacement shaped in the spell catalogue, approved by the maintainer, before its ticket starts.

**Tests:** none.

**Definition of done:** Every change.

---

### The bucket — 2.5 days of appetite

Tickets P6-S29-T03 onward are written by T02. None exists before the triage, and none is invented to fill the appetite. An unspent day is recorded as unspent in the sprint exit.

---

## Sprint exit

| Check | Result |
| --- | --- |
| The maintainer's run: reached the last boss, level at its kill, notes filed | |
| Triage: notes by outcome, tickets written, days committed against the appetite | |
| Actual days per ticket, and the bucket spent | |

## Risks in this sprint

- The playtest is calendar time the plan does not control. The sprint does not start its bucket until the triage is done; if the maintainer's run slips, sprint 29 waits, and nothing else is pulled forward into it.
- Sprint 11 found 5.75 days in one walk. If the triage finds more than the appetite, the surplus is cut to Deferred, not added to the phase; the phase gate needs the maintainer to have played and filed, not every note built.
