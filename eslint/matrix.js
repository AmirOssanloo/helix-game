/**
 * The dependency matrix: which layer folders under src/ each layer may import, and the
 * derivation that turns one row into a `no-restricted-imports` pattern group.
 *
 * - A layer's forbidden set is every layer its row does not list, so adding a row closes that
 *   layer off everywhere else at once.
 * - The matrix mirrors the table in docs/architecture/layers-and-dependency-rule.md, which the
 *   messages cite. Change both together.
 * - tests/architecture.spec.ts walks src/ against `LAYER_IMPORTS` too, so a re-export or a
 *   dynamic import that lint cannot see is caught by the same table.
 *
 * `LAYER_DOORS` below names the files under a layer an outer layer may import, and
 * ./rules/facades.js turns it into patterns. Content's type-only view of the domain lives
 * there too.
 */

const DOCS = "docs/architecture/layers-and-dependency-rule.md";

export const LAYER_IMPORTS = {
  // Pure helpers with no game knowledge. Nothing under src/.
  shared: [],
  // Decides. Pure rules over plain state.
  domain: ["shared"],
  // Orchestrates. Owns a world and steps it.
  simulation: ["domain", "shared"],
  // Typed data. Domain types only, and only through domain/public (./rules/facades.js).
  content: ["domain", "shared"],
  // Measures. Preallocated sample rings.
  instrumentation: ["shared"],
  // Adapts. The one layer that imports Phaser; enters the two inner layers through public.ts.
  presentation: ["simulation", "domain", "shared"],
  // The developer panel. Enters the two inner layers through public.ts.
  devtools: ["simulation", "domain", "instrumentation", "shared"],
  // The composition root. It reaches every layer, so nothing is forbidden and no block is emitted.
  app: [
    "shared",
    "domain",
    "simulation",
    "content",
    "instrumentation",
    "presentation",
    "devtools",
  ],
};

const LAYERS = Object.keys(LAYER_IMPORTS);

/**
 * The doors of each layer: the files under it, by name without the extension, that an outer
 * layer imports it through, and the layers each is open to. A layer not listed has one door,
 * `public`, open to every layer whose row names it. A door open to a layer its row does not
 * name stays shut: the row is checked first.
 *
 * The domain has two audiences, so three doors. The simulation needs its systems,
 * constructors, and mutators; the presentation and the developer panel need types and reads,
 * and are never handed a mutator to pass a view into.
 *
 * `testing` is no layer's door. It is the door tests take past `public`, and nothing under
 * src/ imports it.
 */
export const LAYER_DOORS = {
  domain: {
    // Types only. The architecture test holds the file to that.
    public: ["simulation", "content", "presentation", "devtools", "app"],
    // Pure reads and the constants they read by.
    queries: ["simulation", "presentation", "devtools", "app"],
    // Systems, constructors, mutators, and the content checks.
    rules: ["simulation", "app"],
  },
};

/** The doors of `target` open to `layer`, in the table's order. */
export const doorsOpenTo = (layer, target) => {
  const doors = LAYER_DOORS[target];

  if (doors === undefined) {
    return ["public"];
  }

  return Object.keys(doors).filter((door) => doors[door].includes(layer));
};

// `foo/, bar/ or baz/`, the list the messages read best with.
const listFolders = (layers) => {
  const folders = layers.map((layer) => `${layer}/`);

  if (folders.length <= 1) {
    return folders.join("");
  }

  return `${folders.slice(0, -1).join(", ")} or ${folders.at(-1)}`;
};

const forbiddenLayers = (layer) =>
  LAYERS.filter(
    (other) => other !== layer && !LAYER_IMPORTS[layer].includes(other),
  );

// The message is the whole user interface of the rule: it names the layer that broke the
// boundary, the layers it may use instead, and the page that decided both.
const layerMessage = (layer) => {
  const allowed = LAYER_IMPORTS[layer];
  const opening = `The ${layer} layer must not import from ${listFolders(forbiddenLayers(layer))}.`;
  const remedy =
    allowed.length === 0
      ? "It imports nothing under src/."
      : `It may import ${listFolders(allowed)} and nothing else under src/.`;

  return `${opening} ${remedy} Dependency table: ${DOCS}.`;
};

/**
 * The `no-restricted-imports` pattern entry for one layer, or null when the layer may reach
 * everything: a group with no entries restricts nothing, so no block is emitted at all.
 *
 * Both spellings of a cross-layer import are listed: the alias (`@domain/public`) and the
 * relative path (`../domain/public`). The trailing `/**` is load-bearing; read the traps
 * section of ./README.md before editing it.
 */
export const forbiddenFor = (layer) => {
  const forbidden = forbiddenLayers(layer);

  if (forbidden.length === 0) {
    return null;
  }

  return {
    group: forbidden.flatMap((other) => [`@${other}/**`, `**/${other}/**`]),
    message: layerMessage(layer),
  };
};
