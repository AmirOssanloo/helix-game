/**
 * The default of every switch over a union under `src/domain/` and `src/simulation/`. Its
 * parameter is `never`, so the call compiles only while every member of the union has a case:
 * a member added to the union and not handled fails the typecheck at each switch that misses
 * it. Lint requires the call, and the typecheck does the rest without type-aware lint.
 *
 * It throws in every build, since a value typed `never` that arrives anyway is a broken
 * invariant: a cast or an unvalidated input got past the types.
 */
export const assertNever = (_value: never): never => {
  throw new Error("A switch reached a member of its union with no case");
};
