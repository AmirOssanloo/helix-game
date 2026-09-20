---
name: write-a-docs-page
description: "Use when adding or rewriting a page under docs/ - an architecture page, a standards page, a decision record (ADR), a runbook, or a product page - or when fixing one that breaks the documentation standards. Triggers on: write a doc, new page, ADR, decision record, architecture page, standards page, runbook, docs standards, quick reference."
---

# Write a docs page

The contract is [Documentation standards](../../../docs/documentation-standards.md). Read it before writing. This skill is the order of operations and the checks people skip.

## Before writing

1. Pick exactly one of the five types. If the page would answer two of "where does it go", "what rule", "why", "what do I type", "what does the player see", it is two pages.
2. Check the page does not already exist under another name. Read the folder's `README.md`; it indexes every page in the folder.
3. Check which page owns each rule you are about to state, using "Where a rule belongs" in the standards. The page that does not own it gets one sentence and a link.
4. For a decision record, copy `docs/adr/0000-template.md`, take the next number, and never reuse or change a number.

## While writing

- Present tense, the target, no history. No phase numbers outside the roadmap, no tickets, sprints, or branch names.
- Architecture and standards pages: placeholders (`foo`, `FooDef`, `fooSystem`) for our own things, real names for platform technologies and the names the architecture fixes. Runbooks and product pages: real names, paths, and numbers.
- Never write a fact the code owns. Write the pointer, and add the row to [Where to look](../../../docs/architecture/where-to-look.md) if it is missing.
- Follow the page skeleton: title, `> **Entry point:**` breadcrumb, one or two sentences of purpose, sections, then for architecture and standards pages `## Anti-patterns` (at most three), `## Quick reference` (every rule in the body, nothing more), and `## Related documentation` (at most five links, each with a reason).
- Directory trees show one entry per folder with a comment. Code examples show shape, bodies as `/* … */`.
- Headings in sentence case, one `#`, no skipped levels. Links relative.

## Before reporting

- Add the page to its folder's `README.md` index, and to the index at the bottom of `docs/README.md` if it is an architecture, standards, or product page.
- A new term goes in the [vocabulary](../../../docs/product/vocabulary.md).
- Every link resolves. Check each one.
- Walk the "A documentation change" rows of [the definition of done](../../../docs/workflows/definition-of-done.md).
