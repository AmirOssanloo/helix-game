/**
 * The defaults a factory builds from: a fixed object, or a function of the build number so each
 * `build()` differs where it has to (ids) and matches where it does not.
 */
export type FactoryDefaults<Built> = Built | ((sequence: number) => Built);

/** The builder `defineFactory` returns. */
export type Factory<Built> = Readonly<{
  /** One value: the defaults for the next build number, with `overrides` merged over them. */
  build: (overrides?: Partial<Built>) => Built;
  /** `count` values, each with its own build number and the same `overrides`. */
  buildMany: (count: number, overrides?: Partial<Built>) => Built[];
  /** The next number of a named counter, for a spec that needs a unique value outside a `build`. */
  sequence: (name?: string) => number;
  /** Sets every counter back to zero. Call it in a `beforeEach` if a spec asserts on an id. */
  reset: () => void;
}>;

/** The counter `build` advances. `sequence()` with no name reads the same one. */
const BUILD_SEQUENCE = "build";

/** Whether the defaults are a function of the build number, or one fixed object. */
const isDefaultsFactory = <Built extends object>(
  defaults: FactoryDefaults<Built>,
): defaults is (sequence: number) => Built => typeof defaults === "function";

/**
 * Defines a definition factory. Every `makeFooDef` under `tests/helpers/content/` is written
 * with it:
 *
 * ```ts
 * export const makeSpellDef = defineFactory((n) => ({ id: `spell_${n}`, cooldown_seconds: 1 }));
 * ```
 *
 * The build number makes ids stable and unique at once: it is a counter, not a random value, so
 * two definitions in one test cannot collide and the third `build()` has the same id every run.
 *
 * `overrides` is merged one level deep. A nested object replaces its default rather than
 * merging into it, which is the behaviour a test can predict.
 */
export const defineFactory = <Built extends object>(
  defaults: FactoryDefaults<Built>,
): Factory<Built> => {
  const counters = new Map<string, number>();

  const next = (name: string): number => {
    const value = (counters.get(name) ?? 0) + 1;

    counters.set(name, value);

    return value;
  };

  const build = (overrides: Partial<Built> = {}): Built => ({
    ...(isDefaultsFactory(defaults)
      ? defaults(next(BUILD_SEQUENCE))
      : defaults),
    ...overrides,
  });

  return {
    build,
    buildMany: (count, overrides = {}) =>
      Array.from({ length: count }, () => build(overrides)),
    sequence: (name = BUILD_SEQUENCE) => next(name),
    reset: () => {
      counters.clear();
    },
  };
};
