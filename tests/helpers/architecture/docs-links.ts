import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { displayPath, walkFiles } from "./repository";

/**
 * Every relative link in the documentation points at a file that exists, and every `#anchor` at
 * a heading in that file. The pages are the map the code is held to, and a renamed page or
 * heading would otherwise leave a dead pointer that nothing reports.
 *
 * Fenced code blocks and inline code spans are skipped; a link written there is an example.
 * Targets with a scheme (`https:`, `mailto:`) are not checked. Anchors are checked against
 * Markdown targets only, with the slug GitHub gives a heading.
 *
 * ```ts
 * describeDocsLinks({ files: collectMarkdownFiles(root, sources) })
 * ```
 *
 * @see docs/documentation-standards.md#quick-reference
 */

const DOCUMENTATION_STANDARD =
  "docs/documentation-standards.md#quick-reference";

/** One place Markdown files are gathered from. */
export type MarkdownSource = Readonly<{
  /** Relative to the repository root. */
  dir: string;
  recursive: boolean;
  /** Only files with this exact name, or null for every `.md` file. */
  fileName: string | null;
}>;

/** Which files to check. */
export type DocsLinksOptions = Readonly<{
  /** Absolute paths to the Markdown files. */
  files: readonly string[];
}>;

/** One link that does not resolve, with the message the failing test prints. */
export type DocsLinkViolation = Readonly<{
  /** Repository-relative, `/`-separated. */
  file: string;
  line: number;
  target: string;
  message: string;
}>;

type Link = Readonly<{ target: string; line: number }>;

const FENCE = /^ {0,3}(`{3,}|~{3,})/;
const INLINE_CODE = /`[^`\n]*`/g;
const INLINE_LINK = /\]\(\s*<?([^)\s>]+)>?(?:\s+["'][^"']*["'])?\s*\)/g;
const REFERENCE_DEFINITION = /^ {0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/;
const HEADING = /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/;
const SCHEME = /^[a-z][a-z0-9+.-]*:|^\/\//i;

const isMarkdown = (path: string): boolean => path.endsWith(".md");

/** The lines of a file that are outside fenced code blocks, keyed by their 1-based line number. */
const proseLines = (content: string): Map<number, string> => {
  const lines = new Map<number, string>();
  let fence: string | null = null;

  content.split("\n").forEach((line, index) => {
    const match = FENCE.exec(line);

    if (match !== null) {
      const marker = match[1] ?? "";

      if (fence === null) {
        fence = marker;
      } else if (marker[0] === fence[0] && marker.length >= fence.length) {
        fence = null;
      }

      return;
    }

    if (fence === null) {
      lines.set(index + 1, line);
    }
  });

  return lines;
};

/** Every link target in the prose of a file, with its line. */
const collectLinks = (content: string): Link[] => {
  const links: Link[] = [];

  for (const [line, text] of proseLines(content)) {
    const prose = text.replace(INLINE_CODE, "");
    const definition = REFERENCE_DEFINITION.exec(prose);

    if (definition !== null && definition[1] !== undefined) {
      links.push({ target: definition[1], line });
    }

    for (const match of prose.matchAll(INLINE_LINK)) {
      if (match[1] !== undefined) {
        links.push({ target: match[1], line });
      }
    }
  }

  return links;
};

/** The slug GitHub gives a heading: inline markup dropped, lowercased, punctuation removed, spaces to hyphens. */
const slugOf = (heading: string): string =>
  heading
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");

/** Every heading anchor in a Markdown file, with GitHub's `-1`, `-2` suffixes for repeats. */
const collectAnchors = (content: string): Set<string> => {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();

  for (const text of proseLines(content).values()) {
    const match = HEADING.exec(text);

    if (match === null || match[2] === undefined) {
      continue;
    }

    const slug = slugOf(match[2]);
    const count = seen.get(slug) ?? 0;

    seen.set(slug, count + 1);
    anchors.add(count === 0 ? slug : `${slug}-${count}`);
  }

  return anchors;
};

/** Every Markdown file the sources name, absolute, in a stable order. */
export const collectMarkdownFiles = (
  root: string,
  sources: readonly MarkdownSource[],
): string[] => {
  const files: string[] = [];

  for (const source of sources) {
    const dir = join(root, source.dir);
    const keep = (path: string): boolean =>
      isMarkdown(path) &&
      (source.fileName === null || path.endsWith(`/${source.fileName}`)) &&
      (source.recursive || dirname(path) === dir);

    files.push(...walkFiles(dir, keep));
  }

  return files;
};

/** Every link in `files` whose file or heading does not exist. Exported so a message can be asserted on directly. */
export const collectDocsLinkViolations = ({
  files,
}: DocsLinksOptions): DocsLinkViolation[] => {
  const violations: DocsLinkViolation[] = [];
  const anchorCache = new Map<string, Set<string>>();

  const anchorsOf = (path: string): Set<string> => {
    const cached = anchorCache.get(path);

    if (cached !== undefined) {
      return cached;
    }

    const anchors = collectAnchors(readFileSync(path, "utf8"));

    anchorCache.set(path, anchors);

    return anchors;
  };

  for (const file of files) {
    const shown = displayPath(file);
    const content = readFileSync(file, "utf8");

    for (const { target, line } of collectLinks(content)) {
      if (SCHEME.test(target)) {
        continue;
      }

      const hash = target.indexOf("#");
      const pathPart = hash === -1 ? target : target.slice(0, hash);
      const anchor = hash === -1 ? null : target.slice(hash + 1);
      const resolved =
        pathPart === ""
          ? file
          : resolve(dirname(file), decodeURIComponent(pathPart));

      if (!existsSync(resolved)) {
        violations.push({
          file: shown,
          line,
          target,
          message: `${shown}:${line} links to "${target}", and ${displayPath(resolved)} does not exist. Point the link at the page that replaced it, or remove it. See ${DOCUMENTATION_STANDARD}.`,
        });
        continue;
      }

      if (
        anchor === null ||
        anchor === "" ||
        !isMarkdown(resolved) ||
        !statSync(resolved).isFile()
      ) {
        continue;
      }

      if (!anchorsOf(resolved).has(anchor.toLowerCase())) {
        violations.push({
          file: shown,
          line,
          target,
          message: `${shown}:${line} links to "${target}", and ${displayPath(resolved)} has no heading with the anchor "#${anchor}". Point the link at the heading as it is now written, or drop the anchor. See ${DOCUMENTATION_STANDARD}.`,
        });
      }
    }
  }

  return violations;
};

/** Mounts the rule as one `describe` with one test per Markdown file, so a failure names the file. */
export const describeDocsLinks = ({ files }: DocsLinksOptions): void => {
  describe("every relative link and anchor in the documentation resolves", () => {
    const cases = files.map((file) => [displayPath(file), file] as const);

    it.each(cases)(
      "%s links only to files and headings that exist",
      (_name, file) => {
        const violations = collectDocsLinkViolations({ files: [file] });

        expect(violations.map((violation) => violation.message)).toEqual([]);
      },
    );
  });
};
