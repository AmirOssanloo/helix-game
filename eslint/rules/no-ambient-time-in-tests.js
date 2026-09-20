/**
 * `no-restricted-syntax` entries banning the ways a test reads or waits on ambient time. Time
 * in a test is `tick`; a spec that reaches for the wall clock is asserting on whatever the
 * machine happened to be doing.
 *
 * @see docs/standards/testing.md#quick-reference
 */

const REMEDY =
  "Time is the tick count: advance the world with `tickUntil` from the tests/helpers barrel. See docs/standards/testing.md#quick-reference.";

export const NO_AMBIENT_TIME_IN_TESTS = [
  {
    selector: "CallExpression[callee.name=/^(setTimeout|setInterval)$/]",
    message: `Waiting on the wall clock is where flakes come from. ${REMEDY}`,
  },
  {
    selector:
      "CallExpression[callee.property.name=/^(setTimeout|setInterval)$/]",
    message: `Waiting on the wall clock is where flakes come from. ${REMEDY}`,
  },
  {
    selector: 'NewExpression[callee.name="Date"][arguments.length=0]',
    message: `An argument-less \`new Date()\` reads the machine's clock, so the assertion depends on when it ran. ${REMEDY} Pass an argument when you want a literal date.`,
  },
  {
    selector:
      'CallExpression[callee.object.name="vi"][callee.property.name="useFakeTimers"]',
    message: `Fake timers freeze a clock the simulation never reads. ${REMEDY}`,
  },
];
