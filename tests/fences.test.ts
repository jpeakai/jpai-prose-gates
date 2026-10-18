// The docs site renders fences with pymdownx.superfences, which accepts a
// language and then only key="value" options. Any other word after the
// language, such as `text before`, makes it reject the fence, and the block
// is published as a paragraph with its backticks showing. GitHub and the
// gates read the same fence happily, so nothing else would notice.

import { describe, expect, test } from "bun:test";
import { Glob } from "bun";
import type { Code } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { visitParents } from "unist-util-visit-parents";
import { PROJECT_ROOT } from "./helpers.ts";

// Every markdown file make docs-ci gates, which is every file the site can carry.
const PATTERNS = ["*.md", "docs/**/*.md", "adrs/*.md", "site-theme/*/README.md", "evals/*/*.md"];

const files = PATTERNS.flatMap((p) => [...new Glob(p).scanSync({ cwd: PROJECT_ROOT })]).sort();

const OPTIONS = /^[A-Za-z_][\w-]*="[^"]*"(?:\s+[A-Za-z_][\w-]*="[^"]*")*$/;

export const rejectedFences = (src: string): string[] => {
  const bad: string[] = [];
  visitParents(fromMarkdown(src), "code", (node: Code) => {
    if (node.meta && !OPTIONS.test(node.meta.trim()))
      bad.push(`line ${node.position?.start.line}: ${node.lang} ${node.meta}`);
  });
  return bad;
};

describe("fence info strings", () => {
  test("there are files to read", () => {
    expect(files).toContain("RULES.md");
  });

  test.each(files)("%s: every fence is one superfences accepts", async (file) => {
    expect(rejectedFences(await Bun.file(`${PROJECT_ROOT}/${file}`).text())).toEqual([]);
  });

  test.each([
    ["```text before\nx\n```\n", ["line 1: text before"]],
    ['```text title="before"\nx\n```\n', []],
    ['```py title="a" linenums="1"\nx\n```\n', []],
    ["```text\nx\n```\n", []],
    ["```\nx\n```\n", []],
  ])("%j is judged as superfences does", (src, expected) => {
    expect(rejectedFences(src)).toEqual(expected);
  });
});
