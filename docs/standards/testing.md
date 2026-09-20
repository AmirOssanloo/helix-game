# Testing standards

> **Entry point:** [Standards](./README.md)
> **See also:** [Simulation coding standards](./simulation-coding.md) · [Development workflow](../workflows/development.md) · [Definition of done](../workflows/definition-of-done.md)

What to test, at which tier, and how big a test should be. Names containing `foo`, `bar`, or `baz` are placeholders — the [legend](../documentation-standards.md#reading-a-placeholder) decodes each one.

---

## The principle

**Test a rule where it is decided. Test a join where it is joined. Never both.**

A **rule** is a game decision: whether a fourth orb evicts the oldest, whether a rooted unit may turn, how much damage armour removes. Rules are decided in pure functions under `domain/`, and are tested at the unit tier with plain arguments and no world.

A **join** is where two things that were each correct alone meet: a command and the validator, a system and the ones that run before it, a definition and the registry, a view and the pool that binds it. Joins are tested at the tier where the two things actually meet — a real world with a small registry, or a real content registry.

A test earns its place if **it would fail for a reason you want to know about, and would not fail for a reason you don't care about.** A rule re-tested through a full world, or a join re-tested with stubs, costs maintenance on every change and catches nothing the first test already caught.

---

## Where tests live

**Every spec lives under `tests/` at the repository root, mirroring `src/`.** None sits beside the source it covers, none in a `__tests__/` folder, and every one is named `*.spec.ts`. The spec for `src/domain/foo/bar.ts` is `tests/domain/foo/bar.spec.ts`, and nothing else.

The reason is that the build compiles `src/` and excludes `tests/`, so a spec under `src/` is one exclude pattern away from shipping. It also makes the mirrored path the index.

---

## The tiers

Answer in order. The first yes decides.

1. Does it boot Phaser, or need a GPU? → **benchmark**, under `bench/`, manual
2. Does it need a DOM? → **presentation**, jsdom
3. Does it need a world? → **simulation**
4. Does it read the content registry? → **content**
5. Does it read the source tree? → **architecture**
6. Otherwise → **unit**

| Tier | The test… | Runs in | Budget |
| --- | --- | --- | --- |
| **unit** | calls a pure rule with plain arguments; no world | Node | under 5 ms |
| **simulation** | creates a real world with a small registry, submits commands, ticks, asserts state and events | Node | under 50 ms; the stress test is the exception |
| **content** | builds the real registry and validates every definition | Node | under 200 ms for the suite |
| **presentation** | drives the input mapper or view binding with a fake world view | jsdom | under 20 ms |
| **architecture** | asserts the layer import table and the determinism bans against the source tree | Node | seconds |
| **benchmark** | drives the render path at the caps under a real Phaser game | Browser | thirty seconds, read by a person |

Nothing draws in a test. The presentation tier tests the logic around Phaser — what a click becomes, which entity a view binds to — never what a pixel looks like.

**The simulation tier holds the acceptance tests.** Every acceptance test in the [mechanics spec](../product/specs/character-movement-and-mechanics.md) is a named test in this tier — `AT-M1`, `AT-C4`, `AT-I6` — so a designer can read the spec and find the test. It also holds the replay determinism test (record a session, replay it on a fresh world, assert identical state at every tick) and the stress test (three hundred units, the arena, the tick budget), which [Performance standards](./performance.md#quick-reference) own.

---

## Per layer

| Thing | Tier | Test this | Not this | How many |
| --- | --- | --- | --- | --- |
| Entity pools | unit | Acquire to capacity and one past; release and reuse; a stale generation resolves to nothing; iteration visits live slots in index order | The shape of the state object | Five or six per pool kind |
| Order state machine | unit, simulation | Every transition, legal ones landing and illegal ones refused, per disable flag; a new order replacing the current one at tick end | The list of states as data | One per transition, one per disable per blocked action |
| Movement and turn rate | simulation | The spec's locomotion acceptance tests; translation begins only inside the action cone; speed clamps; the ramp | Vector arithmetic | The spec's list, plus boundaries |
| Collision and spatial hash | unit | Circle-circle and circle-rectangle push-out with the separation distances; a query returns every candidate inside and none outside; candidates come in cell then slot order; a moved entity is found in its new cell | Performance | Eight to ten |
| Pathing | unit | A path exists around an obstacle; none across a wall; smoothing removes interior points with line of sight; inflation per radius class blocks a corridor the smaller class passes; the re-path budget defers the excess | The heap's internals | Six to eight |
| Ability pipeline | simulation | Each targeting kind commits at the right moment; cast point delays the effect; a cancelled targeting cursor spends nothing; cooldown starts at commit; mana is refused before the cast point; no global cooldown | The effects themselves | One per targeting kind, one per refusal |
| Named effects | unit | Each effect over a fixed world slice: who is hit, what status is applied, what is spawned | The pipeline that invoked it | One to three per effect |
| Invoke module | simulation | The spec's orb and slot acceptance tests: eviction, multiset order, the D to F shift, swap-on-reinvoke, cooldown survival across eviction | The spell identities | The spec's list |
| Stats and combat | unit | Derived values from attributes and modifiers, driven from a table; mitigation per damage type at boundaries; status stack rules (refresh, stack, ignore); death at zero and not before | The reference game's exact numbers | Every row of the table |
| AI behaviours | simulation | Each state transition on its trigger: aggro on sight, on damage, shared across a pack; leash and return; attack in range; nothing while dormant | Pathing again | One per transition per behaviour |
| Commands and validator | unit | Each refusal reason; ordering within a tick by timestamp then key priority; a refused command emits nothing | Every field of every variant | One per reason, two for ordering |
| Systems order | simulation | The registered order matches the documented order; a full tick with one of each entity kind completes without an invariant failure | Each system's rule again | Two |
| Content | content | Every definition validates; every key resolves; every referenced id exists; every table has its length; every frame exists; ids are unique | A definition's numbers | The suite, once |
| Views | presentation | Bind writes frame, depth, tint once; sync writes only the seven fields; an entity leaving the rectangle releases its view; a pool miss is reported, not grown | Rendering | Four or five per view kind |
| Input mapper | presentation | Each pointer and key gesture becomes the right command with the tick timestamp; edge triggering, no key repeat; targeting mode commits on click and cancels on escape | Phaser's input plumbing | One per gesture |
| Scenes | — | Nothing. A scene is lifetime and composition; the benchmark exercises it | | 0 |
| `DevApi` | simulation | Each panel operation becomes the right `DebugCommand` and lands in the input log | The HTML | One per operation |
| `shared/` helpers | unit | Output-based, from a table, with the boundaries — angle wrap at ±π, clamp at the edges, the ring buffer at capacity | One-line wrappers | As many cases as branches |

**Rules and the validator deserve the most attention.** A missed branch is a refusal that never happens, and the player casts through a silence.

---

## Always test these

- **Every acceptance test in the mechanics spec**, by its name.
- **Determinism.** The replay test runs on every change to `domain/` or `simulation/`.
- **Every refusal.** A command the validator must reject has a test that submits it and asserts nothing changed.
- **Every disable against every blocked action.** Stun, silence, root, disarm, each against the actions it blocks and the ones it does not.
- **Every state transition**, in orders, abilities, and AI. The moves that are allowed and, more importantly, the ones that aren't.
- **Anything that failed once.** A bug fix ships with the input log that reproduced it, turned into a replay test named for the behaviour it protects.

## Never test these

- **The same rule at two tiers.** A rule is tested once, in unit. The simulation test asserts the join once.
- **Call order, call counts, private functions, internal state.**
- **Phaser.** Its input, its batcher, its scenes. The benchmark is where Phaser is exercised, by a person.
- **Reference-game numbers.** A test that asserts `fooDef`'s cooldown value is a copy of the definition. Test the table's length and the rule that reads it.
- **Types, constants, barrels, the composition root, the tuning table's values.**

---

## Shape rules

**One outcome per test.** Several assertions are fine when they describe one outcome; two outcomes are two tests. **Names read as requirements:** `it('evicts the oldest orb instance on a fourth press')`, never `it('should call release')`. **Arrange, act, assert — visibly.**

**No logic in a test** — no loops, no branches, no computed expectations; write two tests. **Expected values are literal.** A test that computes the expectation the way the code does passes when both are wrong.

**Time and randomness come from the world.** A test creates its world with an explicit seed and advances it by calling `tick`. Never a bare `Date.now()`, never the runner's fake timers, never a sleep.

**Worlds are small.** A simulation test hands the world a registry of the two or three definitions it needs, made by a factory, not the full content registry. The full registry is the content tier's job.

**No focused tests, and no skipped test without an owner and a condition in a comment.** No retries in CI. A flaky test is a determinism bug and is treated as one the day it flakes.

---

## Test doubles and fixtures

| Kind | Name | Use when |
| --- | --- | --- |
| Definition factory | `makeFooDef(overrides)` | A simulation test needs a definition with known numbers |
| World factory | `makeWorld({ seed, defs, map })` | A simulation test needs a world; the default map is a bare rectangle |
| Entity spawner | `spawnFoo(world, overrides)` | A test needs a unit or projectile already live |
| Command helper | `submit(world, command)` and `tickUntil(world, predicate, maxTicks)` | Driving a scenario without hand-counting ticks |
| Recorded log | `loadInputLog(name)` | A replay test, from `tests/simulation/replays/` |
| World view stub | `makeWorldView(overrides)` | A presentation test needs something to sync from |

A helper **arranges**; it never simulates. It does not branch on its parameters, carry state between calls, or re-implement a production rule. `tickUntil` has a maximum and fails loudly when it reaches it.

**Every helper lives under `tests/helpers/`, one folder per kind, and a spec imports from the barrel** `tests/helpers/index.ts` and nowhere deeper. Lint enforces the barrel. Inside, the folders are the index:

```text
tests/helpers/
├── index.ts          # The one import path for a spec
├── world/            # makeWorld, submit, tickUntil, spawnFoo, loadInputLog
├── content/          # makeFooDef and the small registries built from them
├── factories/        # defineFactory: the counter-backed builder every makeFooDef is written with
├── doubles/          # makeWorldView and the Phaser stub the test runner aliases in
├── assertions/       # expectAccepted and expectRefused, for a command result
└── architecture/     # One file per rule the architecture tier checks: a collect function and a describe function
```

A factory counts, never randomises: the third `makeFooDef()` in a test has the same id every run. An architecture rule exports the function that collects violations beside the `describe` that mounts them, so a test can assert on the message a rule prints.

---

## Anti-patterns

### A rule tested through the whole world

Thirty lines of world setup to check that armour reduces physical damage. The rule is a pure function; call it. The world test exists to check that the damage system reaches the rule, once.

### A test that mirrors the implementation

`expect(hp).toBe(100 - damage * (1 - armourFactor))`. Both are wrong together and the test says nothing. Write `expect(hp).toBe(76)`.

### A flaky test retried

A simulation test that passes on the second run has found a determinism bug — an unseeded random, a `Map` iterated in history order, a clock read. Retrying it hides the one thing the suite exists to catch.

---

## Quick reference

| Rule | Do |
| --- | --- |
| The principle | Test a rule where it is decided, a join where it is joined. Never both |
| A test earns its place | It fails for a reason you want to know about, and not for one you don't |
| Where a spec lives | `tests/` at the root, mirroring `src/`. Never beside the source, never `__tests__/`, always `*.spec.ts` |
| Choosing the tier | First yes decides: Phaser or GPU → benchmark; DOM → presentation; world → simulation; registry → content; source tree → architecture; otherwise unit |
| Budgets | unit under 5 ms · simulation under 50 ms · content suite under 200 ms · presentation under 20 ms |
| Nothing draws | The presentation tier tests logic around Phaser, never pixels |
| Acceptance tests | Every one in the mechanics spec, by its name, in the simulation tier |
| Determinism | The replay test runs on every change under `domain/` or `simulation/` |
| Stress test | Simulation tier, in CI, owned by performance standards |
| Benchmark | `bench/`, manual, read by a person |
| Per layer | [The table above](#per-layer): tier, what to test, what not to, how many |
| Zero tests | Scenes, types, constants, barrels, the composition root, tuning values |
| Always tested | Every acceptance test, determinism, every refusal, every disable against every blocked action, every transition, anything that failed once |
| Never tested | The same rule at two tiers; call order and counts; Phaser; reference numbers; wiring |
| A bug fix | Ships with its reproducing input log as a replay test |
| Shape | One outcome per test; names read as requirements; arrange, act, assert; no logic; literal expected values |
| Time and randomness | From the world's seed and `tick`. No clock, no fake timers, no sleep |
| Worlds | Small: a factory-made registry of the definitions the test needs |
| Focused and skipped | None focused; skipped only with an owner and condition. No retries |
| A flaky test | A determinism bug, treated as one the day it flakes |
| Helpers | `makeFooDef`, `makeWorld`, `spawnFoo`, `submit`, `tickUntil`, `loadInputLog`, `makeWorldView` — arrange, never simulate |
| Where helpers live | `tests/helpers/`, one folder per kind; a spec imports from the barrel only; factories count, never randomise; an architecture rule exports its collect function beside its describe |

---

## Related documentation

- [Development workflow](../workflows/development.md) — running each tier
- [Performance standards](./performance.md) — the stress test and the benchmark
- [Simulation coding standards](./simulation-coding.md) — the determinism rules the replay test enforces
- [Character movement and mechanics](../product/specs/character-movement-and-mechanics.md) — the acceptance tests by name
- [Content authoring standards](./content-authoring.md) — what the content tier validates
