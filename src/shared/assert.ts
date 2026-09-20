/**
 * Throws when `condition` is false in development and does nothing in production. `__DEV__` is
 * a build-time constant, so the whole branch leaves the production bundle. It is for invariants
 * inside the tick; a check that must always run is an `if` that returns a reason.
 *
 * `message` is a string literal. A template literal is built before the call whether or not
 * the condition holds, and that is an allocation on the hot path.
 */
export const assert: (
  condition: boolean,
  message: string,
) => asserts condition = (condition, message) => {
  if (__DEV__ && !condition) {
    throw new Error(message);
  }
};
