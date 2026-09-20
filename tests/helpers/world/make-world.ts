/** What a simulation test hands the world it creates. The registry and the map join the seed when the world exists. */
export type MakeWorldOptions = Readonly<{
  seed: number;
}>;

/** Creates a small world for a simulation test: an explicit seed, a factory-made registry, a bare rectangle by default. */
export type MakeWorld = (options: MakeWorldOptions) => never;

export const makeWorld: MakeWorld = (): never => {
  throw new Error(
    "makeWorld has no world to create yet: src/simulation/ exports no createWorld. Fill this helper in with it.",
  );
};
