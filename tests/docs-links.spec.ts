import {
  collectMarkdownFiles,
  describeDocsLinks,
  REPOSITORY_ROOT,
} from "./helpers";

describeDocsLinks({
  files: collectMarkdownFiles(REPOSITORY_ROOT, [
    { dir: ".", recursive: false, fileName: null },
    { dir: "docs", recursive: true, fileName: null },
    { dir: ".claude/agents", recursive: false, fileName: null },
    { dir: ".claude/rules", recursive: false, fileName: null },
    { dir: ".claude/plan", recursive: true, fileName: null },
    { dir: ".claude/skills", recursive: true, fileName: "SKILL.md" },
  ]),
});
