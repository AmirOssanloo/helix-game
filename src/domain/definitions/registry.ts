/**
 * The assembled, validated content a world receives at creation. The content layer builds the
 * real one from every definition; a test builds one from the two or three it needs.
 */
export type Registry = Readonly<{
  /** Tuning key to default value, copied into run scope when the world is created. */
  tuning: ReadonlyMap<string, number>;
}>;
