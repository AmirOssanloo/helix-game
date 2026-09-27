/**
 * `no-restricted-globals` entries keeping the host out of the two inner layers. They run in
 * Node under the test tiers, and a reference to the page, a timer, storage, the network, or
 * the host's own random source is a dependency the tiers cannot see until it throws or a
 * replay diverges.
 *
 * `globalThis` and `self` are banned outright: each reaches every name below by another
 * spelling. The DOM-free typecheck over the same folders is the second net, for anything a
 * global name cannot catch.
 *
 * Add them to the `no-restricted-globals` array of the domain and simulation blocks.
 *
 * @see docs/architecture/layers-and-dependency-rule.md#the-dependency-rule
 */

const DOCS =
  "docs/architecture/layers-and-dependency-rule.md#the-dependency-rule";

const reason = (message) => (name) => ({
  name,
  message: `\`${name}\` ${message} See ${DOCS}.`,
});

const PAGE = reason(
  "is the browser. Nothing under src/domain/ or src/simulation/ touches the DOM; the presentation layer reads the world view and draws it.",
);

const TIMER = reason(
  "runs on the wall clock, not the tick. A delay in the simulation is a tick count, and only the driver in src/app/ is scheduled by the host.",
);

const HOST = reason(
  "is the host, not the world. Storage and the network belong to the composition root and the panel; the simulation receives what they read as a command or as content.",
);

const RANDOM = reason(
  "is an unseeded random source. Draw from the world's seeded random source.",
);

const CLONE = reason(
  "allocates a deep copy through the host. Copy the fields the caller needs into a preallocated record.",
);

const EVERY_GLOBAL = reason(
  "reaches every host global by another name. Name what you need, and if it is the host, it does not belong under src/domain/ or src/simulation/.",
);

export const NO_DOM_GLOBALS = [
  ...["window", "document", "navigator", "requestAnimationFrame"].map(PAGE),
  ...["setTimeout", "setInterval", "queueMicrotask"].map(TIMER),
  ...["localStorage", "sessionStorage", "fetch"].map(HOST),
  RANDOM("crypto"),
  CLONE("structuredClone"),
  ...["globalThis", "self"].map(EVERY_GLOBAL),
];
