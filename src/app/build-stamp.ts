/**
 * The commit a build was made from, and whether the working tree held changes no commit has.
 * A log replays only on the code it was recorded on, so a feedback file carries the stamp of
 * the build it was written in, and a person reading it knows which checkout to replay it on.
 */
export type BuildStamp = Readonly<{
  commit: string;
  dirty: boolean;
}>;

/**
 * What reading the stamp needs from the machine the build runs on: git, run with `args` in the
 * repository, handing back what it printed or `null` when it could not run; and the commit a CI
 * runner names in its environment, or `null` outside one.
 */
export type BuildStampSource = Readonly<{
  git: (args: readonly string[]) => string | null;
  ciCommit: string | null;
}>;

/** The commit a build names when neither git nor the CI runner can say which it was. */
export const UNKNOWN_COMMIT = "unknown";

/**
 * The stamp for a build made now: the commit git names as HEAD, dirty when git reports any
 * change to the tree or cannot say. Without git, the CI runner's commit, whose checkout is
 * clean by construction; without either, `UNKNOWN_COMMIT`, counted as dirty, since nothing
 * says the tree matched any commit. Called once per build, from the Vite config.
 */
export const readBuildStamp = (source: BuildStampSource): BuildStamp => {
  const head = source.git(["rev-parse", "HEAD"]);

  if (head !== null && head.trim() !== "") {
    const status = source.git(["status", "--porcelain"]);

    return {
      commit: head.trim(),
      dirty: status === null || status.trim() !== "",
    };
  }

  if (source.ciCommit !== null && source.ciCommit.trim() !== "") {
    return { commit: source.ciCommit.trim(), dirty: false };
  }

  return { commit: UNKNOWN_COMMIT, dirty: true };
};
