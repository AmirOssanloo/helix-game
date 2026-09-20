/**
 * A rule implementation rather than a `no-restricted-syntax` entry: whether a comment sits
 * on the same line as a `.skip` is not something a selector can read, because comments are
 * not AST nodes.
 *
 * A skipped test is allowed, but only with a same-line comment. Lint checks that the comment
 * exists; review checks that it names an owner and the condition under which the test comes
 * back. Never a ticket id: those do not go into code.
 *
 * @see docs/standards/testing.md#quick-reference
 */

const RUNNERS = new Set(["describe", "it", "test", "suite", "bench"]);

/**
 * Walks a member or call chain down to the identifier it starts from, so `it.skip`,
 * `describe.concurrent.skip` and `it.each(table).skip` all resolve to their runner.
 */
const runnerOf = (node) => {
  let current = node;

  while (current) {
    if (current.type === "Identifier") {
      return current.name;
    }

    if (current.type === "MemberExpression") {
      current = current.object;
      continue;
    }

    if (current.type === "CallExpression") {
      current = current.callee;
      continue;
    }

    return null;
  }

  return null;
};

export const skipNeedsReason = {
  meta: {
    type: "problem",
    docs: {
      description: "Require a comment on the same line as a skipped test.",
    },
    schema: [],
    messages: {
      unexplained:
        "A skipped test with no reason is a test nobody is coming back to. Say who owns it and when it returns in a comment on this line, `it.skip(...) // <owner>, until <condition>`, or delete the test. See docs/standards/testing.md#quick-reference.",
    },
  },

  create(context) {
    const { sourceCode } = context;

    /** Lines a comment covers. Built once, on the first `.skip` seen. */
    let commentedLines = null;

    const hasComment = (line) => {
      if (commentedLines === null) {
        commentedLines = new Set();

        for (const comment of sourceCode.getAllComments()) {
          // A block comment can span lines; every line it covers counts as annotated.
          for (
            let l = comment.loc.start.line;
            l <= comment.loc.end.line;
            l += 1
          ) {
            commentedLines.add(l);
          }
        }
      }

      return commentedLines.has(line);
    };

    return {
      MemberExpression(node) {
        if (
          node.property.type !== "Identifier" ||
          node.property.name !== "skip"
        ) {
          return;
        }

        if (!RUNNERS.has(runnerOf(node.object))) {
          return;
        }

        if (hasComment(node.loc.start.line)) {
          return;
        }

        context.report({ node, messageId: "unexplained" });
      },
    };
  },
};
