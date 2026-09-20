# Open questions

**Written:** 2026-09-20 · **Kept current by:** whoever answers one

Decisions the plan needed and the documentation did not settle. Each has a proposed answer the plan is built on and the ticket that depends on it. Answering one differently means editing that ticket.

---

| # | Question | Proposed answer the plan assumes | Blocks | Status |
| --- | --- | --- | --- | --- |
| Q9 | Does the boss encounter run at 200 enemies plus a boss and adds, or lower? | The number is decided by the phase 4 headroom table, read on the measured max tick because the budget is a ceiling. If the margin is under 1 ms, the cap is written lower in the phase 5 README and the ticket says so. Settled on 2026-09-20: the cap is a pool capacity, and the boss and its adds are enemies, so they count inside it; the table decides whether 200 holds, not whether 200 plus some number holds | P5-S21-T04 | Open until sprint 18 |

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
| Q1 | A summon expires on the same tick its owner dies, for hero summons and enemy adds alike. The expiry goes through the death system as an expiry and grants no experience. The ability pipeline page is corrected with the answer, not in P2-S09-T02 | 2026-09-20 | The maintainer, with the engineering architect |
| Q2 | A `begin_channel` debug command puts the hero in `channeling` for N ticks. It changes world state, so it is a command and replays. It enters the state through the order state machine so AT-O4 exercises the real abort path, and it stays after real channels exist as the cheapest way to reach the state in a test | 2026-09-20 | The maintainer, with the engineering architect |
| Q3 | A status capability. `StatusDef` carries `onDamageTaken` and `onDamageDealt` hook keys or null, resolved at registry build from `src/domain/combat/hooks/`, one file per hook, file name is the key. Hooks run inside the damage function after mitigation; damage caused by a hook runs no hooks. The internal cooldown is a ready-at tick on the status table entry, its length on the definition | 2026-09-20 | The maintainer, with the engineering architect |
| Q4 | No spike. Phaser 4.2.1 has no counter, but every batch handler, the filter pass, and the GPU tile layer draw through two public renderer methods, `drawElements` and `drawInstancedArrays`, and the renderer emits pre-render, render, and post-render events. A presentation module wraps the two methods on the renderer instance at boot, resets on pre-render, writes the count to an instrumentation ring on post-render, and splits it per scene from the render event so the world figure excludes the HUD. Under the Canvas renderer the readout shows a dash. Risk R10 retires | 2026-09-20 | The maintainer, with the engineering architect |
| Q5 | `def:<kind>:<id>:<field path>[:<index>]`, numeric fields only, the field path being the property path verbatim with a dot per nesting level and a colon before a table index. The index is the array index verbatim, so `:2` is level 3, and the panel labels it "level 3" beside the key. The log and the panel carry the field's designer units; the registry converts once at world creation and once more when a tuning command is applied, so systems read ticks and the key names the source field | 2026-09-20 | The maintainer, with the engineering architect |
| Q6 | The mapper emits nothing on a plain left click and consumes the click so it can never become a move. Selection is presentation state, so no command variant is added | 2026-09-20 | The maintainer, with the engineering architect |
| Q7 | The `aggro_hidden` flag is computed by the status system early in the tick beside the disable flags and tested in sprint 10. The aggro behaviour reads flags, never the status table, and the "drop existing aggro unless adjacent and attacking" half is a behaviour rule tested in sprint 12 | 2026-09-20 | The maintainer, with the engineering architect |
| Q8 | The stubs get their final ids with placeholder effect lists. A rename in phase 2 would invalidate every phase 1 replay. The spec's section 11.5 carries an amendment saying so | 2026-09-20 | The maintainer, with the engineering architect |
| Q10 | The product owner, within the sprint, approves the shape: the effect lists, the primitives, and the capability list. That blocks the schema ticket. The numbers are starting values the tuning surface changes at no code cost, so they never block. A discussion beyond the day is calendar time outside the sprint | 2026-09-20 | The maintainer, with the engineering architect |
| Q11 | No. Phase 2 stays whole. The three-spell cut leaves projectile, summon, and lift unexercised by hero spells when the AI module is written, and enemy abilities in phase 5 reuse those primitives. The re-cut stays described in [Deferred](./deferred.md) for leadership | 2026-09-20 | The maintainer, with the engineering architect |
| Q12 | Pause, single-step, and the catch-up cap are driver operations on `DevApi`, not commands. They never change world state, and a replay runs in Node with no driver, so a pause in the log would be a no-op the world had to learn to ignore. ADR 0004, the devtools architecture page, and the developer panel page are corrected with the answer | 2026-09-20 | The maintainer, with the engineering architect |
| Q17 | The composition root may import Phaser to construct the game and hand it the scenes, never to build a view or read a game object. Lint already allows `src/app/**`. The layers page, the presentation page, the presentation coding standard, the tech stack page, and the lint message are corrected with the answer, not in sprint 01 | 2026-09-20 | The maintainer, with the engineering architect |
