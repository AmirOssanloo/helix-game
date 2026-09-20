---
name: pick-up-a-ticket
description: "Use when starting, continuing, or closing a ticket from the implementation plan, or closing a sprint or phase. Triggers on: ticket, sprint, P0-S00-T01 and any P{n}-S{nn}-T{nn} id, next ticket, start the sprint, close the sprint, phase gate, status."
---

# Pick up a ticket

The plan under `.claude/plan/implementation/` is the work list. Its [README](../../plan/implementation/README.md) owns the ticket shape and the status rules; this skill is the order of operations.

## Starting

1. Read [STATUS.md](../../plan/implementation/STATUS.md). The ticket you are taking is **Next ticket** unless told otherwise.
2. Open the sprint file and read it top to bottom, not just the ticket. The sprint goal and the risks section change how a ticket is built.
3. Check every ID in the ticket's **Depends on** row has `Status | done`. If one does not, stop and report it.
4. Set the ticket's `Status` row to `in progress`. In `STATUS.md`, put the ID under **In progress** and its successor under **Next ticket**.
5. Load the docs the ticket's **Layer** row implies, from the task table in [docs/README.md](../../../docs/README.md#for-agents-what-to-load-for-a-task). Load the quick-reference anchors first.

## Building

- **Build** says what exists when the ticket is done. **Acceptance** is what you check. **Tests** names the specs by path. Build all three; a ticket with tests listed is not done without them.
- Anything the ticket did not foresee and the sprint needs becomes a new ticket in the same sprint with the next free number and a note saying it was unplanned. Do not fold it into the current ticket silently.
- A ticket that turns out to be wrong is edited in place with a one-line note under it saying why.
- No ticket or sprint reference goes into code or comments.

## Closing a ticket

1. `pnpm check` is green, or the ticket says why it cannot run yet.
2. Walk the rows the ticket's **Definition of done** line names in [the definition of done](../../../docs/workflows/definition-of-done.md). "Not applicable" is an answer; skipping is not.
3. Set `Status | done`. Move the ID to **Last closed ticket** in `STATUS.md` and clear **In progress**.
4. Record the actual days against the ticket in the sprint's **Sprint exit** table.

## Closing a sprint

Fill every row of the **Sprint exit** table with the numbers it asks for. Then in `STATUS.md` move **Last closed sprint** and point **Active sprint** at the next file. A phase closes only through [Phase exit gates](../../plan/implementation/04-phase-exit-gates.md), with the numbers recorded in the phase `README.md`.

## Report back

The ticket ID and its new status, what was built, the tests added by path, the `pnpm check` result, the definition-of-done rows walked, and any unplanned ticket, deferral, or open question you added.
