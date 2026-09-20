import { type Dirent, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The repository root, absolute, so a rule resolves its paths from one place whatever the
 * working directory is. Resolved as a path, not a URL: under jsdom a relative `URL` against
 * `import.meta.url` comes back on the page's origin, and this file is behind the barrel every
 * tier imports.
 */
export const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

/** The eight layer folders live here. */
export const SOURCE_DIR = join(REPOSITORY_ROOT, "src");

/** The entries of a directory, or none when it does not exist. */
const readEntries = (dir: string): Dirent[] => {
  try {
    return readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
};

/**
 * Every file under `dir` that `keep` accepts, absolute, in a stable order. A missing directory
 * is no files, so a rule pointed at a folder that is not there scans nothing; the caller decides
 * whether that is a violation.
 */
export const walkFiles = (
  dir: string,
  keep: (path: string) => boolean,
): string[] => {
  const files: string[] = [];
  const entries = readEntries(dir).sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkFiles(path, keep));
    } else if (entry.isFile() && keep(path)) {
      files.push(path);
    }
  }

  return files;
};

/** A path relative to the repository root with `/` separators, the spelling every message uses. */
export const displayPath = (path: string): string =>
  path.startsWith(REPOSITORY_ROOT)
    ? path.slice(REPOSITORY_ROOT.length).split("\\").join("/")
    : path;
