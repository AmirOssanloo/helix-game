/**
 * `no-restricted-syntax` entries banning the ways a system reads the clock or an unseeded
 * random source. A tick is a function of its inputs; the seeded source and the tick count are
 * the only randomness and time the two inner layers have, and the replay test depends on it.
 *
 * Add them to the `no-restricted-syntax` array of the domain and simulation blocks. A narrower
 * block replaces a wider one's array rather than adding to it.
 *
 * @see docs/standards/simulation-coding.md#quick-reference
 */

const DOCS = "docs/standards/simulation-coding.md#quick-reference";

export const NO_AMBIENT_TIME_IN_SIMULATION = [
  {
    selector:
      'CallExpression[callee.object.name="Math"][callee.property.name="random"]',
    message: `\`Math.random()\` makes a replay diverge. Draw from the world's seeded random source. See ${DOCS}.`,
  },
  {
    selector:
      'CallExpression[callee.object.name="Date"][callee.property.name="now"]',
    message: `\`Date.now()\` reads the wall clock. Time inside the simulation is the tick count. See ${DOCS}.`,
  },
  {
    selector: 'NewExpression[callee.name="Date"][arguments.length=0]',
    message: `An argument-less \`new Date()\` reads the wall clock. Time inside the simulation is the tick count. See ${DOCS}.`,
  },
  {
    selector:
      'CallExpression[callee.object.name="performance"][callee.property.name="now"]',
    message: `\`performance.now()\` reads the wall clock. Measure around a tick from the driver into an instrumentation ring; inside the simulation, time is the tick count. See ${DOCS}.`,
  },
  {
    selector:
      'CallExpression[callee.object.property.name="performance"][callee.property.name="now"]',
    message: `\`performance.now()\` reads the wall clock. Measure around a tick from the driver into an instrumentation ring; inside the simulation, time is the tick count. See ${DOCS}.`,
  },
];
