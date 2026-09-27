/**
 * `no-restricted-syntax` entries banning the ways a system reads the clock or an unseeded
 * random source. A tick is a function of its inputs; the seeded source and the tick count are
 * the only randomness and time the two inner layers have, and the replay test depends on it.
 *
 * A call is not the only way in. A function read without being called, destructured, reached
 * by a computed key, or reached through `globalThis`, `self`, or `window` is the same clock, so
 * each source is matched on every spelling that names it rather than on the call.
 *
 * Add them to the `no-restricted-syntax` array of the domain and simulation blocks. A narrower
 * block replaces a wider one's array rather than adding to it.
 *
 * @see docs/standards/simulation-coding.md#quick-reference
 */

const DOCS = "docs/standards/simulation-coding.md#quick-reference";

const CLOCK = `Time inside the simulation is the tick count. See ${DOCS}.`;

/** The names a global can be reached through as a property. */
const GLOBAL_OBJECTS = "/^(globalThis|self|window)$/";

/** `name` or `["name"]`, as the key of a member or of a destructured property. */
const named = (field, name) =>
  `:matches([${field}.name="${name}"], [${field}.value="${name}"])`;

/** `Owner`, or `Owner` reached through a global object: `globalThis.Owner`, `self["Owner"]`. */
const owner = (field, name) =>
  `:matches([${field}.type="Identifier"][${field}.name="${name}"], [${field}.type="MemberExpression"][${field}.object.name=${GLOBAL_OBJECTS}]${named(`${field}.property`, name)})`;

/**
 * Three entries for one ambient source: any member read of it, called or not; a destructure
 * from its owner in a declaration; and a destructure from its owner in an assignment.
 */
const everySpelling = (ownerName, property, message) => [
  {
    selector: `MemberExpression${owner("object", ownerName)}${named("property", property)}`,
    message,
  },
  {
    selector: `VariableDeclarator${owner("init", ownerName)} > ObjectPattern > Property${named("key", property)}`,
    message,
  },
  {
    selector: `AssignmentExpression${owner("right", ownerName)} > ObjectPattern > Property${named("key", property)}`,
    message,
  },
];

export const NO_AMBIENT_TIME_IN_SIMULATION = [
  ...everySpelling(
    "Math",
    "random",
    `\`Math.random\` makes a replay diverge, however it is reached. Draw from the world's seeded random source. See ${DOCS}.`,
  ),
  ...everySpelling(
    "Date",
    "now",
    `\`Date.now\` reads the wall clock, however it is reached. ${CLOCK}`,
  ),
  ...everySpelling(
    "performance",
    "now",
    `\`performance.now\` reads the wall clock, however it is reached. Measure around a tick from the driver into an instrumentation ring. ${CLOCK}`,
  ),
  {
    selector: `NewExpression${owner("callee", "Date")}[arguments.length=0]`,
    message: `An argument-less \`new Date()\` reads the wall clock. ${CLOCK}`,
  },
  {
    selector: `CallExpression${owner("callee", "Date")}`,
    message: `\`Date()\` called without \`new\` returns the wall clock as text. ${CLOCK}`,
  },
];
