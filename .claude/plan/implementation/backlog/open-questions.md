# Open questions

**Written:** 2026-09-20 · **Kept current by:** whoever answers one

Decisions the plan needed and the documentation did not settle. Each has a proposed answer the plan is built on and the ticket that depends on it. Answering one differently means editing that ticket.

---

| # | Question | Proposed answer the plan assumes | Blocks | Status |
| --- | --- | --- | --- | --- |
| Q1 | Does a summon expire when its owner dies? The ability pipeline page says it keeps its lifetime; the spells and enemies pages say it expires on the same tick | It expires. Product pages win; they say it twice and the edge-case tables depend on it. The architecture page is corrected in the same ticket | P2-S09-T02 | Proposed |
| Q2 | Phase 1's AT-O4 needs a channel to abort, and nothing channels until phase 2 | A `begin_channel` debug command puts the hero in `channeling` for N ticks. It is the only way to channel until an ability does, and it stays as a testing tool | P1-S06-T01 | Proposed |
| Q3 | Hoarfrost and the stun bash both need "when this unit takes or deals damage, do X". Is that a status capability or a pipeline special case? | A status capability: `onDamage` and `onDealDamage` hook keys on the status definition, resolved from a small registry like an effect key, with a per-entry internal cooldown | P2-S10-T01, P5-S19-T02 | Proposed |
| Q4 | How does the panel read draw calls from Phaser 4's renderer? | A two-hour spike in sprint 06. If the counter is reachable, read it; if not, the readout says "unavailable" and gates use the browser's WebGL inspector. ADR 0001's numbers were read that way anyway | P1-S06-T02 | Proposed |
| Q5 | What is the tuning key for a definition field? | `def:<kind>:<id>:<field path>[:<index>]`, numeric fields only, the field path being the camelCase property path verbatim with a dot per nesting level and a colon before a table index (`def:enemy:frost_archer:attack.baseAttackSeconds`, `def:spell:frost_lance:cooldownSeconds:3`), copied into run scope at world creation and read by every system through the tuning state | P4-S17-T01 | Proposed |
| Q6 | Left click selects, and there is nothing to select | The mapper emits nothing on a plain left click until summons or items make selection useful. No command variant is added for it | P1-S05-T01 | Proposed |
| Q7 | Wane hides the hero from aggro, and no enemy aggroes in phase 2 | The `aggro_hidden` flag is set and tested in sprint 10; the behaviour that respects it is tested in sprint 12 | P2-S10-T03, P3-S12-T04 | Proposed |
| Q8 | Phase 1 stubs are named `spell-qqq` in the mechanics spec. Ids never rename once shipped. Which id do the stubs get? | The final ids (`hoarfrost`, `wane`, `glacier`, `siphon`, `updraft`, `quicken`, `zenith`, `emberling`, `bolide`, `clarion`) with placeholder effect lists. A rename in phase 2 would invalidate every phase 1 replay. The spec's section 11.5 is a QA naming suggestion, not an id rule | P1-S04-T03 | Proposed |
| Q9 | Does the boss encounter run at 200 enemies plus a boss and adds, or lower? | Decided by the phase 4 headroom table. If the tick margin is under 1 ms, the cap is written lower in the phase 5 README and the ticket says so | P5-S21-T04 | Open until sprint 18 |
| Q10 | The catalogues are design work sized as writing tasks. Who approves the numbers? | The product owner, within the sprint. If a catalogue needs discussion beyond its day, the discussion is calendar time outside the sprint and the next ticket waits | P2-S07-T01, P3-S12-T01, P5-S20-T01 | Proposed |
| Q11 | Should the ten-spell phase 2 be re-cut to three spells so the first fight arrives three weeks earlier? | No. The plan keeps phase 2 whole. The re-cut is described in [Deferred](./deferred.md) for leadership to choose | Phase 2 | Proposed |
| Q12 | The mechanics spec says the panel's simulation controls (pause, step, catch-up cap) are commands "including pause, step" in ADR 0004, but the world never knows about the driver | Pause, step, and the cap are driver operations on `DevApi`, not commands, because they do not change world state and cannot be replayed meaningfully. ADR 0004's list is read as the world-changing operations; a one-line clarification is added to the developer panel page in sprint 06 | P1-S06-T01 | Proposed |
| Q17 | The layers page says presentation is the only layer that may import Phaser, and in the same table gives `app/` the Phaser game config and every import. Lint follows the second: `phaser` is banned everywhere but `src/presentation/**` and `src/app/**` | The composition root is exempt because it is the one place that knows concrete wiring, and `game-config.ts` lives there. The three pages that say "presentation only" (layers, presentation coding, tech stack) add "and the composition root" in one wording pass, in sprint 01 when the game config lands | P0-S01-T04 | Proposed |

---

## Answered

Move a row here with the date and who answered it when it is settled.

| # | Answer | Date | By |
| --- | --- | --- | --- |
| Q13 | No blank line between import groups. Built-in, external, aliased layers, relative; alphabetical inside each group. The coding standard is updated to say so | 2026-09-20 | The maintainer |
| Q14 | `.only` is banned. `.skip` needs a same-line comment; lint checks that it exists and review checks it names an owner and a condition. No ticket ids in code | 2026-09-20 | The maintainer |
| Q15 | Phaser is stubbed through a Vitest alias to `tests/helpers/doubles/phaser-stub.ts` in every project. `vi.mock` is banned across the tests tree with no carve-out | 2026-09-20 | The maintainer |
| Q16 | `no-console` is an error under `src/**` except `src/app/**` and `src/devtools/**`, where `warn` and `error` are allowed | 2026-09-20 | The maintainer |
| Q18 | Definition fields are camelCase, as every property is. snake_case is for string values only: ids, effect keys, behaviour keys. A tuning key keeps each segment's own case, so its field path is the property name verbatim and the compiler catches a stale key. The coding standard's naming table, the content standard's example, the two runbooks, and the simulation coding example are updated; Q5's proposed key shape records the path form | 2026-09-20 | The maintainer |
