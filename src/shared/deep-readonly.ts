/**
 * `Readonly` at every depth: each property, array element, map value, and function result,
 * so a view typed with it refuses a write anywhere under it. It is a compile-time type only;
 * the value underneath is the live object and nothing is copied.
 */
export type DeepReadonly<T> = T extends (...args: infer Args) => infer Result
  ? (...args: Args) => DeepReadonly<Result>
  : T extends ReadonlyMap<infer Key, infer Value>
    ? ReadonlyMap<Key, DeepReadonly<Value>>
    : T extends object
      ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
      : T;
